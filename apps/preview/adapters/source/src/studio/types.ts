import type {OperationModel} from '../../shared/operation-models.mjs';
import type {HandsOnModel} from '../../shared/hands-on-models.mjs';
import type {TextbookModel} from '../../shared/textbook-models.mjs';
import type {IntroVisual} from '../../shared/intro-visuals.mjs';
export type WidgetKind='fraction'|'area'|'substitution'|'balance'|'quantity'|'addition'|'subtraction'|'mixedOperations'|'lengthWorkbench'|'conceptLab';
export type WidgetFields={
  textbookVersion?:1;bank?:number[];alloc?:number[];cuts?:number[];width?:number;angle?:number;rotation?:number;sideLength?:number;shirt?:number;pants?:number;offset?:number;year?:number;month?:number;minutes?:number;action?:string;mode?:string;sceneId?:string;modelStateVersion?:string;
  extensionVersion?:1;modelType?:OperationModel['type'];conceptVersion?:number;labVersion?:number;
  prediction?:string;intermediate?:string;error?:string;explanation?:string;guess?:string;
  choice?:string|number;parameter?:number;reverseStep?:number;step?:number;
  top?:number;bottom?:number;left?:number;right?:number;rows?:number;parts?:number;take?:number;whole?:number;
  walk?:number;startMm?:number;overlap?:number;spacing?:number;joint?:number;target?:number;placed?:number;
  filled?:number[];sent?:number[];marked?:number[];opened?:number[];inspected?:number[];
  spread?:boolean;show?:boolean;checked?:boolean;showReason?:boolean;observed?:boolean;
  transposed?:boolean;compared?:boolean;closed?:boolean;zoom?:boolean;broken?:boolean;
  actions?:{action:string;before:string|null;after:string|null;valid?:boolean;at?:string}[];
  handsOnVersion?:2;cameraAzimuth?:number;cameraElevation?:number;rearHeight?:number;foldProgress?:number;faceId?:number;otherFaceId?:number;
  photos?:number[];scaleItems?:number[];weights?:number[];boatStones?:number[];weighed?:number[];massUnit?:string;weighingStone?:number;
  elephant?:boolean;passenger?:boolean;waterlineMarked?:boolean;predicted?:boolean;chapterScreen?:number;parentMode?:boolean;
};
export type WidgetState=(WidgetFields&{stateKind?:'legacy'})
  |(WidgetFields&{stateKind:'operation-extension';extensionVersion:1;modelType:OperationModel['type']})
  |(WidgetFields&{stateKind:'mixed-operations';sceneId:string;modelStateVersion:string})
  |(WidgetFields&{stateKind:'textbook';textbookVersion:1;sceneId:string;modelStateVersion:string})
  |(WidgetFields&{stateKind:'hands-on';handsOnVersion:2;sceneId:string;modelStateVersion:string});
export type QuantityRef={id:string;value:number;unit:string;role:string};
export type ExpressionAST={type:'number';value:number}|{type:'operation';operator:'add'|'subtract'|'multiply'|'divide';left:ExpressionAST;right:ExpressionAST;grouped?:boolean};
export type MathScene={sceneId:string;lessonId:string;story:{text:string;quantities:QuantityRef[]};expressionAST:ExpressionAST;model:{type:string;quantityRefs:string[];state:unknown};target:{prompt:string};taskMode:'A_order_and_model'|'B_equivalent_rewrite'|'C_operation_law'|'other';contentVersion:string};
export type LengthScene={sceneId:string;mode:'ruler'|'boards'|'chain'|'interval'|'route';title:string;prompt:string;pieceLengthsMm?:number[];overlapsMm?:number[];thicknessMm?:number;count?:number;startMm?:number;endMm?:number;spacingMm?:number;closed?:boolean;explanation:string};
export type ConceptFamily='spatial'|'operations'|'mass'|'placeValue'|'coding'|'angles'|'fractions'|'planning'|'transform'|'division'|'boundary'|'areaGrid'|'data'|'time'|'decimals'|'sets';
export type ConceptScene={sceneId:string;family:ConceptFamily;variant:string;title:string;prompt:string;initialState:string;learnerAction:string;observableChange:string;question:string;wrongActionFeedback:string;guidance:{label:string;explanation:string}[];values:number[];labels:string[];modelSpec?:OperationModel;handsOnSpec?:HandsOnModel;textbookSpec?:TextbookModel;modelStatus?:'registered'|'static-review'};
export type DiagramKind='readingCorner'|'joinedTiles'|'ribbon'|'unequalRibbon'|'groupedRibbon'|'snackBox'|'threeSnacks'|'candyEquality'|'picnicCount'|'countSpacing'|'appleAddition'|'appleTransfer'|'stickerTake'|'stickerCompare';

export type MeasurementTaskDiagram={type:'measurement';mode:'chain'|'boards'|'ruler'|'interval'|'route';unknown?:'thickness'|'pieceLength';totalMm?:number;pieceLengthMm?:number;pieceLengthsMm?:number[];thicknessMm?:number;count?:number;overlapsMm?:number[];startMm?:number;endMm?:number;lengthMm?:number;spacingMm?:number;closed?:boolean;sectionLengthsMm?:number[];sectionLabels?:string[];progressMm?:number;caption?:string};

export type PilotLesson={mathScenes?:MathScene[];conceptScenes?:ConceptScene[];lengthScenes?:LengthScene[]};
