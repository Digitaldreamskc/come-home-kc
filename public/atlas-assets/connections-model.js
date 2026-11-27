import {human} from './domain.js';
export const GALAXY_URL='https://www.kauffman.org/wp-content/uploads/2019/12/kctechgalaxy_613.pdf';
export function claimValue(c){try{return typeof c?.value==='string'?JSON.parse(c.value):c?.value||{}}catch{return {}}}
export function isGalaxy(r,c){return c?.field==='tech_galaxy_audited_connection'||/kctechgalaxy_613\.pdf/i.test(c?.source_url||'')||/^map(?:ped|_reported)_/.test(r.rel_type)}
export function relationMeaning(r,c,names){
 const a=names(r.from_id),b=names(r.to_id),v=claimValue(c),historical=isGalaxy(r,c);
 const map={
  mapped_organizational_genealogy:['Business lineage',`${a} and ${b} are connected in the poster’s organizational genealogy.`,`This is a historical lineage lead. The line alone does not identify the people involved or prove a specific employment or ownership history.`],
  mapped_institutional_connection:['Support / institutional link',`${a} and ${b} are linked on the historical map.`,`The extracted line involves an institution or support program. It does not specify the service provided, participation, funding, or a founder–employer relationship.`],
  mapped_capital_connection:['Capital-related map link',`${a} and ${b} are linked in the map’s capital network.`,`This line alone does not establish an investment, investor direction, amount, or date.`],
  mapped_undirected_connection:['Unspecified map link',`${a} and ${b} are connected on the historical map.`,`The map does not establish the direction or specific nature of this connection.`],
  map_reported_acquired_by:['Acquisition shown on map',`The map reports ${a} as acquired by ${b}.`,`This is the poster’s historical assertion; transaction details require the underlying announcement.`],
  map_reported_merged_with:['Merger shown on map',`The map reports a merger involving ${a} and ${b}.`,`The line does not establish the legal surviving entity or current ownership.`],
  map_reported_unspecified_merger_or_acquisition:['Merger / acquisition marker',`The map marks a merger or acquisition involving ${a} and ${b}.`,`The transaction type is not resolved in this record.`]
 };
 const verbs={founded_by:'was founded by',founded:'founded',co_founded:'co-founded',program_of:'is recorded as a program of',invested_in:'is reported to have invested in',co_conducted_survey:'co-conducted a survey with',fund_of:'is recorded as a fund of',announced_initiative:'announced',acquired_by:'was acquired by',historical_president:'is recorded as a former president of',parent_of:'is identified as a parent of',historical_owner:'is recorded as a historical owner of',sibling_of:'is identified as a sibling of',historical_ceo:'is recorded as a former CEO of',portfolio_listing:'lists in its portfolio',assets_acquired_by:'had assets acquired by',historical_division_of:'was a division of',executive_of:'is recorded as an executive of',board_officer_of:'is recorded as a board officer of',manages_investments_for:'manages investments for',supports:'is reported to support',administered_by:'is administered by',same_organization_as:'is matched to the same organization as',spouse_of:'is identified as a spouse of',officer_of:'is recorded as an officer of',historical_chair:'is recorded as a former chair of',documented_philanthropic_legacy:'has a documented philanthropic legacy associated with',pays_dividends_to:'is reported to pay dividends to',founder_former_employer_lineage:'has a documented founder / former-employer connection with'};
 const [label,text,note]=map[r.rel_type]||[human(r.rel_type),verbs[r.rel_type]?`${a} ${verbs[r.rel_type]} ${b}.`:`${a} · ${human(r.rel_type)} · ${b}`,'Read the source for the relevant period and scope. A historical role does not establish a current relationship.'];
 const dates=['date','closing_date','reported_formal_transfer','reported_year','year','period','observed_on'].filter(k=>v&&typeof v==='object'&&v[k]!=null).map(k=>[k==='observed_on'?'Source observed':human(k),String(v[k])]);
 return {label,text,note,historical,dates,period:historical?'2013 map · research gathered in 2012':'Dated context in source',reportedYear:historical&&v.reported_year_raw?String(v.reported_year_raw):null};
}
export function scopeEdges(data,scope){const claims=new Map(data.claims.map(c=>[c.claim_id,c]));const valid=new Set(data.entities.map(e=>e.entity_id));return data.relationships.filter(r=>valid.has(r.from_id)&&valid.has(r.to_id)&&(scope==='history'?isGalaxy(r,claims.get(r.claim_id)):!isGalaxy(r,claims.get(r.claim_id))));}
export function searchConnections(entities,edges,query=''){
 const counts=new Map();for(const r of edges)for(const id of new Set([r.from_id,r.to_id]))counts.set(id,(counts.get(id)||0)+1);
 const q=query.trim().toLowerCase();return entities.filter(e=>counts.has(e.entity_id)&&e.canonical_name.toLowerCase().includes(q)).map(e=>({...e,connectionCount:counts.get(e.entity_id)})).sort((a,b)=>a.canonical_name.localeCompare(b.canonical_name));
}
export function buildNetwork(entities,edges,seeds,depth=1,sharedOnly=false){
 const valid=new Set(entities.map(e=>e.entity_id));const roots=[...new Set(seeds)].filter(id=>valid.has(id));const adj=new Map();for(const r of edges){if(!valid.has(r.from_id)||!valid.has(r.to_id))continue;for(const [a,b] of [[r.from_id,r.to_id],[r.to_id,r.from_id]]){if(!adj.has(a))adj.set(a,new Set());adj.get(a).add(b)}}
 const distances=new Map(roots.map(id=>[id,0]));let frontier=roots;
 for(let step=1;step<=Math.min(2,depth);step++){const next=[];for(const id of frontier)for(const other of adj.get(id)||[])if(!distances.has(other)){distances.set(other,step);next.push(other)}frontier=next;}
 const shared=[...distances.keys()].filter(id=>!roots.includes(id)&&roots.every(root=>adj.get(root)?.has(id))&&roots.length>1);
 const included=sharedOnly?new Set([...roots,...shared]):new Set(distances.keys());
 return {roots,shared,distances,nodes:entities.filter(e=>included.has(e.entity_id)).sort((a,b)=>distances.get(a.entity_id)-distances.get(b.entity_id)||a.canonical_name.localeCompare(b.canonical_name)),edges:edges.filter(r=>included.has(r.from_id)&&included.has(r.to_id)&&(!sharedOnly||roots.includes(r.from_id)||roots.includes(r.to_id)))};
}
