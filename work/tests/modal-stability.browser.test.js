const {chromium}=require('C:/Users/hanso/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync('docs/index.html'))});await new Promise(r=>server.listen(0,r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:'+server.address().port);await page.fill('#playerName','弹窗测试');await Promise.all([page.waitForNavigation(),page.click('#authForm [type=submit]')]);await page.locator('#authGate').waitFor({state:'hidden'});
  for(const reduced of [false,true]){
   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   for(const id of ['navMore','navRules','navMore','navReview']){
    await page.evaluate(()=>{window.modalAnimations=[];document.getElementById('modal').addEventListener('animationstart',e=>window.modalAnimations.push(e.animationName));});
    await page.click('#'+id);
    const samples=await page.evaluate(()=>new Promise(resolve=>{const rows=[],start=performance.now();function frame(){const el=document.getElementById('modal'),s=getComputedStyle(el),r=el.getBoundingClientRect();rows.push({open:el.open,opacity:s.opacity,animation:s.animationName,x:r.x,y:r.y,w:r.width,h:r.height,backdrop:getComputedStyle(el,'::backdrop').backdropFilter});if(performance.now()-start<850)requestAnimationFrame(frame);else resolve(rows);}frame();}));
    assert.ok(samples.length>5);assert.ok(samples.every(s=>s.open&&s.opacity==='1'&&s.animation==='none'&&s.backdrop==='none'),id+' must stay visible with no full-screen blur');
    for(const key of ['x','y','w','h'])assert.ok(Math.max(...samples.map(s=>s[key]))-Math.min(...samples.map(s=>s[key]))<1,id+' unstable '+key);
    const animations=await page.evaluate(()=>window.modalAnimations);assert.ok(!animations.includes('window-in'),'legacy animation restarted');if(reduced)assert.equal(animations.length,0);
    await page.click('#modalClose');await page.waitForFunction(()=>!document.getElementById('modal').open);
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS repeated settings/rules/review: stable opacity and geometry every frame, no legacy replay/full-screen blur, reduced motion, close and reopen');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
