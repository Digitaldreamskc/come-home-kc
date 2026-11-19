import {reviewUserAllowed} from './platform/preview-access';
import {emailConfirmed} from './onboarding';
import { tenant } from './tenant-config';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export function configured(){return !!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);}
export function publicDb(){if(!configured())throw Error('Development database is not configured.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{global:{headers:{'x-tenant-id':tenant.id}},auth:{persistSession:false,autoRefreshToken:false}});}
export async function userDb(){if(!configured())throw Error('Development database is not configured.');const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{global:{headers:{'x-tenant-id':tenant.id}},cookies:{getAll(){return jar.getAll();},setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components cannot write cookies; route handlers refresh sessions. */}}}});}
export async function session(){const db=await userDb();const {data:{user}}=await db.auth.getUser();return {db,user:emailConfirmed(user)&&reviewUserAllowed(user?.email)?user:null};}
