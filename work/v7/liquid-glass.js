'use strict';
const LiquidGlass={
 pressed:new Map(),timers:new Map(),reduced:matchMedia('(prefers-reduced-motion: reduce)'),
 allowed(){return !this.reduced.matches&&!document.hidden&&!document.body.matches('.effects-off,.motion-off,.no-animations');},
 clearButton(button){clearTimeout(this.timers.get(button));this.timers.delete(button);button.classList.remove('liquid-press','liquid-spring');},
 press(button,key){if(!this.allowed()||!button||button.disabled)return;this.clearButton(button);this.pressed.set(key,button);button.classList.add('liquid-press');},
 release(key,bounce=true){const button=this.pressed.get(key);if(!button)return;this.pressed.delete(key);button.classList.remove('liquid-press');if(!bounce||!this.allowed()||!button.isConnected)return;button.classList.add('liquid-spring');this.timers.set(button,setTimeout(()=>{button.classList.remove('liquid-spring');this.timers.delete(button);},580));},
 reset(){for(const button of this.pressed.values())this.clearButton(button);for(const button of this.timers.keys())this.clearButton(button);this.pressed.clear();document.querySelectorAll('.liquid-pop').forEach(el=>el.classList.remove('liquid-pop'));},
 init(){
  const scenery='<div class="liquid-environment" aria-hidden="true"><i></i><i></i><i></i></div>';
  document.body.insertAdjacentHTML('afterbegin',scenery);$('authGate').insertAdjacentHTML('afterbegin',scenery);
  document.addEventListener('pointerdown',event=>{if(event.button!==0)return;this.press(event.target.closest('button'),event.pointerId);},{passive:true});
  window.addEventListener('pointerup',event=>this.release(event.pointerId),{passive:true});
  window.addEventListener('pointercancel',event=>this.release(event.pointerId,false),{passive:true});
  document.addEventListener('keydown',event=>{if(event.repeat||!['Enter',' '].includes(event.key))return;this.press(event.target.closest('button'),'key:'+event.key);});
  document.addEventListener('keyup',event=>this.release('key:'+event.key));
  window.addEventListener('blur',()=>this.reset());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  this.reduced.addEventListener('change',()=>this.reset());
  this.preferences=new MutationObserver(()=>{if(!this.allowed())this.reset();});
  this.preferences.observe(document.body,{attributes:true,attributeFilter:['class']});
  this.dialogs=new MutationObserver(records=>{for(const {target} of records){target.classList.remove('liquid-pop');if(target.open&&this.allowed())target.classList.add('liquid-pop');}});
  document.querySelectorAll('dialog').forEach(dialog=>{
   if(dialog.id==='capitalAlert')return; // Horror cuts in; it must never use the friendly modal spring.
   this.dialogs.observe(dialog,{attributes:true,attributeFilter:['open']});
   dialog.addEventListener('animationend',event=>{if(event.animationName==='liquid-dialog-in')dialog.classList.remove('liquid-pop');});
  });
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>LiquidGlass.init());else LiquidGlass.init();
