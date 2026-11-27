import {atlasProjection,capitalProfiles} from '@/lib/regional-sources';
const capitalTypes:Record<string,string>={venture_investor:'Venture capital',historical_investment_firm:'Historical investment firm',angel_network:'Angel network',cdfi_lender:'Community lender',private_equity_investor:'Private equity',private_investment_firm:'Private investment',private_investment_company:'Private investment',family_enterprise_investment_firm:'Family enterprise investment',single_family_office:'Family office',investor_network:'Investor network',investor_peer_network:'Investor network'};
const ecosystemTypes:Record<string,string>={entrepreneur_support_org:'Business support',incubator_accelerator:'Accelerators & incubators',founder_mentoring_provider:'Mentoring',startup_community:'Founder community',coworking_campus:'Coworking',civic_economic_initiative:'Economic development',historical_ecosystem_organization:'Historical ecosystem'};
export type DiscoveryEntry={id:string;name:string;type:string;city:string;state:string;status:string;focus:string;stage:string;sector:string;check:string;claims:{id:string;label:string;value:string;url:string}[];link?:string;website?:string};
export async function directoryEntries(kind:'capital'|'ecosystem'):Promise<DiscoveryEntry[]>{
 const [data,profiles]=await Promise.all([atlasProjection(),kind==='capital'?capitalProfiles():Promise.resolve([])]);const profileMap=new Map(profiles.map(p=>[p.entity_id,p]));const types=kind==='capital'?capitalTypes:ecosystemTypes;
 return data.entities.filter(e=>Object.hasOwn(types,e.category)&&e.entity_type==='organization').map(e=>{
 const claims=data.claims.filter(c=>c.subject_id===e.entity_id&&['approved','excerpt_matched'].includes(c.status)&&c.source_url?.startsWith('https://')&&['stated_focus','description','stated_model','program','fund_close','fund_launch','reported_aum','investment_classification','portfolio_summary','founded','operating_since'].includes(c.field));
 const profile=kind==='capital'?profileMap.get(e.entity_id):undefined;
 const source=claims.find(c=>c.field==='stated_focus'||c.field==='description'||c.field==='stated_model');
 const focus=profile?.focus||source?.value||'';
 const resource=data.resources.find(r=>r.entity_id===e.entity_id&&r.match_status==='verified_identity'&&r.profile_url?.startsWith('https://'));
 const stage=/early.stage/i.test(focus)?'Early stage':/\bseed\b/i.test(focus)?'Seed': '';
 const sector=/\btechnology\b/i.test(focus)?'Technology':'';
 return {id:e.entity_id,name:e.canonical_name,type:profile?.type||types[e.category],city:e.hq_city||'',state:e.hq_state||'',status:e.category.startsWith('historical_')?'Historical / research lead':e.review_status==='source_reviewed'?'Source reviewed':e.review_status==='claude_excerpt_matched'?'Source excerpt matched':'Research lead',focus,stage:profile?.stage||stage,sector:profile?.sector||sector,check:profile?.check||'',claims:claims.map(c=>({id:c.claim_id,label:c.field.replaceAll('_',' '),value:c.value,url:c.source_url})),link:resource?.profile_url,website:profile?.website};
 }).filter(e=>kind!=='capital'||!!e.website).sort((a,b)=>a.name.localeCompare(b.name));
}
