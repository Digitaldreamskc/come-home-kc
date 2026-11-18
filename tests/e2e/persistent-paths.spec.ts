import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {pathConsentText} from '../../lib/paths/persistent';
type Account={email:string;password:string};
const accounts=fs.existsSync('.test-accounts.json')?JSON.parse(fs.readFileSync('.test-accounts.json','utf8')) as Record<string,Account>:null;
test.skip(!accounts,'Requires synthetic accounts in the isolated development database.');
test.use({trace:'off',screenshot:'off',video:'off'});
async function login(page:Page,role:string){await page.goto('/login?next=/connections');await page.getByLabel('Email',{exact:true}).fill(accounts![role].email);await page.getByLabel('Password',{exact:true}).fill(accounts![role].password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/connections$/);await expect(page.getByText('Signed in as',{exact:false})).toBeVisible();}
async function command(page:Page,data:unknown){const r=await page.request.post('/api/connections',{data,headers:{Origin:new URL(page.url()).origin}});expect(r.status(),await r.text()).toBe(200);return r.json();}
async function workspace(page:Page){const r=await page.request.get('/api/connections');expect(r.status()).toBe(200);return r.json();}
async function shots(page:Page,name:string){await expect(page.getByText('Signed in as',{exact:false})).toBeVisible();await expect(page.getByText('Loading your private connections…')).toHaveCount(0);for(const width of [1440,1024,768,390,375]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.resolve(`outputs/phase2-${name}-${width}.png`),fullPage:true});}}
test('real Auth participants persist a reviewed introduction with fresh consent and private follow-up',async({browser})=>{
 test.setTimeout(240000);
 const contexts=await Promise.all(Array.from({length:4},()=>browser.newContext()));
 const [alex,jordan,riley,team]=await Promise.all(contexts.map(c=>c.newPage()));
 try{
 for(const [p,role] of [[alex,'candidate'],[jordan,'employer'],[riley,'other'],[team,'admin']] as const)await login(p,role);
 const edge1='f8000000-0000-4000-8000-000000000001',edge2='f8000000-0000-4000-8000-000000000002';
 for(const [p,edge] of [[alex,edge1],[jordan,edge1],[jordan,edge2],[riley,edge2]] as const)await command(p,{type:'confirm',edge_id:edge,visible:true,willing:true});
 await alex.reload();await expect(alex.getByRole('button',{name:/Prepare a private request/})).toBeVisible();await shots(alex,'discovery');
 await alex.getByRole('button',{name:/Prepare a private request/}).click();
 const draft=alex.locator('.path-request').first();await expect(draft.getByText('Draft',{exact:true})).toBeVisible();
 const id=await draft.getAttribute('data-attempt-id');expect(id).toBeTruthy();
 await draft.getByLabel('What would you like to discuss? (required)').fill('Synthetic Phase 2 persistence check: community partnerships and returning to Kansas City.');
 await draft.getByRole('button',{name:'Submit for human review'}).click();await expect(draft.getByRole('alert')).toContainText('Choose whether to share');await shots(alex,'consent-error');
 await draft.getByLabel(/Share my display name, this note/).check();await draft.getByRole('button',{name:'Submit for human review'}).click();await expect(draft.getByText('Submitted · awaiting team review',{exact:true}).first()).toBeVisible();
 expect((await workspace(jordan)).attempts.some((a:{id:string})=>a.id===id)).toBe(false);
 const storedConsent=(await workspace(alex)).attempts.find((a:{id:string})=>a.id===id).consents;
 expect(storedConsent.find((c:{purpose:string})=>c.purpose==='request_context').wording).toBe(pathConsentText.request);
 expect(storedConsent.find((c:{purpose:string})=>c.purpose==='email_share').wording).toBe(pathConsentText.email);
 const spoof=await jordan.request.post('/api/connections',{data:{type:'transition',attempt_id:id,to:'connector_reviewing',role:'reviewer'},headers:{Origin:new URL(jordan.url()).origin}});expect(spoof.status()).toBe(400);
 const early=await jordan.request.get('/api/connections?contacts='+id);expect(early.status()).toBe(403);
 await command(team,{type:'transition',attempt_id:id,to:'changes_requested',note:'Please explain which community partnerships you would like to discuss.'});
 await alex.reload();await alex.getByRole('button',{name:'Requests',exact:true}).click();await expect(alex.getByText('Please explain which community partnerships you would like to discuss.').first()).toBeVisible();await shots(alex,'changes-requested');
 const revised=await command(alex,{type:'revise',attempt_id:id});
 expect((await workspace(alex)).attempts.find((a:{id:string})=>a.id===revised.id).consents).toEqual([]);
 await command(alex,{type:'save',attempt_id:revised.id,note:'Synthetic review: discuss organizing welcoming events with regional employers.',opportunity:'Synthetic community partnerships'});
 await command(alex,{type:'transition',attempt_id:revised.id,to:'submitted',share_context:true,share_email:false});
 await command(team,{type:'transition',attempt_id:revised.id,to:'connector_reviewing'});
 await command(jordan,{type:'transition',attempt_id:revised.id,to:'connector_accepted',consent:true});
 expect((await workspace(riley)).attempts.some((a:{id:string})=>a.id===revised.id)).toBe(false);
 await command(team,{type:'transition',attempt_id:revised.id,to:'recipient_reviewing'});
 await command(riley,{type:'transition',attempt_id:revised.id,to:'recipient_accepted',consent:true,share_email:true});
 await team.reload();await team.getByRole('button',{name:'Requests',exact:true}).click();await shots(team,'team-review');
 await command(team,{type:'transition',attempt_id:revised.id,to:'introduced',note:'Synthetic introduction recorded after all three current-attempt permissions.'});
 const contacts=await alex.request.get('/api/connections?contacts='+revised.id);expect((await contacts.json()).email).toBe(accounts!.other.email);
 expect(await (await riley.request.get('/api/connections?contacts='+revised.id)).json()).toEqual({});
 await command(alex,{type:'followup',attempt_id:revised.id,connected:false,note:'Private synthetic follow-up note.'});
 expect(JSON.stringify(await workspace(riley))).not.toContain('Private synthetic follow-up note.');
 await alex.reload();await alex.getByRole('button',{name:'Requests',exact:true}).click();await shots(alex,'persisted-introduction');
 const fresh=await browser.newContext();try{const page=await fresh.newPage();await login(page,'candidate');const w=await workspace(page);expect(w.attempts.find((a:{id:string})=>a.id===revised.id).events.some((e:{kind:string})=>e.kind==='not_yet')).toBe(true);}finally{await fresh.close();}
 fs.writeFileSync('outputs/phase2-persistence-evidence.json',JSON.stringify({attemptId:revised.id,requestId:id,verified:['four separate Supabase Auth sessions','connector and recipient visibility gates','API rejects spoofed roles','revision has no inherited consent','optional email grant checked server-side','private follow-up withheld from recipient','fresh login retrieves persisted events'],recordedAt:new Date().toISOString()},null,2));
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
test('retrieves the same persisted attempt after the local server restarts',async({page})=>{
 const evidence=JSON.parse(fs.readFileSync('outputs/phase2-persistence-evidence.json','utf8')) as {attemptId:string};
 await login(page,'candidate');const saved=(await workspace(page)).attempts.find((a:{id:string})=>a.id===evidence.attemptId);
 expect(saved.state).toBe('introduced');expect(saved.events.some((e:{kind:string})=>e.kind==='not_yet')).toBe(true);
 await page.getByRole('button',{name:'Requests',exact:true}).click();await expect(page.locator(`[data-attempt-id="${evidence.attemptId}"]`)).toBeVisible();
});
