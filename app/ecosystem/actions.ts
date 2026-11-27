'use server';
import {workspaceReturn} from '@/lib/workspace-return';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { session } from '@/lib/supabase';
import { regionalResearch, approvedResources, atlasProviders } from '@/lib/regional-sources';

export async function save(form:FormData){
 const values=Object.fromEntries(form.entries());
 const operation=String(values.operation);
 const profile=String(values.organization||'');
 const dest=values.from==='profile' && /^[0-9a-f-]{36}$/.test(profile)?'/employers/'+profile:'/partnerships';
 const {user,db}=await session();
 if(!user)redirect('/login?next='+encodeURIComponent(dest));
 if(operation==='activate'){
  let commitments:unknown;try{commitments=JSON.parse(String(values.commitments));}catch{redirect(await workspaceReturn('unavailable'));}
  const {data,error}=await db.rpc('activate_partner',{command:{...values,commitments}});
  if(error||typeof data!=='string')redirect(await workspaceReturn('unavailable'));
  revalidatePath('/partnerships');revalidatePath('/admin');
  redirect('/partnerships?view=overview&agreement='+encodeURIComponent(data)+'&status=saved');
 }
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
 if(operation==='atlas-review'){
  const provider=(await atlasProviders().catch(()=>[])).find(p=>p.link_id===values.provider);
  const rationale=String(values.rationale||'').trim();
  if(!provider||!rationale||rationale.length>1000)redirect(await workspaceReturn('unavailable'));
  const {error}=await db.rpc('queue_atlas_provider_review',{case_id:values.case,provider_id:provider.link_id,provider_name:provider.listed_name,provider_url:provider.profile_url,rationale});
  revalidatePath('/partnerships');revalidatePath('/admin');
  redirect(await workspaceReturn(error?'unavailable':'saved'));
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
