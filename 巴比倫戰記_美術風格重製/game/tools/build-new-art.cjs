'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/X/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'), base=path.dirname(root);
const out=path.join(base,'新版角色美術_20261004');
const manifestDir=path.join(__dirname,'generated-new');
const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'new-characters-jobs.json'),'utf8'));
for(const sub of ['PNG_512','art','原始高解析','手機預覽'])fs.mkdirSync(path.join(out,sub),{recursive:true});
async function main(){
 const assets=[];
 for(const job of expected){
  const mf=path.join(manifestDir,job.key+'.json');if(!fs.existsSync(mf))continue;
  const item=JSON.parse(fs.readFileSync(mf,'utf8'));
  if(!item.path||!fs.existsSync(item.path))throw Error('Missing original: '+job.key);
  const source=await sharp(item.path).metadata(), stats=await sharp(item.path).stats();
  if(!source.hasAlpha||stats.isOpaque)throw Error('Not transparent: '+job.key);
  const dest=path.join(out,'PNG_512',job.key+'.png');
  const hash=crypto.createHash('sha256').update(fs.readFileSync(item.path)).digest('hex');
  const stamp=path.join(out,'原始高解析',job.key+'.sha256');
  if(!fs.existsSync(stamp)||fs.readFileSync(stamp,'utf8')!==hash){
   fs.copyFileSync(item.path,path.join(out,'原始高解析',job.key+'.png'));
   const fit=await sharp(item.path).trim({threshold:8}).resize(450,450,{fit:'inside'}).png().toBuffer();
   const m=await sharp(fit).metadata();
   await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:fit,left:Math.floor((512-m.width)/2),top:480-m.height}]).png().toFile(dest);
   await sharp(dest).webp({quality:94,alphaQuality:100,effort:6}).toFile(path.join(out,'art',job.key+'.webp'));
   fs.writeFileSync(stamp,hash);
  }
  const check=await sharp(dest).stats();
  assets.push({key:job.key,name:job.name,width:512,height:512,transparent:!check.isOpaque,sourceWidth:source.width,sourceHeight:source.height,prompt:item.prompt,sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')});
 }
 const report={generated:assets.length,expected:expected.length,missing:expected.filter(e=>!assets.some(a=>a.key===e.key)).map(e=>e.key),assets};
 fs.writeFileSync(path.join(out,'素材清單.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(out,'生成提示詞.json'),JSON.stringify(assets.map(({key,name,prompt})=>({key,name,prompt})),null,2));
 // Deterministic contact sheets only: no repainting or replacement of generated pixels.
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
 const groups=[['01_十二星宿',expected.slice(0,6)],['02_十二星宿',expected.slice(6,12)],['03_提阿瑪特邪獸',expected.slice(12,18)],['04_提阿瑪特邪獸',expected.slice(18,24)],['05_巴比倫章節',expected.slice(24)]];
 for(const [title,group] of groups){
  const ready=group.filter(j=>assets.some(a=>a.key===j.key));if(!ready.length)continue;
  const width=1000,height=1710,composite=[];
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ede2c9"/><rect x="24" y="24" width="952" height="1662" fill="none" stroke="#957543" stroke-width="2"/><text x="60" y="83" fill="#4a3930" font-size="18" letter-spacing="5" font-family="Arial">BABYLON CHRONICLE / CHARACTER ART</text><text x="60" y="142" fill="#282f31" font-size="42" font-family="Microsoft JhengHei">${title.slice(3)}</text><path d="M60 169H940" stroke="#a88c58"/>`;
  for(let i=0;i<group.length;i++){
   const j=group[i],x=45+(i%2)*465,y=195+Math.floor(i/2)*485;
   svg+=`<rect x="${x}" y="${y}" width="445" height="466" rx="6" fill="#e2d3b7"/><text x="${x+222}" y="${y+420}" text-anchor="middle" font-family="Microsoft JhengHei" font-size="25" fill="#293438">${escape(j.name)}</text><text x="${x+222}" y="${y+448}" text-anchor="middle" font-family="Arial" font-size="14" fill="#715f48">${j.key}.png</text>`;
   if(assets.some(a=>a.key===j.key))composite.push({input:await sharp(path.join(out,'PNG_512',j.key+'.png')).resize(398,398).png().toBuffer(),left:x+23,top:y+3});
  }
  svg+='</svg>';
  await sharp(Buffer.from(svg)).composite(composite).jpeg({quality:92}).toFile(path.join(out,'手機預覽',title+'.jpg'));
 }
 console.log(JSON.stringify({generated:assets.length,missing:report.missing,output:out}));
}
main().catch(e=>{console.error(e);process.exit(1)});
