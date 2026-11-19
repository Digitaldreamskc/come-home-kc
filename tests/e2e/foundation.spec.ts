import {test,expect} from '@playwright/test';
import path from 'node:path';
for(const width of [1440,1024,768,390,375])test(`marketplace layout and filters at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/preview');
 await expect(page.getByRole('note')).toContainText('synthetic');
 await expect(page.locator('.result-card')).toHaveCount(6);
 await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('img',{name:'Back2KC',exact:true})).toBeVisible();
 await expect(page.getByRole('img',{name:'Back2KC',exact:true})).toHaveJSProperty('complete',true);
 await expect(page.getByRole('img',{name:'Back2KC',exact:true})).not.toHaveJSProperty('naturalWidth',0);
 await page.screenshot({path:path.resolve(`outputs/marketplace-${width}.png`),fullPage:true});
 if(width<768)await page.locator('.filter-disclosure summary').click();
 await page.getByLabel('Employment type',{exact:true}).selectOption('Full time');
 await expect(page.locator('.result-card')).toHaveCount(3);
 const group=page.getByRole('group',{name:'Choose region'});
 await group.getByRole('button',{name:'Kansas',exact:true}).click();await expect(page.locator('.result-card')).toHaveCount(0);
 await group.getByRole('button',{name:'Missouri',exact:true}).click();await expect(page.locator('.result-card')).toHaveCount(3);
 await page.reload();await expect(group.getByRole('button',{name:'Missouri',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('synthetic tenant reuses UI with its own geography and identity',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/preview/synthetic');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Explore your next chapter.');
 await expect(page.getByRole('button',{name:'Minnesota',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Missouri',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Minnesota',exact:true}).click();await expect(page.locator('.result-card')).toHaveCount(3);
 await page.screenshot({path:path.resolve('outputs/synthetic-tenant-1440.png'),fullPage:true});
});
test('real isolated catalog is available and does not serve layout fixtures',async({request})=>{
 const r=await request.get('/api/catalog');expect(r.status()).toBe(200);const d=await r.json();
 expect(d.jobs.some((j:{id:string})=>j.id.startsWith('demo-'))).toBe(false);
});
