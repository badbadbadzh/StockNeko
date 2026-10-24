'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),url=require('node:url');
const Store=require('./store'),{AppError,insist}=require('./common'),{Market}=require('./market'),Platform=require('./platform'),{FxRates}=require('./fx-rates'),{resolveStaticFile}=require('./static-files');
function env(name,fallback){return process.env[name]===undefined?fallback:process.env[name];}
const root=path.resolve(__dirname,'..'),config={
 host:env('HOST','127.0.0.1'),port:Number(env('PORT',8765)),dataDir:path.resolve(env('DATA_DIR','./data')),
 provider:env('MARKET_PROVIDER','demo').toLowerCase()==='tushare'?'tushare':'demo',token:env('TUSHARE_TOKEN',''),licensed:env('MARKET_DATA_LICENSED','false')==='true',quoteApi:env('TUSHARE_QUOTES','rt_k'),minutes:env('TUSHARE_MINUTES','false')==='true',indexRT:env('TUSHARE_INDEX_RT','false')==='true',financials:env('TUSHARE_FINANCIALS','false')==='true',rpm:Number(env('PROVIDER_REQUESTS_PER_MINUTE',30)),pollSeconds:Number(env('QUOTE_POLL_SECONDS',60)),maxAge:Number(env('QUOTE_MAX_AGE_SECONDS',120)),delay:env('QUOTE_DELAY_SECONDS','')===''?null:Number(env('QUOTE_DELAY_SECONDS')),rules:{commission:Number(env('COMMISSION_RATE',.0003)),minCommission:Math.round(Number(env('MIN_COMMISSION_YUAN',5))*100),stamp:Number(env('STAMP_TAX_RATE',.0005)),transfer:Number(env('TRANSFER_RATE',.00001))}
};
const store=new Store(path.join(config.dataDir,'stock-meow.sqlite')),market=new Market(config,store),platform=new Platform(store,market,config),fx=new FxRates(store);let ticker;
const json=(res,status,data,extra={})=>{const body=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(body);};
const parseBody=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>1024*1024)reject(new AppError('请求体过大。',413));});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new AppError('请求 JSON 无效。',400));}});req.on('error',reject);});
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));}
function csrf(req,session){if(req.method==='GET'||req.method==='HEAD')return;insist(session&&session.csrf===req.headers['x-csrf-token'],'请求验证已过期，请刷新页面。',403,'CSRF');}
function auth(req){const s=platform.authenticate(cookies(req).sid);insist(s,'请先登录平台账户。',401,'AUTH');return s;}
function route(req,res){const parsed=url.parse(req.url,true),parts=parsed.pathname.split('/').filter(Boolean);return {parsed,parts};}
async function api(req,res){const {parsed,parts}=route(req,res);if(parts[0]!=='api')return false;const method=req.method,body=method==='GET'?parsed.query:await parseBody(req);let session=null,user=null;const publicEndpoint=(parts[1]==='health'&&method==='GET')||(parts[1]==='market'&&method==='GET')||(parts[1]==='fx'&&method==='GET');if(!(publicEndpoint||(parts[1]==='auth'&&['login','register'].includes(parts[2])))){session=auth(req);user=session.user;csrf(req,session);}
 const out=async()=>{if(parts[1]==='health'&&method==='GET')return {ok:true,market:market.status(),version:'2.0'};
 if(parts[1]==='fx'&&method==='GET'&&parts.length===3){if(parts[2]==='latest')return fx.latest();if(parts[2]==='history')return fx.history(body.days===undefined?30:body.days);}
 if(parts[1]==='auth'&&method==='POST'&&parts[2]==='register'){const u=platform.register(body),s=platform.session(u);return {user:platform.me(u),session:s};}
 if(parts[1]==='auth'&&method==='POST'&&parts[2]==='login'){const u=platform.login(body),s=platform.session(u);return {user:platform.me(u),session:s};}
 if(parts[1]==='auth'&&method==='POST'&&parts[2]==='logout'){store.remove('sessions',require('./common').hash(cookies(req).sid));return {ok:true};}
 if(parts[1]==='me'&&method==='GET')return platform.me(user);
 if(parts[1]==='profile'&&method==='PATCH'){const p=platform.profile(user),next={...p};for(const key of ['name','bio','publicScores','shareScores','theme'])if(body[key]!==undefined)next[key]=body[key];if(next.name!==p.name){insist(typeof next.name==='string'&&next.name.trim().length>=2&&next.name.trim().length<=20,'名称长度为 2–20 个字。');store.db.prepare('UPDATE users SET username=? WHERE id=?').run(next.name.trim(),user);next.name=next.name.trim();}store.put('profiles',user,next);return next;}
 if(parts[1]==='market'&&method==='GET'){if(parts[2]==='status')return market.status();if(parts[2]==='search'){await market.refresh();return market.search(body);}if(parts[2]==='detail'){await market.refresh();return market.detail(body.code);}if(parts[2]==='history'){await market.refresh();return market.history(body.code,body.period||'day');}if(parts[2]==='financials'){await market.refresh();return market.financials(body.code);}if(parts[2]==='events'){await market.refresh();return market.events();}if(parts[2]==='refresh'){return market.refresh(true);}}
 if(parts[1]==='account'&&method==='GET')return platform.publicAccount(user,body.account||'main');
 if(parts[1]==='account'&&method==='POST'&&parts[2]==='order')return platform.order(user,body);
 if(parts[1]==='account'&&method==='POST'&&parts[2]==='cancel')return platform.change(user,body.account||'main',a=>require('./broker').cancel(a,body.orderId));
 if(parts[1]==='account'&&method==='POST'&&parts[2]==='watch')return platform.watch(user,body.code,body.on!==false);
 if(parts[1]==='account'&&method==='POST'&&parts[2]==='activity')return platform.activity(user,body.type,body.value||'');
 if(parts[1]==='account'&&method==='POST'&&parts[2]==='risk')return platform.risk(user,body.answer);
 if(parts[1]==='account'&&method==='POST'&&parts[2]==='alert')return platform.alert(user,body);
 if(parts[1]==='account'&&method==='POST'&&parts[2]==='predict')return platform.predict(user,body);
 if(parts[1]==='friends'&&method==='GET'&&parts[2]==='messages')return platform.messages(user,body.user);
 if(parts[1]==='friends'&&method==='GET'&&parts[2]==='scores')return platform.friendScores(user,body.user);
 if(parts[1]==='friends'&&method==='GET')return platform.friends(user);
 if(parts[1]==='friends'&&method==='POST'&&parts[2]==='request')return platform.requestFriend(user,body.user);
 if(parts[1]==='friends'&&method==='POST'&&parts[2]==='respond')return platform.respondFriend(user,body.key,body.accept===true);
 if(parts[1]==='friends'&&method==='POST'&&parts[2]==='messages')return platform.send(user,body.user,body.text);
 if(parts[1]==='battles'&&method==='GET')return platform.battlesFor(user).map(b=>platform.battleView(b,user));
 if(parts[1]==='battles'&&method==='POST'&&parts[2]==='create')return platform.createBattle(user,body.title);
 if(parts[1]==='battles'&&method==='POST'&&parts[2]==='join')return platform.joinBattle(user,body.token);
 if(parts[1]==='battles'&&method==='POST'&&parts[2]==='start')return platform.startBattle(user,body.id);
 if(parts[1]==='leaderboard'&&method==='GET')return platform.leaderboard(user,body.type||'weekly');
 throw new AppError('没有这个接口。',404,'NOT_FOUND');};
 try{const data=await out();const headers={};if(parts[1]==='auth'&&method==='POST'&&['login','register'].includes(parts[2]))headers['Set-Cookie']=`sid=${encodeURIComponent(data.session.token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`;delete data.session?.token;json(res,200,{ok:true,data,...(data.session?{session:data.session}:{}),...(parts[1]==='health'?{}:{serverTime:new Date().toISOString()})},headers);}catch(e){const error=e instanceof AppError?e:new AppError('服务器暂时无法完成请求。',500,'INTERNAL');if(!(e instanceof AppError))console.error(e);json(res,error.status,{ok:false,error:{code:error.code,message:error.message}});}
 return true;}
