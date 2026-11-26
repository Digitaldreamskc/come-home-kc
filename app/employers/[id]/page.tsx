import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicDb } from '@/lib/supabase';
import { save } from '../../ecosystem/actions';
import styles from '../../partnerships/partnerships.module.css';
export const dynamic='force-dynamic';
type Entry={agreement:string;commitment:string;pillar:string;job:string|null};
export default async function Profile({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{status?:string}>}){
 const {id}=await params;
 const db=publicDb();
 const [org,stories,jobs,events,entry]=await Promise.all([
 db.from('organizations').select('name,description').eq('id',id).eq('status','published').eq('verification_status','verified').maybeSingle(),
 db.from('employer_stories').select('id,title,body,series').eq('organization_id',id),
 db.from('job_postings').select('id,title').eq('organization_id',id),
 db.from('events').select('id,title,starts_at,location').eq('host_organization_id',id),db.rpc('partner_entry_points',{org:id})]);
 if([org,stories,jobs,events,entry].some(r=>r.error))throw Error('Employer profile unavailable');
 if(!org.data)notFound();
 const entries:Entry[]=entry.data||[];
 function request(e:Entry){
 const talent=!!e.job;
 return <form action={save} key={e.commitment+(e.job||'')}><input type="hidden" name="from" value="profile"/><input type="hidden" name="organization" value={id}/><input type="hidden" name="agreement" value={e.agreement}/><input type="hidden" name="commitment" value={e.commitment}/><input type="hidden" name="operation" value={talent?'interest':'welcome'}/><input type="hidden" name="job" value={e.job||''}/>
 {!talent&&<label>What would help you settle in?<input name="need" required maxLength={500}/></label>}<label><input type="checkbox" name="permission" value="yes" required/>{talent?'Share my interest in this role with this employer for an introduction. No profile or contact details.':'Allow the 2KC welcome team to follow up privately about this request. No employer disclosure.'}</label><button>{talent?'Request introduction':'Request private welcome follow-up'}</button></form>;
 }
 const status=(await searchParams).status;
 return <main className={styles.workspace}><Link href="/ecosystem">Explore Kansas City</Link><h1>{org.data.name}</h1><p>{org.data.description}</p>{status&&<p role="status">{status==='saved'?'Request saved.':'Request unavailable. Check your account and permissions.'} <Link href="/partnerships">Open your follow-up queue</Link></p>}
 <h2>Employer stories</h2>{stories.data?.map(s=><article key={s.id} id={s.id}><p>{s.series}</p><h3>{s.title}</h3><p>{s.body}</p><a href="#opportunities">Explore opportunities at this employer</a></article>)}
 <h2 id="opportunities">Career opportunities</h2>{jobs.data?.map(j=><section key={j.id}><h3><Link href={'/jobs/'+j.id}>{j.title}</Link></h3>{entries.filter(e=>e.job===j.id).map(request)}</section>)}
 <h2>Inside KC experiences</h2>{events.data?.map(e=><p key={e.id}>{e.title} · {e.starts_at.slice(0,10)} · {e.location}</p>)}
 <h2>Newcomer welcome</h2>{entries.filter(e=>e.pillar==='New2KC welcome').map(request)}<Link href="/partnerships">My follow-ups</Link></main>;
}
