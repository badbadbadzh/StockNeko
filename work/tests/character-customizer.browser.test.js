const {chromium}=require('C:/Users/hanso/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync('docs/index.html'))});await new Promise(r=>server.listen(0,r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://api.frankfurter.dev/**',r=>r.abort());
  await page.goto('http://localhost:'+server.address().port);assert.equal(await page.locator('#desktopPet').isVisible(),false);
  await page.fill('#playerName','衣橱玩家');await Promise.all([page.waitForNavigation(),page.click('#authForm [type=submit]')]);await page.locator('#authGate').waitFor({state:'hidden'});
  const original=await page.evaluate(()=>({cash:game.s.cash,rng:game.s.rng,positions:game.s.positions,profile:LocalProfiles.current,story:game.s.companion}));
  // The real scheduled blink must open and close, without advancing market time/RNG.
  await page.evaluate(()=>{window.petBlinks=[];new MutationObserver(()=>{window.petBlinks.push(document.getElementById('desktopPetStage').classList.contains('pet-blink'))}).observe(document.getElementById('desktopPetStage'),{attributes:true,attributeFilter:['class']});});
  await page.waitForFunction(()=>window.petBlinks.includes(true),{},{timeout:8000});await page.waitForFunction(()=>window.petBlinks.length>1&&!document.getElementById('desktopPetStage').classList.contains('pet-blink'));
  await page.click('#navPet');await page.fill('#petName','星眠');
  for(const [key,value] of Object.entries({hairStyle:'twin',hairColor:'rose',eyes:'aqua',accessory:'clip',outfit:'sailor',outfitColor:'cream'})){
   await page.click(`[data-pet-key="${key}"][data-pet-value="${value}"]`);assert.equal(await page.locator(`[data-pet-key="${key}"][data-pet-value="${value}"]`).getAttribute('aria-pressed'),'true');
  }
  assert.equal(await page.evaluate(()=>LocalProfiles.current.pet),undefined,'Draft must not write the profile');
  await page.click('#petPreviewPat');assert.ok(await page.locator('#petPreviewStage').evaluate(el=>el.classList.contains('pet-happy')));await page.waitForTimeout(1000);
  await page.click('#savePetCustomization');const saved=await page.evaluate(()=>LocalProfiles.current.pet);assert.equal(saved.name,'星眠');assert.equal(saved.hairStyle,'twin');assert.equal(saved.eyes,'aqua');assert.ok(await page.locator('#desktopPetStage .pet-art').count());
  const art=await page.locator('#desktopPetStage').innerHTML();await page.click('#navPet');await page.click('[data-pet-key="hairStyle"][data-pet-value="bob"]');await page.keyboard.press('Escape');assert.equal(await page.locator('#desktopPetStage').innerHTML(),art);assert.deepEqual(await page.evaluate(()=>LocalProfiles.current.pet),saved);
  await page.reload();await page.locator('#authGate').waitFor({state:'hidden'});assert.deepEqual(await page.evaluate(()=>LocalProfiles.current.pet),saved);
  // Drag with capture, keyboard reposition, collapse / expand, and viewport clamping.
  const handle=page.locator('#petDragHandle'),box=await handle.boundingBox();await page.mouse.move(box.x+12,box.y+12);await page.mouse.down();await page.mouse.move(box.x+112,box.y-100,{steps:6});await page.mouse.up();
  const moved=await page.evaluate(()=>LocalProfiles.current.pet.position);assert.ok(moved&&moved.x>0);await handle.focus();await page.keyboard.press('ArrowRight');assert.ok(await page.evaluate(x=>LocalProfiles.current.pet.position.x>x,moved.x));
  await page.click('#desktopPetToggle');assert.equal(await page.locator('#desktopPetStage').isVisible(),false);await page.reload();await page.locator('#authGate').waitFor({state:'hidden'});assert.ok(await page.evaluate(()=>LocalProfiles.current.pet.collapsed));await page.click('#desktopPetToggle');assert.ok(await page.locator('#desktopPetStage').isVisible());
  await page.click('#navMore');await page.click('#settingsPet');await page.uncheck('#petEnabled');await page.click('#savePetCustomization');assert.equal(await page.locator('#desktopPet').isVisible(),false);await page.click('#navPet');await page.check('#petEnabled');await page.click('#savePetCustomization');
  for(const key of ['effects','interfaceMotion']){
   await page.evaluate(k=>{LocalProfiles.update({[k]:false});Presentation.applyPreferences()},key);await page.click('#desktopPetStage');assert.equal(await page.locator('#desktopPetStage').evaluate(el=>el.classList.contains('pet-happy')||el.classList.contains('pet-blink')),false);
   await page.evaluate(k=>{LocalProfiles.update({[k]:true});Presentation.applyPreferences()},key);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.click('#desktopPetStage');assert.equal(await page.locator('#desktopPetStage').evaluate(el=>el.classList.contains('pet-happy')),false);await page.emulateMedia({reducedMotion:'no-preference'});
  // Reject malformed imported configurations before they reach SVG / CSS.
  assert.ok(await page.evaluate(()=>{try{LocalProfiles.update({pet:{hairColor:'<script>bad</script>'}});return false}catch{return true}}));
  await page.click('#navPet');await page.screenshot({path:'outputs/pet-editor-desktop.png'});
  for(const width of [1024,768,390]){
   await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+width);assert.ok(await page.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'modal overflow '+width);
  }
  await page.evaluate(()=>{LocalProfiles.update({fontScale:1.3});Presentation.applyPreferences()});assert.ok(await page.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'large type overflow');await page.screenshot({path:'outputs/pet-editor-mobile.png'});
  await page.keyboard.press('Escape');const dock=await page.locator('#desktopPet').boundingBox();assert.ok(dock.x>=0&&dock.y>=0&&dock.x+dock.width<=391&&dock.y+dock.height<=845);
  const after=await page.evaluate(()=>({cash:game.s.cash,rng:game.s.rng,positions:game.s.positions,story:game.s.companion}));for(const k of Object.keys(after))assert.deepEqual(after[k],original[k],k+' changed during customization');
  // A second local player receives the original appearance, without overwriting the first.
  await page.evaluate(()=>{const p=LocalProfiles.create('另一位玩家');LocalProfiles.select(p.id,true)});await page.reload();await page.waitForFunction(()=>typeof CharacterCustomizer!=='undefined');assert.equal(await page.evaluate(()=>CharacterCustomizer.state().hairColor),'ink');assert.equal(await page.evaluate(()=>LocalProfiles.list().find(p=>p.name==='衣橱玩家').pet.hairColor),'rose');
  assert.deepEqual(errors,[]);console.log('PASS natural blinking, pat, preview/cancel/save/reload, drag, collapse, hide, preferences/reduced motion, profile isolation, unmodified game assets, mobile/large text');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
