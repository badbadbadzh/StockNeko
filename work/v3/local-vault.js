'use strict';
// IndexedDB holds large stock histories; localStorage only holds player names and active slot IDs.
const LocalVault={
  db:null,ready:false,enabled:false,items:[],pending:Promise.resolve(),error:null,serial:0,committed:0,
  async start(){
    if(!LocalProfiles.current){this.ready=true;return;}
    this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nigumiao-local-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('profiles');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('无法打开本地存档库：'+r.error.message));r.onblocked=()=>reject(Error('请关闭其他旧版游戏页面后重试。'));});
    const old=await new Promise((resolve,reject)=>{const r=this.db.transaction('profiles').objectStore('profiles').get(SaveManager.key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    let items=old?.items;
    if(!items){
      const inherited=LocalProfiles.current.legacyImported;
      const raw=localStorage.getItem(SaveManager.key)||(inherited?localStorage.getItem('nigumiaomiao-v2-slots'):null);
      items=raw?JSON.parse(raw):[];
      if(!Array.isArray(items))throw Error('旧版存档目录无法读取，原数据已保留。');
      // The old active-state save predates the slot system and takes precedence on initial migration.
      const state=localStorage.getItem(LocalProfiles.scope()+'state')||(inherited?localStorage.getItem('nigumiaomiao-v2-active-state'):null);
      const legacy=localStorage.getItem(SaveManager.oldKey)||(inherited?localStorage.getItem('stock-girl-save-v1'):null);
      if(state||(!items.length&&legacy)){const parsed=JSON.parse(state||legacy),g=StockGame.restore(parsed.game||parsed),id='legacy-'+LocalProfiles.current.id;items=[SaveManager.pack({id,name:'原有游戏进度',updated:Date.now(),version:3,game:g.s,ui:{selected:parsed.selected||0}})];localStorage.setItem(SaveManager.activeKey,id);}
      if(inherited&&!localStorage.getItem(SaveManager.activeKey)){const active=localStorage.getItem('nigumiaomiao-v2-active');if(active)localStorage.setItem(SaveManager.activeKey,active);}
    }
    if(!Array.isArray(items)||items.length>SaveManager.maxSlots)throw Error('本地存档目录格式无效，原数据已保留。');
    // Validate before any write so malformed old state is never overwritten by a new game.
    for(const item of items)StockGame.restore(SaveManager.unpack(item).game);
    this.items=items;this.enabled=true;
    if(!old)await this.put(items);
    this.ready=true;
  },
  put(items){return new Promise((resolve,reject)=>{const tx=this.db.transaction('profiles','readwrite');tx.objectStore('profiles').put({items},SaveManager.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('本地写入失败'));tx.onabort=()=>reject(tx.error||Error('本地写入被中断'));});},
  persist(encoded){const data=structuredClone(encoded);this.items=data;const serial=++this.serial;this.pending=this.pending.catch(()=>{}).then(()=>this.put(data)).then(()=>{this.committed=serial;this.error=null;},e=>{this.error=e;throw e;});this.pending.catch(()=>{});return this.pending;},
  flush(){return this.pending;},
};
