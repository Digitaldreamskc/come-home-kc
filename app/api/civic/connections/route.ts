import {NextRequest,NextResponse} from 'next/server';
import {civicSession} from '@/lib/platform/session';
import {body,fail,sameOrigin} from '@/lib/http';
import {pathCommand} from '@/lib/paths/persistent';
import {z} from 'zod';
export async function GET(req:NextRequest){try{const {db,user}=await civicSession();if(!user)return fail('Sign in to continue',401);const id=req.nextUrl.searchParams.get('contacts');const r=id?await db.rpc('path_contacts',{attempt_id:z.uuid().parse(id)}):await db.rpc('path_workspace');if(r.error)return fail('Workspace unavailable',403);return NextResponse.json(r.data,{headers:{'Cache-Control':'private, no-store'}});}catch{return fail('Unable to load connections',503);}}
export async function POST(req:NextRequest){if(!sameOrigin(req))return fail('Origin not allowed',403);try{const command=pathCommand.parse(await body(req));const {db,user}=await civicSession();if(!user)return fail('Sign in to continue',401);const r=await db.rpc('path_command',{command});if(r.error)return fail('Action not permitted at this step. Refresh and check your permissions.',409);return NextResponse.json({id:r.data});}catch{return fail('Check the fields and try again');}}
