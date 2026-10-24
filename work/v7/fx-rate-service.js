'use strict';
// Public reference data only. This client never receives or sends an API key.
const FXRateService={
 codes:['CNY','USD','EUR','JPY','GBP','HKD','AUD','CAD','CHF','SGD'],flight:new Map(),memory:new Map(),retryAfter:new Map(),
 isDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value&&value<=new Date().toISOString().slice(0,10)},
 validRates(r){return r&&this.codes.every(c=>Number.isFinite(r[c])&&r[c]>0)&&r.CNY===1},
 valid(data,history=false){return data?.source==='Frankfurter'&&data.kind==='daily'&&Number.isFinite(Date.parse(data.fetchedAt))&&Date.parse(data.fetchedAt)<=Date.now()+60000&&(history?Array.isArray(data.points)&&data.points.length>0&&data.points.length<=370&&data.points.every((p,i)=>this.isDate(p.date)&&this.validRates(p.rates)&&(!i||p.date>data.points[i-1].date)):this.isDate(data.date)&&this.validRates(data.rates))},
 stale(data){const date=data?.date||data?.points?.at(-1)?.date,today=new Date().toISOString().slice(0,10);return !this.isDate(date)||Date.parse(today+'T00:00:00Z')-Date.parse(date+'T00:00:00Z')>7*86400000||Date.now()-Date.parse(data.fetchedAt)>86400000||data.stale===true},
 read(key){if(this.memory.has(key))return this.memory.get(key);try{return JSON.parse(localStorage.getItem('stock-meow-real-fx-'+key)||'null')}catch{return null}},
 write(key,value){this.memory.set(key,value);try{localStorage.setItem('stock-meow-real-fx-'+key,JSON.stringify(value))}catch{/* Rates remain usable in memory when storage is full. */}},
 invert(rates){const r={CNY:1};for(const c of this.codes)if(c!=='CNY'){if(typeof rates?.[c]!=='number')throw Error('汇率数据不完整。');r[c]=1/rates[c]}if(!this.validRates(r))throw Error('汇率数据不完整。');return r},
 async json(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('汇率服务暂时不可用。');return r.json()},
 async publicData(days){
  const now=new Date(),end=now.toISOString().slice(0,10),symbols=this.codes.filter(c=>c!=='CNY').join(',');
  const route=days?`${new Date(now.valueOf()-days*86400000).toISOString().slice(0,10)}..${end}`:'latest';
  const raw=await this.json(`https://api.frankfurter.dev/v1/${route}?base=CNY&symbols=${symbols}`);
  if(raw.base!=='CNY'||raw.amount!==1)throw Error('汇率基准无效。');
  const data={source:'Frankfurter',kind:'daily',fetchedAt:new Date().toISOString(),cached:false,stale:false};
  if(days)data.points=Object.entries(raw.rates||{}).sort(([a],[b])=>a.localeCompare(b)).map(([date,r])=>({date,rates:this.invert(r)}));
  else {data.date=raw.date;data.rates=this.invert(raw.rates)}
  return data;
 },
 get(days=0,force=false){
  if(![0,7,30,90,365].includes(days))return Promise.reject(Error('不支持的汇率周期。'));
  const key=days?'history-'+days:'latest',history=!!days,ttl=days?21600000:3600000,old=this.read(key),validOld=this.valid(old,history);
  if(validOld&&!force&&Date.now()-Date.parse(old.fetchedAt)<ttl)return Promise.resolve({...old,cached:true,stale:this.stale(old)});
  if(this.flight.has(key))return this.flight.get(key);
  if(Date.now()<(this.retryAfter.get(key)||0))return validOld?Promise.resolve({...old,cached:true,stale:this.stale(old),message:'连接暂不可用，显示上次成功数据。'}):Promise.reject(Error('连接暂不可用，请稍后再试。'));
  const job=(async()=>{
   try{
    let data;
    // A published static page can use this key-free public source directly.
    if(['127.0.0.1','localhost','[::1]'].includes(location.hostname)&&/^https?:$/.test(location.protocol)){
     try{const body=await this.json(days?'/api/fx/history?days='+days:'/api/fx/latest');if(!body.ok||!this.valid(body.data,history))throw Error('本地汇率服务未启动');data=body.data}catch{data=await this.publicData(days)}
    }else data=await this.publicData(days);
    if(!this.valid(data,history))throw Error('汇率数据格式无效。');
    data={...data,stale:this.stale(data)};this.write(key,data);this.retryAfter.delete(key);return data;
   }catch{
    this.retryAfter.set(key,Date.now()+30000);
    if(validOld)return {...old,cached:true,stale:this.stale(old),message:'连接暂不可用，显示上次成功数据。'};
    throw Error('未能获取真实汇率。请检查网络后重试。');
   }finally{this.flight.delete(key)}
  })();this.flight.set(key,job);return job;
 }
};
