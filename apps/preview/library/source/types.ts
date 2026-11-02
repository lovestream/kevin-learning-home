import type {ThinkingToolState} from './thinking-tools.mjs';
export type Lesson={lab:string;labConfig:Record<string,unknown>};
export type ThinkingCard={originUnit:string;title:string};
export type ThinkingRecord={tool?:ThinkingToolState;toolHistory?:unknown[];variant?:unknown};
export type {PublicCase} from '../contract.ts';
