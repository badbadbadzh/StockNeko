'use strict';
const Analytics={
 portfolio(g){const total=g.equity,holdings=g.s.stocks.filter(x=>g.position(x.id).qty>0).map(x=>{const p=g.position(x.id),value=p.qty*x.price;return {id:x.id,name:x.name,sector:x.sector,sectorId:x.sectorId,qty:p.qty,available:g.available(x.id),cost:p.cost,value,pnl:value-p.cost,weight:value/Math.max(1,total)};});const sectors=StockDatabase.sectors.map((s,i)=>({name:s.name,value:holdings.filter(x=>x.sectorId===i).reduce((a,x)=>a+x.value,0)})).filter(x=>x.value);return {holdings,sectors,exposure:g.marketValue/Math.max(1,total),concentration:Math.max(0,...holdings.map(x=>x.weight)),unrealized:holdings.reduce((a,x)=>a+x.pnl,0),beta:holdings.reduce((a,x)=>a+x.weight*g.s.stocks[x.id].beta,0)};},
 behavior(g,day=g.s.day){const trades=g.s.trades.filter(t=>t.day===day),orders=new Set(trades.map(t=>t.orderId)),buys=trades.filter(t=>t.side==='buy'),chasing=new Set(buys.filter(t=>t.changeAtTrade>.03).map(t=>t.orderId)),revenge=buys.filter(t=>t.lossStreakBefore>=2&&t.exposureAfter-t.exposureBefore>.15),p=this.portfolio(g),out=[];
  out.push(`今日成交涉及 ${orders.size} 笔委托，共 ${trades.length} 笔分笔成交；其中 ${chasing.size} 笔买入发生在当日涨幅超过 3% 之后。`);
  const tech=p.holdings.filter(x=>[0,1,2].includes(x.sectorId)).reduce((a,x)=>a+x.weight,0);if(tech>.5)out.push(`科技相关持仓占总资产 ${(tech*100).toFixed(1)}%，行业相关风险较集中。`);
  if(p.concentration>.4)out.push(`最大单只股票占总资产 ${(p.concentration*100).toFixed(1)}%，一家公司会显著影响账户。`);
  if(revenge.length)out.push(`连续亏损后，有 ${revenge.length} 次买入使仓位一次增加超过 15 个百分点，请回看当时的理由。`);
  if(orders.size>=10)out.push('今日交易较频繁，最低佣金与反复换仓会累积成本。');
  if(!trades.length)out.push('今日没有成交，观察也是一种选择。');return out;
 },
 dailyReport(g){const s=g.s,p=this.portfolio(g),trades=s.trades.filter(t=>t.day===s.day),sectors=StockDatabase.sectors.map((x,i)=>{const list=s.stocks.filter(x=>x.sectorId===i);return {name:x.name,change:list.reduce((a,x)=>a+x.price/x.prev-1,0)/list.length};}).sort((a,b)=>b.change-a.change);
  const contributions=s.stocks.map(x=>{const old=s.dayStartPositions?.[x.id],pos=g.position(x.id),flow=trades.filter(t=>t.stock===x.id).reduce((a,t)=>a+(t.side==='sell'?t.value-t.fees.total:-t.value-t.fees.total),0);return {id:x.id,name:x.name,pnl:pos.qty*x.price-(old?.qty||0)*x.prev+flow};}).filter(x=>x.pnl!==0).sort((a,b)=>b.pnl-a.pnl);
  return {day:s.day,equity:g.equity,change:g.equity-s.dayStart,return:(g.equity-s.dayStart)/s.dayStart,realized:s.realized-s.dayRealizedStart,unrealized:p.unrealized,drawdown:s.dayDrawdown,orders:new Set(trades.map(t=>t.orderId)).size,fills:trades.length,fees:s.totalFees-s.dayFeesStart,indices:s.market.indices.map(x=>({name:x.name,change:x.value/x.prev-1})),strongest:sectors[0],weakest:sectors.at(-1),best:contributions[0]||null,worst:contributions.at(-1)||null,analysis:this.behavior(g),news:s.news.filter(n=>n.day===s.day).slice(0,5).map(n=>n.title)};
 },
 challenge(g){const s=g.s,ret=g.equity/s.initialCash-1,done=s.day>=20&&g.time===900,hasTrade=s.trades.some(t=>t.side==='buy'),days=Object.keys(s.diaries).length;const conditions={bear:{name:'熊市生存',text:'20 日结束时资产不低于本金 95%，最大回撤不超过 12%，至少买入一次。',pass:ret>=-.05&&s.maxDrawdown<=.12&&hasTrade},tech:{name:'科技专注',text:'仅买入芯片、AI 和新能源；完成 20 日，收益不低于 3%，至少买入一次。',pass:ret>=.03&&hasTrade},value:{name:'低波动价值',text:'仅买入合规低波动股票；20 日收益不低于 0，最大回撤低于 5%，至少买入一次。',pass:ret>=0&&s.maxDrawdown<.05&&hasTrade},crash:{name:'崩盘求生',text:'第 10 日遭遇恐慌状态；完成 20 日，资产不低于初始本金 80%，至少买入一次。',pass:s.market.panicSeen&&ret>=-.2&&hasTrade},comeback:{name:'逆风资金管理',text:'从 8 万元起步，背景本金 10 万；20 日达到 8.8 万，最大回撤不超过 10%，记录至少 3 天日记。',pass:g.equity>=8800000&&s.maxDrawdown<=.1&&days>=3&&hasTrade}};const c=conditions[s.config.challenge];return c?{...c,completed:done,success:done&&c.pass}:null;},
 ending(g){const s=g.s,ret=g.equity/s.initialCash-1,dd=s.maxDrawdown,st=s.stats,p=this.portfolio(g);let name,body;
  if(g.equity<s.initialCash*.2){name='资金困局';body='本金已严重受损。这是模拟中的破产结局，账户没有负债，但重建资金需要更严格的边界。';}
  else if(ret>=.08&&dd<.08&&st.discipline>=75&&s.trades.length>=4){name='职业交易员';body='收益、回撤与执行纪律共同支撑了结果。你开始形成自己的交易方法。';}
  else if(st.discipline<45||s.trades.length>100){name='过度投机者';body='你频繁追逐市场波动。无论盈亏，成本与冲动都在记录里留下了痕迹。';}
  else if(st.maxExposure>.9&&dd>.08){name='激进交易员';body='你让账户充分暴露在市场中，也承受了与之对应的波动。';}
  else if(dd<.05&&st.discipline>=75){name='稳健投资者';body='你守住了风险边界。耐心和仓位管理，也构成了这份交易手记。';}
  else{name='市场幸存者';body='你经历了判断、误判与变化，仍然保有继续出发的资金和经验。';}
  return {name,body,ret,drawdown:dd,discipline:st.discipline,challenge:this.challenge(g)};
 }
};
if(typeof module!=='undefined')module.exports=Analytics;
