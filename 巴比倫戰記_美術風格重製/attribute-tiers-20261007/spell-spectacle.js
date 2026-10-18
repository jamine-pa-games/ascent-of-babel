/* Authored spell signatures; one bounded canvas, no new gameplay state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpellSpectacle=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const palette={火:['#ffb454','#d8492d'],水:['#d9f8ff','#67b8ed'],風:['#c6ffe2','#58c8b3'],地:['#efd09b','#bb844b'],光:['#fff2bb','#e7bd59'],闇:['#dbc2ff','#966bd6']};
 function describe(actor={},skill={}){
  const el=skill.fxEl||skill.el||actor.el||'光',boss=!!actor.boss,special=!!(skill.fx||skill.mp||boss&&skill.nm);
  let kind={火:'magma',水:'rift',風:'wind',地:'earth',光:'beam',闇:'void'}[el]||'beam';
  const byFx={ultima:el==='闇'?'void':'ultima',magma:el==='地'?'earth':'magma',rift:'rift',nova:el==='闇'?'void':'storm',rain:'rain',ninpo:'phantom'};
  if(byFx[skill.fx])kind=byFx[skill.fx];
  if(/鎖鏈/.test(skill.nm||''))kind='chain';
  const ground=skill.area==='ring'||/地裂|震地|山崩/.test(skill.nm||'');
  if(ground)kind='earth';
  if(skill.kind==='phys'&&!skill.fx&&!/鎖鏈/.test(skill.nm||'')&&!ground)kind=boss&&!actor.human&&!actor.cls&&!['odin','hanzo'].includes(actor.kind)?'claw':'rend';
  const large=['big','huge','plus','line','ring'].includes(skill.area);
  return {kind,el,boss,special,large,c:(palette[el]||palette.光)[0],edge:(palette[el]||palette.光)[1],strength:boss?1.3:large?1.12:1,life:kind==='ultima'||kind==='void'?1.28:boss?1.2:1.02};
 }
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function aura(x,px,py,r,c,alpha){if(r<=0||alpha<=0)return;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,c+'bb');g.addColorStop(.3,c+'65');g.addColorStop(1,c+'00');x.globalAlpha=alpha;x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();}
 function ring(x,px,py,r,c,t,flat=1){x.save();x.translate(px,py);x.scale(1,flat);x.rotate(t);x.strokeStyle=c;x.lineWidth=1.1;x.beginPath();x.arc(0,0,r,0,Math.PI*2);x.stroke();x.beginPath();x.arc(0,0,r*.76,.2,5.9);x.stroke();
  for(let i=0;i<12;i++){const a=i*Math.PI/6;x.save();x.rotate(a);x.beginPath();x.moveTo(r*.83,-3);x.lineTo(r*.93,0);x.lineTo(r*.84,3);x.moveTo(r*.85,0);x.lineTo(r*.92,0);x.stroke();x.restore();}x.restore();}
 function star(x,px,py,r,c,rot,points=6){x.strokeStyle=c;x.beginPath();for(let i=0;i<points*2+1;i++){const a=rot+i*Math.PI/points,rr=i%2?r*.48:r,xx=px+Math.cos(a)*rr,yy=py+Math.sin(a)*rr;i?x.lineTo(xx,yy):x.moveTo(xx,yy)}x.stroke();}
 function crack(x,q,t){x.strokeStyle=q.edge;x.lineWidth=2;const r=q.r*Math.min(1,t*3);for(let i=0;i<7;i++){const a=i*Math.PI*2/7+.2;x.beginPath();x.moveTo(q.x,q.foot);for(let j=1;j<5;j++){const d=r*j/4;x.lineTo(q.x+Math.cos(a)*d+Math.sin(j*3+i)*7,q.foot+Math.sin(a)*d*.2)}x.stroke();}}
 function slash(x,px,py,r,angle,c,t){x.save();x.translate(px,py);x.rotate(angle);x.scale(1,.52);x.strokeStyle=c;x.lineWidth=5;x.beginPath();x.arc(0,0,r,-2.7,-2.7+Math.min(1,t*3)*3.8);x.stroke();x.lineWidth=1.2;x.strokeStyle='#fff3d2';x.beginPath();x.arc(0,0,r+5,-2.4,-2.4+Math.min(1,t*3)*3.2);x.stroke();x.restore();}
 function draw(x,q,t){
  t=clamp(t,0,1);const fade=Math.sin(Math.PI*t),r=q.r,px=q.x,py=q.y;
  x.save();x.globalCompositeOperation=q.kind==='void'?'source-over':'lighter';x.globalAlpha=fade*.8;
  // World-ground reaction remains distinct from the floating spell core.
  ring(x,px,q.foot,r*(.45+.75*t),q.edge,t*.6,.22);
  x.globalAlpha=fade*.24;star(x,px,q.foot,r*.88,q.c,t*.4,6);
  if(q.kind==='cast'){
   x.globalAlpha=fade*.8;ring(x,px,q.foot,r,q.c,t*.8,.28);ring(x,px,q.foot,r*.62,q.edge,-t*1.2,.28);
   for(let i=0;i<8;i++){const a=i*Math.PI/4+t*4,yy=q.foot-t*r*.9;aura(x,px+Math.cos(a)*r*.5,yy+Math.sin(a)*r*.18,7,q.c,fade*.65)}
  }else if(q.kind==='ultima'){
   const expand=t<.3?t/.3:Math.min(1,(t-.3)/.4),rr=r*(t<.3?.12+.35*expand:.48+expand*.66);
   aura(x,px,py,rr*1.4,q.edge,fade*.55);aura(x,px,py,rr,q.c,fade*.7);
   x.globalAlpha=fade*.9;ring(x,px,py,rr,q.c,t);star(x,px,py,rr*.82,q.c,-t*.7,8);
   x.globalAlpha=fade*.6;for(let i=0;i<16;i++){const a=i*Math.PI/8;x.beginPath();x.moveTo(px+Math.cos(a)*rr*.7,py+Math.sin(a)*rr*.7);x.lineTo(px+Math.cos(a)*rr*(1.2+.2*(i%3)),py+Math.sin(a)*rr*(1.2+.2*(i%3)));x.stroke()}
   x.globalAlpha=fade*.9;x.fillStyle='#fff6d6';x.beginPath();x.arc(px,py,Math.max(1,rr*.11),0,Math.PI*2);x.fill();
  }else if(q.kind==='magma'){
   aura(x,px,q.foot-r*.35,r,q.edge,fade*.45);x.globalAlpha=fade*.85;crack(x,q,t);
   for(let i=0;i<9;i++){const xx=px+(i-4)*r*.16,hh=r*(.8+.55*Math.sin(i*2+1))*Math.sin(Math.PI*Math.min(1,t*1.35));
    const g=x.createLinearGradient(xx,q.foot-hh,xx,q.foot);g.addColorStop(0,'#fdd69c00');g.addColorStop(.45,q.c+'b0');g.addColorStop(1,q.edge);x.fillStyle=g;x.beginPath();x.moveTo(xx-r*.1,q.foot);x.bezierCurveTo(xx-r*.22,q.foot-hh*.55,xx+r*.16,q.foot-hh*.8,xx,q.foot-hh);x.bezierCurveTo(xx+r*.33,q.foot-hh*.35,xx+r*.14,q.foot-hh*.35,xx+r*.09,q.foot);x.fill();
    x.strokeStyle=i%2?q.c:'#ffe5bb';x.lineWidth=1;x.beginPath();x.moveTo(xx,q.foot-5);x.quadraticCurveTo(xx+r*.12,q.foot-hh*.5,xx,q.foot-hh*.9);x.stroke();}
  }else if(q.kind==='rift'){
   aura(x,px,py,r,q.c,fade*.32);for(let i=0;i<7;i++){const xx=px+(i-3)*r*.23,hh=r*(.65+(i%3)*.25)*Math.min(1,t*3.5),yy=q.foot;
    x.globalAlpha=fade*.85;const g=x.createLinearGradient(xx,yy-hh,xx,yy);g.addColorStop(0,'#eafaff');g.addColorStop(.5,q.c);g.addColorStop(1,q.edge+'55');x.fillStyle=g;x.beginPath();x.moveTo(xx-r*.1,yy);x.lineTo(xx-r*.13,yy-hh*.57);x.lineTo(xx,yy-hh);x.lineTo(xx+r*.14,yy-hh*.46);x.lineTo(xx+r*.08,yy);x.closePath();x.fill();x.strokeStyle='#fffaff';x.lineWidth=1;x.beginPath();x.moveTo(xx,yy-hh);x.lineTo(xx+2,yy);x.moveTo(xx-r*.13,yy-hh*.57);x.lineTo(xx+r*.14,yy-hh*.46);x.stroke();}
   x.globalAlpha=fade*.6;ring(x,px,py,r*.65,q.c,t*.5);ring(x,px,py,r*.9,q.edge,-t*.8);
  }else if(q.kind==='wind'||q.kind==='storm'){
   aura(x,px,py,r,q.c,fade*.28);x.globalAlpha=fade*.8;x.lineWidth=2;
   for(let k=0;k<3;k++){x.strokeStyle=k===1?'#edfcea':q.c;x.beginPath();for(let i=0;i<=36;i++){const f=i/36,a=f*Math.PI*4+t*8+k*2,xx=px+Math.cos(a)*r*(.2+f*.55),yy=q.foot-f*r*1.9+Math.sin(a)*r*.1;i?x.lineTo(xx,yy):x.moveTo(xx,yy)}x.stroke();}
   if(q.kind==='storm'){x.strokeStyle='#f4e9bf';x.lineWidth=1.5;for(let i=0;i<6;i++){const a=i*Math.PI/3+t*.4;x.beginPath();for(let j=0;j<6;j++){const d=r*j/5,aa=a+(j%2?.11:-.1),xx=px+Math.cos(aa)*d,yy=py+Math.sin(aa)*d;j?x.lineTo(xx,yy):x.moveTo(xx,yy)}x.stroke();}}
  }else if(q.kind==='earth'){
   x.globalAlpha=fade*.85;crack(x,q,t);for(let i=0;i<7;i++){const xx=px+(i-3)*r*.24,hh=r*(.3+(i%3)*.17)*Math.sin(Math.PI*t);x.fillStyle=i%2?q.c:q.edge;x.beginPath();x.moveTo(xx-r*.13,q.foot);x.lineTo(xx-r*.09,q.foot-hh*.8);x.lineTo(xx+r*.01,q.foot-hh);x.lineTo(xx+r*.15,q.foot-hh*.4);x.lineTo(xx+r*.16,q.foot);x.closePath();x.fill();x.strokeStyle='#f6ddb3';x.lineWidth=1;x.stroke();}
  }else if(q.kind==='void'){
   const rr=r*(.72+.2*Math.sin(t*8));aura(x,px,py,rr*1.5,q.edge,fade*.55);x.globalAlpha=fade*.95;
   const g=x.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,'#090915');g.addColorStop(.65,'#19102ae8');g.addColorStop(1,q.edge+'00');x.fillStyle=g;x.beginPath();x.arc(px,py,rr,0,Math.PI*2);x.fill();
   x.globalAlpha=fade*.85;ring(x,px,py,rr,q.c,-t*1.8);star(x,px,py,rr*.8,q.edge,t*.8,8);
   x.strokeStyle=q.c;x.lineWidth=1;for(let i=0;i<9;i++){const a=i*Math.PI*2/9+t;x.beginPath();x.moveTo(px+Math.cos(a)*rr*1.2,py+Math.sin(a)*rr*1.2);x.quadraticCurveTo(px+Math.cos(a+1)*rr*.6,py+Math.sin(a+1)*rr*.6,px,py);x.stroke();}
  }else if(q.kind==='rain'){
   aura(x,px,py,r,q.c,fade*.24);for(let i=0;i<7;i++){const tt=clamp((t-i*.025)*1.4,0,1),xx=px+(i-3)*r*.23,yy=q.foot-r*2.5*(1-tt),len=r*.48;
    x.save();x.translate(xx,yy);x.rotate((i-3)*-.055);x.globalAlpha=fade*.95;x.fillStyle=i%2?'#f5e8bc':'#ccad72';x.beginPath();x.moveTo(-3,-len);x.lineTo(3,-len);x.lineTo(3,-10);x.lineTo(0,0);x.lineTo(-3,-10);x.closePath();x.fill();x.strokeStyle='#fcf6d9';x.lineWidth=1;x.beginPath();x.moveTo(0,-len);x.lineTo(0,-7);x.moveTo(-9,-len);x.lineTo(9,-len);x.moveTo(0,-len-12);x.lineTo(0,-len);x.stroke();x.restore();}
  }else if(q.kind==='chain'){
   x.globalAlpha=fade*.9;const sx=q.from?.x??px-r*1.6,sy=q.from?.y??py;for(let i=0;i<14;i++){const f=i/13,xx=sx+(px-sx)*f,yy=sy+(py-sy)*f+Math.sin(f*Math.PI)*r*.25*(1-t);x.strokeStyle=i%2?'#fae0a0':q.edge;x.lineWidth=2;x.beginPath();x.ellipse(xx,yy,7,3,i%2?.3:1.3,0,Math.PI*2);x.stroke();}aura(x,px,py,r*.6,q.c,fade*.4);
  }else if(['claw','rend','phantom'].includes(q.kind)){
   aura(x,px,py,r,q.edge,fade*.25);x.globalAlpha=fade*.9;const n=q.kind==='rend'?2:3;for(let i=0;i<n;i++)slash(x,px+(i-1)*r*.17,py+(i-1)*r*.14,r*(1-i*.1),-.65+i*.5,q.kind==='claw'?'#ffc29c':q.c,t);if(q.boss)crack(x,q,t);
  }else{
   aura(x,px,py,r,q.c,fade*.45);x.globalAlpha=fade*.6;for(let i=-1;i<=1;i++){const xx=px+i*r*.27,g=x.createLinearGradient(xx,q.foot-r*2,xx,q.foot);g.addColorStop(0,q.c+'00');g.addColorStop(.65,q.c+'aa');g.addColorStop(1,'#fff9d8');x.fillStyle=g;x.fillRect(xx-r*.055,q.foot-r*2,r*.11,r*2)}x.globalAlpha=fade*.8;star(x,px,py,r*.7,q.c,t,6);
  }
  x.restore();
 }
 return {describe,draw,palette};
});
