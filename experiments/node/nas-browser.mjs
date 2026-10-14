import {writeFile} from 'node:fs/promises';
import {runBrowserSuite} from '../../tests/platform-parity/browser-suite.mjs';
const out=process.argv[2];if(!out)throw Error('owned output file required');
const result={status:'RUNNING',scope:'Mac Chromium through SSH tunnel to isolated NAS container; not physical Safari/iPad'};
try{result.cases=await runBrowserSuite({origin:'http://127.0.0.1:37901'});result.status='PASS';}catch(e){result.status='FAIL';result.error={name:e.name,message:e.message};process.exitCode=1;}finally{await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status}));}
