import {NextRequest,NextResponse} from 'next/server';
import {session} from '@/lib/supabase';
import {body,fail,sameOrigin} from '@/lib/http';
import {pathCommand,persistentPreviewAllowed} from '@/lib/paths/persistent';
import {z} from 'zod';
const reply=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:NextRequest){
 if(!persistentPreviewAllowed(req.headers.get('host')))return fail('Not found.',404);
 try{const {db,user}=await session();if(!user)return fail('Sign in with a confirmed email to continue.',401);
 const attempt=req.nextUrl.searchParams.get('contacts');
 const result=attempt?await db.rpc('path_contacts',{attempt_id:z.uuid().parse(attempt)}):await db.rpc('path_workspace');
 if(result.error)return fail('This workspace or request is not available to your account.',403);
 return reply(result.data);
 }catch{return fail('Could not load your connections.',503);}
}
export async function POST(req:NextRequest){
 if(!persistentPreviewAllowed(req.headers.get('host')))return fail('Not found.',404);
 if(!sameOrigin(req))return fail('Origin not allowed.',403);
 try{const command=pathCommand.parse(await body(req));const {db,user}=await session();if(!user)return fail('Sign in to continue.',401);
 const result=await db.rpc('path_command',{command});
 if(result.error)return fail('This action could not be saved. Refresh to check the current step and permissions.',409);
 return reply({id:result.data});
 }catch{return fail('Check the fields and try again.');}
}
