'use server';
import {workspaceReturn} from '@/lib/workspace-return';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { session } from '@/lib/supabase';
import { regionalResearch, approvedResources } from '@/lib/regional-sources';

export async function save(form:FormData){
 const values=Object.fromEntries(form.entries());
 const operation=String(values.operation);
 const profile=String(values.organization||'');
 const dest=values.from==='profile' && /^[0-9a-f-]{36}$/.test(profile)?'/employers/'+profile:'/partnerships';
 const {user,db}=await session();
 if(!user)redirect('/login?next='+encodeURIComponent(dest));
 if(operation==='welcome'){
  const {error}=await db.rpc('enroll_tenant');
  if(error)redirect(dest+'?status=unavailable');
 }
 if(operation==='interest'){
  const {data:profile,error}=await db.from('candidate_profiles').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!error&&!profile)redirect(dest+'?status=profile');
 }
 const isCase=['interest','welcome','withdraw','refer','accept','complete'].includes(operation);
 const command:Record<string,unknown>={...values};
 if(operation==='research'){
  const metric=(await regionalResearch()).find(x=>x.metric_id===values.metric);
  if(!metric)redirect(dest+'?status=unavailable');
  command.metric=metric;
 }
 if(operation==='strategy'){
  const {error}=await db.rpc('review_partner_strategy',{agreement:values.agreement,priorities:values.priorities,plan:values.plan,renewal:values.renewal});
  revalidatePath('/partnerships');redirect(dest==='/partnerships'?await workspaceReturn(error?'unavailable':'saved'):dest+'?status='+(error?'unavailable':'saved'));
 }
 if(operation==='directory'){
  const sources=await approvedResources();
  if(!sources.some(x=>String(x.id)===String(values.listing)))redirect(dest+'?status=unavailable');
  const {error}=await db.rpc('recommend_directory_resource',{case_id:values.case,listing:values.listing});
  revalidatePath('/partnerships');redirect(dest==='/partnerships'?await workspaceReturn(error?'unavailable':'saved'):dest+'?status='+(error?'unavailable':'saved'));
 }
 const {error}=await db.rpc(isCase?'partner_case_action':'configure_partner',{command});
 if(error)redirect(dest==='/partnerships'?await workspaceReturn('unavailable'):dest+'?status=unavailable');
 revalidatePath('/partnerships');revalidatePath('/ecosystem');revalidatePath('/employers/[id]','page');
 redirect(dest==='/partnerships'?await workspaceReturn('saved'):dest+'?status=saved');
}
