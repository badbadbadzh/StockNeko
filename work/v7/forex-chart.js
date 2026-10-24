/* One CNY-per-unit price vector drives the chart, conversion and valuation. */
Object.assign(FXMarket,{
 running:true,windowSize:60,chartStyle:'candle',loading:false,
 load(){
  // Every save or mode load invalidates outstanding simulation requests.
  this.simulationRequest=(this.simulationRequest||0)+1;this.loading=false;
  if(!game.s.fx){
   game.s.fx={wallet:{},history:[],series:[],base:null,minute:0,drift:{}};
   // The earlier FX version used one global wallet. Claim it once, preserving funds.
   try{const old=JSON.parse(localStorage.getItem('stock-meow-fx')||'null');
    if(old&&!localStorage.getItem('stock-meow-fx-migrated')){
     for(const [c] of this.currencies)if(c!=='CNY'&&Number.isFinite(old.wallet?.[c])&&old.wallet[c]>=0)game.s.fx.wallet[c]=old.wallet[c];
     game.s.fx.history=Array.isArray(old.history)?old.history:[];
     if(this.valid(old.rates)&&/^\d{4}-\d{2}-\d{2}$/.test(old.updated)){game.s.fx.base=old.rates;game.s.fx.date=old.updated;game.s.fx.series=[{minute:0,prices:{...old.rates}}];}
     localStorage.setItem('stock-meow-fx-migrated',LocalProfiles.scope());save();
    }
   }catch{}
  }
  const f=game.s.fx;this.wallet=f.wallet;this.wallet.CNY=game.s.cash/100;this.history=f.history;this.series=f.series;this.ready=!!f.base;
  if(this.ready){this.rates=f.base;this.updated=f.date;this.cached=true;}
 },
 save(){game.s.fx.wallet=this.wallet;game.s.fx.history=this.history;return save();},
 valid(r){return this.currencies.every(([c])=>Number.isFinite(r[c])&&r[c]>0)},
 async ensureRates(){
  if(this.loading||this.ready)return;
  const state=game.s.fx,request=this.simulationRequest=(this.simulationRequest||0)+1;
  const current=()=>state===game.s.fx&&request===this.simulationRequest&&(state.quoteMode||'simulation')==='simulation';
  if(!current())return;this.loading=true;this.paint();
  try{
   const response=await fetch('https://api.frankfurter.dev/v1/latest?base=CNY',{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('行情请求失败');const data=await response.json(),r={CNY:1};
   for(const [c] of this.currencies)if(c!=='CNY')r[c]=1/data.rates[c];
   if(!this.valid(r)||!/^\d{4}-\d{2}-\d{2}$/.test(data.date))throw Error('汇率不完整');
   if(!current())return;
   localStorage.setItem('stock-meow-fx-anchor',JSON.stringify({r,date:data.date}));this.anchor(r,data.date,false);
  }catch(e){
   if(!current())return;
   try{const cache=JSON.parse(localStorage.getItem('stock-meow-fx-anchor')||'null');if(cache&&this.valid(cache.r)&&/^\d{4}-\d{2}-\d{2}$/.test(cache.date))this.anchor(cache.r,cache.date,true);}catch{}
  }finally{if(current()){this.loading=false;this.paint();}}
 },
 anchor(r,date,cached){
  if(this.ready)return;
  this.rates={...r};this.updated=date;this.cached=cached;this.ready=true;
  Object.assign(game.s.fx,{base:{...r},date,minute:0,drift:{}});
  this.series.push({minute:0,prices:{...r}});
  // These are explicitly generated simulation minutes, never historical quotes.
  this.tick(45);this.save();
 },
 prices(){return this.series?.at(-1)?.prices||this.rates},
 rate(){const p=this.prices();return p[this.from]/p[this.to]},
 tick(count=1){
  if(!this.ready||game.s.finished)return;
  const f=game.s.fx;
  for(let k=0;k<count;k++){
   const p={...this.prices()},common=(Math.random()-.5)*.001;
   for(const [c] of this.currencies){if(c==='CNY')continue;
    if(Math.random()<.08)f.drift[c]=(Math.random()-.5)*.001;
    const noise=(Math.random()+Math.random()+Math.random()-1.5)*.0018;
    const shock=Math.random()<.025?(Math.random()-.5)*.018:0;
    p[c]=Math.max(.00001,Math.min(1e6,p[c]*Math.exp(common+noise+(f.drift[c]||0)+shock)));
   }
   this.series.push({minute:++f.minute,prices:p});if(this.series.length>601)this.series.shift();
  }
  this.save();
 },
 totalCny(){const p=this.prices();return game.s.cash/100+Object.entries(this.wallet).reduce((sum,[c,v])=>sum+(c==='CNY'?0:v*(p[c]||0)),0)},
 preview(){
  this.wallet.CNY=game.s.cash/100;const a=Number($('fxAmount').value),r=this.rate();
  $('fxRate').textContent=this.ready?`1 ${this.from} = ${this.fmt(r)} ${this.to}`:'—';
  $('fxReceived').textContent=this.ready&&Number.isFinite(a)?this.fmt(a*r)+' '+this.to:'—';
  $('fxNote').textContent=this.ready?`模拟成交价 · 起点：${this.cached?'缓存 ':''}Frankfurter ${this.updated} 日汇率。不是实时行情或预测。`:'等待有效汇率；连接失败可重试，不生成虚假的真实起点。';
  const available=this.from==='CNY'?game.freeCash/100:(this.wallet[this.from]||0);
  $('fxSubmit').disabled=!this.ready||game.s.finished||this.from===this.to||!Number.isFinite(a)||a<=0||a>available;
  this.draw();
 },
 exchange(){
  this.preview();if($('fxSubmit').disabled)return toast('余额不足或行情不可用',true);
  const a=Number($('fxAmount').value),r=this.rate(),digits=this.from==='JPY'?0:2;
  if(Math.abs(a*10**digits-Math.round(a*10**digits))>1e-6)return toast('请按货币最小单位输入数量',true);
  const precision=this.to==='JPY'?1:100,b=Math.floor(a*r*precision+1e-8)/precision;if(b<=0)return toast('兑换数量太小',true);
  this.wallet[this.from]=Math.round(((this.wallet[this.from]||0)-a)*1e8)/1e8;
  this.wallet[this.to]=Math.round(((this.wallet[this.to]||0)+b)*1e8)/1e8;
  game.s.cash=Math.round(this.wallet.CNY*100);
  this.history.unshift({at:new Date().toLocaleString('zh-CN'),from:this.from,to:this.to,a,b,r,mode:'simulation',minute:game.s.fx.minute});
  this.save();$('fxAmount').value='';render();this.paint();toast(`喵！已按模拟价格兑换 ${this.fmt(b)} ${this.to}`);
 },
 renderList(q=''){
  const p=this.prices();$('fxCurrencyList').innerHTML=this.currencies.filter(([c,n])=>(c+n).toLowerCase().includes(q.toLowerCase())).map(([c,n,f])=>{
   const ch=this.ready?(p[c]/this.rates[c]-1)*100:0;
   return `<button type="button" class="fx-currency ${c===this.to?'active':''}" aria-pressed="${c===this.to}" data-fx="${c}"><span class="fx-flag">${f}</span><span><strong>${n}</strong><small>${c} · 1 ${c} 折合 CNY</small></span><span class="fx-quote">${this.ready?this.fmt(p[c]):'—'}<small class="${color(ch)}">${this.ready?percent(ch)+' · 模拟':'等待数据'}</small></span></button>`;
  }).join('');
  document.querySelectorAll('[data-fx]').forEach(b=>b.onclick=()=>{this.to=b.dataset.fx;if(this.to===this.from)this.from=this.to==='CNY'?'USD':'CNY';this.buildSelects();this.paint()});
 },
 draw(){
  if(!$('fxChart'))return;
  $('fxChartPair').textContent=`${this.from} / ${this.to}`;
  $('fxPlay').textContent=this.running?'Ⅱ 暂停':'▷ 自动';$('fxNext').disabled=!this.ready||game.s.finished;
  $('fxChartSource').textContent=this.ready?`起点：${this.updated} ${this.cached?'缓存日汇率':'日汇率'} · 图中全部为随机模拟 · 已推进 ${game.s.fx.minute} 分钟`:(this.loading?'正在获取真实汇率起点…':'暂无有效汇率。请重试联网获取。');
  const data=(this.series||[]).slice(-this.windowSize-1).map(s=>({t:s.minute,v:s.prices[this.from]/s.prices[this.to]}));
  if(data.length<2){$('fxChart').innerHTML='<text x="320" y="140" text-anchor="middle" fill="currentColor">获取汇率后生成模拟 K 线</text>';return;}
  const W=640,H=260,left=12,right=80,top=18,bottom=30,min=Math.min(...data.map(x=>x.v)),max=Math.max(...data.map(x=>x.v)),pad=Math.max((max-min)*.18,max*.0005),low=min-pad,high=max+pad;
  const y=v=>top+(high-v)/(high-low)*(H-top-bottom),x=i=>left+i/(data.length-1)*(W-left-right);
  let svg='';for(let i=0;i<5;i++){const v=low+(high-low)*i/4,yy=y(v);svg+=`<path d="M${left} ${yy}H${W-right}" stroke="currentColor" opacity=".12"/><text x="${W-right+8}" y="${yy+4}" font-size="11" fill="currentColor">${v.toFixed(v<1?5:3)}</text>`;}
  if(this.chartStyle==='line')svg+=`<polyline points="${data.map((d,i)=>x(i)+','+y(d.v)).join(' ')}" fill="none" stroke="#9270c9" stroke-width="2"/>`;
  else for(let i=1;i<data.length;i++){
   const a=data[i-1],b=data[i],up=b.v>=a.v,c=up?'var(--red)':'var(--green)',yy=Math.min(y(a.v),y(b.v)),h=Math.max(1,Math.abs(y(a.v)-y(b.v))),width=Math.max(2,(W-left-right)/(data.length-1)*.6);
   svg+=`<rect x="${x(i)-width/2}" y="${yy}" width="${width}" height="${h}" fill="${c}"><title>模拟第 ${b.t} 分钟\n开 ${a.v.toFixed(6)}\n收 ${b.v.toFixed(6)}</title></rect>`;
  }
  svg+=`<text x="12" y="253" font-size="11" fill="currentColor">模拟 +${data[0].t} 分钟</text><text x="${W-right}" y="253" text-anchor="end" font-size="11" fill="currentColor">+${data.at(-1).t} 分钟</text>`;
  $('fxChart').innerHTML=svg;$('fxChartPrice').textContent=this.fmt(data.at(-1).v);
 },
 wrapRender(){
  Object.defineProperty(StockGame.prototype,'equity',{configurable:true,get(){const f=this.s.fx,p=f?.series?.at(-1)?.prices;let fx=0;if(p)for(const [c,v] of Object.entries(f.wallet||{}))if(c!=='CNY')fx+=v*(p[c]||0)*100;return this.s.cash+this.marketValue+Math.round(fx)}});
  const old=render;render=()=>{if(this.wallet!==game.s.fx?.wallet)this.load();this.wallet.CNY=game.s.cash/100;old();if(!$('forexPage').hidden)this.paint()};
 },
});
const fxPaint=FXMarket.paint;
FXMarket.paint=function(){fxPaint.call(this);$('fxRatio').textContent=((this.totalCny()-game.s.cash/100)/Math.max(1,game.equity/100)*100).toFixed(1)+'%';};
const fxInit=FXMarket.init;
FXMarket.init=function(){
 document.querySelector('.fx-grid').insertAdjacentHTML('afterbegin',`<section class="panel fx-chart-panel"><div class="panel-head"><span class="panel-title" id="fxChartPair">外汇模拟走势</span><strong class="mono" id="fxChartPrice">—</strong></div><div class="fx-chart-tools"><button class="btn" id="fxPlay">Ⅱ 暂停</button><button class="btn" id="fxNext">推进 5 分钟</button><select id="fxChartStyle" aria-label="外汇图表类型"><option value="candle">模拟 K 线</option><option value="line">折线</option></select><select id="fxChartWindow" aria-label="显示模拟分钟数"><option value="60">最近 60 分钟</option><option value="180">最近 180 分钟</option><option value="600">最近 600 分钟</option></select><button class="btn" id="fxRetry">重试获取</button></div><svg id="fxChart" viewBox="0 0 640 260" role="img" aria-label="随机模拟外汇走势，非真实历史行情"></svg><p id="fxChartSource" class="fx-chart-source"></p></section>`);
 fxInit.call(this);clearInterval(this.pulseTimer);
 this.pulseTimer=setInterval(()=>{if(this.ready&&this.running&&game.s.fx?.quoteMode!=='daily'&&!document.hidden&&!$('forexPage').hidden&&!document.querySelector('dialog[open]')){this.tick();render()}},2000);
 $('fxPlay').onclick=()=>{this.running=!this.running;this.draw()};$('fxNext').onclick=()=>{this.tick(5);render()};
 $('fxRetry').onclick=()=>this.ensureRates();$('fxChartStyle').onchange=e=>{this.chartStyle=e.target.value;this.draw()};$('fxChartWindow').onchange=e=>{this.windowSize=Number(e.target.value);this.draw()};
 const life=LifeUI.open;LifeUI.open=function(){ $('forexPage').hidden=true;return life.call(this)};
 const show=this.show.bind(this);this.show=()=>{stopAuto();$('lifePage').hidden=true;show()};
 this.hide=()=>{$('forexPage').hidden=true;LifeUI.trade()};
 this.paint();
};
// Initialized after the real-rate mode adapter.
