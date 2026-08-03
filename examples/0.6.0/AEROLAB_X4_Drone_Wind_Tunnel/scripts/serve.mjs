import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=normalize(join(fileURLToPath(new URL('.',import.meta.url)),'..'));
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let path=normalize(join(root,pathname==='/'?'index.html':pathname));
  if(!path.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}
  try{if(statSync(path).isDirectory())path=join(path,'index.html');res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store','Cross-Origin-Opener-Policy':'same-origin'});createReadStream(path).pipe(res);}catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`AEROLAB X4: http://127.0.0.1:${port}`));
