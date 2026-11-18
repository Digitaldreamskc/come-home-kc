import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {tenant} from '@/lib/tenant-config';
import {body,fail,sameOrigin} from '@/lib/http';
import {applyAction,project,type Action} from '@/lib/paths/model';
import {createSession,demoAllowed,getSession} from '@/lib/paths/demo-store';
export const runtime='nodejs';
const cookie='back2kc-path-review';
const id=z.string().min(1).max(100),note=z.string().max(500);
const action=z.discriminatedUnion('type',[
 z.object({type:z.literal('draft'),pathId:id,note,shareContext:z.boolean(),shareEmail:z.boolean()}).strict(),
 z.object({type:z.literal('transition'),requestId:id,to:z.enum(['team_declined','changes_requested','submitted','connector_reviewing','connector_declined','connector_accepted','recipient_reviewing','recipient_declined','recipient_accepted','introduced','replied','completed','cancelled']),consent:z.boolean().optional(),shareEmail:z.boolean().optional(),note:note.optional()}).strict(),
 z.object({type:z.literal('followup'),requestId:id,connected:z.boolean(),note}).strict(),
 z.object({type:z.literal('pause'),pathId:id,paused:z.boolean()}).strict(),
 z.object({type:z.literal('confirm'),pathId:id,edgeId:id,visible:z.boolean(),willing:z.boolean()}).strict(),
 z.object({type:z.literal('verify'),pathId:id,edgeId:id,evidence:note}).strict(),
 z.object({type:z.literal('revoke'),pathId:id,edgeId:id}).strict(),
 z.object({type:z.literal('information'),requestId:id,note}).strict(),
 z.object({type:z.literal('linkedin'),url:z.string().max(300)}).strict(),
]);
function reply(data:unknown){return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});}
export async function GET(req:NextRequest){if(!demoAllowed(req.headers.get('host')))return fail('Not found.',404);try{return reply(project(getSession(req.cookies.get(cookie)?.value,tenant.id).workspace,getSession(req.cookies.get(cookie)?.value,tenant.id).actor));}catch{return fail('Start a local demonstration workspace.',401);}}
export async function POST(req:NextRequest){if(!demoAllowed(req.headers.get('host')))return fail('Not found.',404);if(!sameOrigin(req))return fail('Origin not allowed.',403);try{const input=await body(req);
 if(input.type==='start'){z.object({type:z.literal('start')}).strict().parse(input);const {token,session}=createSession(tenant.id,tenant.key!=='back2kc'&&process.env.PATH_DEMO_CIVIC==='1');const response=reply(project(session.workspace,session.actor));response.cookies.set(cookie,token,{httpOnly:true,sameSite:'strict',path:'/api/path-demo',maxAge:7200,secure:req.nextUrl.protocol==='https:'});return response;}
 const session=getSession(req.cookies.get(cookie)?.value,tenant.id);
 if(input.type==='demo_actor'){const p=z.object({type:z.literal('demo_actor'),actor:z.enum(['requester','jordan','avery','recipient','admin'])}).strict().parse(input);session.actor=p.actor;}
 else applyAction(session.workspace,session.actor,action.parse(input) as Action);
 return reply(project(session.workspace,session.actor));
 }catch(e){return fail(e instanceof z.ZodError?'Check the request fields.':e instanceof Error?e.message:'Request not saved.');}}
