import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicDb } from '@/lib/supabase';
import { save } from '../../ecosystem/actions';
import {EditorialPage,RegionalHero} from '@/components/editorial';
export const dynamic='force-dynamic';
type Entry={agreement:string;commitment:string;pillar:string;job:string|null};
export default async function Profile({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{status?:string}>}){
 const {id}=await params;
 const db=publicDb();
 const [org,stories,jobs,events,entry]=await Promise.all([
 db.from('organizations').select('name,description,industry').eq('id',id).eq('status','published').eq('verification_status','verified').maybeSingle(),
 db.from('employer_stories').select('id,title,body,series').eq('organization_id',id),
 db.from('job_postings').select('id,title').eq('organization_id',id),
 db.from('events').select('id,title,starts_at,location,registration_url').eq('host_organization_id',id),db.rpc('partner_entry_points',{org:id})]);
 if([org,stories,jobs,events,entry].some(r=>r.error))throw Error('Employer profile unavailable');
 if(!org.data)notFound();
 const entries:Entry[]=entry.data||[];
 function request(e:Entry){
 const talent=!!e.job;
 return <details className="request-disclosure" key={e.commitment+(e.job||'')}><summary>{talent?'Request an introduction':'Request welcome support'}</summary><form action={save}><input type="hidden" name="from" value="profile"/><input type="hidden" name="organization" value={id}/><input type="hidden" name="agreement" value={e.agreement}/><input type="hidden" name="commitment" value={e.commitment}/><input type="hidden" name="operation" value={talent?'interest':'welcome'}/><input type="hidden" name="job" value={e.job||''}/>
 {!talent&&<label>What would help you settle in?<input name="need" required maxLength={500}/></label>}<label><input type="checkbox" name="permission" value="yes" required/>{talent?'Share my interest in this role with this employer for an introduction. No profile or contact details.':'Allow the 2KC welcome team to follow up privately about this request. No employer disclosure.'}</label><button>{talent?'Request introduction':'Request private welcome follow-up'}</button></form></details>;
 }
 const status=(await searchParams).status;
 return <EditorialPage><RegionalHero label={org.data.industry||'Employer profile'} title={org.data.name}><p className="partner-intro">{org.data.description}</p><div className="partner-hero-actions"><a className="partner-button partner-primary" href="#opportunities">Explore roles</a><a className="partner-button partner-secondary" href="#experiences">Inside KC experiences</a></div></RegionalHero>{status&&<p role="status">{status==='profile'?'Save your private talent profile, then return to request this introduction.':status==='saved'?'Request saved.':'Request unavailable. Check your account and permissions.'} <Link href={status==='profile'?'/portal?view=profile':'/partnerships'}>{status==='profile'?'Create private profile':'Open your follow-up queue'}</Link></p>}
 <section className="editor-section"><h2>Employer stories</h2>{!stories.data?.length&&<p>No stories published yet.</p>}{stories.data?.map(s=><article className="story-column" key={s.id} id={s.id}><p className="partner-eyebrow">{s.series}</p><h3>{s.title}</h3><p>{s.body}</p><a href="#opportunities">Explore opportunities at this employer</a></article>)}
 </section><section className="editor-section" id="opportunities"><h2>Career opportunities</h2>{!jobs.data?.length&&<p>No current roles listed.</p>}{jobs.data?.map(j=><section className="editor-card" key={j.id}><h3><Link href={'/jobs/'+j.id}>{j.title}</Link></h3>{entries.filter(e=>e.job===j.id).map(request)}</section>)}
 </section><section className="editor-section" id="experiences"><h2>Inside KC experiences</h2>{!events.data?.length&&<p>No experiences listed.</p>}{events.data?.map(e=><p key={e.id}>{e.title} · {e.starts_at.slice(0,10)} · {e.location} {e.registration_url?.startsWith('https://')&&<a href={e.registration_url}>Registration details</a>}</p>)}
 </section><section className="editor-section"><h2>Newcomer welcome</h2><a href="https://socialbalances.com/new2kc">Explore New2KC</a>{entries.filter(e=>e.pillar==='New2KC welcome').map(request)}<Link href="/partnerships">My follow-ups</Link></section></EditorialPage>;
}
