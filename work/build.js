const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const core=['pako.min','stock-database','quote-provider','indicators','market-engine','order-engine','analytics','news-engine','event-manager','save-manager'].map(n=>read('v2/'+n+'.js')).join('\n');
const icon=fs.readFileSync(path.join(__dirname,'v4/icon.png')).toString('base64');
const doll=fs.readFileSync(path.join(__dirname,'v2/player-character.webp')).toString('base64');
const capitalFace=fs.readFileSync(path.join(__dirname,'v5/capital-face.png')).toString('base64');
const displayFont=fs.readFileSync(path.join(__dirname,'v7/fonts/title-subset.woff2')).toString('base64');
const displayFontCss=`@font-face{font-family:'Meow Brush';src:url(data:font/woff2;base64,${displayFont}) format('woff2');font-style:normal;font-weight:400;font-display:swap;}\n`;
const html=read('index.template.html')
  .replace('</style>',()=>displayFontCss+read('v2/theme.css')+'\n'+read('v2/finishing.css')+'\n'+read('v3/life.css')+'\n'+read('v4/polish.css')+'\n'+read('v5/terminal.css')+'\n'+read('v5/capital-horror.css')+'\n'+read('v5/psychology.css')+'\n'+read('v5/extensions.css')+'\n'+read('v5/tactile.css')+'\n'+read('v5/start-screen.css')+'\n'+read('v6/platform-ui.css')+'\n'+read('v7/toy-glass.css')+'\n'+read('v7/liquid-glass.css')+'\n'+read('v7/physical-controls.css')+'\n'+read('v7/glass-depth.css')+'\n'+read('v7/forex.css')+'\n</style>')
  .replace(/<style>([\s\S]*?)<\/style>/,(_,css)=>'<style>'+css.replace(/(font-size:\s*)([\d.]+)px/g,'$1calc($2px * var(--text-scale, 1))').replace(/(font:\s*)([\d.]+)px/g,'$1calc($2px * var(--text-scale, 1))')+'</style>')
  .replace('__LOCAL_LOGIN__',()=>read('v3/local-login.html'))
  .replace('__LIFE_SHELL__',()=>read('v3/life-shell.html'))
  .replace('__ENGINE__',()=>core+'\n'+read('v3/life-engine.js')+'\n'+read('v4/story-engine.js')+'\n'+read('engine.js')+'\n'+read('v3/local-profiles.js')+'\n'+read('v3/local-vault.js'))
  .replace('__UI__',()=>`const GameAssets={icon:'data:image/png;base64,${icon}',doll:'data:image/webp;base64,${doll}',capitalFace:'data:image/png;base64,${capitalFace}'};\n`+read('v2/chart-view.js')+'\n'+read('ui.js').replace("const PLAYER_CHARACTER='__PLAYER_CHARACTER__';","const PLAYER_CHARACTER='';")+'\n'+read('v2/ui-features.js')+'\n'+read('v3/life-ui.js')+'\n'+read('v3/auth-ui.js')+'\n'+read('v4/story-ui.js')+'\n'+read('v4/polish-ui.js')+'\n'+read('v5/settings.js')+'\n'+read('v5/terminal-ui.js')+'\n'+read('v5/capital-horror.js')+'\n'+read('v5/psychology.js')+'\n'+read('v5/extensions.js')+'\n'+read('v6/platform-ui.js')+'\n'+read('v5/start-screen.js')+'\n'+read('v7/toy-glass.js')+'\n'+read('v7/liquid-glass.js')+'\n'+read('v7/forex.js')+'\n'+read('v7/forex-chart.js'));
const target=path.join(__dirname,'../outputs/拟股喵喵-A股生存手记.html');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,html,'utf8');
console.log(target+' ('+Math.round(Buffer.byteLength(html)/1024)+' KB)');
const pagesDir=path.join(__dirname,'../docs');
fs.mkdirSync(pagesDir,{recursive:true});
fs.writeFileSync(path.join(pagesDir,'index.html'),html,'utf8');
fs.writeFileSync(path.join(pagesDir,'.nojekyll'),'','utf8');
console.log('GitHub Pages: docs/index.html');
