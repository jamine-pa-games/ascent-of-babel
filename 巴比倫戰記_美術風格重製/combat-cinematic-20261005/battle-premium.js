/* Cinematic combat pass: animation only. No damage, turn, AI or save changes. */
'use strict';
document.documentElement.dataset.battleEdition = '20261005-bronze';
(() => {
  const PAL = {火:'#db8a43',水:'#8dc5d4',風:'#a9c7aa',地:'#c2a176',光:'#ecd39a',闇:'#a594b8'};
  const out = t => 1 - Math.pow(1-t,3);
  let ribbons = 0;
  // Tapered metal-edged crescent: a readable sweep, not a rectangular flash.
  TEX.bronzeArc = texC(256,256,x => {
    x.translate(128,128);
    for(let i=0;i<80;i++) {
      const t=i/79, a=-2.7+t*3.55;
      x.strokeStyle=`rgba(255,255,255,${Math.sin(t*Math.PI)*.88})`;
      x.lineWidth=1+Math.sin(t*Math.PI)*18;
      x.beginPath();x.arc(0,0,92,a,a+.06);x.stroke();
    }
    x.strokeStyle='#fff';x.lineWidth=1.4;x.beginPath();x.arc(0,0,103,-2.35,.45);x.stroke();
  });
  async function arc(pos,color,size,rotation=0,ms=330) {
    if (RM || ribbons>=12) return;
    ribbons++;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.bronzeArc,color,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending}));
    s.position.copy(pos);s.renderOrder=7;scene.add(s);
    try { await tween(ms,t=>{s.scale.set(size*(.7+.5*out(t)),size*(.54+.25*out(t)),1);s.material.rotation=rotation+.85*out(t);s.material.opacity=Math.pow(1-t,1.4)*.86;}); }
    finally {drop(s);ribbons--;}
  }
  slashFx=async function(u,target,color='#ffffff',size=1,rotation=null) {
    const p=up(target,.58), c=color==='#ffffff'?'#ead9ae':color;
    if(RM){groundGlow(target,c,.9,120,.18);return;}
    const angle=rotation ?? (u.x<=target.x?-.55:.65);
    vfx(p,{n:9,tex:'spark',streak:1,c0:'#fff0ce',c1:'#a97b3e',s0:.10,s1:.015,life:.30,speed:2.2,up:.75,grav:3,op:.8});
    flare(p,'#fff0cd',.42,110);
    await Promise.all([arc(p,c,size*1.15,angle,270),arc(p,'#967245',size*.91,angle-.22,370)]);
  };
  lunge=async function(u,x,z) {
    u.anim='atk';u.animT=performance.now();
    const d=new THREE.Vector3(x-u.x,0,z-u.z).normalize().multiplyScalar(u.boss?.48:.32);
    try {
      await tween(u.boss?190:125,t=>{u.off.copy(d).multiplyScalar(-.24*t*t);u.poseScale=u.human?1:1-.055*t;});
      await tween(85,t=>{u.off.copy(d).multiplyScalar(lerp(-.24,1,out(t)));u.poseScale=u.human?1:lerp(.945,1.05,t);});
      if(!RM)afterimage(u);
      await wait(RM?0:35);
      await tween(155,t=>{u.off.copy(d).multiplyScalar(1-out(t));u.poseScale=u.human?1:lerp(1.05,1,out(t));});
    } finally {u.off.set(0,0,0);u.poseScale=1;u.anim=null;}
  };
  const baseImpact=impact;
  impact=function(pos,el,big=1) {
    const b=Math.min(1.6,Math.max(.5,big)), c=PAL[el]||PAL.光;
    baseImpact(pos,el,b);
    if(RM)return;
    // Ground reaction and airborne trace stay separate, leaving units readable.
    groundGlow(pos,c,1.75*b,390,.20);
    if(el==='水') {arc(up(pos,.16),c,1.8*b,.3,520);arc(up(pos,.38),'#d4e6df',1.2*b,-1.2,440);}
    else if(el==='風') {arc(up(pos,.35),c,1.65*b,-.8,420);arc(up(pos,.8),'#e1e5c6',1.1*b,.7,350);}
    else if(el==='火') {ringFx(pos,'#c88443',.25,1.15*b,360);vfx(up(pos,.35),{n:8,tex:'spark',streak:1,c0:'#f4cb89',c1:'#8c3b21',s0:.1,life:.8,speed:1.1,up:1.9,grav:1.5});}
    else if(el==='地') {ringFx(pos,'#c3a477',.15,1.3*b,440);vfx(pos,{n:7,tex:'smoke',normal:1,c0:'#b7a58b',c1:'#786652',s0:.2,s1:.6,life:.85,speed:.7,up:.12,op:.25});}
    else if(el==='光') {arc(up(pos,.45),c,1.6*b,-.3,410);groundDecal(TEX.seals.光,pos,'#eedcaf',2.3*b,900,{normal:1,op:.28,spin:-.08});}
    else {arc(up(pos,.35),'#9f93aa',1.5*b,2.2,510);groundDecal(TEX.seals.闇,pos,'#585369',2.2*b,1050,{normal:1,op:.4,spin:.1});}
  };
  castPose=async function(u,color) {
    const el=ELS.find(e=>ELC[e]===color)||u.el||'光', c=PAL[el]||color;
    groundDecal(TEX.seals[el]||TEX.rune,u.pos,c,1.9,760,{normal:1,op:.65,grow:1,spin:.18});
    if(!RM) {
      groundDecal(TEX.seals[el]||TEX.rune,u.pos,'#d2b47b',1.25,650,{normal:1,op:.28,grow:1,spin:-.32});
      vfx(u.pos,{n:12,tex:'foil',normal:1,c0:'#e7d6b5',c1:c,s0:.09,s1:.02,life:.7,op:.8,
        at:(i,n)=>up(u.pos,.08).add(new THREE.Vector3(Math.cos(i/n*Math.PI*2)*.65,0,Math.sin(i/n*Math.PI*2)*.65)),
        vel:(i,n,p)=>new THREE.Vector3(-(p.z-u.pos.z)*1.8,1.4,(p.x-u.pos.x)*1.8)});
    }
    try{await tween(430,t=>{u.hop=RM?0:Math.sin(Math.PI*t)*.065;});}
    finally{u.hop=0;}
  };
  hitStop=async function(ms=70) {
    if(!RM&&!camS.dragging)camS.zoom=Math.min(camS.goalZoom+.045,camS.zoom+.028);
    await wait(RM?0:Math.min(ms,95));
  };
  const baseScreenFlash=screenFlash;
  screenFlash=function(color='#fff',ms=320,opacity=.55){baseScreenFlash(color,Math.min(ms,300),Math.min(opacity,.22));};
  document.head.insertAdjacentHTML('beforeend',`<style>
  #banner{background:linear-gradient(100deg,#112831f2,#273732e8 65%,#182622b0);border-top:1px solid #d4b071;border-bottom:1px solid #9d7947;box-shadow:0 7px 25px #0005;color:#f1dfb8;text-shadow:0 1px 3px #000;letter-spacing:.12em;border-radius:0 12px 12px 0}
  #banner small{color:#beae8a;letter-spacing:.08em}#vign{background:radial-gradient(ellipse at 50% 45%,transparent 35%,#101c294d 100%)}
  @media(prefers-reduced-motion:reduce){#banner{animation:none!important}}
  </style>`);
})();
