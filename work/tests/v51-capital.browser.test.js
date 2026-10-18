const { chromium } = require('C:/Users/hanso/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http');

(async () => {
  const server = http.createServer((q, r) => {
    r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    r.end(fs.readFileSync('outputs/拟股喵喵-A股生存手记.html'));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const page = await browser.newPage({ viewport:{width:1500,height:1060} }), errors=[];
    page.on('pageerror', e => errors.push(e.message));
    page.setDefaultTimeout(10000);
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.fill('#playerName','夜航玩家');
    await Promise.all([page.waitForNavigation(),page.click('#authForm [type=submit]')]);
    await page.waitForFunction(()=>typeof CapitalHorror!=='undefined');
    await page.locator('#authGate').waitFor({state:'hidden'});
    await page.waitForTimeout(700);
    await page.screenshot({path:'work/v51-terminal.png',fullPage:true});
    const qtyButton=await page.locator('#qtyPlus').boundingBox();
    await page.mouse.move(qtyButton.x+qtyButton.width/2,qtyButton.y+qtyButton.height/2);
    await page.mouse.down();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#qtyPlus').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42),3,'quantity control should press down');
    await page.mouse.up();
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);
    assert.equal(await page.evaluate(()=>CapitalHorror.audio),null);

    // ¥ 2,999.99 must not trigger; the engine uses integer cents.
    await page.evaluate(()=>{game.s.cash=game.s.initialCash-299999;render();save();});
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);
    assert.equal(await page.evaluate(()=>game.s.capitalHorror.reached),0);
    const snapshot=await page.evaluate(()=>{
      game.s.cash=game.s.initialCash-300000;
      const {capitalHorror,...s}=game.s;
      return JSON.stringify(s);
    });
    await page.evaluate(()=>{toggleAuto();render();save();});
    await page.locator('#capitalAlert[open]').waitFor();
    assert.equal(await page.evaluate(()=>autoTimer),null);
    assert.equal(await page.locator('#capitalAlertLoss').innerText(),'− ¥ 3,000.00');
    assert.match(await page.locator('#capitalAlertTitle').innerText(),/生活费/);
    assert.equal(await page.evaluate(()=>{const {capitalHorror,...s}=game.s;return JSON.stringify(s);}),snapshot);
    assert.equal(await page.evaluate(()=>game.s.capitalHorror.reached),1);
    const tick=await page.evaluate(()=>game.s.tick);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>game.s.tick),tick,'shortcuts must not trade behind jumpscare');
    await page.waitForTimeout(950);
    await page.screenshot({path:'work/v51-jumpscare.png'});
    await page.keyboard.press('Escape');
    await page.locator('#capitalAlert').waitFor({state:'hidden'});
    await page.evaluate(()=>{for(let i=0;i<5;i++)render();game.s.cash=game.s.initialCash;render();game.s.cash-=350000;render();save();});
    assert.equal(await page.locator('#capitalAlert').isVisible(),false,'same tier cannot repeat after recovery');
    await page.evaluate(()=>LocalVault.flush());
    await page.reload();
    await page.waitForFunction(()=>typeof CapitalHorror!=='undefined');
    assert.equal(await page.locator('#capitalAlert').isVisible(),false,'refresh cannot re-trigger');
    assert.equal(await page.evaluate(()=>game.s.capitalHorror.reached),1);

    // Disabled events are consumed, so re-enabling does not ambush the player.
    await page.click('#navMore');
    await page.uncheck('#fxJumpscare');
    await page.click('#applyTerminalSettings');
    await page.evaluate(()=>{game.s.cash=game.s.initialCash-800000;save();render();});
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);
    assert.equal(await page.evaluate(()=>game.s.capitalHorror.reached),2);
    await page.click('#navMore');
    assert.equal(await page.locator('#fxJumpscare').isChecked(),false);
    await page.check('#fxJumpscare');
    await page.click('#applyTerminalSettings');
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);

    // Confirmation dialogs finish first. Then one event, no backlog of earlier tiers.
    await page.click('#navRules');
    await page.evaluate(()=>{game.s.cash=game.s.initialCash-1500000;save();render();});
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);
    await page.click('#modalClose');
    await page.locator('#capitalAlert[open]').waitFor();
    assert.equal(await page.locator('#capitalAlertTier').innerText(),'03 / 收割');
    await page.click('#disableCapitalAlert');
    assert.equal(await page.evaluate(()=>LocalProfiles.current.jumpscare),false);
    await page.evaluate(()=>{game.s.cash=game.s.initialCash-3000000;render();save();});
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);

    // Full account state must be byte-identical before and after a preview.
    await page.click('#navMore');
    await page.check('#fxJumpscare');
    await page.uncheck('#fxMotion');
    await page.click('#applyTerminalSettings');
    await page.click('#navMore');
    const before=await page.evaluate(()=>JSON.stringify(game.s));
    await page.click('#previewCapital');
    await page.locator('#capitalAlert[open]').waitFor();
    assert.equal(await page.evaluate(()=>JSON.stringify(game.s)),before);
    assert.equal(await page.locator('#capitalAlert').evaluate(e=>e.classList.contains('capital-still')),true);
    assert.equal(await page.evaluate(()=>CapitalHorror.audio),null);
    await page.waitForTimeout(5250);
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);
    assert.equal(await page.evaluate(()=>JSON.stringify(game.s)),before);
    assert.equal(await page.evaluate(()=>autoTimer),null);
    await page.click('#navMore');
    await page.check('#fxMotion');
    await page.click('#applyTerminalSettings');

    // Preview honors reduced motion, and actions stay visible with large text on mobile.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.click('#navMore');
    await page.click('#previewCapital');
    assert.equal(await page.locator('#capitalAlert').evaluate(e=>e.classList.contains('capital-still')),true);
    await page.keyboard.press('Escape');
    await page.emulateMedia({reducedMotion:'no-preference'});
    // Sound uses an explicit opt-in, and is cut off when the scene is dismissed.
    await page.click('#navMore');
    await page.check('#fxSound');
    await page.click('#previewCapital');
    await page.locator('#capitalAlert[open]').waitFor();
    await page.waitForFunction(()=>document.getElementById('capitalAlert').dataset.phase==='impact');
    assert.equal(await page.evaluate(()=>CapitalHorror.audio.state),'running');
    await page.waitForTimeout(80);
    assert.ok(await page.evaluate(()=>CapitalHorror.hitGain.gain.value>0));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(()=>CapitalHorror.hitGain===null&&CapitalHorror.hitTones.length===0),'dismiss must disconnect the sound');
    assert.equal(await page.evaluate(()=>LocalProfiles.current.ambienceSound===true),false,'preview does not save preferences');
    await page.click('#navMore');
    await page.selectOption('#textScale','1.3');
    await page.click('#applyTerminalSettings');
    await page.setViewportSize({width:390,height:844});
    await page.click('#navMore');
    await page.click('#previewCapital');
    await page.waitForTimeout(900);
    const mobile=await page.locator('#dismissCapitalAlert').boundingBox();
    assert.ok(mobile.x>=0&&mobile.x+mobile.width<=390&&mobile.y+mobile.height<=844);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.ok(await page.locator('#capitalAlertLoss').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'loss amount must fit the receipt');
    await page.screenshot({path:'work/v51-jumpscare-mobile.png'});
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:1500,height:1060});
    await page.click('#capitalLetter');
    assert.match(await page.locator('#modalTitle').innerText(),/资本来函/);
    await page.click('#letterSettings');
    assert.equal(await page.locator('#fxJumpscare').isChecked(),true);
    await page.click('#modalClose');
    await page.click('#navMore');
    await page.selectOption('#textScale','1');
    await page.uncheck('#fxMaster');
    await page.click('#applyTerminalSettings');
    assert.equal(await page.locator('#roomEffects').isVisible(),false);
    await page.click('#navMore');
    assert.equal(await page.locator('#previewCapital').isDisabled(),true);
    assert.equal(await page.locator('#fxJumpscare').isDisabled(),true);
    await page.click('#modalClose');

    // New save owns independent milestones, old saves migrate without an opening scare.
    await page.evaluate(()=>{
      game=new StockGame(12345);
      render();
      if(game.s.capitalHorror.reached!==0)throw Error('new game inherited milestones');
      const old=new StockGame(12);old.s.cash-=1600000;delete old.s.capitalHorror;
      game=StockGame.restore(old.s);render();
      if(game.s.capitalHorror.reached!==3)throw Error('legacy baseline incorrect');
      const bad=structuredClone(game.s);bad.capitalHorror.reached=1000;
      let rejected=false;try{StockGame.restore(bad);}catch{rejected=true;}
      if(!rejected)throw Error('malformed milestone accepted');
    });
    assert.equal(await page.locator('#capitalAlert').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('PASS cents threshold, one event per tier, refresh/recovery, toggles, modal queue, auto pause, shortcuts, preview isolation, reduced motion, mobile, legacy and save validation');
  } finally {
    await browser?.close();
    await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
