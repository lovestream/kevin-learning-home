import type { ExploreProject } from "../../packages/explore/domain.ts";
export type FamilySession={role:"parent"|"child";csrf:string;learners:{id:string;label:string}[];synthetic:boolean};
export class PrivateAPIError extends Error {
  readonly status:number;
  constructor(code:string,status:number){super(code);this.status=status;}
}
export async function request<T>(path:string,options:{method?:string;body?:unknown;session?:FamilySession;raw?:Blob;headers?:Record<string,string>;signal?:AbortSignal}={}):Promise<T> {
  const response=await fetch("/private-api/v1"+path,{method:options.method??"GET",credentials:"same-origin",cache:"no-store",redirect:"error",signal:options.signal,headers:{...(options.body!==undefined?{"content-type":"application/json"}:{}),...(options.session?{"x-csrf-token":options.session.csrf,...(options.session.role==="parent"?{"x-klh-role":"parent"}:{})}:{}),...options.headers},body:options.raw??(options.body!==undefined?JSON.stringify(options.body):undefined)});
  if(!response.ok){const value=await response.json().catch(()=>({error:"CONNECTION_ERROR"}));throw new PrivateAPIError(value.error??"REQUEST_FAILED",response.status);}
  return response.json() as Promise<T>;
}
export const projectsPath=(session:FamilySession,learner=session.learners[0]?.id)=>"/learners/"+learner+"/projects";
export type Asset={artifactId:string;kind:"image"|"drawing"|"audio";mime:string;sha256:string;bytes:number;metadata:{width?:number;height?:number;duration?:number}};
export type PrivateList={projects:ExploreProject[]};
