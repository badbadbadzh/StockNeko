'use strict';
const EventManager={
 random(g){let t=g.s.narrativeRng+=0x6D2B79F5;g.s.narrativeRng>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;},
 clamp(g){for(const k of Object.keys(g.s.emotions))g.s.emotions[k]=Math.max(0,Math.min(100,g.s.emotions[k]));g.s.stats.discipline=Math.max(0,Math.min(100,g.s.stats.discipline));},
 startDay(g){const s=g.s,e=s.emotions;e.stress*=.93;e.fear*=.94;e.greed*=.97;
  for(const [day,key] of [[1,'基础交易'],[4,'条件委托'],[6,'传闻与澄清'],[11,'风险复盘'],[16,'终局观察']])if(s.day>=day&&!s.unlocks.includes(key))s.unlocks.push(key);
  for(const event of s.events){if(event.status==='chosen'&&event.day<s.day-1){const x=s.stocks[event.stock];event.status='resolved';event.resultPrice=x.price;event.resultReturn=x.price/event.referencePrice-1;event.resultText=`选择之后，该股票变动 ${(event.resultReturn*100).toFixed(2)}%。这是行情观察结果；实际账户后果以你确认的成交为准。`;}}
  if(s.day===1)this.create(g,'discipline');
  else if([4,6,11,16].includes(s.day)||this.random(g)<.28)this.create(g);
 },
 create(g,kind=null){const s=g.s,p=Analytics.portfolio(g);if(s.events.some(e=>e.day===s.day&&e.status==='pending'))return;
  const sorted=[...s.stocks].sort((a,b)=>b.price/b.prev-a.price/a.prev),id=p.holdings.length&&s.emotions.fear>50?p.holdings[0].id:sorted[Math.floor(this.random(g)*Math.min(10,sorted.length))].id,x=s.stocks[id];
  kind??=s.market.regime==='panic'?'panic':s.emotions.confidence>70?'confidence':p.unrealized<0?'aversion':s.day>=6&&s.news.some(n=>n.rumor&&n.status==='待核实')?'herd':'fomo';
  const templates={
   discipline:{title:'第一天，先和自己约定',body:'市场已经开盘。你可以先写下仓位边界，也可以从一笔小交易熟悉规则。',psychology:'交易纪律',choices:[['plan','先定最大单股三成的计划'],['observe','先观察，不急着行动'],['prepareBuy','准备 100 股体验单']]},
   fomo:{title:'一夜暴富的机会？',body:`${x.name}进入市场关注名单。讨论区越来越热闹，错过的感觉开始出现。你准备如何回应？`,psychology:'错失恐惧 FOMO',choices:[['prepareBuy','研究后准备小额买单'],['observe','继续观察后续公告'],['prepareSell','检查相关持仓，考虑减持']]},
   panic:{title:'屏幕突然一起变绿',body:'抛售正在扩散。迅速退出与等待反弹都有不确定性，你想先做什么？',psychology:'恐慌性抛售',choices:[['prepareSell','检查可卖仓位，准备减持'],['observe','核对基本面，暂不操作'],['plan','先复核风险预算']]},
   aversion:{title:'只要不卖，就不算亏？',body:`持仓的浮亏让你反复看向成本价。对 ${x.name} 的判断，还是买入那天的判断吗？`,psychology:'损失厌恶',choices:[['prepareSell','准备减仓，重新评估'],['observe','暂时持有，写下理由'],['prepareBuy','重新研究后准备加仓']]},
   confidence:{title:'最近的判断好像都对了',body:'连续的好结果让大仓位显得顺理成章。你会把下一笔交易放大吗？',psychology:'过度自信',choices:[['prepareBuy','准备一笔新的买单'],['plan','维持原来的风险预算'],['observe','暂停一下，先复盘']]},
   herd:{title:'所有人都在谈论同一条消息',body:'一条尚未证实的传闻反复出现在讨论中。消息出现得越多，是否就越可信？',psychology:'羊群效应',choices:[['prepareBuy','跟踪相关股票，准备买单'],['observe','等待公司正式回应'],['plan','记录假设和退出条件']]}
  };const t=templates[kind];s.events.unshift({id:++s.sequence,day:s.day,time:g.timeText,stock:id,referencePrice:x.price,kind,...t,status:'pending',blocking:false});if(s.events.length>100)s.events.length=100;
 },
 choose(g,id,choice){const e=g.s.events.find(e=>e.id===id);if(!e||e.status!=='pending'||!e.choices.some(c=>c[0]===choice))return null;e.status='chosen';e.choice=choice;e.choiceDay=g.s.day;e.referencePrice=g.s.stocks[e.stock].price;const em=g.s.emotions;
  if(choice==='plan'){em.stress-=5;em.greed-=4;g.s.stats.discipline+=3;g.s.riskPlan={maxSingle:.3,day:g.s.day};}
  if(choice==='observe'){em.fear-=2;em.stress-=3;}
  if(choice==='prepareBuy'){em.greed+=5;em.confidence+=3;}
  if(choice==='prepareSell'){em.fear+=3;em.stress-=1;}
  this.clamp(g);return {stock:e.stock,side:choice==='prepareBuy'?'buy':choice==='prepareSell'?'sell':null,psychology:e.psychology};
 },
 onTrade(g,t){const s=g.s,st=s.stats,em=s.emotions;
  if(t.side==='sell'){if(t.realized>0){st.winningSales++;st.winSum+=t.realized;st.winStreak++;st.lossStreak=0;em.confidence+=3;em.greed+=2;em.stress-=2;}else if(t.realized<0){st.losingSales++;st.lossSum-=t.realized;st.lossStreak++;st.winStreak=0;em.stress+=4;em.fear+=4;em.confidence-=3;}}
  if(t.side==='buy'&&t.changeAtTrade>.03){em.greed+=2;st.discipline-=1;}
  if(t.side==='buy'&&t.lossStreakBefore>=2&&t.exposureAfter-t.exposureBefore>.15){st.discipline-=5;em.stress+=5;}
  if(s.riskPlan&&Analytics.portfolio(g).concentration>s.riskPlan.maxSingle+.01){st.discipline-=2;}
  this.clamp(g);this.achievements(g);
 },
 minute(g){const p=Analytics.portfolio(g),em=g.s.emotions,dd=(g.s.peak-g.equity)/g.s.peak;em.stress+=p.exposure*.006+dd*.04;em.fear+=dd*.015;if(g.s.market.regime==='panic')em.stress+=p.exposure*.015;this.clamp(g);},
 award(g,id,name,text){if(g.s.achievements.some(a=>a.id===id))return;g.s.achievements.push({id,name,text,day:g.s.day});},
 achievements(g){const s=g.s,p=Analytics.portfolio(g);if(s.stats.winningSales)this.award(g,'profit','第一笔盈利','完成一次盈利卖出。');if(p.sectors.length>=4)this.award(g,'diverse','分散的种子','同时持有至少四个行业的股票。');if(p.holdings.some(x=>s.day-g.position(x.id).firstDay>=5))this.award(g,'hold','耐心持有','连续持有一只股票至少五个交易日。');if(s.stats.recovered)this.award(g,'comeback','重回高点','从超过 8% 的回撤恢复到历史资产高点。');if(s.day>=20&&s.maxDrawdown<.05&&s.trades.length)this.award(g,'risk','风险管理者','至少经历二十日，最大回撤低于 5%。');if(s.day>=20&&s.market.panicSeen)this.award(g,'survivor','风暴之后','经历恐慌市场并度过至少二十日。');},
 endDay(g){this.achievements(g);this.clamp(g);},
 mood(g){const e=g.s.emotions;return e.stress>70?'先喘口气，再做决定。':e.fear>65?'把担心写下来，看看依据。':e.greed>65?'机会很多，资金只有一份。':e.confidence>75?'顺风时，也记得风险边界。':'先想清楚，再按下确认。';}
};
if(typeof module!=='undefined')module.exports=EventManager;
