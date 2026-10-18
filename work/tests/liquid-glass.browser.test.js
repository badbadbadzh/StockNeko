const {chromium}=require('C:/Users/hanso/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync('docs/index.html'))});await new Promise(r=>server.listen(0,r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:'+server.address().port);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'outputs/liquid-title.png'});
 await page.fill('#playerName','流体玻璃');await Promise.all([page.waitForNavigation(),page.click('#authForm [type=submit]')]);await page.locator('#authGate').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);
 const button=page.locator('#qtyPlus');await button.scrollIntoViewIfNeeded();const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);const before=Number(await page.inputValue('#qtyInput'));
 await page.mouse.down();assert.ok(await button.evaluate(el=>el.classList.contains('liquid-press')));await page.mouse.up();assert.equal(Number(await page.inputValue('#qtyInput')),before+100);assert.ok(await button.evaluate(el=>el.classList.contains('liquid-spring')));await page.waitForTimeout(650);assert.equal(await button.evaluate(el=>el.classList.contains('liquid-spring')),false);
 await button.focus();await page.keyboard.press('Enter');assert.equal(Number(await page.inputValue('#qtyInput')),before+200);await page.waitForTimeout(650);
 await button.dispatchEvent('pointerdown',{pointerId:99,button:0});await button.dispatchEvent('pointercancel',{pointerId:99});assert.equal(await button.evaluate(el=>el.classList.contains('liquid-press')),false);
 await page.click('#navMore');assert.ok(await page.locator('#modal').evaluate(el=>el.classList.contains('liquid-pop')));await page.waitForTimeout(550);await page.screenshot({path:'outputs/liquid-settings.png'});await page.click('#modalClose');
 await page.evaluate(()=>{LocalProfiles.update({effects:false});Presentation.applyPreferences()});await button.click();assert.equal(await button.evaluate(el=>el.classList.contains('liquid-spring')),false);
 await page.evaluate(()=>{LocalProfiles.update({effects:true});Presentation.applyPreferences()});await page.emulateMedia({reducedMotion:'reduce'});await button.click();assert.equal(await button.evaluate(el=>el.classList.contains('liquid-spring')),false);await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'outputs/liquid-market.png',fullPage:true});
 for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width)}
 await page.setViewportSize({width:390,height:844});await page.click('#navStart');await page.screenshot({path:'outputs/liquid-mobile.png'});assert.deepEqual(errors,[]);
 console.log('PASS press/release, one action per click, keyboard, pointer cancel, modal, effects off, reduced motion, four widths, no JS errors');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
