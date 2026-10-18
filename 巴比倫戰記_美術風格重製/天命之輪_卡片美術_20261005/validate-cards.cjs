'use strict';
const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/X/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'cards.json'),'utf8'));
 if(data.cards.length!==24||new Set(data.cards.map(c=>c.key)).size!==24)throw Error('Card count or duplicate keys');
 if(data.cards.filter(c=>c.collection==='star').length!==12||data.cards.filter(c=>c.collection==='evil').length!==12)throw Error('Collection count');
 let checked=0;
 for(const card of data.cards){
  for(const [file,w,h] of [[card.png,768,1152],[card.webp,384,576]]){
   const m=await sharp(path.join(__dirname,file)).metadata();
   if(m.width!==w||m.height!==h)throw Error('Bad card dimensions: '+file);
   await sharp(path.join(__dirname,file)).stats();checked++;
  }
  const svg=fs.readFileSync(path.join(__dirname,'source_svg','card_'+card.key+'.svg'),'utf8');
  if(!svg.includes(card.name)||!svg.includes(card.subtitle))throw Error('Missing label: '+card.key);
 }
 const back=await sharp(path.join(__dirname,data.back)).metadata();
 if(back.width!==384||back.height!==576)throw Error('Bad back');checked++;
 fs.writeFileSync(path.join(__dirname,'驗證結果.json'),JSON.stringify({cards:24,star:12,evil:12,imageFilesChecked:checked,back:1,labels:'matched metadata',integration:'not integrated into the live game',verified:new Date().toISOString()},null,2));
 console.log(JSON.stringify({cards:24,filesChecked:checked,labels:true,dimensions:true}));
}
main().catch(e=>{console.error(e);process.exit(1)});
