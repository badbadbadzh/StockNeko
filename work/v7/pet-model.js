'use strict';
// Profile-scoped appearance; independent of market RNG, game slots and story NPCs.
const PetModel={
 defaults:{name:'墨墨',hairColor:'ink',hairStyle:'long',eyes:'ink',accessory:'none',outfit:'hoodie',outfitColor:'charcoal',enabled:true,collapsed:false,size:'normal',position:null},
 options:{
  hairColor:{ink:['墨黑','#373841'],rose:['莓粉','#bb7396'],silver:['月银','#bdc4d4'],mint:['薄荷','#699b94'],cream:['奶茶','#c5a881'],violet:['雾紫','#9086b7']},
  hairStyle:{long:['长直发'],bob:['短波波'],twin:['双马尾']},
  eyes:{ink:['石墨','#777c8e'],violet:['紫晶','#ad8bdf'],amber:['琥珀','#e6b16c'],aqua:['青蓝','#7fc7cf'],rose:['蔷薇','#d889a9']},
  accessory:{none:['无发饰'],bow:['蝴蝶结'],clip:['星星夹'],bell:['铃铛结']},
  outfit:{hoodie:['宽松卫衣'],sailor:['水手领'],sweater:['针织衫']},
  outfitColor:{charcoal:['炭灰','#484957'],lilac:['薰衣草','#b2a0d4'],cream:['奶油','#ded3c2'],sage:['鼠尾草','#91b4a6']},
  size:{small:['小'],normal:['标准'],large:['大']}
 },
 normalize(raw={}){
  const x={...this.defaults};if(!raw||typeof raw!=='object')return x;
  for(const [k,values] of Object.entries(this.options))if(Object.hasOwn(values,raw[k]))x[k]=raw[k];
  for(const k of ['enabled','collapsed'])if(typeof raw[k]==='boolean')x[k]=raw[k];
  if(typeof raw.name==='string'&&raw.name.trim()&&[...raw.name.trim()].length<=12&&!/[\u0000-\u001f\u007f]/.test(raw.name))x.name=raw.name.trim();
  if(raw.position&&['x','y'].every(k=>Number.isFinite(raw.position[k])&&raw.position[k]>=0&&raw.position[k]<=1))x.position={x:raw.position.x,y:raw.position.y};
  return x;
 },
 validate(patch,previous={}){
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('桌宠配置无效。');
  for(const [k,values] of Object.entries(this.options))if(patch[k]!==undefined&&!Object.hasOwn(values,patch[k]))throw Error('桌宠选项无效：'+k);
  for(const k of ['enabled','collapsed'])if(patch[k]!==undefined&&typeof patch[k]!=='boolean')throw Error('桌宠显示设置无效。');
  if(patch.name!==undefined&&(typeof patch.name!=='string'||!patch.name.trim()||[...patch.name.trim()].length>12||/[\u0000-\u001f\u007f]/.test(patch.name)))throw Error('桌宠名字需要 1–12 个字。');
  if(patch.position!==undefined&&patch.position!==null&&(!patch.position||!['x','y'].every(k=>Number.isFinite(patch.position[k])&&patch.position[k]>=0&&patch.position[k]<=1)))throw Error('桌宠位置无效。');
  return this.normalize({...this.normalize(previous),...patch});
 }
};
if(typeof module!=='undefined')module.exports=PetModel;
