'use strict';
const AuthUI={
  init(){
    this.gate=$('authGate');this.gate.inert=false;$('authForm').addEventListener('submit',e=>{e.preventDefault();this.create();});
    $('showCreatePlayer').onclick=()=>{this.createMode(true);$('playerName').focus();};
    $('cancelCreatePlayer').onclick=()=>this.createMode(false);
    $('accountButton').onclick=()=>this.account();$('lifeAccount').onclick=()=>this.account();
    $('playerPicker').onclick=e=>{const b=e.target.closest('[data-player]');if(b)this.login(b.dataset.player);};
    if(LocalProfiles.current){this.hideGate();this.updateAccount();save();}else this.showGate();
  },
  showGate(){stopAuto();if($('modal').open)closeModal();this.gate.classList.remove('hidden');document.body.classList.add('auth-locked');document.querySelectorAll('body>header,body>main').forEach(el=>el.inert=true);this.renderPicker();},
  hideGate(){this.gate.classList.add('hidden');document.body.classList.remove('auth-locked');document.querySelectorAll('body>header,body>main').forEach(el=>el.inert=false);},
  renderPicker(){try{const players=LocalProfiles.list();$('playerPicker').innerHTML=players.map(p=>`<button type="button" class="player-choice" data-player="${esc(p.id)}"><span class="player-monogram">${esc([...p.name][0])}</span><span><strong>${esc(p.name)}</strong><small>本地存档</small></span><span>↗</span></button>`).join('');$('authWelcome').textContent=players.length?'欢迎回来，选择今天的玩家。':'首次游玩，请先设置玩家名称。';$('showCreatePlayer').hidden=players.length>=8;$('cancelCreatePlayer').hidden=!players.length;this.createMode(!players.length);$('authError').textContent=LocalProfiles.error||'';}catch(e){$('authError').textContent=e.message;}},
  createMode(on){$('authForm').classList.toggle('hidden',!on);$('playerPicker').classList.toggle('hidden',on);$('showCreatePlayer').classList.toggle('hidden',on);$('authError').textContent='';$('playerName').removeAttribute('aria-invalid');},
  create(){try{const p=LocalProfiles.create($('playerName').value);this.login(p.id);}catch(e){$('authError').textContent=e.message;$('playerName').setAttribute('aria-invalid','true');$('playerName').focus();}},
  login(id){try{LocalProfiles.select(id,$('rememberPlayer').checked);location.reload();}catch(e){$('authError').textContent='无法保存玩家档案：'+e.message;}},
  updateAccount(){const p=LocalProfiles.current;$('accountButton').textContent=p?p.name+' · 本地':'选择玩家';$('lifeAccount').textContent=p?p.name:'玩家档案';if(typeof LifeUI!=='undefined')LifeUI.refresh();},
  account(){if(!LocalProfiles.current){this.showGate();return;}const p=LocalProfiles.current;modal('你的本地档案',`<div class="local-profile-summary"><span class="player-monogram">${esc([...p.name][0])}</span><div><strong>${esc(p.name)}</strong><p>本机存档 · 无需邮箱或密码</p></div></div><label for="renamePlayer">玩家名称（2–16 个字）</label><input class="save-name" id="renamePlayer" maxlength="32" value="${esc(p.name)}"><p class="muted">名称、交易进度和生活小馆进度都保存在此浏览器。不同玩家各有自己的存档。换设备前可在存档管理中导出 JSON。</p><p id="profileError" role="alert" class="auth-error"></p><div class="modal-actions"><button class="btn" data-local-action="switch">保存并切换玩家</button><button class="btn btn-dark" data-local-action="rename">保存名称</button></div>`);},
  rename(){try{LocalProfiles.rename($('renamePlayer').value);this.updateAccount();closeModal();toast('新名称已保存。');}catch(e){$('profileError').textContent=e.message;}},
  async switchPlayer(){stopAuto();if(!save()){toast('进度未能保存，请先导出存档再切换。',true);return;}try{await LocalVault.flush();LocalProfiles.logout();location.reload();}catch(e){toast('保存失败，请先导出存档：'+e.message,true);}},
};
document.addEventListener('click',e=>{const action=e.target.closest('[data-local-action]')?.dataset.localAction;if(action==='rename')AuthUI.rename();if(action==='switch')AuthUI.switchPlayer();});
document.addEventListener('keydown',e=>{if(document.body.classList.contains('auth-locked')||!$('lifePage').hidden){if(!e.target.closest('input,textarea,select,button'))e.stopImmediatePropagation();}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>AuthUI.init());else AuthUI.init();
