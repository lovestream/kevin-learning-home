// Publish measured evidence, never fabricate browser or grading results.
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {loadPractice} from '../../apps/preview/practice/service.ts';
import {groups} from '../../apps/preview/practice/contract.ts';
const nas=process.argv.includes('--nas'),dir='.evidence/math-full-02/'+(nas?'nas':'local'),out='docs/implementation/evidence/math-full-02',bank=loadPractice(process.cwd()),browser=JSON.parse(fs.readFileSync(dir+'/browser.json')),golden=JSON.parse(fs.readFileSync('.evidence/math-full-02/golden.json')),source=JSON.parse(fs.readFileSync(out+'/source.json'));
const h=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(browser.status!=='PASS'||browser.results.length!==3||browser.results.some(r=>r.tasks!==849||!r.pass)||golden.total!==849||golden.status!=='PASS'||nas&&!browser.nas)throw Error('COMPLETE_EVIDENCE_REQUIRED');
for(const [p,digest] of Object.entries(browser.execution.files))if(h(p)!==digest)throw Error('MEASURED_PRACTICE_SOURCE_CHANGED '+p);
const tasks=source.tasks.map(r=>({...r,publicQuestionSha256:createHash('sha256').update(JSON.stringify(bank.lessons.get(r.lessonId).taskSets[r.group][r.index])).digest('hex'),sourceExact:true,initialAnswerFields:false,grading:golden.results.find(x=>x.taskId===r.taskId)?.status,reachableViewports:browser.results.map(x=>x.width)}));
if(tasks.length!==849||new Set(tasks.map(r=>r.taskId)).size!==849)throw Error('EXACT_TASKS_REQUIRED');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/tasks-coverage.json',JSON.stringify({status:'PASS',scope:'70 lessons / 849 authored practice tasks, memory only; not entire math site',sourceCommit:source.sourceCommit,total:849,lessons:70,bankSha256:bank.bankSha256,publicSha256:bank.publicSha256,browserOrigin:browser.origin,execution:browser.execution,groups:Object.fromEntries(groups.map(g=>[g,tasks.filter(t=>t.group===g).length])),kinds:Object.fromEntries(['number','choice','explanation','expression','fields'].map(k=>[k,tasks.filter(t=>t.kind===k).length])),humanReview:335,deterministic:514,tasks},null,2)+'\n');
fs.copyFileSync('.evidence/math-full-02/golden.json',out+'/golden.json');fs.copyFileSync(dir+'/browser.json',out+'/browser-'+(nas?'nas':'local')+'.json');
const screenshots=[];for(const name of fs.readdirSync(dir).filter(n=>/^[a-z0-9-]+\.png$/.test(n))){fs.copyFileSync(dir+'/'+name,out+'/'+name);screenshots.push({name,sha256:h(out+'/'+name)});}
fs.writeFileSync(out+'/screenshots.json',JSON.stringify({source:nas?'Actual NAS LAN HTTP':'Local real frontend/backend',physicalDevices:'NEEDS_USER_ACTION',screenshots},null,2)+'\n');console.log(JSON.stringify({status:'ARCHIVED',tasks:849,flows:browser.flows.length,nas}));
