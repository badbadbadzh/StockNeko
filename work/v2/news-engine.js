'use strict';
const NewsEngine={
 templates:[
  {type:'宏观',title:'央行下调政策利率，关注信贷传导',body:'融资成本有望下降，市场仍在评估需求能否跟上。银行息差与地产融资可能面临不同影响。',scope:'market',sign:1,strength:.018,sectors:{3:-.35,7:1.6,2:1.2}},
  {type:'宏观',title:'通胀读数高于预期，成本压力升温',body:'最新价格数据引发对成本和政策空间的讨论，资源与下游制造商反应可能分化。',scope:'market',sign:-1,strength:.016,sectors:{8:-.8,2:1.4,4:1.2}},
  {type:'宏观',title:'经济增长数据超出市场预估',body:'工业生产和消费同步改善，投资者开始重新评估企业盈利。',scope:'market',sign:1,strength:.02},
  {type:'宏观',title:'新一轮刺激政策公布，重点支持设备更新',body:'政策着重支持产业升级，执行进度和项目回报仍有待观察。',scope:'market',sign:1,strength:.025,sectors:{6:1.7,7:1.3}},
  {type:'宏观',title:'国际贸易摩擦升级，出口企业面临不确定性',body:'部分商品可能面临新增限制，供应链企业正在评估替代市场。',scope:'market',sign:-1,strength:.026,sectors:{0:1.5,6:1.4,4:.6}},
  {type:'宏观',title:'短期资金价格上行，市场关注流动性',body:'机构融资需求集中，部分投资者降低风险敞口。',scope:'market',sign:-1,strength:.025},
  {type:'行业',sector:1,title:'AI 推理效率取得进展，商业化讨论升温',body:'行业发布新的模型优化方案，算力需求和软件收费模式可能重新分配。',scope:'sector',sign:1,strength:.035},
  {type:'行业',sector:0,title:'芯片交付周期延长，供应链出现紧张迹象',body:'部分产品报价抬升，客户库存与扩产计划仍是关键变量。',scope:'sector',sign:1,strength:.027},
  {type:'行业',sector:2,title:'新能源补贴方案调整，行业进入新一轮竞争',body:'补贴转向效率和技术指标，头部企业与中小厂商可能出现分化。',scope:'sector',sign:-1,strength:.03},
  {type:'行业',sector:5,title:'药物研究公布阶段进展，临床验证仍待完成',body:'早期数据带来新的研发方向，距离审批和商业收入仍有距离。',scope:'sector',sign:1,strength:.038},
  {type:'行业',sector:7,title:'重点城市调整住房政策',body:'购房和融资条件调整，成交回暖的持续性成为市场关注焦点。',scope:'sector',sign:1,strength:.04},
  {type:'行业',sector:8,title:'国际能源报价上涨，上下游利润预期分化',body:'资源企业和高能耗企业面临不同成本变化，企业套期保值安排受到关注。',scope:'sector',sign:1,strength:.03,spillSector:2,spill:-.5},
  {type:'公司',title:'{name}公布季度财报',body:'收入有所增长，但利润率和现金流表现与市场预期存在差异。',scope:'stock',sign:1,strength:.035,fundamental:true},
  {type:'公司',title:'{name}公告高管离职',body:'公司表示日常经营正常，管理交接与战略延续性仍受到关注。',scope:'stock',sign:-1,strength:.03},
  {type:'公司',title:'{name}发布新产品',body:'新产品进入试销阶段，用户反馈和订单转化将决定后续表现。',scope:'stock',sign:1,strength:.035},
  {type:'公司',title:'{name}签署长期供应协议',body:'合同约定分批履行，最终收入取决于客户需求和实际交付。',scope:'stock',sign:1,strength:.045,fundamental:true},
  {type:'公司',sector:5,title:'{name}研发项目未达关键指标',body:'公司重新评估研发路径，部分投入可能面临减值。',scope:'stock',sign:-1,strength:.07,fundamental:true},
  {type:'公司',title:'{name}披露财务事项调查',body:'有关事项尚待查明，公司将持续披露调查进展。股票可能短暂停牌。',scope:'stock',sign:-1,strength:.065,halt:true,fundamental:true},
  {type:'公司',title:'{name}获得新一轮融资支持',body:'资金计划用于项目建设，融资成本与未来回报仍待评估。',scope:'stock',sign:1,strength:.03,fundamental:true},
  {type:'市场',title:'市场传闻：{name}或有重要合作',body:'消息来自市场讨论，尚未获得公司正式确认，请留意后续公告。',scope:'stock',sign:1,strength:.05,rumor:true},
  {type:'市场',title:'短线抛售放大，部分资金回避风险',body:'多只股票同时承压，成交放大，投资者正在重新调整仓位。',scope:'market',sign:-1,strength:.035},
  {type:'市场',title:'机构调仓窗口临近，蓝筹成交活跃',body:'大型资金调整组合，交易量增加不一定代表基本面发生变化。',scope:'sector',sector:3,sign:1,strength:.02},
  {type:'市场',title:'热门板块轮动，资金尝试新的方向',body:'市场关注的主题出现变化，原先的强势股与新主题可能此消彼长。',scope:'sector',sign:1,strength:.03},
  {type:'市场',title:'投资者情绪出现反转，观点分歧扩大',body:'前期一致的交易方向正在分化，价格波动可能加剧。',scope:'market',sign:-1,strength:.024}
 ],
 age(g){return (g.s.day-1)*242+g.s.tick;},
 startDay(g){g.s.effects=g.s.effects.filter(e=>e.expires>this.age(g));this.clarify(g);if(g.s.config.newsFrequency>0)this.generate(g);},
 minute(g){this.clarify(g);if(g.time===780)return;const freq=g.s.config.newsFrequency;if(freq>0&&g.rand()<freq*.009)this.generate(g);g.s.effects=g.s.effects.filter(e=>e.expires>this.age(g));},
 generate(g,templateIndex=null){
  const t=this.templates[templateIndex??Math.floor(g.rand()*this.templates.length)],sector=t.sector??Math.floor(g.rand()*10),list=g.s.stocks.filter(x=>x.sectorId===sector),stock=list[Math.floor(g.rand()*list.length)],age=this.age(g),r=MarketEngine.regime(g);
  const credibility=t.rumor?.35+g.rand()*.3:.78+g.rand()*.2,expectation=g.normal()*.8,surprise=t.sign*(.9+g.normal()*.3)-expectation;
  const duration=Math.round(140+g.rand()*500),strength=t.strength*surprise*credibility*r.impact;
  const stockIds=t.scope==='stock'?[stock.id]:t.scope==='sector'?list.map(x=>x.id):g.s.stocks.map(x=>x.id);
  const news={id:++g.s.sequence,day:g.s.day,time:g.s.tick===0?'盘前':g.timeText,type:t.type,title:t.title.replaceAll('{name}',stock.name),body:t.body,scope:t.scope,sectors:t.scope==='market'?[]:[sector],stocks:stockIds,severity:Math.abs(t.strength)>=.05?'重大':Math.abs(t.strength)>=.03?'关注':'常规',duration:Math.ceil(duration/242),potential:t.scope==='market'?'可能改变市场风险偏好与估值预期':t.scope==='sector'?'可能影响相关行业供需和盈利预期':'可能影响公司估值及交易情绪',rumor:!!t.rumor,status:t.rumor?'待核实':'已发布'};
  g.s.news.unshift(news);if(g.s.news.length>500)g.s.news.length=500;
  const multipliers={};for(const x of g.s.stocks){let factor=stockIds.includes(x.id)?1:0;if(t.scope==='market')factor=t.sectors?.[x.sectorId]??1;if(t.spillSector===x.sectorId)factor=t.spill;multipliers[x.id]=factor;}
  g.s.effects.push({id:news.id,start:age,expires:age+duration,strength,duration,multipliers});
  if(t.rumor){news.clarifyAt=age+Math.round(100+g.rand()*450);news.truth=g.rand()>.6;}
  if(t.fundamental){stock.eps=Math.max(.01,stock.eps*(1+surprise*.08));stock.fair=Math.max(1,Math.round(stock.fair*(1+surprise*.025)));stock.financialHealth=Math.max(5,Math.min(99,stock.financialHealth+Math.round(surprise*4)));}
  if(t.halt&&g.rand()<.45)stock.haltedUntil=g.s.day;
  return news;
 },
 impact(g,x){const age=this.age(g);let impact=0;for(const e of g.s.effects){if(e.expires<=age)continue;const elapsed=age-e.start,decay=Math.exp(-elapsed/(e.duration*.38)),factor=e.multipliers[x.id]||0;impact+=e.strength*factor*x.sensitivity*decay/65;}return impact;},
 clarify(g){const age=this.age(g);for(const n of g.s.news.slice()){if(!n.rumor||n.status!=='待核实'||n.clarifyAt>age)continue;n.status=n.truth?'已证实':'已澄清';const x=g.s.stocks[n.stocks[0]],old=g.s.effects.find(e=>e.id===n.id);if(old)old.expires=age;
   const news={id:++g.s.sequence,day:g.s.day,time:g.timeText,type:'澄清',title:x.name+(n.truth?'确认合作进入磋商阶段':'澄清：未签署传闻中的重大协议'),body:n.truth?'公司表示尚处早期协商，具体规模和落地时间仍不确定。':'公司提示投资者以正式披露为准，前期市场讨论与实际情况存在偏差。',scope:'stock',sectors:[x.sectorId],stocks:[x.id],severity:'关注',duration:1,potential:'市场将重新评估此前传闻及已反映在价格中的预期',status:'已发布',rumor:false};g.s.news.unshift(news);
   g.s.effects.push({id:news.id,start:age,expires:age+180,strength:n.truth?.012:-.04,duration:180,multipliers:{[x.id]:1}});
  }}
};
if(typeof module!=='undefined')module.exports=NewsEngine;
