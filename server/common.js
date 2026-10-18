'use strict';
const crypto=require('node:crypto');
class AppError extends Error { constructor(message,status=400,code='INVALID'){super(message);this.status=status;this.code=code;} }
function insist(ok,message,status=400,code){if(!ok)throw new AppError(message,status,code);}
const id=()=>crypto.randomUUID(), hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const bj=ms=>new Date(ms+8*3600000).toISOString().replace('T',' ').slice(0,19);
const dateKey=ms=>bj(ms).slice(0,10).replaceAll('-','');
function marketPhase(now,open){const t=bj(now),minutes=+t.slice(11,13)*60+(+t.slice(14,16));if(open===null)return {key:'unknown',name:'日历待确认',canTrade:false};if(!open)return {key:'holiday',name:'休市',canTrade:false};if(minutes>=570&&minutes<690||minutes>=780&&minutes<897)return {key:'open',name:'交易中',canTrade:true};if(minutes>=690&&minutes<780)return {key:'lunch',name:'午间休市',canTrade:false};if(minutes>=900)return {key:'closed',name:'已收盘',canTrade:false};if(minutes>=555&&minutes<565||minutes>=897&&minutes<900)return {key:'auction',name:'集合竞价 · 仅观察',canTrade:false};return {key:'before',name:'未开盘',canTrade:false};}
const cents=n=>Number.isFinite(Number(n))?Math.round(Number(n)*100):null;
function boardRule(s){if(s.code.endsWith('.BJ'))return {min:100,step:1,max:1000000,band:.3};if(s.code.startsWith('688'))return {min:200,step:1,max:100000,band:.2};return {min:100,step:100,max:1000000,band:s.code.startsWith('30')?.2:.1};}
function validQuantity(stock,qty,side,available){const r=boardRule(stock);return Number.isSafeInteger(qty)&&qty>0&&qty<=r.max&&(qty>=r.min&&(qty-r.min)%r.step===0||side==='sell'&&qty===available&&qty<r.min);}
module.exports={AppError,insist,id,hash,bj,dateKey,marketPhase,cents,boardRule,validQuantity};
