import { AgreementForm,Manage } from './configure';
import { importIntake } from './intake';
import Cases from './cases';
import styles from './partnerships.module.css';
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
  if (error) redirect('/partnerships?status=unavailable');
  revalidatePath('/partnerships');
  redirect('/partnerships?status=saved');
}

export default async function Partnerships({searchParams}:{searchParams:Promise<{status?:string}>}) {
  if (!configured()) return <main className={styles.workspace}><h1>Partnership workspace unavailable</h1></main>;
  const {db,user} = await session();
  if (!user) redirect('/login?next=/partnerships');
  const {data,error} = await db.rpc('partner_workspace');
  const {status} = await searchParams;
  const [queue,events,orgs,jobs]=await Promise.all([db.rpc('partner_case_queue'),db.from('events').select('id,title,host_organization_id').eq('status','published'),db.from('organizations').select('id,name').eq('verification_status','verified'),db.from('job_postings').select('id,title,organization_id').eq('status','active')]);
  const agreements:Agreement[]=data?.agreements||[];
  const publications=await Promise.all(agreements.map(async a=>{
    const {data:result,error}=await db.rpc('partner_publications',{agreement:a.id});if(error)throw Error('Partner publications unavailable');return result;
  }));
  return <main className={styles.workspace}>
    <Link href={data?.staff ? '/admin' : '/portal'}>Back to workspace</Link>
    <h1>Corporate Talent Partnerships</h1><Link href="/ecosystem">Explore Kansas City</Link>
    {queue.error?<p>Follow-up queue unavailable.</p>:<Cases cases={queue.data} events={events.data||[]}/>}
    {data?.staff&&<><AgreementForm orgs={orgs.data||[]}/><details><summary>New2KC source intake</summary><p>Import the specifically authorized synthetic response into the staff review queue. The source email preference covers community updates.</p><form action={importIntake}><button>Import authorized Google Form response</button></form><Link href="/admin?section=submissions">Review intake</Link> · <Link href="/admin?section=tasks">Open staff tasks</Link></details></>}
    {status && <p role="status">{status==='intake-access' ? 'Forms read access and an authorized synthetic response ID are required.' : status==='saved' ? 'Saved.' : 'The record could not be updated. Check the current status and try again.'}</p>}
    {error ? <p role="alert">Partnership records could not be loaded.</p> : !data?.agreements.length ? <p>No partnership agreements are available for this account.</p> :
      agreements.map((a,i)=><section key={a.id}>
        <h2>{a.employer}</h2>
        {a.synthetic && <p><strong>Fictional employer · demonstration agreement</strong></p>}
        <p>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(a.value)} · {a.termStart} through {a.termEnd}</p>
        <p>{a.scope}</p><p>Contracting entity · {a.contractingEntity}</p>
        <p><Link href={'/employers/'+publications[i].organization}>Employer profile, stories, events and roles</Link></p>
        {data.staff&&<Manage agreement={a.id} commitments={a.commitments} jobs={(jobs.data||[]).filter(x=>x.organization_id===publications[i].organization)} events={(events.data||[]).filter(x=>x.host_organization_id===publications[i].organization)}/>}
        <h3>Activation plan</h3><p>{a.plan}</p>
        <p>Hiring priorities · {a.priorities.join(', ')}</p>
        <p>Quarterly reviews · {a.reviews.join(', ')}</p><p>Renewal · {a.renewal}</p>
        <h3>Partnership commitments</h3>
        <ul>{a.commitments.map(c=><li key={c.id}><strong>{c.pillar}</strong><p>{c.deliverable} · Due {c.due} · {c.state}</p>
          {data.staff && <><p>Owner · {c.owner}</p>{c.evidence && <p>Internal evidence · {c.evidence}</p>}
          {c.state!=='approved' && <form action={recordDelivery}>
            <input type="hidden" name="commitment" value={c.id}/>
            {c.state==='scheduled' && <label>Internal delivery evidence reference <input required maxLength={400} name="evidence"/></label>}
            <button name="action" value={c.state==='scheduled'?'submit':'approve'}>{c.state==='scheduled'?'Record delivery':'Approve partner update'}</button>
          </form>}</>}
        </li>)}</ul>
        <h3>Approved period reports</h3>
        {publications[i].reports.length===0 && <p>No reports have been approved.</p>}
        {publications[i].reports.map((r:{start:string;end:string;snapshot:{deliveries:{deliverable:string;pillar:string}[];research:{metric_id:string;entity:string;definition:string;as_of:string;value:number;unit:string;source_url:string}[];attribution:string}})=><section key={r.start+r.end}><h4>{r.start} through {r.end}</h4><p>{r.snapshot.attribution}</p>
        <ul>{r.snapshot.deliveries.map((d,i)=><li key={i}>{d.pillar} · {d.deliverable}</li>)}</ul>
        {r.snapshot.research.length>0 && <p>Regional context from KC Capital Atlas. Each observation applies to the named entity and source period. These metrics do not measure hiring, newcomer activity or partner impact.</p>}{r.snapshot.research.map(m=><p key={m.metric_id}>{m.entity} · {m.value.toLocaleString()} {m.unit} · {m.as_of}. {m.definition} <a href={m.source_url}>Atlas source</a></p>)}</section>)}
      </section>)}
  </main>;
}
