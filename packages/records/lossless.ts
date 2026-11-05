import { AppError } from "../contracts/index.ts";
type Node={start:number;end:number;value:unknown;keys?:Map<string,{literal:string;node:Node}>;items?:Node[]};
/** Replace only changed JSON values. In particular an untouched unknown integer
 * 9007199254740993 must never be rewritten as a rounded JS number. The immutable
 * source snapshot separately retains every original byte, including whitespace.
 */
export function editJSON(raw:string,edit:(value:Record<string,unknown>)=>void) {
  let i=0;
  const ws=()=>{while(i<raw.length&&/\s/.test(raw[i]))i++;};
  const string=()=>{const start=i++;while(i<raw.length){if(raw[i++]==='"')break;if(raw[i-1]==="\\")i++;}return raw.slice(start,i);};
  const parse=(depth=0):Node=>{
    if(depth>64)throw new AppError("JSON_DEPTH",422);ws();const start=i,c=raw[i];
    if(c==="{") {
      const keys=new Map<string,{literal:string;node:Node}>(),value=Object.create(null) as Record<string,unknown>;i++;ws();
      while(raw[i]!=="}"){
        const literal=string(),key=JSON.parse(literal);if(keys.has(key))throw new AppError("DUPLICATE_SOURCE_KEY_QUARANTINED",409);ws();if(raw[i++]!==":")throw Error("JSON_INVALID");const node=parse(depth+1);keys.set(key,{literal,node});Object.defineProperty(value,key,{value:node.value,writable:true,enumerable:true,configurable:true});ws();if(raw[i]!==",")break;i++;ws();
      }i++;return {start,end:i,value,keys};
    }
    if(c==="["){
      const items:Node[]=[];i++;ws();while(raw[i]!=="]"){items.push(parse(depth+1));ws();if(raw[i]!==",")break;i++;}i++;return {start,end:i,value:items.map(n=>n.value),items};
    }
    if(c==='"')string();else while(i<raw.length&&!/[\s,}\]]/.test(raw[i]))i++;
    return {start,end:i,value:JSON.parse(raw.slice(start,i))};
  };
  const original=JSON.parse(raw) as Record<string,unknown>;
  if(!original||typeof original!=="object"||Array.isArray(original))throw new AppError("SUBJECT_JSON_INVALID",422);
  const tree=parse();edit(original);
  const render=(node:Node|undefined,value:unknown):string=>{
    if(node&&JSON.stringify(node.value)===JSON.stringify(value))return raw.slice(node.start,node.end);
    if(Array.isArray(value))return "["+value.map((v,j)=>render(node?.items?.[j],v)).join(",")+"]";
    if(value&&typeof value==="object")return "{"+Object.entries(value).filter(([,v])=>v!==undefined).map(([key,v])=>(node?.keys?.get(key)?.literal??JSON.stringify(key))+":"+render(node?.keys?.get(key)?.node,v)).join(",")+"}";
    return JSON.stringify(value);
  };
  return render(tree,original);
}
