'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/X/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=__dirname,base=path.dirname(root),artRoot=path.join(base,'新版角色美術_20261004');
const assets=JSON.parse(fs.readFileSync(path.join(artRoot,'素材清單.json'),'utf8')).assets.slice(0,24);
const prompts=JSON.parse(fs.readFileSync(path.join(root,'生成提示詞.json'),'utf8'));
const starElements=['火','地','闇','水','火','地','光','闇','火','水','水','水'];
const evilElements=['火','風','水','闇','地','火','闇','光','風','水','闇','闇'];
const zodiac=['牡羊','金牛','雙子','巨蟹','獅子','處女','天秤','天蠍','射手','摩羯','水瓶','雙魚'];
const titles=['城門的蛇龍','暴風獅魔','太古的魚人','毒角蛇','扛門的牛人','狂犬人','地底的蠍人','長髮的守門者','活的風暴','七頭蛇','太古的大龍','命運之板持有者'];
for(const p of ['templates','cards_png','cards_webp','手機預覽','source_svg'])fs.mkdirSync(path.join(root,p),{recursive:true});
const uri=p=>'data:image/png;base64,'+fs.readFileSync(p).toString('base64');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
async function main(){
 for(const p of prompts){
  const dest=path.join(root,'templates',p.key+'.png');
  if(!fs.existsSync(dest))await sharp(p.path).resize(768,1152,{fit:'fill'}).png().toFile(dest);
 }
 const cards=[];
 for(let i=0;i<assets.length;i++){
  const a=assets[i],star=i<12,n=star?i:i-12;
  const element=star?starElements[n]:evilElements[n],subtitle=star?zodiac[n]:titles[n];
  const frame=path.join(root,'templates',star?'frame_star.png':'frame_evil.png');
  const sprite=path.join(artRoot,'原始高解析',a.key+'.png');
  const fitted=await sharp(sprite).trim({threshold:8}).resize(560,650,{fit:'inside'}).png().toBuffer();
  const meta=await sharp(fitted).metadata(),left=Math.floor((768-meta.width)/2),top=892-meta.height;
  const header=(star?'十二星宿':'提阿瑪特')+' · '+String(n+1).padStart(2,'0')+' / 12';
  const subline=(element?element+'　·　':'')+subtitle;
  // Kingu uses 闇, confirmed against the 2026-10-05 live game definition.
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="768" height="1152" viewBox="0 0 768 1152"><image width="768" height="1152" href="${uri(frame)}"/><image x="${left}" y="${top}" width="${meta.width}" height="${meta.height}" href="data:image/png;base64,${fitted.toString('base64')}"/><g font-family="Microsoft JhengHei, Noto Sans CJK TC, sans-serif" text-anchor="middle"><text x="384" y="${star?136:124}" font-size="28" font-weight="700" letter-spacing="2" fill="#493421">${header}</text><text x="384" y="996" font-size="${a.name.length>7?43:50}" font-weight="700" letter-spacing="3" fill="#f9e7b9">${esc(a.name)}</text><text x="384" y="1037" font-size="25" letter-spacing="2" fill="#e4c98f">${esc(subline)}</text><text x="384" y="1120" font-size="20" letter-spacing="8" paint-order="stroke fill" stroke="#172126" stroke-width="2" fill="#f4d695">天命之輪</text></g></svg>`;
  const name='card_'+a.key;
  const finalSvg=svg.replace('y="996"','y="1008"').replace('y="1037"','y="1045"');
  fs.writeFileSync(path.join(root,'source_svg',name+'.svg'),finalSvg);
  const png=path.join(root,'cards_png',name+'.png');
  await sharp(Buffer.from(finalSvg)).png().toFile(png);
  await sharp(png).resize(384,576).webp({quality:92,effort:5}).toFile(path.join(root,'cards_webp',name+'.webp'));
  cards.push({key:a.key,name:a.name,collection:star?'star':'evil',index:n+1,element,subtitle,png:'cards_png/'+name+'.png',webp:'cards_webp/'+name+'.webp',sha256:crypto.createHash('sha256').update(fs.readFileSync(png)).digest('hex')});
 }
 await sharp(path.join(root,'templates','card_back.png')).resize(384,576).webp({quality:92}).toFile(path.join(root,'cards_webp','card_back.webp'));
 fs.writeFileSync(path.join(root,'cards.json'),JSON.stringify({width:768,height:1152,mobileWidth:384,mobileHeight:576,back:'cards_webp/card_back.webp',cards},null,2));
 for(let group=0;group<4;group++){
  const w=1024,h=2460,layers=[];
  let page=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#14272c"/><text x="55" y="60" font-family="Arial" font-size="19" letter-spacing="6" fill="#c2a970">BABYLON CHRONICLE</text><text x="55" y="125" font-family="Microsoft JhengHei" font-size="43" fill="#f2e2bb">天命之輪 · ${group<2?'星宿金卡':'邪獸朱銅卡'}</text><text x="55" y="169" font-family="Microsoft JhengHei" font-size="22" fill="#b7b8a8">${group%2?'07—12':'01—06'} / 收藏卡面</text></svg>`;
  for(let j=0;j<6;j++)layers.push({input:await sharp(path.join(root,cards[group*6+j].png)).resize(448,672).png().toBuffer(),left:52+j%2*472,top:218+Math.floor(j/2)*725});
  await sharp(Buffer.from(page)).composite(layers).jpeg({quality:94}).toFile(path.join(root,'手機預覽',String(group+1).padStart(2,'0')+'_'+(group<2?'星宿':'邪獸')+'卡.jpg'));
 }
 const cover=await sharp({create:{width:1040,height:900,channels:3,background:'#14272c'}}).composite(await Promise.all([cards[1].png,cards[23].png,'templates/card_back.png'].map(async(p,i)=>({input:await sharp(path.join(root,p)).resize(312,468).png().toBuffer(),left:28+i*336,top:110})))).jpeg({quality:94}).toBuffer();
 await sharp(cover).extract({left:0,top:65,width:1040,height:560}).jpeg({quality:94}).toFile(path.join(root,'手機預覽','00_卡面與卡背.jpg'));
 console.log(JSON.stringify({cards:cards.length,templates:3,previews:5,output:root}));
}
main().catch(e=>{console.error(e);process.exit(1)});
