import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=await mkdtemp(path.join(os.tmpdir(),'klh-wrangler-local-'));
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--config','experiments/cloudflare/wrangler.jsonc','--persist-to',dir,'--port','37921'],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','ignore','pipe']});
let errors='';child.stderr.on('data',b=>{errors=(errors+b).slice(-1500);});
try{let ready=false;for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:37921/health');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert(ready,'local Wrangler startup '+errors);const r=await fetch('http://127.0.0.1:37921/');assert.equal(r.status,200);assert((await r.text()).includes('双路线合成实验'));console.log(JSON.stringify({nativeStaticAssets:'PASS_LOCAL',wranglerLocalHealth:'PASS_LOCAL',remote:false}));}finally{await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});}