function serve(req,res){
 if(req.url.startsWith('/api/'))return api(req,res).catch(e=>{const error=e instanceof AppError?e:new AppError('服务器暂时无法完成请求。',500,'INTERNAL');json(res,error.status,{ok:false,error:{code:error.code,message:error.message}});});
 const asset=['GET','HEAD'].includes(req.method)?resolveStaticFile(root,req.url):null;
 if(!asset)return json(res,404,{ok:false,error:{code:'NOT_FOUND',message:'页面不存在。'}});
 res.writeHead(200,{'Content-Type':asset.type,'Cache-Control':asset.html?'no-store':'public,max-age=3600','X-Content-Type-Options':'nosniff'});
 if(req.method==='HEAD')return res.end();
 const stream=fs.createReadStream(asset.file);stream.on('error',()=>res.destroy());stream.pipe(res);
}
async function tick(){try{await market.refresh();platform.tick();await platform.settlePredictions();}catch(e){console.error('[market]',e.message);}}
const server=http.createServer(serve);server.listen(config.port,config.host,()=>{console.log(`拟股喵喵平台：http://${config.host}:${config.port}`);console.log(`行情：${config.provider==='tushare'?'Tushare Pro（服务端代理）':'Demo Data（明确标记，未连接真实行情）'}`);tick();});ticker=setInterval(tick,Math.max(5000,config.pollSeconds*1000));process.on('SIGINT',()=>{clearInterval(ticker);store.close();server.close(()=>process.exit(0));});process.on('SIGTERM',()=>{clearInterval(ticker);store.close();server.close(()=>process.exit(0));});
