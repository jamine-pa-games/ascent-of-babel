'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=path.dirname(root);
const source=path.join(base,'新版原始素材','artpack');
const fresh=path.join(base,'新版角色美術_20261004');
const out=path.join(base,'全套美術_新版規則_20261004');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const newReport=JSON.parse(fs.readFileSync(path.join(fresh,'素材清單.json'),'utf8'));
if(newReport.missing.length)throw Error('Cannot release incomplete art: '+newReport.missing.join(', '));
fs.mkdirSync(out,{recursive:true});
const items=[];
for(const file of walk(source)){
 const rel=path.relative(source,file),key=path.basename(file,path.extname(file));
 if(!/\.(png|jpg)$/i.test(file)||key.startsWith('00_'))continue;
 const dest=path.join(out,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});
 const protectedAsset=key.startsWith('worn_')||key.startsWith('hum_');
 let replacement=file,status='original';
 if(!protectedAsset){
  if(newReport.assets.some(a=>a.key===key)){replacement=path.join(fresh,'PNG_512',key+'.png');status='new-20261004';}
  else if(fs.existsSync(path.join(root,'production-png',key+'.png'))){replacement=key.startsWith('sc_')?path.join(root,'art',key+'.jpg'):path.join(root,'production-png',key+'.png');status='previous-remaster';}
 }
 fs.copyFileSync(replacement,dest);
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 if(protectedAsset&&hash(file)!==hash(dest))throw Error('Protected artwork changed: '+key);
 items.push({key,path:rel.replaceAll('\\','/'),status,sha256:hash(dest)});
}
fs.cpSync(path.join(fresh,'手機預覽'),path.join(out,'手機預覽'),{recursive:true});
fs.copyFileSync(path.join(fresh,'使用說明.md'),path.join(out,'新角色使用說明.md'));
fs.copyFileSync(path.join(fresh,'生成提示詞.json'),path.join(out,'新角色生成提示詞.json'));
fs.writeFileSync(path.join(out,'驗收清單.json'),JSON.stringify({total:items.length,newCharacters:items.filter(a=>a.status==='new-20261004').length,previousRemaster:items.filter(a=>a.status==='previous-remaster').length,preserved:items.filter(a=>a.status==='original').length,items},null,2));
console.log(JSON.stringify({output:out,total:items.length,protected:items.filter(a=>a.status==='original').length}));
