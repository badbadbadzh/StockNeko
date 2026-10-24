'use strict';
const CharacterCustomizer={
 blinkTimer:null,eyeTimer:null,talkTimer:null,draft:null,drag:null,
 state(){return PetModel.normalize(LocalProfiles.current?.pet)},
 petHtml(x=this.state()){return PetArt.svg(x)},
 group(key,label){
  const colors=['hairColor','eyes','outfitColor'].includes(key);
  return `<fieldset class="pet-choice-group"><legend>${label}</legend><div class="pet-choice-list ${colors?'pet-colors':''}">${Object.entries(PetModel.options[key]).map(([value,[name,hex]])=>`<button type="button" class="pet-choice" data-pet-key="${key}" data-pet-value="${value}" aria-pressed="false">${colors?`<i style="--swatch:${hex}" aria-hidden="true"></i>`:''}<span>${name}</span></button>`).join('')}</div></fieldset>`;
 },
 open(){
  if(!LocalProfiles.current)return AuthUI.showGate();
  this.draft=this.state();
  modal('桌宠衣橱',`<div class="pet-editor-intro"><span class="pet-kicker">YOUR LITTLE COMPANION</span><p>给今天的陪伴，换一种模样。</p></div><div class="pet-customizer"><section class="pet-custom-preview" aria-label="猫娘外观预览"><div class="pet-preview-top"><span>实时试穿</span><span>✦</span></div><div id="petPreviewStage"></div><div class="pet-preview-bottom"><strong id="petPreviewName"></strong><p id="petPreviewText"></p><button type="button" class="btn" id="petPreviewPat">摸摸头 ♡</button></div><span class="pet-preview-hint">猫耳 · 微困眼神 · 今天也在</span></section><div class="pet-custom-controls"><label class="pet-name-label" for="petName">她的名字<input id="petName" maxlength="24" autocomplete="off" placeholder="1–12 个字"></label>${this.group('hairStyle','01 / 发型')}${this.group('hairColor','02 / 发色')}${this.group('eyes','03 / 眼睛')}${this.group('accessory','04 / 发饰')}${this.group('outfit','05 / 穿着')}${this.group('outfitColor','06 / 衣服颜色')}<div class="pet-editor-actions"><button type="button" class="btn" id="petRandomize">试试新搭配 ↻</button><button type="button" class="btn" id="petResetLook">恢复参考造型</button></div></div></div><div class="pet-preferences"><label><input type="checkbox" id="petEnabled"> 在页面显示桌宠</label><label for="petSize">显示大小 <select id="petSize">${Object.entries(PetModel.options.size).map(([k,[v]])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button type="button" class="btn" id="petResetPosition">位置归位</button></div><p class="pet-save-note">拖动桌宠上方的把手可移动位置；关闭界面动画后停止眨眼。外观随本地玩家保存。</p><p id="petCustomizerError" class="auth-error" role="alert"></p><div class="modal-actions pet-editor-footer"><span id="petSaveState" role="status">试穿中 · 保存后应用</span><button type="button" class="btn" data-modal="close">取消</button><button type="button" class="btn btn-dark" id="savePetCustomization">保存并陪伴我 ↗</button></div>`);
  $('petName').value=this.draft.name;$('petEnabled').checked=this.draft.enabled;$('petSize').value=this.draft.size;
  document.querySelectorAll('[data-pet-key]').forEach(b=>b.onclick=()=>{this.draft[b.dataset.petKey]=b.dataset.petValue;this.paintChoices()});
  $('petName').oninput=()=>{this.draft.name=$('petName').value;$('petPreviewName').textContent=this.draft.name||'给她起个名字'};
  $('petEnabled').onchange=()=>{this.draft.enabled=$('petEnabled').checked};$('petSize').onchange=()=>{this.draft.size=$('petSize').value};
  $('petRandomize').onclick=()=>{for(const key of ['hairStyle','hairColor','eyes','accessory','outfit','outfitColor']){const keys=Object.keys(PetModel.options[key]);this.draft[key]=keys[Math.floor(Math.random()*keys.length)]}this.paintChoices()};
  $('petResetLook').onclick=()=>{for(const key of ['hairStyle','hairColor','eyes','accessory','outfit','outfitColor'])this.draft[key]=PetModel.defaults[key];this.paintChoices()};
  $('petResetPosition').onclick=()=>{this.draft.position=null;this.draft.collapsed=false;$('petSaveState').textContent='保存后，桌宠回到默认位置。'};
  $('petPreviewPat').onclick=()=>this.pat(true);$('savePetCustomization').onclick=()=>this.save();this.paintChoices();this.scheduleBlink();
 },
 paintChoices(){
  document.querySelectorAll('[data-pet-key]').forEach(b=>{const on=b.dataset.petValue===this.draft[b.dataset.petKey];b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  $('petPreviewStage').innerHTML=this.petHtml(this.draft);$('petPreviewName').textContent=this.draft.name;
  $('petPreviewText').textContent=[PetModel.options.hairStyle[this.draft.hairStyle][0],PetModel.options.outfit[this.draft.outfit][0]].join(' / ');
 },
 save(){try{const pet=PetModel.validate(this.draft);LocalProfiles.update({pet});this.apply();closeModal();toast('猫娘的新造型已保存。')}catch(e){$('petCustomizerError').textContent=e.message}},
 persist(patch){try{LocalProfiles.update({pet:patch});return true}catch(e){toast('桌宠设置未保存：'+e.message,true);return false}},
 apply(){
  const p=this.state(),root=$('desktopPet');if(!root)return;
  root.hidden=!LocalProfiles.current||!p.enabled;root.classList.toggle('collapsed',p.collapsed);root.dataset.size=p.size;
  $('desktopPetStage').innerHTML=this.petHtml(p);$('desktopPetName').textContent=p.name;
  $('desktopPetToggle').textContent=p.collapsed?'＋':'−';$('desktopPetToggle').setAttribute('aria-label',p.collapsed?'展开桌宠':'收起桌宠');$('desktopPetToggle').setAttribute('aria-expanded',String(!p.collapsed));
  this.position();this.scheduleBlink();
 },
 bounds(){const r=$('desktopPet').getBoundingClientRect();return {minX:8,minY:8,maxX:Math.max(8,innerWidth-r.width-8),maxY:Math.max(8,innerHeight-r.height-8)}},
 position(){
  if($('desktopPet').hidden||document.body.classList.contains('auth-locked'))return;
  const p=this.state(),b=this.bounds();
  const x=p.position?b.minX+p.position.x*(b.maxX-b.minX):(innerWidth>900?Math.min(210,b.maxX):b.minX),y=p.position?b.minY+p.position.y*(b.maxY-b.minY):b.maxY;
  this.moveTo(x,y);
 },
 moveTo(x,y){const b=this.bounds();$('desktopPet').style.left=Math.max(b.minX,Math.min(b.maxX,x))+'px';$('desktopPet').style.top=Math.max(b.minY,Math.min(b.maxY,y))+'px';},
 savePosition(){const b=this.bounds(),r=$('desktopPet').getBoundingClientRect();const position={x:(r.left-b.minX)/Math.max(1,b.maxX-b.minX),y:(r.top-b.minY)/Math.max(1,b.maxY-b.minY)};this.persist({position});},
 canAnimate(){const pet=this.state();return !!LocalProfiles.current&&(!!$('petPreviewStage')||pet.enabled&&!pet.collapsed)&&!document.hidden&&!document.body.matches('.auth-locked,.effects-off,.no-animations,.motion-off')&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&(!$('modal').open||!!$('petPreviewStage'))&&!$('capitalAlert')?.open},
 clearEyes(){clearTimeout(this.eyeTimer);document.querySelectorAll('.pet-blink,.pet-happy').forEach(el=>el.classList.remove('pet-blink','pet-happy'));},
 blink(duration=150){
  if(!this.canAnimate())return;
  this.clearEyes();for(const id of ['desktopPetStage','petPreviewStage'])$(id)?.classList.add('pet-blink');
  this.eyeTimer=setTimeout(()=>this.clearEyes(),duration);
 },
 scheduleBlink(){
  clearTimeout(this.blinkTimer);this.clearEyes();if(!this.canAnimate())return;
  this.blinkTimer=setTimeout(()=>{this.blink();this.blinkTimer=setTimeout(()=>this.scheduleBlink(),220)},2700+Math.random()*3300);
 },
 pat(preview=false){
  const lines=['嗯？……再摸一下也可以。','不是在发呆，只是在陪你。','今天也一起慢慢来，喵。','手好暖……'];const text=lines[Math.floor(Math.random()*lines.length)];
  if(preview){$('petPreviewText').textContent=text;}else{$('petSpeech').textContent=text;$('petSpeech').hidden=false;clearTimeout(this.talkTimer);this.talkTimer=setTimeout(()=>{$('petSpeech').hidden=true},3200)}
  if(this.canAnimate()){clearTimeout(this.blinkTimer);this.clearEyes();for(const id of ['desktopPetStage','petPreviewStage'])$(id)?.classList.add('pet-happy');this.eyeTimer=setTimeout(()=>{this.clearEyes();this.scheduleBlink()},900)}
 },
 init(){
  const icon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 10-1-7 7 4h2l7-4-1 7c4 8-18 8-14 0ZM8 12h1m6 0h1m-6 3 2 1 2-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  $('navLife').insertAdjacentHTML('afterend','<button type="button" id="navPet">'+icon+'<span>桌宠衣橱</span></button>');$('navPet').onclick=()=>this.open();
  document.body.insertAdjacentHTML('beforeend',`<aside class="desktop-pet" id="desktopPet" aria-label="猫娘桌宠" hidden><p class="pet-speech" id="petSpeech" role="status" hidden></p><div class="pet-dock-toolbar"><button type="button" id="petDragHandle" aria-label="拖动桌宠；也可用方向键移动" title="拖动 / 方向键移动">⠿</button><button type="button" id="desktopPetToggle" aria-label="收起桌宠" aria-expanded="true">−</button></div><button type="button" id="desktopPetStage" class="pet-stage-button" aria-label="摸摸猫娘的头"></button><div class="desktop-pet-caption"><strong id="desktopPetName"></strong><button type="button" id="petDressUp" title="打开桌宠衣橱">换装 ↗</button></div></aside>`);
  $('desktopPetToggle').onclick=()=>{if(this.persist({collapsed:!this.state().collapsed}))this.apply()};$('desktopPetStage').onclick=()=>this.pat();$('petDressUp').onclick=()=>this.open();
  const handle=$('petDragHandle');handle.onpointerdown=e=>{if(e.button!==0)return;const r=$('desktopPet').getBoundingClientRect();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);e.preventDefault()};
  handle.onpointermove=e=>{if(this.drag?.id!==e.pointerId)return;this.moveTo(this.drag.left+e.clientX-this.drag.x,this.drag.top+e.clientY-this.drag.y)};
  handle.onpointerup=e=>{if(this.drag?.id!==e.pointerId)return;this.drag=null;this.savePosition()};handle.onpointercancel=()=>{this.drag=null;this.position()};
  handle.onkeydown=e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(!delta)return;e.preventDefault();e.stopPropagation();const r=$('desktopPet').getBoundingClientRect();this.moveTo(r.left+delta[0],r.top+delta[1]);this.savePosition()};
  const profile=Presentation.profile.bind(Presentation);Presentation.profile=()=>{profile();if(!LocalProfiles.current)return;$('modalBody').insertAdjacentHTML('beforeend','<div class="pet-profile-link"><span>猫娘桌宠</span><button type="button" class="btn" id="openPetCustomizer">打开衣橱 ↗</button></div>');$('openPetCustomizer').onclick=()=>this.open()};
  const settings=TerminalSettings.open.bind(TerminalSettings);TerminalSettings.open=()=>{settings();const links=document.querySelector('#modalBody .settings-links');if(!links)return;links.insertAdjacentHTML('beforeend','<button type="button" id="settingsPet">桌宠衣橱<span>换装、眨眼、显示与大小 ↗</span></button>');$('settingsPet').onclick=()=>this.open()};
  this.preferences=new MutationObserver(()=>{this.scheduleBlink();this.position()});this.preferences.observe(document.body,{attributes:true,attributeFilter:['class']});
  this.dialogState=new MutationObserver(()=>this.scheduleBlink());this.dialogState.observe($('modal'),{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',()=>this.scheduleBlink());matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>this.scheduleBlink());
  window.addEventListener('resize',()=>this.position());$('modal').addEventListener('close',()=>this.scheduleBlink());this.apply();
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>CharacterCustomizer.init());else CharacterCustomizer.init();
