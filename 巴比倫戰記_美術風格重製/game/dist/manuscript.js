/* Babylon Chronicle — manuscript art edition. All combat rules/save keys stay in index.html. */
'use strict';
const ART_EDITION='2026.10.03-manuscript';
document.documentElement.dataset.artEdition=ART_EDITION;

function manuscriptSeal(el){
  return texC(256,256,x=>{
    x.translate(128,128);x.strokeStyle='#fff';x.fillStyle='#fff';x.lineWidth=3;x.lineCap='round';
    const circle=(r,a=0,b=Math.PI*2)=>{x.beginPath();x.arc(0,0,r,a,b);x.stroke()};
    const poly=(n,r,rot=0)=>{x.beginPath();for(let i=0;i<n;i++){const a=rot+i*Math.PI*2/n;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.closePath();x.stroke()};
    // Short wedge impressions replace random runic scratches.
    for(let i=0;i<16;i++){x.save();x.rotate(i*Math.PI/8);x.translate(0,-109);x.beginPath();x.moveTo(-4,-7);x.lineTo(5,-7);x.lineTo(0,7);x.closePath();x.fill();x.restore()}
    if(el==='地'){poly(4,90,Math.PI/4);poly(4,66,Math.PI/4);for(let i=0;i<4;i++){x.save();x.rotate(i*Math.PI/2);x.beginPath();x.moveTo(-20,-20);x.lineTo(-20,-45);x.lineTo(20,-45);x.lineTo(20,-20);x.stroke();x.restore()}}
    else if(el==='水'){circle(92);circle(74);for(let i=0;i<3;i++){x.beginPath();x.moveTo(-60,-30+i*30);x.bezierCurveTo(-20,-65+i*30,20,5+i*30,60,-30+i*30);x.stroke()}}
    else if(el==='火'){circle(95);for(let i=0;i<8;i++){x.save();x.rotate(i*Math.PI/4);x.beginPath();x.moveTo(0,-12);x.bezierCurveTo(-33,-44,0,-60,0,-89);x.bezierCurveTo(28,-54,25,-30,0,-12);x.stroke();x.restore()}}
    else if(el==='風'){circle(92,0,Math.PI*1.6);for(let i=0;i<3;i++){x.save();x.rotate(i*Math.PI*2/3);x.beginPath();for(let j=0;j<80;j++){const a=j/79*Math.PI*2,r=7+j*.82;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.stroke();x.restore()}}
    else if(el==='光'){circle(94);x.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,r=i%2?28:82;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.closePath();x.stroke();circle(16)}
    else{circle(89,.22,Math.PI*.91);circle(89,Math.PI*1.13,Math.PI*1.94);circle(63,1.5,6.5);for(let i=0;i<5;i++){x.save();x.rotate(i*1.23);poly(3,17+i*7,.5);x.restore()}}
  });
}
TEX.seals=Object.fromEntries(ELS.map(el=>[el,manuscriptSeal(el)]));
TEX.rune=TEX.seals['光'];
TEX.leaf=texC(48,48,x=>{x.fillStyle='#fff';x.beginPath();x.moveTo(8,40);x.bezierCurveTo(1,18,20,5,41,6);x.bezierCurveTo(40,30,26,43,8,40);x.fill();x.strokeStyle='#bbb';x.lineWidth=2;x.beginPath();x.moveTo(8,40);x.lineTo(35,12);x.stroke()});
TEX.ink=texC(64,64,x=>{x.fillStyle='#fff';x.beginPath();for(let i=0;i<22;i++){const a=i*Math.PI/11,r=20+Math.sin(i*7)*8;x.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r)}x.closePath();x.fill()});
TEX.foil=texC(32,32,x=>{x.fillStyle='#fff';x.beginPath();x.moveTo(4,9);x.lineTo(23,3);x.lineTo(29,23);x.lineTo(10,29);x.closePath();x.fill();x.fillStyle='#c7c7c7';x.fillRect(11,7,4,12)});

// Distinct silhouettes, local light and pigment debris replace all-element white explosions.
impact=function(pos,el,big=1){
  const c=ELC[el]||ELC['地'],air=up(pos,.3),b=Math.min(big,2);
  groundDecal(TEX.seals[el]||TEX.rune,pos,c,1.9*b,750,{normal:1,op:.78,grow:1,spin:el==='風'?.7:0});
  if(el==='地'){
    spikes(pos,b);groundDecal(TEX.crack,pos,'#493b2b',2.1*b,1600,{normal:1,op:.65});
    vfx(air,{n:15*b,tex:'sq',normal:1,c0:'#a68a60',c1:'#665440',s0:.15,s1:.08,life:.7,speed:2,up:2.6,grav:8,spin:4});
    vfx(pos,{n:5,tex:'smoke',normal:1,c0:'#c4b28e',s0:.3,s1:.85,life:.7,op:.35,speed:.7,up:.35});
  }else if(el==='水'){
    [0,120,240].forEach((delay,i)=>setTimeout(()=>ringFx(pos,c,.2+i*.15,1.25*b,530),delay));
    vfx(air,{n:15*b,tex:'shard',normal:1,c0:'#d9e4db',c1:'#4e90ad',s0:.22,s1:.06,life:.65,speed:1.8,up:2.4,grav:7,spin:2});
  }else if(el==='火'){
    flare(air,'#d9a257',1.2*b,180);
    vfx(air,{n:16*b,tex:'leaf',normal:1,c0:'#e0ae5e',c1:'#a5412c',s0:.4,s1:.06,life:.65,speed:1.4,up:2.8,drag:2,spin:3});
    vfx(air,{n:8,tex:'foil',normal:1,c0:'#b45032',c1:'#42362f',s0:.1,life:.95,speed:1.5,up:1.5,grav:2,spin:4});
  }else if(el==='風'){
    ringFx(pos,c,.2,1.3*b,550);
    emitter(()=>pos,600,26,{tex:'leaf',normal:1,c0:'#c9d0b4',c1:'#72927c',s0:.18,life:.7,spin:5,
      at:()=>{const a=rnd(0,7);return up(pos,rnd(.1,.4)).add(new THREE.Vector3(Math.cos(a)*.45,0,Math.sin(a)*.45))},
      vel:(i,n,p)=>new THREE.Vector3(-(p.z-pos.z)*4,1.6,(p.x-pos.x)*4)});
  }else if(el==='光'){
    flare(air,'#dfc786',1.5*b,240);
    vfx(air,{n:14*b,tex:'foil',normal:1,c0:'#eadbb2',c1:'#b99a53',s0:.18,s1:.03,life:.85,speed:1.05,up:1.4,grav:1.1,spin:3});
    groundGlow(pos,c,2.2*b,550,.32);
  }else{
    vfx(air,{n:12*b,tex:'ink',normal:1,c0:'#363449',c1:'#1e2631',s0:.34,s1:.65,life:.65,speed:.65,up:.5,drag:1.7,op:.66});
    vfx(air,{n:8,tex:'shard',normal:1,c0:'#9b8b9e',c1:'#4d435e',s0:.18,s1:.03,life:.5,speed:1.6,up:.8,grav:2});
  }
  shake(el==='地'?.12:.055);
};
flare=function(pos,color,size=2,ms=240){
  const s=glowSprite(colOf(color),size*.7,'flare',{top:1});s.position.copy(pos);
  return tween(ms,t=>{s.material.opacity=(1-t)*.56;s.scale.setScalar(size*(.45+t*.22))}).then(()=>drop(s));
};

lunge=async function(u,x,z){
  u.anim='atk';u.animT=performance.now();
  const d=new THREE.Vector3(x-u.x,0,z-u.z).normalize().multiplyScalar(u.boss?.44:.28);
  try{
    await tween(u.boss?220:150,t=>{u.off.copy(d).multiplyScalar(-.3*ease(t));u.poseScale=u.human?1:1-.07*t});
    await tween(100,t=>{u.off.copy(d).multiplyScalar(lerp(-.3,1,ease(t)));u.poseScale=u.human?1:lerp(.93,1.045,t)});
    await wait(65);
    await tween(220,t=>{u.off.copy(d).multiplyScalar(1-ease(t));u.poseScale=lerp(u.human?1:1.045,1,t)});
  }finally{u.off.set(0,0,0);u.poseScale=1;u.anim=null}
};
castPose=async function(u,color){
  const el=ELS.find(e=>ELC[e]===color)||u.el||'光';
  groundDecal(TEX.seals[el],u.pos,color,1.7,720,{normal:1,op:.7,grow:1,spin:.2});
  vfx(headPos(u,.4),{n:7,tex:'foil',normal:1,c0:'#e7d6b5',c1:color,s0:.12,life:.55,speed:.35,up:1});
  await tween(440,t=>u.hop=Math.sin(Math.PI*t)*(u.human?.045:.1));u.hop=0;
};
const oldMove=moveUnit;
moveUnit=async function(u,path){try{u.anim='walk';return await oldMove(u,path)}finally{u.anim=null;u.poseScale=1}};

// Show the whole tactical board while choosing a route on a portrait phone.
const manuscriptChooseZone=chooseZone;
chooseZone=function(zone){
  manuscriptChooseZone(zone);
  if(innerWidth<=600&&innerHeight>innerWidth){
    camS.goal.set(5.5,1.2,5.5);camS.goalZoom=.88;
  }
};

// Chapter-specific micro-architecture. Geography and 24 unlockable nodes remain authoritative.
const oldNodeIcon=nodeIcon;
nodeIcon=function(n,locked){
  if(!n.boss)return oldNodeIcon(n,locked);
  const key='manuscript-'+n.c+'-'+locked;if(WM.icons[key])return WM.icons[key];
  const [cv,x]=canvas(128),E=ICON_ENV[STAGES[n.c].env];
  x.fillStyle='#332b2028';x.beginPath();x.ellipse(64,108,51,14,0,0,7);x.fill();
  const block=(y,w,h,d)=>isoBlock(x,64,y,w,h,d,IMG[E.top],IMG[E.side]);
  block(96,98,45,12);
  if(n.c===0){block(80,70,33,13);const im=IMG.prop_tree;x.drawImage(im,20,16,66,70);x.drawImage(IMG.blk_rubble,67,66,32,32)}
  if(n.c===1){block(79,68,32,12);x.fillStyle='#493d32';x.fillRect(38,30,52,51);x.strokeStyle='#b49a68';x.lineWidth=2;for(let j=0;j<6;j++){x.beginPath();x.moveTo(42+j*8,33);x.lineTo(42+j*8,77);x.stroke()}x.strokeRect(37,29,55,51);for(const dx of [37,91]){x.beginPath();x.moveTo(dx,0);x.lineTo(dx,30);x.stroke()}}
  if(n.c===2){block(81,76,36,10);x.fillStyle='#658c9e';x.strokeStyle='#cfdddc';x.lineWidth=2;x.beginPath();x.ellipse(64,62,32,24,0,Math.PI,Math.PI*2);x.lineTo(96,75);x.lineTo(32,75);x.closePath();x.fill();x.stroke();for(let j=0;j<3;j++){x.beginPath();x.ellipse(64,62,10+j*10,24,0,Math.PI,Math.PI*2);x.stroke()}x.fillStyle='#223b4b';x.fillRect(59,58,11,17)}
  if(n.c===3){block(78,68,32,10);block(63,44,22,10);x.drawImage(IMG.prop_torch,38,10,54,64)}
  if(n.c===4){block(82,68,33,10);isoBlock(x,64,28,30,16,54,IMG['spire-floor0'],IMG['spire-wallface']);block(25,43,22,7);x.strokeStyle='#637f77';x.lineWidth=2;for(let j=0;j<3;j++){x.beginPath();x.moveTo(20,38+j*12);x.bezierCurveTo(6,25+j*12,28,22+j*12,37,31+j*12);x.stroke()}}
  if(n.c===5){[84,71,58].forEach((y,i)=>block(y,80-i*20,38-i*10,10));x.strokeStyle='#455464';x.lineWidth=2;for(const [px,py] of [[46,50],[63,33],[79,50]]){x.beginPath();x.moveTo(px,py);x.lineTo(px,py+27);x.moveTo(px-5,py+7);x.lineTo(px+5,py+7);x.stroke()}}
  x.fillStyle=REGIONS[n.c].col;x.beginPath();x.arc(101,98,7,0,7);x.fill();x.strokeStyle='#b49966';x.lineWidth=2;x.stroke();
  if(locked){x.globalCompositeOperation='source-atop';x.fillStyle='#d6c8ad99';x.fillRect(0,0,128,128)}
  return WM.icons[key]=cv;
};

artReady.then(()=>{
  document.documentElement.dataset.assetsLoaded=String(ART_KEYS.length-artErrors.length);
  document.documentElement.dataset.assetErrors=artErrors.join(',');
  const tag=document.createElement('div');tag.className='edition';tag.textContent='泥板上的聖獸遠征 · 美術重製版';
  document.querySelector('#sTitle .wrap').prepend(tag);
  if(artErrors.length){toast('部分美術尚未載入，請重新整理',4000);console.error('Asset loading failures',artErrors)}
});

// Explicit local visual QA route; never adds progression or changes the saved campaign.
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).has('review')){
  artReady.then(()=>{
    const saved=LS('babylon-party-v1',null);
    setup.picks=saved?.picks?.length?saved.picks:[
      {cls:'warrior',name:'小星',col:5,el:'水',lead:true},
      {cls:'mage',name:'米菈',col:4,el:'火',sex:'f'},
      {cls:'support',name:'艾莉',col:1,el:'光',sex:'f'}
    ];
    const panel=document.createElement('nav');panel.id='artReview';panel.setAttribute('aria-label','美術檢查');
    panel.style.cssText='position:fixed;z-index:999;left:6px;right:6px;top:80px;display:flex;gap:3px;flex-wrap:wrap;background:#18242cec;padding:6px;border:1px solid #ba9c66';
    const add=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='font-size:12px;padding:7px;background:#344750;border:1px solid #b49b65;color:#fff';b.onclick=action;panel.appendChild(b)};
    STAGES.forEach((st,i)=>add('場景'+(i+1),()=>{curNode=NODES.find(n=>n.c===i&&n.boss);buildBattle();setTimeout(()=>{chooseZone(ZONES[0]);clearHL();document.querySelector('#hint').textContent='美術檢查 · '+st.nm},120)}));
    ELS.forEach(el=>add(el+'術',()=>impact(new THREE.Vector3(5,topY(T(5,5)),5),el,1.5)));
    add('地圖',()=>openWorld());add('收起',()=>panel.remove());document.body.appendChild(panel);
  });
}
