'use strict';
class StockGame {
  static VERSION = 1;
  static TIMES = [...Array.from({length:25},(_,i)=>570+i*5), ...Array.from({length:24},(_,i)=>780+i*5),897,900];
  static STOCKS = [
    ['青岚科技','沪 A001','半导体',3286,1.6],['星海能源','深 A002','新能源',1862,1.4],
    ['江城银行','沪 A003','银行',724,.65],['白鹭消费','深 A004','消费',5830,.9],
    ['远山医药','沪 A005','医药',2418,1.2],['云川汽车','深 A006','汽车',4176,1.45],
    ['东辰证券','沪 A007','证券',1592,1.3],['启航制造','深 A008','制造',1235,1.0]
  ];
  constructor(seed=Date.now()) {
    this.s={version:1,rng:seed>>>0,day:1,tick:0,cash:10000000,positions:{},orders:[],trades:[],news:[],stocks:[],sequence:0,totalFees:0,realized:0,peak:10000000,maxDrawdown:0,dayStart:10000000,equity:[10000000],finished:false};
    this.s.stocks=StockGame.STOCKS.map((a,id)=>{
      let p=Math.round(a[3]*.92),bars=[];
      for(let i=0;i<38;i++){
        const o=p,c=Math.max(100,Math.round(p*(1+this.normal()*.018)));
        bars.push({o,c,h:Math.max(o,c)+Math.round(p*this.rand()*.015),l:Math.min(o,c)-Math.round(p*this.rand()*.015),v:Math.round(100000+this.rand()*900000),label:'历史 '+(i+1)});p=c;
      }
      const ratio=a[3]/p;
      bars=bars.map(b=>({...b,o:Math.round(b.o*ratio),c:Math.round(b.c*ratio),h:Math.round(b.h*ratio),l:Math.round(b.l*ratio)}));
      return {id,name:a[0],code:a[1],sector:a[2],price:a[3],prev:a[3],base:a[3],volatility:a[4],bias:0,bars,points:[],volume:0};
    });
    this.openDay();
  }
  rand(){let t=this.s.rng+=0x6D2B79F5;this.s.rng>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
  normal(){return (this.rand()+this.rand()+this.rand()+this.rand()-2)*1.7;}
  get time(){return StockGame.TIMES[this.s.tick];}
  get timeText(){return String(Math.floor(this.time/60)).padStart(2,'0')+':'+String(this.time%60).padStart(2,'0');}
  get phase(){return this.s.finished?'挑战结束':this.time===900?'已收盘':this.time===690?'午间休市':this.time>=897?'收盘集合竞价':'连续竞价';}
  get canOrder(){return !this.s.finished&&this.time!==690&&this.time<900;}
  limits(id){const x=this.s.stocks[id];return {up:Math.round(x.prev*1.1),down:Math.max(1,Math.round(x.prev*.9))};}
  quote(id){const x=this.s.stocks[id],lim=this.limits(id);return {ask:x.price>=lim.up?null:Math.min(lim.up,x.price+1),bid:x.price<=lim.down?null:Math.max(lim.down,x.price-1)};}
  fees(value,side){const commission=Math.max(500,Math.round(value*.0003)),transfer=Math.round(value*.00001),stamp=side==='sell'?Math.round(value*.0005):0;return {commission,transfer,stamp,total:commission+transfer+stamp};}
  get pending(){return this.s.orders.filter(o=>o.status==='pending');}
  get frozen(){return this.pending.filter(o=>o.side==='buy').reduce((a,o)=>a+o.price*o.qty+this.fees(o.price*o.qty,'buy').total,0);}
  get freeCash(){return this.s.cash-this.frozen;}
  position(id){return this.s.positions[id]||{qty:0,available:0,cost:0};}
  available(id){return this.position(id).available-this.pending.filter(o=>o.side==='sell'&&o.stock===id).reduce((a,o)=>a+o.qty,0);}
  get marketValue(){return this.s.stocks.reduce((a,x)=>a+x.price*this.position(x.id).qty,0);}
  get equity(){return this.s.cash+this.marketValue;}
  maxBuy(id,price){let n=Math.max(0,Math.min(10000,Math.floor(this.freeCash/(price*100))));while(n>0&&price*n*100+this.fees(price*n*100,'buy').total>this.freeCash)n--;return n*100;}
  submit(id,side,qty,price){
    if(!Number.isInteger(id)||!this.s.stocks[id])return {ok:false,message:'请选择有效的股票。'};
    if(!['buy','sell'].includes(side))return {ok:false,message:'交易方向无效。'};
    if(!this.canOrder)return {ok:false,message:this.time===690?'午间休市，推进到 13:00 后再下单。':'当前已收盘，请进入下一交易日。'};
    if(!Number.isInteger(qty)||qty<=0||qty>1000000)return {ok:false,message:'数量应为正整数，单笔最多 100 万股。'};
    if((side==='buy'&&qty%100!==0)||(side==='sell'&&qty%100!==0&&qty!==this.available(id)))return {ok:false,message:'买入须为 100 股的整数倍；不足一手的卖出余股需一次卖完。'};
    if(!Number.isInteger(price)||price<=0)return {ok:false,message:'价格最小变动单位为 0.01 元。'};
    const lim=this.limits(id),q=this.quote(id);
    if(price>lim.up||price<lim.down)return {ok:false,message:'委托价必须在今日涨跌停价格之间。'};
    if(this.time<897){
      const buyBase=q.ask??q.bid??this.s.stocks[id].price,sellBase=q.bid??q.ask??this.s.stocks[id].price;
      if(side==='buy'&&price>Math.round(Math.max(buyBase*1.02,buyBase+10)))return {ok:false,message:'买价超过连续竞价有效申报价上限（基准价的 102% 与基准价 + 0.10 元取高值）。'};
      if(side==='sell'&&price<Math.round(Math.min(sellBase*.98,sellBase-10)))return {ok:false,message:'卖价低于连续竞价有效申报价下限（基准价的 98% 与基准价 − 0.10 元取低值）。'};
    }
    if(side==='buy'&&price*qty+this.fees(price*qty,'buy').total>this.freeCash)return {ok:false,message:'可用资金不足，请减少股数或撤销其他买单。'};
    if(side==='sell'&&qty>this.available(id))return {ok:false,message:this.position(id).qty>this.position(id).available?'可卖股数不足：今天买入的股票，下一交易日才能卖出（T+1）。':'可卖股数不足，部分持仓可能已被卖单冻结。'};
    const o={id:++this.s.sequence,stock:id,side,qty,price,status:'pending',day:this.s.day,time:this.timeText};
    this.s.orders.push(o);this.match();
    return {ok:true,order:o,message:o.status==='filled'?`${side==='buy'?'买入':'卖出'} ${qty} 股已成交。`:this.time>=897?'已进入收盘集合竞价，15:00 撮合；此时不能撤单。':'委托已提交，等待价格满足成交条件。'};
  }
  cancel(id){const o=this.s.orders.find(x=>x.id===id);if(!o||o.status!=='pending')return {ok:false,message:'该委托已不能撤销。'};if(this.time>=897&&this.time<900)return {ok:false,message:'14:57—15:00 收盘集合竞价期间不能撤单。'};o.status='cancelled';return {ok:true,message:'撤单成功，已释放冻结的资金或股份。'};}
  match(closing=false){
    if(!closing&&(this.time===690||this.time>=897))return;
    const orders=this.pending.sort((a,b)=>a.stock-b.stock||a.side.localeCompare(b.side)||(a.side==='buy'?b.price-a.price:a.price-b.price)||a.id-b.id);
    for(const o of orders){
      const x=this.s.stocks[o.stock],q=this.quote(o.stock),lim=this.limits(o.stock);
      const p=closing?((o.side==='buy'&&x.price===lim.up)||(o.side==='sell'&&x.price===lim.down)?null:x.price):(o.side==='buy'?q.ask:q.bid);
      if(p===null||(o.side==='buy'?p>o.price:p<o.price))continue;
      const value=p*o.qty,fees=this.fees(value,o.side),pos=this.s.positions[o.stock]??={qty:0,available:0,cost:0};
      let realized=0;
      if(o.side==='buy'){this.s.cash-=value+fees.total;pos.qty+=o.qty;pos.cost+=value+fees.total;}
      else {const cost=Math.round(pos.cost*o.qty/pos.qty);pos.qty-=o.qty;pos.available-=o.qty;pos.cost-=cost;this.s.cash+=value-fees.total;realized=value-fees.total-cost;this.s.realized+=realized;}
      o.status='filled';o.fillPrice=p;o.fillTime=this.timeText;this.s.totalFees+=fees.total;
      this.s.trades.push({orderId:o.id,stock:o.stock,side:o.side,qty:o.qty,price:p,value,fees,realized,day:this.s.day,time:this.timeText});
    }
    this.updateRisk();
  }
  updateRisk(){this.s.peak=Math.max(this.s.peak,this.equity);this.s.maxDrawdown=Math.max(this.s.maxDrawdown,(this.s.peak-this.equity)/this.s.peak);}
  addNews(kind='daily'){
    const id=Math.floor(this.rand()*this.s.stocks.length),x=this.s.stocks[id],sign=this.rand()>.47?1:-1;
    const positive=[['新订单传来好消息','公司披露新增订单，市场关注后续交付。'],['行业景气度回暖','行业调研显示需求改善，资金开始试探。'],['研发取得新进展','公司公布研发进展，商业化仍需要时间。']];
    const negative=[['业绩预期遭遇压力','机构下调行业盈利预期，投资者情绪谨慎。'],['股东披露减持计划','重要股东计划减持，短期抛压引发关注。'],['成本上涨侵蚀利润','原材料报价上行，市场担忧利润率承压。']];
    const item=(sign>0?positive:negative)[Math.floor(this.rand()*3)];
    x.bias=sign*(.0003+this.rand()*.0010);
    this.s.news.unshift({id:++this.s.sequence,day:this.s.day,time:kind==='daily'?'盘前':this.timeText,stock:id,title:x.name+' · '+item[0],body:item[1]+' 消息不保证股价方向。',sign});
    this.s.news=this.s.news.slice(0,60);
  }
  openDay(){
    for(const pos of Object.values(this.s.positions))pos.available=pos.qty;
    this.s.dayStart=this.equity;this.s.tick=0;
    for(const x of this.s.stocks){
      x.prev=x.price;x.bias*=.3;const lim=this.limits(x.id);
      x.price=Math.min(lim.up,Math.max(lim.down,Math.round(x.prev*(1+this.normal()*.008))));
      x.volume=Math.round(50000+this.rand()*80000);x.points=[x.price];
      x.today={o:x.price,h:x.price,l:x.price,c:x.price,v:x.volume,label:'第 '+this.s.day+' 日'};
    }
    this.addNews();this.updateRisk();
  }
  step(){
    if(this.s.finished||this.time>=900)return false;
    this.s.tick++;
    if(this.time!==690&&this.time!==897){
      const market=this.normal()*.0015;
      for(const x of this.s.stocks){
        const lim=this.limits(x.id),locked=x.price===lim.up||x.price===lim.down;
        const change=market+this.normal()*.0032*x.volatility+x.bias;
        if(!locked||this.rand()>.58)x.price=Math.min(lim.up,Math.max(lim.down,Math.round(x.price*(1+change))));
        const v=Math.round((3000+this.rand()*18000)*(1+Math.abs(change)*70));x.volume+=v;
        x.today.h=Math.max(x.today.h,x.price);x.today.l=Math.min(x.today.l,x.price);x.today.c=x.price;x.today.v=x.volume;
      }
    }
    for(const x of this.s.stocks)x.points.push(x.price);
    if(this.s.tick===14||this.s.tick===36)this.addNews('intraday');
    if(this.time===900){this.match(true);for(const o of this.pending)o.status='expired';this.s.equity.push(this.equity);if(this.s.day===20)this.s.finished=true;}
    else this.match();
    this.updateRisk();return true;
  }
  closeDay(){while(this.time<900&&!this.s.finished)this.step();}
  nextDay(){if(this.s.finished||this.time!==900)return false;for(const x of this.s.stocks){x.bars.push({...x.today});x.bars=x.bars.slice(-60);}this.s.day++;this.openDay();return true;}
  serialize(){return JSON.stringify(this.s);}
  static restore(text){
    const s=JSON.parse(text);
    if(!s||s.version!==1||!Array.isArray(s.stocks)||s.stocks.length!==8||!Array.isArray(s.orders)||!Array.isArray(s.trades)||!Array.isArray(s.news)||!Array.isArray(s.equity)||!s.positions||typeof s.positions!=='object')throw Error('存档格式不兼容。');
    if(!Number.isInteger(s.day)||s.day<1||s.day>20||!Number.isInteger(s.tick)||s.tick<0||s.tick>=StockGame.TIMES.length||!Number.isSafeInteger(s.cash)||s.cash<0||!Number.isInteger(s.rng))throw Error('存档数据无效。');
    const finite=x=>Number.isFinite(x)&&x>=0;
    const integer=(v,min=0)=>Number.isSafeInteger(v)&&v>=min,stockId=v=>integer(v)&&v<8,validTime=v=>typeof v==='string'&&/^\d{2}:\d{2}$/.test(v),validDay=v=>integer(v,1)&&v<=s.day;
    if(!integer(s.sequence)||!integer(s.totalFees)||!Number.isSafeInteger(s.realized)||!integer(s.peak,1)||!finite(s.maxDrawdown)||!integer(s.dayStart)||s.equity.some(v=>!integer(v))||typeof s.finished!=='boolean'||s.finished!==(s.day===20&&s.tick===50))throw Error('账户统计无效。');
    for(let i=0;i<s.stocks.length;i++){
      const x=s.stocks[i],meta=StockGame.STOCKS[i];
      if(x.id!==i||!integer(x.price,1)||!integer(x.prev,1)||!integer(x.base,1)||!finite(x.volatility)||!Number.isFinite(x.bias)||!integer(x.volume)||!Array.isArray(x.bars)||x.bars.length>60||!Array.isArray(x.points)||x.points.length!==s.tick+1||x.points.some(p=>!integer(p,1))||!x.today)throw Error('行情数据不完整。');
      for(const b of [...x.bars,x.today])if(![b.o,b.h,b.l,b.c].every(v=>integer(v,1))||!integer(b.v)||typeof b.label!=='string')throw Error('K线数据无效。');
      x.name=meta[0];x.code=meta[1];x.sector=meta[2];
    }
    for(const [id,p] of Object.entries(s.positions))if(!/^[0-7]$/.test(id)||!integer(p.qty)||!integer(p.available)||p.qty<p.available||!integer(p.cost))throw Error('持仓数据无效。');
    for(const o of s.orders)if(!integer(o.id,1)||!stockId(o.stock)||!['buy','sell'].includes(o.side)||!integer(o.qty,1)||!integer(o.price,1)||!['pending','filled','cancelled','expired'].includes(o.status)||!validDay(o.day)||!validTime(o.time)||(o.status==='filled'&&(!integer(o.fillPrice,1)||!validTime(o.fillTime))))throw Error('委托数据无效。');
    for(const t of s.trades)if(!stockId(t.stock)||!['buy','sell'].includes(t.side)||!integer(t.qty,1)||!integer(t.price,1)||!integer(t.value)||!validDay(t.day)||!validTime(t.time)||!t.fees||!['commission','transfer','stamp','total'].every(k=>integer(t.fees[k]))||!Number.isSafeInteger(t.realized))throw Error('成交数据无效。');
    for(const n of s.news)if(!validDay(n.day)||typeof n.title!=='string'||typeof n.body!=='string'||typeof n.time!=='string'||![-1,1].includes(n.sign))throw Error('新闻数据无效。');
    const g=Object.create(StockGame.prototype);g.s=s;return g;
  }
}
if(typeof module!=='undefined')module.exports=StockGame;
