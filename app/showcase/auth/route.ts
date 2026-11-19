import {reviewUserAllowed} from '@/lib/platform/preview-access';
import {NextRequest,NextResponse} from 'next/server';
import {session} from '@/lib/supabase';
import {sameOrigin,body,fail} from '@/lib/http';
import {z} from 'zod';
export async function POST(req:NextRequest){if(!sameOrigin(req))return fail('Origin not allowed',403);try{const input=z.object({email:z.email(),password:z.string().min(1).max(200)}).strict().parse(await body(req));if(!reviewUserAllowed(input.email))return fail('Unable to sign in',401);const {db}=await session();const r=await db.auth.signInWithPassword(input);if(r.error)return fail('Unable to sign in',401);const a=await db.rpc('showcase_access');if(a.error||!a.data){await db.auth.signOut();return fail('Review access required',403);}return NextResponse.json({ok:true});}catch{return fail('Unable to sign in');}}
