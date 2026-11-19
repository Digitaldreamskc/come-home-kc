export type Capability = 'summarize'|'extract'|'suggest-match'|'preview-import'|'draft-notification';
export type ExtensionContext = {tenantId:string;allowed:readonly Capability[];humanReviewRequired:true};
export type DraftResult = {status:'draft';data:unknown;requiresApproval:true}|{status:'unavailable';reason:string};
export interface AIProvider {id:string;capabilities:readonly Capability[];run(capability:Capability,input:unknown,context:ExtensionContext):Promise<DraftResult>}
export const noAI:AIProvider={id:'none',capabilities:[],async run(){return {status:'unavailable',reason:'AI is not configured. Manual workflows remain available.'};}};
export interface Connector {id:string;version:1;capabilities:readonly Capability[];network:false;run(input:unknown,context:ExtensionContext):Promise<DraftResult>}
const jsonPreview:Connector={id:'json-preview',version:1,capabilities:['preview-import'],network:false,async run(input,context){
  if(!context.tenantId||!context.allowed.includes('preview-import'))throw Error('Capability denied');
  if(!Array.isArray(input)||input.length>1000)throw Error('Expected at most 1000 input records');
  return {status:'draft',data:{count:input.length},requiresApproval:true};
}};
const registry:Readonly<Record<string,Connector>>=Object.freeze({'json-preview':jsonPreview});
export function connector(id:string,enabled:readonly string[]):Connector{
  if(!enabled.includes(id)||!Object.hasOwn(registry,id))throw Error('Connector disabled or unknown');
  return registry[id];
}
