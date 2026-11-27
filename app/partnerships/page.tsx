import { AgreementForm,Manage } from './configure';
import { importIntake } from './intake';
import Cases from './cases';
import IntelligenceWorkspace from './intelligence';
import {workspaceReturn} from '@/lib/workspace-return';
import SiteHeader from '@/components/site-header';
import '@/app/connected.css';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { configured, session } from '@/lib/supabase';

type Commitment = {id:string; pillar:string; deliverable:string; due:string; state:string; owner:string|null; approvedAt:string|null; evidence:string|null};
type Agreement = {id:string; employer:string; synthetic:boolean; contractingEntity:string; termStart:string; termEnd:string; value:number; scope:string; priorities:string[]; plan:string; reviews:string[]; renewal:string; commitments:Commitment[]};

async function recordDelivery(form:FormData) {
  'use server';
  const {db,user} = await session();
  if (!user) redirect('/login');
  const {error} = await db.rpc('partner_delivery', {commitment:form.get('commitment'), action:form.get('action'), evidence:form.get('evidence')});
  if (error) redirect(await workspaceReturn('unavailable'));
  revalidatePath('/partnerships');
  redirect(await workspaceReturn('saved'));
}

export default async function Partnerships({searchParams}:{searchParams:Promise<{status?:string;view?:string;agreement?:string;q?:string;stage?:string}>}) {
  if (!configured()) return <main className="work-room"><h1>Partnership workspace unavailable</h1></main>;
  const {db,user} = await session();
  if (!user) redirect('/login?next=/partnerships');
  const {data,error} = await db.rpc('partner_workspace');
  const query=await searchParams;
  const staff=data?.staff===true;
  const agreements:Agreement[]=data?.agreements||[];
  const a=agreements.find(x=>x.id===query.agreement)||agreements[0];
  const views=staff?['Overview','Follow-ups','Fulfillment','Publishing','Reports','Intelligence','Intake','Onboarding']:a?['Overview','Follow-ups','Fulfillment','Reports']:['Follow-ups'];
  const view=views.find(v=>v.toLowerCase()===query.view)||views[0];
  function href(v:string,id=a?.id){const params=new URLSearchParams({view:v.toLowerCase()});if(id)params.set('agreement',id);return '/partnerships?'+params;}
  const [queue,events,orgs,jobs,publication]=await Promise.all([
    db.rpc('partner_case_queue'),db.from('events').select('id,title,host_organization_id,starts_at').eq('status','published'),
    view==='Onboarding'&&staff?db.from('organizations').select('id,name').eq('verification_status','verified'):Promise.resolve({data:[]}),
    db.from('job_postings').select('id,title,organization_id').eq('status','active'),
    a?db.rpc('partner_publications',{agreement:a.id}):Promise.resolve({data:null,error:null})]);
  const onboardingTasks=staff&&a?await db.from('tasks').select('id,action,owner,due_date,status').contains('source_record',{agreement_id:a.id}).order('due_date'):null;
  const pub=publication.data;
  const activeJobs=(jobs.data||[]).filter(x=>x.organization_id===pub?.organization);
  const activeEvents=(events.data||[]).filter(x=>x.host_organization_id===pub?.organization);
  const approved=a?.commitments.filter(c=>c.state==='approved').length||0;
  const cases=queue.data||[];
  return <><SiteHeader/><main className="work-room"><div className="work-heading"><p className="eyebrow">{staff?'2KC team workspace':a?'Employer partner workspace':'Participant workspace'}</p><h1>{staff?'Partner operations':a?.employer||'Your connections'}</h1>
  {a&&<p>{a.synthetic?'Validation agreement · ':''}{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(a.value)} annual partnership · {a.termStart} to {a.termEnd}</p>}</div>
  <div className="work-layout"><aside><nav className="work-nav" aria-label="Workspace sections">{views.map(v=><Link aria-current={view===v?'page':undefined} key={v} href={href(v)}>{v}</Link>)}<Link href={staff?'/admin':'/portal'}>{staff?'Team records':'My account'}</Link></nav></aside>
  <div className="work-panel">{query.status&&<p role="status">{query.status==='saved'?'Saved.':query.status==='intake-access'?'Forms read access and an authorized synthetic response ID are required.':'The record could not be updated. Check the current status and try again.'}</p>}
  {(error||publication.error)&&<p role="alert">Partnership records could not be loaded.</p>}
  {agreements.length>1&&<form className="agreement-picker"><input type="hidden" name="view" value={view.toLowerCase()}/><label>Employer partnership<select name="agreement" defaultValue={a?.id}>{agreements.map(x=><option key={x.id} value={x.id}>{x.employer}</option>)}</select></label><button>Open agreement</button></form>}
  {a&&<section><h2>{staff?a.employer:view==='Overview'?'Partnership overview':view}</h2>
  {view==='Overview'&&<>{staff&&onboardingTasks&&<section><h3>Internal activation checklist</h3>{onboardingTasks.error?<p>Could not load activation tasks.</p>:<><p>{(onboardingTasks.data||[]).filter(t=>t.status==='Done').length} / {(onboardingTasks.data||[]).length} tasks complete</p><ul>{(onboardingTasks.data||[]).map(t=><li key={t.id}>{t.action} · {t.owner} · {t.due_date} · {t.status}</li>)}</ul><Link href="/admin?section=tasks">Manage internal tasks</Link></>}</section>}<div className="work-metrics"><Link href={href('Fulfillment')}><strong>{approved} / {a.commitments.length}</strong><span>Commitments approved</span></Link><Link href={href('Reports')}><strong>{pub?.reports.length||0}</strong><span>Approved reports</span></Link><Link href={href('Follow-ups')}><strong>{cases.filter((x:{state:string;organization:string})=>x.organization===pub?.organization&&!['withdrawn','reported'].includes(x.state)).length}</strong><span>Open follow-ups</span></Link></div>
  <h3>Activation plan</h3><p>{a.plan}</p><h3>Hiring priorities</h3><p>{a.priorities.join(', ')||'No priorities recorded.'}</p>
  <div className="work-pair"><section><h3>Published roles</h3>{activeJobs.length?activeJobs.map(j=><p key={j.id}><Link href={'/jobs/'+j.id}>{j.title}</Link></p>):<p>No current roles.</p>}</section><section><h3>Inside KC experiences</h3>{activeEvents.length?activeEvents.map(e=><p key={e.id}>{e.title} · {e.starts_at.slice(0,10)}</p>):<p>No published experiences.</p>}</section></div>
  {pub&&<Link className="button primary" href={'/employers/'+pub.organization}>Employer profile and stories</Link>}
  <h3>Reviews and renewal</h3><p>{a.reviews.join(' · ')||'No reviews scheduled.'} · {a.renewal}</p></>}
  {view==='Fulfillment'&&<><form className="agreement-picker"><input type="hidden" name="view" value="fulfillment"/><input type="hidden" name="agreement" value={a.id}/><label>Search commitments<input name="q" defaultValue={query.q}/></label><label>Delivery status<select name="stage" defaultValue={query.stage||''}><option value="">All statuses</option>{['scheduled','submitted','approved'].map(x=><option key={x}>{x}</option>)}</select></label><button>Filter</button></form>
        <h3>Partnership commitments</h3>
        <ul>{a.commitments.filter(c=>(!query.stage||c.state===query.stage)&&(!query.q||(c.pillar+' '+c.deliverable).toLowerCase().includes(query.q.toLowerCase()))).map(c=><li key={c.id}><strong>{c.pillar}</strong><p>{c.deliverable} · Due {c.due} · {c.state}</p>
          {data.staff && <><p>Owner · {c.owner}</p>{c.evidence && <p>Internal evidence · {c.evidence}</p>}
          {c.state!=='approved' && <form action={recordDelivery}>
            <input type="hidden" name="commitment" value={c.id}/>
            {c.state==='scheduled' && <label>Internal delivery evidence reference <input required maxLength={400} name="evidence"/></label>}
            <button name="action" value={c.state==='scheduled'?'submit':'approve'}>{c.state==='scheduled'?'Record delivery':'Approve partner update'}</button>
          </form>}</>}
        </li>)}</ul>
{!a.commitments.some(c=>(!query.stage||c.state===query.stage)&&(!query.q||(c.pillar+' '+c.deliverable).toLowerCase().includes(query.q.toLowerCase())))&&<p>No matching commitments.</p>}</>}
  {staff&&view==='Publishing'&&<Manage agreement={a.id} commitments={a.commitments} jobs={activeJobs} events={activeEvents}/>}
  {view==='Reports'&&pub&&<>        <h3>Approved period reports</h3>
        {pub.reports.length===0 && <p>No reports have been approved.</p>}
        {pub.reports.map((r:{start:string;end:string;snapshot:{deliveries:{deliverable:string;pillar:string}[];research:{metric_id:string;entity:string;definition:string;as_of:string;value:number;unit:string;source_url:string}[];attribution:string}})=><section key={r.start+r.end}><h4>{r.start} through {r.end}</h4><p>{r.snapshot.attribution}</p>
        <ul>{r.snapshot.deliveries.map((d,i)=><li key={i}>{d.pillar} · {d.deliverable}</li>)}</ul>
        {r.snapshot.research.length>0 && <p>Regional context from KC Capital Atlas. Each observation applies to the named entity and source period. These metrics do not measure hiring, newcomer activity or partner impact.</p>}{r.snapshot.research.map(m=><p key={m.metric_id}>{m.entity} · {m.value.toLocaleString()} {m.unit} · {m.as_of}. {m.definition} <a href={m.source_url}>Atlas source</a></p>)}</section>)}
</>}
  </section>}
  {view==='Follow-ups'&&(queue.error?<p role="alert">Follow-up queue unavailable.</p>:<Cases cases={a?cases.filter((x:{organization:string})=>x.organization===pub?.organization):cases} events={events.data||[]}/>)}
  {staff&&view==='Intelligence'&&<IntelligenceWorkspace agreement={a?.id} commitments={a?.commitments||[]} query={query.q}/>}
  {staff&&view==='Onboarding'&&<AgreementForm orgs={orgs.data||[]}/>}
  {staff&&view==='Intake'&&<section><h2>Newcomer intake</h2><p>Review source permissions before individual follow-up.</p><p><Link href="/admin?section=submissions">Review intake</Link> · <Link href="/admin?section=tasks">Open staff tasks</Link></p><details><summary>Import from Google Forms</summary><form action={importIntake}><button>Import authorized Google Form response</button></form></details></section>}
  {!a&&!error&&view==='Overview'&&<p>No agreements have been assigned.</p>}</div></div></main></>;
}
