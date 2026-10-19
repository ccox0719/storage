const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROME_CHANNEL?{channel:process.env.PLAYWRIGHT_CHROME_CHANNEL}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Isolated household fixture; all cloud reads/writes stay in this browser.
 await page.route('**/supabase.min.js',route=>route.fulfill({contentType:'text/javascript',body:`
 window.testRows=[];
 window.testFail=false;
 window.supabase={createClient:()=>({auth:{onAuthStateChange:fn=>{window.authChange=fn},getSession:async()=>({data:{session:{user:{id:'test-user'}}}})},from(table){
 let filters=[];let write=null;let ignore=false;
 const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},like(k,v){filters.push(r=>String(r[k]).startsWith(v.slice(0,-1)));return q},limit(){return q},upsert(rows,opts){write=Array.isArray(rows)?rows:[rows];ignore=opts.ignoreDuplicates;return q},then(resolve,reject){return Promise.resolve().then(()=>{
 if(table==='household_members')return {data:[{household_id:'test-house'}]};
 if(table==='home_locations')return {count:1,data:[]};
 if(write){if(window.testFail)return {error:{message:'Fixture save failed'}}; for(const row of write){const i=window.testRows.findIndex(r=>r.external_id===row.external_id);if(i<0)window.testRows.push(row);else if(!ignore)window.testRows[i]=row;}return {error:null};}
 return {data:table==='home_tasks'?window.testRows.filter(r=>filters.every(fn=>fn(r))):[],error:null};
 }).then(resolve,reject)} };return q;
 }})};` }));
 await page.goto('http://localhost:8766');
 await page.locator('[data-tab="systems"]').click();
 await page.locator('[data-toggle-system="lighting"]').click();
 await page.locator('.lutron-reference > summary').click();
 await page.getByText('Documented · physically unverified',{exact:true}).waitFor();
 await page.locator('[data-lutron-search]').fill('CONNECT-BDG2-1');
 assert.equal(await page.locator('.lutron-entry:visible').count(),1);
 assert.ok(await page.locator('.lutron-entry:visible').innerText().then(s=>s.includes('Installation p. 75')));
 await page.locator('[data-lutron-search]').fill('movie scenes');
 assert.equal(await page.locator('.lutron-keypads > details:visible').count(),1);
 await page.locator('.lutron-keypads > details:visible > summary').click();
 await page.locator('.lutron-keypads > details:visible > details').last().locator('summary').click();
 assert.ok((await page.locator('.lutron-keypads > details:visible').innerText()).includes('Fan Speed (High)'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/tmp/lutron-mobile.png',fullPage:true});
 await page.locator('[data-lutron-search]').fill('not a real device');
 await page.getByText('0 matching equipment / controller records',{exact:true}).waitFor();
 await page.locator('[data-lutron-search]').fill('');
 await page.setViewportSize({width:1280,height:900});
 assert.equal(await page.locator('.lutron-entry').count(),110);
 await page.locator('[data-toggle-system="pool"]').click();
 assert.equal(await page.locator('#system-pool .system-body').isVisible(),true);
 await page.locator('[data-edit-system-profile="lighting"]').click();
 await page.locator('#f-manufacturer').fill('Existing household value');
 await page.locator('#formSave').click();
 assert.ok((await page.locator('#system-lighting .system-equipment').innerText()).includes('Existing household value'));
 assert.equal(await page.locator('.lutron-reference').count(),1);
 await page.locator('[data-tab="storage"]').click();
 assert.equal(await page.locator('#view-storage').isVisible(),true);
 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('Lutron mobile search, layout, desktop, equipment editing, other systems and storage passed.');
})().catch(e=>{console.error(e);process.exit(1)});
