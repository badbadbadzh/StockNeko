'use strict';
const fs=require('node:fs'),path=require('node:path');
const GAME='拟股喵喵-A股生存手记.html';
const HTML={'/':'outputs/'+GAME,'/index.html':'outputs/'+GAME,'/docs/index.html':'docs/index.html',['/outputs/'+GAME]:'outputs/'+GAME};
const ASSET_TYPES={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.css':'text/css; charset=utf-8'};

// The built game embeds its scripts. Only explicit pages and dedicated asset
// directories are public; repository sources, configuration and saves are not.
function resolveStaticFile(root,requestUrl){
 try{
  const pathname=decodeURIComponent(String(requestUrl).split(/[?#]/,1)[0]);
  if(!pathname.startsWith('/')||/[\\\0-\x1f%]/.test(pathname)||pathname.split('/').some(s=>s==='.'||s==='..'||s.startsWith('.')))return null;
  const canonicalRoot=fs.realpathSync(root);
  let relative=HTML[pathname],type='text/html; charset=utf-8',assetRoot=null;
  if(!relative){
   const match=/^\/(assets|docs\/assets|outputs\/assets)\/(.+)$/.exec(pathname);
   if(!match)return null;
   type=ASSET_TYPES[path.extname(match[2]).toLowerCase()];
   if(!type)return null;
   relative=pathname.slice(1);assetRoot=path.resolve(canonicalRoot,match[1]);
  }
  const expected=path.resolve(canonicalRoot,relative),file=fs.realpathSync(expected);
  if(assetRoot){const rel=path.relative(assetRoot,file);if(!rel||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||rel==='..')return null;}
  else if(path.relative(expected,file)!=='')return null;
  if(!fs.statSync(file).isFile())return null;
  return {file,type,html:!!HTML[pathname]};
 }catch{return null;}
}
module.exports={resolveStaticFile};
