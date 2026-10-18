/* One portrait identity source shared by selection, dialogue and duel panels. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.PortraitUI=api;api.install();}})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const slots={warrior:{m:0,f:1},support:{f:2,m:3},mage:{f:4,m:5},summoner:{f:6,m:7},rogue:{m:8,f:9},sorcerer:{m:10,f:11},alchemist:{f:12,m:13}};
 const frameTier=p=>p?.team==='ally'?'silver':p?.boss||p?.team==='enemy'||p?.kind&&!p.cls?'enemy':p?.adv?'gold':'silver';
 const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let atlas=null,cache=new Map(),loaded=false;
 function slotFor(p){if(p.kind==='nimrod')return 14;if(p.kind==='selena')return 15;if(p.cls&&!p.lead&&p.human!==false)return slots[p.cls]?.[p.sex||DEFAULT_SEX[p.cls]];return undefined;}
 function original(p){if(p.portrait&&!p.portrait.includes('portrait-atlas'))return p.portrait;if(p.kind&&MONS[p.kind])return small(monArt(p.kind),192).toDataURL();return small(p.lead||p.human===false?drawHero(p.cls,p.col||5):drawHuman(p.cls,p.sex||DEFAULT_SEX[p.cls]),192).toDataURL();}
 function src(p){const i=slotFor(p);if(loaded&&i!==undefined)return cache.get(i);return original(p);}
 function html(p,extra=''){const tier=frameTier(p);return '<img class="portrait-medallion '+escape(extra)+'" data-portrait-frame="'+tier+'" data-portrait-key="'+(slotFor(p)??'original')+'" alt="'+escape(p.name||'角色肖像')+'" src="'+src(p)+'">';}
 function update(img,p){if(!p)return;img.src=src(p);img.classList.add('portrait-medallion');img.dataset.portraitFrame=frameTier(p);img.dataset.portraitKey=slotFor(p)??'original';img.alt=p.name||'角色肖像';}
 function install(){document.documentElement.dataset.portraitEdition='20261006-totem1';atlas=new Image();atlas.onload=()=>{const w=atlas.naturalWidth/4,h=atlas.naturalHeight/4;for(let i=0;i<16;i++){const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(atlas,(i%4)*w,Math.floor(i/4)*h,w,h,0,0,256,256);cache.set(i,c.toDataURL('image/webp',.88));}loaded=true;document.querySelectorAll('[data-portrait-key]').forEach(img=>{const v=cache.get(Number(img.dataset.portraitKey));if(v)img.src=v;});};atlas.src='art/portrait-atlas-20261006.png';}
 return{slots,frameTier,slotFor,src,html,update,install};
});
