import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
test.use({trace:'off',screenshot:'off',video:'off'});
test('password visibility preserves the typed password and does not submit',async({page})=>{
 await page.goto('/login');const input=page.getByLabel('Password',{exact:true});await input.fill('Synthetic visibility test');await expect(input).toHaveAttribute('type','password');await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(input).toHaveAttribute('type','text');await expect(input).toHaveValue('Synthetic visibility test');await page.getByRole('button',{name:'Hide password',exact:true}).click();await expect(input).toHaveAttribute('type','password');await expect(page).toHaveURL(/\/login$/);
});
test('forgot password sends recovery request without requiring a current password',async({page,baseURL})=>{
 let redirect='';let email='';await page.route('**/auth/v1/recover*',route=>{redirect=new URL(route.request().url()).searchParams.get('redirect_to')||'';email=route.request().postDataJSON().email;return route.fulfill({status:200,json:{}});});
 await page.goto('/login');await page.getByRole('link',{name:'Forgot your password?'}).click();await expect(page).toHaveURL(/\/forgot-password$/);await page.getByLabel('Email',{exact:true}).fill('recovery-test@example.test');await page.getByRole('button',{name:'Send reset link'}).click();await expect(page.getByRole('status')).toContainText('If an account exists');expect(email).toBe('recovery-test@example.test');expect(redirect).toBe(baseURL+'/auth/callback?next=/reset-password');
});
test('email service errors are shown without claiming a reset email was sent',async({page})=>{
 await page.route('**/auth/v1/recover*',route=>route.fulfill({status:429,json:{msg:'Rate limited'}}));await page.goto('/forgot-password');await page.getByLabel('Email',{exact:true}).fill('recovery-test@example.test');await page.getByRole('button',{name:'Send reset link'}).click();await expect(page.getByRole('status')).toContainText('wait a few minutes');await expect(page.getByRole('button',{name:'Send reset link'})).toBeEnabled();
});
test('missing or invalid recovery links provide a fresh-link option',async({page})=>{
 await page.goto('/reset-password');await expect(page.getByText(/missing, expired, or already used/)).toBeVisible();await page.goto('/auth/confirm?type=recovery&token_hash=invalid');await expect(page.getByText(/missing, expired, or already used/)).toBeVisible();
});
test('real one-time recovery changes password, signs out, and accepts the new password',async({page})=>{
 test.skip(!process.env.RESET_TEST_FIXTURE,'Requires a private, temporary recovery fixture.');
 const data=JSON.parse(fs.readFileSync(process.env.RESET_TEST_FIXTURE!,'utf8'));const account=data.accounts.find((a:{email:string})=>a.email.endsWith('@example.test'));const password='Test-'+randomUUID()+'-Aa1!';
 await page.goto('/auth/confirm?type=recovery&token_hash='+account.recovery_hash);await expect(page).toHaveURL(/\/reset-password$/);await page.getByLabel('New password',{exact:true}).fill(password);await page.getByLabel('Confirm new password',{exact:true}).fill('Does-not-match');await page.getByRole('button',{name:'Update password'}).click();await expect(page.getByRole('status')).toContainText('do not match');await page.getByLabel('Confirm new password',{exact:true}).fill(password);await page.getByRole('button',{name:'Update password'}).click();await expect(page.getByRole('status')).toContainText('password is updated');expect((await page.request.get('/api/portal')).status()).toBe(401);
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/portal$/);expect((await page.request.get('/api/admin?table=tasks')).status()).toBe(403);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/$/);await page.goto('/auth/confirm?type=recovery&token_hash='+account.recovery_hash);await expect(page.getByText(/missing, expired, or already used/)).toBeVisible();
});
