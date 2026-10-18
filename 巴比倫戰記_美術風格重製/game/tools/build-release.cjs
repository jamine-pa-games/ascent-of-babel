'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let scripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (!/\bsrc=/.test(match[1]) && match[2].trim()) {
    new vm.Script(match[2], {filename: `inline-${++scripts}.js`});
  }
}
new vm.Script(fs.readFileSync(path.join(root, 'manuscript.js'), 'utf8'), {filename:'manuscript.js'});
const report = JSON.parse(fs.readFileSync(path.join(root,'asset-report.json'),'utf8'));
if (report.remaining.length) throw new Error('Unconverted assets: '+report.remaining.join(', '));
const keys = new Set();
for (const asset of report.assets) {
  if (keys.has(asset.key)) throw new Error('Duplicate asset: '+asset.key);
  keys.add(asset.key);
  const file = path.join(root,'art',asset.key+(asset.key.startsWith('sc_')?'.jpg':'.webp'));
  if (!fs.existsSync(file) || !fs.statSync(file).size) throw new Error('Missing asset: '+asset.key);
}
fs.mkdirSync(dest,{recursive:true});
for (const name of ['index.html','manuscript.css','manuscript.js','art','vendor']) {
  fs.cpSync(path.join(root,name),path.join(dest,name),{recursive:true});
}
fs.writeFileSync(path.join(dest,'_headers'),'/art/*\n  Cache-Control: public, max-age=3600\n/index.html\n  Cache-Control: no-cache\n/manuscript.js\n  Cache-Control: no-cache\n/manuscript.css\n  Cache-Control: no-cache\n');
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files = walk(dest).filter(p=>!p.endsWith('release-manifest.json')).map(p=>({
  path:path.relative(dest,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,
  sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
}));
const manifest={edition:'2026.10.04-manuscript-Q-mascot-preserved',totalAssets:keys.size,generatedAssets:report.generated,preservedAssets:report.preserved||0,inlineScriptsChecked:scripts,totalBytes:files.reduce((n,f)=>n+f.bytes,0),files};
fs.writeFileSync(path.join(dest,'release-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({assets:keys.size,files:files.length,bytes:manifest.totalBytes,output:dest}));
