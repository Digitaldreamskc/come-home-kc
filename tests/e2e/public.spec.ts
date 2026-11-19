import { test, expect, type Page } from '@playwright/test';
const verified='2026-11-01T12:00:00Z';
const fixture={
 organizations:[
 {id:'synthetic-dual',name:'Synthetic Two State Team',description:'Synthetic test organization',status:'published',verification_status:'verified',headquarters_state:'MO',industry:'Technology',organization_locations:[{city:'Kansas City',state:'MO',verified_at:verified},{city:'Overland Park',state:'KS',verified_at:verified}]},
 {id:'synthetic-mo',name:'Synthetic Missouri Team',status:'published',verification_status:'verified',industry:'Health',organization_locations:[{city:'Kansas City',state:'MO',verified_at:verified}]},
 {id:'synthetic-unknown',name:'Synthetic Unknown Location',status:'published',verification_status:'research',organization_locations:[]},
 {id:'synthetic-private',name:'Synthetic Unpublished Team',status:'draft',verification_status:'unverified',organization_locations:[]}
 ],
 jobs:[
 {id:'synthetic-ks-job',organization_id:'synthetic-dual',title:'Synthetic Kansas Engineer',description:'Build helpful things',industry:'Technology',work_mode:'onsite',status:'active',verified_at:verified,expires_at:'2099-12-01T00:00:00Z',application_url:'https://example.com/jobs/ks',job_locations:[{city:'Overland Park',state:'KS',verified_at:verified}]},
 {id:'synthetic-remote-job',organization_id:'synthetic-mo',title:'Synthetic Missouri Remote',description:'Remote role',industry:'Health',work_mode:'remote',status:'active',verified_at:verified,expires_at:'2099-12-01T00:00:00Z',application_url:'https://example.com/jobs/remote',remote_eligible_states:['MO']},
 {id:'synthetic-expired',organization_id:'synthetic-dual',title:'Synthetic Expired Opening',description:'Closed opportunity',work_mode:'onsite',status:'active',verified_at:verified,expires_at:'2020-01-01T00:00:00Z',application_url:'https://example.com/expired',job_locations:[{state:'KS',verified_at:verified}]},
 {id:'synthetic-unverified',organization_id:'synthetic-dual',title:'Synthetic Unverified Opening',description:'Unreviewed opportunity',work_mode:'onsite',status:'active',expires_at:'2099-01-01T00:00:00Z',application_url:'https://example.com/unreviewed',job_locations:[{state:'KS',verified_at:verified}]}
 ],
 resources:[
 {id:'synthetic-resource',title:'Synthetic Regional Support',description:'Both states',status:'published',verified_at:verified,url:'https://example.com/resource',resource_eligibility:[{state:'MO',verified_at:verified},{state:'KS',verified_at:verified}]},
 {id:'synthetic-ks-resource',title:'Synthetic Kansas Support',status:'published',verified_at:verified,url:'https://example.com/ks-resource',resource_eligibility:[{state:'KS',verified_at:verified}]}
 ],events:[]
};
async function catalog(page:Page){await page.route('**/api/catalog',route=>route.fulfill({json:fixture}));}
const regions=(page:Page)=>page.getByRole('group',{name:'Choose region'});
const categories=(page:Page)=>page.getByRole('group',{name:'Explore category'});
test('combined region/category/search filters use job location and preserve independent choices',async({page})=>{
 await catalog(page);await page.goto('/?region=KS&category=talent');
 await expect(page.getByRole('link',{name:'Synthetic Kansas Engineer',exact:true})).toBeVisible();
 await expect(page.getByText('Synthetic Missouri Remote',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Synthetic Expired Opening',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Synthetic Unverified Opening',{exact:true})).toHaveCount(0);
 await categories(page).getByRole('button',{name:/Employers/}).click();
 await expect(regions(page).getByRole('button',{name:'Kansas',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('heading',{name:'Synthetic Two State Team'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Synthetic Unknown Location'})).toHaveCount(0);
 await page.getByRole('searchbox').fill('two state');
 await regions(page).getByRole('button',{name:'Missouri',exact:true}).click();
 await expect(page.getByRole('searchbox')).toHaveValue('two state');
 await expect(categories(page).getByRole('button',{name:/Employers/})).toHaveAttribute('aria-pressed','true');
 await expect(page).toHaveURL(/region=MO/);await expect(page).toHaveURL(/category=employers/);await expect(page).toHaveURL(/q=two/);
 await page.reload();await expect(regions(page).getByRole('button',{name:'Missouri',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.goto('/');await expect(regions(page).getByRole('button',{name:'Missouri',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('resources serving both states appear in both and state control works with keyboard',async({page})=>{
 await catalog(page);await page.goto('/?category=resources&region=KS');
 await expect(page.getByRole('heading',{name:'Synthetic Regional Support'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Synthetic Kansas Support'})).toBeVisible();
 const ks=regions(page).getByRole('button',{name:'Kansas',exact:true});await ks.focus();await page.keyboard.press('ArrowLeft');
 await expect(regions(page).getByRole('button',{name:'Missouri',exact:true})).toBeFocused();
 await expect(page.getByRole('heading',{name:'Synthetic Regional Support'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Synthetic Kansas Support'})).toHaveCount(0);
});
test('mobile layout fits viewport and links point to intended routes',async({page})=>{
 await page.setViewportSize({width:390,height:844});await catalog(page);await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Find your people');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await expect(page.getByRole('link',{name:/Privacy & permissions/})).toHaveAttribute('href','/privacy');
 await expect(page.getByRole('link',{name:/Get connected/}).first()).toHaveAttribute('href',/docs.google.com\/forms\/d\/e\/1FAIpQL/);
 await regions(page).getByRole('button',{name:'Kansas',exact:true}).click();
 await categories(page).getByRole('button',{name:/Resources/}).click();
 await expect(page.getByRole('heading',{name:'Synthetic Regional Support'})).toBeVisible();
});
test('catalog failures show an error without inventing listings',async({page})=>{
 await page.route('**/api/catalog',route=>route.fulfill({status:503,json:{error:'Synthetic outage'}}));await page.goto('/');
 await expect(page.getByRole('alert').filter({hasText:'temporarily unavailable'})).toContainText('temporarily unavailable');await expect(page.getByRole('button',{name:'Reload directory'})).toBeVisible();
 await expect(page.getByText('Verified opening',{exact:true})).toHaveCount(0);
});
test('unknown job has explicit unavailable state',async({page})=>{
 await catalog(page);await page.goto('/jobs/unknown-synthetic-id');await expect(page.getByRole('dialog')).toContainText('no longer available');
});
