const {chromium}=require('C:/Users/hanso/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');

(async()=>{
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync('docs/index.html'))});
 await new Promise(resolve=>server.listen(0,resolve));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const date=offset=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
  const rates={CNY:1,USD:7.1,EUR:8.2,JPY:.05,GBP:9.4,HKD:.91,AUD:4.7,CAD:5.2,CHF:8.8,SGD:5.5};
  const points=[[-10,7.3],[-7,7],[-6,7.2],[-1,7.1]].map(([day,usd])=>({date:date(day),rates:{...rates,USD:usd}}));
  const header=()=>({source:'Frankfurter',kind:'daily',fetchedAt:new Date().toISOString(),cached:false,stale:false});
  const requested=[];
  await page.route('**/api/fx/**',route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith('history')){
    const days=Number(url.searchParams.get('days'));requested.push(days);
    if(days===365)return route.fulfill({status:503,json:{ok:false}});
    const selected=days===7?points.slice(-2):days===90?points.slice(-1):points;
    return route.fulfill({json:{ok:true,data:{...header(),points:selected}}});
   }
   return route.fulfill({json:{ok:true,data:{...header(),date:date(-1),rates}}});
  });
  await page.route('https://api.frankfurter.dev/**',route=>route.request().url().includes('/latest')?route.fulfill({json:{base:'CNY',amount:1,date:date(-1),rates:Object.fromEntries(Object.entries(rates).filter(([code])=>code!=='CNY').map(([code,value])=>[code,1/value]))}}):route.abort());
  await page.goto('http://localhost:'+server.address().port);
  await page.fill('#playerName','汇率图表验收');
  await Promise.all([page.waitForNavigation(),page.click('#authForm [type=submit]')]);
  await page.locator('#authGate').waitFor({state:'hidden'});
  await page.waitForFunction(()=>typeof FXMarket!=='undefined'&&FXMarket.ready);
  await page.click('#navForex');await page.selectOption('#fxQuoteMode','daily');
  await page.waitForFunction(()=>FXChartView.model?.points.length===4&&!FXDailyMode.historyBusy);
  const account=await page.evaluate(()=>({cash:game.s.cash,equity:game.equity,rate:FXMarket.rate()}));
  const plotted=await page.locator('.fx-price-line').getAttribute('points');
  const coords=plotted.split(' ').map(point=>point.split(',').map(Number));
  assert.equal(coords.length,4,'only the four actual publications are plotted');
  assert.deepEqual(await page.evaluate(()=>FXChartView.model.points.map(p=>({date:p.date,value:p.value}))),points.map(p=>({date:p.date,value:1/p.rates.USD})));
  assert.ok(Math.abs((coords[1][0]-coords[0][0])/(coords[2][0]-coords[1][0])-3)<.003,'calendar gaps retain proportional width');
  assert.match(await page.locator('#fxSampleCount').textContent(),/^4 天$/);
  assert.ok(Math.abs(Number(await page.locator('#fxRangeLow').textContent())-1/7.3)<.00001);
  assert.ok(Math.abs(Number(await page.locator('#fxRangeHigh').textContent())-1/7)<.00001);
  assert.equal(await page.locator('#fxChart rect').count(),0,'daily data is not turned into artificial candles');
  // Repainting an unchanged quote does not replace chart nodes or lose a pointer selection.
  await page.evaluate(()=>window.retainedLine=document.querySelector('.fx-price-line'));
  await page.evaluate(()=>{FXMarket.paint();FXMarket.paint()});
  assert.equal(await page.evaluate(()=>window.retainedLine===document.querySelector('.fx-price-line')),true);
  await page.locator('#fxChart').scrollIntoViewIfNeeded();
  let box=await page.locator('#fxChart').boundingBox();
  const model=await page.evaluate(()=>({width:FXChartView.model.width,height:FXChartView.model.height}));
  await page.mouse.move(box.x+coords[1][0]/model.width*box.width,box.y+coords[1][1]/model.height*box.height);
  assert.equal(await page.locator('#fxTooltipDate').textContent(),points[1].date);
  assert.match(await page.locator('#fxTooltipRate').textContent(),/1 CNY = 0\.14286 USD/);
  await page.locator('#fxChart').focus();await page.keyboard.press('Home');
  assert.equal(await page.locator('#fxTooltipDate').textContent(),points[0].date);
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#fxTooltipDate').textContent(),points[1].date);
  await page.keyboard.press('End');assert.equal(await page.locator('#fxTooltipDate').textContent(),points.at(-1).date);
  assert.match(await page.locator('#fxChartAnnouncement').textContent(),/1 CNY =/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#fxChartTooltip').isVisible(),false);
  await page.touchscreen.tap(box.x+coords[2][0]/model.width*box.width,box.y+coords[2][1]/model.height*box.height);
  assert.equal(await page.locator('#fxTooltipDate').textContent(),points[2].date);
  await page.click('[data-fx-range="7"]');await page.waitForFunction(()=>game.s.fx.real.history.days===7&&!FXDailyMode.historyBusy);
  assert.equal(await page.locator('[data-fx-range="7"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#fxSampleCount').textContent(),'2 天');
  assert.deepEqual(await page.evaluate(()=>({cash:game.s.cash,equity:game.equity,rate:FXMarket.rate()})),account,'viewing another interval must not trade or reprice the latest quote');
  assert.ok(requested.includes(7));
  await page.click('[data-fx-range="90"]');await page.waitForFunction(()=>game.s.fx.real.history.days===90&&!FXDailyMode.historyBusy);
  assert.equal(await page.locator('.fx-price-line').count(),0,'one published point cannot become an invented line');
  assert.equal(await page.locator('.fx-last-dot').count(),1);assert.equal(await page.locator('#fxPeriodDelta').textContent(),'—');
  await page.click('[data-fx-range="365"]');await page.waitForFunction(()=>!FXDailyMode.historyBusy&&!!FXDailyMode.historyError);
  assert.equal(await page.locator('.fx-price-line').count(),0);assert.equal(await page.locator('.fx-chart-empty').count(),1);
  assert.equal(await page.locator('#fxSampleCount').textContent(),'—');
  await page.click('[data-fx-range="30"]');await page.waitForFunction(()=>FXChartView.model?.points.length===4&&!FXDailyMode.historyBusy);
  // Currency cross with constant observations is legitimately flat and finite.
  await page.selectOption('#fxTo','EUR');assert.equal(await page.locator('#fxPeriodDelta').textContent(),'0.00%');
  assert.ok(!(await page.locator('.fx-price-line').getAttribute('points')).match(/NaN|Infinity/));
  await page.selectOption('#fxTo','USD');
  await page.screenshot({path:'outputs/fx-polish-qa-desktop.png',fullPage:true});
  for(const width of [768,390]){
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(()=>Math.abs(FXChartView.model.width-document.querySelector('#fxPlotWrap').getBoundingClientRect().width)<2);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow at '+width);
  }
  await page.evaluate(()=>{document.body.classList.add('large-type');document.documentElement.style.setProperty('--text-scale','1.3')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'130% text has no horizontal overflow');
  await page.screenshot({path:'outputs/fx-polish-qa-mobile.png',fullPage:true});
  for(const cls of ['effects-off','motion-off','no-animations']){
   await page.evaluate(cls=>{document.body.classList.add(cls);FXChartView.cache=null;FXMarket.draw()},cls);
   assert.equal(await page.locator('#fxChart').evaluate(node=>node.classList.contains('fx-chart-enter')),false);
   assert.equal(await page.locator('.fx-price-line').evaluate(node=>getComputedStyle(node).animationName),'none');
   await page.evaluate(cls=>document.body.classList.remove(cls),cls);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{FXChartView.cache=null;FXMarket.draw()});
  assert.equal(await page.locator('#fxChart').evaluate(node=>node.classList.contains('fx-chart-enter')),false);
  await page.selectOption('#fxQuoteMode','simulation');await page.waitForFunction(()=>!FXDailyMode.active());
  for(const id of ['fxDailySummary','fxDailyStats','fxPeriods'])assert.equal(await page.locator('#'+id).isVisible(),false,id+' hidden in simulation');
  assert.equal(await page.locator('#fxChart').getAttribute('viewBox'),'0 0 640 260');
  assert.equal(await page.locator('#fxNext').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS exact samples/calendar spacing, chart metrics, cached DOM, mouse/keyboard/touch inspection, periods, one/flat/missing data, mobile/text sizing, motion preferences, simulation switching');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
