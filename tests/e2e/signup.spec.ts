import {test,expect} from '@playwright/test';
import path from 'node:path';
for(const intent of ['talent','employer'])for(const width of [1440,1024,768,390,375])test(`${intent} signup fits ${width}px with explicit privacy`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/signup?intent='+intent);await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('heading',{name:intent==='talent'?'Create a talent account':'Create an employer account',exact:true})).toBeVisible();
 await expect(page.getByText('Your choices stay separate.',{exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:path.resolve(`outputs/${intent}-signup-${width}.png`),fullPage:true});
});
test('signup validates short passwords and preserves employer intent without granting access',async({page})=>{
 let requests=0;let payload:Record<string,unknown>={};let redirect='';
 await page.route('**/auth/v1/signup*',async route=>{requests++;payload=route.request().postDataJSON();redirect=new URL(route.request().url()).searchParams.get('redirect_to')||'';await route.fulfill({status:200,json:{user:{id:'95000000-0000-4000-8000-000000000001',email:'signup@example.test',identities:[]},session:null}});});
 await page.goto('/signup?intent=employer');await page.getByLabel('Email',{exact:true}).fill('signup@example.test');await page.getByLabel('Password',{exact:true}).fill('short');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('status')).toContainText('Use at least 12 characters');expect(requests).toBe(0);
 await page.getByLabel('Password',{exact:true}).fill('Synthetic-passphrase-123');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('heading',{name:'Confirm your email',exact:true})).toBeVisible();expect(requests).toBe(1);expect(payload.data).toEqual({onboarding_intent:'employer'});expect(new URL(redirect).searchParams.get('next')).toBe('/portal?view=employer');await expect(page).toHaveURL(/signup/);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:path.resolve('outputs/signup-confirmation-'+width+'.png'),fullPage:true});}
});
test('signup service errors preserve entered fields and allow recovery',async({page})=>{
 await page.route('**/auth/v1/signup*',route=>route.fulfill({status:429,json:{msg:'Please wait before trying again.'}}));await page.goto('/signup?intent=talent');await page.getByLabel('Email',{exact:true}).fill('signup@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic-passphrase-123');await page.getByLabel('Password',{exact:true}).fill('Synthetic-passphrase-123');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('status')).toContainText('Please wait');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('signup@example.test');await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeEnabled();
});

test('confirmation resend and wrong-address controls preserve destination',async({page})=>{
 await page.clock.install();let resends=0;const id='95000000-0000-4000-8000-000000000001';
 await page.route('**/auth/v1/signup*',r=>r.fulfill({json:{user:{id,email:'synthetic@example.test',identities:[]},session:null}}));
 await page.route('**/auth/v1/resend*',r=>{resends++;expect(r.request().postDataJSON().email).toBe('synthetic@example.test');return r.fulfill({json:{}});});
 await page.goto('/signup?intent=talent&next='+encodeURIComponent('/portal?view=profile&job='+id+'#request-introduction'));
 await page.getByLabel('Email',{exact:true}).fill('synthetic@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic-passphrase-123');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByText('synthetic@example.test',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Resend available/})).toBeDisabled();await page.clock.fastForward(61000);await page.getByRole('button',{name:'Resend confirmation',exact:true}).click();expect(resends).toBe(1);await page.getByRole('button',{name:'Wrong address?',exact:true}).click();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('synthetic@example.test');await expect(page.getByLabel('Password',{exact:true})).toHaveValue('');await expect(page.getByRole('link',{name:'Already registered? Sign in'})).toHaveAttribute('href',/next=/);
});

test('capture short-password, existing-account, and invalid-link recovery states',async({page})=>{
 async function capture(name:string){for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.resolve(`outputs/${name}-${width}.png`),fullPage:true});}}
 await page.route('**/auth/v1/signup*',r=>r.fulfill({status:422,json:{msg:'This email is already registered. Sign in or reset your password.'}}));
 await page.goto('/signup?intent=talent');await page.getByLabel('Email',{exact:true}).fill('synthetic@example.test');await page.getByLabel('Password',{exact:true}).fill('short');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('status')).toContainText('at least 12');await capture('signup-short-password');
 await page.getByLabel('Password',{exact:true}).fill('Synthetic-passphrase-123');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('status')).toContainText('already registered');await capture('signup-existing-account');
 await page.goto('/auth/callback?code=invalid&next=/portal');await expect(page.getByRole('status')).toContainText('missing, expired or already used');await capture('signup-invalid-link');
});
