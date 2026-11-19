import test from 'node:test';
import assert from 'node:assert/strict';
import { getTenant, tenantSchema, designTokens } from '../lib/tenant-config';
import { parseFilters, filterJobs, DEFAULT_FILTERS } from '../lib/filters';
import { demoCatalog } from '../lib/demo-catalog';
import { connector, noAI } from '../lib/extensions';
test('tenant config fails closed and preserves free access and human review',()=>{
 assert.throws(()=>getTenant('unknown'));
 assert.equal(tenantSchema.safeParse({...getTenant(),freeCoreAccess:false}).success,false);
 assert.equal(tenantSchema.safeParse({...getTenant(),geography:[{key:'MO',label:'MO'}]}).success,false);
 assert.equal(designTokens(getTenant())['--gold'],'#FDB924');
 assert.equal(designTokens(getTenant())['--ink'],'#171919');
 assert.equal(designTokens(getTenant())['--blue'],'#00AEEF');
});
test('a second synthetic geography filters with the same shared implementation',()=>{
 const config=getTenant('synthetic');const keys=config.geography.map(r=>r.key);const data=demoCatalog(config);
 assert.equal(parseFilters('?region=MO',null,keys).region,'all');
 const f=parseFilters('?region=MN&category=talent',null,keys);
 assert.equal(filterJobs(data.jobs,data.organizations,f,Date.now(),keys).length,3);
 assert.equal(filterJobs(data.jobs,data.organizations,{...f,region:'MO'},Date.now(),keys).length,0);
 assert.notDeepEqual(designTokens(config),designTokens(getTenant()));
});
test('employment and experience intersect without inventing unknown values',()=>{
 const data=demoCatalog(getTenant());
 assert.equal(filterJobs(data.jobs,data.organizations,{...DEFAULT_FILTERS,employment:'Full time',experience:'Early career'}).length,0);
 assert.equal(filterJobs(data.jobs,data.organizations,{...DEFAULT_FILTERS,employment:'Full time',experience:'Experienced'}).length,3);
});
test('AI and connectors default off, deny unapproved capabilities, and only return drafts',async()=>{
 const ctx={tenantId:getTenant().id,allowed:[] as const,humanReviewRequired:true as const};
 assert.equal((await noAI.run('suggest-match',{},ctx)).status,'unavailable');
 assert.throws(()=>connector('json-preview',[]));assert.throws(()=>connector('arbitrary-code',['arbitrary-code']));
 await assert.rejects(connector('json-preview',['json-preview']).run([],ctx));
 const r=await connector('json-preview',['json-preview']).run([{synthetic:true}],{...ctx,allowed:['preview-import']});
 assert.deepEqual(r,{status:'draft',data:{count:1},requiresApproval:true});
});
