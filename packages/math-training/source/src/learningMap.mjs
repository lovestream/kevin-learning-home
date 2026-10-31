                                                  
                                                                     
import {lessonEvidence} from '../shared/learning-evidence.mjs';

                                                                                                                                                                                                                                                                               
                                                                                                       
                                                                                                          
const names                      ={F01:'抽象与多种表示',F02:'数形结合',F03:'单位量与整体',F04:'关系建模',F05:'分解与组合',F07:'等价转化',F08:'整体与等量替换',F11:'逆向与还原',F14:'一一对应',F15:'不变量与守恒',F27:'论证与检验'};
const starts=['numbers.quantity.intro','numbers.addition.meaning','numbers.subtraction.meaning'];
const sessions=(p         )=>Object.values(p.studio?.sessions??{})                  ;
export function learningEntries(data     ,grade        )                {
  const hasCompleteGrade3=(data.articleCourses??[]).some(lesson=>lesson.lessonId==='G3-L07-B01');
  const articles=[...(data.articleCourses??[])].sort((a,b)=>{
    const order=(id       )=>starts.includes(id)?starts.indexOf(id):-1;
    return (order(a.lessonId)<0?99:order(a.lessonId))-(order(b.lessonId)<0?99:order(b.lessonId));
  }).filter(l=>grade===undefined||l.grade.includes(grade)).map((lesson)              =>({
    source:'article',lesson,id:lesson.lessonId,title:lesson.title,subtitle:lesson.subtitle,
    world:lesson.lessonId.includes('.fractions.')?'fractions':({numbers:'numbers',algebra:'relations',geometry:'geometry',number_theory:'patterns',counting:'logic',logic:'logic'}                         )[lesson.strand]??lesson.strand,
    kind:lesson.track==='olympiad'||lesson.track==='enhancement'?'thinking':'foundation',track:lesson.track                 ,minutes:lesson.estimatedActiveMinutes,
    skills:lesson.thinkingSkills.map(id=>names[id]).filter(Boolean),questionCount:Object.values(lesson.taskSets).flat().length,
    completed:lessonEvidence(data.progress,lesson.lessonId,lesson.contentVersion).practiced,evidence:lessonEvidence(data.progress,lesson.lessonId,lesson.contentVersion),recommended:true
  }));
  const legacy=data.courses.filter(l=>(!hasCompleteGrade3||(l.grade??3)!==3)&&(grade===undefined||(l.grade??3)===grade)).map((lesson)              =>({
    source:'legacy',lesson,id:lesson.id,title:lesson.title,subtitle:lesson.subtitle,world:lesson.world,kind:lesson.kind,track:lesson.kind==='thinking'?'olympiad':'foundation',minutes:lesson.minutes,skills:lesson.thinkingSkills,questionCount:lesson.questions.length,
    completed:Boolean(data.progress.lessons[lesson.id]?.completedAt),recommended:lesson.prerequisites.every(id=>Boolean(data.progress.lessons[id]?.completedAt))
  }));
  return [...articles,...legacy];
}
export function learningReviews(data     ){
  return learningEntries(data).flatMap(entry=>{
    const review=(entry.source==='article'?data.progress.studio?.review?.[entry.id]:data.progress.reviews[entry.id])                                                                                        ;
    return review&&typeof review.dueAt==='string'?[{entry,review}]:[];
  }).sort((a,b)=>Date.parse(a.review.dueAt)-Date.parse(b.review.dueAt));
}
export function unfinishedLearning(data     ){
  const recent=sessions(data.progress).filter(s=>!s.completedAt&&!s.submittedAt).sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt))[0];
  if(!recent)return null;
  const entry=learningEntries(data).find(e=>e.id===recent.lessonId),task=recent.tasks[recent.index];
  return entry&&task?{entry,set:recent.setName,taskId:task.id,savedAt:recent.savedAt}:null;
}
export function articleAttempts(progress         ){
  const state=progress.studio;
  if(!state)return [];
  return (state.events                                                                                      ).flatMap(event=>{
    if(!['correct','incorrect'].includes(event.result?.status))return [];
    try{
      const input=JSON.parse(event.signature);
      if(input.action!=='submit')return [];
      const session=state.sessions[input.sessionId]                          ;
      const task=session?.tasks.find(t=>t.id===input.taskId);
      return session&&task?[{id:event.id,lessonId:session.lessonId,taskId:task.id,objectiveId:task.objectiveId,prompt:task.prompt,set:session.setName,at:event.result.at??session.savedAt,correct:event.result.status==='correct',usedHint:Boolean(event.result.assisted)}]:[];
    }catch{return []}
  });
}
export function articleMistakes(data     ){
                                                          
  const groups=new Map                                                                  ();
  for(const a of articleAttempts(data.progress)){
    const entry=learningEntries(data).find(l=>l.id===a.lessonId);if(entry?.source!=='article')continue;
    const id=`${entry.id}:${a.objectiveId}`,g=groups.get(id)??{entry,objective:entry.lesson.objectives.find(o=>o.id===a.objectiveId)?.action??'回想这节课的方法',attempts:[]};
    g.attempts.push(a);groups.set(id,g);
  }
  return [...groups.entries()].flatMap(([id,g])=>{
    const wrong=g.attempts.filter(a=>!a.correct);if(!wrong.length)return [];
    const latest=new Map                ();for(const a of g.attempts)latest.set(a.taskId,a);
    const unresolved=[...latest.values()].filter(a=>!a.correct);
    return [{id,...g,wrong:wrong.length,total:g.attempts.length,resolved:!unresolved.length,task:unresolved.at(-1)??wrong.at(-1) }];
  }).sort((a,b)=>Number(a.resolved)-Number(b.resolved)||b.wrong-a.wrong);
}
