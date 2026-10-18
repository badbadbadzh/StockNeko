const http=require('http'),fs=require('fs'),path=require('path');
const html=path.join(__dirname,'../outputs/拟股喵喵-A股生存手记.html');
http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(fs.readFileSync(html));}).listen(8765,'127.0.0.1',()=>console.log('Game preview: http://127.0.0.1:8765'));
