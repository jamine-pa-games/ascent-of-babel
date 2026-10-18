/* Narrative adventure, recoverable wounds and bounded battlefield aid. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AdventureDirector=api;api.install();}})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const KEY='babylon-adventure-v1';
 function normalize(raw){const o={version:1,wounds:{},log:{},rests:0};if(!raw||typeof raw!=='object')return o;
  for(const [k,v]of Object.entries(raw.wounds||{}))if(['warrior','mage','support','rogue','summoner','sorcerer','alchemist'].includes(k)&&Number.isFinite(+v))o.wounds[k]=Math.min(2,Math.max(0,Math.floor(+v)));
  if(raw.log&&typeof raw.log==='object')for(const [k,v]of Object.entries(raw.log))if(v&&typeof v==='object')o.log[k]={won:!!v.won,task:!!v.task,rescued:Math.min(99,Math.max(0,+v.rescued||0)),losses:Math.min(99,Math.max(0,+v.losses||0))};o.rests=Math.max(0,+raw.rests||0);return o;
 }
 const penalty=(hp,spd,w)=>({hp:Math.max(1,Math.round(hp*(1-.08*Math.min(2,w)))),spd:Math.max(1,spd-Math.min(2,w))});
 function down(u,stamp){if(u.escaped||u.withdrawn||u.team!=='hero')return false;u.aidLeft=3;u.downedAt=stamp;u.downCount=(u.downCount||0)+1;return true;}
 const canAid=(u,d,distance,blocked=false)=>!!(u.alive&&!u.acted&&!d.alive&&d.team==='hero'&&!d.withdrawn&&d.aidLeft>0&&distance===1&&!blocked);
 function tickDown(list,stamp){const out=[];for(const d of list)if(!d.alive&&d.team==='hero'&&!d.escaped&&!d.withdrawn&&d.aidLeft>0&&stamp>d.downedAt){if(--d.aidLeft===0){d.withdrawn=true;out.push(d)}}return out;}
 function settle(state,party,win,node,taskDone){const next=normalize(state),injured=[];for(const u of party.filter(u=>u.cls)){
  const before=next.wounds[u.cls]||0;if(!u.alive&&!u.escaped){next.wounds[u.cls]=Math.min(2,before+1);injured.push(u.name)}else if(win)next.wounds[u.cls]=Math.max(0,before-1);
 }const prev=next.log[node]||{};next.log[node]={won:!!(prev.won||win),task:!!(prev.task||(win&&taskDone)),rescued:Math.min(99,(prev.rescued||0)+party.reduce((s,u)=>s+(u.aidReceived||0),0)),losses:Math.min(99,(prev.losses||0)+(win?0:1))};return {state:next,injured};}
 function install(){
  document.documentElement.dataset.adventureEdition='20261006-soul1';
  let state;try{state=normalize(JSON.parse(localStorage.getItem(KEY)))}catch(_){state=normalize(null)}
  const save=()=>{if(TEST.on)return;try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){toast('這台裝置無法保存旅程紀錄',1800)}};
  let session=null,ending=false,endBusy=false,turnBusy=false;const score=()=>AdventureScore.runtime;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const data=n=>AdventureStory.get(n);
  const lines=arr=>{const l=G.party.find(u=>u.cls)||G.party[0],s=G.party.find(u=>u.cls==='support'&&u!==l)||G.party.find(u=>u!==l&&u.cls)||l;return arr.map(t=>{if(t.startsWith('L|'))return[l,l?.name||'旅人',t.slice(2)];if(t.startsWith('S|'))return[s,s?.name||'同伴',t.slice(2)];return[null,'',t,true]})};
  const hud=document.createElement('div');hud.id='adventureHUD';hud.hidden=true;document.querySelector('#app').appendChild(hud);
  function status(){if(!session||G.phase!=='battle'){hud.hidden=true;return}hud.hidden=false;const d=units.filter(u=>!u.alive&&u.team==='hero'&&!u.withdrawn&&!u.escaped&&u.aidLeft>0);
   if(mode==='act'&&!ending&&document.querySelector('#dlg').hidden){const boss=units.find(u=>u.boss&&u.alive);const danger=d.length||G.party.some(u=>u.cls&&u.alive&&u.hp/u.mhp<=.3);bgm(danger?'adv_crisis':boss?(boss.enraged||STAGE.escape?'boss2':'boss'):battleTrack());}
   const task=session.beat.task;hud.innerHTML='<button id="advBrief" aria-label="冒險目標與救援規則">'+escape(task?task.name+' '+session.done+'/'+session.points.length:'冒險・'+session.beat.title)+'</button>'+(d.length?'<span class="aid-warning">'+d.map(u=>escape(u.name)+'：救援剩 '+u.aidLeft+' 次我方行動').join('／')+'</span>':'');document.querySelector('#advBrief').onclick=brief;
  }
  function brief(){if(!session)return;const t=session.beat.task;openOvl('<h2>'+escape(session.beat.title)+'</h2><p>'+(t?escape(t.name)+'：'+session.done+'/'+session.points.length+'。'+(t.required?'必須完成任務並突破敵人才能通關。':'可選任務，完成可獲得首次補給。'):'保住同伴，突破這一段路。')+'</p><p>金色任務圈可站在圈上或相鄰一格，以「任務」互動；消耗行動。</p><div class="sec">倒地救援</div><p>倒地後有 3 次我方結束行動的救援窗口。相鄰、相同可通行高度的同伴可用「救援」，不用 MP，恢復 25% 體力並暫時舉盾。</p><p>窗口用完會傷重撤離，本戰不能再復活。戰後負傷每級使最大體力 −8%、速度 −1，最多兩級。營地可免費休養；成功突破也會恢復一級舊傷。沒有人永久死亡。</p><button class="btn primary" id="advClose">回到戰場</button>');document.querySelector('#advClose').onclick=closeOvl;}
  const clean=()=>{if(session)for(const p of session.points){if(p.mesh){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose()}}hud.hidden=true;};
  const build=buildBattle;buildBattle=function(){clean();ending=false;endBusy=false;turnBusy=false;const r=build();const beat=data(G.node);session={beat,points:[],done:0,stamp:0,mid:false,pre:false,settled:false,result:null,baseWounds:{...state.wounds},wonBefore:CLEARED.has(G.node.id)};
   for(const u of G.party.filter(u=>u.cls)){u.wound=TEST.on?0:state.wounds[u.cls]||0;if(u.wound){const p=penalty(u.mhp,u.spd,u.wound);u.mhp=u.hp=p.hp;u.spd=p.spd;drawBar(u)}}
   // stageOf can return shared objects: replace only our own previous wrapper.
   const st=STAGE;if(!st._advOutWrapped){st._advOutWrapped=true;const out=st.outro;st.outro=(b,l,t)=>[...(out?out(b,l,t):[]),...lines(data(G.node).after)];}
   return r;
  };
  function makePoints(){const task=session.beat.task;if(!task||session.points.length)return;const hero=G.party.find(u=>u.cls&&u.alive);if(!hero)return;
   // Flood-fill the actual map, using a deployed character's jump limit; no inaccessible task markers.
   const seen=new Map(),queue=[[hero.x,hero.z,0]];while(queue.length){const [x,z,d]=queue.shift(),key=x+','+z;if(seen.has(key))continue;const t=T(x,z);if(!t||!walkable(t)||t.pit||t.vortex)continue;seen.set(key,{x,z,d});for(const [dx,dz]of DIRS){const n=T(x+dx,z+dz);if(n&&walkable(n)&&!n.pit&&!n.vortex&&Math.abs(n.h-t.h)<=hero.jump)queue.push([n.x,n.z,d+1])}}
   const locationCost=q=>Math.abs(q.d-7)*2+Math.abs(q.z-5)+Math.abs(q.x-5.5)*.2;
   let choices=[...seen.values()].filter(q=>q.d>=3&&!unitAt(q.x,q.z)&&!T(q.x,q.z).seal&&!T(q.x,q.z).guard).sort((a,b)=>locationCost(a)-locationCost(b));
   if(!choices.length)choices=[...seen.values()].filter(q=>!unitAt(q.x,q.z));if(!choices.length)choices=[{x:hero.x,z:hero.z,d:0}];
   for(let i=0;i<task.count;i++){const q=choices.find(a=>session.points.every(b=>man(a,b)>=3))||choices[0];if(!q)break;choices=choices.filter(a=>a!==q);const m=new THREE.Mesh(new THREE.RingGeometry(.31,.46,36),new THREE.MeshBasicMaterial({color:'#f1cf83',transparent:true,opacity:.9,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(q.x,topY(T(q.x,q.z))+.06,q.z);m.renderOrder=4;scene.add(m);session.points.push({...q,mesh:m,done:false});}
   if(!session.points.length){console.warn('No task placement',G.node.id);session.done=task.count;}
  }
  const start=startBattle;startBattle=async function(){makePoints();const before=G.phase;score().play(session.beat.mood==='adv_doubt'?'adv_doubt':'adv_bond');mode='busy';session.pre=true;await say(lines(session.beat.before));G.phase=before;await start();status()};
  const sayBase=say;say=async function(arr){const before=score().name;const over=G.phase==='over'||ending;score().play(over?(session?.beat.mood||'adv_release'):'adv_bond');score().duck(.72);try{return await sayBase(arr)}finally{score().duck(1);if(!over&&before)score().play(before)}};
  const beforeBestiary=showBestiary;showBestiary=async function(){await beforeBestiary();if(session?.beat.task)toast(session.beat.task.name+'：金色任務圈以「任務」互動',3500)};
  const koBase=ko;ko=async function(u){const was=u.alive;await koBase(u);if(u.team==='hero'&&!u.escaped&&!u.withdrawn&&(was||!u.aidLeft)){
    down(u,session?.stamp||0);score().play('adv_crisis');toast(u.name+' 倒地！3 次我方行動內，相鄰同伴可救援',3200);status();
   }};
  Object.assign(SK,{adv_aid:{nm:'救援',mp:0,kind:'revive',aid:true,tgt:'downed',rng:[1,1],area:'single',desc:'相鄰救起倒地同伴，25% 體力，消耗行動，不用 MP'}});
  const targets=validTargets;validTargets=function(u,sk,from=u){const found=targets(u,sk,from);if(sk.tgt!=='downed')return found;return found.filter(([x,z])=>{const d=units.find(o=>!o.alive&&o.team==='hero'&&o.x===x&&o.z===z);return d&&!d.withdrawn&&(!sk.aid||(d.aidLeft>0&&Math.abs(T(d.x,d.z).h-T(from.x,from.z).h)<=u.jump))})};
  function recover(d,hp){d.alive=true;d.hp=Math.max(1,Math.ceil(d.mhp*hp));d.aidLeft=0;d.withdrawn=false;d.ct=0;d.guard=true;d.mat.rotation=0;d.mat.color.setRGB(1,1,1);d.mat.opacity=1;d.grp.visible=true;d.ring.visible=d.tri.visible=d.bar.visible=d.ghost.visible=true;d.pos.y=topY(T(d.x,d.z));d.aidReceived=(d.aidReceived||0)+1;drawBar(d)}
  const performBase=perform;perform=async function(u,sk,x,z){if(sk.aid){const d=units.find(o=>!o.alive&&o.team==='hero'&&o.x===x&&o.z===z);if(!d||!canAid(u,d,man(u,d),!!unitAt(x,z))||!validTargets(u,sk).some(q=>q[0]===x&&q[1]===z))return;
    mode='busy';faceTo(u,d);score().duck(.5);await castPose(u,'#e4d3ae');recover(d,.25);sfx('heal');floatText(d,'我還在','heal');await wait(320);u.acted=true;score().duck(1);if(!units.some(a=>a.aidLeft>0&&!a.alive))bgm(units.some(a=>a.boss&&a.alive)?'boss':battleTrack());status();return;
   }const downs=units.filter(d=>!d.alive&&d.team==='hero');const r=await performBase(u,sk,x,z);for(const d of downs)if(d.alive){d.aidLeft=0;d.aidReceived=(d.aidReceived||0)+1;}status();return r;};
  async function interact(){const u=cur;if(!u||!u.alive||u.acted||mode!=='act')return;const p=session.points.find(p=>!p.done&&man(u,p)<=1&&Math.abs(T(u.x,u.z).h-T(p.x,p.z).h)<=u.jump);if(!p){toast('先移到金色任務圈或相鄰一格',1800);return}
   mode='busy';p.done=true;session.done++;u.acted=true;p.mesh.material.color.set('#94bd9d');p.mesh.material.opacity=.4;sfx('heart');score().duck(.6);floatText(u,session.beat.task.verb+'完成','heal');await wait(350);score().duck(1);mode='act';refreshTurn();status();if(session.done===session.points.length)toast(session.beat.task.name+' 完成：也要突破敵人才能通關',2600);
  }
  const dock=renderDock;renderDock=function(){dock();const u=cur;if(!u||!u.alive||u.team==='enemy'||mode!=='act')return;const parent=document.querySelector('#dock');const add=(text,fn,disabled)=>{const b=document.createElement('button');b.className='btn';b.textContent=text;b.disabled=disabled;b.onclick=fn;parent.appendChild(b)};
   if(units.some(d=>!d.alive&&d.team==='hero'&&!d.withdrawn&&d.aidLeft>0))add('救援',()=>enterTarget(SK.adv_aid),u.acted||!validTargets(u,SK.adv_aid).length);
   if(session?.points.some(p=>!p.done))add('任務',interact,u.acted||!session.points.some(p=>!p.done&&man(u,p)<=1&&Math.abs(T(u.x,u.z).h-T(p.x,p.z).h)<=u.jump));parent.style.gridTemplateColumns='repeat('+Math.min(4,parent.children.length)+',1fr)';status();};
  const turnEnd=endTurn;endTurn=async function(){if(turnBusy)return;turnBusy=true;try{const u=cur;if(session&&u?.alive&&u.team!=='enemy'){
    session.stamp++;const gone=tickDown(units,session.stamp);for(const d of gone){d.grp.visible=false;toast(d.name+' 傷重撤離；戰後需休養',2400)}status();
    if(!session.mid&&G.turns>=8&&session.beat.mid.length&&G.party.some(a=>a.cls&&a.alive)){session.mid=true;mode='busy';const emergency=units.some(a=>a.team==='hero'&&!a.alive&&a.aidLeft>0);if(!emergency)await say(lines(session.beat.mid));}
   }return turnEnd()}finally{turnBusy=false}};
  const check=checkEnd;checkEnd=async function(){if(endBusy)return true;if(G.phase!=='battle')return check();
   const heroes=units.filter(u=>u.team==='hero'&&u.alive),foes=units.filter(u=>u.team==='enemy'&&u.alive&&!MONS[u.kind]?.rare),boss=units.find(u=>u.boss);
   const won=!!heroes.length&&!STAGE.escape&&((boss&&!boss.alive)||!foes.length);
   if(won&&session?.beat.task?.required&&session.done<session.points.length){status();setHint('敵人已突破，仍需完成：'+session.beat.task.name);return false;}
   if(!heroes.length&&!STAGE.escape){ending=true;score().play('adv_grief');}
   if(won){endBusy=true;ending=true;try{if(!boss)await say(lines(session.beat.after));return await check()}finally{endBusy=false;ending=false}}
   return check();
  };
  const result=showResult;showResult=function(win){if(session&&!session.settled){session.settled=true;const taskDone=!!session.beat.task&&session.points.length>0&&session.done===session.points.length;const done=settle(state,G.party,win,G.node.id,taskDone);session.result=done;const firstTask=!state.log[G.node.id]?.task;
    if(!TEST.on){state=done.state;save();if(win&&taskDone&&firstTask){G.bag.herb=(G.bag.herb||0)+1;session.taskReward=true;}}
   }result(win);clean();const wrap=document.querySelector('#resWrap');if(!wrap||!session)return;
   if(!win){const h=wrap.querySelector('h1');if(h)h.textContent='這一次，先帶大家回去';const prose=wrap.querySelector('.prose');if(prose)prose.innerHTML='<p>最後一個人倒下之前，隊伍把名字點完。這段路還沒走完，沒有人必須永遠留在這裡。</p><p>'+escape(STAGE.lose||'先保護後排，留出救援與撤退的空間。')+'</p><p class="hint">倒地後 3 次我方行動內救援；先回营地免費休養，再改變站位與戰術重來。</p>';}
   const note=document.createElement('div');note.className='adv-aftermath';note.innerHTML='<h3>'+escape(session.beat.title)+'</h3><p>'+(win?escape(session.beat.after.find(t=>!t.includes('|'))||'這段路留給了後來的人。'):'這一次的失敗已寫進旅程，但路沒有關閉。')+'</p><p>'+(session.result.injured.length?'負傷：'+session.result.injured.map(escape).join('、')+'。最大體力每級 −8%、速度 −1。':'同伴平安返回。'+(win?'成功突破，舊傷恢復一級。':''))+'</p>'+(session.taskReward?'<p>首次完成任務：村民送來回復草 ×1。</p>':'');wrap.appendChild(note);
   if(!TEST.on){const b=document.createElement('button');b.className='btn';b.textContent='營地休養';b.onclick=camp;wrap.querySelector('.cta')?.appendChild(b);}score().play(win?session.beat.mood:'adv_grief');
  };
  const request=bgm;bgm=function(name){if(name==='map'&&(ending||G.phase==='over')&&session)return score().play(units.some(u=>u.alive&&u.team==='hero')?session.beat.mood:'adv_grief');return request(name)};
  const once=bgmOnce;bgmOnce=function(name,after){if(name==='victory'&&session)return score().play('adv_victory',session.beat.mood);return once(name,after)};
  const go=goNode;goNode=function(n){const r=go(n),b=data(n);score().play(b.mood==='adv_doubt'?'adv_doubt':'adv_bond');const e=document.createElement('div');e.className='adv-chapter';e.innerHTML='<strong>'+escape(b.title)+'</strong><p>'+escape(b.before[0])+'</p>'+(b.task?'<small>本段任務：'+escape(b.task.name)+(b.task.required?'（必要）':'（可選）')+'</small>':'<small>保住同伴，讓這段旅程有人走完。</small>');document.querySelector('#chWrap').appendChild(e);return r};
  function journal(){const active=session?.beat||data(curNode||NODES.find(n=>nodeOpen(n)&&!CLEARED.has(n.id))||NODES[0]);openOvl('<h2>泥板上的旅程</h2><p>現在的約定：'+escape(active.title)+'</p><p>你的原有進度完整保留。舊章節顯示已走過的路；新版才會記錄救援與任務選擇。</p>'+AdventureStory.chapters.map(([title,desc,meaning],c)=>'<details'+(curNode?.c===c?' open':'')+'><summary>'+escape(title)+'</summary><p>'+escape(desc)+'</p><p class="wsub">'+escape(meaning)+'</p>'+NODES.filter(n=>!n.inst&&n.c===c).map(n=>{const b=data(n),record=state.log[n.id];return'<div class="adv-memory"><b>'+escape(n.id+'・'+b.title)+'</b><small>'+((record?.won||CLEARED.has(n.id))?'已走過':'尚未完成')+(record?.task?'・完成任務':'')+(record?.rescued?'・救援 '+record.rescued+' 次':'')+(record?.losses?'・敗北 '+record.losses+' 次':'')+'</small><p>'+escape((record?.won||CLEARED.has(n.id))?b.after.find(t=>!t.includes('|'))||b.after[0]:b.before[0])+'</p></div>'}).join('')+'</details>').join('')+'<button class="btn primary" id="journalClose">合上泥板</button>');document.querySelector('#journalClose').onclick=closeOvl;}
  function camp(){if(G.phase==='battle'||G.phase==='deploy'){toast('先完成或離開戰鬥，才能在營地休養',2000);return;}const chapter=curNode?.c||0,injured=setup.picks.filter(p=>state.wounds[p.cls]);score().play('adv_bond');openOvl('<h2>篝火旁・把名字點完</h2><img class="adv-camp-art" src="art/sc_forest.jpg" alt="夜裡的森林"><p>'+escape(AdventureStory.chapters[chapter]?.[2]||'這一晚，沒有人必須趕路。')+'</p><div class="list">'+setup.picks.map(p=>'<div class="adv-memory"><b>'+escape(p.name)+'</b><small>'+(state.wounds[p.cls]?'負傷 '+state.wounds[p.cls]+' 級':'平安')+'</small></div>').join('')+'</div><p>「你不用證明自己還走得動。今晚，我替你守著火。」</p><p class="wsub">休養免費，不刪角色、不扣金幣、不回退進度；恢復全部負傷。下一戰以完整體力出發。</p><button class="btn primary" id="campRest">一起休養</button><button class="btn" id="campClose">離開營地</button>');document.querySelector('#campRest').onclick=()=>{if(TEST.on){toast('頭目測試不改正式負傷紀錄',1800);return;}state.wounds={};state.rests++;save();document.querySelector('#campRest').disabled=true;document.querySelector('#campRest').textContent='大家都休息好了';document.querySelectorAll('#ovl .adv-memory small').forEach(e=>e.textContent='已康復');sfx('heal');toast(injured.length?'傷口處理好了。明天一起出發。':'這一晚，大家好好睡了一覺。',2600);};document.querySelector('#campClose').onclick=()=>{closeOvl();bgm(G.phase==='title'?'title':G.phase==='over'?session?.beat.mood||'map':'map')};}
  const briefBase=brief;brief=function(){if(G.phase==='battle'&&mode!=='act'){toast('輪到你行動時，可以安心查看冒險與救援規則',1800);return;}return briefBase()};
  const campBase=camp;camp=function(){if(!setup.picks.length){const saved=LS('babylon-party-v1',null);if(Array.isArray(saved?.picks)){setup.picks=saved.picks.filter(p=>CLASSES[p.cls]);G.oracle=saved.oracle||null;}}campBase();const anchor=document.querySelector('#ovl .adv-camp-art');if(!anchor)return;
   const voices={warrior:'剛才舉盾的時候，我也怕。只是聽見你們還在後面，就沒有放下來。',mage:'那些咒文我都背過。可真正讓我站起來的，是有人喊了我的名字。',support:'我不能替大家擋住每一道傷口。但下一次，請讓我來得及走到你身邊。',rogue:'我習慣先找到出口。現在，我會再回頭數一次人。',summoner:'聖獸回應的不是命令。我想，牠們也記得被等著的感覺。',sorcerer:'以前我以為，記住死去的人就夠了。現在還想記住活著的人怎麼笑。',alchemist:'傷口需要的不是奇蹟。是乾淨的布，和肯停下來的一晚。'};
   const hurt={warrior:'這回盾先掉了。我一直以為，只要我還站著就夠了。謝謝你們沒有把我留下。',mage:'咒文念到一半就斷了。我記得有人走回來，也記得那張留給我的毯子。',support:'這次換我躺在地上，才知道等人走過來，需要多大的勇氣。',rogue:'我找到了出口，卻沒能自己走出去。以後，我會把同伴的腳步也算進去。',summoner:'連聖獸都不能替我承受每一道傷。今晚，讓我做一個普通的同伴。',sorcerer:'我聽過許多告別。可你們對我說的是：等明天，再一起走。',alchemist:'這次我要學的，是接受別人替我纏好繃帶。'};
   anchor.insertAdjacentHTML('afterend','<div class="adv-reflections">'+setup.picks.map(p=>'<p><b>'+escape(p.name)+'：</b>「'+escape(state.wounds[p.cls]?hurt[p.cls]||'今晚，我會好好休息。':voices[p.cls]||'明天，還是一起走。')+'」</p>').join('')+'</div>');
  };
  const world=openWorld;openWorld=function(...args){const r=world(...args);const row=document.querySelector('.wbtns')||document.querySelector('#wForm')?.parentElement;if(row&&!row.querySelector('#advCamp')){for(const [id,title,fn]of [['advCamp','營地',camp],['advJournal','旅程',journal],['advScore','♪',()=>score().audition()]]){const b=document.createElement('button');b.className='btn';b.id=id;b.textContent=title;b.onclick=fn;row.appendChild(b)}}return r};
  const stat=openStatus;openStatus=function(...args){const r=stat(...args),p=partyList()[stIdx],w=state.wounds[p?.cls]||0;if(w){const e=document.createElement('p');e.className='aid-warning';e.textContent='負傷 '+w+' 級：本戰最大體力 −'+w*8+'%、速度 −'+w+'；營地免費休養可恢復。';document.querySelector('#ovl .win')?.appendChild(e)}return r};
  const move=moveUnit;moveUnit=async function(u,path){
   // Grounded short steps; use the original path and tile hazard semantics.
   if(u.team==='enemy'&&u.boss)return move(u,path);for(let i=1;i<path.length;i++){
    const [x0,z0]=path[i-1],[x1,z1]=path[i],a=T(x0,z0),b=T(x1,z1),y0=topY(a),y1=topY(b),climb=Math.abs(y1-y0)>.15;u.face=[x1-x0,z1-z0];
    const duration=climb?240:u.cls==='warrior'?210:190;await tween(duration,t=>{const progress=climb?t: t*t*(3-2*t);const lift=climb?Math.sin(Math.PI*t)*(.12+Math.max(0,y1-y0)*.35):Math.sin(Math.PI*t)*.035;u.pos.set(lerp(x0,x1,progress),lerp(y0,y1,t)+lift,lerp(z0,z1,progress));});u.pos.set(x1,y1,z1);score().duck(1);sfx('move');
    if(b.type==='w')burst(u.pos,{n:4,color:'#9fdcff',speed:.6,up:.65,life:.3,size:.09,normal:true});if(climb){await tween(55,t=>u.hop=-Math.sin(Math.PI*t)*.025);u.hop=0;}focusOn(u);
    if(b.pit){u.x=x1;u.z=z1;await pitFall(u,b);return false;}
   }const [x,z]=path[path.length-1];u.x=x;u.z=z;focusOn(u);return true;
  };
  for(const [title,fn]of [['旅程紀錄',journal],['營地休養',camp]]){const b=document.createElement('button');b.className='btn';b.textContent=title;b.onclick=fn;document.querySelector('#sTitle .cta').appendChild(b)}
  const b=document.createElement('button');b.className='btn';b.textContent='旅';b.setAttribute('aria-label','冒險目標與救援規則');b.onclick=brief;document.querySelector('#tools').appendChild(b);
  return api.runtime={status,brief,journal,camp,interact,makePoints,recover,get session(){return session},get state(){return normalize(state)}};
 }
 const api={KEY,normalize,penalty,down,canAid,tickDown,settle,install};return api;
});
