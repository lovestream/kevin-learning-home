// Only a reviewed, explicitly authorized NAS run may invoke this entry point.
// Its status is corroborated by a separate SSH/model/kernel inventory; an env
// flag or this program alone is not proof of NAS identity.
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHarness} from './harness.mjs';
import {runBusinessSuite} from '../../tests/platform-parity/business-suite.mjs';
import {runRecovery,runLoad,diskBytes} from '../../tests/platform-parity/extended-suite.mjs';
const work='/data',result={route:'node-nas',timestamp:new Date().toISOString(),status:'RUNNING',identity:'REQUIRES_EXTERNAL_SSH_CORROBORATION',environment:{node:process.version,os:os.platform(),arch:os.arch(),kernel:os.release(),nonRoot:process.getuid()!==0},scope:'isolated synthetic experiment only'};
const watchdog=setTimeout(()=>{process.exit(124);},28*60*1000);watchdog.unref();
await mkdir(work+'/evidence',{recursive:true,mode:0o700});
const save=async()=>writeFile(work+'/evidence/nas.json',JSON.stringify(result,null,2)+'\n');let h;
try{
 for(const line of (await readFile('/proc/self/status','utf8')).split('\n'))if(line.startsWith('Cpus_allowed_list:'))result.environment.effectiveCpuAllowed=line.split(':')[1].trim();try{result.environment.effectiveMemoryLimit=Number((await readFile('/sys/fs/cgroup/memory/memory.limit_in_bytes','utf8')).trim());}catch{result.environment.effectiveMemoryLimit='NOT_EXPOSED';}if(result.environment.effectiveCpuAllowed!=='0')throw Error('single CPU affinity not enforced');if(result.environment.effectiveMemoryLimit!==536870912)throw Error('512 MiB memory limit not verified');
 result.phase='source';execFileSync(process.execPath,['--test','tests/platform-parity/source-parity.test.mjs'],{env:{...process.env,TZ:'Asia/Shanghai'},stdio:'pipe',maxBuffer:1024*1024});result.sourceParityExit=0;
 h=await createHarness({directory:work+'/primary'});result.environment.sqlite=h.environment;
 result.phase='business';result.business=await runBusinessSuite(h);await save();
 result.phase='await-browser';await writeFile(work+'/browser-ready.json',JSON.stringify({ready:true,sourceParityExit:0}));await save();
 const deadline=Date.now()+10*60*1000;let browser;
 while(Date.now()<deadline){try{browser=JSON.parse(await readFile(work+'/browser-result.json','utf8'));break;}catch{await new Promise(r=>setTimeout(r,1000));}}
 if(!browser)throw Error('NAS browser bridge not completed within ten minutes');if(browser.status!=='PASS')throw Error('NAS browser bridge failed');result.browser=browser;
 result.phase='recovery';result.recovery=await runRecovery(h,createHarness,work);
 result.phase='performance';result.performance=[];for(const size of ['S','M'])result.performance.push(await runLoad(h,size));result.syntheticDirectoryBytes=await diskBytes(work);
 result.status='PASS_NAS_PENDING_EXTERNAL_IDENTITY';result.runtimeSupport=Number(os.release().split('.')[0])<4||(Number(os.release().split('.')[0])===4&&Number(os.release().split('.')[1])<18)?'RUNTIME_PASSED_WITH_UNSUPPORTED_KERNEL':'RUNTIME_SUPPORTED_BASELINE';result.phase='complete';
}catch(e){result.status='FAIL';result.error={name:e.name,message:e.message.replaceAll(work,'<owned-test-directory>')};process.exitCode=1;}
finally{if(h)await h.close();await save();await writeFile(work+'/finished.json',JSON.stringify({status:result.status}));console.log(JSON.stringify({status:result.status,phase:result.phase}));}
