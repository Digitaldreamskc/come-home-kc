import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
const root='http://127.0.0.1:3101';
const accounts=JSON.parse(fs.readFileSync('.civic-test-accounts.json','utf8')) as Record<string,{id:string;email:string;password:string}>;
test.use({trace:'off',screenshot:'off',video:'off'});
async function login(p:Page,role:string){await p.goto(root+'/civic/login');await p.getByLabel('Email',{exact:true}).fill(accounts[role].email);await p.getByLabel('Password',{exact:true}).fill(accounts[role].password);await p.getByRole('button',{name:'Sign in',exact:true}).click();await expect(p).toHaveURL(root+'/civic');}
async function cmd(p:Page,body:unknown){const r=await p.request.post(root+'/api/civic/program',{headers:{Origin:root},data:body});expect(r.status(),await r.text()).toBe(200);return r.json();}
async function workspace(p:Page){return (await p.request.get(root+'/api/civic/program')).json();}
async function shots(p:Page,name:string){for(const width of [1440,1024,768,390,375]){await p.setViewportSize({width,height:1000});await p.evaluate(()=>document.fonts.ready);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow at '+width).toBe(true);await p.screenshot({path:`outputs/correctness-${name}-${width}.png`,fullPage:true});}}
test('own journey stays separate from review and organization projections',async({browser})=>{
 for(const role of ['admin','other']){const c=await browser.newContext(),p=await c.newPage();try{await login(p,role);const data=await workspace(p);await p.goto(root+'/civic/journey');expect(data.records.every((r:{user_id:string})=>r.user_id===accounts[role].id)).toBe(true);await expect(p.locator('.civic-record')).toHaveCount(data.records.length);await expect(p.getByText('Only your own activity contributes to this journey.',{exact:false})).toBeVisible();await shots(p,role==='admin'?'reviewer-personal-journey':'organization-personal-journey');await p.goto(root+(role==='admin'?'/civic/review':'/civic/organization'));await shots(p,role==='admin'?'review-workspace':'organization-workspace');}finally{await c.close();}}
});
test('introduction pause persists and blocks discovery then authorized resume restores it',async({page})=>{
 await login(page,'candidate');const original=(await workspace(page)).profile;expect(original).toBeTruthy();
 try{await page.goto(root+'/civic/profile');await page.getByLabel('Introduction preference').selectOption('Not seeking introductions');await page.getByRole('button',{name:'Save private civic profile'}).click();await expect(page.getByRole('status')).toContainText('Saved');await page.reload();await expect(page.getByLabel('Introduction preference')).toHaveValue('Not seeking introductions');await shots(page,'paused-profile');await page.goto(root+'/civic/connections');await expect(page.getByRole('heading',{name:'New introductions are paused'})).toBeVisible();await expect(page.getByRole('button',{name:/Ask .* for an introduction/})).toHaveCount(0);await shots(page,'paused-paths');const denied=await page.request.post(root+'/api/civic/connections',{headers:{Origin:root},data:{type:'draft',first_edge:'c3800000-0000-4000-8000-000000000001',second_edge:'c3800000-0000-4000-8000-000000000002',note:'Synthetic denied draft',opportunity:''}});expect(denied.status()).toBe(409);
 }finally{await cmd(page,{type:'profile',payload:{...original,introductionPreference:'Ask me each time'}});}
 await page.goto(root+'/civic/connections');await expect(page.getByRole('heading',{name:'New introductions are paused'})).toHaveCount(0);await shots(page,'resumed-paths');
});
test('interest revisions and withdrawal preserve history beside personal progress',async({page})=>{
 await login(page,'candidate');await page.goto(root+'/civic/opportunities');const card=page.locator('.civic-card').filter({has:page.getByRole('heading',{name:'Neighborhood learning and community stewardship board member'})});
 await card.getByRole('button',{name:'Express interest',exact:true}).click();await card.getByLabel('What interests you? (optional)').fill('I would like to discuss the time commitment and community responsibilities.');await card.getByRole('checkbox').check();await card.getByRole('button',{name:'Send permitted interest'}).click();await expect(card.getByRole('status')).toContainText('Saved');
 await card.getByRole('button',{name:'Withdraw my interest'}).click();await expect(card.locator('.civic-status')).toHaveText('Withdrawn');await shots(page,'withdrawn-interest');
 await card.getByLabel('What interests you? (optional)').fill('I am ready to revisit this opportunity with fresh permission.');await expect(card.getByRole('checkbox')).not.toBeChecked();await card.getByRole('checkbox').check();await card.getByRole('button',{name:'Send permitted interest'}).click();await expect(card.locator('.civic-status')).toHaveText('Awaiting organization response');await shots(page,'opportunities');
 await page.goto(root+'/civic/journey');await page.getByText(/Consent & decision history \(/).click();const history=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Consent & decision history'})});await expect(history.getByRole('heading',{name:'Interest withdrawn'}).last()).toBeVisible();await expect(history.getByText('I am ready to revisit this opportunity with fresh permission.').last()).toBeVisible();await shots(page,'consent-history');await page.locator('summary').filter({hasText:'Consent & decision history'}).click();await shots(page,'personal-journey');
});
test('pending and closed opportunities expose no action and deadline survives creation',async({browser})=>{
 const c=await browser.newContext(),p=await c.newPage();try{await login(p,'other');const title='Synthetic deadline and availability review '+Date.now();const created=await cmd(p,{type:'catalog',organization_id:'c3400000-0000-4000-8000-000000000001',kind:'opportunity',title,description:'An isolated correctness example. No real applications.',category:'Advisory committee',jurisdiction:'Kansas City',requirements:'Manual organization eligibility review',process:'Human-reviewed conversation',deadline:'2026-01-01'});await p.goto(root+'/civic/opportunities');const card=p.locator('.civic-card').filter({has:p.getByRole('heading',{name:title,exact:true})}).last();await expect(card.getByRole('button',{name:'Express interest'})).toHaveCount(0);await expect(card).toContainText('Awaiting quality review');expect((await workspace(p)).catalog.find((x:{id:string})=>x.id===created.id).deadline).toBe('2026-01-01');await cmd(p,{type:'catalog_status',id:created.id,state:'closed'});await p.reload();await expect(card).toContainText('Closed');await expect(card.getByRole('button',{name:'Express interest'})).toHaveCount(0);await shots(p,'closed-availability');}finally{await c.close();}
});


test('sign-in without JavaScript never places credentials in the URL',async({browser})=>{
 for(const url of [root+'/civic/login','http://127.0.0.1:3102/showcase/login']){
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  try{await page.goto(url);await page.getByLabel('Email',{exact:true}).fill('synthetic-fallback@example.test');await page.getByLabel('Password',{exact:true}).fill('Noncredential-fallback-test');
   const response=page.waitForResponse(r=>r.request().isNavigationRequest()&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Sign in',exact:true}).click();const r=await response;expect(new URL(r.url()).search).toBe('');expect(page.url()).not.toContain('password=');
  }finally{await context.close();}
 }
});
