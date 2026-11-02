import type {SelfQuestion} from './detective-self-questions.mjs';
export function evaluateCheckEvidence(question:SelfQuestion,answer:string,value:string,expression:string):{verified:boolean;reason:string};
