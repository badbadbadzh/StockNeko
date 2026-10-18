'use strict';
if(typeof module!=='undefined'){global.pako=require('./v2/pako.min');global.StockDatabase=require('./v2/stock-database');global.QuoteProvider=require('./v2/quote-provider');global.MarketEngine=require('./v2/market-engine');global.Indicators=require('./v2/indicators');global.OrderEngine=require('./v2/order-engine');global.Analytics=require('./v2/analytics');global.NewsEngine=require('./v2/news-engine');global.EventManager=require('./v2/event-manager');global.SaveManager=require('./v2/save-manager');global.LifeEngine=require('./v3/life-engine');}
class StockGame {
  static VERSION = 3;
  static TIMES = [...Array.from({length:121},(_,i)=>570+i),...Array.from({length:121},(_,i)=>780+i)];
  static STOCKS = StockDatabase.stocks.map(x=>[x.name,x.code,x.sector,x.initialPrice,x.volatility/.02]);
  static defaults={mode:'endless',challenge:null,quoteMode:'sandbox',initialCash:10000000,days:20,volatility:1,newsFrequency:1,difficulty:'normal',commission:.0003,minCommission:500,stamp:.0005,transfer:.00001,t1:true,lot:100,limit:.1,advanced:true,confirmTrades:false,animations:true};
  constructor(seed=Date.now(),options={}) {
    const config={...StockGame.defaults,...options};
    this.s={version:3,rng:seed>>>0,narrativeRng:(seed^0x9e3779b9)>>>0,seed:seed>>>0,config,day:1,tick:0,cash:config.initialCash,initialCash:config.initialCash,positions:{},orders:[],trades:[],news:[],effects:[],stocks:[],sequence:0,totalFees:0,realized:0,peak:config.initialCash,maxDrawdown:0,dayStart:config.initialCash,dayPeak:config.initialCash,dayDrawdown:0,equity:[config.initialCash],finished:false,settledDays:[],reports:[],diaries:{},favorites:[300,0,1,2,3],recent:[300,0],emotions:{stress:20,confidence:45,greed:20,fear:20},events:[],achievements:[],unlocks:[],predictions:[],riskSignals:[],provider:null,market:null,ui:{},stats:{winningSales:0,losingSales:0,winSum:0,lossSum:0,lossStreak:0,winStreak:0,maxConcentration:0,maxExposure:0,discipline:100,recovered:false,peakDrawdown:0}};
    MarketEngine.initialize(this);if(typeof Companion!=='undefined')Companion.ensure(this);this.openDay();
  }
  rand(){let t=this.s.rng+=0x6D2B79F5;this.s.rng>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
  normal(){return (this.rand()+this.rand()+this.rand()+this.rand()-2)*1.7;}
  get time(){return StockGame.TIMES[this.s.tick];}
  get timeText(){return String(Math.floor(this.time/60)).padStart(2,'0')+':'+String(this.time%60).padStart(2,'0');}
  get phase(){return this.s.finished?'本局结束':this.time===900?'已收盘':this.time===690?'午间休市':this.time>=897?'收盘集合竞价':'连续竞价';}
  get canOrder(){return !this.s.finished&&this.time<900&&QuoteProvider.isPlayable(this);}
  limits(id){const x=this.s.stocks[id];return {up:Math.round(x.prev*(1+this.s.config.limit)),down:Math.max(1,Math.round(x.prev*(1-this.s.config.limit)))};}
  quote(id){const x=this.s.stocks[id],lim=this.limits(id);if(x.haltedUntil>=this.s.day)return {ask:null,bid:null};return {ask:x.price>=lim.up?null:Math.min(lim.up,x.price+1),bid:x.price<=lim.down?null:Math.max(lim.down,x.price-1)};}
  fees(value,side){return OrderEngine.fees(this,value,side);}
  get pending(){return this.s.orders.filter(OrderEngine.active);}
  get frozen(){return this.pending.reduce((sum,o)=>sum+OrderEngine.reserve(this,o),0);}
  get freeCash(){return this.s.cash-this.frozen;}
  position(id){return this.s.positions[id]||{qty:0,available:0,cost:0,firstDay:0};}
  available(id){return this.position(id).available-this.pending.filter(o=>o.side==='sell'&&o.stock===id).reduce((a,o)=>a+o.qty-o.filledQty,0);}
  get marketValue(){return this.s.stocks.reduce((a,x)=>a+x.price*this.position(x.id).qty,0);}
  get equity(){return this.s.cash+this.marketValue;}
  maxBuy(id,price){const lot=this.s.config.lot;if(!Number.isFinite(price)||price<1)return 0;let n=Math.max(0,Math.min(Math.floor(1000000/lot),Math.floor(this.freeCash/(price*lot))));while(n>0&&price*n*lot+this.fees(price*n*lot,'buy').total>this.freeCash)n--;return n*lot;}
  submit(id,side,qty,price,type='limit',trigger=null){return OrderEngine.submit(this,id,side,qty,price,type,trigger);}
  cancel(id){return OrderEngine.cancel(this,id);}
  match(closing=false){OrderEngine.match(this,{closing});}
  updateRisk(){const s=this.s,eq=this.equity;s.peak=Math.max(s.peak,eq);const dd=(s.peak-eq)/Math.max(1,s.peak);s.maxDrawdown=Math.max(s.maxDrawdown,dd);s.dayPeak=Math.max(s.dayPeak,eq);s.dayDrawdown=Math.max(s.dayDrawdown,(s.dayPeak-eq)/Math.max(1,s.dayPeak));const p=Analytics.portfolio(this);s.stats.maxExposure=Math.max(s.stats.maxExposure,p.exposure);s.stats.maxConcentration=Math.max(s.stats.maxConcentration,p.concentration);if(s.stats.peakDrawdown>.08&&eq>=s.peak)s.stats.recovered=true;s.stats.peakDrawdown=Math.max(s.stats.peakDrawdown,dd);}
  addNews(){if(typeof NewsEngine!=='undefined')NewsEngine.generate(this);}
  openDay(){
    LifeEngine.ensure(this);
    for(const pos of Object.values(this.s.positions))pos.available=pos.qty;
    this.s.dayStart=this.equity;this.s.dayPeak=this.equity;this.s.dayDrawdown=0;this.s.dayStartPositions=JSON.parse(JSON.stringify(this.s.positions));this.s.dayFeesStart=this.s.totalFees;this.s.dayRealizedStart=this.s.realized;this.s.tick=0;
    MarketEngine.opening(this);
    if(typeof NewsEngine!=='undefined')NewsEngine.startDay(this);else this.addNews();
    if(typeof EventManager!=='undefined')EventManager.startDay(this);
    this.updateRisk();
  }
  step(){
    if(this.s.finished||this.time>=900||!QuoteProvider.isPlayable(this))return false;
    this.s.tick++;
    if(typeof NewsEngine!=='undefined')NewsEngine.minute(this);
    if(this.time!==780)MarketEngine.minute(this);
    if(typeof OrderEngine!=='undefined')OrderEngine.match(this,{closing:this.time===900,boundary:this.time===690});else if(this.time===900)this.match(true);else this.match();
    this.updateRisk();
    if(typeof EventManager!=='undefined')EventManager.minute(this);
    if(this.time===900)this.settleDay();
    return true;
  }
  advance(minutes=5){let count=0;while(count<minutes&&this.time<900&&!this.s.finished){if(!this.step())break;count++;if(this.time===690||this.s.events.some(e=>e.status==='pending'&&e.blocking))break;}return count;}
  settleDay(){
    if(this.s.settledDays.includes(this.s.day))return;
    for(const o of this.pending){o.status='expired';o.reason='收盘失效';}
    this.s.settledDays.push(this.s.day);this.s.equity.push(this.equity);if(this.s.equity.length>1001)this.s.equity.shift();
    if(typeof Analytics!=='undefined')this.s.reports.push(Analytics.dailyReport(this));
    const minimum=Math.min(...this.s.stocks.filter(x=>x.haltedUntil<this.s.day).map(x=>{const p=this.quote(x.id).ask??x.price,v=p*this.s.config.lot;return v+this.fees(v,'buy').total;}));if(this.marketValue===0&&this.pending.length===0&&Number.isFinite(minimum)&&this.s.cash<minimum){this.s.finished=true;this.s.endReason='交易资金耗尽：空仓且余额不足买入市场中最便宜的一手股票及费用。';}
    if(this.s.config.challenge&&this.s.day===20&&!this.s.challengeResult)this.s.challengeResult=Analytics.challenge(this);
    if(typeof EventManager!=='undefined')EventManager.endDay(this);
    if(typeof Companion!=='undefined'&&this.s.config.mode==='story')Companion.finish(this);
  }
  closeDay(){if(!QuoteProvider.isPlayable(this))return false;while(this.time<900&&!this.s.finished){if(!this.step())break;}return this.time===900;}
  nextDay(){if(this.s.finished||this.time!==900||this.s.config.mode==='story'&&this.s.day>=20)return false;for(const x of this.s.stocks){x.bars.push({...x.today});x.bars=x.bars.slice(-180);}this.s.day++;this.openDay();return true;}
  fundamentals(id){const x=this.s.stocks[id];return {marketCap:x.price*x.totalShares,pe:x.eps>0?x.price/100/x.eps:null,pb:x.price/100/x.bookValue,eps:x.eps,turnover:x.volume/x.floatShares};}
  serialize(){return JSON.stringify(this.s);}
  static restore(text){const s=typeof text==='string'?JSON.parse(text):structuredClone(text);if(typeof SaveManager!=='undefined')return SaveManager.restoreGame(s,StockGame);if(![2,3].includes(s.version)||!s.stocks?.length)throw Error('存档版本无法迁移。');const g=Object.create(StockGame.prototype);g.s=s;return g;}
}
if(typeof module!=='undefined')module.exports=StockGame;

