import Link from 'next/link';
import {directoryEntries} from '@/lib/atlas-discovery';
import {ecosystemProviders} from '@/lib/ecosystem-providers';
import {approvedResources,regionalResearch} from '@/lib/regional-sources';
import {save} from '../ecosystem/actions';
type Commitment={id:string;pillar:string;deliverable:string;state:string};
export default async function IntelligenceWorkspace({agreement,commitments,query}:{agreement?:string;commitments:Commitment[];query?:string}){
 const [providers,metrics,support,recommendations]=await Promise.all([directoryEntries('capital').catch(()=>null),regionalResearch().catch(()=>null),ecosystemProviders().catch(()=>null),approvedResources().catch(()=>null)]);
 const term=(query||'').trim().toLowerCase();
 const matches=(metrics||[]).filter(m=>[m.entity,m.metric_name,m.definition,m.as_of].some(v=>v.toLowerCase().includes(term)));
 const relevant=(...values:string[])=>values.join(' ').toLowerCase().includes(term);
 const choices=commitments.filter(c=>c.pillar==='Regional intelligence'&&c.state==='scheduled');
 return <section><h2>Regional intelligence</h2><p>Research source: KC Capital Atlas. Use source-linked observations in a partner briefing or review provider fit in an existing follow-up. No private Atlas data is copied.</p><p><Link href="/regional-intelligence">Public intelligence page</Link> · <a href="/atlas">Full Capital Atlas</a> · <Link href={'/partnerships?view=follow-ups'+(agreement?'&agreement='+agreement:'')}>Review cases</Link></p>
 <h3>Capital provider research</h3>{providers===null?<p>Atlas provider feed unavailable.</p>:providers.filter(p=>relevant(p.name,p.type,p.focus,p.sector)).map(p=><article key={p.id}><h4>{p.name}</h4><p>{p.type} · {p.focus}</p><a href={p.website} target="_blank" rel="noopener noreferrer">Provider website</a></article>)}
 <h3>Entrepreneurial support</h3>{support===null?<p>Support directory unavailable.</p>:support.filter(p=>relevant(p.name,p.description,p.category,...p.needs)).map(p=><article key={p.id}><h4>{p.name}</h4><p>{p.description}</p><a href={p.website}>Provider website</a></article>)}<h3>Jessica’s List</h3>{recommendations===null?<p>Recommendations unavailable.</p>:recommendations.filter(p=>relevant(p.name,p.company||'',p.area||'')).map(p=><article key={p.id}><h4>{p.name}</h4><p>{p.company} · {p.area}</p>{p.website?.startsWith('https://')&&<a href={p.website}>Website</a>}</article>)}<h3>Prepare regional intelligence briefing</h3><p>Choose an observation and attach it to an existing scheduled Regional intelligence commitment. The existing fulfillment and report approval process controls what a partner receives. Each observation is dated; foundation financial values are not deployable capital.</p>
 <form method="get" action="/partnerships"><input type="hidden" name="view" value="intelligence"/>{agreement&&<input type="hidden" name="agreement" value={agreement}/>}<label>Search all research and resources<input name="q" defaultValue={query}/></label><button>Search</button></form>
 {metrics===null?<p>Atlas observations unavailable.</p>:<p>{matches.length} matching observations · showing up to 24</p>}
 {matches.slice(0,24).map(m=><article key={m.metric_id}><h4>{m.entity}</h4><p>{m.metric_name.replaceAll('_',' ')} · {m.as_of} · {m.value.toLocaleString()} {m.unit}</p><p>{m.definition}</p><a href={m.source_url} target="_blank" rel="noopener noreferrer">Original source</a>{agreement&&choices.length>0&&<form action={save}><input type="hidden" name="operation" value="research"/><input type="hidden" name="agreement" value={agreement}/><input type="hidden" name="metric" value={m.metric_id}/><label>Scheduled commitment<select name="commitment" required>{choices.map(c=><option key={c.id} value={c.id}>{c.deliverable}</option>)}</select></label><button>Attach observation for review</button></form>}</article>)}
 </section>;
}
