/* A transparent, four-cell production atlas. Original files remain as fallback. */
(function(){
 const slots={grom:0,selena:1,ignis:2,hanzo:3},parts=new Map(),faces=new Map(),image=IMG.boss_atlas,oldArt=monArt;
 monArt=function(kind){const source=parts.get(kind);if(!source)return oldArt(kind);const [c,x]=canvas(256);x.drawImage(source,8,8,240,240);return c;};
 window.BossArtUI={portrait:kind=>faces.get(kind)};
 artReady.then(()=>{if(!image.naturalWidth)return;const w=image.naturalWidth/2,h=image.naturalHeight/2,areas={grom:[350,155,150],selena:[215,85,150],ignis:[215,85,145],hanzo:[315,55,145]};for(const [kind,i]of Object.entries(slots)){const c=document.createElement('canvas');c.width=c.height=512;c.getContext('2d').drawImage(image,i%2*w,Math.floor(i/2)*h,w,h,0,0,512,512);parts.set(kind,c);const f=document.createElement('canvas');f.width=f.height=192;const [x,y,s]=areas[kind];f.getContext('2d').drawImage(c,x,y,s,s,0,0,192,192);faces.set(kind,f.toDataURL('image/webp',.9));}document.querySelectorAll('[data-portrait-kind]').forEach(img=>{const face=faces.get(img.dataset.portraitKind);if(face)img.src=face;});document.documentElement.dataset.bossArtEdition='20261006-wardens1';});
})();
