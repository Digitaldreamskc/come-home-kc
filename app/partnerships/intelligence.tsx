import Link from 'next/link';
import { directoryEntries } from '@/lib/atlas-discovery';
import { ecosystemProviders } from '@/lib/ecosystem-providers';
import { approvedResources, regionalResearch } from '@/lib/regional-sources';
import { matchesSectors } from '@/lib/sector-taxonomy';
import { session } from '@/lib/supabase';
import { save } from '../ecosystem/actions';
import IntelligenceSearch from './intelligence-search';
import '@/app/regional-intelligence/intelligence.css';

type Commitment = { id: string; pillar: string; deliverable: string; state: string };

export default async function IntelligenceWorkspace({ agreement, commitments, query, sectors }:
  { agreement?: string; commitments: Commitment[]; query?: string; sectors: string[] }) {
  const { db } = await session();
  const [providers, metrics, support, recommendations, employers, jobs, events] = await Promise.all([
    directoryEntries().catch(() => null), regionalResearch().catch(() => null),
    ecosystemProviders().catch(() => null), approvedResources().catch(() => null),
    db.from('organizations').select('id,name,industry,description,sectors').eq('status','published').eq('verification_status','verified').order('name'),
    db.from('job_postings').select('id,title,industry,organization_id').eq('status','active').gt('expires_at',new Date().toISOString()).order('title'),
    db.from('events').select('id,title,description,location,starts_at,registration_url').eq('status','published')
      .gte('starts_at',new Date().toISOString()).order('starts_at'),
  ]);
  const keywords = (query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const relevant = (...values: (string | null | undefined)[]) => {
    const text = values.filter(Boolean).join(' ').toLowerCase();
    return keywords.every(keyword => text.includes(keyword));
  };
  const secureLink = (url: string | null | undefined, label: string) =>
    url?.startsWith('https://') ? <a href={url} target="_blank" rel="noopener noreferrer">{label}</a> : null;
  const observations = (metrics ?? []).filter(m => relevant(m.entity,m.metric_name,m.definition,m.as_of));
  const choices = commitments.filter(c => c.pillar === 'Regional intelligence' && c.state === 'scheduled');
  const employerById = new Map(employers.data?.map(employer => [employer.id, employer]));
  const capitalMatches = providers?.filter(p => matchesSectors(p.sectors,sectors) && relevant(p.name,p.type,p.focus,p.stage,p.sector,p.check,...p.sectors));
  const supportMatches = support?.filter(p => matchesSectors(p.sectors,sectors,p.serves_all_industries) &&
    relevant(p.name,p.description,p.category,p.industry,p.industry_specialties,...p.sectors,...p.needs));
  const employersMatched = employers.data?.filter(e => matchesSectors([...e.sectors,e.industry ?? ''],sectors) && relevant(e.name,e.industry,e.description,...e.sectors));
  const jobsMatched = jobs.data?.filter(j => {
    const employer = employerById.get(j.organization_id);
    return matchesSectors([j.industry ?? '', ...(employer?.sectors ?? [])],sectors) && relevant(j.title,j.industry,employer?.name);
  });

  return <section>
    <h2>Regional intelligence</h2>
    <p><Link href="/regional-intelligence">Public intelligence</Link> · <Link href="/atlas">Full Capital Atlas</Link> · <Link href={'/partnerships?view=follow-ups'+(agreement?'&agreement='+agreement:'')}>Review cases</Link></p>
    <IntelligenceSearch agreement={agreement} query={query} sectors={sectors}/>
    <h3>Capital providers</h3>
    {capitalMatches === undefined ? <p>Capital profiles unavailable.</p> : !capitalMatches.length && <p>No matching capital providers.</p>}
    {capitalMatches?.map(p => <article key={p.id}><h4>{p.name}</h4>
      <p>{[p.type,[p.city,p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
      {p.focus && <p>{p.focus}</p>}
      {(p.stage || p.sector || p.sectors.length > 0 || p.check) && <dl>
        {p.stage && <><dt>Stage</dt><dd>{p.stage}</dd></>}
        {(p.sector || p.sectors.length > 0) && <><dt>Sector</dt><dd>{[...new Set([p.sector,...p.sectors].filter(Boolean))].join(', ')}</dd></>}
        {p.check && <><dt>Check size</dt><dd>{p.check}</dd></>}
      </dl>}
      <p>{secureLink(p.website,'Provider website')} · {secureLink(p.source,'Source evidence')}</p>
    </article>)}
    <h3>Entrepreneurial support</h3>
    {supportMatches === undefined ? <p>Support directory unavailable.</p> : !supportMatches.length && <p>No matching support providers.</p>}
    {supportMatches?.map(p => <article key={p.id}><h4>{p.name}</h4><p>{p.description}</p>{secureLink(p.website,'Provider website')}</article>)}
    <h3>Jessica’s List</h3>
    {recommendations === null ? <p>Recommendations unavailable.</p> : recommendations.filter(p => relevant(p.name,p.company,p.area)).slice(0,50)
      .map(p => <article key={p.id}><h4>{p.name}</h4><p>{[p.company,p.area].filter(Boolean).join(' · ')}</p>{secureLink(p.website,'Website')}</article>)}
    <h3>2KC employers</h3>
    {employers.error ? <p>Employers unavailable.</p> : employersMatched?.slice(0,50).map(e =>
      <article key={e.id}><h4><Link href={'/employers/'+e.id}>{e.name}</Link></h4><p>{[e.industry,...e.sectors].filter(Boolean).join(' · ')}</p></article>)}
    <h3>Opportunities and events</h3>
    {jobs.error || events.error ? <p>Some opportunities are unavailable.</p> : null}
    {jobsMatched?.slice(0,50).map(j => <p key={j.id}><Link href={'/jobs/'+j.id}>{j.title}</Link> {employerById.get(j.organization_id)?.name}</p>)}
    {events.data?.filter(e => relevant(e.title,e.description,e.location)).slice(0,50).map(e =>
      <p key={e.id}>{e.title} · {e.starts_at.slice(0,10)} {secureLink(e.registration_url,'Event details')}</p>)}
    <h3>Atlas research observations</h3>
    <p>Attach dated observations to scheduled Regional intelligence commitments for staff review.</p>
    {metrics === null ? <p>Atlas observations unavailable.</p> : <p>{observations.length} matching observations · showing up to 24</p>}
    {observations.slice(0,24).map(m => <article key={m.metric_id}><h4>{m.entity}</h4>
      <p>{m.metric_name.replaceAll('_',' ')} · {m.as_of} · {m.value.toLocaleString()} {m.unit}</p><p>{m.definition}</p>
      {secureLink(m.source_url,'Original source')}
      {agreement && choices.length > 0 && <form action={save}>
        <input type="hidden" name="operation" value="research"/><input type="hidden" name="agreement" value={agreement}/><input type="hidden" name="metric" value={m.metric_id}/>
        <label>Scheduled commitment<select name="commitment" required>{choices.map(c => <option key={c.id} value={c.id}>{c.deliverable}</option>)}</select></label>
        <button>Attach observation for review</button>
      </form>}
    </article>)}
  </section>;
}
