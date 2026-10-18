'use strict';
const OrderEngine={
 active:o=>['pending','partial'].includes(o.status),
 fees(g,value,side){const c=g.s.config,commission=value?Math.max(c.minCommission,Math.round(value*c.commission)):0,transfer=Math.round(value*c.transfer),stamp=side==='sell'?Math.round(value*c.stamp):0;return {commission,transfer,stamp,total:commission+transfer+stamp};},
 reserve(g,o){if(!this.active(o)||o.side!=='buy')return 0;const remaining=o.qty-o.filledQty,total=this.fees(g,o.filledValue+remaining*o.price,o.side).total;return remaining*o.price+Math.max(0,total-o.paidFees);},
 reject(g,message,args){const o={id:++g.s.sequence,stock:args.id,side:args.side,type:args.type,qty:args.qty,price:args.price,status:'rejected',reason:message,filledQty:0,filledValue:0,paidFees:0,day:g.s.day,time:g.timeText};g.s.orders.push(o);return {ok:false,message,order:o};},
 submit(g,id,side,qty,price,type='limit',trigger=null){
  const fail=msg=>this.reject(g,msg,{id:Number.isInteger(id)&&g.s.stocks[id]?id:0,side:['buy','sell'].includes(side)?side:'buy',qty:Number.isSafeInteger(qty)&&qty>0?qty:0,price:Number.isSafeInteger(price)&&price>0?price:0,type:['market','limit','stop','take'].includes(type)?type:'limit'});
  if(!Number.isInteger(id)||!g.s.stocks[id])return fail('请选择有效股票。');
  if(!['buy','sell'].includes(side)||!['market','limit','stop','take'].includes(type))return fail('委托类型无效。');
  if(g.s.finished||g.time>=900)return fail('本交易日已结束，请在下一交易日提交。');
  const x=g.s.stocks[id],c=g.s.config,lot=c.lot;
  if(x.haltedUntil>=g.s.day)return fail('该股票当前停牌，不接受新委托。');
  if(!Number.isSafeInteger(qty)||qty<=0||qty>1000000)return fail('请输入正整数股数，单笔最多 100 万股。');
  if(side==='buy'&&qty%lot!==0)return fail('买入必须为 '+lot+' 股的整数倍。');
  if(side==='sell'&&qty%lot!==0&&qty!==g.available(id))return fail('不足一手的卖出余额须一次卖完。');
  if(!c.advanced&&type!=='limit')return fail('本局未启用高级订单。');
  if(c.mode==='story'&&g.s.day<4&&['stop','take'].includes(type))return fail('条件委托将在第 4 个交易日解锁。');
  if(['stop','take'].includes(type)&&side!=='sell')return fail('止损和止盈是持仓卖出条件单。');
  if(c.challenge==='tech'&&side==='buy'&&![0,1,2].includes(x.sectorId))return fail('科技挑战只允许买入芯片、人工智能与新能源股票。');
  if(c.challenge==='value'&&side==='buy'&&(![3,4,8].includes(x.sectorId)||x.volatility>.027))return fail('价值挑战仅允许低波动的金融、消费和资源股。');
  const lim=g.limits(id),q=g.quote(id);
  if(type==='market'){if(g.time>=897)return fail('收盘集合竞价不接受本游戏的市价单，请使用限价单。');price=side==='buy'?lim.up:lim.down;}
  if(['stop','take'].includes(type)){trigger=trigger??price;if(!Number.isSafeInteger(trigger)||trigger<lim.down||trigger>lim.up)return fail('触发价须在当日涨跌停范围内。');price=lim.down;}
  if(!Number.isSafeInteger(price)||price<lim.down||price>lim.up)return fail('委托价须在当日涨跌停范围内，最小单位为 0.01 元。');
  if(type==='limit'&&g.time<897){const buyBase=q.ask??q.bid??x.price,sellBase=q.bid??q.ask??x.price;
   if(side==='buy'&&price>Math.round(Math.max(buyBase*1.02,buyBase+10)))return fail('买价高于连续竞价有效报价上限。');
   if(side==='sell'&&price<Math.round(Math.min(sellBase*.98,sellBase-10)))return fail('卖价低于连续竞价有效报价下限。');}
  if(side==='buy'&&qty*price+this.fees(g,qty*price,side).total>g.freeCash)return fail('可用资金不足；市价单按涨停保护价预留资金。');
  if(side==='sell'&&qty>g.available(id))return fail(x&&g.position(id).qty>g.position(id).available?'可卖数量不足：今日买入的股份受 T+1 限制。':'可卖数量不足，部分股份可能被委托冻结。');
  const o={id:++g.s.sequence,stock:id,side,qty,price,type,trigger,triggered:!['stop','take'].includes(type),filledQty:0,filledValue:0,paidFees:0,status:'pending',day:g.s.day,time:g.timeText,reason:'',fillPrice:null};
  g.s.orders.push(o);this.match(g);
  return {ok:true,order:o,message:o.status==='filled'?'委托已全部成交。':o.status==='partial'?'已部分成交，剩余数量继续等待。':g.time===690?'午间委托已受理，13:00 后开始撮合。':type==='stop'||type==='take'?'条件单已提交，达到触发条件后尝试卖出。':'委托已提交，等待价格及流动性条件。'};
 },
 cancel(g,id){const o=g.s.orders.find(o=>o.id===id);if(!o||!this.active(o))return {ok:false,message:'该委托已不能撤销。'};if(g.time>=897&&g.time<900)return {ok:false,message:'收盘集合竞价期间不可撤单。'};o.status='cancelled';o.reason='主动撤单';return {ok:true,message:'剩余委托已撤销，冻结资金或股份已释放。'};},
 match(g,{closing=false,boundary=false}={}){
  if(g.s.finished||(!closing&&((g.time===690&&!boundary)||g.time>=897)))return;
  const orders=g.pending.sort((a,b)=>a.stock-b.stock||a.side.localeCompare(b.side)||(a.side==='buy'?b.price-a.price:a.price-b.price)||a.id-b.id);
  for(const o of orders){const x=g.s.stocks[o.stock];if(x.haltedUntil>=g.s.day)continue;const lim=g.limits(o.stock),q=g.quote(o.stock);
   if(!o.triggered){if(o.type==='stop'?x.price<=o.trigger:x.price>=o.trigger){o.triggered=true;o.triggerTime=g.timeText;}else continue;}
   const p=closing?((o.side==='buy'&&x.price===lim.up)||(o.side==='sell'&&x.price===lim.down)?null:x.price):o.side==='buy'?q.ask:q.bid;
   if(p===null||(o.side==='buy'?p>o.price:p<o.price))continue;
   const depthKey=o.side==='buy'?'depthSell':'depthBuy',depth=x[depthKey],remaining=o.qty-o.filledQty,lot=g.s.config.lot;
   let qty=Math.min(remaining,Math.floor(depth/lot)*lot);if(remaining<lot&&depth>=remaining)qty=remaining;if(qty<=0)continue;
   const value=p*qty,allFees=this.fees(g,o.filledValue+value,o.side),oldFees=this.fees(g,o.filledValue,o.side),fees={commission:allFees.commission-oldFees.commission,transfer:allFees.transfer-oldFees.transfer,stamp:allFees.stamp-oldFees.stamp,total:allFees.total-o.paidFees};
   const pos=g.s.positions[o.stock]??={qty:0,available:0,cost:0,firstDay:g.s.day};let realized=0;
   if(o.side==='buy'){if(g.s.cash<value+fees.total)throw Error('结算资金不足');if(pos.qty===0)pos.firstDay=g.s.day;pos.qty+=qty;pos.cost+=value+fees.total;if(!g.s.config.t1)pos.available+=qty;g.s.cash-=value+fees.total;}
   else{if(pos.available<qty)throw Error('结算可卖股份不足');const cost=qty===pos.qty?pos.cost:Math.round(pos.cost*qty/pos.qty);pos.qty-=qty;pos.available-=qty;pos.cost-=cost;g.s.cash+=value-fees.total;realized=value-fees.total-cost;g.s.realized+=realized;}
   o.filledQty+=qty;o.filledValue+=value;o.paidFees+=fees.total;o.fillPrice=o.filledValue/o.filledQty;o.fillTime=g.timeText;o.status=o.filledQty===o.qty?'filled':'partial';x[depthKey]-=qty;g.s.totalFees+=fees.total;
   const trade={id:++g.s.sequence,orderId:o.id,stock:o.stock,side:o.side,qty,price:p,value,fees,realized,day:g.s.day,time:g.timeText,changeAtTrade:x.price/x.prev-1,exposureBefore:(g.marketValue+(o.side==='sell'?value:-value))/Math.max(1,g.equity),exposureAfter:g.marketValue/Math.max(1,g.equity),lossStreakBefore:g.s.stats.lossStreak};g.s.trades.push(trade);
   if(typeof EventManager!=='undefined')EventManager.onTrade(g,trade);
  }
  g.updateRisk();
 }
};
if(typeof module!=='undefined')module.exports=OrderEngine;
