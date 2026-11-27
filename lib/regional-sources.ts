// Read only the existing public projections, using their publishable client keys.
const atlasURL='https://neoappgyffrlrsfprgju.supabase.co';
const atlasKey='sb_publishable_qLJQo2idx-rTXc1XzjrPqw_bP1m8Hkj';
const directoryURL='https://rzeentkhtafligzksafw.supabase.co';
const directoryKey='sb_publishable_J83Cu428ZVXGViEdQybmHw_5Qi22Giu';
type Metric={metric_id:string;entity_id:string;definition:string;source_url:string;as_of:string;value:number;unit:string;metric_name:string};
type Entity={entity_id:string;canonical_name:string;category:string;review_status:string;hq_city?:string|null;hq_state?:string|null;entity_type?:string};
export type AtlasProvider={link_id:string;entity_id:string;listed_name:string;profile_url:string;provider_website:string;match_status:string;last_checked_at:string;limitations:string};
type AtlasClaim={claim_id:string;subject_id:string;field:string;value:string;status:string;source_url:string;source_title:string};
type AtlasEvent={history_event_id:string;event_date:string;description:string;source_url:string;review_status:string;entity_id:string};
export async function atlasProjection(){
 const r=await fetch(atlasURL+'/rest/v1/rpc/kc_atlas_public_read',{method:'POST',headers:{apikey:atlasKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000),next:{revalidate:3600}});
 if(!r.ok) throw Error('Atlas unavailable');
 const data=await r.json() as {mode:string;entities:Entity[];metrics:Metric[];resources:AtlasProvider[];events:AtlasEvent[];claims:AtlasClaim[]};
 if(data.mode!=='live') throw Error('Live projection required');
 return data;
}
export async function atlasProviders(){const data=await atlasProjection();return data.resources.filter(r=>r.match_status==='verified_identity'&&r.profile_url.startsWith('https://'));}
export async function regionalResearch(){const data=await atlasProjection();
 const entities=new Map(data.entities.map(e=>[e.entity_id,e.canonical_name]));
 return data.metrics.filter(m=>m.as_of && /^https:\/\//.test(m.source_url)&&entities.has(m.entity_id)).map(m=>({...m,entity:entities.get(m.entity_id)!}));
}
export async function approvedResources(){
 const r=await fetch(directoryURL+'/rest/v1/directory_listings?published=eq.true&select=id,name,company,area,website&order=name',{headers:{apikey:directoryKey},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!r.ok) throw Error('Directory unavailable');
 return await r.json() as {id:string;name:string;company:string;area:string;website:string}[];
}
