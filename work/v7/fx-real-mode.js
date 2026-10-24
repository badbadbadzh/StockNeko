'use strict';
// Adds real reference-rate practice without replacing the existing random market.
const FXDailyMode={
 historyDays:30,error:'',historyError:'',request:0,historyRequest:0,
 active(){return game.s.fx?.quoteMode==='daily'},
 snapshot(){return game.s.fx?.real?.snapshot},
 sync(){FXMarket.ready=FXRateService.valid(this.snapshot());if(FXMarket.ready){FXMarket.rates=this.snapshot().rates;FXMarket.updated=this.snapshot().date;FXMarket.cached=this.snapshot().cached===true}},
 async refresh(force=false){
  if(!this.active())return;const state=game.s.fx,request=++this.request;FXMarket.loading=true;this.error='';FXMarket.paint();
  try{const snapshot=await FXRateService.get(0,force);if(state!==game.s.fx||request!==this.request||!this.active())return;state.real.snapshot=snapshot;this.sync();save();render()}
  catch(e){if(state===game.s.fx&&request===this.request)this.error=e.message}
  finally{if(state===game.s.fx&&request===this.request){FXMarket.loading=false;this.sync();FXMarket.paint()}}
 },
 async history(force=false){
  if(!this.active())return;const state=game.s.fx,request=++this.historyRequest,days=this.historyDays;this.historyError='';this.historyBusy=true;
  try{const data=await FXRateService.get(days,force);if(state!==game.s.fx||request!==this.historyRequest||!this.active())return;state.real.history={...data,days};save()}
  catch(e){if(state===game.s.fx&&request===this.historyRequest)this.historyError=e.message}
  finally{if(state===game.s.fx&&request===this.historyRequest){this.historyBusy=false;FXMarket.paint()}}
 },
 async switchMode(mode){
  if(!['daily','simulation'].includes(mode)||mode===(game.s.fx.quoteMode||'simulation'))return;
  // Avoid converting gains made at arbitrary simulated prices into real-reference balances.
  if(Object.entries(FXMarket.wallet).some(([c,v])=>c!=='CNY'&&v>0)){$('fxQuoteMode').value=game.s.fx.quoteMode;toast('请先将外币兑换回人民币，再切换行情模式。现有持仓与记录已保留。',true);return;}
  ++this.request;++this.historyRequest;FXMarket.loading=false;this.historyBusy=false;this.error='';this.historyError='';game.s.fx.quoteMode=mode;
  FXMarket.load();this.controls();save();render();
  if(mode==='daily'){await Promise.allSettled([this.refresh(true),this.history()])}else await FXMarket.ensureRates();
 },
 controls(){
  if(!$('fxQuoteMode'))return;const daily=this.active();$('fxQuoteMode').value=daily?'daily':'simulation';
  for(const id of ['fxPlay','fxNext','fxChartStyle','fxChartWindow'])$(id).hidden=daily;
  $('fxHistoryWindow').hidden=!daily;$('fxRetry').textContent=daily?'刷新汇率':'重试获取';
  $('fxModeNote').textContent=daily?'真实日汇率 · 虚拟资金练习 · 不提供盘中价格':'随机模拟行情 · 真实日汇率仅作为起点';
  document.querySelector('#forexPage .chapter p').textContent='现货兑换 · 仅使用虚拟资金 · 切换行情前请先将外币换回人民币';
 },
 draw(){
  this.controls();$('fxChartPair').textContent=FXMarket.from+' / '+FXMarket.to;$('fxChart').setAttribute('aria-label','Frankfurter 真实历史日汇率折线图');
  const snapshot=this.snapshot(),history=game.s.fx.real.history,validHistory=FXRateService.valid(history,true)&&history.days===this.historyDays;
  const points=validHistory?history.points.map(p=>({date:p.date,value:p.rates[FXMarket.from]/p.rates[FXMarket.to]})):[];
  $('fxChartPrice').textContent=FXMarket.ready?FXMarket.fmt(FXMarket.rate()):'—';
  $('fxChartSource').textContent=points.length?`Frankfurter · 历史日汇率（非 K 线） · ${points[0].date} — ${points.at(-1).date}${history.cached?' · 缓存':''}${history.stale?' · 历史缓存已过期':''}`:(this.historyBusy?'正在读取真实历史汇率…':this.historyError||'暂无历史数据，未生成模拟图。');
  if(points.length<2){$('fxChart').innerHTML='<text x="320" y="140" text-anchor="middle" fill="currentColor">'+(this.historyBusy?'正在读取真实历史…':points.length?'该区间只有一个发布日':'暂无可用历史数据')+'</text>';return;}
  const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.15,max*.0005),low=min-pad,high=max+pad;
  const x=i=>12+548*i/(points.length-1),y=v=>18+(high-v)/(high-low)*212;let svg='';
  for(let i=0;i<5;i++){const v=low+(high-low)*i/4,yy=y(v);svg+=`<path d="M12 ${yy}H560" stroke="currentColor" opacity=".12"/><text x="568" y="${yy+4}" font-size="11" fill="currentColor">${v.toFixed(v<1?5:3)}</text>`;}
  svg+=`<polyline points="${points.map((p,i)=>x(i)+','+y(p.value)).join(' ')}" fill="none" stroke="#9270c9" stroke-width="2"/>`;
  svg+=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="2" fill="#9270c9"><title>${p.date}：${p.value.toFixed(6)}</title></circle>`).join('');
  svg+=`<text x="12" y="253" font-size="11" fill="currentColor">${points[0].date}</text><text x="560" y="253" text-anchor="end" font-size="11" fill="currentColor">${points.at(-1).date}</text>`;$('fxChart').innerHTML=svg;
 },
 renderList(query=''){
  const snapshot=this.snapshot(),history=game.s.fx.real.history,previous=FXRateService.valid(history,true)&&snapshot?history.points.filter(p=>p.date<snapshot.date).at(-1):null;
  $('fxCurrencyList').innerHTML=FXMarket.currencies.filter(([c,n])=>(c+n).toLowerCase().includes(query.toLowerCase())).map(([c,n,flag])=>{
   const ch=previous&&FXMarket.ready?(snapshot.rates[c]/previous.rates[c]-1)*100:null;
   return `<button type="button" class="fx-currency ${c===FXMarket.to?'active':''}" data-fx="${c}" aria-pressed="${c===FXMarket.to}"><span class="fx-flag">${flag}</span><span><strong>${n}</strong><small>${c} · 1 ${c} 折合 CNY</small></span><span class="fx-quote">${FXMarket.ready?FXMarket.fmt(snapshot.rates[c]):'—'}<small class="${ch===null?'':color(ch)}">${ch===null?'日汇率':percent(ch)+' · 较上次发布'}</small></span></button>`;
  }).join('');document.querySelectorAll('[data-fx]').forEach(b=>b.onclick=()=>{FXMarket.to=b.dataset.fx;if(FXMarket.from===FXMarket.to)FXMarket.from=FXMarket.to==='CNY'?'USD':'CNY';FXMarket.buildSelects();FXMarket.paint()});
 },
 preview(){
  const snapshot=this.snapshot();FXMarket.wallet.CNY=game.s.cash/100;const a=Number($('fxAmount').value),rate=FXMarket.rate(),valid=FXMarket.ready;
  $('fxRate').textContent=valid?`1 ${FXMarket.from} = ${FXMarket.fmt(rate)} ${FXMarket.to}`:'—';
  const units=FXMarket.to==='JPY'?1:100,received=Math.floor(a*rate*units+1e-8)/units;
  $('fxReceived').textContent=valid&&Number.isFinite(received)&&a>0?FXMarket.fmt(received)+' '+FXMarket.to:'—';
  const stale=valid&&FXRateService.stale(snapshot);
  $('fxNote').textContent=valid?`Frankfurter · ${snapshot.date} 日汇率${snapshot.cached?'（缓存）':''} · 虚拟资金按参考汇率兑换，不代表银行实际成交。${stale?'数据已过期，暂停兑换。':''}`:(this.error||'正在连接真实汇率服务…');
  const available=FXMarket.from==='CNY'?game.freeCash/100:(FXMarket.wallet[FXMarket.from]||0);
  $('fxSubmit').disabled=!valid||stale||game.s.finished||FXMarket.from===FXMarket.to||!Number.isFinite(a)||a<=0||a>available||received<=0;
  this.draw();
 },
 exchange(){
  this.preview();if($('fxSubmit').disabled)return toast('汇率不可用、数据已过期或余额不足。',true);
  const amount=Number($('fxAmount').value),precision=FXMarket.from==='JPY'?1:100;
  if(!Number.isSafeInteger(Math.round(amount*precision))||Math.abs(amount*precision-Math.round(amount*precision))>1e-6)return toast('请按货币最小单位输入数量。',true);
  const rate=FXMarket.rate(),scale=FXMarket.to==='JPY'?1:100,received=Math.floor(amount*rate*scale+1e-8)/scale;
  if(!Number.isSafeInteger(Math.round(received*scale))||!Number.isSafeInteger(Math.round(((FXMarket.wallet[FXMarket.to]||0)+received)*scale)))return toast('兑换金额超过支持范围。',true);
  const oldCash=game.s.cash,oldWallet={...FXMarket.wallet},oldHistory=FXMarket.history.slice();
  FXMarket.wallet[FXMarket.from]=Math.round(((FXMarket.wallet[FXMarket.from]||0)-amount)*1e8)/1e8;FXMarket.wallet[FXMarket.to]=Math.round(((FXMarket.wallet[FXMarket.to]||0)+received)*1e8)/1e8;game.s.cash=Math.round(FXMarket.wallet.CNY*100);
  FXMarket.history.unshift({at:new Date().toLocaleString('zh-CN'),from:FXMarket.from,to:FXMarket.to,a:amount,b:received,r:rate,mode:'daily',source:'Frankfurter',rateDate:this.snapshot().date,cached:this.snapshot().cached===true,fees:0,status:'filled'});
  if(!FXMarket.save()){game.s.cash=oldCash;for(const c of Object.keys(FXMarket.wallet))delete FXMarket.wallet[c];Object.assign(FXMarket.wallet,oldWallet);FXMarket.history.splice(0,FXMarket.history.length,...oldHistory);return;}
  $('fxAmount').value='';render();toast(`喵！已按 ${this.snapshot().date} 日汇率兑换 ${FXMarket.fmt(received)} ${FXMarket.to}`);
 },
 paint(){
  if(!this.active())return;this.sync();this.renderList($('fxSearch').value);this.preview();
  const snapshot=this.snapshot(),stale=FXMarket.ready&&FXRateService.stale(snapshot),state=game.s.fx;
  const total=FXMarket.totalCny();$('fxTotal').textContent=FXMarket.ready?'¥ '+FXMarket.fmt(total):'等待汇率';
  $('fxKinds').textContent=Object.values(FXMarket.wallet).filter(v=>v>0).length;$('fxTrades').textContent=FXMarket.history.length;
  $('fxRatio').textContent=FXMarket.ready?((total-game.s.cash/100)/Math.max(1,game.equity/100)*100).toFixed(1)+'%':'—';
  $('fxStatus').textContent=FXMarket.ready?`● Daily Rate${snapshot.cached?' · 缓存':''}${stale?' · 已过期':''}`:(FXMarket.loading?'◌ 正在连接':'○ 尚未连接');
  $('fxUpdated').textContent=FXMarket.ready?`发布 ${snapshot.date} · 获取 ${new Date(snapshot.fetchedAt).toLocaleString('zh-CN')}`:(this.error||'等待汇率服务');
  $('fxWalletList').innerHTML=Object.entries(FXMarket.wallet).filter(([,v])=>v>0).map(([c,v])=>`<div class="fx-wallet-row"><span><b>${esc(c)}</b><small>${FXMarket.name(c)}</small></span><strong>${FXMarket.fmt(v)}</strong></div>`).join('');
 },
 init(){
  const previous={};for(const key of ['load','ensureRates','prices','tick','preview','renderList','draw','paint','exchange'])previous[key]=FXMarket[key];
  FXMarket.load=function(){++FXDailyMode.request;++FXDailyMode.historyRequest;this.loading=false;FXDailyMode.historyBusy=false;FXDailyMode.error='';FXDailyMode.historyError='';previous.load.call(this);game.s.fx.quoteMode??='simulation';game.s.fx.real??={snapshot:null,history:null};if(FXDailyMode.active())FXDailyMode.sync()};
  FXMarket.ensureRates=function(){return FXDailyMode.active()?FXDailyMode.refresh():previous.ensureRates.call(this)};
  FXMarket.prices=function(){return FXDailyMode.active()?(FXDailyMode.snapshot()?.rates||{CNY:1}):previous.prices.call(this)};
  FXMarket.tick=function(n){if(!FXDailyMode.active())return previous.tick.call(this,n)};
  FXMarket.preview=function(){return FXDailyMode.active()?FXDailyMode.preview():previous.preview.call(this)};
  FXMarket.renderList=function(q){return FXDailyMode.active()?FXDailyMode.renderList(q):previous.renderList.call(this,q)};
  FXMarket.draw=function(){if(FXDailyMode.active())return FXDailyMode.draw();FXDailyMode.controls();$('fxChart')?.setAttribute('aria-label','随机模拟外汇走势，非真实历史行情');return previous.draw.call(this)};
  FXMarket.exchange=function(){return FXDailyMode.active()?FXDailyMode.exchange():previous.exchange.call(this)};
  FXMarket.paint=function(){previous.paint.call(this);if(FXDailyMode.active())FXDailyMode.paint();
   $('fxHistory').innerHTML=this.history.slice(0,20).map(t=>`<div class="fx-history-row"><span>${esc(t.from)} → ${esc(t.to)}<small>${esc(t.at)} · ${t.mode==='daily'?'真实日汇率 / 虚拟兑换':'随机模拟'}${t.rateDate?' · '+esc(t.rateDate):''}</small></span><span>${this.fmt(t.a)} → ${this.fmt(t.b)}</span></div>`).join('')||'<p class="muted">还没有兑换记录</p>';
  };
  const originalInit=FXMarket.init;FXMarket.init=function(){
   originalInit.call(this);
   document.querySelector('.fx-chart-tools').insertAdjacentHTML('afterbegin','<select id="fxQuoteMode" aria-label="外汇行情模式"><option value="daily">真实日汇率</option><option value="simulation">随机模拟</option></select><select id="fxHistoryWindow" aria-label="真实历史汇率周期"><option value="7">近 1 周</option><option value="30" selected>近 1 月</option><option value="90">近 3 月</option><option value="365">近 1 年</option></select>');
   document.querySelector('.fx-chart-tools').insertAdjacentHTML('afterend','<p id="fxModeNote" class="fx-mode-note"></p>');
   $('fxQuoteMode').onchange=e=>FXDailyMode.switchMode(e.target.value);$('fxHistoryWindow').onchange=e=>{FXDailyMode.historyDays=Number(e.target.value);FXDailyMode.history();this.draw()};
   $('fxRetry').onclick=()=>FXDailyMode.active()?Promise.allSettled([FXDailyMode.refresh(true),FXDailyMode.history(true)]):this.ensureRates();
   const show=this.show.bind(this);this.show=()=>{show();if(FXDailyMode.active())Promise.allSettled([FXDailyMode.refresh(),FXDailyMode.history()])};
   Object.defineProperty(StockGame.prototype,'equity',{configurable:true,get(){const f=this.s.fx,p=f?.quoteMode==='daily'?f.real?.snapshot?.rates:f?.series?.at(-1)?.prices;let fx=0;if(p)for(const [c,v] of Object.entries(f.wallet||{}))if(c!=='CNY')fx+=v*(p[c]||0)*100;return this.s.cash+this.marketValue+Math.round(fx)}});
   FXDailyMode.controls();this.paint();
   setInterval(()=>{if(FXDailyMode.active()&&!document.hidden&&!$('forexPage').hidden)FXDailyMode.refresh()},60000);
  };
 }
};
FXDailyMode.init();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>FXMarket.init());else FXMarket.init();
