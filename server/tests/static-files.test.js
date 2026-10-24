'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {resolveStaticFile}=require('../static-files');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'stock-meow-public-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['outputs','docs','assets','docs/assets','outputs/assets','data','server','work'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 for(const [name,body]of Object.entries({'outputs/拟股喵喵-A股生存手记.html':'game','docs/index.html':'docs','assets/icon.png':'image','docs/assets/font.woff2':'font','outputs/assets/style.css':'css','.env':'test-secret','data/stock-meow.sqlite':'database','server/index.js':'server','work/engine.js':'engine','package.json':'package','assets/config.js':'script'}))fs.writeFileSync(path.join(root,name),body);
 return root;
}

test('only explicit game pages and safe asset directories are served',t=>{
 const root=fixture(t);
 for(const url of ['/','/index.html','/docs/index.html',encodeURI('/outputs/拟股喵喵-A股生存手记.html')])assert.equal(resolveStaticFile(root,url).html,true);
 for(const url of ['/assets/icon.png?v=1','/docs/assets/font.woff2','/outputs/assets/style.css'])assert.equal(resolveStaticFile(root,url).html,false);
 assert.equal(resolveStaticFile(root,'/assets/icon.png').type,'image/png');
});

test('private files, source scripts, traversal and malformed URLs are denied',t=>{
 const root=fixture(t);
 for(const url of ['/.env','/data/stock-meow.sqlite','/server/index.js','/work/engine.js','/package.json','/assets/config.js','/outputs/supabase-config.example.js','/assets/../.env','/assets/%2e%2e/.env','/assets/%252e%252e/.env','/assets/..%5c.env','/assets/%00.png','/assets/%E0%A4%A','/assets//../../data/stock-meow.sqlite','/index.html/../../.env','/other.html','/assets/.hidden.png'])assert.equal(resolveStaticFile(root,url),null,url);
});

test('asset directory symlinks cannot expose private or external files',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'data','private.png'),'private');
 try{fs.symlinkSync(path.join(root,'data'),path.join(root,'assets','leak'),'junction');}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.skip('Host does not permit directory links');return;}throw e;}
 assert.equal(resolveStaticFile(root,'/assets/leak/private.png'),null);
});
