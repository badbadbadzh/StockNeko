const fs=require('fs');let e=fs.readFileSync('work/engine.js','utf8');
e=e.replace("global.StockDatabase=require('./v2/stock-database');","{global.StockDatabase=require('./v2/stock-database');global.MarketEngine=require('./v2/market-engine');global.Indicators=require('./v2/indicators');}");
e=e.replace('static VERSION = 1','static VERSION = 2').replace(/static TIMES = [^;]+;/,'static TIMES = [...Array.from({length:121},(_,i)=>570+i),...Array.from({length:121},(_,i)=>780+i)];');
const a=e.indexOf('  constructor('),b=e.indexOf('  rand(){');
e=e.slice(0,a)+`  static defaults={mode:'story',challenge:null,initialCash:10000000,days:20,volatility:1,newsFrequency:1,difficulty:'normal',commission:.0003,minCommission:500,stamp:.0005,transfer:.00001,t1:true,lot:100,limit:.1,advanced:true,confirmTrades:false,animations:true};
  constructor(seed=Date.now(),options={}) {
    const config={...StockGame.defaults,...options};
    this.s={version:2,rng:seed>>>0,narrativeRng:(seed^0x9e3779b9)>>>0,seed:seed>>>0,config,day:1,tick:0,cash:config.initialCash,initialCash:config.initialCash,positions:{},orders:[],trades:[],news:[],effects:[],stocks:[],sequence:0,totalFees:0,realized:0,peak:config.initialCash,maxDrawdown:0,dayStart:config.initialCash,dayPeak:config.initialCash,dayDrawdown:0,equity:[config.initialCash],finished:false,settledDays:[],reports:[],diaries:{},favorites:[0,1,2,3,4,5,6,7],recent:[0],emotions:{stress:20,confidence:45,greed:20,fear:20},events:[],achievements:[],unlocks:[],ui:{},stats:{winningSales:0,losingSales:0,winSum:0,lossSum:0,lossStreak:0,winStreak:0,maxConcentration:0,maxExposure:0,discipline:100,recovered:false,peakDrawdown:0}};
    MarketEngine.initialize(this);this.openDay();
  }
`+e.slice(b);
e=e.replace("get phase(){return this.s.finished?'挑战结束':", "get phase(){return this.s.finished?'本局结束':");
e=e.replace('x.prev*1.1','x.prev*(1+this.s.config.limit)').replace('x.prev*.9','x.prev*(1-this.s.config.limit)');
e=e.replace('const x=this.s.stocks[id],lim=this.limits(id);return {ask:', 'const x=this.s.stocks[id],lim=this.limits(id);if(x.haltedUntil>=this.s.day)return {ask:null,bid:null};return {ask:');
const start=e.indexOf('  openDay(){'),end=e.indexOf('  serialize(){');
e=e.slice(0,start)+`  openDay(){
    for(const pos of Object.values(this.s.positions))pos.available=pos.qty;
    this.s.dayStart=this.equity;this.s.dayPeak=this.equity;this.s.dayDrawdown=0;this.s.dayStartPositions=JSON.parse(JSON.stringify(this.s.positions));this.s.dayFeesStart=this.s.totalFees;this.s.dayRealizedStart=this.s.realized;this.s.tick=0;
    MarketEngine.opening(this);
    if(typeof NewsEngine!=='undefined')NewsEngine.startDay(this);else this.addNews();
    if(typeof EventManager!=='undefined')EventManager.startDay(this);
    this.updateRisk();
  }
  step(){
    if(this.s.finished||this.time>=900)return false;
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
    if(this.s.config.mode!=='endless'&&this.s.day>=this.s.config.days)this.s.finished=true;
    if(typeof EventManager!=='undefined')EventManager.endDay(this);
  }
  closeDay(){while(this.time<900&&!this.s.finished)this.step();}
  nextDay(){if(this.s.finished||this.time!==900)return false;for(const x of this.s.stocks){x.bars.push({...x.today});x.bars=x.bars.slice(-180);}this.s.day++;this.openDay();return true;}
  fundamentals(id){const x=this.s.stocks[id];return {marketCap:x.price*x.totalShares,pe:x.eps>0?x.price/100/x.eps:null,pb:x.price/100/x.bookValue,eps:x.eps,turnover:x.volume/x.floatShares};}
`+e.slice(end);
const restore=e.indexOf('  static restore(text){');e=e.slice(0,restore)+`  static restore(text){const s=typeof text==='string'?JSON.parse(text):structuredClone(text);if(typeof SaveManager!=='undefined')return SaveManager.restoreGame(s);if(s.version!==2||s.stocks?.length!==60)throw Error('需要 V2 存档迁移。');const g=Object.create(StockGame.prototype);g.s=s;return g;}
}
if(typeof module!=='undefined')module.exports=StockGame;
`;
fs.writeFileSync('work/engine.js',e);
let build=fs.readFileSync('work/build.js','utf8');build=build.replace("fs.readFileSync(path.join(__dirname,'v2/stock-database.js'),'utf8')+'\\n'+", "['stock-database','indicators','market-engine'].map(n=>fs.readFileSync(path.join(__dirname,'v2',n+'.js'),'utf8')).join('\\n')+'\\n'+");fs.writeFileSync('work/build.js',build);
