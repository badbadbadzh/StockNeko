'use strict';
const {AppError}=require('./common');

const CURRENCIES=['CNY','USD','EUR','JPY','GBP','HKD','AUD','CAD','CHF','SGD'];
const DAY=86400000,MAX_CACHE_AGE=DAY,MAX_RATE_AGE=7*DAY;
const BASE_URL='https://api.frankfurter.dev/v1/';
const SYMBOLS=CURRENCIES.slice(1).join(',');
const unavailable=()=>new AppError('汇率服务暂时不可用，请稍后重试。',503,'FX_UNAVAILABLE');
const dateString=ms=>new Date(ms).toISOString().slice(0,10);
function validDate(value,today){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const ms=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(ms)&&dateString(ms)===value&&value<=today;
}
function validPrices(rates){return !!rates&&rates.CNY===1&&CURRENCIES.every(c=>typeof rates[c]==='number'&&Number.isFinite(rates[c])&&rates[c]>0);}
function convertRates(rates){
 if(!rates||typeof rates!=='object'||Array.isArray(rates))throw unavailable();
 const result={CNY:1};
 for(const c of CURRENCIES.slice(1)){
  const value=rates[c];
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw unavailable();
  result[c]=1/value;
 }
 if(!validPrices(result))throw unavailable();
 return result;
}

class FxRates {
 constructor(store,{fetcher=fetch,now=()=>Date.now(),timeoutMs=10000}={}){
  this.store=store;this.fetcher=fetcher;this.now=now;this.timeoutMs=timeoutMs;
  this.pending=new Map();this.retryAt=new Map();
 }
 latest(){return this.get('latest',3600000);}
 history(days=30){
  if(![7,30,90,365].includes(Number(days))||!/^\d+$/.test(String(days)))throw new AppError('历史范围仅支持 7、30、90 或 365 天。',400,'FX_RANGE');
  return this.get('history:'+Number(days),6*3600000,Number(days));
 }
 readCache(key,days){
  try{
   const data=this.store.get('fx-cache',key),now=this.now(),today=dateString(now);
   if(!data||data.source!=='Frankfurter'||data.kind!=='daily'||typeof data.fetchedAt!=='string')return null;
   const fetched=Date.parse(data.fetchedAt);
   if(!Number.isFinite(fetched)||fetched>now)return null;
   if(days){
    if(!Array.isArray(data.points)||!data.points.length||data.points.length>days+8)return null;
    let previous='';
    for(const p of data.points){if(!validDate(p.date,today)||p.date<=previous||!validPrices(p.rates))return null;previous=p.date;}
   }else if(!validDate(data.date,today)||!validPrices(data.rates))return null;
   return data;
  }catch{return null;}
 }
 present(data,cached,failed=false){
  const now=this.now(),date=data.date||data.points.at(-1).date;
  const stale=Date.parse(dateString(now)+'T00:00:00Z')-Date.parse(date+'T00:00:00Z')>MAX_RATE_AGE||now-Date.parse(data.fetchedAt)>MAX_CACHE_AGE;
  const result={...structuredClone(data),cached,stale};
  if(stale)result.message='汇率或缓存已过期，仅供查看，暂时不能兑换。';
  else if(failed)result.message='汇率服务暂时不可用，正在使用最近一次有效日汇率。';
  return result;
 }
 async get(key,ttl,days=null){
  const old=this.readCache(key,days);
  if(old&&this.now()-Date.parse(old.fetchedAt)<ttl)return this.present(old,true);
  if(this.pending.has(key))return this.pending.get(key);
  if(this.now()<(this.retryAt.get(key)||0)){
   if(old)return this.present(old,true,true);
   throw unavailable();
  }
  const job=(async()=>{
   try{
    const today=dateString(this.now()),start=days?dateString(Date.parse(today+'T00:00:00Z')-days*DAY):null;
    const endpoint=days?start+'..'+today:'latest';
    const response=await this.fetcher(BASE_URL+endpoint+'?base=CNY&symbols='+SYMBOLS,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(this.timeoutMs),redirect:'error'});
    if(!response.ok)throw unavailable();
    const raw=await response.json();
    if(!raw||raw.base!=='CNY'||raw.amount!==1)throw unavailable();
    const data={source:'Frankfurter',kind:'daily',fetchedAt:new Date(this.now()).toISOString()};
    if(days){
     if(!raw.rates||typeof raw.rates!=='object'||Array.isArray(raw.rates))throw unavailable();
     const dates=Object.keys(raw.rates).sort(),earliest=dateString(Date.parse(start+'T00:00:00Z')-7*DAY);
     if(!dates.length||dates.length>days+8)throw unavailable();
     data.points=dates.map(date=>{
      if(!validDate(date,today)||date<earliest)throw unavailable();
      return {date,rates:convertRates(raw.rates[date])};
     });
    }else{
     if(!validDate(raw.date,today)||old&&raw.date<old.date)throw unavailable();
     data.date=raw.date;data.rates=convertRates(raw.rates);
    }
    this.store.put('fx-cache',key,data);this.retryAt.delete(key);
    return this.present(data,false);
   }catch{
    this.retryAt.set(key,this.now()+30000);
    if(old)return this.present(old,true,true);
    throw unavailable();
   }
  })();
  this.pending.set(key,job);
  try{return await job;}finally{this.pending.delete(key);}
 }
}
module.exports={FxRates,CURRENCIES,MAX_CACHE_AGE,MAX_RATE_AGE};
