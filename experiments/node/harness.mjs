import {spawn} from 'node:child_process';
import {mkdir,writeFile,cp,copyFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {SQLiteAdapter} from './adapter.mjs';
import {startMediaMock} from '../shared/media-mock.mjs';
export async function createHarness({directory,port=37901,mediaPort=37902,restore}={}){
  await mkdir(directory,{recursive:true,mode:0o700});const database=path.join(directory,'learning.sqlite'),objects=path.join(directory,'objects');
  if(restore){await copyFile(path.join(restore,'learning.sqlite'),database);await cp(path.join(restore,'objects'),objects,{recursive:true});}
  const origin=`http://127.0.0.1:${port}`,key=randomUUID()+randomUUID();
  const media=await startMediaMock({directory:objects,port:mediaPort,key,backendOrigin:origin,publicOrigin:origin,seedObjects:!restore});
  const configFile=path.join(directory,'config.private.json');await writeFile(configFile,JSON.stringify({database,port,mediaAssets:media.assets,env:{BENCH_ENV:process.env.CI?'ci':'local',PUBLIC_ORIGIN:origin,MEDIA_ORIGIN:media.origin,MEDIA_MOCK_KEY:key}}),{mode:0o600});
  let child;let environment;const db=new SQLiteAdapter(database);
  const launch=async()=>{child=spawn(process.execPath,[new URL('./server.mjs',import.meta.url).pathname],{env:{...process.env,KLH_BENCH_CONFIG:configFile,TZ:'Asia/Shanghai'},stdio:['ignore','ignore','pipe','ipc']});let errors='';child.stderr.on('data',b=>{errors=(errors+b).slice(-3000);});await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend startup timeout')),20000);child.once('exit',code=>{clearTimeout(timeout);reject(Error('backend startup failed '+code+' '+errors.slice(-1000)));});child.on('message',msg=>{if(msg.ready){clearTimeout(timeout);environment=msg.environment;resolve();}});});};
  const stop=async()=>{if(!child||(child.exitCode!==null||child.signalCode!==null))return;await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});};
  await launch();
  return {origin,db,media,directory,environment,kind:'node',restart:async()=>{await stop();await launch();},
    metrics:async()=>new Promise(resolve=>{const id=randomUUID();const handler=msg=>{if(msg.kind==='metrics'&&msg.id===id){child.off('message',handler);resolve(msg);}};child.on('message',handler);child.send({kind:'metrics',id});}),
    backup:async target=>{await mkdir(target,{recursive:true});db.backup(path.join(target,'learning.sqlite'));await cp(objects,path.join(target,'objects'),{recursive:true});},
    close:async()=>{await stop();db.close();await media.close();},
    terminate:async()=>{await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGKILL');});},
    launch};
}
