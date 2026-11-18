import { tenant } from '../../lib/tenant-config';
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

type Account={id:string;email:string;password:string};
type Accounts=Record<'admin'|'candidate'|'employer'|'other',Account>;
type Row=Record<string,unknown>;
const accountFile=path.resolve('.test-accounts.json');
const accounts=fs.existsSync(accountFile)?JSON.parse(fs.readFileSync(accountFile,'utf8')) as Accounts:null;
// Read only local fixture configuration. Neither credentials nor access tokens enter reports.
if(fs.existsSync('.env.local'))for(const line of fs.readFileSync('.env.local','utf8').split('\n')){const match=line.match(/^([A-Z_]+)=(.*)$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');}
const database=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let adminToken='';const orgId=randomUUID(),otherOrgId=randomUUID(),introOrg=randomUUID(),introJob=randomUUID();const marker=`Synthetic browser QA ${randomUUID().slice(0,8)}`;let priorProfile:Row|null=null;let priorConsents:string[]=[];let priorSubmissions:string[]=[];
async function rest(resource:string,method='GET',data?:unknown){const response=await fetch(`${database}/rest/v1/${resource}`,{method,headers:{'x-tenant-id':tenant.id,apikey:key!,Authorization:`Bearer ${adminToken}`,'Content-Type':'application/json',Prefer:'return=representation'},...(data===undefined?{}:{body:JSON.stringify(data)})});if(!response.ok)throw Error(`Synthetic fixture request failed (${method}, status ${response.status}).`);const text=await response.text();return text?JSON.parse(text):null;}
async function login(page:Page,role:keyof Accounts){await page.goto('/login');await expect(page.getByLabel('Email',{exact:true})).toBeVisible();try{await page.getByLabel('Email',{exact:true}).fill(accounts![role].email);await page.getByLabel('Password',{exact:true}).fill(accounts![role].password);}catch{throw Error('Could not complete synthetic account credentials.');}await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/portal(?:\?|$)/);await expect(page.getByRole('heading',{name:'Your connections',exact:true})).toBeVisible();}
async function portal(page:Page){const response=await page.request.get('/api/portal');expect(response.status()).toBe(200);return await response.json();}
async function post(page:Page,url:string,data:unknown){return await page.request.post(url,{data,headers:{Origin:new URL(page.url()).origin}});}


async function captureLayouts(page:Page,name:string){for(const width of [1440,1024,768,390,375]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.resolve('outputs/'+name+'-'+width+'.png'),fullPage:true});if(name==='selected-introduction')await page.locator('#request-introduction').screenshot({path:path.resolve('outputs/introduction-form-'+width+'.png')});}}
test.use({trace:'off',screenshot:'off',video:'off'});

