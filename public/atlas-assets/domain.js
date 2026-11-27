export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeURL=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
export const human=v=>String(v??'Unknown').replaceAll('_',' ');
export function narrative(v){try{const o=typeof v==='string'?JSON.parse(v):v;if(o&&typeof o==='object')return Object.entries(o).filter(([k])=>!['source_id','claim_id','target_entity_id','source_ids','source_sha256','path_ids'].includes(k)).map(([k,v])=>`${human(k)}: ${Array.isArray(v)?v.join(', '):v&&typeof v==='object'?JSON.stringify(v):v??'unknown'}`).join(' · ')}catch{}return String(v??'');}
export function eventYear(e){const match=String(e.event_date||'').match(/^(\d{4})/);return match?+match[1]:null}
export function eventsInChapter(events,chapter){return events.filter(e=>{const y=eventYear(e);return y!==null&&y<=2026&&(chapter==='all'||y<=+chapter&&(+chapter===1996||y>+chapter-10))}).sort((a,b)=>(a.event_date||'').localeCompare(b.event_date||''));}
export function eventBins(events){return [1996,2006,2016,2026].map(year=>({year,count:eventsInChapter(events,String(year)).length}));}
export function searchEntities(entities,query,type){const q=query.trim().toLocaleLowerCase();return entities.filter(e=>(!type||e.entity_type===type)&&(!q||`${e.canonical_name} ${e.category} ${e.hq_city||''}`.toLocaleLowerCase().includes(q)));}
export function normalize(data){return {...data,...Object.fromEntries(['entities','claims','events','relationships','metrics','resources','checkpoints'].map(k=>[k,Array.isArray(data[k])?data[k]:[]]))};}
export function foundationGroups(metrics,entities,query=''){
 const byId=new Map(entities.map(e=>[e.entity_id,e]));const groups=new Map();
 for(const m of metrics){if(!['foundation_total_assets_bmf','foundation_income_bmf'].includes(m.metric_name))continue;const key=m.entity_id+'|'+m.as_of; if(!groups.has(key))groups.set(key,{entity:byId.get(m.entity_id),entity_id:m.entity_id,period:m.as_of,metrics:[]});groups.get(key).metrics.push(m);}
 return [...groups.values()].filter(g=>[g.entity?.canonical_name,g.entity?.hq_city,g.entity?.hq_state,g.entity?.verified_ein,formatEIN(g.entity?.verified_ein)].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>(a.entity?.canonical_name||'').localeCompare(b.entity?.canonical_name||''));
}
export const money=v=>v==null?'Not recorded':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
export function periodLabel(v){if(!/^\d{4}-\d{2}$/.test(v||''))return v||'Not recorded';return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(v+'-01T00:00:00Z'));}

export const formatEIN=v=>/^\d{9}$/.test(v||'')?v.slice(0,2)+'-'+v.slice(2):'Not yet verified';
export const filingURL=v=>/^\d{9}$/.test(v||'')?'https://projects.propublica.org/nonprofits/organizations/'+v:'';

