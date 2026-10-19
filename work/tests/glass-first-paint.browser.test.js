const {chromium}=require('C:/Users/hanso/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync('docs/index.html'))});await new Promise(r=>server.listen(0,r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const url='http://localhost:'+server.address().port;
  const before=await browser.newPage({javaScriptEnabled:false,viewport:{width:1440,height:1000}});
  await before.goto(url);
  const appearance=page=>page.locator('#authGate').evaluate(el=>({background:getComputedStyle(el).background,theme:document.body.classList.contains('terminal'),scenery:document.querySelectorAll('.liquid-environment').length}));
  const first=await appearance(before);assert.equal(first.theme,true);assert.equal(first.scenery,2);assert.ok(!first.background.includes('rgb(8, 14, 11)'));
  await before.screenshot({path:'outputs/glass-first-paint.png'});
  const after=await browser.newPage({viewport:{width:1440,height:1000}});await after.goto(url);await after.waitForFunction(()=>typeof LiquidGlass!=='undefined');
  assert.deepEqual(await appearance(after),first,'Background must not depend on JavaScript or duplicate scenery');
  console.log('PASS glass title with JavaScript disabled; identical initialized background; no duplicate scenery');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
