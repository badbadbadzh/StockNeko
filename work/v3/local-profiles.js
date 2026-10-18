'use strict';
// Local profile selection is deliberately not online authentication.
const LocalProfiles={
  key:'nigumiao-local-players-v1', sessionKey:'nigumiao-player-session', current:null, error:'',
  read(){const data=JSON.parse(localStorage.getItem(this.key)||'{"profiles":[],"remembered":null}');if(!Array.isArray(data.profiles))throw Error('玩家列表无法读取，请先保留浏览器数据。');return data;},
  write(data){localStorage.setItem(this.key,JSON.stringify(data));},
  validName(value){const name=String(value||'').trim().normalize('NFC');if([...name].length<2||[...name].length>16||/[\u0000-\u001f\u007f]/.test(name))throw Error('请设置 2–16 个字的玩家名称。');return name;},
  list(){return this.read().profiles;},
  create(value){const data=this.read(),name=this.validName(value);if(data.profiles.length>=8)throw Error('本机最多保存 8 位玩家。');if(data.profiles.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('本机已有这个名称，请换一个。');const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),p={id,name,createdAt:new Date().toISOString()};
    // The first player inherits existing saves. LocalVault migrates them without duplicating large localStorage values.
    if(!data.profiles.length)p.legacyImported=true;
    data.profiles.push(p);this.write(data);return p;
  },
  rename(value){if(!this.current)throw Error('请先选择玩家。');const data=this.read(),name=this.validName(value);if(data.profiles.some(p=>p.id!==this.current.id&&p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('本机已有这个名称。');const p=data.profiles.find(p=>p.id===this.current.id);p.name=name;this.write(data);this.current=p;return p;},
  update(patch){if(!this.current)throw Error('请先选择玩家。');const data=this.read(),p=data.profiles.find(p=>p.id===this.current.id);if(!p)throw Error('未找到玩家档案。');const next={...p};if(patch.name!==undefined){next.name=this.validName(patch.name);if(data.profiles.some(x=>x.id!==p.id&&x.name.toLocaleLowerCase()===next.name.toLocaleLowerCase()))throw Error('本机已有这个名称。');}if(patch.bio!==undefined){next.bio=String(patch.bio).trim();if([...next.bio].length>100)throw Error('个性签名最多 100 个字。');}if(patch.avatar!==undefined){if(patch.avatar!==''&&(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(patch.avatar)||patch.avatar.length>150000))throw Error('头像格式无效，请重新选择图片。');next.avatar=patch.avatar;}if(patch.fontScale!==undefined){if(![.85,1,1.15,1.3].includes(patch.fontScale))throw Error('文字大小无效。');next.fontScale=patch.fontScale;}if(patch.effects!==undefined){if(typeof patch.effects!=='boolean')throw Error('特效设置无效。');next.effects=patch.effects;}if(patch.atmosphere!==undefined){if(!['off','subtle','intense'].includes(patch.atmosphere))throw Error('氛围设置无效。');next.atmosphere=patch.atmosphere;}for(const key of ['interfaceMotion','ambienceSound','jumpscare','capitalFlash'])if(patch[key]!==undefined){if(typeof patch[key]!=='boolean')throw Error('特效设置无效。');next[key]=patch[key];}if(patch.partnerTitle!==undefined){if(!['恋人','男朋友','女朋友'].includes(patch.partnerTitle))throw Error('请选择一个称谓。');next.partnerTitle=patch.partnerTitle;}data.profiles[data.profiles.indexOf(p)]=next;this.write(data);this.current=next;return next;},
  select(id,remember){const data=this.read(),p=data.profiles.find(p=>p.id===id);if(!p)throw Error('未找到这位玩家。');this.validName(p.name);sessionStorage.setItem(this.sessionKey,id);data.remembered=remember?id:null;this.write(data);return p;},
  logout(){const data=this.read();data.remembered=null;this.write(data);sessionStorage.removeItem(this.sessionKey);this.current=null;},
  prefix(id){return 'nigumiao-player-'+id+'-';},
  scope(){return this.prefix(this.current?.id||'unselected');},
  boot(){try{const data=this.read(),id=sessionStorage.getItem(this.sessionKey)||data.remembered;const p=data.profiles.find(p=>p.id===id);if(p){this.validName(p.name);this.current=p;}}catch(e){this.error=e.message;}const prefix=this.scope();SaveManager.key=prefix+'slots';SaveManager.activeKey=prefix+'active';SaveManager.oldKey=prefix+'legacy';SaveManager._raw=null;SaveManager._cache=null;},
};
if(typeof module!=='undefined')module.exports=LocalProfiles;
else LocalProfiles.boot();