// Presentation of source claims: technical extraction metadata stays out of profiles.
export function presentClaim(claim){
 let v=claim.value;try{v=JSON.parse(v)}catch{}
 const result={title:human(claim.field),text:'',facts:[],note:''};
 if(claim.field==='tech_galaxy_audited_connection'&&v&&typeof v==='object'){
  result.title='Connection on the Tech Galaxy map';
  result.text=`The ${v.source_period||'historical'} Kansas City Tech Galaxy map connects ${v.from_label||v.a||'one organization'} and ${v.to_label||v.b||'another organization'}.`;
  const type=v.relation_type;
  result.title=type==='mapped_institutional_connection'?'Institutional / support link on the Tech Galaxy map':type==='mapped_capital_connection'?'Capital-related link on the Tech Galaxy map':'Connection on the Tech Galaxy map';
  result.note=type==='mapped_institutional_connection'?'This historical line involves an institution or support program. It does not specify the service provided, program participation, funding or a founder–employer relationship.':type==='mapped_capital_connection'?'This historical capital-related line does not establish an investment direction, amount or date.':type==='mapped_organizational_genealogy'?'The map presents an organizational genealogy connection. The people involved and their specific employment or ownership history require separate evidence.':type==='map_reported_acquired_by'?'The map reports an acquisition. Consult the original transaction source for its date, terms and scope.':type==='map_reported_merged_with'?'The map reports a merger. The legal surviving entity and current ownership require separate evidence.':type==='map_reported_unspecified_merger_or_acquisition'?'The map marks a merger or acquisition without resolving the transaction type in this record.':'The map does not specify the nature or direction of this connection. It does not establish who invested in whom, an investment amount or an investment date.';
  return result;
 }
 if(claim.field==='historical_investor_snapshot'&&v&&typeof v==='object'){
  result.title='Investment activity reported in '+periodLabel(v.report_date);
  result.text=`KCSourceLink’s benchmark study lists the following historical figures for ${v.name||'this firm'}.`;
  const labels={first_investment_year_as_reported:'First investment year reported',total_deals_as_reported:'Total deals reported',kc_deals_as_reported:'Kansas City deals reported',average_deal_size_as_reported:'Average deal size reported',stage_as_reported:'Investment stage reported'};
  result.facts=Object.entries(labels).map(([key,label])=>[label,v[key]==null?'Not reported':String(v[key])]);
  result.note='The deal-count period is unspecified. The first investment year is not the founding year; average deal size is not the firm’s individual investment amount.';
  if(v.pdf_page)result.note+=` Source: page ${v.pdf_page}.`;
  return result;
 }
 if(v&&typeof v==='object'){
  const technical=/^(source|claim|entity|subject|relationship|target|from_entity|to_entity|raw|edge|path|verification|direction_basis)|(_id|_ids|_xy|_radii|_sha256|_raw)$|^(line_style|direction_encoded)$/;
  const walk=(o,prefix='')=>Object.entries(o).flatMap(([k,val])=>{if(technical.test(k)||val==null)return [];const label=(prefix?prefix+' · ':'')+human(k);if(Array.isArray(val))return val.flatMap((item,i)=>item&&typeof item==='object'?walk(item,label+' '+(i+1)):[[label,String(item)]]);if(typeof val==='object')return walk(val,label);return [[label,String(val)]];});
  result.facts=walk(v);result.text=result.facts.length?'':'Read the linked source for this record.';
 }else result.text=String(v??'No summary recorded.');
 return result;
}

export function connectionNetwork(entities,relationships,seeds,depth=1){
 const valid=new Set(entities.map(e=>e.entity_id));const edges=relationships.filter(r=>valid.has(r.from_id)&&valid.has(r.to_id));
 const ids=new Set(seeds.filter(id=>valid.has(id)));let frontier=new Set(ids);
 for(let n=0;n<depth;n++){const next=new Set();for(const r of edges){if(frontier.has(r.from_id)&&!ids.has(r.to_id))next.add(r.to_id);if(frontier.has(r.to_id)&&!ids.has(r.from_id))next.add(r.from_id);}for(const id of next)ids.add(id);frontier=next;}
 return {nodes:entities.filter(e=>ids.has(e.entity_id)).sort((a,b)=>a.canonical_name.localeCompare(b.canonical_name)),edges:edges.filter(r=>ids.has(r.from_id)&&ids.has(r.to_id))};
}


// Preserve the precision supplied by the record when displaying historical dates.
export function eventDateLabel(e){
 const raw=String(e.event_date||'');const m=raw.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);if(!m)return raw||'Date unknown';
 if(e.date_precision==='year'||!m[2])return m[1];
 const month=+m[2];if(month<1||month>12)return raw;
 const label=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(+m[1],month-1,1)));
 if(e.date_precision==='month'||!m[3])return `${label} ${m[1]}`;
 return `${label} ${+m[3]}, ${m[1]}`;
}
