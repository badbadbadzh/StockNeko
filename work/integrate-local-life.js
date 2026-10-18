const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
function update(p,fn){fs.writeFileSync(p,fn(read(p)),'utf8');}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing integration anchor: '+a.slice(0,100));return s.replace(a,b);}
update('work/index.template.html',s=>{
  const start=s.indexOf('<div id="authGate"'),end=s.indexOf('<main class="page">',start);
  if(start<0||end<0)throw Error('Missing auth gate');
  s=s.slice(0,start)+'__LOCAL_LOGIN__\n'+s.slice(end);
  s=replace(s,'<main class="page">','<main class="page" id="tradePage">');
  s=replace(s,'<dialog id="modal">','__LIFE_SHELL__\n<dialog id="modal">');
  s=replace(s,'<button id="navReview">','<button id="navLife">生活小馆</button><button id="navReview">');
  s=replace(s,'<script>window.NIGUMIAOMIAO_SUPABASE=window.NIGUMIAOMIAO_SUPABASE||{};</script>','');
  s=s.replace('>离线试玩</button>','>选择玩家</button>').replace('V2.1 · 无尽试玩版','V3.1 · 本地生活版');
  return s;
});
update('work/ui.js',s=>{
  s=replace(s,"KEY='nigumiaomiao-v2-active-state'","KEY=LocalProfiles.scope()+'state'");
  s=replace(s,'function save(){try{','function save(){if(!LocalProfiles.current)return false;try{');
  s=replace(s,"$('saveStatus').innerHTML='<i class=\"dot\"></i> 进度已保存';}","$('saveStatus').innerHTML='<i class=\"dot\"></i> 进度已保存';return true;}");
  s=replace(s,'saveError=true;}}}','saveError=true;}return false;}}');return s;
});
update('work/engine.js',s=>{
  s=replace(s,"global.SaveManager=require('./v2/save-manager');","global.SaveManager=require('./v2/save-manager');global.LifeEngine=require('./v3/life-engine');");
  s=replace(s,'  openDay(){','  openDay(){\n    LifeEngine.ensure(this);');return s;
});
update('work/v2/save-manager.js',s=>replace(s,'  const c=s.config;','  LifeEngine.validate(s.life,s.day);\n  const c=s.config;'));
// Keep existing end-of-session and halt protection; the previous frame hook re-enabled them.
update('work/v2/ui-features.js',s=>replace(s,"if(el)el.disabled=!playable;","if(el&&!playable)el.disabled=true;"));
console.log('Local profiles and life screen integrated.');
