import { useEffect,useRef,useState,type ReactNode } from "react";
import { ExploreAdapter } from "../preview/explore/memory.tsx";
import type { ExploreProject,ExploreEvent,SubjectRef } from "../../packages/explore/domain.ts";
import { request,projectsPath,type FamilySession,type PrivateList,PrivateAPIError } from "./client.ts";
import MediaPanel from "./MediaPanel.tsx";
export function PrivateExploreProvider({session,onDenied,children}:{session:FamilySession;onDenied:()=>void;children:ReactNode}) {
  const [projects,setProjects]=useState<ExploreProject[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false),[selected,setSelected]=useState<Record<string,string[]>>({});
  const live=useRef(projects),saving=useRef(false),pending=useRef(new Map<string,Record<string,unknown>>());live.current=projects;
  const path=projectsPath(session),load=async()=>{const result=await request<PrivateList>(path,{session});live.current=result.projects;setProjects(result.projects);};
  useEffect(()=>{let active=true;const controller=new AbortController();request<PrivateList>(path,{session,signal:controller.signal}).then(r=>{if(active){live.current=r.projects;setProjects(r.projects);setReady(true);}}).catch(e=>{if(active){if(e instanceof PrivateAPIError&&[401,403].includes(e.status))onDenied();else setError("项目还没有读出来，请检查连接后重新打开。已有记录不会被清空。");}});return()=>{active=false;controller.abort();live.current=[];};},[path]);
  const save=async<T,>(action:()=>Promise<T>)=>{if(saving.current)throw Error("SAVE_IN_PROGRESS");saving.current=true;setBusy(true);try{return await action();}catch(e){if(e instanceof PrivateAPIError&&[401,403].includes(e.status))onDenied();if(e instanceof PrivateAPIError&&e.status===409)await load();throw e;}finally{saving.current=false;setBusy(false);}};
  const command=(key:string,make:()=>Record<string,unknown>)=>{if(!pending.current.has(key))pending.current.set(key,make());return pending.current.get(key)!;};
  const create=async(question:string,refs:SubjectRef[])=>save(async()=>{
    const key=JSON.stringify(["create",question,refs]),c=command(key,()=>({requestId:crypto.randomUUID(),projectId:crypto.randomUUID(),question,origin:refs.length?"lesson":"child",subjectRefs:refs}));
    const p=await request<ExploreProject>(path,{method:"POST",body:c,session});pending.current.delete(key);live.current=[...live.current.filter(x=>x.projectId!==p.projectId),p];setProjects(live.current);return p.projectId;
  });
  const append=async(id:string,detail:ExploreEvent["detail"])=>save(async()=>{
    const current=live.current.find(p=>p.projectId===id);if(!current)throw Error("PROJECT_NOT_FOUND");
    const key=JSON.stringify(["append",id,detail]),c=command(key,()=>({requestId:crypto.randomUUID(),expectedRevision:current.revision,detail}));
    try {
      const p=await request<ExploreProject>(path+"/"+id+"/events",{method:"POST",body:c,session});pending.current.delete(key);live.current=live.current.map(x=>x.projectId===id?p:x);setProjects(live.current);
      if(detail.kind==="evidence_added"||detail.kind==="artifact_created")setSelected(s=>({...s,[id]:[]}));
    }catch(e){if(e instanceof PrivateAPIError&&e.status===409)pending.current.delete(key);throw e;}
  });
  const remove=async(id:string)=>save(async()=>{const current=live.current.find(p=>p.projectId===id)!;await request(path+"/"+id+"/visibility",{method:"POST",body:{requestId:crypto.randomUUID(),expectedRevision:current.revision,deleted:true},session});await load();});
  if(error)return <section role="alert"><h1>连接暂时有些问题</h1><p>{error}</p><button onClick={()=>location.reload()}>重新连接</button></section>;
  if(!ready)return <p role="status">正在打开你的探索本…</p>;
  return <ExploreAdapter value={{projects,create,append,discard:()=>{},persistent:true,busy,attachments:selected,deleteProject:remove,attachmentPanel:p=><MediaPanel key={p.projectId} session={session} project={p} selected={selected[p.projectId]??[]} onSelect={ids=>setSelected(s=>({...s,[p.projectId]:ids}))} onDenied={onDenied}/>}}>{busy&&<p className="save-status" role="status">正在保存，请稍等…</p>}{children}</ExploreAdapter>;
}
