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
  if (!user) redirect('/login?next=/portal');
  const {data,error} = await db.rpc('partner_workspace');
  const {status} = await searchParams;
  return <main className={styles.workspace}>
    <Link href={data?.staff ? '/admin' : '/portal'}>Back to workspace</Link>
    <h1>Corporate Talent Partnerships</h1>
    {status && <p role="status">{status==='saved' ? 'Delivery record saved.' : 'The record could not be updated. Check the current status and try again.'}</p>}
    {error ? <p role="alert">Partnership records could not be loaded.</p> : !data?.agreements.length ? <p>No partnership agreements are available for this account.</p> :
      (data.agreements as Agreement[]).map(a=><section key={a.id}>
        <h2>{a.employer}</h2>
        {a.synthetic && <p><strong>Fictional employer · demonstration agreement</strong></p>}
        <p>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(a.value)} · {a.termStart} through {a.termEnd}</p>
        <p>{a.scope}</p><p>Contracting entity · {a.contractingEntity}</p>
        {a.synthetic && a.id==='de270000-0000-4000-8000-000000000002' && <p><Link href="/stories/crossroads">Read the employer feature and explore open roles</Link></p>}
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
        {a.synthetic && <section><h3>Regional insights · demonstration summary</h3>
          <p>Engineering and operations are priorities in this fictional employer’s activation plan. That observation describes one employer. Regional demand cannot be inferred from this sample.</p>
          <p>Source · demonstration agreement, {a.termStart} through {a.termEnd}. <a href="https://kc-capital-atlas.vercel.app/">Explore the KC Capital Atlas public research</a>.</p></section>}
        <h3>Quarterly fulfillment report</h3>
        {Array.from({length:Number(a.termEnd.slice(0,4))-Number(a.termStart.slice(0,4))+1},(_,i)=>Number(a.termStart.slice(0,4))+i).flatMap(year=>[1,2,3,4].map(q=>{
          const approved=a.commitments.filter(c=>c.approvedAt && Number(c.approvedAt.slice(0,4))===year && Math.ceil(Number(c.approvedAt.slice(5,7))/3)===q);
          return <p key={q}>Q{q} {year} · {approved.length} approved {approved.length===1?'delivery':'deliveries'}{approved.length>0 && ' · '+approved.map(c=>c.deliverable).join(', ')}</p>;
        }))}
        <p>Source · staff delivery approvals. Participant activity is withheld in this demonstration.</p>
      </section>)}
  </main>;
}
