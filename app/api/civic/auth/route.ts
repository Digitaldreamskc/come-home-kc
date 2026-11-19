import {reviewUserAllowed} from '@/lib/platform/preview-access';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {civicWorkspaceGranted} from '@/lib/platform/civic-access';
import {civicSession} from '@/lib/platform/session';
import {sameOrigin,body,fail} from '@/lib/http';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return fail('Origin not allowed',403);
 try{const input=z.object({email:z.email(),password:z.string().min(1).max(200)}).strict().parse(await body(req));if(!reviewUserAllowed(input.email))return fail('Unable to sign in',401);const {db}=await civicSession();const r=await db.auth.signInWithPassword(input);if(r.error)return fail('Could not sign in. Check your details.',401);const membership=await db.rpc('program_workspace');if(!civicWorkspaceGranted(!membership.error)){await db.auth.signOut();return fail('This account cannot access this workspace.',403);}return NextResponse.json({ok:true});}catch{return fail('Unable to sign in.',400);}
}
export async function DELETE(req:NextRequest){if(!sameOrigin(req))return fail('Origin not allowed',403);const {db}=await civicSession();await db.auth.signOut();return NextResponse.json({ok:true});}
