'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Store=require('../store'),{FxRates,CURRENCIES}=require('../fx-rates');
const DAY=86400000,START=Date.parse('2026-10-24T08:00:00Z');
const rates=()=>({USD:.14,EUR:.13,JPY:21,GBP:.11,HKD:1.09,AUD:.21,CAD:.19,CHF:.12,SGD:.18});
const latest=(date='2026-10-23')=>({amount:1,base:'CNY',date,rates:rates()});
function fixture(t,fetcher){
 const store=new Store(':memory:');t.after(()=>store.close());let now=START,calls=0;
 const fx=new FxRates(store,{now:()=>now,fetcher:async(...args)=>{calls++;return fetcher(...args);}});
 return {fx,store,setNow:n=>{now=n;},calls:()=>calls};
}
const response=body=>({ok:true,json:async()=>body});

test('latest converts all currencies to CNY per unit, and cached reads survive service recreation',async t=>{
 const {fx,store,calls}=fixture(t,async(url,options)=>{
  assert.equal(url,'https://api.frankfurter.dev/v1/latest?base=CNY&symbols=USD,EUR,JPY,GBP,HKD,AUD,CAD,CHF,SGD');
  assert.ok(options.signal instanceof AbortSignal);assert.equal(options.redirect,'error');return response(latest());
 });
 const first=await fx.latest();
 assert.equal(first.source,'Frankfurter');assert.equal(first.kind,'daily');assert.equal(first.cached,false);assert.equal(first.stale,false);
 assert.equal(first.date,'2026-10-23');assert.equal(first.fetchedAt,new Date(START).toISOString());
 assert.deepEqual(Object.keys(first.rates),CURRENCIES);assert.equal(first.rates.CNY,1);assert.equal(first.rates.USD,1/.14);
 const cached=await fx.latest();assert.equal(cached.cached,true);assert.equal(calls(),1);
 cached.rates.USD=999;
 const restored=new FxRates(store,{now:()=>START,fetcher:async()=>{throw Error('must not fetch');}});
 assert.equal((await restored.latest()).rates.USD,1/.14);
});

test('simultaneous requests share one upstream request',async t=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const {fx,calls}=fixture(t,async()=>{await gate;return response(latest());});
 const requests=[fx.latest(),fx.latest(),fx.latest()];assert.equal(calls(),1);release();
 const values=await Promise.all(requests);assert.deepEqual(values[0],values[1]);assert.equal(calls(),1);
});

test('refresh failure retains timestamps, backs off, and marks old cache stale',async t=>{
 let failing=false;const {fx,setNow,calls}=fixture(t,async()=>{if(failing)throw Error('private upstream detail');return response(latest());});
 const original=await fx.latest();failing=true;setNow(START+3600001);
 const fallback=await fx.latest();assert.equal(fallback.cached,true);assert.equal(fallback.stale,false);assert.equal(fallback.fetchedAt,original.fetchedAt);assert.equal(fallback.date,original.date);assert.match(fallback.message,/最近一次有效/);
 await fx.latest();assert.equal(calls(),2);
 setNow(START+DAY+1);const stale=await fx.latest();assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,original.fetchedAt);assert.match(stale.message,/不能兑换/);
});

test('rates older than seven UTC dates are stale even when newly fetched',async t=>{
 const {fx}=fixture(t,async()=>response(latest('2026-10-16')));
 const result=await fx.latest();assert.equal(result.cached,false);assert.equal(result.stale,true);
});

test('upstream errors have sanitized responses and short failure backoff without cache',async t=>{
 const {fx,calls}=fixture(t,async()=>{throw Error('https://private.example/?token=secret');});
 for(let i=0;i<2;i++)await assert.rejects(fx.latest(),e=>e.status===503&&e.code==='FX_UNAVAILABLE'&&!/private|secret|token/.test(e.message));
 assert.equal(calls(),1);
});

test('invalid latest payloads are rejected and never cached',async t=>{
 const invalid=[{...latest(),base:'USD'},{...latest(),amount:2},{...latest(),date:'2026-10-25'},{...latest(),date:'2026-02-30'},
  {...latest(),rates:{...rates(),USD:0}},{...latest(),rates:{...rates(),JPY:-1}},{...latest(),rates:{...rates(),EUR:'0.13'}},
  {...latest(),rates:{...rates(),GBP:Infinity}},{...latest(),rates:{USD:.14}}];
 for(const body of invalid){const {fx,store}=fixture(t,async()=>response(body));await assert.rejects(fx.latest(),{code:'FX_UNAVAILABLE'});assert.equal(store.get('fx-cache','latest'),null);}
});

test('a regressing latest response does not replace a newer cached date',async t=>{
 let old=false;const {fx,store,setNow}=fixture(t,async()=>response(latest(old?'2026-10-22':'2026-10-23')));
 await fx.latest();old=true;setNow(START+3600001);
 const result=await fx.latest();assert.equal(result.date,'2026-10-23');assert.equal(result.cached,true);assert.equal(store.get('fx-cache','latest').date,'2026-10-23');
});

test('history sorts real business dates, keeps gaps and converts the same way as latest',async t=>{
 const {fx,calls,setNow}=fixture(t,async url=>{
  assert.match(url,/\/2026-09-24\.\.2026-10-24\?base=CNY&symbols=/);
  return response({amount:1,base:'CNY',start_date:'2026-09-24',end_date:'2026-10-23',rates:{'2026-10-23':rates(),'2026-09-25':rates(),'2026-09-24':rates()}});
 });
 const result=await fx.history(30);assert.deepEqual(result.points.map(p=>p.date),['2026-09-24','2026-09-25','2026-10-23']);assert.equal(result.points[0].rates.JPY,1/21);assert.equal(result.stale,false);
 setNow(START+5*3600000);assert.equal((await fx.history('30')).cached,true);assert.equal(calls(),1);
 setNow(START+6*3600000+1);await fx.history(30);assert.equal(calls(),2);
});

test('history rejects unsupported ranges before requesting an upstream URL',async t=>{
 const {fx,calls}=fixture(t,async()=>{throw Error('must not fetch');});
 for(const days of [0,1,31,999,'30&base=USD','https://example.com','30.0',null])assert.throws(()=>fx.history(days),{code:'FX_RANGE'});
 assert.equal(calls(),0);
});

test('invalid history dates or currency rows cannot overwrite the cache',async t=>{
 for(const badRates of [{},{'2026-10-25':rates()},{'2026-02-30':rates()},{'2025-10-23':rates()},{'2026-10-23':{...rates(),CHF:null}}]){
  const {fx,store}=fixture(t,async()=>response({amount:1,base:'CNY',rates:badRates}));
  await assert.rejects(fx.history(30),{code:'FX_UNAVAILABLE'});assert.equal(store.get('fx-cache','history:30'),null);
 }
});

test('corrupt or future-fetched persisted cache is not served',async t=>{
 const {fx,store}=fixture(t,async()=>{throw Error('unavailable');});
 store.put('fx-cache','latest',{source:'Frankfurter',kind:'daily',date:'2026-10-23',fetchedAt:new Date(START+DAY).toISOString(),rates:{CNY:1,USD:7}});
 await assert.rejects(fx.latest(),{code:'FX_UNAVAILABLE'});
});
