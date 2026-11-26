'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { session } from '@/lib/supabase';
import { regionalResearch } from '@/lib/regional-sources';

export async function save(form:FormData){
 const values=Object.fromEntries(form.entries());
 const operation=String(values.operation);
 const profile=String(values.organization||'');
 const dest=values.from==='profile' && /^[0-9a-f-]{36}$/.test(profile)?'/employers/'+profile:'/partnerships';
 const {user,db}=await session();
 if(!user)redirect('/login?next='+encodeURIComponent(dest));
 const isCase=['interest','welcome','withdraw','refer','accept','complete'].includes(operation);
 const command:Record<string,unknown>={...values};
 if(operation==='research'){
  const metric=(await regionalResearch()).find(x=>x.metric_id===values.metric);
  if(!metric)redirect(dest+'?status=unavailable');
  command.metric=metric;
 }
 const {error}=await db.rpc(isCase?'partner_case_action':'configure_partner',{command});
 if(error)redirect(dest+'?status=unavailable');
 revalidatePath('/partnerships');revalidatePath('/ecosystem');revalidatePath('/employers/[id]','page');
 redirect(dest+'?status=saved');
}
