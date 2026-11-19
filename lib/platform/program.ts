import {z} from 'zod';
const short=z.string().max(500),id=z.uuid();
export const profileSchema=z.object({name:z.string().min(1).max(200),background:short,interests:z.array(z.string().max(80)).max(12),skills:short,affiliations:short,leadership:short,participation:short,availability:short,linkedin:z.string().max(200).refine(v=>!v||/^https:\/\/(www\.)?linkedin\.com\/in\/[^ /]+\/?$/.test(v),'Use a LinkedIn profile link'),introductionPreference:z.enum(['Ask me each time','Not seeking introductions'])}).strict();
export const programCommand=z.discriminatedUnion('type',[
 z.object({type:z.literal('profile'),payload:profileSchema}).strict(),
 z.object({type:z.literal('learning'),catalog_id:id,state:z.enum(['reviewed','completed_self_reported']),note:short}).strict(),
 z.object({type:z.literal('interest'),catalog_id:id,consent:z.literal(true),note:short}).strict(),
 z.object({type:z.literal('withdraw_interest'),id}).strict(),
 z.object({type:z.literal('catalog_status'),id,state:z.enum(['closed','withdrawn'])}).strict(),
 z.object({type:z.literal('outcome'),catalog_id:id,note:short}).strict(),
 z.object({type:z.literal('catalog'),organization_id:id,kind:z.enum(['learning','opportunity']),title:z.string().min(1).max(200),description:z.string().max(2000),category:short,jurisdiction:short,requirements:short,process:short,deadline:z.iso.date().nullable().optional()}).strict(),
 z.object({type:z.literal('review'),id,state:z.enum(['approved','declined'])}).strict(),
 z.object({type:z.literal('interest_decision'),id,state:z.enum(['conversation_invited','declined'])}).strict(),
]);
export type ProgramCommand=z.infer<typeof programCommand>;
export type CivicProfile=z.infer<typeof profileSchema>;
export type Catalog={id:string;organization_id:string;kind:'learning'|'opportunity';title:string;description:string;category:string;jurisdiction:string;requirements:string;process:string;deadline:string|null;status:string;available:boolean};
export type ProgramRecord={id:string;catalog_id:string;kind:string;state:string;note:string;created_at:string;consent_wording:string|null};
export type ProgramEvent={id:string;entity_id:string;catalog_id:string;kind:string;version:string;created_at:string;snapshot:{state?:string;status?:string;note?:string;consent_wording?:string;consented_at?:string}};
export type ProgramWorkspace={connections?:{id:string;state:string}[];reviewer:boolean;profile:CivicProfile|null;organizations:{id:string;name:string}[];catalog:Catalog[];records:ProgramRecord[];review_records:ProgramRecord[];organization_records:ProgramRecord[];history:ProgramEvent[]};
export const interestWording='Share this expression of interest with this opportunity organization. My private civic profile and email are not included.';
