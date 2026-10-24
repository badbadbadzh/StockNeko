'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const prices={CNY:1,USD:7,EUR:8,JPY:.05,GBP:9,HKD:.9,AUD:5,CAD:5,CHF:8,SGD:5};
const response=()=>({ok:true,json:async()=>({date:'2026-10-23',rates:Object.fromEntries(Object.entries(prices).filter(([c])=>c!=='CNY').map(([c,v])=>[c,1/v]))})});
function fixture(){
 const requests=[],storage=new Map(),saved=[];
 const context=vm.createContext({AbortSignal,console,Date,Math,Number,JSON,game:{s:{cash:10000000,finished:false}},LocalProfiles:{scope:()=>''},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  save:()=>{saved.push(context.game);return true;},
  fetch:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),
  document:{readyState:'loading',addEventListener:()=>{}}});
 for(const name of ['forex.js','forex-chart.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../v7',name),'utf8'),context);
 vm.runInContext('globalThis.fx=FXMarket;fx.paint=()=>{};fx.load();',context);
 return {context,fx:context.fx,requests,storage,saved};
}
test('simulation response cannot write another save or clear its active loading state',async()=>{
 const {context,fx,requests,saved}=fixture(),old=context.game,pendingOld=fx.ensureRates();
 context.game={s:{cash:20000000,finished:false}};fx.load();const active=context.game,pendingActive=fx.ensureRates();
 requests[0].resolve(response());await pendingOld;
 assert.equal(old.s.fx.base,null);assert.equal(active.s.fx.base,null);assert.equal(active.s.fx.minute,0);assert.equal(fx.loading,true);assert.equal(saved.length,0);
 requests[1].resolve(response());await pendingActive;
 assert.equal(active.s.fx.base.USD,7);assert.equal(active.s.fx.minute,45);assert.equal(active.s.cash,20000000);assert.equal(fx.loading,false);assert.ok(saved.every(g=>g===active));
});
test('failed old request cannot import cached simulation into a newly selected save',async()=>{
 const {context,fx,requests,storage,saved}=fixture(),pending=fx.ensureRates();
 storage.set('stock-meow-fx-anchor',JSON.stringify({r:prices,date:'2026-10-23'}));
 context.game={s:{cash:30000000,finished:false}};fx.load();requests[0].reject(Error('offline'));await pending;
 assert.equal(context.game.s.fx.base,null);assert.equal(context.game.s.fx.minute,0);assert.equal(context.game.s.cash,30000000);assert.equal(fx.loading,false);assert.equal(saved.length,0);
});
test('mode reload invalidates a simulation request even when returning to the same save',async()=>{
 const {context,fx,requests,saved}=fixture(),state=context.game.s.fx,pending=fx.ensureRates();
 state.quoteMode='daily';fx.load();state.quoteMode='simulation';fx.load();
 requests[0].resolve(response());await pending;
 assert.equal(state.base,null);assert.equal(state.minute,0);assert.equal(saved.length,0);assert.equal(fx.loading,false);
});
test('active simulation request still uses its valid cached anchor on failure',async()=>{
 const {context,fx,requests,storage}=fixture();storage.set('stock-meow-fx-anchor',JSON.stringify({r:prices,date:'2026-10-23'}));
 const pending=fx.ensureRates();requests[0].reject(Error('offline'));await pending;
 assert.equal(context.game.s.fx.base.USD,7);assert.equal(context.game.s.fx.minute,45);assert.equal(fx.cached,true);assert.equal(fx.loading,false);
});
