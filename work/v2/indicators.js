'use strict';
const Indicators={
 sma(values,n){let sum=0;return values.map((v,i)=>{sum+=v;if(i>=n)sum-=values[i-n];return i>=n-1?sum/n:null;});},
 ema(values,n){let prev=null,sum=0;return values.map((v,i)=>{sum+=v;if(i<n-1)return null;if(i===n-1)return prev=sum/n;return prev=v*2/(n+1)+prev*(1-2/(n+1));});},
 rsi(values,n=14){let gain=0,loss=0,avgGain=0,avgLoss=0;return values.map((v,i)=>{if(i===0)return null;const d=v-values[i-1];if(i<=n){gain+=Math.max(0,d);loss+=Math.max(0,-d);if(i<n)return null;avgGain=gain/n;avgLoss=loss/n;}else{avgGain=(avgGain*(n-1)+Math.max(0,d))/n;avgLoss=(avgLoss*(n-1)+Math.max(0,-d))/n;}return avgLoss===0?(avgGain===0?50:100):100-100/(1+avgGain/avgLoss);});},
 macd(values,fast=12,slow=26,signal=9){const a=this.ema(values,fast),b=this.ema(values,slow),dif=a.map((v,i)=>v===null||b[i]===null?null:v-b[i]);const valid=dif.filter(v=>v!==null),deaValid=this.ema(valid,signal);let j=0;const dea=dif.map(v=>v===null?null:deaValid[j++]);return {dif,dea,hist:dif.map((v,i)=>v===null||dea[i]===null?null:2*(v-dea[i]))};},
 bollinger(values,n=20,k=2){const mid=this.sma(values,n);return {mid,upper:mid.map((m,i)=>m===null?null:m+k*Math.sqrt(values.slice(i-n+1,i+1).reduce((a,v)=>a+(v-m)**2,0)/n)),lower:mid.map((m,i)=>m===null?null:m-k*Math.sqrt(values.slice(i-n+1,i+1).reduce((a,v)=>a+(v-m)**2,0)/n))};},
 aggregate(bars,n){if(n===1)return bars.map(b=>({...b}));const out=[];for(const b of bars){const session=b.t<780?'am':'pm',start=b.t<780?570:780,bucket=Math.floor(Math.max(0,b.t-start-1)/n),key=b.day+session+bucket,last=out.at(-1);if(last&&last.key===key){last.h=Math.max(last.h,b.h);last.l=Math.min(last.l,b.l);last.c=b.c;last.v+=b.v;last.label=b.label;}else out.push({...b,key});}return out;}
};
if(typeof module!=='undefined')module.exports=Indicators;
