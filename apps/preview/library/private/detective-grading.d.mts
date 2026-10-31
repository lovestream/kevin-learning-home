import type {PrivateCase} from '../contract.ts';
export function matchesResponse(response:PrivateCase['content']['repair'],value:string):boolean;
export function orderedReasons(c:PrivateCase):{text:string;index:number}[];
export function matchesReason(c:PrivateCase,index:number):boolean;
