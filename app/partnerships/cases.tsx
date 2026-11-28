import { formatPartnershipDate, partnershipDate } from '@/lib/partnership-calendar';
import { approvedResources,capitalProfiles } from '@/lib/regional-sources';
import {ecosystemProviders} from '@/lib/ecosystem-providers';
import { session } from '@/lib/supabase';
import ProviderFollowupForm from './provider-followup-form';
import { providerStages, type CaseProvider, type ProviderFollowup, type ProviderOwner } from '@/lib/provider-followups';
import { save } from '../ecosystem/actions';
export type Case={id:string;kind:string;state:string;employer:string;deliverable:string;organization:string;event:string|null;own:boolean;staff:boolean;recipient:boolean;need:string|null;permission:string;role:string|null};
export default async function Cases({cases,events}:{cases:Case[];events:{id:string;host_organization_id:string;title:string}[]}){
 const {db}=await session();
 const [resources,choices]=cases.some(c=>c.kind==='welcome')?await Promise.all([approvedResources().catch(()=>null),db.rpc('welcome_resource_choices')]):[[],{data:[]}];
 const staffCases=cases.filter(c=>c.staff);
 const [capital,support,workspace]=staffCases.length ? await Promise.all([
  capitalProfiles().catch(()=>null), ecosystemProviders().catch(()=>null),
  db.rpc('case_provider_workspace',{case_ids:staffCases.map(c=>c.id)}),
 ]) : [[],[],{data:null,error:null}];
 const plans=(workspace.data?.followups ?? []) as ProviderFollowup[];
 const owners=(workspace.data?.owners ?? []) as ProviderOwner[];
 const providers:CaseProvider[]=[
   ...(capital ?? []).map(p=>({id:p.entity_id,name:p.name,dataset:'atlas' as const})),
   ...(support ?? []).map(p=>({id:p.id,name:p.name,dataset:'ecosystem' as const})),
 ].sort((a,b)=>a.name.localeCompare(b.name));
 const statusLabel=(stage:string)=>providerStages.find(([key])=>key===stage)?.[1] ?? stage;
 return <section><h2>Relationship follow-up</h2>{!cases.length&&<p>No requests in your queue.</p>}{cases.map(c=><article key={c.id}><h3>{c.employer} · {c.kind==='talent'?'Professional introduction':'Newcomer welcome'}</h3>
 <p>{c.deliverable} · {c.state}</p><p>{c.role||c.need||c.event}</p><p>{c.permission}</p>{c.event&&<p>Recommended gathering · {c.event}</p>}
 {c.kind==='welcome'&&c.state==='requested'&&c.staff&&<>{resources?.length?<form action={save}><input type="hidden" name="operation" value="directory"/><input type="hidden" name="case" value={c.id}/><label>Jessica’s List recommendation<select name="listing">{resources.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label><button>Recommend resource</button></form>:<p>{resources===null?'Jessica’s List is unavailable.':'Jessica’s List has no published recommendations.'}</p>}</>}
 {resources?.filter(r=>choices.data?.some((x:{case_id:string;directory_id:string})=>x.case_id===c.id&&x.directory_id===String(r.id))).map(r=><p key={r.id}>Recommended resource · {r.name} {r.website?.startsWith('https://')&&<a href={r.website}>Visit resource</a>}</p>)}
 {c.staff&&<details><summary>Capital and business support follow-ups</summary>
 {workspace.error&&<p role="alert">Provider follow-ups are unavailable.</p>}
 {(capital===null||support===null)&&<p role="alert">One or more provider directories are unavailable.</p>}
 {plans.filter(plan=>plan.case_id===c.id).map(plan=><article key={plan.id}>
   <h4>{providers.find(p=>p.dataset===plan.dataset&&p.id===plan.provider_id)?.name ?? plan.provider_id}</h4>
   <p>{statusLabel(plan.stage)} · {owners.find(owner=>owner.id===plan.owner_id)?.label ?? 'Unassigned'} · Due {formatPartnershipDate(plan.due_on)}</p>
   <p>{plan.rationale}</p><p>{plan.next_action}</p>
   <p><a href={plan.source_url}>Source evidence</a> · Checked {formatPartnershipDate(partnershipDate(plan.source_checked_at))}</p>
   <details><summary>Progress history</summary><ul>{plan.history.map(entry=><li key={entry.id}>{formatPartnershipDate(partnershipDate(entry.recorded_at))} · {statusLabel(entry.stage)}{entry.evidence&&' · '+entry.evidence}</li>)}</ul></details>
   {c.state!=='withdrawn'&&c.state!=='reported'&&owners.length>0&&<ProviderFollowupForm caseId={c.id} providers={providers} owners={owners} followup={plan}/>}
 </article>)}
 {c.state!=='withdrawn'&&c.state!=='reported'&&providers.length>0&&owners.length>0&&<section><h4>Identify a potential resource</h4><ProviderFollowupForm caseId={c.id} providers={providers} owners={owners}/></section>}
 </details>}
 {([['refer',c.staff&&c.state==='requested','Review permission and refer'],['accept',c.recipient&&c.kind==='talent'&&c.state==='referred','Accept introduction'],['complete',c.own&&(c.state==='accepted'||c.kind==='welcome'&&c.state==='referred'),'Report completed connection'],['withdraw',c.own&&c.state!=='withdrawn','Withdraw permission']] as const).filter(x=>x[1]).map(([op,,label])=><form key={op} action={save}><input type="hidden" name="operation" value={op}/><input type="hidden" name="case" value={c.id}/>{op==='refer'&&c.kind==='welcome'&&<label>Gathering<select required name="event">{events.filter(e=>e.host_organization_id===c.organization).map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>}<button>{label}</button></form>)}</article>)}</section>
}
