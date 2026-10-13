// Local object-storage contract simulator; NOT an S3/R2 remote implementation.
import http from 'node:http';
import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
export async function startMediaMock({directory,port,key,backendOrigin,publicOrigin,provider='local-a',seedObjects=true}){
  await mkdir(directory,{recursive:true,mode:0o700});const base=`http://127.0.0.1:${port}`;
  const signatures=b=>createHmac('sha256',key).update(b).digest('hex');
  const signed=(data)=>{const payload=Buffer.from(JSON.stringify(data)).toString('base64url');return payload+'.'+signatures(payload);};
  const verify=(token)=>{const [p,s]=String(token).split('.');if(!s||s.length!==64||!timingSafeEqual(Buffer.from(s),Buffer.from(signatures(p))))throw Error('bad signature');const d=JSON.parse(Buffer.from(p,'base64url'));if(d.expires<Date.now())throw Error('expired');return d;};
  const objectPath=(alias,hash)=>{if(!['local-a','local-b'].includes(alias)||!/^[a-f0-9]{64}$/.test(hash))throw Error('bad object');return path.join(directory,alias,hash);};
  const readBody=async(req,max=32768)=>{let n=0;const parts=[];for await(const b of req){n+=b.length;if(n>max)throw Error('too large');parts.push(b);}return JSON.parse(Buffer.concat(parts));};
  const reply=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));};
  const assets=[];
  for(const [i,size] of [32768,1048576,5242880].entries()){
    let data=Buffer.alloc(size,i+1),mime=i===0?'image/png':i===1?'audio/wav':'application/octet-stream';
    if(i===0){const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');png.copy(data);}
    if(i===1){data.write('RIFF',0);data.writeUInt32LE(size-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(8000,24);data.writeUInt32LE(16000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(size-44,40);}
    const sha256=createHash('sha256').update(data).digest('hex');if(seedObjects)for(const alias of ['local-a','local-b']){await mkdir(path.join(directory,alias),{recursive:true});await writeFile(objectPath(alias,sha256),data,{mode:0o600});}
    assets.push({assetId:i===0?'synthetic-public-image':i===1?'synthetic-private-audio':'synthetic-public-binary',version:'v1',sha256,sizeBytes:size,mimeType:mime,visibility:i===1?'private-learner':'public-licensed',...(i===1?{learner:'synthetic-a'}:{}),storageRef:{providerAlias:provider,objectKey:sha256},sourceLicense:'synthetic-generated'});
  }
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,base);
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':publicOrigin,'Access-Control-Allow-Methods':'PUT','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});res.end();return;}
    if(['/sign','/upload-intent','/verify'].includes(url.pathname)){
      if(req.headers['x-mock-key']!==key)return reply(res,403,{error:'gateway key required'});const b=await readBody(req);
      if(url.pathname==='/verify'){
        const data=await readFile(objectPath('local-a',b.sha256));return reply(res,200,{sha256:createHash('sha256').update(data).digest('hex'),sizeBytes:data.length});
      }
      if(url.pathname==='/upload-intent'){
        const token=signed({sha256:b.sha256,sizeBytes:b.sizeBytes,mimeType:b.mimeType,learner:b.learner,alias:'local-a',expires:Date.now()+60000,method:'PUT'});
        return reply(res,200,{url:base+'/object/'+token,method:'PUT',expiresIn:60,objectKey:b.sha256});
      }
      const asset=b.asset;const alias=b.providerAlias;const token=signed({sha256:asset.sha256,sizeBytes:asset.sizeBytes,mimeType:asset.mimeType,visibility:asset.visibility,learner:asset.learner,alias,expires:Date.now()+60000,method:'GET'});
      return reply(res,200,{url:base+'/object/'+token,expiresIn:60,providerAlias:alias});
    }
    if(!url.pathname.startsWith('/object/'))return reply(res,404,{error:'not found'});
    const d=verify(url.pathname.slice(8));if(req.method!==d.method)return reply(res,403,{error:'method forbidden'});
    if(req.method==='PUT'){
      if(req.headers.origin!==publicOrigin||req.headers['content-type']!==d.mimeType)return reply(res,403,{error:'origin/mime forbidden'});
      const file=objectPath(d.alias,d.sha256),tmp=file+'.upload-'+crypto.randomUUID();let size=0;const digest=createHash('sha256');
      await mkdir(path.dirname(file),{recursive:true});
      const stream=(async function*(){for await(const b of req){size+=b.length;if(size>d.sizeBytes||size>6*1024*1024)throw Error('size exceeded');digest.update(b);yield b;}})();
      try{await pipeline(stream,createWriteStream(tmp,{flags:'wx',mode:0o600}));if(size!==d.sizeBytes||digest.digest('hex')!==d.sha256)throw Error('hash mismatch');await (await import('node:fs/promises')).rename(tmp,file);}catch(e){await (await import('node:fs/promises')).rm(tmp,{force:true});throw e;}
      return reply(res,200,{uploaded:true,sha256:d.sha256,sizeBytes:size},{'Access-Control-Allow-Origin':publicOrigin,'Vary':'Origin'});
    }
    if(d.visibility==='private-learner'){
      const origin=req.headers.origin??req.headers.referer?.replace(/\/$/,'');if(origin&&origin!==publicOrigin)return reply(res,403,{error:'hotlink forbidden'});
      const auth=await fetch(backendOrigin+'/api/session',{headers:{Cookie:req.headers.cookie??''}});if(!auth.ok||(await auth.json()).learner!==d.learner)return reply(res,403,{error:'private session required'});
    }
    const file=objectPath(d.alias,d.sha256),s=await stat(file);if(s.size!==d.sizeBytes)throw Error('size mismatch');
    res.writeHead(200,{'Content-Type':d.mimeType,'Content-Length':s.size,'Cache-Control':d.visibility==='public-licensed'?'public,max-age=31536000,immutable':'no-store','Vary':'Cookie,Origin','X-Content-Type-Options':'nosniff'});await pipeline(createReadStream(file),res);
  }catch(e){if(!res.headersSent)reply(res,403,{error:'invalid object request'});else res.destroy();}});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {assets,origin:base,close:()=>new Promise(resolve=>server.close(resolve))};
}
