import {safeAuthDestination} from '@/lib/onboarding';
import {NextRequest,NextResponse} from 'next/server';
import {requestOrigin} from '@/lib/http';
import {userDb} from '@/lib/supabase';
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 const next=safeAuthDestination(req.nextUrl.searchParams.get('next'));
 if(code){try{const db=await userDb();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,requestOrigin(req)));}catch{}}
 return NextResponse.redirect(new URL(next==='/reset-password'?'/reset-password?error=invalid_link':'/login?error=invalid_link&next='+encodeURIComponent(next),requestOrigin(req)));
}
