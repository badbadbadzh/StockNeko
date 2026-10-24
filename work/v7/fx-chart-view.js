'use strict';
// All plotted samples are provider observations. Lines connect samples without interpolation.
const FXChartView={
 cache:null,model:null,index:-1,timers:new Map(),
 motion(){return typeof LiquidGlass!=='undefined'&&LiquidGlass.allowed()},
 pulse(node,name,duration=800){if(!node||!this.motion())return;clearTimeout(this.timers.get(node));node.classList.add(name);this.timers.set(node,setTimeout(()=>{node.classList.remove(name);this.timers.delete(node)},duration))},
 number(value,digits){return Number(value).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits})},
 precision(value){return Math.min(8,Math.max(2,4-Math.floor(Math.log10(Math.abs(value)||1))))},
 text(id,value){const node=$(id);if(node&&node.textContent!==value)node.textContent=value},
 layout(){
  if(!$('fxDailySummary'))return;
  const daily=FXDailyMode.active();$('forexPage').dataset.quoteMode=daily?'daily':'simulation';
  for(const id of ['fxDailySummary','fxDailyStats','fxPeriods'])$(id).hidden=!daily;
  $('fxChartPrice').hidden=daily;$('fxHistoryWindow').hidden=true;
  if(!daily){this.cache=null;this.model=null;this.hideTip();$('fxChart').setAttribute('viewBox','0 0 640 260');$('fxChart').removeAttribute('tabindex');$('fxChart').setAttribute('role','img');$('fxChart').classList.remove('fx-chart-enter');}
  $('fxPeriods').querySelectorAll('button').forEach(b=>{const active=Number(b.dataset.fxRange)===FXDailyMode.historyDays;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 },
 draw(){
  this.layout();const chart=$('fxChart');if(!chart||!$('fxDailySummary'))return;
  const from=FXMarket.from,to=FXMarket.to,history=game.s.fx.real.history,snapshot=FXDailyMode.snapshot();
  const valid=FXRateService.valid(history,true)&&history.days===FXDailyMode.historyDays;
  const points=valid?history.points.map(p=>({date:p.date,value:p.rates[from]/p.rates[to],time:Date.parse(p.date+'T00:00:00Z')})):[];
  const rate=FXMarket.ready?FXMarket.rate():null,digits=this.precision(rate||1);
  this.text('fxChartPair',from+' / '+to);this.text('fxHeroLabel','1 '+from+' 可兑换');this.text('fxHeroRate',rate?this.number(rate,digits):'—');this.text('fxHeroUnit',to);
  this.text('fxHeroDate',snapshot?'发布于 '+snapshot.date:'等待最新发布');
  const change=points.length>1?(points.at(-1).value/points[0].value-1)*100:null;
  const changeNode=$('fxPeriodChange');changeNode.className='fx-period-change '+(change===null||Math.abs(change)<.00005?'':color(change));
  this.text('fxPeriodDelta',change===null?'—':(change>0?'+':'')+change.toFixed(2)+'%');
  this.text('fxPeriodCaption',change===null?'等待区间数据':'较区间首日');
  const values=points.map(p=>p.value),min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
  this.text('fxRangeLow',min===null?'—':this.number(min,this.precision(min)));this.text('fxRangeHigh',max===null?'—':this.number(max,this.precision(max)));this.text('fxSampleCount',points.length?points.length+' 天':'—');
  $('fxRetry').setAttribute('aria-busy',String(FXMarket.loading||FXDailyMode.historyBusy));
  this.text('fxChartSource',points.length?`Frankfurter · 真实日汇率${history.cached?' · 缓存':''}${FXRateService.stale(history)?' · 历史数据已过期':''}`:(FXDailyMode.historyBusy?'正在连接历史汇率…':FXDailyMode.historyError||'暂无可用历史汇率'));
  const width=Math.max(280,Math.round($('fxPlotWrap').getBoundingClientRect().width)||640),height=width<480?242:280;
  const key=[from,to,FXDailyMode.historyDays,width,height,FXDailyMode.historyBusy,FXDailyMode.historyError].join('|');
  if(this.cache?.history===history&&this.cache?.key===key)return;
  this.cache={history,key};this.model=null;this.hideTip();chart.setAttribute('viewBox',`0 0 ${width} ${height}`);chart.setAttribute('role','group');chart.setAttribute('tabindex','0');chart.setAttribute('aria-label',`${from} 兑换 ${to} 的真实历史日汇率。方向键逐日查看，Home 和 End 跳到首尾，Escape 退出查看。`);
  const L=14,R=width-76,T=20,B=height-34;
  if(!points.length){chart.innerHTML=`<g class="fx-chart-empty"><circle cx="${width/2}" cy="${height/2-36}" r="19" fill="none" stroke="currentColor" opacity=".2"/><path d="M${width/2-7} ${height/2-36}h14m-7-7v14" stroke="currentColor" opacity=".4"/><text x="${width/2}" y="${height/2+10}" text-anchor="middle">${FXDailyMode.historyBusy?'正在读取历史汇率':'这个区间暂无数据'}</text><text class="fx-axis-label" x="${width/2}" y="${height/2+33}" text-anchor="middle">${FXDailyMode.historyBusy?'稍等一下，正在连接市场':'试试其他周期，或刷新汇率'}</text></g>`;return;}
  const pad=Math.max((max-min)*.2,max*.0004),low=min-pad,high=max+pad,span=points.at(-1).time-points[0].time;
  const x=p=>span?L+(p.time-points[0].time)/span*(R-L):(L+R)/2,y=v=>T+(high-v)/(high-low)*(B-T);
  const axisDigits=Math.min(8,Math.max(digits,Math.ceil(-Math.log10((high-low)/4))));
  let svg=`<defs><linearGradient id="fxAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a68ae4" stop-opacity=".34"/><stop offset="75%" stop-color="#b4b9ed" stop-opacity=".10"/><stop offset="100%" stop-color="#bce9e0" stop-opacity="0"/></linearGradient><linearGradient id="fxLineGradient" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#9677d2"/><stop offset="100%" stop-color="#7953bc"/></linearGradient></defs>`;
  for(let i=0;i<5;i++){const v=high-(high-low)*i/4,yy=y(v);svg+=`<path class="fx-grid-line" d="M${L} ${yy}H${R}"/><text class="fx-axis-label" x="${R+12}" y="${yy+4}">${this.number(v,axisDigits)}</text>`;}
  const locations=points.map(p=>`${x(p).toFixed(2)},${y(p.value).toFixed(2)}`).join(' '),last=points.at(-1);
  svg+=`<path class="fx-baseline" d="M${L} ${y(points[0].value)}H${R}"/>`;
  if(points.length>1)svg+=`<path class="fx-area" d="M${x(points[0])},${B}L${locations.replaceAll(' ','L')}L${x(last)},${B}Z" fill="url(#fxAreaGradient)"/><polyline class="fx-price-halo" aria-hidden="true" points="${locations}"/><polyline class="fx-price-line" points="${locations}" stroke="url(#fxLineGradient)" pathLength="1"/>`;
  svg+=`<circle class="fx-last-halo" cx="${x(last)}" cy="${y(last.value)}" r="9"/><circle class="fx-last-dot" cx="${x(last)}" cy="${y(last.value)}" r="4"/>`;
  const indices=[...new Set(width<480?[0,points.length-1]:[0,Math.floor((points.length-1)/2),points.length-1])];
  for(const i of indices){const p=points[i];svg+=`<text class="fx-axis-label" x="${x(p)}" y="${height-8}" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}">${p.date.slice(5).replace('-','/')}</text>`;}
  svg+=`<g id="fxChartCursor" visibility="hidden" pointer-events="none"><path id="fxCrossX" class="fx-guide"/><path id="fxCrossY" class="fx-guide fx-guide-soft"/><circle id="fxHoverPoint" class="fx-hover-point" r="5"/></g>`;
  chart.innerHTML=svg;this.model={points,x,y,width,height,L,R,T,B,from,to,digits};this.index=-1;
  chart.classList.remove('fx-chart-enter');if(this.motion())this.pulse(chart,'fx-chart-enter',900);
 },
 inspect(index,keyboard=false){
  const m=this.model;if(!m||!FXDailyMode.active())return;this.index=Math.max(0,Math.min(m.points.length-1,index));const p=m.points[this.index],x=m.x(p),y=m.y(p.value),tip=$('fxChartTooltip');
  $('fxChartCursor').setAttribute('visibility','visible');$('fxCrossX').setAttribute('d',`M${x} ${m.T}V${m.B}`);$('fxCrossY').setAttribute('d',`M${m.L} ${y}H${m.R}`);$('fxHoverPoint').setAttribute('cx',x);$('fxHoverPoint').setAttribute('cy',y);
  this.text('fxTooltipDate',p.date);this.text('fxTooltipRate','1 '+m.from+' = '+this.number(p.value,this.precision(p.value))+' '+m.to);
  tip.hidden=false;tip.style.left=Math.max(6,Math.min(m.width-tip.offsetWidth-6,x-tip.offsetWidth/2))+'px';tip.style.top=Math.max(4,y-78)+'px';
  if(keyboard)this.text('fxChartAnnouncement',p.date+'，'+$('fxTooltipRate').textContent);
 },
 pointer(event){
  const m=this.model;if(!m)return;const bounds=$('fxChart').getBoundingClientRect(),x=(event.clientX-bounds.left)/bounds.width*m.width;
  let i=0;for(let j=1;j<m.points.length;j++)if(Math.abs(m.x(m.points[j])-x)<Math.abs(m.x(m.points[i])-x))i=j;
  this.inspect(i);
 },
 hideTip(){if($('fxChartTooltip'))$('fxChartTooltip').hidden=true;$('fxChartCursor')?.setAttribute('visibility','hidden');this.index=-1},
 init(){
  const panel=document.querySelector('.fx-chart-panel');
  panel.querySelector('.panel-head').insertAdjacentHTML('afterend',`<div id="fxDailySummary" class="fx-chart-summary" hidden><div><span id="fxHeroLabel" class="fx-chart-eyebrow">当前汇率</span><div class="fx-chart-quote"><strong id="fxHeroRate">—</strong><span id="fxHeroUnit">USD</span></div><div id="fxPeriodChange" class="fx-period-change"><b id="fxPeriodDelta">—</b><span id="fxPeriodCaption">较区间首日</span></div></div><div class="fx-chart-meta"><span class="fx-chart-badge">每日参考价</span><span id="fxHeroDate"></span></div></div>`);
  $('fxHistoryWindow').insertAdjacentHTML('afterend','<div id="fxPeriods" class="fx-periods" role="group" aria-label="历史汇率周期">'+[[7,'1 周'],[30,'1 月'],[90,'3 月'],[365,'1 年']].map(([days,label])=>`<button type="button" data-fx-range="${days}" aria-pressed="false">${label}</button>`).join('')+'</div>');
  const wrap=document.createElement('div');wrap.id='fxPlotWrap';wrap.className='fx-plot-wrap';$('fxChart').before(wrap);wrap.append($('fxChart'));wrap.insertAdjacentHTML('beforeend','<div id="fxChartTooltip" class="fx-chart-tooltip" hidden><span id="fxTooltipDate"></span><strong id="fxTooltipRate"></strong></div><span id="fxChartAnnouncement" class="fx-sr-only" role="status" aria-live="polite"></span>');
  wrap.insertAdjacentHTML('afterend','<div id="fxDailyStats" class="fx-chart-stats" hidden><div><span>区间最低</span><strong id="fxRangeLow">—</strong></div><div><span>区间最高</span><strong id="fxRangeHigh">—</strong></div><div><span>有报价的日期</span><strong id="fxSampleCount">—</strong></div></div>');
  $('fxPeriods').onclick=e=>{const button=e.target.closest('[data-fx-range]');if(!button||Number(button.dataset.fxRange)===FXDailyMode.historyDays)return;$('fxHistoryWindow').value=button.dataset.fxRange;$('fxHistoryWindow').dispatchEvent(new Event('change'))};
  const chart=$('fxChart');chart.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||e.buttons)this.pointer(e)},{passive:true});chart.addEventListener('pointerdown',e=>this.pointer(e),{passive:true});chart.addEventListener('pointerleave',()=>this.hideTip());chart.addEventListener('pointercancel',()=>this.hideTip());chart.addEventListener('blur',()=>this.hideTip());
  chart.addEventListener('keydown',e=>{if(!this.model)return;let i=this.index<0?this.model.points.length-1:this.index;if(e.key==='ArrowLeft')i--;else if(e.key==='ArrowRight')i++;else if(e.key==='Home')i=0;else if(e.key==='End')i=this.model.points.length-1;else if(e.key==='Escape'){this.hideTip();return}else return;e.preventDefault();e.stopPropagation();this.inspect(i,true)});
  this.observer=new ResizeObserver(()=>{if(FXDailyMode.active()&&!$('forexPage').hidden)this.draw()});this.observer.observe(wrap);
  const show=FXMarket.show.bind(FXMarket);FXMarket.show=()=>{const entering=$('forexPage').hidden;show();if(entering)this.pulse($('forexPage'),'fx-arriving',750)};
  const exchange=FXMarket.exchange.bind(FXMarket);FXMarket.exchange=()=>{const first=FXMarket.history[0];exchange();if(FXMarket.history[0]!==first)this.pulse(document.querySelector('.fx-exchange'),'fx-exchange-success',900)};
  $('fxAmount').addEventListener('input',()=>this.pulse($('fxReceived'),'fx-value-changed',450));
  const titles=[['.fx-overview .panel-title','货币行情'],['.fx-exchange .panel-title','货币兑换'],['.fx-wallet .panel-title','我的钱包']];for(const [selector,label] of titles){const n=document.querySelector(selector);if(n)n.textContent=label}
  for(const [id,label] of [['fxFrom','支付货币'],['fxTo','获得货币'],['fxAmount','兑换数量'],['fxRate','当前汇率 '],['fxReceived','预计获得 ']]){const parent=$(id).parentElement;for(const child of parent.childNodes)if(child.nodeType===3&&child.textContent.trim()){child.textContent=label;break}}
  this.layout();
 }
};
