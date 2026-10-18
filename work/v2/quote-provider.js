'use strict';
// 数据源状态显式化：离线版不伪装实时行情，也不内置 API Token。
const QuoteProvider={
 modes:{sandbox:{name:'虚构沙盒',status:'模拟沙盒',canAdvance:true,canTrade:true,description:'价格、K线和成交量由本地模型生成，不代表真实行情。'},replay:{name:'历史回放（沙盒）',status:'回放沙盒',canAdvance:true,canTrade:true,description:'当前离线版本使用可复现的模拟历史，不伪装成真实历史数据。'},delayed:{name:'真实延时行情',status:'未配置行情源',canAdvance:false,canTrade:false,description:'需要授权行情代理和带时间戳的快照；当前未连接。'},live:{name:'真实行情',status:'未配置行情源',canAdvance:false,canTrade:false,description:'需要授权行情代理；当前没有真实市场数据，不会用随机价格替代。'}},
 create(config){const mode=config.quoteMode||'sandbox',m=this.modes[mode]||this.modes.sandbox;return {mode,status:m.status,name:m.name,source:mode==='sandbox'?'本地模拟模型':'未配置授权行情服务',updatedAt:null,delaySeconds:null,stale:mode!=='sandbox',message:m.description};},
 isPlayable(g){return ['sandbox','replay'].includes(g.s.market?.provider?.mode||g.s.config.quoteMode||'sandbox');},
 status(g){return g.s.market?.provider||this.create(g.s.config);},
 stamp(g,source='本地模拟模型'){const p=this.status(g);p.source=source;p.updatedAt=new Date().toISOString();p.stale=false;}
};
if(typeof module!=='undefined')module.exports=QuoteProvider;
