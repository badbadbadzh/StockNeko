const fs=require('fs');let e=fs.readFileSync('work/engine.js','utf8');e=e.replace("global.Indicators=require('./v2/indicators');","global.Indicators=require('./v2/indicators');global.OrderEngine=require('./v2/order-engine');global.Analytics=require('./v2/analytics');");const a=e.indexOf('  fees('),b=e.indexOf('  updateRisk()',a);
e=e.slice(0,a)+`  fees(value,side){return OrderEngine.fees(this,value,side);}
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
`+e.slice(b);
const c=e.indexOf('  updateRisk(){'),d=e.indexOf('  openDay(){',c);e=e.slice(0,c)+`  updateRisk(){const s=this.s,eq=this.equity;s.peak=Math.max(s.peak,eq);const dd=(s.peak-eq)/Math.max(1,s.peak);s.maxDrawdown=Math.max(s.maxDrawdown,dd);s.dayPeak=Math.max(s.dayPeak,eq);s.dayDrawdown=Math.max(s.dayDrawdown,(s.dayPeak-eq)/Math.max(1,s.dayPeak));const p=Analytics.portfolio(this);s.stats.maxExposure=Math.max(s.stats.maxExposure,p.exposure);s.stats.maxConcentration=Math.max(s.stats.maxConcentration,p.concentration);if(s.stats.peakDrawdown>.08&&eq>=s.peak)s.stats.recovered=true;s.stats.peakDrawdown=Math.max(s.stats.peakDrawdown,dd);}
  addNews(){if(typeof NewsEngine!=='undefined')NewsEngine.generate(this);}
`+e.slice(d);e=e.replace("get canOrder(){return !this.s.finished&&this.time!==690&&this.time<900;}","get canOrder(){return !this.s.finished&&this.time<900;}");fs.writeFileSync('work/engine.js',e);
let bld=fs.readFileSync('work/build.js','utf8').replace("'market-engine']","'market-engine','order-engine','analytics']");fs.writeFileSync('work/build.js',bld);
