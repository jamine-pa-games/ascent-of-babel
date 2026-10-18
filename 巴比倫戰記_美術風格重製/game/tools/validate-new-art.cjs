'use strict';
const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/X/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base=path.resolve(__dirname,'../..'),folder=path.join(base,'新版角色美術_20261004');
async function main(){
 const report=JSON.parse(fs.readFileSync(path.join(folder,'素材清單.json'),'utf8'));
 if(report.generated!==30||report.missing.length)throw Error('Incomplete generation');
 const results=[];
 for(const a of report.assets){
  const png=path.join(folder,'PNG_512',a.key+'.png'),webp=path.join(folder,'art',a.key+'.webp');
  for(const file of [png,webp]){
   const meta=await sharp(file).metadata(),stats=await sharp(file).stats();
   if(meta.width!==512||meta.height!==512||!meta.hasAlpha||stats.isOpaque)throw Error('Bad dimensions/transparency: '+file);
   const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let transparentBorder=true;
   for(let i=0;i<512;i++)for(const p of [i,(511*512+i),i*512,i*512+511])if(data[p*info.channels+3]!==0)transparentBorder=false;
   if(!transparentBorder)throw Error('Sprite touches frame: '+file);
  }
  results.push({key:a.key,png:true,webp:true,dimensions:'512x512',alpha:true,clearEdges:true});
 }
 const qa={verified:new Date().toISOString(),filesChecked:60,characters:30,results,scope:'Image format/alpha/bounds verification. New game chapter integration not yet verified; source not provided.'};
 fs.writeFileSync(path.join(folder,'驗證結果.json'),JSON.stringify(qa,null,2));
 console.log(JSON.stringify({characters:30,filesChecked:60,allTransparent:true,all512:true,allClearEdges:true}));
}
main().catch(e=>{console.error(e);process.exit(1)});
