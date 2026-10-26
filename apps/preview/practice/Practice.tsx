import {useEffect,useRef,useState} from 'react';
import {groups,groupNames,publicLessonSchema,resultSchema,checksDefault,type PracticeLesson,type PublicTask,type PracticeResult} from './contract.ts';
import TaskDiagram from '../adapters/source/src/studio/measurement/TaskDiagram.tsx';
import InverseTaskFigure from './InverseTaskFigure.tsx';
import ConceptTaskDiagram from './ConceptVisual.tsx';
type Answer=Record<string,string>;
type Attempt={answer:Answer;first?:Answer;checks:boolean[];result?:PracticeResult};
const empty=():Attempt=>({answer:{},checks:[false,false,false]});
function AnswerInput({task,value,onChange}:{task:PublicTask;value:Answer;onChange:(a:Answer)=>void}){
 if(task.kind==='explanation')return <label>我的解释<textarea aria-label="我的解释" maxLength={1000} value={value.value??''} onChange={e=>onChange({...value,value:e.target.value})} placeholder="说出结论、关键一步，以及为什么"/></label>;
 if(task.kind==='choice')return <>{[{name:'我的选择',key:'value',options:task.options},...(task.responseSpec.type==='claim-evidence'?[{name:'支持结论的证据',key:'evidence',options:task.responseSpec.evidenceOptions}]:[])].map(set=><fieldset key={set.key}><legend>{set.name}</legend>{set.options?.map((o,i)=><label key={o.id} className="practice-option"><input type="radio" name={task.id+'-'+set.key} checked={value[set.key]===o.id} onChange={()=>onChange({...value,[set.key]:o.id})}/><span>{String.fromCharCode(65+i)} · {o.text}</span></label>)}</fieldset>)}</>;
 return <div className="practice-fields">{(task.fields??[{key:'value',label:task.kind==='expression'?'我的算式':'我的答案',unit:task.unit}]).map(f=><label key={f.key}>{f.label}<span><input aria-label={f.label} maxLength={160} value={value[f.key]??''} onChange={e=>onChange({...value,[f.key]:e.target.value})} placeholder={task.kind==='expression'?'写完整算式，可用 × ÷ 和括号':'整数、小数或分数，如 3/8'}/>{f.unit&&<strong>{f.unit}</strong>}</span></label>)}</div>;
}
export default function Practice({lessonId}:{lessonId:string}){
 const [lesson,setLesson]=useState<PracticeLesson|null>(null),[group,setGroup]=useState<typeof groups[number]>('warmup'),[index,setIndex]=useState(0),[attempts,setAttempts]=useState<Record<string,Attempt>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef<AbortController|null>(null), generation=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const c=new AbortController();void fetch('/preview-api/v1/practice/lessons/'+encodeURIComponent(lessonId),{credentials:'omit',cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw Error();const data=publicLessonSchema.parse(await r.json());if(data.lessonId!==lessonId)throw Error();if(!c.signal.aborted)setLesson(data);}).catch(()=>{if(!c.signal.aborted)setError('练习暂时无法读取，请刷新重试。');});return()=>{c.abort();pending.current?.abort();generation.current++;};},[lessonId]);
 if(!lesson)return <p role="status">{error||'正在准备本课练习…'}</p>;
 const tasks=lesson.taskSets[group],task=tasks[index],attempt=task?(attempts[task.id]??empty()):empty();
 function update(a:Attempt){if(task)setAttempts(prev=>({...prev,[task.id]:a}));}
 function navigate(g:typeof group,n:number){pending.current?.abort();generation.current++;setBusy(false);setError('');setGroup(g);setIndex(n);requestAnimationFrame(()=>heading.current?.focus());}
 async function submit(){
  if(!task||!attempt.first||!attempt.checks.every(Boolean))return;
  const c=new AbortController();pending.current=c;const run=++generation.current;setBusy(true);setError('');
  try{const r=await fetch('/preview-api/v1/practice/grade',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',signal:c.signal,body:JSON.stringify({lessonId,contentVersion:lesson!.contentVersion,taskId:task.id,firstAnswer:attempt.first,checks:attempt.checks,finalAnswer:attempt.answer})});if(!r.ok)throw Error();const result=resultSchema.parse(await r.json());if(result.taskId!==task.id)throw Error();if(run===generation.current)update({...attempt,result});}
  catch{if(!c.signal.aborted&&run===generation.current)setError('暂时无法核对；你的本次输入仍在页面中，请重试。');}
  finally{if(run===generation.current)setBusy(false);}
 }
 return <section className="practice-panel" data-practice-lesson={lessonId}>
  <p className="practice-notice">体验模式不会保存 · 仅本页临时作答，刷新清空 · 不记录成绩或积分</p>
  <nav aria-label="五组练习" className="practice-groups">{groups.map(g=><button key={g} data-practice-group={g} aria-pressed={g===group} onClick={()=>navigate(g,0)}>{groupNames[g]} <small>{lesson.taskSets[g].length} 题</small></button>)}</nav>
  {!task?<p>原题库本组没有题目，请自由选择其它题组。</p>:<>
   <h3 ref={heading} tabIndex={-1}>{groupNames[group]} · 第 {index+1} / {tasks.length} 题</h3>
   <nav aria-label="本组题目" className="practice-numbers">{tasks.map((t,i)=><button key={t.id} data-practice-task={t.id} aria-current={i===index?'step':undefined} onClick={()=>navigate(group,i)}>{i+1}</button>)}</nav>
   <article className="practice-question" data-task-id={task.id} data-kind={task.kind}>
    <p className="practice-prompt">{task.prompt}</p>
    {task.diagram?.type==='measurement'&&<TaskDiagram diagram={task.diagram}/>}
    {task.diagram?.type==='concept'&&<ConceptTaskDiagram diagram={task.diagram}/>}
    {(task.diagram?.type==='fraction'||task.diagram?.type==='joined-perimeters')&&<InverseTaskFigure diagram={task.diagram}/>}
    <fieldset disabled={busy} className="practice-answer"><legend>独立作答</legend><AnswerInput task={task} value={attempt.answer} onChange={a=>update({...attempt,answer:a,result:undefined})}/></fieldset>
    {!attempt.first?<button disabled={!Object.values(attempt.answer).some(v=>v.trim())} onClick={()=>update({...attempt,first:{...attempt.answer}})}>完成首答，开始自查</button>:<section className="practice-self-check"><h4>先当一次自己的小老师</h4><p>首答仅在本页保留。可以修改上面的答案，再提交终答。</p><details><summary>看看我的独立首答</summary><p>{Object.values(attempt.first).join('；')}</p></details>{(task.selfCheckItems??checksDefault).map((item,i)=><label key={item}><input type="checkbox" disabled={busy} checked={attempt.checks[i]} onChange={e=>update({...attempt,checks:attempt.checks.map((v,j)=>i===j?e.target.checked:v),result:undefined})}/>{item}</label>)}<button disabled={busy||!attempt.checks.every(Boolean)} onClick={()=>void submit()}>{busy?'正在核对…':'提交最终答案'}</button></section>}
    {error&&<p role="alert">{error}</p>}
    {attempt.result&&<section role="status" className="practice-feedback" data-grade-status={attempt.result.status}><h4>{{correct:'本次核对一致',incorrect:'再检查一下',pendingReview:'待家长核对',invalidInput:'请补充或检查输入'}[attempt.result.status]}</h4><p>{attempt.result.message}</p>{attempt.result.solution&&<details><summary>查看参考过程与检查依据</summary><p>{attempt.result.solution}</p>{attempt.result.rubric?.map(x=><p key={x}>{x}</p>)}</details>}{attempt.result.hint&&<details><summary>给我一点提示</summary><p>{attempt.result.hint}</p>{attempt.result.diagnostic&&<p>{attempt.result.diagnostic}</p>}</details>}</section>}
    <div className="practice-actions"><button disabled={busy} onClick={()=>update(empty())}>重做本题</button><button disabled={index===0} onClick={()=>navigate(group,index-1)}>上一题</button><button disabled={index===tasks.length-1} onClick={()=>navigate(group,index+1)}>下一题</button></div>
   </article>
  </>}
 </section>;
}
