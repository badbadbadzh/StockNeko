const {chromium}=require('C:/Users/hanso/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),StockGame=require('./engine');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(data=>{if(!sessionStorage.getItem('test-seeded')){localStorage.setItem('stock-girl-save-v1',data);sessionStorage.setItem('test-seeded','1');}},JSON.stringify({game:new StockGame(42).s,selected:0}));
 await page.goto('http://127.0.0.1:8765');await page.locator('.stock-row').last().waitFor();await page.screenshot({path:path.join(__dirname,'desktop-initial.png'),fullPage:true});
 assert.equal(await page.locator('.stock-row').count(),8);assert.equal(await page.locator('#totalAsset').innerText(),'¥ 100,000.00');
 await page.click('#submitOrder');assert.equal(await page.locator('#positionCount').innerText(),'1');assert.match(await page.locator('#holdContent').innerText(),/T\+1/);
 const firstCash=await page.locator('#freeCash').innerText();await page.click('#sellTab');await page.click('#submitOrder');assert.match(await page.locator('#toasts').innerText(),/T\+1/);assert.equal(await page.locator('#freeCash').innerText(),firstCash);
 await page.reload();assert.equal(await page.locator('#freeCash').innerText(),firstCash);assert.equal(await page.locator('#positionCount').innerText(),'1');
 await page.click('#closeBtn');await page.click('[data-modal="closeDay"]');assert.equal(await page.locator('#clock').innerText(),'15:00');await page.click('[data-modal="next"]');assert.match(await page.locator('#dayChip').innerText(),/02/);assert.match(await page.locator('#holdContent').innerText(),/可卖 100/);
 await page.click('#sellTab');await page.click('#submitOrder');assert.equal(await page.locator('#positionCount').innerText(),'0');
 await page.click('#buyTab');await page.selectOption('#orderMode','limit');const down=await page.evaluate(()=>JSON.parse(localStorage.getItem('stock-girl-save-v1')).game.stocks[0].prev);await page.fill('#priceInput',(Math.round(down*.9)/100).toFixed(2));await page.click('#submitOrder');assert.equal(await page.locator('#orderCount').innerText(),'1');assert.match(await page.locator('#holdContent').innerText(),/待成交/);await page.click('[data-cancel]');assert.equal(await page.locator('#orderCount').innerText(),'0');assert.match(await page.locator('#frozenCash').innerText(),/0.00/);
 await page.click('[data-stock="5"]');assert.equal(await page.locator('#stockName').innerText(),'云川汽车');await page.click('[data-chart="intraday"]');await page.click('#stepBtn');assert.equal(await page.locator('#clock').innerText(),'09:35');
 await page.click('#autoBtn');await page.waitForTimeout(2800);await page.click('#autoBtn');assert.equal(await page.locator('#clock').innerText(),'09:40');
 await page.click('#navReview');assert.match(await page.locator('#modalTitle').innerText(),/复盘/);await page.click('#modalClose');await page.click('#navRules');assert.match(await page.locator('#modalBody').innerText(),/T\+1/);await page.click('#modalClose');
 const downloadPromise=page.waitForEvent('download');await page.click('#saveMenu');await page.click('[data-modal="export"]');const download=await downloadPromise;await download.saveAs(path.join(__dirname,'test-save.json'));assert.ok(JSON.parse(fs.readFileSync(path.join(__dirname,'test-save.json'))).game);await page.click('#modalClose');
 // Restore through the actual file chooser path.
 await page.click('#stepBtn');page.once('dialog',d=>d.accept());await page.setInputFiles('#importFile',path.join(__dirname,'test-save.json'));await page.waitForFunction(()=>document.getElementById('clock').textContent==='09:40');
 // Complete the remaining 19 days through visible controls.
 for(let d=2;d<=20;d++){await page.click('#closeBtn');await page.click('[data-modal="closeDay"]');if(d<20)await page.click('[data-modal="next"]');}
 assert.match(await page.locator('#modalTitle').innerText(),/终章/);await page.click('#modalClose');assert.equal(await page.locator('#stepBtn').isDisabled(),true);assert.equal(await page.locator('#submitOrder').isDisabled(),true);
 // Fresh screenshots and responsive layout checks.
 await page.click('#saveMenu');await page.click('[data-modal="reset"]');await page.click('[data-modal="confirmReset"]');await page.locator('.toast').last().waitFor({state:'hidden'});await page.screenshot({path:path.join(__dirname,'desktop-final.png'),fullPage:true});
 const desktop=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,watch:document.querySelector('.watch').getBoundingClientRect().bottom,last:document.querySelector('.stock-row:last-child').getBoundingClientRect().bottom}));console.log('Desktop geometry',desktop);
 assert.ok(desktop.scroll<=desktop.width,'Desktop has horizontal overflow');assert.ok(desktop.last<=desktop.watch+1,'Last stock is clipped');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(__dirname,'mobile-final.png'),fullPage:true});const mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(mobile.scroll<=mobile.width,'Mobile has horizontal overflow');
 await page.locator('#submitOrder').scrollIntoViewIfNeeded();await page.click('#submitOrder');assert.equal(await page.locator('#positionCount').innerText(),'1');await page.click('#navRules');await page.click('[data-modal="saves"]');assert.match(await page.locator('#modalTitle').innerText(),/存档/);await page.click('#modalClose');
 assert.deepEqual(errors,[]);console.log('Browser checks passed: buy, T+1, sell, orders, cancel, reload, export/import, charts, auto, 20-day ending, desktop/mobile.');
 // Verify file:// has no external dependency and can make a trade.
 const offline=await browser.newContext({viewport:{width:1280,height:900},offline:true});const fp=await offline.newPage();fp.on('pageerror',e=>errors.push(e.message));await fp.goto('file:///'+path.join(__dirname,'../outputs/拟股喵喵-A股生存手记.html').replaceAll('\\','/'));await fp.click('#submitOrder');assert.equal(await fp.locator('#positionCount').innerText(),'1');assert.deepEqual(errors,[]);console.log('Offline single-file play passed.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
