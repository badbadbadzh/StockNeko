const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(__dirname,'index.template.html'),'utf8')
 .replace('__CHARACTER_DATA__','data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,'character.webp')).toString('base64'))
 .replace('__ENGINE__',()=>fs.readFileSync(path.join(__dirname,'engine.js'),'utf8'))
 .replace('__UI__',()=>fs.readFileSync(path.join(__dirname,'ui.js'),'utf8'));
const target=path.join(root,'outputs','拟股喵喵-A股生存手记.html');
fs.writeFileSync(target,html,'utf8');console.log(target+' ('+Math.round(Buffer.byteLength(html)/1024)+' KB)');
