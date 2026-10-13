import {LearningRepository,validateCommand,hash,canonical,failure} from './repository.mjs';
import {publicCourse,VERSION} from './domain.mjs';
export const TABLES=['subject_states','state_chunks','attempts','receipts','learning_events','synthetic_rewards','media_manifests','course_manifests','media_refs'];
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...extra}});
async function boundedJSON(req,max=32768){if(!req.headers.get('Content-Type')?.startsWith('application/json'))throw failure('JSON_REQUIRED',415);const reader=req.body?.getReader();if(!reader)throw failure('INVALID_INPUT');let n=0;const parts=[];while(true){const {value,done}=await reader.read();if(done)break;n+=value.length;if(n>max){await reader.cancel();throw failure('BODY_TOO_LARGE',413);}parts.push(value);}const all=new Uint8Array(n);let o=0;for(const p of parts){all.set(p,o);o+=p.length;}try{return JSON.parse(new TextDecoder().decode(all));}catch{throw failure('INVALID_INPUT');}}
export async function initialize(db,media=[]){for(const subject of ['math','english'])await db.run('INSERT OR IGNORE INTO course_manifests VALUES(?,?,?)',[subject,VERSION,canonical(publicCourse(subject))]);for(const a of media)await db.run('INSERT OR IGNORE INTO media_manifests VALUES(?,?,?)',[a.assetId,a.version,canonical(a)]);}
export async function handle(req,db,env){
  const start=performance.now();const repo=new LearningRepository(db);
  try {
    const url=new URL(req.url),path=url.pathname;
    if(!['local','ci'].includes(env.BENCH_ENV)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw failure('LOCAL_EXPERIMENT_ONLY',403);
    const write=!['GET','HEAD'].includes(req.method);
    if(write&&req.headers.get('Origin')!==env.PUBLIC_ORIGIN)throw failure('ORIGIN_FORBIDDEN',403);
    if(req.headers.get('Sec-Fetch-Site')==='cross-site')throw failure('ORIGIN_FORBIDDEN',403);
    if(path==='/health')return json({ok:true,environment:env.BENCH_ENV,version:VERSION});
    if(path==='/api/session'&&req.method==='POST'){
      const b=await boundedJSON(req);if(!['learner','parent'].includes(b.role)||!['synthetic-a','synthetic-b','synthetic-c'].includes(b.learner)||b.password!==`${b.role}-fixture-only`)throw failure('INVALID_CREDENTIALS',401);
      const token=crypto.randomUUID()+crypto.randomUUID(),csrf=crypto.randomUUID();await db.run('INSERT INTO auth_sessions VALUES(?,?,?,?,?)',[await hash(token),b.learner,b.role,csrf,Date.now()+3600000]);
      return json({learner:b.learner,role:b.role,csrf},200,{'Set-Cookie':`klh_bench=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`});
    }
    const token=req.headers.get('Cookie')?.match(/(?:^|;\s*)klh_bench=([^;]+)/)?.[1];
    const session=token?await db.first('SELECT learner,role,csrf,expires FROM auth_sessions WHERE token_hash=?',[await hash(token)]):null;
    if(!session||session.expires<Date.now())throw failure('SESSION_REQUIRED',401);
    if(write&&req.headers.get('X-CSRF-Token')!==session.csrf)throw failure('CSRF_FORBIDDEN',403);
    if(path==='/api/session'&&req.method==='GET')return json({learner:session.learner,role:session.role,csrf:session.csrf});
    if(path.startsWith('/api/parent/')&&session.role!=='parent')throw failure('PARENT_REQUIRED',403);
    const match=path.match(/^\/api\/v1\/learners\/(synthetic-[abc])\/subjects\/(math|english)\/(state|commands|attempts)$/);
    if(match){const [,learner,subject,kind]=match;if(learner!==session.learner)throw failure('LEARNER_FORBIDDEN',403);
      if(kind==='state'&&req.method==='GET')return json(await repo.state(learner,subject));
      if(kind==='attempts'&&req.method==='POST'){await boundedJSON(req);const attemptId=crypto.randomUUID();await db.run('INSERT INTO attempts VALUES(?,?,?,?)',[learner,subject,attemptId,VERSION]);return json({attemptId,contentVersion:VERSION});}
      if(kind==='commands'&&req.method==='POST'){const c=await boundedJSON(req);validateCommand(c,req.headers.get('Idempotency-Key'));if(!await db.first('SELECT attempt_id FROM attempts WHERE learner=? AND subject=? AND attempt_id=? AND content_version=?',[learner,subject,c.attemptId,c.contentVersion]))throw failure('ATTEMPT_NOT_ISSUED',409);const fault=req.headers.get('X-Bench-Fault')==='sql';if(fault&&session.role!=='parent')throw failure('PARENT_REQUIRED',403);return json(await repo.commit(learner,subject,c,{injectFailure:fault}));}
    }
    if(path==='/api/parent/review'&&req.method==='POST'){await boundedJSON(req);throw failure('FULL_PARENT_REVIEW_NOT_IMPLEMENTED',501);}
    if(path==='/api/parent/export'&&req.method==='GET')return json({version:VERSION,tables:await repo.summary()});
    if(path==='/api/parent/restore'&&req.method==='POST'){
      const body=await boundedJSON(req,64*1024*1024);if(body.version!==VERSION||!body.tables||Object.keys(body.tables).some(t=>!TABLES.includes(t)))throw failure('INVALID_BACKUP');
      if((await db.first('SELECT COUNT(*) n FROM receipts')).n)throw failure('RESTORE_REQUIRES_EMPTY',409);
      // Logical restore is a local prototype tool; platform-native SQL/VACUUM
      // backup and independent empty database restore are tested by the harness.
      const statements=[];for(const t of TABLES.toReversed())statements.push([`DELETE FROM ${t}`,[]]);
      for(const t of TABLES){for(const row of body.tables[t]??[]){const columns=Object.keys(row);if(columns.some(k=>!/^[a-z_]+$/.test(k)))throw failure('INVALID_BACKUP');statements.push([`INSERT INTO ${t}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`,columns.map(k=>row[k])]);}}
      if(statements.length>50)throw failure('RESTORE_USE_OFFLINE_TOOL',413);await db.batch(statements);return json({restored:true});
    }
    if(path==='/api/parent/publish'&&req.method==='POST'){
      const b=await boundedJSON(req);if(!['math','english'].includes(b.subject)||!/^[a-zA-Z0-9._-]{1,80}$/.test(b.version)||!Array.isArray(b.media)||b.media.some(x=>Object.keys(x).some(k=>!['assetId','version'].includes(k))))throw failure('INVALID_INPUT');
      await db.run('INSERT INTO course_manifests VALUES(?,?,?)',[b.subject,b.version,canonical({subject:b.subject,version:b.version,title:'Synthetic revised course',media:b.media})]);return json({published:true});
    }
    if(path.startsWith('/api/courses/')&&req.method==='GET'){const subject=path.split('/')[3],version=url.searchParams.get('version')??VERSION;const row=await db.first('SELECT payload FROM course_manifests WHERE subject=? AND version=?',[subject,version]);if(!row)throw failure('CONTENT_NOT_INSTALLED',404);return json(JSON.parse(row.payload));}
    if(path.startsWith('/api/media/')&&req.method==='GET'){
      const assetId=decodeURIComponent(path.split('/')[3]),version=url.searchParams.get('version')??'v1';const row=await db.first('SELECT payload FROM media_manifests WHERE asset_id=? AND version=?',[assetId,version]);if(!row)throw failure('MEDIA_NOT_FOUND',404);const asset=JSON.parse(row.payload);
      if(asset.visibility==='private-learner'&&asset.learner!==session.learner)throw failure('MEDIA_FORBIDDEN',403);
      const response=await fetch(env.MEDIA_ORIGIN+'/sign',{method:'POST',headers:{'Content-Type':'application/json','X-Mock-Key':env.MEDIA_MOCK_KEY},body:JSON.stringify({asset,providerAlias:env.MEDIA_PROVIDER??'local-a'})});
      if(!response.ok)throw failure('MEDIA_UNAVAILABLE',503);return json({...asset,...await response.json()},200,{'Cache-Control':asset.visibility==='public-licensed'?'private,max-age=60':'no-store'});
    }
    if(path==='/api/parent/media/upload-intent'&&req.method==='POST'){
      const b=await boundedJSON(req);if(!Number.isSafeInteger(b.sizeBytes)||b.sizeBytes<1||b.sizeBytes>6*1024*1024||!/^[a-f0-9]{64}$/.test(b.sha256)||!['image/png','audio/wav','application/octet-stream'].includes(b.mimeType))throw failure('INVALID_INPUT');
      const response=await fetch(env.MEDIA_ORIGIN+'/upload-intent',{method:'POST',headers:{'Content-Type':'application/json','X-Mock-Key':env.MEDIA_MOCK_KEY},body:JSON.stringify({...b,learner:session.learner})});if(!response.ok)throw failure('MEDIA_UNAVAILABLE',503);return json(await response.json());
    }
    if(path==='/api/parent/media/commit'&&req.method==='POST'){
      const b=await boundedJSON(req);if(!/^[a-zA-Z0-9._-]{1,100}$/.test(b.assetId)||!/^[a-f0-9]{64}$/.test(b.sha256)||!Number.isSafeInteger(b.sizeBytes)||!['image/png','audio/wav','application/octet-stream'].includes(b.mimeType))throw failure('INVALID_INPUT');
      const checked=await fetch(env.MEDIA_ORIGIN+'/verify',{method:'POST',headers:{'Content-Type':'application/json','X-Mock-Key':env.MEDIA_MOCK_KEY},body:JSON.stringify({sha256:b.sha256})});if(!checked.ok)throw failure('OBJECT_NOT_UPLOADED',409);const metadata=await checked.json();if(metadata.sha256!==b.sha256||metadata.sizeBytes!==b.sizeBytes)throw failure('OBJECT_HASH_MISMATCH',409);
      const asset={assetId:b.assetId,version:'v1',sha256:b.sha256,sizeBytes:b.sizeBytes,mimeType:b.mimeType,visibility:'private-learner',learner:session.learner,storageRef:{providerAlias:'local-a',objectKey:b.sha256}};await db.run('INSERT INTO media_manifests VALUES(?,?,?)',[asset.assetId,asset.version,canonical(asset)]);return json({committed:true,asset});
    }
    throw failure('NOT_FOUND',404);
  }catch(e){return json({error:{code:e.code??'SERVICE_UNAVAILABLE'}},e.status??503);}
  finally{db.recordWall?.(performance.now()-start);}
}