test.describe('authenticated database journeys',()=>{
 test.describe.configure({mode:'serial'});
 test.skip(!accounts||!database||!key,'Requires ignored .test-accounts.json and isolated Supabase environment.');
 test.beforeAll(async()=>{
  if(!accounts||!database||!key)return;
  const response=await fetch(`${database}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:accounts.admin.email,password:accounts.admin.password})});
  if(!response.ok)throw Error('Synthetic administrator authentication failed.');
  adminToken=(await response.json()).access_token;
  const rows=await rest(`candidate_profiles?user_id=eq.${accounts.candidate.id}`) as Row[];priorProfile=rows[0]||null;
  priorSubmissions=(await rest(`submissions?user_id=eq.${accounts.candidate.id}&select=id`) as Row[]).map(r=>String(r.id));
  priorConsents=(await rest(`communications_consent?user_id=eq.${accounts.candidate.id}&select=id`) as Row[]).map(r=>String(r.id));
  await rest('organizations','POST',{id:introOrg,name:'Synthetic introduction test team',description:'Synthetic validation only',status:'published',verification_status:'verified',verified_at:new Date().toISOString()});
  await rest('job_postings','POST',{id:introJob,organization_id:introOrg,title:'Synthetic introduction test role',description:'Synthetic validation only, not a real opening',status:'active',verified_at:new Date().toISOString(),expires_at:'2099-01-01T00:00:00Z',application_url:'https://example.test',work_mode:'remote',remote_eligible_states:['MO']});
  // Private draft organizations exercise employer ownership without polluting the public catalog.
  await rest('organizations','POST',[{id:orgId,name:marker+' owner',status:'draft',verification_status:'verified',verified_at:new Date().toISOString()},{id:otherOrgId,name:marker+' other',status:'draft',verification_status:'verified',verified_at:new Date().toISOString()}]);
  await rest('organization_members','POST',[{organization_id:orgId,user_id:accounts.employer.id,verified_at:new Date().toISOString()},{organization_id:otherOrgId,user_id:accounts.other.id,verified_at:new Date().toISOString()}]);
 });
 test.afterAll(async()=>{
  if(!adminToken||!accounts)return;
  await rest(`introduction_requests?job_id=eq.${introJob}`,'DELETE');await rest(`job_postings?id=eq.${introJob}`,'DELETE');await rest(`organizations?id=eq.${introOrg}`,'DELETE');
  await rest(`job_postings?organization_id=in.(${orgId},${otherOrgId})`,'DELETE');
  await rest(`organizations?id=in.(${orgId},${otherOrgId})`,'DELETE');
  await rest(`candidate_profiles?user_id=eq.${accounts.candidate.id}`,'DELETE');
  if(priorProfile)await rest('candidate_profiles','POST',priorProfile);
  const added=(await rest(`communications_consent?user_id=eq.${accounts.candidate.id}&select=id`) as Row[]).map(r=>String(r.id)).filter(id=>!priorConsents.includes(id));
  if(added.length)await rest(`communications_consent?id=in.(${added.join(',')})`,'DELETE');
  const submitted=(await rest(`submissions?user_id=eq.${accounts.candidate.id}&select=id`) as Row[]).map(r=>String(r.id)).filter(id=>!priorSubmissions.includes(id));if(submitted.length)await rest(`submissions?id=in.(${submitted.join(',')})`,'DELETE');
 });
 test('candidate edits a private profile with independent permissions and persists after reload',async({page})=>{
  await login(page,'candidate');await expect(page.getByLabel('Name (required)',{exact:true})).toBeVisible();await captureLayouts(page,'candidate-profile');
  await page.getByLabel('Name (required)',{exact:true}).fill(marker+' candidate');
  await page.getByLabel('Current city',{exact:true}).fill('Synthetic City');
  await page.getByLabel('Current state',{exact:true}).selectOption('CO');
  await page.getByRole('checkbox',{name:'Kansas',exact:true}).check();
  await page.getByRole('checkbox',{name:'Contact me about professional opportunities.'}).check();
  await page.getByRole('checkbox',{name:/Ask me about employer introductions/}).uncheck();
  await page.getByRole('button',{name:'Save my private profile'}).click();
  await expect(page.getByRole('status').filter({hasText:'Profile saved.'})).toBeFocused();await captureLayouts(page,'candidate-profile-saved');
  await page.reload();await expect(page.getByLabel('Name (required)',{exact:true})).toHaveValue(marker+' candidate');
  const data=await portal(page);expect(data.profile.opportunities_consent).toBe(true);expect(data.profile.introductions_consent).toBe(false);expect(data.profile.user_id).toBe(accounts!.candidate.id);
  expect((await page.request.get('/api/admin?table=candidate_profiles')).status()).toBe(403);
 });
 test('role selection survives sign-in and submits an introduction without copying IDs',async({page})=>{
  await page.goto('/jobs/'+introJob);await page.getByRole('link',{name:'Request an introduction',exact:true}).click();await expect(page).toHaveURL(/login\?next=/);await expect(page.getByRole('link',{name:'Create a free account'})).toHaveAttribute('href',/next=/);
  await page.getByLabel('Email',{exact:true}).fill(accounts!.candidate.email);await page.getByLabel('Password',{exact:true}).fill(accounts!.candidate.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(new RegExp(introJob));await expect(page.locator('.selected-role')).toContainText('Synthetic introduction test role');await expect(page.locator('.selected-role')).toContainText('Synthetic introduction test team');await captureLayouts(page,'selected-introduction');await page.getByLabel('What interests you?',{exact:true}).fill('Synthetic test interest');await page.getByRole('button',{name:'Request review',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Introduction requested.'})).toBeFocused();expect((await portal(page)).introductions.some((r:Row)=>r.job_id===introJob)).toBe(true);expect((await portal(page)).profile.introductions_consent).toBe(false);
 });
 test('employer registration remains private and grants no hiring permissions',async({page})=>{
  await login(page,'candidate');await page.getByRole('button',{name:'Also hiring? Register your organization',exact:true}).click();await expect(page.getByRole('heading',{name:'Introduce your organization',exact:true})).toBeVisible();await captureLayouts(page,'employer-registration');
  const data={name:'Synthetic onboarding company',representative_name:'Synthetic representative',representative_role:'People lead',website:'https://example.test',hiring_needs:'Synthetic design role in Missouri',regions:['MO'],authorized_representative:false,verification_contact_consent:true,website_trap:''};
  expect((await post(page,'/api/portal',{action:'employer_registration',data})).status()).toBe(400);
  await page.getByLabel('Organization name (required)',{exact:true}).fill(data.name);await page.getByLabel('Your name (required)',{exact:true}).fill(data.representative_name);await page.getByLabel('Your role at the organization (required)',{exact:true}).fill(data.representative_role);await page.getByLabel('Company website (optional)',{exact:true}).fill(data.website);await page.getByLabel('Who are you hoping to hire? (required)',{exact:true}).fill(data.hiring_needs);
  await page.getByRole('group',{name:'Where are you hiring? (optional)'}).getByRole('checkbox',{name:'Missouri',exact:true}).check();await page.getByRole('checkbox',{name:'I am authorized to represent this organization. (required)',exact:true}).check();await page.getByRole('checkbox',{name:'The team may contact me about this verification request. (required)',exact:true}).check();await page.getByRole('button',{name:'Request employer verification',exact:true}).click();await expect(page.getByRole('heading',{name:'We have your verification request.',exact:true})).toBeVisible();await captureLayouts(page,'employer-review-pending');
  const saved=await portal(page);expect(saved.memberships).toHaveLength(0);const submission=saved.submissions.find((r:Row)=>r.kind==='employer'&&(r.payload as Row)?.onboarding_version==='1');expect(submission.status).toBe('pending');expect(submission.payload.authorized_representative).toBe(true);expect(submission.payload.verification_contact_consent).toBe(true);expect(submission.payload.email).toBe(accounts!.candidate.email);expect(saved.profile.introductions_consent).toBe(false);
  expect((await page.request.get('/api/admin?table=submissions')).status()).toBe(403);
  await page.getByRole('button',{name:'Requests & privacy',exact:true}).click();await captureLayouts(page,'requests-privacy');await page.getByRole('button',{name:'Also exploring opportunities? Create a private talent profile',exact:true}).click();await page.getByRole('checkbox',{name:'Contact me about professional opportunities.'}).uncheck();await page.getByRole('button',{name:'Save my private profile',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Profile saved.'})).toBeVisible();await page.reload();await expect(page.getByRole('checkbox',{name:'Contact me about professional opportunities.'})).not.toBeChecked();expect((await portal(page)).profile.opportunities_consent).toBe(false);
 });
 test('administrator can review records while another account cannot read the candidate profile',async({page,browser})=>{
  await login(page,'admin');await page.goto('/admin');await expect(page.locator('.admin-shell')).toBeVisible();await captureLayouts(page,'admin-overview');await page.getByRole('button',{name:'Review queue',exact:true}).click();await expect(page.getByRole('heading',{name:'Review queue',exact:true})).toBeVisible();await captureLayouts(page,'admin-review');const review=await page.request.get('/api/admin?table=candidate_profiles');expect(review.status()).toBe(200);expect((await review.json()).records.some((r:Row)=>r.user_id===accounts!.candidate.id)).toBe(true);
  const context=await browser.newContext({baseURL:new URL(page.url()).origin});try{const other=await context.newPage();await login(other,'other');const data=await portal(other);expect(data.profile?.user_id===accounts!.candidate.id).toBe(false);expect((await other.request.get('/api/admin?table=candidate_profiles')).status()).toBe(403);}finally{await context.close();}
 });
 test('verified employer submits and edits a pending job; cross-organization writes are rejected',async({page})=>{
  await login(page,'employer');await page.getByRole('button',{name:'Submit a job opening',exact:true}).click();
  await captureLayouts(page,'employer-form');await page.getByLabel('Verified company',{exact:true}).selectOption(orgId);
  await page.getByLabel('Job title',{exact:true}).fill(marker+' opening');
  await page.getByLabel('Description and actual work location',{exact:true}).fill('Synthetic browser test. Remote work eligible in Kansas only.');
  await page.getByRole('combobox',{name:'Work style',exact:true}).selectOption('remote');
  await page.getByRole('group',{name:'Where may the remote employee work?'}).getByRole('checkbox',{name:'Kansas',exact:true}).check();
  await page.getByLabel('Employer application link',{exact:true}).fill('https://example.com/synthetic-qa');
  await page.getByLabel('Listing closes',{exact:true}).fill('2099-01-01T12:00');
  await page.getByRole('button',{name:'Submit for review',exact:true}).click();await expect(page.getByRole('status')).toContainText('Job submitted for review.');
  let data=await portal(page);const created=data.jobs.find((j:Row)=>j.title===marker+' opening');expect(created).toBeTruthy();expect(created.status).toBe('pending');expect(created.verified_at).toBeNull();
  const catalog=await page.request.get('/api/catalog');expect(catalog.status()).toBe(200);expect((await catalog.json()).jobs.some((j:Row)=>j.id===created.id)).toBe(false);
  const row=page.getByRole('row').filter({hasText:marker+' opening'});await row.getByRole('button',{name:'Edit listing'}).click();await page.getByLabel('Job title',{exact:true}).fill(marker+' edited');await expect(page.getByLabel('Verified company',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Submit for review',exact:true}).click();await expect(page.getByRole('status')).toContainText('Job submitted for review.');
  data=await portal(page);const edited=data.jobs.find((j:Row)=>j.id===created.id);expect(edited.title).toBe(marker+' edited');expect(edited.status).toBe('pending');
  const payload={organization_id:otherOrgId,title:marker+' forbidden',description:'Synthetic unauthorized request',industry:'',work_mode:'remote',employment_type:'',salary_range:'',application_url:'https://example.com/synthetic',application_instructions:'',expires_at:'2099-01-01T00:00:00Z',remote_eligible_states:['KS']};
  expect((await post(page,'/api/portal',{action:'employer_job',id:created.id,data:payload})).ok()).toBe(false);
  expect((await post(page,'/api/portal',{action:'employer_job',data:payload})).ok()).toBe(false);
  const privateRows=await rest(`job_postings?id=eq.${created.id}`) as Row[];expect(privateRows[0].organization_id).toBe(orgId);expect(privateRows[0].title).toBe(marker+' edited');
  await page.getByRole('row').filter({hasText:marker+' edited'}).getByRole('button',{name:'Close filled position'}).click();await expect(page.getByRole('status')).toContainText('Position closed.');expect((await portal(page)).jobs.find((j:Row)=>j.id===created.id).status).toBe('closed');
 });
});
