import {NextRequest,NextResponse} from 'next/server';
import {civicSession} from '@/lib/platform/session';
import {sameOrigin,body,fail} from '@/lib/http';
import {loadProgramWorkspace} from '@/lib/platform/workspace';
import {programCommand} from '@/lib/platform/program';
export async function GET(){try{const {db,user}=await civicSession();if(!user)return fail('Sign in to continue',401);const data=await loadProgramWorkspace(db);return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});}catch{return fail('Could not load this workspace',503);}}
export async function POST(req:NextRequest){if(!sameOrigin(req))return fail('Origin not allowed',403);try{const command=programCommand.parse(await body(req));const {db,user}=await civicSession();if(!user)return fail('Sign in to continue',401);const r=await db.rpc('program_command',{command});if(r.error)return fail('This action is unavailable. Check your permissions and refresh.',409);return NextResponse.json({id:r.data});}catch{return fail('Check the form fields and try again');}}
