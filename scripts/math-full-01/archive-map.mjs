import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadContent} from '../../apps/preview/content.ts';
import {lessonLocation,trackOf} from '../../apps/preview/learning-map.ts';
const {catalog,learningMap:map}=loadContent(process.cwd()),out='docs/implementation/evidence/math-full-r3';fs.mkdirSync(out,{recursive:true});
const lessons=catalog.lessons.map(l=>{
 const at=lessonLocation(map,l.lessonId),coverage=at.unit?.coverage.find(x=>x.lessons.includes(l.lessonId));
 return {lessonId:l.lessonId,term:at.term,unit:at.unit?.id??at.bridge.id,topic:coverage?.topic??(at.unit?'补充拓展':at.bridge.title),track:trackOf(l),supplemental:at.unit?.supplemental.includes(l.lessonId)??false,returnURL:at.returnHref,sequenceIndex:(at.unit?.sequence??at.bridge.lessons).indexOf(l.lessonId),dtoSha256:l.dtoSha256};
});
const coverage={status:'PASS_17_PLUS_7_UNIQUE_MAPPING',sourceCommit:catalog.sourceCommit,navigationSha256:catalog.navigationSha256,units:map.units.length,upper:{units:9,lessons:39},lower:{units:8,lessons:24},bridge:{themes:4,lessons:7},total:70,lessons};
if(lessons.length!==70||new Set(lessons.map(x=>x.lessonId)).size!==70)throw Error('MAP_COVERAGE_INCOMPLETE');
fs.writeFileSync(out+'/map-coverage.json',JSON.stringify(coverage,null,2)+'\n');
const nas=process.argv.includes('--nas'),source='.evidence/math-full-r3/'+(nas?'nas':'local'),nav=JSON.parse(fs.readFileSync(source+'/navigation.json'));
if(nav.status!=='PASS'||nav.results.length!==3||nav.results.some(x=>x.reachedLessons.length!==70)||nas&&nav.target!=='NAS_LAN_HTTP')throw Error('REAL_NAVIGATION_EVIDENCE_REQUIRED');
for(const [p,h]of Object.entries(nav.execution.files))if(createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==h)throw Error('NAVIGATION_MEASURED_SOURCE_CHANGED '+p);
fs.copyFileSync(source+'/navigation.json',out+'/navigation-'+(nas?'nas':'local')+'.json');
if(nas){
 const shots=[];
 for(const name of nav.screenshots){if(!/^[a-z0-9-]+\.png$/.test(name))throw Error('INVALID_SCREENSHOT_NAME');fs.copyFileSync(source+'/'+name,out+'/'+name);shots.push({name,sha256:createHash('sha256').update(fs.readFileSync(out+'/'+name)).digest('hex')});}
 fs.writeFileSync(out+'/screenshots.json',JSON.stringify({source:'Actual NAS LAN HTTP in Chromium at 390/768/1280; native Chrome separately identified',physicalIPhoneIPad:'NEEDS_USER_ACTION',screenshots:shots},null,2)+'\n');
}
console.log(JSON.stringify({status:coverage.status,total:70,navTarget:nav.target,viewports:nav.results.length}));
