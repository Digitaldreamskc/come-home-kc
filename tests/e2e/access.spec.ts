import { test, expect } from '@playwright/test';
// These tests use the running server, not route interception.
test('unauthenticated visitors cannot read or write administrator and portal data',async({request,baseURL})=>{
 for(const path of ['/api/admin?table=tasks','/api/portal']){
  const read=await request.get(path);expect(read.status(),path+' read').toBe(401);
  const write=await request.post(path,{headers:{origin:new URL(baseURL!).origin},data:{action:'create',table:'tasks',values:{title:'Unauthorized synthetic task'}}});expect(write.status(),path+' write').toBe(401);
 }
});
test('private pages redirect to sign-in without revealing records',async({page})=>{
 for(const path of ['/admin','/portal']){await page.goto(path);await expect(page).toHaveURL(/\/login/);await expect(page.getByRole('textbox',{name:/email/i})).toBeVisible();}
});
test('public catalog returns only public collections or an explicit unavailable response',async({request})=>{
 const response=await request.get('/api/catalog');
 expect([200,503]).toContain(response.status());const body=await response.json();
 if(response.status()===200){for(const name of ['organizations','jobs','resources','events'])expect(Array.isArray(body[name])).toBe(true);expect(body).not.toHaveProperty('candidate_profiles');expect(body).not.toHaveProperty('employer_conversations');expect(JSON.stringify(body)).not.toMatch(/"contact_email"|"private_notes"|"consent_record"/);}
 else expect(body.error).toBeTruthy();
});
