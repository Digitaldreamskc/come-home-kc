import Link from 'next/link';
import {atlasProviders,regionalResearch} from '@/lib/regional-sources';
import {save} from '../ecosystem/actions';
type Commitment={id:string;pillar:string;deliverable:string;state:string};
export default async function IntelligenceWorkspace({agreement,commitments,query}:{agreement?:string;commitments:Commitment[];query?:string}){
 const [providers,metrics]=await Promise.all([atlasProviders().catch(()=>null),regionalResearch().catch(()=>null)]);
 const term=(query||'').trim().toLowerCase();
 const matches=(metrics||[]).filter(m=>[m.entity,m.metric_name,m.definition,m.as_of].some(v=>v.toLowerCase().includes(term)));
 const choices=commitments.filter(c=>c.pillar==='Regional intelligence'&&c.state==='scheduled');
 return <section><h2>Regional intelligence</h2><p>Research source: KC Capital Atlas. Use source-linked observations in a partner briefing or review provider fit in an existing follow-up. No private Atlas data is copied.</p><p><Link href="/regional-intelligence">Public intelligence page</Link> · <a href="https://kc-capital-atlas.vercel.app/">Full Capital Atlas</a> · <Link href={'/partnerships?view=follow-ups'+(agreement?'&agreement='+agreement:'')}>Review cases</Link></p>
 <h3>Capital provider research</h3>{providers===null?<p>Atlas provider feed unavailable.</p>:providers.map(p=><article key={p.link_id}><h4>{p.listed_name}</h4><p>{p.limitations}</p><a href={p.profile_url} target="_blank" rel="noopener noreferrer">Source profile</a></article>)}
 <h3>Prepare regional intelligence briefing</h3><p>Choose an observation and attach it to an existing scheduled Regional intelligence commitment. The existing fulfillment and report approval process controls what a partner receives. Each observation is dated; foundation financial values are not deployable capital.</p>
 <form method="get" action="/partnerships"><input type="hidden" name="view" value="intelligence"/>{agreement&&<input type="hidden" name="agreement" value={agreement}/>}<label>Search observations<input name="q" defaultValue={query}/></label><button>Search</button></form>
 {metrics===null?<p>Atlas observations unavailable.</p>:<p>{matches.length} matching observations · showing up to 24</p>}
 {matches.slice(0,24).map(m=><article key={m.metric_id}><h4>{m.entity}</h4><p>{m.metric_name.replaceAll('_',' ')} · {m.as_of} · {m.value.toLocaleString()} {m.unit}</p><p>{m.definition}</p><a href={m.source_url} target="_blank" rel="noopener noreferrer">Original source</a>{agreement&&choices.length>0&&<form action={save}><input type="hidden" name="operation" value="research"/><input type="hidden" name="agreement" value={agreement}/><input type="hidden" name="metric" value={m.metric_id}/><label>Scheduled commitment<select name="commitment" required>{choices.map(c=><option key={c.id} value={c.id}>{c.deliverable}</option>)}</select></label><button>Attach observation for review</button></form>}</article>)}
 </section>;
}
