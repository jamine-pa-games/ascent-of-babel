/* Original narrative score. No FF melodies or recordings are used. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AdventureScore=api;api.install();}})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const phrase=s=>s.trim().split(/\s+/).map(t=>{const [n,d,v]=t.split(':');return[n==='r'?null:n,+d||1,v?+v:1]});
 const home='D5:2 F5:1 A5:1 G5:2 E5:2 D5:3 C5:1 A4:4 F5:2 E5:1 D5:1 G5:2 A5:2 E5:2 C#5:2 D5:4';
 const road='D5:1 A4:.5 D5:.5 F5:1 E5:1 G5:2 F5:1 D5:1 A5:1 G5:1 E5:2 F5:1 E5:1 D5:2 F5:1 A5:.5 G5:.5 F5:1 D5:1 C6:2 A5:2 G5:1 E5:1 F5:1 E5:1 C#5:2 D5:2';
 const struggle='D5:.5 A4:.5 D5:1 F5:.5 E5:.5 D5:1 G5:1 F5:.5 E5:.5 D5:1 A4:1 Bb4:.5 D5:.5 F5:1 E5:1 C#5:1 A4:1 E5:1 D5:1 C#5:1 D5:.5 F5:.5 A5:1 G5:1 E5:1 F5:1 D5:1 C5:1 A4:1 Bb4:1 D5:1 E5:1 F5:1 E5:1 C#5:1 D5:2';
 const minor=['D3 F3 A3','Bb2 D3 F3','F3 A3 C4','A2 C#3 E3','D3 F3 A3','G2 Bb2 D3','A2 C#3 E3','D3 F3 A3'];
 const light=['F3 A3 C4','C3 E3 G3','D3 F3 A3','Bb2 D3 F3','F3 A3 C4','G3 Bb3 D4','C3 E3 G3','F3 A3 C4'];
 const make=(bpm,mel,chords,lead='flute',energy=0)=>{
  const parts=[{inst:lead,notes:phrase(mel)},{inst:'strings',chords,each:4,vol:energy>.5?.62:.36}];
  parts.push({inst:'harp',notes:chords.flatMap(c=>{const n=c.split(' ');return [0,1,2,1].map(i=>[n[i],1,.45])})});
  if(energy){parts.push({inst:'bass',notes:chords.flatMap(c=>{const n=c.split(' ')[0];return [[n,1,.7],[null,1,0],[n,1,.45],[null,1,0]]})});parts.push({inst:'timp',notes:chords.map(c=>[c.split(' ')[0],4,energy*.65])});}
  if(energy>.5)parts.push({inst:'snare',notes:chords.flatMap(()=>[[null,1,0],['C4',.5,.45],[null,.5,0],[null,1,0],['C4',.5,.6],[null,.5,0]])});
  return {bpm,beats:32,parts};
 };
 const tracks={
  adv_home:make(68,home,minor,'harp'),
  adv_road:make(108,road,light,'flute',.3),
  adv_bond:make(76,home.replace(/5/g,'4'),light,'flute'),
  adv_doubt:make(64,'r:4 A4:3 G4:1 F4:4 r:4 E4:3 D4:1 C#4:4 r:4 D4:4',minor,'bell',.2),
  adv_battle:make(138,struggle,minor,'brass',.8),
  adv_crisis:make(154,struggle,minor.map((c,i)=>i%2?'Eb3 G3 Bb3':c),'brass',1),
  adv_release:make(72,home,light,'flute'),
  adv_grief:make(54,'D4:3 r:1 F4:3 E4:1 D4:4 r:4 A3:3 C4:1 E4:4 C#4:3 r:1 D4:4',minor,'harp'),
  adv_ending:make(84,road,light,'flute',.25),
  adv_victory:{bpm:114,beats:8,once:true,parts:[{inst:'brass',notes:phrase('D5:.5 F5:.5 A5:1 G5:1 E5:1 F5:1 D5:3')},{inst:'strings',chords:['D3 F3 A3','F3 A3 C4'],each:4,vol:.5},{inst:'timp',notes:phrase('D2:4:.5 F2:4:.5')}]},
 };
 const region={grass:['flute',126],cave:['brass',132],ice:['bell',124],fire:['brass',146],wind:['flute',148],summit:['brass',138],salt:['flute',128],palace:['brass',142],gear:['bell',140]};
 const shifts={grass:0,cave:2,ice:-5,fire:0,wind:5,summit:-4,salt:2,palace:1,gear:0};
 function transposeNote(n,shift){if(!n)return n;const m=/^([A-G])(#|b)?(\d)$/.exec(n);if(!m)return n;const semis={C:0,D:2,E:4,F:5,G:7,A:9,B:11},names=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];const value=(+m[3]+1)*12+semis[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+shift;return names[((value%12)+12)%12]+(Math.floor(value/12)-1);}
 for(const [env,[lead,bpm]]of Object.entries(region)){const shift=shifts[env],t=make(bpm,struggle,minor,lead,.85);for(const p of t.parts){if(p.notes&&!['timp','snare'].includes(p.inst))p.notes=p.notes.map(([n,d,v])=>[transposeNote(n,shift),d,v]);if(p.chords)p.chords=p.chords.map(c=>c.split(' ').map(n=>transposeNote(n,shift)).join(' '));}tracks['adv_boss_'+env]=t;}
 function select(request,context={}){
  if(request===null)return null;
  if(request?.startsWith('adv_'))return request;
  if(request==='title')return'adv_home';if(request==='map')return context.lost?'adv_grief':'adv_road';
  if(request==='victory')return'adv_victory';if(request==='boss2')return'adv_crisis';
  if(request==='boss')return context.escape?'adv_crisis':'adv_boss_'+(region[context.env]?context.env:'grass');
  if(request==='ura')return'adv_doubt';if(request==='battle'||request?.startsWith('b_'))return'adv_battle';return request;
 }
 function install(){
  document.documentElement.dataset.scoreEdition='20261006-soul1';Object.assign(TRACKS,tracks);
  if(BGM){const obsolete=BGM;clearInterval(obsolete.timer);if(AC){obsolete.gain?.gain.setTargetAtTime(0,AC.currentTime,.1);obsolete.sendG?.gain.setTargetAtTime(0,AC.currentTime,.1);}setTimeout(()=>{obsolete.gain?.disconnect();obsolete.sendG?.disconnect()},1600);BGM=null;}
  let state=null,muted=false,duck=1;const observers=new Set();
  const notify=()=>{document.documentElement.dataset.scoreCue=state?.name||'silence';for(const f of observers)f(state?.name||'silence')};
  function stop(){if(!state)return;const old=state;state=null;clearInterval(old.timer);const t=AC?.currentTime||0;old.gain.gain.setTargetAtTime(0,t,.12);old.sendG.gain.setTargetAtTime(0,t,.12);setTimeout(()=>{old.gain.disconnect();old.sendG.disconnect()},2000);BGM=null;notify();}
  function play(name,after){
   if(state?.name===name){if(after)state.after=after;return;}stop();if(!name)return;
   try{const ac=audioCtx(),bus=musicBus(),track=TRACKS[name];if(!track)return;const data=COMPILED[name]||(COMPILED[name]=compile(track));
    const gain=ac.createGain(),sendG=ac.createGain();gain.gain.value=0;sendG.gain.value=0;gain.connect(bus.out);sendG.connect(bus.send);gain.gain.setTargetAtTime(duck,ac.currentTime,.25);sendG.gain.setTargetAtTime(duck,ac.currentTime,.25);
    const ch=channels(ac,gain,sendG),events=data.ev.slice().sort((a,b)=>a.b-b.b);const s={name,gain,sendG,start:ac.currentTime+.1,index:0,timer:0,after,cycles:0};state=s;BGM=s;
    const tick=()=>{if(state!==s||muted||document.hidden||ac.state!=='running')return;
     // Schedule only the next 240ms, not an entire song; transitions remain responsive.
     if(ac.currentTime>s.start+data.len+.25){s.start=ac.currentTime+.06;s.index=0;}
     const until=ac.currentTime+.24;while(s.index<events.length){const e=events[s.index],at=s.start+e.b*data.spb;if(at>until)break;s.index++;if(at>=ac.currentTime-.06&&INST[e.inst])INST[e.inst](ac,ch[e.inst]||gain,e.f,Math.max(at,ac.currentTime),e.d*data.spb,e.v);}
     if(s.index===events.length&&ac.currentTime>=s.start+data.len){if(data.once){const next=s.after;stop();if(next)play(next);return;}s.start+=data.len;s.index=0;s.cycles++;}
    };s.timer=setInterval(tick,80);tick();notify();
   }catch(e){console.warn('Score unavailable',e.message)}
  }
  const context=()=>({env:typeof STAGE==='undefined'?'grass':STAGE.env,escape:!!STAGE?.escape,lost:G.phase==='over'&&!units.some(u=>u.alive&&u.team==='hero')});
  bgm=function(name){return play(select(name,context()))};bgmOnce=function(name,after){return play(select(name,context()),select(after,context()))};
  const set=setMusic;setMusic=function(on){muted=!on;set(on);if(state&&on){state.start=audioCtx().currentTime+.08;state.index=0;}notify()};
  const sound=sfx;sfx=function(type){if(!soundOn)return;if(!['move','hit','crit','boom','ko'].includes(type))return sound(type);
   try{const ac=audioCtx(),t=ac.currentTime,b=musicBus(),g=ac.createGain(),lp=ac.createBiquadFilter(),noise=ac.createBufferSource();noise.buffer=b.noise;lp.type='lowpass';lp.frequency.value=type==='move'?850:type==='boom'?450:1600;noise.connect(lp);lp.connect(g);g.connect(ac.destination);const dur=type==='move'?.08:type==='boom'?.5:.19;g.gain.setValueAtTime(type==='move'?.025:type==='boom'?.11:.07,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);noise.start(t);noise.stop(t+dur+.02);
    if(type!=='move'){const osc=ac.createOscillator(),bass=ac.createGain();osc.type='sine';osc.frequency.setValueAtTime(type==='boom'?92:145,t);osc.frequency.exponentialRampToValueAtTime(type==='boom'?34:60,t+dur);osc.connect(bass);bass.connect(ac.destination);bass.gain.setValueAtTime(.09,t);bass.gain.exponentialRampToValueAtTime(.0001,t+dur);osc.start(t);osc.stop(t+dur+.02);}
   }catch(_){sound(type)}
  };
  const label={adv_home:'神殿・未寫完的名字',adv_road:'旅途・借來的明天',adv_bond:'同伴・篝火旁的約定',adv_doubt:'疑影・被藏起來的路',adv_battle:'交鋒・仍然向前',adv_crisis:'危機・不要放開我的手',adv_release:'解放・世界又能呼吸',adv_grief:'負傷・未能同行的腳步',adv_victory:'突破・留下來的光',adv_ending:'歸途・把明天還給世界'};
  function caption(name){return label[name]||(name.startsWith('adv_boss_')?'決戰・六石的回聲':name)}
  function audition(){const before=state?.name||'adv_road';openOvl('<h2>旅程的聲音</h2><p>原創主題隨故事變奏。建議戴耳機；手機第一次點擊後才會播放。</p><div class="list">'+Object.keys(label).map(n=>'<button class="btn" data-score="'+n+'">'+label[n]+'</button>').join('')+'</div><p id="scoreNow" class="wsub"></p><button class="btn primary" id="scoreClose">返回旅程</button>');const show=n=>{const e=document.querySelector('#scoreNow');if(e)e.textContent='正在播放：'+caption(n)};observers.add(show);show(state?.name||'silence');document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{soundOn=true;setMusic(true);play(b.dataset.score);});document.querySelector('#scoreClose').onclick=()=>{observers.delete(show);play(before);closeOvl()};}
  const showScreen=show;show=function(id){const r=showScreen(id);if(id==='#sStory'||id==='#sOracle')play('adv_home');return r};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state){state.start=audioCtx().currentTime+.1;state.index=0;}});
  const el=document.createElement('button');el.className='btn';el.textContent='♪ 旅程配樂';el.onclick=audition;document.querySelector('#sTitle .cta').appendChild(el);
  return rootAPI.runtime={play,stop,audition,caption,duck(value=1){duck=value;if(state&&AC){state.gain.gain.setTargetAtTime(value,AC.currentTime,.06);state.sendG.gain.setTargetAtTime(value,AC.currentTime,.06);}},get name(){return state?.name||null}};
 }
 const rootAPI={tracks,select,install};return rootAPI;
});
