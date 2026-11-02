// New target-side declaration; authored JS remains pinned in source-import.json.
export interface SelfQuestion {id:string;family:string;index:number;template:string;parameters:Record<string,unknown>;answer:string;checkTarget:string;checkPattern:string;checkRelations:{pattern:string;target:string}[];question:string;unit:string;unknownRole:string}
export function selfQuestion(family:string,index:number):SelfQuestion;
