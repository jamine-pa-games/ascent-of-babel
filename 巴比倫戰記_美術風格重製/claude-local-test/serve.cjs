'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.argv[2] || 4179);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer((req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    let file = path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch {res.writeHead(400).end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log(`Babylon local test: http://127.0.0.1:${port}/`));
