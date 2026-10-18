'use strict';
const MarketEngine={
 regimes:{
  bull:{name:'牛市',drift:.0018,vol:.85,corr:.48,volume:1.25,impact:1.05,next:['bull','sideways','bubble','recovery']},
  bear:{name:'熊市',drift:-.0016,vol:1.15,corr:.62,volume:.85,impact:1.2,next:['bear','sideways','panic','recovery']},
  sideways:{name:'震荡市',drift:0,vol:.8,corr:.35,volume:.85,impact:.85,next:['sideways','bull','bear','recovery']},
  panic:{name:'恐慌抛售',drift:-.0065,vol:2.05,corr:.88,volume:2.3,impact:1.7,next:['bear','recovery','panic']},
  bubble:{name:'投机泡沫',drift:.0032,vol:1.5,corr:.55,volume:1.9,impact:1.5,next:['bubble','bull','panic','sideways']},
  recovery:{name:'市场复苏',drift:.0012,vol:1.05,corr:.42,volume:1.1,impact:.95,next:['recovery','bull','sideways','bear']}
 },
  initialize(g){
  g.s.market={regime:'sideways',regimeDays:0,sentiment:.1,factor:0,sectorFactors:Array(10).fill(0),indices:[],indexHistory:[],regimeHistory:[],panicSeen:false,bursts:[],anomalies:[],blackSwans:[],provider:QuoteProvider.create(g.s.config)};g.s.provider=g.s.market.provider;
  g.s.stocks=StockDatabase.stocks.map(d=>({...d,price:d.initialPrice,prev:d.initialPrice,base:d.initialPrice,fair:d.initialPrice,momentum:0,bias:0,bars:[],minutes:[],points:[],volume:0,haltedUntil:0,depthBuy:0,depthSell:0}));
  // Correlated daily history: market + sector + independent company factors.
  const paths=g.s.stocks.map(x=>[{o:x.price,h:x.price,l:x.price,c:x.price,v:x.dailyVolume,label:'历史 1'}]);
  for(let d=1;d<90;d++){
   const market=g.normal()*.008,sectors=StockDatabase.sectors.map(()=>g.normal()*.009);
   for(const x of g.s.stocks){const a=paths[x.id],p=a.at(-1).c,r=market*x.beta+sectors[x.sectorId]*.7+g.normal()*x.volatility*.6+(x.growth-50)*.000015;
    const o=Math.max(100,Math.round(p*(1+g.normal()*.003))),c=Math.max(100,Math.round(p*Math.exp(Math.max(-.095,Math.min(.095,r))))),wiggle=Math.max(1,Math.round(p*x.volatility*(.1+g.rand()*.3)));
    a.push({o,h:Math.max(o,c)+wiggle,l:Math.max(1,Math.min(o,c)-wiggle),c,v:Math.round(x.dailyVolume*(.6+g.rand()*.9)),label:'历史 '+(d+1)});
   }
  }
  for(const x of g.s.stocks){const ratio=x.price/paths[x.id].at(-1).c;x.bars=paths[x.id].map(b=>({...b,o:Math.round(b.o*ratio),h:Math.round(b.h*ratio),l:Math.max(1,Math.round(b.l*ratio)),c:Math.round(b.c*ratio)}));}
  this.indices(g,true);
 },
 regime(g){return this.regimes[g.s.market.regime];},
 transition(g){const m=g.s.market;m.regimeDays++;const challenge=g.s.config.challenge;
  let target=null;if(g.s.day===1){target=challenge==='bear'?'bear':challenge==='crash'?'bubble':'sideways';}
  else if(challenge==='crash'&&g.s.day===10)target='panic';
  else if(m.regimeDays>=3&&g.rand()<.23){const opts=this.regime(g).next;target=opts[Math.floor(g.rand()*opts.length)];if(challenge==='bear'&&g.s.day<14&&target==='bull')target='bear';}
  if(target&&target!==m.regime){m.regime=target;m.regimeDays=0;m.regimeHistory.push({day:g.s.day,regime:target});}
  if(m.regime==='panic')m.panicSeen=true;
 },
 opening(g){
  this.transition(g);const m=g.s.market,r=this.regime(g),common=g.normal()*.0035*r.vol;
  for(const x of g.s.stocks){x.prev=x.price;const lim=g.limits(x.id),shock=(typeof NewsEngine!=='undefined'?NewsEngine.impact(g,x):0)*.15;
   x.price=this.bound(x.prev*Math.exp(common*x.beta+g.normal()*x.volatility*.14+r.drift*.25+shock),lim);
   x.today={o:x.price,h:x.price,l:x.price,c:x.price,v:0,label:'第 '+g.s.day+' 日',day:g.s.day};x.volume=0;x.minutes=[];x.points=[x.price];x.depthBuy=Math.max(100,Math.round(x.dailyVolume/240*.02/100)*100);x.depthSell=x.depthBuy;
  }
  this.indices(g,false,true);
 },
 bound(p,lim){return Math.min(lim.up,Math.max(lim.down,Math.max(1,Math.round(p))));},
  minute(g){
  if(!QuoteProvider.isPlayable(g)){return;}
  const m=g.s.market,r=this.regime(g),scale=g.s.config.volatility*(g.s.config.difficulty==='hard'?1.2:g.s.config.difficulty==='easy'?.8:1),minute=g.time;
  this.suddenMoves(g);
  m.factor=m.factor*.12+g.normal()*.0006*r.vol;
  m.sectorFactors=m.sectorFactors.map(v=>v*.25+g.normal()*.00075*r.vol);
  m.sentiment=Math.max(-1,Math.min(1,m.sentiment*.995+(m.regime==='bull'||m.regime==='bubble'?.001:m.regime==='panic'?-.004:0)+g.normal()*.005));
  for(const x of g.s.stocks){
   if(x.haltedUntil>=g.s.day){x.depthBuy=0;x.depthSell=0;continue;}
   const lim=g.limits(x.id),old=x.price,impact=typeof NewsEngine!=='undefined'?NewsEngine.impact(g,x):0;
   const market=m.factor*x.beta*r.corr,sector=m.sectorFactors[x.sectorId]*(1-r.corr)*.9,individual=g.normal()*x.volatility/Math.sqrt(240)*(1-r.corr*.7);
   const fundamentals=((x.financialHealth-65)*.000004+(x.growth-50)*.000005)/240;
   const mean=Math.log(x.fair/x.price)*.0005,momentum=x.momentum*.07*(m.regime==='bubble'?1.6:1);
   const burst=m.bursts.find(b=>b.stock===x.id&&b.remaining>0),burstReturn=burst?(burst.direction*(.022+g.rand()*.065)+g.normal()*.012):0;
   const ret=(market+sector+individual)*scale+r.drift/240+fundamentals+mean+momentum+m.sentiment*.000025+impact+burstReturn;
   const locked=old===lim.up||old===lim.down;
   if(burst||!locked||g.rand()>.63)x.price=this.bound(old*Math.exp(Math.max(-.16,Math.min(.16,ret))),lim);
   if(burst){burst.remaining--;if(g.rand()<.2)burst.direction*=-1;}
   x.momentum=.65*x.momentum+.35*Math.log(x.price/old);
   const edge=minute<600||minute>880?1.5:.8,v=Math.round(x.dailyVolume/240*r.volume*edge*(.45+g.rand())*(1+Math.abs(ret)*90)*(burst?3:1));
   x.volume+=v;const wiggle=Math.round(old*x.volatility/Math.sqrt(240)*g.rand()*.35);
   const bar={o:old,h:Math.min(lim.up,Math.max(old,x.price)+wiggle),l:Math.max(lim.down,Math.min(old,x.price)-wiggle),c:x.price,v,t:minute,day:g.s.day,label:g.timeText};
   x.minutes.push(bar);x.points.push(x.price);x.today.h=Math.max(x.today.h,bar.h);x.today.l=Math.min(x.today.l,bar.l);x.today.c=x.price;x.today.v=x.volume;
   // A limited share of simulated turnover is executable by the player per minute.
   x.depthBuy=Math.max(100,Math.floor(v*.025*(.6+g.rand())/100)*100);x.depthSell=Math.max(100,Math.floor(v*.025*(.6+g.rand())/100)*100);
  }
  this.indices(g);this.detectBlackSwan(g);
 },
 detectBlackSwan(g){const m=g.s.market,idx=m.indices[0],prev=idx?.prev||idx?.value||1000,move=idx?(idx.value/prev-1):0,volume=g.s.stocks.reduce((a,x)=>a+x.volume,0),last=m.blackSwans.at(-1);if(Math.abs(move)>.035||m.regime==='panic'||(volume>0&&volume>m.avgVolume*2)){if(!last||last.day!==g.s.day||last.time!==g.time){const item={id:++g.s.sequence,day:g.s.day,time:g.timeText,type:'风险预警',label:m.regime==='panic'?'恐慌状态':'市场异常波动',move,source:g.s.market.provider.mode==='sandbox'?'虚构沙盒指标':'行情快照',fictional:g.s.market.provider.mode==='sandbox'};m.blackSwans.push(item);g.s.riskSignals.unshift(item);if(g.s.riskSignals.length>100)g.s.riskSignals.length=100;}}m.avgVolume=volume;},
 suddenMoves(g){const m=g.s.market;m.bursts=m.bursts.filter(b=>b.remaining>0);if(g.rand()>.0035*g.s.config.volatility)return;
  const eligible=g.s.stocks.filter(x=>x.haltedUntil<g.s.day);if(!eligible.length)return;const low=eligible.filter(x=>x.price/x.prev<.94||x.price/x.fair<.65),high=eligible.filter(x=>x.price/x.prev>1.06);
  const pool=low.length&&g.rand()<.42?low:high.length&&g.rand()<.28?high:eligible,x=pool[Math.floor(g.rand()*pool.length)];
  // Deeply sold-off shares may rebound or continue falling; no guaranteed reversal.
  const probability=low.includes(x)?.62:high.includes(x)?.38:.5,direction=g.rand()<probability?1:-1;
  m.bursts.push({stock:x.id,direction,remaining:2+Math.floor(g.rand()*4)});m.anomalies.push({day:g.s.day,time:g.timeText,stock:x.id,price:x.price,direction});if(m.anomalies.length>100)m.anomalies.shift();
  g.s.news.unshift({id:++g.s.sequence,day:g.s.day,time:g.timeText,type:'异动',title:x.name+'盘中成交突然放大',body:'买卖盘出现集中变化，价格快速波动。异动可能延续，也可能在短时间内反转。',scope:'stock',sectors:[x.sectorId],stocks:[x.id],severity:'重大',duration:1,potential:'流动性与短期交易情绪正在变化',status:'已发布',rumor:false});
 },
 indices(g,initial=false,opening=false){
  const groups=[{id:'all',name:'综合市场',filter:()=>true},{id:'tech',name:'科技成长',filter:x=>[0,1,2].includes(x.sectorId)},{id:'value',name:'蓝筹价值',filter:x=>[3,4,8].includes(x.sectorId)}];
  const old=g.s.market.indices;
  g.s.market.indices=groups.map((z,i)=>{const list=g.s.stocks.filter(z.filter),base=list.reduce((a,x)=>a+x.base*x.floatShares,0),current=list.reduce((a,x)=>a+x.price*x.floatShares,0),yesterday=list.reduce((a,x)=>a+x.prev*x.floatShares,0);return {id:z.id,name:z.name,value:1000*current/base,prev:1000*yesterday/base,start:1000,members:list.map(x=>x.id)};});
  if(initial){g.s.market.indexHistory=g.s.market.indices.map(z=>({id:z.id,values:[{day:0,t:900,value:z.value}]}));}
  else for(const idx of g.s.market.indices){const h=g.s.market.indexHistory.find(h=>h.id===idx.id);h.values.push({day:g.s.day,t:g.time,value:idx.value});if(h.values.length>2500)h.values.splice(0,h.values.length-2500);}
 }
};
if(typeof module!=='undefined')module.exports=MarketEngine;
