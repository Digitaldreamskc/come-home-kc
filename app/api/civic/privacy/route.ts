import {NextRequest,NextResponse} from 'next/server';
import {civicSession} from '@/lib/platform/session';
import {sameOrigin,fail} from '@/lib/http';
export async function POST(req:NextRequest){if(!sameOrigin(req))return fail('Origin not allowed',403);const {db,user}=await civicSession();if(!user)return fail('Sign in to continue',401);const member=await db.rpc('program_workspace');if(member.error)return fail('Workspace access required',403);const r=await db.rpc('path_request_deletion');if(r.error)return fail('Could not record your request',409);return NextResponse.json({message:'Deletion request saved. The privacy team must review retention and personal-data coverage before erasure. No information has been deleted yet.'});}
