import {NextRequest,NextResponse} from 'next/server';
import {requestOrigin} from '@/lib/http';
import {userDb} from '@/lib/supabase';
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 const next=req.nextUrl.searchParams.get('next')==='/reset-password'?'/reset-password':'/portal';
 if(code){try{const db=await userDb();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,requestOrigin(req)));}catch{}}
 return NextResponse.redirect(new URL('/reset-password?error=invalid_link',requestOrigin(req)));
}
