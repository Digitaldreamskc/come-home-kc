import type { Catalog } from './filters';
import type { TenantConfig } from './tenant-config';
/** Synthetic only. Never seeded into a live tenant or returned by /api/catalog. */
export function demoCatalog(config:TenantConfig):Catalog{
 const states=config.geography.filter(r=>r.key!=='all').map(r=>r.key);
 const verified='2026-11-18T12:00:00Z';
 const names=['Product designer','Community coordinator','Software engineer','Operations specialist','Marketing associate','Senior customer success and community partnerships lead'];
 const organizations=names.map((_,i)=>({id:`demo-org-${i}`,name:i===5?'Example community partnerships and regional services team · Demo':`Example team ${i+1} · Demo`,status:'published' as const,verification_status:'verified',industry:i%2?'Community':'Technology',description:'Synthetic employer for layout review only.',organization_locations:[{city:`Example ${states[i%states.length]} city`,state:states[i%states.length],verified_at:verified}]}));
 organizations.push({id:'demo-org-research',name:'Imported research listing · Demo',status:'published',verification_status:'research',industry:'Research',description:'Imported prospect. This record must not appear in the public directory.',organization_locations:[]});
 return {organizations,jobs:names.map((title,i)=>({id:`demo-job-${i}`,organization_id:`demo-org-${i}`,title:`${title} · Demo`,description:'Demonstration record for reviewing this marketplace. This is not a real opening and does not accept applications.',status:'active',verified_at:verified,expires_at:'2099-01-01T00:00:00Z',application_url:'https://example.test/not-a-real-job',work_mode:i%2?'hybrid':'onsite',industry:i%2?'Community':'Technology',employment_type:i%2?'Part time':'Full time',experience_level:i%2?'Early career':'Experienced',job_locations:[{city:`Example ${states[i%states.length]} city`,state:states[i%states.length],verified_at:verified}]})),resources:[],events:[]};
}
