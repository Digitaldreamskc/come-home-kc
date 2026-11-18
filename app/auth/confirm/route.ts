import {NextRequest,NextResponse} from 'next/server';
import {requestOrigin} from '@/lib/http';
import {userDb} from '@/lib/supabase';
export async function GET(req:NextRequest){
 const token_hash=req.nextUrl.searchParams.get('token_hash'),type=req.nextUrl.searchParams.get('type');
 if(token_hash&&(type==='recovery'||type==='invite'||type==='email')){try{const db=await userDb();const {error}=await db.auth.verifyOtp({token_hash,type});if(!error)return NextResponse.redirect(new URL(type==='email'?'/portal':'/reset-password',requestOrigin(req)));}catch{}}
 return NextResponse.redirect(new URL('/reset-password?error=invalid_link',requestOrigin(req)));
}
