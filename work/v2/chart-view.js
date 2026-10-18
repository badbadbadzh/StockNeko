'use strict';
const ChartView={
 size:60,hover:null,geometry:null,cacheKey:'',
 bars(g,id,period){const x=g.s.stocks[id];return period==='daily'?[...x.bars,x.today]:Indicators.aggregate(x.minutes,Number(period)||1);},
 draw(canvas,g,id,options={}){
  const all=this.bars(g,id,options.period||'daily'),full=all.map(b=>b.c),offset=Math.max(0,all.length-this.size),bars=all.slice(offset),rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  if(rect.width<1||rect.height<1)return;
  const barsKey=all.map(b=>[b.o,b.h,b.l,b.c,b.v].join(',')).join(';'),key=[id,options.period||'daily',options.indicator||'',options.volume!==false?'v':'n',this.size,Math.round(rect.width),Math.round(rect.height),dpr,barsKey,this.hover].join('|');if(key===this.cacheKey)return;this.cacheKey=key;if(canvas.width!==Math.round(rect.width*dpr))canvas.width=Math.round(rect.width*dpr);if(canvas.height!==Math.round(rect.height*dpr))canvas.height=Math.round(rect.height*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);const w=rect.width,h=rect.height;
  const technical=['macd','rsi'].includes(options.indicator),volume=options.volume!==false,left=10,right=w-57,top=15,bottom=h-28-(volume?44:0)-(technical?65:0),dx=(right-left)/Math.max(1,bars.length),px=i=>left+(i+.5)*dx;
  ctx.font='10px Consolas,monospace';ctx.fillStyle='#9a8aa9';
  if(!bars.length){ctx.textAlign='center';ctx.fillText('尚无分钟数据 · 推进时间后生成',w/2,h/2);return;}
  const ma5=Indicators.sma(full,5),ma10=Indicators.sma(full,10),ma20=Indicators.sma(full,20),ema=Indicators.ema(full,12),boll=Indicators.bollinger(full),macd=Indicators.macd(full),rsi=Indicators.rsi(full);
  let hi=Math.max(...bars.map(b=>b.h)),lo=Math.min(...bars.map(b=>b.l));if(options.indicator==='boll'){hi=Math.max(hi,...boll.upper.slice(offset).filter(v=>v!==null));lo=Math.min(lo,...boll.lower.slice(offset).filter(v=>v!==null));}const padding=Math.max((hi-lo)*.08,hi*.002);hi+=padding;lo-=padding;const y=v=>top+(hi-v)/(hi-lo)*(bottom-top);
  this.geometry={bars,left,right,top,bottom,dx,w,h};
  for(let i=0;i<5;i++){const yy=top+(bottom-top)*i/4;ctx.strokeStyle='#eee7f5';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.fillStyle='#9a8aa9';ctx.fillText(((hi-(hi-lo)*i/4)/100).toFixed(2),right+6,yy+3);}
  bars.forEach((b,i)=>{const xx=px(i),c=b.c>=b.o?'#d85165':'#198462',bw=Math.max(1,Math.min(10,dx*.55));ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,y(b.h));ctx.lineTo(xx,y(b.l));ctx.stroke();ctx.fillRect(xx-bw/2,Math.min(y(b.c),y(b.o)),bw,Math.max(1,Math.abs(y(b.c)-y(b.o))));});
  const line=(values,c,yy=y)=>{ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();let started=false;values.slice(offset).forEach((v,i)=>{if(v===null||!Number.isFinite(v)){started=false;return;}if(!started){ctx.moveTo(px(i),yy(v));started=true;}else ctx.lineTo(px(i),yy(v));});ctx.stroke();};
  let label='';
  const last=(v,n)=>v.at(-1)===null?'数据不足':(v.at(-1)/100).toFixed(2);
  if(options.indicator==='ema'){line(ema,'#b78f48');label='EMA12 '+last(ema);}
  else if(options.indicator==='boll'){line(boll.upper,'#b68853');line(boll.mid,'#87987a');line(boll.lower,'#9d859c');label='BOLL20 '+(full.length<20?'数据不足':'上 '+last(boll.upper)+' 中 '+last(boll.mid)+' 下 '+last(boll.lower));}
  else{line(ma5,'#c6a045');line(ma10,'#68a4a0');line(ma20,'#9b70d5');label='MA5 '+last(ma5)+' · MA10 '+last(ma10)+' · MA20 '+last(ma20);}
  let panelTop=bottom+12;
  if(volume){const vmax=Math.max(1,...bars.map(b=>b.v));bars.forEach((b,i)=>{ctx.fillStyle=b.c>=b.o?'#d8516565':'#19846265';const hh=b.v/vmax*32;ctx.fillRect(px(i)-Math.max(1,dx*.25),panelTop+32-hh,Math.max(1,dx*.5),hh);});ctx.fillStyle='#9a8aa9';ctx.fillText('VOL',right+5,panelTop+17);panelTop+=44;}
  if(technical){const subTop=panelTop+4,subBottom=panelTop+50;
   if(options.indicator==='rsi'){const sy=v=>subBottom-v/100*(subBottom-subTop);ctx.strokeStyle='#e6d8f1';for(const v of [30,70]){ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(left,sy(v));ctx.lineTo(right,sy(v));ctx.stroke();}ctx.setLineDash([]);line(rsi,'#95844e',sy);ctx.fillStyle='#9a8aa9';ctx.fillText('RSI14',right+3,subTop+9);ctx.fillText(rsi.at(-1)===null?'—':rsi.at(-1).toFixed(1),right+3,subTop+25);}
   else{const valid=[...macd.dif.slice(offset),...macd.dea.slice(offset),...macd.hist.slice(offset)].filter(v=>v!==null),max=Math.max(1,...valid.map(Math.abs)),sy=v=>(subTop+subBottom)/2-v/max*(subBottom-subTop)/2;ctx.strokeStyle='#eee7f5';ctx.beginPath();ctx.moveTo(left,sy(0));ctx.lineTo(right,sy(0));ctx.stroke();macd.hist.slice(offset).forEach((v,i)=>{if(v!==null){ctx.fillStyle=v>=0?'#d85165':'#198462';ctx.fillRect(px(i)-1,Math.min(sy(v),sy(0)),Math.max(1,dx*.35),Math.max(1,Math.abs(sy(v)-sy(0))));}});line(macd.dif,'#bf9852',sy);line(macd.dea,'#9a80a1',sy);ctx.fillStyle='#9a8aa9';ctx.fillText('MACD',right+3,subTop+12);if(macd.dea.at(-1)===null)label+=' · MACD 数据不足（需 34 根）';}
  }
  ctx.fillStyle='#9a8aa9';ctx.font='9px Consolas,monospace';ctx.fillText(bars[0].label,left,h-6);ctx.textAlign='right';ctx.fillText(bars.at(-1).label,right,h-6);ctx.textAlign='left';
  if(this.hover!==null&&bars[this.hover]){const i=this.hover,b=bars[i],xx=px(i);ctx.setLineDash([3,3]);ctx.strokeStyle='#bb97de';ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,h-22);ctx.moveTo(left,y(b.c));ctx.lineTo(right,y(b.c));ctx.stroke();ctx.setLineDash([]);}
  const note=document.getElementById('chartLegend');if(note)note.textContent=label;
  const note2=document.getElementById('chartNote');if(note2)note2.textContent='滚轮缩放 · '+bars.length+'/'+all.length+' 根 · 红涨绿跌';
 },
 hoverInfo(event,canvas){if(!this.geometry)return null;const r=canvas.getBoundingClientRect(),gg=this.geometry,xx=event.clientX-r.left,i=Math.floor((xx-gg.left)/gg.dx);this.hover=xx<gg.left||xx>gg.right?null:i;return this.hover===null?null:gg.bars[i];},
 lineChart(canvas,values,labels=[]){const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=r.width*dpr;canvas.height=r.height*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=r.width,h=r.height;if(!values.length)return;let lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.1,hi*.001);lo-=pad;hi+=pad;const y=v=>12+(hi-v)/(hi-lo)*(h-38);ctx.font='10px Consolas';for(let i=0;i<3;i++){const v=lo+(hi-lo)*i/2;ctx.strokeStyle='#eee7f5';ctx.beginPath();ctx.moveTo(8,y(v));ctx.lineTo(w-70,y(v));ctx.stroke();ctx.fillStyle='#9a8aa9';ctx.fillText(v.toFixed(2),w-65,y(v)+3);}ctx.strokeStyle=values.at(-1)>=values[0]?'#d85165':'#198462';ctx.lineWidth=1.8;ctx.beginPath();values.forEach((v,i)=>{const x=8+i/Math.max(1,values.length-1)*(w-82);i?ctx.lineTo(x,y(v)):ctx.moveTo(x,y(v));});ctx.stroke();ctx.fillStyle='#9a8aa9';ctx.fillText(labels[0]||'开始',8,h-5);ctx.fillText(labels.at(-1)||'现在',w-100,h-5);}
};
