'use strict';
const $=id=>document.getElementById(id),KEY=LocalProfiles.scope()+'state';
const money=(c,sign=false)=>(sign&&c>0?'+':'')+(c/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const price=c=>(c/100).toFixed(2),percent=n=>(n>0?'+':'')+n.toFixed(2)+'%',color=n=>n>0?'up':n<0?'down':'neutral';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game,selected=0,side='buy',chartMode='daily',holdTab='positions',autoTimer=null,saveError=false,chartBars=[],chartGeometry=null;
try{
 const data=JSON.parse(localStorage.getItem(KEY)||'null');
 if(data&&data.game){game=StockGame.restore(JSON.stringify(data.game));selected=Number.isInteger(data.selected)&&data.selected>=0&&data.selected<StockDatabase.stocks.length?data.selected:0;}
 else if(typeof SaveManager!=='undefined'){
  const legacy=SaveManager.load(StockGame);
  if(legacy&&legacy.game){game=legacy.game;selected=Number.isInteger(legacy.ui?.selected)&&legacy.ui.selected>=0&&legacy.ui.selected<StockDatabase.stocks.length?legacy.ui.selected:0;}
 }
}
catch(e){saveError=true;}
if(!game)game=new StockGame();
function save(){if(!LocalProfiles.current||!LocalVault.ready)return false;try{SaveManager.write(game,{selected});localStorage.removeItem(KEY);const serial=LocalVault.serial;$('saveStatus').textContent='正在保存…';LocalVault.flush().then(()=>{if(serial===LocalVault.serial)$('saveStatus').innerHTML='<i class="dot"></i> 进度已保存';},e=>{$('saveStatus').textContent='保存失败，请导出备份';if(!saveError){toast('本地保存失败：'+e.message,true);saveError=true;}});return true;}catch(e){$('saveStatus').textContent='未能保存';toast('保存失败：'+e.message,true);return false;}}
function toast(text,error=false){const el=document.createElement('div');el.className='toast '+(error?'error':'success');el.textContent=text;$('toasts').appendChild(el);while($('toasts').children.length>2)$('toasts').firstElementChild.remove();setTimeout(()=>el.remove(),4200);}
function stopAuto(){clearInterval(autoTimer);autoTimer=null;$('autoBtn').textContent='▷ 自动';}
function modal(title,html){stopAuto();$('modalTitle').textContent=title;$('modalBody').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function closeModal(){$('modal').close();}
function currentPrice(){if($('orderMode').value==='best'){const q=game.quote(selected);return (side==='buy'?q.ask:q.bid)??game.s.stocks[selected].price;}return Math.round(Number($('priceInput').value)*100);}
function renderWatchRows(){$('watchList').innerHTML=visibleStocks().map(st=>{const d=(st.price/st.prev-1)*100;return `<button class="stock-row ${st.id===selected?'active':''}" data-stock="${st.id}" aria-label="查看${st.name}" aria-pressed="${st.id===selected}"><span><span class="favorite-star" data-favorite="${st.id}" title="收藏 / 取消收藏">${(game.s.favorites||[]).includes(st.id)?'★':'☆'}</span><strong>${st.name}${game.position(st.id).qty?'<i class="holding-dot"></i>':''}</strong><small>${st.code}</small></span><span class="mono ${color(d)}">${price(st.price)}</span><span class="mono change ${color(d)}">${percent(d)}</span></button>`;}).join('');}
function render(){
 const s=game.s,x=s.stocks[selected],delta=game.equity-s.initialCash,change=x.price-x.prev,lim=game.limits(selected);
 $('dayChip').textContent='DAY '+String(s.day).padStart(2,'0')+' / ∞';$('clock').textContent=game.timeText;$('phase').textContent='● '+game.phase+' · 无尽虚拟交易日';$('dayProgress').style.width='100%';
 $('totalAsset').textContent='¥ '+money(game.equity);$('profit').textContent=money(delta,true);$('profit').className=color(delta);$('returnRate').textContent='收益率 '+percent(delta/Math.max(1,s.initialCash)*100);$('returnRate').className=color(delta);
 $('freeCash').textContent=money(game.freeCash);$('frozenCash').textContent='委托冻结 ¥ '+money(game.frozen);$('marketValue').textContent=money(game.marketValue);$('positionRatio').textContent='当前仓位 '+(game.marketValue/game.equity*100).toFixed(1)+'%'+(game.marketValue===0?' · 空仓也是选择':'');
 renderWatchRows();
 $('indexList').innerHTML=s.market.indices.map(i=>'<button class="index-button" data-index="'+i.id+'"><span>'+i.name+'</span><strong class="'+color(i.value-i.prev)+'">'+i.value.toFixed(2)+' '+percent((i.value/i.prev-1)*100)+'</strong></button>').join('');$('stockName').textContent=x.name;$('stockCode').textContent=x.code;$('stockSector').textContent=x.sector;$('lastPrice').textContent=price(x.price);$('priceChange').textContent=money(change,true)+'  '+percent(change/x.prev*100);$('chartPrice').className='chart-price '+color(change);
 $('quoteStats').innerHTML=[['今开',x.today.o],['昨收',x.prev],['最高',x.today.h],['最低',x.today.l]].map(([k,v])=>`<span>${k}<b>${price(v)}</b></span>`).join('');
 $('limitHint').textContent=price(lim.down)+' — '+price(lim.up);$('ticketStock').textContent=x.name;
 $('newsList').innerHTML=s.news.filter(n=>n.day===s.day).map(n=>`<article class="news-item"><div class="news-meta"><span>${esc(n.time)} · 模拟快讯</span><span class="${n.sign>0?'up':'down'}">${n.sign>0?'偏利好':'偏利空'}</span></div><h4>${esc(n.title)}</h4><p>${esc(n.body)}</p></article>`).join('')+'<p class="news-empty">消息会影响情绪，但市场总有自己的想法。</p>';
 $('positionCount').textContent=Object.values(s.positions).filter(p=>p.qty).length;$('orderCount').textContent=game.pending.length;$('realized').textContent=money(s.realized,true);$('realized').className=color(s.realized);$('totalFees').textContent=money(s.totalFees);
 
 let speech='先别急着梭哈。<br>看清楚，再下单！',mood='紧张，但清醒',tip='第一次买入试试 100 股。今天买的，明天才能卖。';
 if(s.trades.length){speech='账户里的数字，<br>可不是游戏……';mood='认真盯盘中';tip='买入成本包含费用。卖出前，记得检查「可卖」股数。';}
 if(delta>200000){speech='红色真好看。<br>也要记得风险！';mood='嘴角有点上扬';tip='浮盈会变化，仓位越集中，账户波动通常越大。';}
 if(delta< -200000){speech='深呼吸……<br>别被情绪带走。';mood='心跳有点快';tip='亏损不等于必须立刻加仓。先看看自己的可用资金。';}
 if(game.time===690){speech='午休了。<br>先吃饭，再看盘。';mood='暂时放下手机';tip='11:30—13:00 午间休市。点「进入午盘」继续。';}
 if(game.time>=897&&game.time<900){speech='最后三分钟。<br>现在不能撤单。';mood='等收盘的三分钟';tip='收盘集合竞价 14:57—15:00：允许限价申报，不接受撤单。';}
 if(game.time===900){speech='今天活下来了。<br>复盘，明天再战。';mood='终于松了口气';tip='今日未成交委托已失效。进入下一交易日后，今日买入股份解锁。';}
 if(s.finished){speech='资金见底了。<br>先复盘，再出发！';mood='交易资金耗尽';tip=s.endReason||'交易资金已不足以买入最便宜的一手股票。点击「查看最终成绩」复盘，或重新开局。';}
 $('coachTip').innerHTML='<b>喵喵的便签</b>　'+tip;
 $('stepBtn').disabled=s.finished||game.time===900;$('stepBtn').textContent=game.time===690?'进入午盘':game.time===895?'推进至 14:57':game.time===897?'推进至收盘':'推进 5 分钟';$('autoBtn').disabled=game.time===900||s.finished;$('closeBtn').textContent=s.finished?'查看资金报告 →':game.time===900?'下一交易日 →':'结束今日 →';
 renderHoldings();renderTicket();renderBulletin();requestAnimationFrame(drawChart);
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
function selectStock(id){game.s.recent=[id,...(game.s.recent||[]).filter(x=>x!==id)].slice(0,15);selected=id;$('priceInput').value=price(game.s.stocks[id].price);render();save();}
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
function drawChart(){ChartView.draw($('priceChart'),game,selected,{period:chartMode,indicator:$('indicatorSelect').value,volume:$('volumeToggle').checked});}
function formatTime(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function advance(){
 const tradeCount=game.s.trades.length,newsCount=game.s.news.length;
 if(!game.advance(game.time===895?2:game.time===897?3:5))return;save();render();
 if(game.s.trades.length>tradeCount)toast('有 '+(game.s.trades.length-tradeCount)+' 笔委托成交，已更新持仓。');
 if(game.s.news.length>newsCount)toast('盘中快讯已更新，看看市场情报。');
 if(game.time===690){stopAuto();toast('午间休市。点击「进入午盘」继续。');}
 if(game.time===900){stopAuto();showReport(game.s.finished?'final':'daily');}
}
function startNext(){if(game.nextDay()){closeModal();save();render();toast('第 '+game.s.day+' 个交易日开盘。昨日买入股份已解锁。');}}
function showReport(type='review'){
 const s=game.s,pnl=game.equity-s.initialCash,ret=pnl/s.initialCash*100,daily=game.equity-s.dayStart,isFinal=type==='final',isDaily=type==='daily',title=isFinal?'资金报告 · 你的无尽交易手记':isDaily?'第 '+s.day+' 日 · 收盘复盘':'我的复盘 · 每一笔都有回声';
 const rank=ret>=10?'市场新星':ret>=3?'初露锋芒':ret>=0?'平稳着陆':ret>=-10?'交了一点学费':'风浪中的幸存者';
 const benchmark=s.stocks.reduce((sum,x)=>sum+x.price/x.base-1,0)/Math.max(1,s.stocks.length)*100;
 modal(title,`<div class="report-top"><div class="intro-kicker">${isDaily?'TODAY’S CLOSE':'ENDLESS ACCOUNT REPORT'}</div><div class="big ${color(isDaily?daily:pnl)}">${isDaily?money(daily,true):percent(ret)}</div><h4>${isFinal?(s.endReason||rank):isDaily?'今天也认真地走到了收盘。':'收益之外，也看看过程。'}</h4><p>${isDaily?'今日资产变化':'累计收益率'} · 总资产 ¥ ${money(game.equity)}</p></div><div class="report-metrics"><div><small>交易日</small><strong>${s.day} 日</strong></div><div><small>最大回撤</small><strong>${(s.maxDrawdown*100).toFixed(2)}%</strong></div><div><small>累计费用</small><strong>¥ ${money(s.totalFees)}</strong></div></div><div class="equity-chart"><canvas id="equityCanvas" aria-label="账户资产曲线"></canvas></div><p class="small muted">账户曲线：每日收盘资产与当前资产。虚拟等权股票篮子累计收益 ${percent(benchmark)}；你的累计收益 ${percent(ret)}。</p><div class="onboarding"><b>${isFinal?'这一次，你留下了什么？':'喵喵的复盘便签'}</b><br>${s.trades.length===0?'你选择了观望。现金没有波动，但也没有参与市场的涨跌。':s.totalFees>Math.abs(pnl)&&pnl<0?'交易费用已经超过目前净亏损的金额。频繁交易之前，先算一算每笔的成本。':game.marketValue/game.equity>.8?'你的仓位超过八成，接下来的一点风吹草动，都会更直接地影响账户。':'看看每一次买入的理由，是否仍然成立。收益不是唯一值得复盘的数字。'}<br><small class="muted">${isFinal?'资金耗尽后停止推进；未强制卖出，资产含未实现盈亏。':isDaily?'当日剩余委托已失效；下一交易日开始后，今日买入的股份才可卖出。':'浮动盈亏未扣除未来卖出费用。'}</small></div><div class="modal-actions"><button class="btn" data-modal="export">导出存档</button>${isDaily?'<button class="btn btn-dark" data-modal="next">下一交易日 →</button>':isFinal?'<button class="btn" data-modal="close">查看账户</button><button class="btn btn-dark" data-modal="reset">再开一局 →</button>':'<button class="btn btn-dark" data-modal="close">回到交易室</button>'}</div>`);
 requestAnimationFrame(drawEquity);
}
function drawEquity(){const c=$('equityCanvas');if(!c)return;const r=fitCanvas(c);if(!r)return;const {ctx,w,h}=r,values=[...game.s.equity];if(game.time!==900)values.push(game.equity);if(values.length===1)values.push(values[0]);const max=Math.max(...values)*1.002,min=Math.min(...values)*.998,left=15,right=w-70,top=12,bottom=h-24,y=v=>top+(max-v)/(max-min)*(bottom-top);ctx.font='10px Consolas,monospace';for(let i=0;i<3;i++){let v=min+(max-min)*i/2;ctx.strokeStyle='#d3d6c7';ctx.beginPath();ctx.moveTo(left,y(v));ctx.lineTo(right,y(v));ctx.stroke();ctx.fillStyle='#8c927e';ctx.fillText(money(v),right+7,y(v)+3);}ctx.strokeStyle=game.equity>=10000000?'#bd5342':'#398871';ctx.lineWidth=2;ctx.beginPath();values.forEach((v,i)=>{const xx=left+i/(values.length-1)*(right-left);i?ctx.lineTo(xx,y(v)):ctx.moveTo(xx,y(v));});ctx.stroke();ctx.fillStyle='#858d76';ctx.fillText('开始',left,h-5);ctx.fillText('现在',right-22,h-5);}
function rules(){modal('交易手册 · 先读规则，再入市场',`<p>这是一个<strong>沪深主板普通 A 股竞价交易</strong>的简化模拟。你有 10 万元本金，可以一直玩到交易资金耗尽。所有公司、行情、新闻和历史 K 线均为虚构。</p><div class="rule-grid"><div class="rule-card"><strong>01 / T+1</strong><p>当天买入的股票，在下一交易日才能卖出。卖出所得资金可在本游戏中继续买股。</p></div><div class="rule-card"><strong>02 / 一手 100 股</strong><p>买入为 100 股的整数倍，单笔最多 100 万股。卖出不足一手的余股需一次卖完。报价精确到分。</p></div><div class="rule-card"><strong>03 / 涨跌幅 ±10%</strong><p>以昨日收盘价计算涨跌停价；一天内可能从接近跌停反弹到接近涨停，连续交易日也可能出现剧烈路径。</p></div><div class="rule-card"><strong>04 / 资金耗尽</strong><p>空仓、没有待成交委托，且现金不足买入最便宜股票的一手及费用时，本局停止推进。</p></div></div><h4>费用与委托</h4><p>本局约定佣金为成交额的 <b>0.03%（万三），单笔最低 5 元</b>，属于模拟券商设定；另计双向过户费和卖出印花税。支持限价、市价保护、止损、止盈和部分成交。</p><h4>行情说明</h4><p>价格由市场状态、行业因子、个股波动率、新闻冲击、动量和均值回归共同生成。随机异动可能带来急跌后反弹、连续跌停、低位拉升或冲高回落，不保证消息与价格同方向。</p><div class="modal-actions"><button class="btn" data-modal="saves">存档管理</button><button class="btn btn-dark" data-modal="close">明白了，回到交易室 →</button></div>`);}
function saveDialog(){modal('存档管理 · 把今天留住',`<p>游戏会自动保存到当前浏览器。你可以一直交易，直到资金耗尽。</p><div class="rule-card"><strong>第 ${game.s.day} 个交易日 · ${game.timeText}</strong><p>总资产 ¥ ${money(game.equity)} · 成交 ${game.s.trades.length} 笔 · 市场状态 ${esc(game.s.market.regime)}</p></div><div class="save-row"><button class="btn btn-dark" data-modal="export">导出进度 JSON</button><button class="btn" data-modal="import">导入存档</button></div><p class="small muted">导入会替换当前进度。重开一局会清除当前自动存档。</p><div class="modal-actions"><button class="btn" data-modal="reset">重新开局</button><button class="btn btn-dark" data-modal="close">继续交易</button></div>`);}
function exportSave(){const payload=SaveManager.pack({version:3,selected,ui:{selected},game:game.s}),blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='拟股喵喵-第'+game.s.day+'日存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast('已导出当前交易与生活进度。');}
function resetDialog(){modal('重新开局',`<p>当前自动存档将被新一局替换。新的市场走势也会重新生成。</p><div class="modal-actions"><button class="btn" data-modal="export">先导出存档</button><button class="btn" data-modal="close">继续当前一局</button><button class="btn btn-red" data-modal="confirmReset">确认重开</button></div>`);}
function requestClose(){if(game.s.finished)return showReport('final');if(game.time===900)return startNext();modal('快进至今日收盘',`<p>将从 <b>${game.timeText}</b> 推进到 <b>15:00</b>。期间价格继续变化，符合条件的未成交委托仍会撮合。</p><p>当前有 <b>${game.pending.length}</b> 笔待成交委托。收盘后，未成交部分自动失效。</p><div class="modal-actions"><button class="btn" data-modal="close">继续盯盘</button><button class="btn btn-dark" data-modal="closeDay">确认，收盘复盘 →</button></div>`);}
$('tradeForm').addEventListener('submit',e=>{e.preventDefault();submitTicket();});
$('watchList').addEventListener('click',e=>{const f=e.target.closest('[data-favorite]');if(f){const id=Number(f.dataset.favorite);game.s.favorites??=[];game.s.favorites=game.s.favorites.includes(id)?game.s.favorites.filter(x=>x!==id):[...game.s.favorites,id];save();render();return;}const b=e.target.closest('[data-stock]');if(b)selectStock(Number(b.dataset.stock));});
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
$('importFile').onchange=async()=>{const file=$('importFile').files[0];if(!file)return;try{if(file.size>3000000)throw Error('存档文件过大。');const data=JSON.parse(await file.text()),candidate=StockGame.restore(JSON.stringify(data.game));if(!confirm('导入将替换当前进度。确认导入这个第 '+candidate.s.day+' 日的存档？'))return;game=candidate;selected=Number.isInteger(data.selected)&&data.selected>=0&&data.selected<StockDatabase.stocks.length?data.selected:0;side='buy';holdTab='positions';closeModal();save();render();toast('进度已恢复。');}catch(e){toast('导入失败：'+e.message,true);}finally{$('importFile').value='';}};
$('priceChart').addEventListener('mousemove',e=>{const b=ChartView.hoverInfo(e,$('priceChart'));drawChart();const t=$('chartTooltip');if(!b){t.style.display='none';return;}t.innerHTML=esc(b.label)+'<br>开 '+price(b.o)+' 收 '+price(b.c)+'<br>高 '+price(b.h)+' 低 '+price(b.l)+'<br>量 '+b.v.toLocaleString()+' 股';t.style.display='block';t.style.left='12px';t.style.top='15px';});$('priceChart').onmouseleave=()=>{ChartView.hover=null;$('chartTooltip').style.display='none';drawChart();};$('priceChart').addEventListener('wheel',e=>{e.preventDefault();ChartView.size=Math.max(12,Math.min(240,ChartView.size+(e.deltaY>0?8:-8)));drawChart();},{passive:false});
$('indicatorSelect').onchange=drawChart;$('volumeToggle').onchange=drawChart;
$('fundamentalsBtn').onclick=()=>{const x=game.s.stocks[selected],f=game.fundamentals(selected);modal(x.name+' · 公司档案','<p>'+esc(x.description)+'</p><div class="company-metrics">'+[['总市值',(f.marketCap/1e10).toFixed(2)+' 亿'],['总股本',(x.totalShares/1e8).toFixed(2)+' 亿股'],['流通股',(x.floatShares/1e8).toFixed(2)+' 亿股'],['PE',f.pe.toFixed(2)],['PB',f.pb.toFixed(2)],['EPS',x.eps.toFixed(3)+' 元'],['Beta',x.beta.toFixed(2)],['年化参考波动',(x.volatility*Math.sqrt(244)*100).toFixed(1)+'%'],['换手率',(f.turnover*100).toFixed(2)+'%'],['财务健康',x.financialHealth+'/100'],['成长性',x.growth+'/100'],['关注度',x.attention+'/100']].map(([k,v])=>'<div>'+k+'<b>'+v+'</b></div>').join('')+'</div><p class="small muted">市值、PE 与 PB 随最新股价更新，基本面为虚拟模型参数。</p>');};
$('indexList').onclick=e=>{const id=e.target.closest('[data-index]')?.dataset.index;if(!id)return;const x=game.s.market.indices.find(x=>x.id===id),history=game.s.market.indexHistory.find(x=>x.id===id);modal(x.name+' · 成分股加权指数','<p>以成分股流通股本加权，基期 1000 点。当前 '+x.value.toFixed(2)+'，日涨跌 '+percent((x.value/x.prev-1)*100)+'。</p><div style="height:240px"><canvas id="indexCanvas"></canvas></div>');requestAnimationFrame(()=>ChartView.lineChart($('indexCanvas'),history.values.map(x=>x.value)));};
new ResizeObserver(()=>{drawChart();drawEquity();}).observe($('priceChart').parentElement);
window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();});
let universe='all',bulletinMode='news';
const PLAYER_CHARACTER='__PLAYER_CHARACTER__';
function renderBulletin(){document.querySelectorAll('[data-bulletin]').forEach(b=>b.classList.toggle('active',b.dataset.bulletin===bulletinMode));const n=game.s.news[0];$('bulletinContent').innerHTML=bulletinMode==='story'?'<div class="bulletin-empty"><span class="bulletin-rule"></span><strong>市场故事由更多菜单打开。</strong><small>虚构剧情会明确标识，不会修改真实行情。</small><span class="bulletin-rule"></span></div>':n?'<div class="bulletin-news"><small>'+esc(n.time)+' · '+esc(n.type)+' · '+esc(n.status||'已发布')+'</small><h4>'+esc(n.title)+'</h4><p>'+esc(n.body)+'</p><p class="small muted">'+esc(n.potential||'本条消息不会自动改写行情。')+'</p></div>':'<div class="bulletin-empty"><span class="bulletin-rule"></span><strong>新的市场故事即将发生。</strong><small>无授权行情源时不会伪装成实时同步。</small><span class="bulletin-rule"></span></div>';}
document.querySelectorAll('[data-bulletin]').forEach(b=>b.onclick=()=>{bulletinMode=b.dataset.bulletin;renderBulletin();});
function visibleStocks(){let list=game.s.stocks.filter(x=>(x.name+x.code).toLowerCase().includes($('stockSearch').value.trim().toLowerCase())&&($('sectorFilter').value==='all'||x.sector===$('sectorFilter').value));if(universe==='favorites')list=list.filter(x=>(game.s.favorites||[]).includes(x.id));if(universe==='recent')list=list.filter(x=>(game.s.recent||[]).includes(x.id));const mode=$('stockSort').value;return list.sort((a,b)=>mode==='up'?(b.price/b.prev-a.price/a.prev):mode==='down'?(a.price/a.prev-b.price/b.prev):mode==='volume'?b.volume-a.volume:mode==='cap'?b.price*StockDatabase.stocks[b.id].totalShares-a.price*StockDatabase.stocks[a.id].totalShares:universe==='recent'?game.s.recent.indexOf(a.id)-game.s.recent.indexOf(b.id):a.id-b.id);}
$('sectorFilter').innerHTML+=[...new Set(StockDatabase.stocks.map(x=>x.sector))].map(s=>'<option>'+s+'</option>').join('');
$('stockSearch').oninput=render;$('sectorFilter').onchange=render;$('stockSort').onchange=render;document.querySelectorAll('[data-universe]').forEach(b=>b.onclick=()=>{universe=b.dataset.universe;document.querySelectorAll('[data-universe]').forEach(x=>x.classList.toggle('active',x===b));render();});
render();if(saveError)toast('旧存档无法读取或存储受限。建议使用「存档管理」保存进度。',true);

