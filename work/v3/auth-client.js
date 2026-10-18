'use strict';
// Supabase Auth 的轻量前端适配层。没有配置 URL/anon key 时只显示离线试玩，绝不伪造在线账号。
const AuthClient=(()=>{
  const STORAGE_KEY='nigumiaomiao-auth-session-v1';
  let config={};
  let session=null;
  const defaultConfig=()=>typeof window!=='undefined'&&window.NIGUMIAOMIAO_SUPABASE?window.NIGUMIAOMIAO_SUPABASE:{};
  function configure(next={}){config={...defaultConfig(),...next};return api;}
  function isConfigured(){return /^https:\/\/[^\s]+$/.test(String(config.url||''))&&String(config.anonKey||'').length>20;}
  function readStored(){try{const raw=localStorage.getItem(STORAGE_KEY);session=raw?JSON.parse(raw):null;}catch{session=null;}return session;}
  function persist(next){session=next||null;try{if(next)localStorage.setItem(STORAGE_KEY,JSON.stringify(next));else localStorage.removeItem(STORAGE_KEY);}catch{}return session;}
  function authUrl(path){return String(config.url).replace(/\/$/,'')+'/auth/v1'+path;}
  function restUrl(path){return String(config.url).replace(/\/$/,'')+'/rest/v1'+path;}
  async function request(url,options={}){
    if(!isConfigured())throw new Error('在线账号服务尚未配置。请填写 Supabase URL 与 anon key。');
    const headers={'apikey':config.anonKey,'Content-Type':'application/json',...(options.headers||{})};
    if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
    const res=await fetch(url,{...options,headers});
    let body=null;try{body=await res.json();}catch{}
    if(!res.ok){const msg=body?.msg||body?.message||body?.error_description||body?.error||`请求失败（${res.status}）`;throw new Error(normalizeError(msg));}
    return body;
  }
  function normalizeError(message){const m=String(message);if(/invalid login credentials/i.test(m))return'邮箱或密码不正确。';if(/email not confirmed/i.test(m))return'邮箱尚未验证，请先查收验证邮件。';if(/already registered|already exists|duplicate key/i.test(m))return'该邮箱或用户名已经注册。';if(/password/i.test(m)&&/6|short|length/i.test(m))return'密码至少需要 6 位。';if(/rate limit|too many/i.test(m))return'操作过于频繁，请稍后再试。';return m;}
  async function signUp({email,password,username,displayName}){
    const data=await request(authUrl('/signup'),{method:'POST',body:JSON.stringify({email,password,data:{username,display_name:displayName||username}})});
    if(data.session)persist(data.session);
    if(data.session?.access_token)await upsertProfile({username,display_name:displayName||username});
    return {user:data.user||null,session:data.session||null,needsEmailConfirmation:!data.session};
  }
  async function signIn(email,password){const data=await request(authUrl('/token?grant_type=password'),{method:'POST',body:JSON.stringify({email,password})});persist(data);await ensureProfile();return data;}
  async function signOut(){if(isConfigured()&&session?.access_token){try{await request(authUrl('/logout'),{method:'POST'});}finally{persist(null);}}else persist(null);}
  async function resetPassword(email){return request(authUrl('/recover'),{method:'POST',body:JSON.stringify({email})});}
  async function refresh(){if(!isConfigured()||!session?.refresh_token)return null;try{const data=await request(authUrl('/token?grant_type=refresh_token'),{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token}),headers:{Authorization:''}});persist(data);return data;}catch{persist(null);return null;}}
  async function getUser(){if(!session?.access_token)return null;try{return await request(authUrl('/user'));}catch(e){if(/expired|invalid/i.test(e.message))await refresh();return session?.access_token?request(authUrl('/user')):null;}}
  async function profile(){const user=await getUser();if(!user)return null;try{const rows=await request(restUrl('/profiles?select=*&id=eq.'+encodeURIComponent(user.id)),{headers:{Accept:'application/json'}});return rows?.[0]||null;}catch(e){throw new Error('账号已登录，但个人资料读取失败：'+e.message);}}
  async function upsertProfile(values){const user=await getUser();if(!user)return null;const payload={id:user.id,username:values.username,display_name:values.display_name||values.username,avatar_url:values.avatar_url||null,bio:values.bio||'',updated_at:new Date().toISOString()};const rows=await request(restUrl('/profiles?on_conflict=id'),{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});return rows?.[0]||payload;}
  async function updateProfile(values){const user=await getUser();if(!user)throw new Error('请先登录。');const payload={display_name:String(values.display_name||'').trim().slice(0,60),avatar_url:String(values.avatar_url||'').trim().slice(0,500)||null,bio:String(values.bio||'').trim().slice(0,500),updated_at:new Date().toISOString()};const rows=await request(restUrl('/profiles?id=eq.'+encodeURIComponent(user.id)),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});return rows?.[0]||payload;}
  function state(){return {configured:isConfigured(),session,user:session?.user||null};}
  const api={configure,isConfigured,readStored,persist,signUp,signIn,signOut,resetPassword,refresh,getUser,profile,upsertProfile,updateProfile,state};configure();readStored();return api;
})();
if(typeof module!=='undefined')module.exports=AuthClient;
