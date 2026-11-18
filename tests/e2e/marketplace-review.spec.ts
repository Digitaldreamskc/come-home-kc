import {test,expect} from '@playwright/test';
import path from 'node:path';

test('mobile menu, accessible role links and safe demo details',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/preview');
 await expect(page.getByRole('group',{name:'Result layout'})).toBeHidden();
 await expect(page.getByRole('button',{name:'Clear filters',exact:true})).toHaveCount(0);
 const signIn=page.getByRole('link',{name:'Sign in',exact:true});expect((await signIn.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await page.locator('.mobile-menu summary').click();const menu=page.getByRole('navigation',{name:'Mobile navigation'});
 await expect(menu.getByRole('link',{name:'For employers',exact:true})).toBeVisible();await expect(menu.getByRole('link',{name:/Get connected/})).toBeVisible();
 await page.screenshot({path:path.resolve('outputs/mobile-menu-390.png'),fullPage:false});
 await menu.getByRole('link',{name:'Explore',exact:true}).click();await expect(menu).toBeHidden();
 const role=page.locator('.role-card').first();await role.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('Applications and introduction requests are disabled');
 await expect(page.getByRole('link',{name:/Apply with employer/})).toHaveCount(0);
 await page.screenshot({path:path.resolve('outputs/demo-role-390.png'),fullPage:false});
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(role).toBeFocused();
});

test('region scopes cities and clears an incompatible city without clearing search',async({page})=>{
 await page.goto('/preview');await page.getByLabel('City',{exact:true}).selectOption('Example KS city');
 await expect(page.locator('.role-card')).toHaveCount(3);
 await page.getByRole('searchbox').fill('demo');
 await page.getByRole('button',{name:'Missouri',exact:true}).click();
 await expect(page.getByLabel('City',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('City',{exact:true}).locator('option')).toHaveText(['All cities','Example MO city']);
 await expect(page.getByRole('searchbox')).toHaveValue('demo');await expect(page.locator('.role-card')).toHaveCount(3);
 await page.getByRole('searchbox').fill('no-such-role');await expect(page.getByRole('heading',{name:'No roles match this view.'})).toBeVisible();
 await page.locator('.empty-state').getByRole('button',{name:'Clear filters',exact:true}).click();
 await expect(page.locator('.role-card')).toHaveCount(6);await expect(page.getByRole('button',{name:'Clear filters',exact:true})).toHaveCount(0);
});

test('long role metadata remains readable, with no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:844});await page.goto('/preview');
 const card=page.locator('.role-card').last();await expect(card).toContainText('Senior customer success and community partnerships lead');
 for(const selector of ['.card-kicker','.location','.card-details','.card-note'])expect(await card.locator(selector).evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(12);
 const contrast=await card.locator('.card-kicker').evaluate(e=>{const rgb=(v:string)=>v.match(/[\d.]+/g)!.slice(0,3).map(Number);const lum=(v:number[])=>v.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);const a=lum(rgb(getComputedStyle(e).color)),b=lum(rgb(getComputedStyle(e.closest('.role-card')!).backgroundColor));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(contrast).toBeGreaterThanOrEqual(4.5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.employer-invitation').getByRole('link')).toHaveAttribute('href','/login?intent=employer');
});

test('an empty unfiltered collection does not offer a redundant reset',async({page})=>{await page.goto('/preview?category=resources');await expect(page.locator('.empty-state')).toBeVisible();await expect(page.getByRole('button',{name:'Clear filters',exact:true})).toHaveCount(0);});
