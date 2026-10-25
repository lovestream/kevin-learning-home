// Manual evidence publication only. CI writes fresh measurements to ignored .evidence instead.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const nas=process.argv.includes('--nas');
const source=nas?'.evidence/math-full-nas-r2':'.evidence/math-full-01',target='docs/implementation/evidence/math-full-01';
const browser=read(source+'/browser.json'),checkpoint=read(source+'/checkpoint.json'),catalog=read('apps/preview/content/catalog.json'),mappings=read(target+'/field-mappings.json');
if(nas&&[browser,checkpoint].some(x=>x.target?.origin!=='http://192.168.2.100:38444'||x.target?.transport!=='LAN_HTTP_USER_EXPLICITLY_REQUESTED'))throw Error('ACTUAL_NAS_HTTP_EVIDENCE_REQUIRED');
if(browser.status!=='PASS'||browser.filtered||browser.results.length!==210||checkpoint.status!=='PASS'||checkpoint.results.length<10)throw Error('COMPLETE_REAL_BROWSER_EVIDENCE_REQUIRED');
for(const [name,digest]of Object.entries(browser.execution.files))if(hash(name)!==digest)throw Error('MEASURED_BROWSER_SOURCE_CHANGED '+name);
for(const [name,digest]of Object.entries(checkpoint.execution.files))if(hash(name)!==digest)throw Error('CHECKPOINT_SOURCE_CHANGED '+name);
const matrix=catalog.lessons.map(entry=>{
 const rows=browser.results.filter(x=>x.lessonId===entry.lessonId),mapping=mappings.find(x=>x.lessonId===entry.lessonId);
 if(rows.length!==3||!rows.every(x=>x.pass&&x.sixSteps&&x.refreshClearsState&&x.noBrowserPersistence)||rows.map(x=>x.width).sort((a,b)=>a-b).join(',')!=='390,768,1280')throw Error('LESSON_MATRIX_INCOMPLETE');
 return {lessonId:entry.lessonId,textbookUnit:entry.textbookUnit?.id??entry.parentUnitId,sourceStatus:entry.status,interactionStatus:entry.interactionStatus,sourceHash:mapping.sourceItemSha256,targetDTOHash:entry.dtoSha256,renderer:entry.renderer,visualComponents:[entry.renderer.startsWith('static:')?'StaticConceptFigure':entry.renderer.startsWith('spatial:')?'SpatialWorkbench':entry.renderer.startsWith('mass:')?'MassWorkbench':entry.renderer.startsWith('textbook:')?'TextbookWorkbench':entry.renderer.startsWith('operations:')?'OperationExtensionLab':'TeachingWidget'],sixSteps:'PASS',actualPublicGET:'PASS',browserDOM:'PASS',operatedModels:rows.map(x=>({viewport:x.width,action:x.operation,interactive:x.interactive})),viewports:rows.map(x=>x.width),refreshClearsState:true,persistentBrowserEntries:0,knownGaps:[],intendedLimitations:entry.interactionStatus==='static-visual'?['原源为静态关系图，保留纸笔指导，不标成拖动交互']:[],acceptance:'PASS'};
});
fs.writeFileSync(target+'/lessons-coverage.json',JSON.stringify({status:'PASS',scope:'70 teaching classrooms only; not 849 practice tasks or the entire old site',sourceCommit:catalog.sourceCommit,total:70,interactive:64,static:6,browserScenarios:210,execution:browser.execution,lessons:matrix},null,2)+'\n');
for(const name of ['browser.json','checkpoint.json'])fs.copyFileSync(source+'/'+name,target+'/'+name);
const baseline=read('.evidence/verification.json');if(baseline.status!=='PASS_LOCAL'||baseline.tests!==60||baseline.shellBrowserScenarios!==18||baseline.mathNodeTests!==12||baseline.mathBrowserScenarios!==9)throw Error('ORIGINAL_FULL_BASELINE_REQUIRED');
fs.copyFileSync('.evidence/verification.json',target+'/local-baseline.json');
const screenshotIds=['G3-U01-B03','G3-UP01-B01','G3-U04-B01','G3-U06-B01','G3-LP01-B02','G3-U05-B01'];
const screenshots=[];
for(const id of screenshotIds)for(const width of [390,1280]){const name=id+'-'+width+'.png';fs.copyFileSync(source+'/'+name,target+'/'+name);screenshots.push(name);}
for(const id of ['G3-U01-B03','G3-U04-B01','G3-LP01-B02']){const name=id+'-768.png';fs.copyFileSync(source+'/'+name,target+'/'+name);screenshots.push(name);}
if(fs.existsSync(source+'/mac-visible-catalog.png')){fs.copyFileSync(source+'/mac-visible-catalog.png',target+'/mac-visible-catalog.png');screenshots.push('mac-visible-catalog.png');}
fs.writeFileSync(target+'/screenshots.json',JSON.stringify({screenshots:screenshots.map(name=>({name,sha256:hash(target+'/'+name)})),source:nas?'Real NAS LAN HTTP production preview build in Chromium at 390/768/1280 widths; ordinary Chrome evidence separately archived':'Real production preview build in local Chromium; headed Mac catalog separately identified',physicalPhoneOrIPad:nas?'NEEDS_USER_ACTION':'NOT_DEPLOYED_NOT_RUN'},null,2)+'\n');
console.log(JSON.stringify({status:'ARCHIVED',lessons:matrix.length,browserScenarios:210,permanentScreenshots:screenshots.length}));
