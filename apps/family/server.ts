// Private gateway; never imported by the anonymous preview process.
import http,{type IncomingMessage,type ServerResponse} from "node:http";
import { readFileSync,existsSync,realpathSync } from "node:fs";
import { join,extname } from "node:path";
import { z } from "zod";
import { AppError } from "../../packages/contracts/index.ts";
import { authConfig,sessionCookie,type AuthConfig } from "../../packages/auth/config.ts";
import { RecordsDatabase } from "../../packages/records/database.ts";
import { PrivateRecords } from "../../packages/records/service.ts";
import { PrivateMedia } from "../../packages/records/media.ts";
import { snapshotArchive } from "../../packages/records/checkpoint.ts";
import { verifyPassword } from "../../packages/auth/password.ts";
import { startPreview } from "../preview/server.ts";

const ROOT=new URL("../..",import.meta.url).pathname;
const CSP="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
const loginSchema=z.strictObject({login:z.string().max(64),password:z.string().max(128)});
const passwordSchema=z.strictObject({password:z.string().max(128)});
const enrollSchema=z.strictObject({learnerId:z.uuid()});
function parse<T>(schema:z.ZodType<T>,v:unknown){const r=schema.safeParse(v);if(!r.success)throw new AppError("REQUEST_SCHEMA_INVALID",422);return r.data;}
async function body(req:IncomingMessage,max=16384,json=true):Promise<unknown> {
  if(req.headers["content-encoding"]||Number(req.headers["content-length"]??0)>max)throw new AppError("BODY_TOO_LARGE_OR_ENCODED",413);
  if(json&&req.headers["content-type"]!=="application/json")throw new AppError("JSON_REQUIRED",415);
  const chunks:Buffer[]=[];let size=0;req.setTimeout(5000,()=>req.destroy());
  for await(const c of req){size+=c.length;if(size>max)throw new AppError("BODY_TOO_LARGE",413);chunks.push(c);}
  req.setTimeout(0);const data=Buffer.concat(chunks);
  if(!json)return data;
  try{return JSON.parse(data.toString());}catch{throw new AppError("JSON_INVALID",400);}
}
function cookie(req:IncomingMessage,name:string){const rows=(req.headers.cookie??"").split(";").map(s=>s.trim()).filter(s=>s.startsWith(name+"="));if(rows.length!==1)throw new AppError("SESSION_REQUIRED",401);return rows[0].slice(name.length+1);}
export async function startFamily(options:{root?:string;directory:string;synthetic:boolean;port?:number;origin?:string;mode?:AuthConfig["mode"];deploymentAuthorized?:boolean;trustedLocalTLSProxy?:boolean}) {
  if(!options.synthetic&&!options.deploymentAuthorized)throw new AppError("PRIVATE_DEPLOYMENT_REVIEW_REQUIRED",403);
  const mode=options.mode??"loopback-development";
  if(mode==="production"&&(!options.origin||!options.trustedLocalTLSProxy))throw new AppError("EXPLICIT_TRUSTED_TLS_PROXY_REQUIRED",503);
  let config:AuthConfig|undefined=options.origin?authConfig(options.origin,mode):undefined;
  if(!config&&mode!=="loopback-development")throw new AppError("AUTH_ORIGIN_CONFIG",503);
  const root=options.root??ROOT,store=new RecordsDatabase(options.directory,options.synthetic),records=new PrivateRecords(store),media=new PrivateMedia(records);
  let preview:Awaited<ReturnType<typeof startPreview>>;
  try {preview=await startPreview({root,enabled:true,port:0});}catch(e){store.close();throw e;}
  const previewPort=(preview.address() as {port:number}).port;
  const server=http.createServer(async(req,res)=>{
    const cfg=config!;
    const send=(status:number,value:unknown)=>{res.writeHead(status,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(value));};
    res.setHeaders(new Headers({"Cache-Control":"no-store","Content-Security-Policy":CSP,"X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY","Cross-Origin-Resource-Policy":"same-origin","Cross-Origin-Opener-Policy":"same-origin","Permissions-Policy":"camera=(self), microphone=(self), geolocation=()"}));
    try {
      if(req.headers.host!==new URL(cfg.origin).host||req.headers["sec-fetch-site"]==="cross-site"||(req.headers.origin!==undefined&&req.headers.origin!==cfg.origin)||req.headers.forwarded||req.headers["x-forwarded-host"]||req.headers.authorization)
        throw new AppError("ORIGIN_REJECTED",403);
      if(mode==="production"&&req.headers["x-forwarded-proto"]!=="https")throw new AppError("TRUSTED_TLS_REQUIRED",403);
      const url=new URL(req.url!,cfg.origin),path=url.pathname;
      if(path==="/health/ready"){const ready=store.ready();send(ready?200:503,{ready});return;}
      const childName=cfg.secure?"__Host-klh-device":"klh-dev-device",parentName=cfg.secure?"__Host-klh-parent":"klh-dev-parent";
      const auth=(parent=false)=>records.access.session(cookie(req,parent?parentName:childName));
      const set=(name:string,c:string,maxAge:number)=>res.setHeader("Set-Cookie",sessionCookie({...cfg,cookieName:name},c,maxAge));
      if(path.startsWith("/private-api/")) {
        if(url.search)throw new AppError("PRIVATE_QUERY_REJECTED",400);
        if(!["GET","POST"].includes(req.method??""))throw new AppError("METHOD_NOT_ALLOWED",405);
        if(req.method==="POST"&&req.headers.origin!==cfg.origin)throw new AppError("ORIGIN_REJECTED",403);
        const api=path.slice("/private-api/v1".length);
        if(api==="/access/status"&&req.method==="GET"){send(200,{configured:records.access.configured(),synthetic:store.synthetic});return;}
        if(api==="/access/login"&&req.method==="POST"){
          const c=parse(loginSchema,await body(req)),issued=await records.access.login(c.login,c.password,req.socket.remoteAddress??"local");
          set(parentName,issued.cookie,issued.maxAge);send(200,{authenticated:true,csrf:issued.csrf});return;
        }
        const parent=api.startsWith("/parent/")||api==="/access/parent"||req.headers["x-klh-role"]==="parent",p=auth(parent);
        if(parent&&p.role!=="parent")throw new AppError("ROLE_FORBIDDEN",403);
        if(req.method==="POST")records.access.csrf(p,req.headers["x-csrf-token"]);
        if((api==="/access/child"||api==="/access/parent")&&req.method==="GET"){
          send(200,{role:p.role,csrf:p.csrf,learners:records.access.learners(p),synthetic:store.synthetic});return;
        }
        if(api==="/parent/enroll"&&req.method==="POST"){
          const c=parse(enrollSchema,await body(req)),issued=records.access.enroll(p,c.learnerId);set(childName,issued.cookie,issued.maxAge);send(200,{authorized:true});return;
        }
        if(api==="/parent/revoke-devices"&&req.method==="POST"){
          parse(z.strictObject({}),await body(req));records.access.revokeDevices(p);send(200,{revoked:true});return;
        }
        if(api==="/access/logout"&&req.method==="POST"){
          parse(z.strictObject({}),await body(req));records.access.logout(p);set(parent?parentName:childName,"",0);send(200,{authenticated:false});return;
        }
        if(api==="/parent/password"&&req.method==="POST"){
          const c=parse(passwordSchema,await body(req));await records.access.changePassword(p,c.password);set(parentName,"",0);send(200,{changed:true,allDevicesRevoked:true});return;
        }
        if(api==="/parent/backup"&&req.method==="POST"){
          const c=parse(passwordSchema,await body(req)),h=store.db.prepare("SELECT password FROM households WHERE id=?").get(p.householdId)!;
          if(!await verifyPassword(c.password,JSON.parse(String(h.password))))throw new AppError("AUTH_INVALID",401);
          // This service owns one household in deployment. Never export another family.
          if(Number(store.db.prepare("SELECT count(*) n FROM households").get()!.n)!==1)throw new AppError("HOUSEHOLD_EXPORT_SCOPE",403);
          const data=await snapshotArchive(store,c.password);records.access.authorize(p,String(records.access.learners(p)[0].id),"parent");
          res.writeHead(200,{"Content-Type":"application/octet-stream","Content-Disposition":"attachment; filename=\"learning-home.klhbackup\""});res.end(data);return;
        }
        const removed=/^\/parent\/learners\/([a-f0-9-]{36})\/deleted$/.exec(api);
        if(removed&&req.method==="GET"){records.access.authorize(p,removed[1],"parent");send(200,{projects:records.list(p,removed[1],true)});return;}
        const match=/^\/learners\/([a-f0-9-]{36})\/(projects|subjects|media)(?:\/([A-Za-z0-9._-]{1,96}))?(?:\/(events|visibility|assets|thumbnail))?$/.exec(api.replace(/^\/parent(?=\/learners\/)/,""));
        if(!match)throw new AppError("NOT_FOUND",404);
        const [,learner,kind,id,action]=match;
        records.access.authorize(p,learner);
        if(kind==="projects") {
          if(req.method==="GET"&&!action){send(200,id?records.project(p,learner,id):{projects:records.list(p,learner)});return;}
          if(req.method==="POST"&&!id){send(201,records.create(p,learner,await body(req)));return;}
          if(req.method==="POST"&&id&&action==="events"){send(200,records.append(p,learner,id,await body(req)));return;}
          if(req.method==="POST"&&id&&action==="visibility"){send(200,records.deleteRestore(p,learner,id,await body(req)));return;}
          if(req.method==="GET"&&id&&action==="assets"){send(200,{assets:media.list(p,learner,id)});return;}
          if(req.method==="POST"&&id&&action==="assets"){
            const kind=req.headers["x-media-kind"],rid=req.headers["idempotency-key"];
            if(!["drawing","image","audio"].includes(String(kind))||typeof rid!=="string")throw new AppError("MEDIA_METADATA_INVALID",422);
            send(201,await media.upload(p,learner,id,rid,kind as "image"|"drawing"|"audio",String(req.headers["content-type"]),await body(req,4*1024*1024,false) as Buffer));return;
          }
        }
        if(kind==="media"&&id&&req.method==="GET"&&(!action||action==="thumbnail")) {
          const value=media.read(p,learner,id,action==="thumbnail");res.writeHead(200,{"Content-Type":value.mime,"Content-Length":value.bytes.length,"Content-Disposition":"inline"});res.end(value.bytes);return;
        }
        if(kind==="subjects"&&id&&req.method==="GET"&&!action){send(200,records.subject(p,learner,id));return;}
        if(kind==="subjects"&&!id&&req.method==="POST"){send(200,records.writeSubject(p,learner,await body(req,17*1024*1024)));return;}
        throw new AppError("NOT_FOUND",404);
      }
      if(["GET","HEAD"].includes(req.method??"")&&(path==="/parent"||path.startsWith("/explore")||path.startsWith("/family-assets/"))) {
        const dist=join(root,"apps/family/dist"),key=path.startsWith("/family-assets/")?path:"/index.html";
        if(key!=="/index.html"&&!/^\/family-assets\/[A-Za-z0-9._-]+$/.test(key))throw new AppError("NOT_FOUND",404);
        const file=join(dist,key);if(!existsSync(file)||!realpathSync(file).startsWith(dist+"/"))throw new AppError("NOT_FOUND",404);
        res.writeHead(200,{"Content-Type":extname(file)===".js"?"text/javascript; charset=utf-8":extname(file)===".css"?"text/css; charset=utf-8":"text/html; charset=utf-8"});res.end(req.method==="HEAD"?undefined:readFileSync(file));return;
      }
      // Content requests only: never forward family cookies, authority or private URLs.
      if(!path.startsWith("/preview-api/")&&!["GET","HEAD"].includes(req.method??""))throw new AppError("NOT_FOUND",404);
      if(path.startsWith("/api/")||path.startsWith("/health/"))throw new AppError("NOT_FOUND",404);
      const headers:Record<string,string>={host:"127.0.0.1:"+previewPort};
      if(req.headers.origin)headers.origin="http://127.0.0.1:"+previewPort;
      if(req.headers["content-type"])headers["content-type"]=req.headers["content-type"];
      const proxied=http.request({hostname:"127.0.0.1",port:previewPort,path:req.url,method:req.method,headers},r=>{res.writeHead(r.statusCode??502,r.headers);r.pipe(res);});
      proxied.on("error",()=>{if(!res.headersSent)send(502,{error:"CONTENT_UNAVAILABLE"});else res.destroy();});req.pipe(proxied);
    } catch(e) {
      if(res.headersSent){res.destroy();return;}
      const error=e instanceof AppError?e:new AppError(e instanceof Error&&["REQUEST_SCHEMA_INVALID","FIRST_HYPOTHESIS_IMMUTABLE","FIRST_THOUGHT_REQUIRED","EVIDENCE_REQUIRED","SOURCE_REQUIRED","EVENT_LIMIT"].includes(e.message)?e.message:"REQUEST_REJECTED",422);
      send(error.status,{error:error.code,...(error.currentRevision!==undefined?{currentRevision:error.currentRevision}:{})});req.resume();
    }
  });
  try {
    await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(options.port??0,"127.0.0.1",resolve);});
    config??=authConfig("http://127.0.0.1:"+(server.address() as {port:number}).port,mode);
  }catch(e){preview.close();store.close();throw e;}
  server.on("close",()=>{preview.close();store.close();});
  return {server,store,records,origin:config.origin,close:()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
