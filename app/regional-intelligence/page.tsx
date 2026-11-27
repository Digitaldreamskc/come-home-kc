import Link from 'next/link';
import {EditorialPage,RegionalHero} from '@/components/editorial';
import {atlasProjection} from '@/lib/regional-sources';
import './intelligence.css';
export const dynamic='force-dynamic';
const atlas='/atlas';
function https(s:string){return typeof s==='string'&&s.startsWith('https://');}
export default async function RegionalIntelligence(){const data=await atlasProjection().catch(()=>null);
 const providers=data?.resources.filter(r=>r.match_status==='verified_identity'&&https(r.profile_url))||[];
 return <EditorialPage><RegionalHero label="Regional intelligence" title="Understand the market. Discover what's possible."><p className="partner-intro">Explore the research, capital resources and economic history shaping Kansas City.</p><div className="partner-hero-actions"><a className="partner-button partner-primary" href={atlas}>Explore the full KC Capital Atlas</a><Link className="partner-button partner-secondary" href="/marketplace?category=resources">Find regional resources</Link></div></RegionalHero>
 {!data&&<p role="status">The Atlas research feed is temporarily unavailable. Visit the integrated Atlas directly.</p>}
 <section className="editor-section intelligence-section"><h2>Explore the landscape</h2><div className="intelligence-grid"><article><h3>Capital landscape</h3><p>Discover source-linked provider profiles and historical capital research.</p><Link href="/regional-intelligence/capital">Explore capital landscape</Link></article><article><h3>Industry landscape</h3><p>Discover regional employers. A comprehensive industry and workforce dataset is not yet integrated.</p><Link href="/marketplace?category=employers">Explore employers</Link></article><article><h3>Entrepreneurial ecosystem</h3><p>Find business support and funding programs.</p><Link href="/regional-intelligence/ecosystem">Explore entrepreneurial ecosystem</Link></article><article><h3>Kansas City's economic story</h3><p>Explore documented milestones from the Atlas.</p><a href="/atlas#story">Explore history</a></article></div></section>
 <section className="editor-section intelligence-section" id="capital-providers"><h2>Capital provider discovery</h2><p><Link href="/regional-intelligence/capital">Search the complete local capital research directory</Link></p><p>Identity-linked directory profiles, not confirmed open funding rounds or investment mandates.</p><div className="intelligence-grid">{providers.map(p=><article key={p.link_id}><h3>{p.listed_name}</h3><p>{p.limitations}</p><small>Directory identity checked {p.last_checked_at.slice(0,10)}</small><a href={p.profile_url} target="_blank" rel="noopener noreferrer">View provider profile</a></article>)}</div>{data&&!providers.length&&<p>No identity-verified provider links are available.</p>}</section>
 </EditorialPage>;
}
