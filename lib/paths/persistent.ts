import {z} from 'zod';
// Match the database's immutable 2026-11-18.1 wording; browser tests compare stored facts.
export const pathConsentText={
 request:'Share my display name, this note, and the selected opportunity with the named connector and recipient if the team approves each step. My private profile and resume are not included.',
 connector:'I agree to help with this introduction and permit the team to forward this approved request to the named recipient.',
 recipient:'I accept this specific introduction. My private profile remains private.',
 email:'Share my email only with the other named participant after the team records this introduction. This does not approve future introductions.'
} as const;
const id=z.uuid(), note=z.string().max(500), opportunity=z.string().max(200);
export const pathCommand=z.discriminatedUnion('type',[
 z.object({type:z.literal('draft'),first_edge:id,second_edge:id,note,opportunity}).strict(),
 z.object({type:z.literal('save'),attempt_id:id,note,opportunity}).strict(),
 z.object({type:z.literal('revise'),attempt_id:id}).strict(),
 z.object({type:z.literal('confirm'),edge_id:id,visible:z.boolean(),willing:z.boolean()}).strict(),
 z.object({type:z.literal('transition'),attempt_id:id,to:z.enum(['submitted','connector_reviewing','connector_accepted','connector_declined','recipient_reviewing','recipient_accepted','recipient_declined','introduced','changes_requested','team_declined','cancelled','completed']),note:note.optional(),share_context:z.boolean().optional(),share_email:z.boolean().optional(),consent:z.boolean().optional()}).strict(),
 z.object({type:z.literal('followup'),attempt_id:id,connected:z.boolean(),note}).strict(),
 z.object({type:z.literal('information'),attempt_id:id,note}).strict()
]);
export type PathCommand=z.infer<typeof pathCommand>;
export type PersistentAttempt={id:string;request_id:string;attempt_no:number;state:string;note:string;opportunity:string;expires_at:string;invalidated_at:string|null;requester:string;connector:string;recipient:string;role:'requester'|'connector'|'recipient'|'reviewer';consents:{person_id:string|null;purpose:string;wording:string;version:string;granted:boolean;recorded_at:string;effective:boolean}[];events:{kind:string;at:string;note:string|null}[]};
export type PersistentWorkspace={title:string;reviewer:boolean;person_id:string|null;display_name:string|null;routes:{first_edge:string;second_edge:string;connector:string;recipient:string;first_context:string;second_context:string}[];relationships:{id:string;context:string;other:string;visible:boolean;willing:boolean;confirmed_at:string|null;reconfirm_by:string|null}[];attempts:PersistentAttempt[]};
// Phase 2 is deliberately restricted to the authorized isolated database and local preview.
export function persistentPreviewAllowed(host:string|null){return process.env.ENABLE_LOCAL_DEMO==='1'&&!process.env.VERCEL&&/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host||'')&&process.env.NEXT_PUBLIC_SUPABASE_URL==='https://kxuvmilbvwwcrxiqnftx.supabase.co';}
