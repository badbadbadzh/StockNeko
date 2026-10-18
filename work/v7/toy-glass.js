'use strict';
const ToyGlassUI={
 init(){
  document.body.classList.add('toy-ui');
  // Remove decorative duplicate copy from the DOM, not just visually hide it.
  for(const selector of ['.brand h1 span','.workspace-label','.sidebar-quote','.offline-tag','.sidebar-bottom>small','.watch-scroll-hint','.start-access-bottom','.local-name-note','.bottom-strip>span:last-child','.terminal-location>small','.terminal-location>i'])document.querySelectorAll(selector).forEach(el=>el.remove());
  const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value;};
  set('.brand small','STOCK MEOW');
  set('.chapter h2','今日市场');
  set('#terminalLocation','我的交易日');
  set('#navTrade span','市场');set('#navLife span','生活');set('#navReview span','复盘');set('#navCompanion span','久留美');set('#navStart span','首页');
  set('.watch .panel-title','自选与市场');set('#ticket .panel-title','下单');
  set('.room-monitor .micro-label','账户回撤');
  const aside=document.querySelector('.sidebar-bottom');
  if(aside)aside.innerHTML='<div class="toy-sidebar-card"><span aria-hidden="true">✳</span><strong>生活不止红绿。</strong>逛逛小馆，给自己放个假。</div>';
  set('.settings-intro h2','把游戏调成你的样子');
  // One static product notice is enough; per-stock quote status remains untouched.
  set('.bottom-strip .footer-tip','模拟行情 · 存档保存在当前浏览器');
  ChartView.cacheKey='';requestAnimationFrame(drawChart);
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>ToyGlassUI.init());else ToyGlassUI.init();
