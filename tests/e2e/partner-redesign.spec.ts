import {test,expect} from '@playwright/test';
test.skip(process.env.APP_MODE!=='open-demo','Partner demo checks run against the isolated open-demo server.');
test('partner overview and benefits retain accessible navigation and exclusive accordions',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/demo/partners');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Invest in the next generation of Kansas City’s workforce.');
 await expect(page.getByRole('navigation',{name:'Partner navigation',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open menu',exact:true})).toBeHidden();
 await page.getByRole('link',{name:'See partner benefits',exact:true}).click();
 await expect(page).toHaveURL(/\/demo\/partner-benefits$/);
 await expect(page.getByRole('navigation',{name:'Partner navigation',exact:true}).getByRole('link',{name:'Partner benefits',exact:true})).toHaveAttribute('aria-current','page');
 const first=page.getByRole('button',{name:'01 Founding Circle',exact:true}),second=page.getByRole('button',{name:'02 Stories of Impact',exact:true});
 await expect(first).toHaveAttribute('aria-expanded','true');await second.focus();await page.keyboard.press('Space');await expect(second).toHaveAttribute('aria-expanded','true');await expect(first).toHaveAttribute('aria-expanded','false');await first.focus();await page.keyboard.press('Enter');await expect(first).toHaveAttribute('aria-expanded','true');
 await page.getByRole('link',{name:'← Back to overview',exact:true}).click();await expect(page).toHaveURL(/\/demo\/partners$/);await expect(page.getByRole('heading',{level:1})).toHaveText('Invest in the next generation of Kansas City’s workforce.');await page.setViewportSize({width:390,height:844});
 const menu=page.getByRole('button',{name:'Open menu',exact:true});await menu.click();await expect(page.getByRole('navigation',{name:'Mobile partner navigation',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(menu).toHaveAttribute('aria-expanded','false');
 const one=page.getByRole('button',{name:'01 Attract & reconnect talent',exact:true}),two=page.getByRole('button',{name:'02 Build community & belonging',exact:true});await expect(one).toHaveAttribute('aria-expanded','true');await two.click();await expect(two).toHaveAttribute('aria-expanded','true');await expect(one).toHaveAttribute('aria-expanded','false');
});
test('partner pages fit all review widths and load the requested local fonts',async({page})=>{
 for(const route of ['/demo/partners','/demo/partner-benefits']){await page.goto(route);await page.evaluate(()=>document.fonts.ready);for(const width of [360,390,640,768,960,1024,1440,1600]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' at '+width).toBe(true);}expect(await page.locator('.partner-redesign h1').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Plus Jakarta Sans');}
});
test('demo conversation requires consent and never submits to an API',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});await page.goto('/demo/partners');await page.locator('#contact').getByRole('button',{name:'Start a conversation',exact:false}).click();
 await expect(page.getByRole('button',{name:'Hide conversation form'})).toHaveCount(0);await expect(page.locator('#contact > button')).toBeHidden();await expect(page.getByText('Share a name, organization, role and email.',{exact:false})).toHaveCount(0);await expect(page.getByRole('img',{name:'Downtown Kansas City skyline under a blue sky'})).toBeVisible();await expect(page.getByLabel('Name (required)',{exact:true})).toBeFocused();await page.getByLabel('Name (required)',{exact:true}).fill('Demo Reviewer');await page.getByLabel('Organization (required)',{exact:true}).fill('Example Organization');await page.getByLabel('Role (required)',{exact:true}).fill('Reviewer');await page.getByLabel('Email (required)',{exact:true}).fill('demo@example.test');
 await page.locator('form').getByRole('button',{name:'Start a conversation',exact:true}).click();await expect(page.getByRole('checkbox')).toBeFocused();await page.getByRole('checkbox').check();await page.locator('form').getByRole('button',{name:'Start a conversation',exact:true}).click();await expect(page.getByRole('status')).toContainText('Nothing was submitted, saved, or emailed');expect(requests).toEqual([]);
});
