const fs=require('node:fs');const update=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')),'utf8');
function rep(s,a,b){if(!s.includes(a))throw Error('Missing '+a);return s.replace(a,b);}
update('work/v2/save-manager.js',s=>{
 s=rep(s,"list(){const raw=localStorage.getItem(this.key)||'[]';", "list(){if(typeof LocalVault!=='undefined'&&LocalVault.enabled){if(this._cache)return this._cache;this._encoded=LocalVault.items;this._cache=this._encoded.map(x=>this.unpack(x));return this._cache;}const raw=localStorage.getItem(this.key)||'[]';");
 s=rep(s,'localStorage.setItem(this.key,raw);this._raw=raw;',"if(typeof LocalVault!=='undefined'&&LocalVault.enabled)LocalVault.persist(encoded);else localStorage.setItem(this.key,raw);this._raw=raw;");return s;
});
update('work/ui.js',s=>{
 const start=s.indexOf('function save(){'),end=s.indexOf('\nfunction toast(',start);
 if(start<0||end<0)throw Error('save function not found');
 return s.slice(0,start)+`function save(){if(!LocalProfiles.current||!LocalVault.ready)return false;try{SaveManager.write(game,{selected});localStorage.removeItem(KEY);const serial=LocalVault.serial;$('saveStatus').textContent='正在保存…';LocalVault.flush().then(()=>{if(serial===LocalVault.serial)$('saveStatus').innerHTML='<i class="dot"></i> 进度已保存';},e=>{$('saveStatus').textContent='保存失败，请导出备份';if(!saveError){toast('本地保存失败：'+e.message+'。请从存档管理导出 JSON。',true);saveError=true;}});return true;}catch(e){$('saveStatus').textContent='未能自动保存';if(!saveError){toast('本地保存失败，请使用存档管理导出进度。',true);saveError=true;}return false;}}`+s.slice(end);
});
update('work/index.template.html',s=>rep(s,'<script>__UI__</script>',`<script type="text/plain" id="game-ui-source">__UI__</script>
<script>
LocalVault.start().then(()=>{const source=document.getElementById('game-ui-source'),script=document.createElement('script');script.textContent=source.textContent;source.remove();document.body.appendChild(script);}).catch(error=>{document.getElementById('authError').textContent='读取本地存档失败：'+error.message+'。请保留浏览器数据并重新打开。';document.getElementById('authForm').hidden=true;document.getElementById('showCreatePlayer').hidden=true;const retry=document.createElement('button');retry.textContent='重新读取';retry.className='btn';retry.onclick=()=>location.reload();document.getElementById('authError').after(retry);});
</script>`));
console.log('IndexedDB storage integrated.');
