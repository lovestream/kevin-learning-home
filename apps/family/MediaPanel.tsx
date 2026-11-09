import { useEffect,useRef,useState } from "react";
import type { ExploreProject } from "../../packages/explore/domain.ts";
import { request,projectsPath,type FamilySession,type Asset,PrivateAPIError } from "./client.ts";
type Point=[number,number];type Stroke=Point[];
function Drawing({onSave,disabled}:{onSave:(blob:Blob,kind:"drawing",mime:string)=>Promise<void>;disabled:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null),drawing=useRef(false),[strokes,setStrokes]=useState<Stroke[]>([]),[redo,setRedo]=useState<Stroke[]>([]);
  useEffect(()=>{const ctx=canvas.current!.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,640,400);ctx.strokeStyle="#173d43";ctx.lineWidth=4;ctx.lineCap="round";for(const s of strokes){ctx.beginPath();s.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(s.length===1)ctx.lineTo(s[0][0]+1,s[0][1]);ctx.stroke();}},[strokes]);
  const point=(e:React.PointerEvent<HTMLCanvasElement>):Point=>{const r=e.currentTarget.getBoundingClientRect();return [Math.max(0,Math.min(640,(e.clientX-r.left)*640/r.width)),Math.max(0,Math.min(400,(e.clientY-r.top)*400/r.height))];};
  return <section className="drawing-pad"><h3>画一画自己的想法</h3><p>画好后再保存。也可以用纸笔画好，自己选择拍照。</p><canvas ref={canvas} width="640" height="400" aria-label="手绘画布，可用下方文字说明替代" onPointerDown={e=>{if(disabled||strokes.length>=200)return;drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);setRedo([]);setStrokes(s=>[...s,[point(e)]]);}} onPointerMove={e=>{if(!drawing.current)return;const p=point(e);setStrokes(s=>s.map((line,i)=>i===s.length-1&&line.length<500?[...line,p]:line));}} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/><div className="media-actions"><button disabled={disabled||!strokes.length} onClick={()=>{setRedo(r=>[...r,strokes.at(-1)!]);setStrokes(s=>s.slice(0,-1));}}>撤销一笔</button><button disabled={disabled||!redo.length} onClick={()=>{setStrokes(s=>[...s,redo.at(-1)!]);setRedo(r=>r.slice(0,-1));}}>重做一笔</button><button disabled={disabled||!strokes.length} onClick={()=>canvas.current!.toBlob(b=>{if(b)void onSave(b,"drawing","image/png");},"image/png")}>保存这张图</button></div></section>;
}
export default function MediaPanel({session,project,selected,onSelect,onDenied}:{session:FamilySession;project:ExploreProject;selected:string[];onSelect:(ids:string[])=>void;onDenied:()=>void}) {
  const [assets,setAssets]=useState<Asset[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0);
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),abort=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),mounted=useRef(true);
  const path=projectsPath(session)+"/"+project.projectId+"/assets";
  const load=async()=>{const r=await request<{assets:Asset[]}>(path,{session});if(mounted.current)setAssets(r.assets);};
  useEffect(()=>{mounted.current=true;void load().catch(()=>setMessage("素材暂时未能读出，请稍后重试。"));return()=>{mounted.current=false;if(recorder.current?.state==="recording")recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());if(timer.current)clearInterval(timer.current);abort.current?.abort();};},[path]);
  const upload=async(blob:Blob,kind:"drawing"|"image"|"audio",mime:string)=>{
    if(busy)return;if(blob.size>4*1024*1024){setMessage("这份素材太大了，请选 4 MB 以内的图片或一分钟内的语音。");return;}
    setBusy(true);setMessage("");const controller=new AbortController();abort.current=controller;
    try {
      const value=await request<Asset>(path,{method:"POST",raw:blob,session,signal:controller.signal,headers:{"content-type":mime,"x-media-kind":kind,"idempotency-key":crypto.randomUUID()}});
      await load();if(mounted.current){onSelect([...new Set([...selected,value.artifactId])]);setMessage("素材已保存并选中。在证据或作品里写下说明后，再点保存在家园。");}
    }catch(e){if(e instanceof PrivateAPIError&&[401,403].includes(e.status))onDenied();else if(mounted.current)setMessage(controller.signal.aborted?"已取消传送。尚未写入证据的素材不会自动变成观察结果。":"素材还没有保存成功。你可以改用文字，或稍后重试。");}
    finally{if(mounted.current)setBusy(false);}
  };
  const startRecording=async()=>{
    try {
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw Error();
      const s=await navigator.mediaDevices.getUserMedia({audio:true,video:false});if(!mounted.current){s.getTracks().forEach(t=>t.stop());return;}
      stream.current=s;const type=["audio/webm;codecs=opus","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t));if(!type){s.getTracks().forEach(t=>t.stop());throw Error();}
      const r=new MediaRecorder(s,{mimeType:type}),chunks:Blob[]=[];recorder.current=r;let elapsed=0,total=0;
      r.ondataavailable=e=>{total+=e.data.size;if(total<=4*1024*1024)chunks.push(e.data);else if(r.state==="recording")r.stop();};
      r.onstop=()=>{s.getTracks().forEach(t=>t.stop());if(timer.current)clearInterval(timer.current);if(mounted.current){setRecording(false);if(total<=4*1024*1024)void upload(new Blob(chunks,{type}),"audio",type.split(";")[0]);else setMessage("录音过大，没有上传。可以录短一些，或用文字说明。");}};
      r.start(1000);setSeconds(0);setRecording(true);timer.current=setInterval(()=>{elapsed++;setSeconds(elapsed);if(elapsed>=59&&r.state==="recording")r.stop();},1000);
    }catch{setMessage("没有开启麦克风。可以用文字或手绘留下想法；需要录音时，再由你允许浏览器使用麦克风。");}
  };
  return <section className="private-media" aria-label="我的素材"><h2>把看到的、画下的留下</h2><p>素材是可选的。没有照片或语音，也可以完整记录探索。</p><div className="media-actions"><label className="file-button">选择照片<input aria-label="选择照片" type="file" accept="image/png,image/jpeg" capture="environment" disabled={busy||recording} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,"image",f.type);e.target.value="";}}/></label><button disabled={busy} onClick={()=>recording?recorder.current?.stop():void startRecording()}>{recording?`停止并保存语音（${seconds}秒）`:"开始录一段语音"}</button>{busy&&<button onClick={()=>abort.current?.abort()}>取消上传</button>}</div><Drawing disabled={busy||recording} onSave={upload}/>{message&&<p role="status">{message}</p>}<ul className="media-gallery">{assets.map(a=>{const src="/private-api/v1/learners/"+session.learners[0].id+"/media/"+a.artifactId;return <li key={a.artifactId}>{a.kind==="audio"?<audio controls src={src} aria-label="我的语音备注"/>:<a href={src} target="_blank" rel="noreferrer"><img src={src+"/thumbnail"} alt={a.kind==="drawing"?"我画下的想法":"我选择的照片"}/></a>}<label><input type="checkbox" checked={selected.includes(a.artifactId)} onChange={e=>onSelect(e.target.checked?[...selected,a.artifactId]:selected.filter(id=>id!==a.artifactId))}/>用于下一条证据或作品</label></li>;})}</ul></section>;
}
