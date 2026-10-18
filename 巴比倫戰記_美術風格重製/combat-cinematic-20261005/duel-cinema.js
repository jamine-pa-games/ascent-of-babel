/* Procedural cinema layer for the current duel scene. */
'use strict';
document.documentElement.dataset.duelEdition='20261005-cinema3';
window.DuelCinema={
  create(box, reduced=false){
    const canvas=document.createElement('canvas');canvas.className='dcinema-fx';canvas.setAttribute('aria-hidden','true');box.appendChild(canvas);
    const x=canvas.getContext('2d'),camera=box.querySelector('.dcamera'),arena=box.querySelector('.darena');
    const colors={火:['#ffcd83','#aa492b'],水:['#d8eff0','#609fbb'],風:['#e2ead2','#80ad99'],地:['#ddc49e','#9c7a52'],光:['#fff0c6','#c3a26a'],闇:['#d0badc','#665477']};
    let w=1,h=1,raf=0,last=0,dead=false,particles=[],strokes=[],fields=[],resumeTimers=new Set();
    const size=()=>{const r=box.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.ceil(w*d);canvas.height=Math.ceil(h*d);x.setTransform(d,0,0,d,0,0);box.querySelectorAll('.dbody').forEach(b=>{const f=b.querySelector('.dflip'),ar=+f.dataset.ar,s=Math.min(b.clientWidth/ar,b.clientHeight);f.style.width=s*ar+'px';f.style.height=s+'px';});};size();
    const resize=new ResizeObserver(size);resize.observe(box);
    const at=el=>{const a=el.getBoundingClientRect(),r=box.getBoundingClientRect();return {x:a.left+a.width*.5-r.left,y:a.top+a.height*.48-r.top,foot:a.bottom-r.top,size:Math.min(a.width,a.height)};};
    const spawn=(p,c,n=14,kind='spark')=>{if(reduced)return;const room=Math.max(0,72-particles.length);for(let i=0;i<Math.min(n,room);i++){const a=Math.random()*Math.PI*2,v=45+Math.random()*135;particles.push({x:p.x,y:kind==='dust'?p.foot:p.y,vx:Math.cos(a)*v,vy:kind==='dust'?-10-Math.random()*30:Math.sin(a)*v-35,age:0,life:kind==='dust'?.65+Math.random()*.35:.3+Math.random()*.4,size:kind==='dust'?8+Math.random()*12:1.5+Math.random()*2.3,c,kind});}start();};
    const glow=(px,py,r,c,a)=>{x.globalAlpha=a;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,c);g.addColorStop(.23,c+'a0');g.addColorStop(1,c+'00');x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();};
    function draw(now){
      if(dead)return;const dt=Math.min(.04,last?(now-last)/1000:.016);last=now;x.clearRect(0,0,w,h);
      for(let i=fields.length-1;i>=0;i--){const q=fields[i];q.age+=dt;const t=q.age/q.life;if(t>=1){fields.splice(i,1);continue;}const fade=Math.sin(Math.PI*t);
        x.save();x.globalCompositeOperation=q.el==='闇'?'source-over':'lighter';glow(q.x,q.y,q.r*(.55+t*.8),q.c,fade*.21);
        x.globalAlpha=fade*.65;x.strokeStyle=q.c;x.lineWidth=1.4;x.beginPath();x.ellipse(q.x,q.foot,Math.max(1,q.r*(.2+t)),Math.max(1,q.r*(.055+t*.2)),0,0,Math.PI*2);x.stroke();
        if(q.el==='火'){for(let j=0;j<5;j++){x.fillStyle=j%2?q.c:'#e2a75c';x.globalAlpha=fade*(.13+j*.018);x.beginPath();x.moveTo(q.x-36+j*15,q.foot);x.quadraticCurveTo(q.x-50+j*20,q.y-25-Math.sin(t*8+j)*35,q.x-18+j*14,q.foot);x.fill();}}
        if(q.el==='水'||q.el==='地'){for(let j=0;j<6;j++){const px=q.x+(j-2.5)*19,hh=(35+(j%3)*25)*Math.sin(Math.PI*Math.min(1,t*1.6));x.globalAlpha=fade*.65;const g=x.createLinearGradient(px,q.foot-hh,px,q.foot);g.addColorStop(0,q.c);g.addColorStop(1,q.el==='水'?'#477d92':'#6d543a');x.fillStyle=g;x.beginPath();x.moveTo(px-8,q.foot);x.lineTo(px-3,q.foot-hh);x.lineTo(px+8,q.foot-hh*.4);x.lineTo(px+10,q.foot);x.closePath();x.fill();}}
        if(q.el==='光'){x.globalAlpha=fade*.18;x.fillStyle=q.c;x.fillRect(q.x-10,q.y-q.r*1.6,20,q.r*2);}
        if(q.el==='闇'){x.globalAlpha=fade*.6;x.strokeStyle='#b4a1c4';x.lineWidth=2;x.beginPath();x.arc(q.x,q.y,q.r*(.25+.4*Math.sin(Math.PI*t)),t*3,t*3+Math.PI*1.75);x.stroke();}
        x.restore();
      }
      for(let i=strokes.length-1;i>=0;i--){const q=strokes[i];q.age+=dt;const t=q.age/.4;if(t>=1){strokes.splice(i,1);continue;}x.save();x.translate(q.x,q.y);x.rotate(q.angle);x.scale(q.dir,1);x.globalCompositeOperation='lighter';
        const end=Math.min(1,t*4),fade=Math.pow(1-t,1.3);for(let j=0;j<30*end;j++){const s=j/30,a=-2.6+s*3.6;x.strokeStyle=j>10?'#fff0d4':q.c;x.globalAlpha=Math.sin(s*Math.PI)*fade*.8;x.lineWidth=(2+Math.sin(s*Math.PI)*7)*q.big;x.beginPath();x.ellipse(0,0,q.r,q.r*.66,0,a,a+.13);x.stroke();}x.restore();
      }
      for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.life){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.kind==='dust'?-5:145)*dt;const t=p.age/p.life;
        x.save();if(p.kind==='dust')glow(p.x,p.y,p.size*(1+t),p.c,Math.sin(Math.PI*t)*.16);else{x.globalCompositeOperation='lighter';x.globalAlpha=(1-t)*.8;x.strokeStyle=p.c;x.lineWidth=p.size*(1-t*.5);x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x-p.vx*.035,p.y-p.vy*.035);x.stroke();}x.restore();
      }
      if(particles.length||strokes.length||fields.length)raf=requestAnimationFrame(draw);else{raf=0;last=0;x.clearRect(0,0,w,h);}
    }
    function start(){if(!raf&&!dead)raf=requestAnimationFrame(draw);}
    const cam=(frames,ms)=>{if(reduced||!camera)return;const before=getComputedStyle(camera).transform;camera.getAnimations().forEach(a=>a.cancel());camera.animate([{transform:before==='none'?'scale(1)':before},...frames],{duration:ms,easing:'cubic-bezier(.16,.8,.24,1)',fill:'forwards'});};
    return {
      intro(){cam([{transform:'scale(1.015)'}],850);},
      focus(a,d){const p=at(a),q=at(d),tx=Math.max(-18,Math.min(18,(w*.5-(p.x+q.x)*.5)*.18));cam([{transform:`translateX(${tx}px) scale(1.04)`}],300);},
      reset(){cam([{transform:'scale(1.015)'}],320);},
      slash(el,dir,big=1,angle=0,col='#ecd4a5'){if(reduced)return;const p=at(el);if(strokes.length<8)strokes.push({...p,r:Math.max(35,Math.min(105,p.size*.6))*big,dir,big,angle:angle*Math.PI/180,c:col,age:0});spawn(p,col,8);start();},
      dust(el){spawn(at(el),'#cab390',8,'dust');},
      sparks(el,n=10,col='#ead3a7'){spawn(at(el),col,n);},
      cast(el,element){if(reduced)return;const p=at(el),c=(colors[element]||colors.光)[0];if(fields.length<8)fields.push({...p,el:'風',r:p.size*.52,c,age:0,life:.65});spawn({...p,y:p.foot},c,10);start();},
      element(el,element,big=false){if(reduced)return;const p=at(el),c=(colors[element]||colors.光)[0];if(fields.length<8)fields.push({...p,el:element,r:Math.min(140,p.size*.62)*(big?1.2:1),c,age:0,life:element==='闇'?.8:.65});spawn(p,c,big?22:14);start();},
      async impact(el,dir,critical,big=false){if(reduced)return;const p=at(el);spawn(p,critical?'#f1c76e':'#ead5b0',critical?22:12);
        // Pause only finite actor motion; camera and particles continue.
        const paused=arena.getAnimations({subtree:true}).filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().iterations));paused.forEach(a=>a.pause());
        cam([{transform:`translate(${dir*(critical?5:2)}px,${critical?2:0}px) scale(${big?1.055:1.035})`,offset:.24},{transform:'scale(1.025)'}],critical?290:190);
        await new Promise(resolve=>{const id=setTimeout(()=>{resumeTimers.delete(id);paused.forEach(a=>{try{a.play()}catch(_){}});resolve();},critical?80:45);resumeTimers.add(id);});
      },
      destroy(){dead=true;cancelAnimationFrame(raf);resize.disconnect();resumeTimers.forEach(clearTimeout);canvas.remove();particles=[];strokes=[];fields=[];}
    };
  }
};
