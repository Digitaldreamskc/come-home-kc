import 'server-only';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {civic} from './config';
import {emailConfirmed} from '../onboarding';
export async function civicSession(){
 const url=process.env.CIVIC_SUPABASE_URL,key=process.env.CIVIC_SUPABASE_PUBLISHABLE_KEY;
 if(url!=='https://kxuvmilbvwwcrxiqnftx.supabase.co'||!key)throw Error('Isolated civic database configuration required');
 const jar=await cookies();
 const db=createServerClient(url,key,{cookieOptions:{name:'civic-auth'},global:{headers:{'x-tenant-id':civic.id}},cookies:{getAll:()=>jar.getAll(),setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server component: refresh in route handler. */}}}});
 const {data:{user}}=await db.auth.getUser();return {db,user:emailConfirmed(user)?user:null};
}
