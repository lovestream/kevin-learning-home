import {lazy,Suspense} from 'react';
const CoreWorkbench=lazy(()=>import('./CoreWorkbench.tsx'));
import type {WidgetState} from '../types.ts';
import type {TextbookModel} from '../../../shared/textbook-models.mjs';
import BankWorkbench from './BankWorkbench.tsx';
import AngleWorkbench from './AngleWorkbench.tsx';
import FractionWorkbench from './FractionWorkbench.tsx';
import MotionWorkbench from './MotionWorkbench.tsx';
import GeometryWorkbench from './GeometryWorkbench.tsx';
import DataWorkbench from './DataWorkbench.tsx';
import SymbolWorkbench from './SymbolWorkbench.tsx';
import TimeWorkbench from './TimeWorkbench.tsx';
import './textbook.css';
export default function TextbookWorkbench(props:{model:TextbookModel;sceneId:string;value:WidgetState;onChange:(s:WidgetState)=>void}){
 const type=props.model.type;
 if(props.model.cases)return <Suspense fallback={<p role="status">正在摆好本课教具…</p>}><CoreWorkbench {...props}/></Suspense>;
 if(type==='place-value'||type==='division')return <BankWorkbench {...props}/>;
 if(type==='angle')return <AngleWorkbench {...props}/>;
 if(type==='fraction')return <FractionWorkbench {...props}/>;
 if(type==='paper-fold'||type==='motion')return <MotionWorkbench {...props}/>;
 if(['boundary','joining','tiling','cut-area'].includes(type))return <GeometryWorkbench {...props}/>;
 if(['vote','data-bins','sets'].includes(type))return <DataWorkbench {...props}/>;
 if(type==='calendar'||type==='clock')return <TimeWorkbench {...props}/>;
 return <SymbolWorkbench {...props}/>;
}
