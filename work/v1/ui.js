'use strict';
const $=id=>document.getElementById(id),KEY='stock-girl-save-v1';
const money=(c,sign=false)=>(sign&&c>0?'+':'')+(c/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const price=c=>(c/100).toFixed(2),percent=n=>(n>0?'+':'')+n.toFixed(2)+'%',color=n=>n>0?'up':n<0?'down':'neutral';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game,selected=0,side='buy',chartMode='daily',holdTab='positions',autoTimer=null,saveError=false,chartBars=[],chartGeometry=null;
try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data){game=StockGame.restore(JSON.stringify(data.game));selected=Number.isInteger(data.selected)&&data.selected>=0&&data.selected<8?data.selected:0;}}
catch(e){saveError=true;}
if(!game)game=new StockGame();
function save(){try{localStorage.setItem(KEY,JSON.stringify({game:game.s,selected}));$('saveStatus').innerHTML='<i class="dot"></i> 进度已保存';}catch(e){$('saveStatus').textContent='未能自动保存';if(!saveError){toast('浏览器未允许自动存档，请使用「存档管理」导出进度。',true);saveError=true;}}}
function toast(text,error=false){const el=document.createElement('div');el.className='toast '+(error?'error':'success');el.textContent=text;$('toasts').appendChild(el);setTimeout(()=>el.remove(),4200);}
function stopAuto(){clearInterval(autoTimer);autoTimer=null;$('autoBtn').textContent='▷ 自动';}
function modal(title,html){stopAuto();$('modalTitle').textContent=title;$('modalBody').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function closeModal(){$('modal').close();}
function currentPrice(){if($('orderMode').value==='best'){const q=game.quote(selected);return (side==='buy'?q.ask:q.bid)??game.s.stocks[selected].price;}return Math.round(Number($('priceInput').value)*100);}
function render(){
 const s=game.s,x=s.stocks[selected],delta=game.equity-10000000,change=x.price-x.prev,lim=game.limits(selected);
 $('dayChip').textContent='DAY '+String(s.day).padStart(2,'0')+' / 20';$('clock').textContent=game.timeText;$('phase').textContent='● '+game.phase+' · 虚拟交易日';$('dayProgress').style.width=(s.day/20*100)+'%';
 $('totalAsset').textContent='¥ '+money(game.equity);$('profit').textContent=money(delta,true);$('profit').className=color(delta);$('returnRate').textContent='收益率 '+percent(delta/100000);$('returnRate').className=color(delta);
 $('freeCash').textContent=money(game.freeCash);$('frozenCash').textContent='委托冻结 ¥ '+money(game.frozen);$('marketValue').textContent=money(game.marketValue);$('positionRatio').textContent='当前仓位 '+(game.marketValue/game.equity*100).toFixed(1)+'%'+(game.marketValue===0?' · 空仓也是选择':'');
 $('watchList').innerHTML=s.stocks.map(st=>{const d=(st.price/st.prev-1)*100;return `<button class="stock-row ${st.id===selected?'active':''}" data-stock="${st.id}" aria-label="查看${st.name}" aria-pressed="${st.id===selected}"><span><strong>${st.name}${game.position(st.id).qty?'<i class="holding-dot"></i>':''}</strong><small>${st.code}</small></span><span class="mono ${color(d)}">${price(st.price)}</span><span class="mono change ${color(d)}">${percent(d)}</span></button>`;}).join('');
 $('stockName').textContent=x.name;$('stockCode').textContent=x.code;$('stockSector').textContent=x.sector;$('lastPrice').textContent=price(x.price);$('priceChange').textContent=money(change,true)+'  '+percent(change/x.prev*100);$('chartPrice').className='chart-price '+color(change);
 $('quoteStats').innerHTML=[['今开',x.today.o],['昨收',x.prev],['最高',x.today.h],['最低',x.today.l]].map(([k,v])=>`<span>${k}<b>${price(v)}</b></span>`).join('');
 $('limitHint').textContent=price(lim.down)+' — '+price(lim.up);$('ticketStock').textContent=x.name;
 $('newsList').innerHTML=s.news.filter(n=>n.day===s.day).map(n=>`<article class="news-item"><div class="news-meta"><span>${esc(n.time)} · 模拟快讯</span><span class="${n.sign>0?'up':'down'}">${n.sign>0?'偏利好':'偏利空'}</span></div><h4>${esc(n.title)}</h4><p>${esc(n.body)}</p></article>`).join('')+'<p class="news-empty">消息会影响情绪，但市场总有自己的想法。</p>';
 $('positionCount').textContent=Object.values(s.positions).filter(p=>p.qty).length;$('orderCount').textContent=game.pending.length;$('realized').textContent=money(s.realized,true);$('realized').className=color(s.realized);$('totalFees').textContent=money(s.totalFees);
 $('characterDay').textContent=s.day;
 let speech='先别急着梭哈。<br>看清楚，再下单！',mood='紧张，但清醒',tip='第一次买入试试 100 股。今天买的，明天才能卖。';
 if(s.trades.length){speech='账户里的数字，<br>可不是游戏……';mood='认真盯盘中';tip='买入成本包含费用。卖出前，记得检查「可卖」股数。';}
 if(delta>200000){speech='红色真好看。<br>也要记得风险！';mood='嘴角有点上扬';tip='浮盈会变化，仓位越集中，账户波动通常越大。';}
 if(delta< -200000){speech='深呼吸……<br>别被情绪带走。';mood='心跳有点快';tip='亏损不等于必须立刻加仓。先看看自己的可用资金。';}
 if(game.time===690){speech='午休了。<br>先吃饭，再看盘。';mood='暂时放下手机';tip='11:30—13:00 午间休市。点「进入午盘」继续。';}
 if(game.time>=897&&game.time<900){speech='最后三分钟。<br>现在不能撤单。';mood='等收盘的三分钟';tip='收盘集合竞价 14:57—15:00：允许限价申报，不接受撤单。';}
 if(game.time===900){speech='今天活下来了。<br>复盘，明天再战。';mood='终于松了口气';tip='今日未成交委托已失效。进入下一交易日后，今日买入股份解锁。';}
 if(s.finished){speech='二十天，走完了。<br>我们下次再见！';mood='这就是成长吧';tip='20 日挑战完成！点击「查看最终成绩」复盘，或导出存档留个纪念。';}
 $('speech').innerHTML=speech;$('moodText').textContent=mood;$('coachTip').innerHTML='<b>小满的便签</b>　'+tip;
 $('stepBtn').disabled=s.finished||game.time===900;$('stepBtn').textContent=game.time===690?'进入午盘':game.time===895?'推进至 14:57':game.time===897?'推进至收盘':'推进 5 分钟';$('autoBtn').disabled=game.time===900||s.finished;$('closeBtn').textContent=s.finished?'查看最终成绩 →':game.time===900?'下一交易日 →':'结束今日 →';
 renderHoldings();renderTicket();requestAnimationFrame(drawChart);
}
function renderTicket(){
 $('qtyInput').min=side==='buy'?'100':'1';$('qtyInput').step=side==='buy'?'100':'1';
 const p=currentPrice(),qty=Number($('qtyInput').value),valid=Number.isInteger(qty)&&qty>0&&Number.isInteger(p)&&p>0;
 if($('orderMode').value==='best')$('priceInput').value=price(p);
 $('priceInput').disabled=$('orderMode').value==='best';
 const max=side==='buy'?game.maxBuy(selected,p||1):game.available(selected),f=game.fees(valid?p*qty:0,side),amount=valid?p*qty:0;
 $('availableHint').textContent=(side==='buy'?'最多可买 ':'当前可卖 ')+max.toLocaleString()+' 股';
 $('feeEstimate').textContent=valid?'¥ '+money(f.total):'—';$('feeHelp').title='佣金 ¥'+money(f.commission)+' + 过户费 ¥'+money(f.transfer)+(side==='sell'?' + 印花税 ¥'+money(f.stamp):'');
 $('totalEstimate').textContent=valid?'¥ '+money(side==='buy'?amount+f.total:amount-f.total):'—';$('totalLabel').textContent=side==='buy'?'预计占用资金':'预计卖出到账';
 $('submitOrder').className='trade-submit '+(side==='sell'?'sell':'');$('submitOrder').disabled=!game.canOrder;$('submitOrder').textContent=game.canOrder?'确认'+(side==='buy'?'买入':'卖出')+' · '+(Number.isFinite(qty)?qty.toLocaleString():0)+' 股 →':game.phase;
 $('ticketFoot').textContent=side==='buy'?'100 股起买 · T+1 可卖 · 委托当日有效':'仅可卖昨日及更早持仓 · 卖出另收印花税';
 $('buyTab').classList.toggle('active',side==='buy');$('sellTab').classList.toggle('active',side==='sell');
}
function setSide(v){side=v;renderTicket();}
function selectStock(id){selected=id;$('priceInput').value=price(game.s.stocks[id].price);render();save();}
function renderHoldings(){
 const s=game.s;
 document.querySelectorAll('[data-hold]').forEach(b=>b.classList.toggle('active',b.dataset.hold===holdTab));
 let html='';
 if(holdTab==='positions'){
  const list=s.stocks.filter(x=>game.position(x.id).qty>0);
  if(!list.length)html='<div class="empty"><div class="empty-icon">▤</div><h4>账户很轻，可能性很重。</h4><p>你的第一笔持仓，会出现在这里。<br>选一支股票，从 100 股开始认识市场。</p><button class="btn" data-first-trade>去下第一单 ↗</button></div>';
  else html='<table class="table"><thead><tr><th>股票 / 成本</th><th>持有 / 可卖</th><th>市值 / 浮动盈亏</th><th>操作</th></tr></thead><tbody>'+list.map(x=>{const p=game.position(x.id),v=p.qty*x.price,gain=v-p.cost;return `<tr><td>${x.name}<small>成本 ${price(p.cost/p.qty)}</small></td><td>${p.qty}<small>可卖 ${game.available(x.id)}${p.qty>p.available?' · T+1':''}</small></td><td>${money(v)}<small class="${color(gain)}">${money(gain,true)} (${percent(gain/p.cost*100)})</small></td><td><button data-sell-stock="${x.id}">卖出</button></td></tr>`;}).join('')+'</tbody></table>';
 }else if(holdTab==='orders'){
  const list=s.orders.filter(o=>o.day===s.day).slice().reverse();
  if(!list.length)html='<div class="empty"><div class="empty-icon">≋</div><h4>今日还没有委托</h4><p>限价单会在价格满足条件时尝试成交。<br>未成交委托将在收盘后自动失效。</p></div>';
  else html='<table class="table"><thead><tr><th>股票 / 方向</th><th>委托价 / 股数</th><th>状态</th><th>操作</th></tr></thead><tbody>'+list.map(o=>`<tr><td>${s.stocks[o.stock].name}<small class="${o.side==='buy'?'up':'down'}">${o.side==='buy'?'买入':'卖出'} · ${o.time}</small></td><td>${price(o.price)}<small>${o.qty} 股</small></td><td>${({pending:'待成交',filled:'已成交',cancelled:'已撤单',expired:'收盘失效'})[o.status]}${o.status==='filled'?'<small>'+price(o.fillPrice)+'</small>':''}</td><td>${o.status==='pending'?`<button data-cancel="${o.id}">撤单</button>`:'—'}</td></tr>`).join('')+'</tbody></table>';
 }else{
  const list=s.trades.slice().reverse();
  if(!list.length)html='<div class="empty"><div class="empty-icon">⌁</div><h4>每一笔选择，都值得记下。</h4><p>成交后，你可以在这里查看价格、股数和费用。</p></div>';
  else html='<table class="table"><thead><tr><th>股票 / 时间</th><th>方向 / 股数</th><th>成交价</th><th>费用</th></tr></thead><tbody>'+list.map(t=>`<tr><td>${s.stocks[t.stock].name}<small>第 ${t.day} 日 ${t.time}</small></td><td class="${t.side==='buy'?'up':'down'}">${t.side==='buy'?'买入':'卖出'}<small>${t.qty} 股</small></td><td>${price(t.price)}</td><td>${money(t.fees.total)}</td></tr>`).join('')+'</tbody></table>';
 }
 $('holdContent').innerHTML=html;
}
function fitCanvas(canvas){const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;if(rect.width<=0||rect.height<=0)return null;canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);return {ctx,w:rect.width,h:rect.height};}
function drawChart(){
 const result=fitCanvas($('priceChart'));if(!result)return;const {ctx,w,h}=result,x=game.s.stocks[selected],left=8,right=w-51,top=12,bottom=h-58,volTop=bottom+12,volBottom=h-20;
 ctx.clearRect(0,0,w,h);ctx.font='9px Consolas, monospace';
 chartBars=chartMode==='daily'?[...x.bars.slice(-37),x.today]:x.points.map((p,i)=>({c:p,label:formatTime(StockGame.TIMES[i])}));
 const max=Math.max(...chartBars.map(b=>b.h??b.c),chartMode==='intraday'?x.prev:0),min=Math.min(...chartBars.map(b=>b.l??b.c),chartMode==='intraday'?x.prev:Infinity),pad=Math.max((max-min)*.13,x.price*.003),hi=max+pad,lo=min-pad;
 const y=p=>top+(hi-p)/(hi-lo)*(bottom-top),slots=chartMode==='daily'?chartBars.length:StockGame.TIMES.length,dx=(right-left)/slots,px=i=>left+(i+.5)*dx;
 chartGeometry={left,right,top,bottom,dx,slots,y};
 ctx.strokeStyle='#dfdfd4';ctx.lineWidth=.7;
 for(let i=0;i<=4;i++){const yy=top+(bottom-top)*i/4;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.fillStyle='#95998a';ctx.fillText(price(hi-(hi-lo)*i/4),right+7,yy+3);}
 for(let i=0;i<4;i++){const xx=left+(right-left)*i/4;ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,bottom);ctx.stroke();ctx.setLineDash([]);}
 if(chartMode==='daily'){
  const vmax=Math.max(...chartBars.map(b=>b.v));
  chartBars.forEach((b,i)=>{const xx=px(i),c=b.c>=b.o?'#bf5140':'#408573';ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,y(b.h));ctx.lineTo(xx,y(b.l));ctx.stroke();const bw=Math.max(2,dx*.52);ctx.fillRect(xx-bw/2,Math.min(y(b.o),y(b.c)),bw,Math.max(1,Math.abs(y(b.o)-y(b.c))));ctx.globalAlpha=.42;const vh=b.v/vmax*(volBottom-volTop);ctx.fillRect(xx-bw/2,volBottom-vh,bw,vh);ctx.globalAlpha=1;});
  for(const [n,c] of [[5,'#b88e47'],[10,'#839275']]){ctx.beginPath();ctx.strokeStyle=c;ctx.lineWidth=1;for(let i=n-1;i<chartBars.length;i++){const avg=chartBars.slice(i-n+1,i+1).reduce((a,b)=>a+b.c,0)/n;i===n-1?ctx.moveTo(px(i),y(avg)):ctx.lineTo(px(i),y(avg));}ctx.stroke();}
  ctx.fillStyle='#979b8c';ctx.fillText('模拟历史',left,h-5);ctx.textAlign='right';ctx.fillText('第 '+game.s.day+' 日',right,h-5);ctx.textAlign='left';
 }else{
  const c=x.price>=x.prev?'#bb5141':'#38836d';ctx.strokeStyle='#aaa997';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(left,y(x.prev));ctx.lineTo(right,y(x.prev));ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();chartBars.forEach((b,i)=>i===0?ctx.moveTo(px(i),y(b.c)):ctx.lineTo(px(i),y(b.c)));ctx.strokeStyle=c;ctx.lineWidth=1.7;ctx.stroke();
  const lastX=px(chartBars.length-1);ctx.lineTo(lastX,bottom);ctx.lineTo(px(0),bottom);ctx.closePath();const gradient=ctx.createLinearGradient(0,top,0,bottom);gradient.addColorStop(0,c+'30');gradient.addColorStop(1,c+'00');ctx.fillStyle=gradient;ctx.fill();ctx.beginPath();ctx.arc(lastX,y(x.price),3,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();
  ctx.fillStyle='#979b8c';ctx.fillText('09:30',left,h-14);ctx.textAlign='center';ctx.fillText('11:30 / 13:00',left+(right-left)/2,h-14);ctx.textAlign='right';ctx.fillText('15:00',right,h-14);ctx.textAlign='left';
 }
 ctx.fillStyle=x.price>=x.prev?'#b84c3a':'#3d806d';ctx.fillRect(right+2,y(x.price)-7,46,14);ctx.fillStyle='#fff';ctx.font='9px Consolas, monospace';ctx.fillText(price(x.price),right+6,y(x.price)+3);
 $('chartLegend').innerHTML=chartMode==='daily'?'<span><i></i>MA5</span><span><i class="ma10"></i>MA10</span><span>红涨 / 绿跌</span>':'<span>— 最新价</span><span>┄ 昨收价</span>';
 $('chartNote').textContent=chartMode==='daily'?'含模拟历史行情 · 最新 K 线随交易推进':'午间休市已压缩 · 推进时间以生成行情';$('volumeNote').textContent=chartMode==='daily'?'成交量（股）':'当日成交 '+(x.volume/10000).toFixed(1)+' 万股';
}
function formatTime(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function advance(){
 const tradeCount=game.s.trades.length,newsCount=game.s.news.length;
 if(!game.step())return;save();render();
 if(game.s.trades.length>tradeCount)toast('有 '+(game.s.trades.length-tradeCount)+' 笔委托成交，已更新持仓。');
 if(game.s.news.length>newsCount)toast('盘中快讯已更新，看看市场情报。');
 if(game.time===690){stopAuto();toast('午间休市。点击「进入午盘」继续。');}
 if(game.time===900){stopAuto();showReport(game.s.finished?'final':'daily');}
}
function startNext(){if(game.nextDay()){closeModal();save();render();toast('第 '+game.s.day+' 个交易日开盘。昨日买入股份已解锁。');}}
function showReport(type='review'){
 const s=game.s,pnl=game.equity-10000000,ret=pnl/100000,daily=game.equity-s.dayStart,isFinal=type==='final',isDaily=type==='daily',title=isFinal?'终章 · 你的二十日交易手记':isDaily?'第 '+s.day+' 日 · 收盘复盘':'我的复盘 · 每一笔都有回声';
 const rank=ret>=10?'市场新星':ret>=3?'初露锋芒':ret>=0?'平稳着陆':ret>=-10?'交了一点学费':'风浪中的幸存者';
 const benchmark=s.stocks.reduce((sum,x)=>sum+x.price/x.base-1,0)/8*100;
 modal(title,`<div class="report-top"><div class="intro-kicker">${isDaily?'TODAY’S CLOSE':'MY TRADING DIARY'}</div><div class="big ${color(isDaily?daily:pnl)}">${isDaily?money(daily,true):percent(ret)}</div><h4>${isFinal?rank:isDaily?'今天也认真地走到了收盘。':'收益之外，也看看过程。'}</h4><p>${isDaily?'今日资产变化':'累计收益率'} · 总资产 ¥ ${money(game.equity)}</p></div><div class="report-metrics"><div><small>成交笔数</small><strong>${s.trades.length} 笔</strong></div><div><small>最大回撤</small><strong>${(s.maxDrawdown*100).toFixed(2)}%</strong></div><div><small>累计费用</small><strong>¥ ${money(s.totalFees)}</strong></div></div><div class="equity-chart"><canvas id="equityCanvas" aria-label="账户资产曲线"></canvas></div><p class="small muted">账户曲线：初始资产、每日收盘资产与当前资产。虚拟等权股票篮子累计收益 ${percent(benchmark)}；你的累计收益 ${percent(ret)}。</p><div class="onboarding"><b>${isFinal?'这一次，你留下了什么？':'小满的复盘便签'}</b><br>${s.trades.length===0?'你选择了观望。现金没有波动，但也没有参与市场的涨跌。':s.totalFees>Math.abs(pnl)&&pnl<0?'交易费用已经超过目前净亏损的金额。频繁交易之前，先算一算每笔的成本。':game.marketValue/game.equity>.8?'你的仓位超过八成，接下来的一点风吹草动，都会更直接地影响账户。':'看看每一次买入的理由，是否仍然成立。收益不是唯一值得复盘的数字。'}<br><small class="muted">${isFinal?'最终资产按收盘市值计价，未强制卖出，含未实现盈亏。':isDaily?'当日剩余委托已失效；下一交易日开始后，今日买入的股份才可卖出。':'浮动盈亏未扣除未来卖出费用。'}</small></div><div class="modal-actions"><button class="btn" data-modal="export">导出存档</button>${isDaily?'<button class="btn btn-dark" data-modal="next">下一交易日 →</button>':isFinal?'<button class="btn" data-modal="close">查看账户</button><button class="btn btn-dark" data-modal="reset">再开一局 →</button>':'<button class="btn btn-dark" data-modal="close">回到交易室</button>'}</div>`);
 requestAnimationFrame(drawEquity);
}
function drawEquity(){const c=$('equityCanvas');if(!c)return;const r=fitCanvas(c);if(!r)return;const {ctx,w,h}=r,values=[...game.s.equity];if(game.time!==900)values.push(game.equity);if(values.length===1)values.push(values[0]);const max=Math.max(...values)*1.002,min=Math.min(...values)*.998,left=15,right=w-70,top=12,bottom=h-24,y=v=>top+(max-v)/(max-min)*(bottom-top);ctx.font='10px Consolas,monospace';for(let i=0;i<3;i++){let v=min+(max-min)*i/2;ctx.strokeStyle='#d3d6c7';ctx.beginPath();ctx.moveTo(left,y(v));ctx.lineTo(right,y(v));ctx.stroke();ctx.fillStyle='#8c927e';ctx.fillText(money(v),right+7,y(v)+3);}ctx.strokeStyle=game.equity>=10000000?'#bd5342':'#398871';ctx.lineWidth=2;ctx.beginPath();values.forEach((v,i)=>{const xx=left+i/(values.length-1)*(right-left);i?ctx.lineTo(xx,y(v)):ctx.moveTo(xx,y(v));});ctx.stroke();ctx.fillStyle='#858d76';ctx.fillText('开始',left,h-5);ctx.fillText('现在',right-22,h-5);}
function rules(){modal('交易手册 · 先读规则，再入市场',`<p>这是一个<strong>沪深主板普通 A 股竞价交易</strong>的简化模拟。你有 10 万元本金和 20 个交易日；最后以账户总资产计算成绩。所有公司、行情、新闻和历史 K 线均为虚构。</p><div class="rule-grid"><div class="rule-card"><strong>01 / T+1</strong><p>当天买入的股票，在下一交易日才能卖出。卖出所得资金可在本游戏中继续买股。</p></div><div class="rule-card"><strong>02 / 一手 100 股</strong><p>买入为 100 股的整数倍，单笔最多 100 万股。卖出不足一手的余股需一次卖完。报价精确到分。</p></div><div class="rule-card"><strong>03 / 涨跌幅 ±10%</strong><p>以昨日收盘价计算涨跌停价，四舍五入到分。封涨停时买单可能排队；封跌停时卖单可能无法成交。</p></div><div class="rule-card"><strong>04 / 交易时段</strong><p>9:30—11:30、13:00—14:57 连续竞价；14:57—15:00 收盘集合竞价，不可撤单。午休不撮合。</p></div></div><h4>如何开始</h4><ol><li>选择自选列表中的股票，观察日 K、分时和模拟快讯。</li><li>下单区选择买入，输入 100 股。「对手价」会以当前对手报价提交限价单；自定义限价可等待更合适的价格。</li><li>点「推进 5 分钟」或「自动」，观察成交与盈亏。「结束今日」会继续处理当日委托并推进至收盘。</li><li>进入下一交易日，昨日买入股份解锁；20 日收盘查看最终成绩。</li></ol><h4>费用与委托</h4><p>本局约定佣金为成交额的 <b>0.03%（万三），单笔最低 5 元</b>，属于模拟券商设定，并非所有券商的统一费率。另计双向过户费 <b>0.001%（十万分之一）</b>；卖出计印花税 <b>0.05%（万五）</b>。各项四舍五入至分。佣金视为已含经手费等，不再重复收取。</p><p>买单冻结委托金额及预计费用，卖单冻结可卖股份。允许撤销未成交委托；剩余委托仅当日有效。连续竞价限价申报还受有效报价范围约束：买价上限取基准价 102% 与基准价加 0.10 元的较高者；卖价下限取基准价 98% 与基准价减 0.10 元的较低者。</p><h4>试玩版的简化范围</h4><p>以「第 N 个交易日」推进，不映射真实日历。每个行情节点约 5 分钟，午休直接跳过。开盘价格由模拟生成；收盘竞价使用统一模拟收盘价。盘口为简化的买一卖一报价，满足价格条件时整笔成交，未模拟完整订单簿、部分成交、真实排队、市场冲击及网络延迟；封板时缺少对应对手盘。未纳入开盘集合竞价下单、盘后固定价格交易、ST、科创板、创业板、北交所、新股、停牌、分红除权、融资融券及出入金。</p><h4>规则参考</h4><p class="small"><a href="https://www.sse.com.cn/lawandrules/sselawsrules2025/trade/universal/c/c_20260424_10816492.shtml" target="_blank" rel="noopener">上海证券交易所交易规则（2026 年修订）↗</a><br><a href="https://docs.static.szse.cn/www/lawrules/rule/trade/current/W020260424690713155663.pdf" target="_blank" rel="noopener">深圳证券交易所交易规则（2026 年修订）↗</a><br><a href="https://shanghai.chinatax.gov.cn/zcfw/rdwd/202309/t468612.html" target="_blank" rel="noopener">税务总局：证券交易印花税减半征收 ↗</a></p><p class="small muted">这是规则体验游戏，不接入真实交易。漫画角色「林小满」为原创，采用黑白网点与少量朱红的金融心理漫画视觉。</p><div class="modal-actions"><button class="btn" data-modal="saves">存档管理</button><button class="btn btn-dark" data-modal="close">明白了，回到交易室 →</button></div>`);}
function saveDialog(){modal('存档管理 · 把今天留住',`<p>游戏会自动保存在当前浏览器。换浏览器、移动 HTML 文件或清理浏览器数据前，请先导出存档。</p><div class="rule-card"><strong>第 ${game.s.day} / 20 个交易日 · ${game.timeText}</strong><p>总资产 ¥ ${money(game.equity)} · 成交 ${game.s.trades.length} 笔</p></div><div class="save-row"><button class="btn btn-dark" data-modal="export">导出进度 JSON</button><button class="btn" data-modal="import">导入存档</button></div><p class="small muted">导入会替换当前进度。重开一局会清除本局自动存档。</p><div class="modal-actions"><button class="btn" data-modal="reset">重新开局</button><button class="btn btn-dark" data-modal="close">继续交易</button></div>`);}
function exportSave(){const blob=new Blob([JSON.stringify({game:game.s,selected},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='拟股喵喵-第'+game.s.day+'日存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast('已导出当前进度。');}
function resetDialog(){modal('重新开局',`<p>当前自动存档将被新一局替换。新的市场走势也会重新生成。</p><div class="modal-actions"><button class="btn" data-modal="export">先导出存档</button><button class="btn" data-modal="close">继续当前一局</button><button class="btn btn-red" data-modal="confirmReset">确认重开</button></div>`);}
function requestClose(){if(game.s.finished)return showReport('final');if(game.time===900)return startNext();modal('快进至今日收盘',`<p>将从 <b>${game.timeText}</b> 推进到 <b>15:00</b>。期间价格继续变化，符合条件的未成交委托仍会撮合。</p><p>当前有 <b>${game.pending.length}</b> 笔待成交委托。收盘后，未成交部分自动失效。</p><div class="modal-actions"><button class="btn" data-modal="close">继续盯盘</button><button class="btn btn-dark" data-modal="closeDay">确认，收盘复盘 →</button></div>`);}
$('tradeForm').addEventListener('submit',e=>{e.preventDefault();const raw=Number($('priceInput').value);if($('orderMode').value==='limit'&&Math.abs(raw*100-Math.round(raw*100))>1e-6){toast('价格最小变动单位为 0.01 元。',true);return;}const result=game.submit(selected,side,Number($('qtyInput').value),currentPrice());toast(result.message,!result.ok);if(result.ok){holdTab=result.order.status==='pending'?'orders':'positions';save();render();}});
$('watchList').addEventListener('click',e=>{const b=e.target.closest('[data-stock]');if(b)selectStock(Number(b.dataset.stock));});
$('buyTab').onclick=()=>setSide('buy');$('sellTab').onclick=()=>setSide('sell');
$('orderMode').onchange=()=>{if($('orderMode').value==='limit')$('priceInput').value=price(game.s.stocks[selected].price);renderTicket();};
$('qtyInput').oninput=renderTicket;$('priceInput').oninput=renderTicket;
$('qtyMinus').onclick=()=>{$('qtyInput').value=Math.max(100,(Number($('qtyInput').value)||100)-100);renderTicket();};$('qtyPlus').onclick=()=>{$('qtyInput').value=Math.min(1000000,(Number($('qtyInput').value)||0)+100);renderTicket();};
document.querySelectorAll('[data-ratio]').forEach(b=>b.onclick=()=>{const max=side==='buy'?game.maxBuy(selected,currentPrice()||1):game.available(selected),ratio=Number(b.dataset.ratio);$('qtyInput').value=side==='sell'&&ratio===1?max:Math.floor(max*ratio/100)*100;renderTicket();});
document.querySelectorAll('[data-chart]').forEach(b=>b.onclick=()=>{chartMode=b.dataset.chart;document.querySelectorAll('[data-chart]').forEach(x=>x.classList.toggle('active',x===b));drawChart();});
document.querySelectorAll('[data-hold]').forEach(b=>b.onclick=()=>{holdTab=b.dataset.hold;renderHoldings();});
$('holdContent').addEventListener('click',e=>{const cancel=e.target.closest('[data-cancel]'),sell=e.target.closest('[data-sell-stock]');if(cancel){const result=game.cancel(Number(cancel.dataset.cancel));toast(result.message,!result.ok);save();render();}if(sell){selectStock(Number(sell.dataset.sellStock));setSide('sell');$('qtyInput').value=game.available(selected)||100;renderTicket();$('ticket').scrollIntoView({behavior:'smooth',block:'center'});}if(e.target.closest('[data-first-trade]')){$('ticket').scrollIntoView({behavior:'smooth',block:'center'});$('qtyInput').focus();}});
$('stepBtn').onclick=()=>{stopAuto();advance();};$('closeBtn').onclick=requestClose;
$('autoBtn').onclick=()=>{if(autoTimer){stopAuto();return;}$('autoBtn').textContent='Ⅱ 暂停';autoTimer=setInterval(advance,2500);};
$('navTrade').onclick=()=>{closeModal();window.scrollTo({top:0,behavior:'smooth'});};$('navRules').onclick=rules;$('navReview').onclick=()=>showReport();$('reviewLink').onclick=()=>showReport();$('saveMenu').onclick=saveDialog;
$('modalClose').onclick=closeModal;$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
$('modalBody').addEventListener('click',e=>{const action=e.target.closest('[data-modal]')?.dataset.modal;if(!action)return;if(action==='close')closeModal();if(action==='next')startNext();if(action==='export')exportSave();if(action==='saves')saveDialog();if(action==='import')$('importFile').click();if(action==='reset')resetDialog();if(action==='confirmReset'){game=new StockGame();selected=0;side='buy';holdTab='positions';$('qtyInput').value=100;$('orderMode').value='best';closeModal();save();render();toast('新的一局开始。十万元，又是无限可能。');}if(action==='closeDay'){game.closeDay();save();render();showReport(game.s.finished?'final':'daily');}});
$('importFile').onchange=async()=>{const file=$('importFile').files[0];if(!file)return;try{if(file.size>3000000)throw Error('存档文件过大。');const data=JSON.parse(await file.text()),candidate=StockGame.restore(JSON.stringify(data.game));if(!confirm('导入将替换当前进度。确认导入这个第 '+candidate.s.day+' 日的存档？'))return;game=candidate;selected=Number.isInteger(data.selected)&&data.selected>=0&&data.selected<8?data.selected:0;side='buy';holdTab='positions';closeModal();save();render();toast('进度已恢复。');}catch(e){toast('导入失败：'+e.message,true);}finally{$('importFile').value='';}};
$('priceChart').addEventListener('mousemove',e=>{if(!chartGeometry)return;const r=$('priceChart').getBoundingClientRect(),xx=e.clientX-r.left,g=chartGeometry,i=Math.floor((xx-g.left)/g.dx),b=chartBars[i],t=$('chartTooltip');if(!b||xx>g.right||xx<g.left){t.style.display='none';return;}t.innerHTML=chartMode==='daily'?`${esc(b.label)}<br>开 ${price(b.o)}　收 ${price(b.c)}<br>高 ${price(b.h)}　低 ${price(b.l)}<br>量 ${(b.v/10000).toFixed(1)} 万股`:`${esc(b.label)}<br>价格 ${price(b.c)}`;t.style.display='block';t.style.left=Math.max(0,Math.min(r.width-150,xx+10))+'px';t.style.top='10px';});$('priceChart').onmouseleave=()=>{$('chartTooltip').style.display='none';};
new ResizeObserver(()=>{drawChart();drawEquity();}).observe($('priceChart').parentElement);
window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();});
render();save();if(saveError)toast('旧存档无法读取或存储受限。建议使用「存档管理」保存进度。',true);
