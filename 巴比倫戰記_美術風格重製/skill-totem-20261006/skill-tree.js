/* Skill ownership is separate from old roster/progress saves. No resets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SkillTree=api;api.install();}})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const KEY='babylon-skill-tree-v1', EDITION='20261006-totem1';
 const PATHS={
  warrior:{entry:'sweep',mid:'holyguard',ultimate:'rainsword',color:'#d59863'},
  mage:{entry:'beam',mid:'meteor',ultimate:'nova',color:'#94bbdf'},
  support:{entry:'heal',mid:'revive',ultimate:'ultima',color:'#efcf86'},
  rogue:{entry:'assassin',mid:'twin',ultimate:'ninpo',color:'#ba9bcf'},
  summoner:{entry:'sum_fire',mid:'sum_imt',ultimate:'sum_bahamut',color:'#76bdb7'},
  sorcerer:{entry:'drain',mid:'nec_ignis',ultimate:'nec_hanzo',color:'#b0a0d3'},
  alchemist:{entry:'brew',mid:'m_shell',ultimate:'panacea',color:'#a5bb77'}
 };
 const integer=(v,lo=0,hi=999)=>Math.max(lo,Math.min(hi,Math.floor(Number(v)||0)));
 function record(raw){const r=raw&&typeof raw==='object'?raw:{};return{high:integer(r.high,1),points:integer(r.points),learned:[...new Set((Array.isArray(r.learned)?r.learned:[]).filter(k=>typeof k==='string'))],found:[...new Set((Array.isArray(r.found)?r.found:[]).filter(k=>typeof k==='string'))],legacy:!!r.legacy};}
 function normalize(raw){const classes={};for(const [cls,r]of Object.entries(raw?.classes||{}))if(['warrior','mage','support','rogue','summoner','sorcerer','alchemist'].includes(cls))classes[cls]=record(r);return{version:1,classes};}
 function grant(raw,lv){const r=record(raw),high=integer(lv,1);if(high>r.high){r.points=integer(r.points+high-r.high);r.high=high;}return r;}
 function migrate(lv,skills,legacy){const r=grant(null,lv);r.legacy=legacy;r.learned=[...new Set(['guard',...(legacy?['counter',...skills]:[])])];return r;}
 function reason(r,node,ctx){
  if(r.learned.includes(node.k))return '已學會';
  if(ctx.lv<node.lv)return '需要 Lv'+node.lv;
  if(node.adv&&!ctx.adv)return '需要先轉職';
  if(node.stage&&ctx.stage<node.stage)return '需要突破第'+node.stage+'章';
  if(node.node&&!ctx.cleared.includes(node.node))return '需要完成 '+node.node;
  if(node.spark&&!r.found.includes(node.k))return '需先與'+node.sparkName+'交手';
  if(node.star&&!ctx.stars.includes(node.star))return '需先解放對應星宿';
  if(node.recipe&&!ctx.recipes.includes(node.k))return '需先讓對應魔物加入隊伍';
  const missing=(node.pre||[]).filter(k=>!r.learned.includes(k));
  if(missing.length)return '需先學會 '+missing.map(k=>ctx.names[k]||k).join('、');
  if(r.points<node.cost)return '還差 '+(node.cost-r.points)+' 點';
  return '';
 }
 function purchase(raw,node,ctx){const r=record(raw),error=reason(r,node,ctx);if(error)return{ok:false,error,record:r};r.points-=node.cost;r.learned.push(node.k);return{ok:true,record:r};}
 function install(){
  const api=window.SkillTree;document.documentElement.dataset.skillEdition=EDITION;
  SK.guard.nm='防禦術';SK.guard.desc='初始技能，不耗 MP。舉盾防禦，直到下一次行動前受到的傷害降低 60%。';
  SK.heal.nm='回復術';
  SK.counter={nm:'反擊',mp:0,passive:true,desc:'被攻擊後仍站著，且普通攻擊打得到敵人時，自動反擊一次。'};
  const names=()=>Object.fromEntries(Object.entries(SK).map(([k,s])=>[k,s.nm]));
  const liveLv=cls=>Math.max(rosterOf(cls).lv||1,...G.party.filter(u=>u.cls===cls).map(u=>u.lv||1));
  const context=cls=>({lv:liveLv(cls),adv:!!(rosterOf(cls).adv||G.party.find(u=>u.cls===cls)?.adv),stage:PROGRESS,cleared:[...CLEARED],stars:[...STARS_GOT],recipes:[...ALCHEMY],names:names()});
  function catalog(cls){
   const rows=[{k:'guard',cost:0,lv:1,pre:[],branch:'冒險基礎'},{k:'counter',cost:1,lv:2,pre:['guard'],branch:'冒險基礎'}];
   const base=CLASSES[cls].skills.filter(k=>k!=='guard');if(cls==='warrior')base.unshift('sweep');
   base.forEach((k,i)=>rows.push({k,cost:1,lv:i>1?3:2,pre:[i>0?base[i-1]:'guard'],branch:'職業技藝'}));
   // Support has a deliberate healing branch and a separate protection branch.
   if(cls==='support'){for(const n of rows){if(n.k==='fort')n.pre=['guard'];if(n.k==='focus')n.pre=['fort'];}rows.push({k:'persuade',cost:1,lv:2,pre:['guard'],branch:'職業技藝'});}
   const first=base[0]||'guard';
   for(const k of ADV[cls].skills)rows.push({k,cost:2,lv:5,adv:true,pre:[cls==='support'?'heal':first],branch:'進階修練'});
   for(const e of LEARN[cls]||[]){const pre=cls==='support'?['revive']:[first];rows.push({...e,cost:e.k==='ultima'||e.k==='raise'?3:2,lv:e.lv||5,pre,branch:'傳說秘技',sparkName:e.spark?MONS[e.spark]?.nm:'頭目'});}
   for(const s of STAR_DEF.filter(s=>s.cls===cls))rows.push({k:'st_'+s.key,cost:2,lv:5,star:s.key,pre:[first],branch:'星宿傳承'});
   if(cls==='alchemist')for(const k of new Set(Object.values(MON_SKILL)))if(SK[k])rows.push({k,cost:1,lv:2,recipe:true,pre:['brew'],branch:'魔物配方'});
   const final=rows.find(n=>n.k===PATHS[cls].ultimate);if(final){final.cost=3;final.lv=10;final.adv=true;final.pre=[PATHS[cls].mid];final.branch='中央究極';final.ultimate=true;}
   return rows.filter((n,i,a)=>SK[n.k]&&a.findIndex(v=>v.k===n.k)===i);
  }
  let state=normalize(LS(KEY,null));
  const legacy=Object.keys(ROSTER).length>0||!!LS('babylon-party-v1',null)||CLEARED.size>0;
  for(const cls of CLS_ORDER){const rec=rosterOf(cls);if(!state.classes[cls])state.classes[cls]=migrate(rec.lv,[CLASSES[cls].basic,...CLASSES[cls].skills,...(rec.adv?ADV[cls].skills:[]),...learnedSkills(cls,rec),...starSkills(cls),...(cls==='alchemist'?[...ALCHEMY]:[]),...(cls==='support'?['persuade']:[])],legacy);else state.classes[cls]=grant(state.classes[cls],rec.lv);}
  function save(next=state){if(TEST.on)return false;try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch(e){toast('技能紀錄無法儲存，請確認瀏覽器允許網站儲存資料。',2800);return false;}}
  if(!TEST.on)save();
  const owned=cls=>state.classes[cls]||migrate(1,[],false);
  function has(cls,k){return TEST.on?true:owned(cls).learned.includes(k);}
  function loadout(cls){
   const rec=rosterOf(cls),r=owned(cls);
   const learned=TEST.on?[...CLASSES[cls].skills,...(rec.adv?ADV[cls].skills:[]),...learnedSkills(cls,rec),...starSkills(cls),...(cls==='alchemist'?[...ALCHEMY]:[])]:r.learned;
   const basic=cls==='warrior'&&!r.legacy&&!TEST.on?'strike':CLASSES[cls].basic;
   return{basic,skills:[...new Set(['guard',...learned])].filter(k=>SK[k]&&!SK[k].passive&&k!==basic&&k!=='persuade'),counter:has(cls,'counter')};
  }
  function updateParty(cls){const l=loadout(cls);for(const u of G.party.filter(u=>u.cls===cls)){u.basic=l.basic;u.skills=l.skills.slice();}}
  function level(u){if(TEST.on)return;const before=owned(u.cls),after=grant(before,u.lv);if(after.high===before.high)return;const next=normalize(state);next.classes[u.cls]=after;save(next);}
  function buy(cls,k){
   if(TEST.on)return{ok:false,error:'頭目測試不花正式技能點'};
   if(G.phase==='battle'||G.phase==='deploy')return{ok:false,error:'請先結束戰鬥，再到技能樹學習'};
   const node=catalog(cls).find(n=>n.k===k);if(!node)return{ok:false,error:'沒有這項技能'};
   const result=purchase(owned(cls),node,context(cls));if(!result.ok)return result;
   const next=normalize(state);next.classes[cls]=result.record;if(!save(next))return{ok:false,error:'未能儲存，技能點沒有扣除'};
   updateParty(cls);return result;
  }
  function discover(cls,boss){if(TEST.on)return;const found=(LEARN[cls]||[]).filter(e=>e.spark===boss).map(e=>e.k).filter(k=>!owned(cls).found.includes(k));if(!found.length)return;const next=normalize(state);next.classes[cls].found.push(...found);if(save(next))toast('秘技靈感：'+found.map(k=>SK[k].nm).join('、')+'。戰後可在技能樹學習。',2800);}
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selectedRoute=null,flowFrame=null,flowRender=null,flowBusy=false,flowPermit=null;
  function chips(cls){const l=loadout(cls);return [...new Set([l.basic,...l.skills,...(l.counter?['counter']:[])])].map(k=>'<span class="sk">'+escape(SK[k].nm)+'</span>').join('')+'<button class="btn sm" data-skill-tree="'+cls+'">技能樹 · '+owned(cls).points+' 點</button>';}
  function bindButtons(){document.querySelectorAll('[data-skill-tree]').forEach(b=>b.onclick=()=>open(b.dataset.skillTree));}
  function pathData(cls){return{cls,name:CLASSES[cls].nm.replace('煉金術士','煉金').replace('召喚士','召喚').replace('特殊','刺客'),path:PATHS[cls],nodes:catalog(cls),owned:owned(cls).learned,available:catalog(cls).filter(n=>!reason(owned(cls),n,context(cls))).map(n=>n.k),names:names()};}
  function targetOf(cls){return selectedRoute?.cls===cls?selectedRoute.k:(catalog(cls).find(n=>!reason(owned(cls),n,context(cls))&&n.cost>0)?.k||PATHS[cls].entry);}
  function wheel(cls){return '<div class="tree-wheel sg">'+SkillPaths.overview(CLS_ORDER.map(pathData),cls,targetOf(cls))+'</div>';}
  function stopFlow(){if(flowFrame!==null)cancelAnimationFrame(flowFrame);flowFrame=null;flowRender=null;flowBusy=false;flowPermit=null;}
  function animateRoute(cls,k,finished){
   if(flowPermit!==cls+':'+k)return finished();flowPermit=null;
   const key=cls+':'+k,paths=[...document.querySelectorAll('[data-flow="'+key+'"]')];
   if(!paths.length||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return finished();
   flowBusy=true;document.querySelector('.skill-tree').setAttribute('aria-busy','true');
   const controls=[...document.querySelectorAll('.skill-tree button,.skill-tree select')].map(b=>[b,b.disabled]);controls.forEach(([b])=>b.disabled=true);
   const tracks=paths.map(path=>{const svg=path.closest('svg'),head=svg.querySelector('[data-head="'+key+'"]'),pocket=svg.querySelector('[data-fluid-pocket="'+key+'"]'),liquid=svg.querySelector('[data-liquid="'+key+'"]'),slot=liquid?.closest('.sg-slot'),source=svg.querySelector('[data-path-skill="'+path.parentElement.dataset.from+'"]');return{path,svg,head,pocket,liquid,slot,source,length:path.getTotalLength()};});
   tracks.forEach(t=>{t.slot?.classList.add('charging');t.source?.classList.add('source-active');});
   const render=ms=>{const f=SkillPaths.flowAt(ms);for(const t of tracks){t.svg.dataset.flowPhase=f.phase;t.svg.dataset.flowProgress=f.travel.toFixed(3);t.svg.dataset.fillProgress=f.fill.toFixed(3);t.path.style.strokeDashoffset=String(1-f.travel);const p=t.path.getPointAtLength(t.length*f.travel);t.head.setAttribute('cx',p.x);t.head.setAttribute('cy',p.y);t.head.setAttribute('opacity',f.travel>0&&f.travel<1?'1':'0');t.pocket?.setAttribute('opacity',f.fill>0?'1':'0');if(t.liquid)t.liquid.style.transform='translateY('+((1-f.fill)*Number(t.liquid.dataset.distance))+'px)';if(f.done){t.slot?.classList.remove('charging');t.source?.classList.remove('source-active');}}return f;};
   flowRender=render;render(0);const start=performance.now(),tick=now=>{const f=render(now-start);if(!f.done&&tracks[0].svg.isConnected)flowFrame=requestAnimationFrame(tick);else{flowFrame=null;flowRender=null;flowBusy=false;controls.forEach(([b,d])=>{if(b.isConnected)b.disabled=d});document.querySelector('.skill-tree')?.removeAttribute('aria-busy');finished();}};flowFrame=requestAnimationFrame(tick);
  }
  function learnFromRoute(cls,k,returnTo){
   if(flowBusy)return;const result=buy(cls,k);if(!result.ok){toast(result.error,2000);return;}
   selectedRoute={cls,k};open(cls,returnTo);flowPermit=cls+':'+k;sfx('charge');
   const status=document.querySelector('#sgStatus');status.textContent='靈光沿金雕管道注入中…';
   animateRoute(cls,k,()=>{if(document.querySelector('#sgStatus')){sfx('heal');document.querySelector('#sgStatus').textContent='「'+SK[k].nm+'」已永久學會';document.querySelector('#sgConfirm').textContent='已學會 · 永久點亮';}});
  }
  function open(cls=partyList()[0]?.cls||'warrior',returnTo){
   if(flowBusy)return;stopFlow();
   const r=owned(cls),ctx=context(cls),nodes=catalog(cls),p=partyList().find(p=>p.cls===cls),k=targetOf(cls),n=nodes.find(n=>n.k===k),on=r.learned.includes(k),why=reason(r,n,ctx),can=!why&&!TEST.on&&G.phase!=='battle'&&G.phase!=='deploy';
   const portrait=window.PortraitUI?.html(p?{...p,adv:ctx.adv}:{cls,sex:DEFAULT_SEX[cls],adv:ctx.adv},'tree-portrait')||'';
   openOvl('<section class="skill-tree"><header class="totem-header">'+portrait+'<div><p class="tree-eyebrow">DESTINY · 天命之輪</p><h2>'+escape(p?.name||CLASSES[cls].name)+'</h2><small>'+escape(CLASSES[cls].nm)+' · Lv'+ctx.lv+'</small></div><strong class="totem-points">'+r.points+'<small>技能點</small></strong><button class="btn" id="treeClose" aria-label="返回冒險">×</button></header>'+wheel(cls)+'<div class="totem-selectors"><select id="sgClass" aria-label="選擇職業">'+CLS_ORDER.map(c=>'<option value="'+c+'" '+(c===cls?'selected':'')+'>'+escape(CLASSES[c].nm)+'</option>').join('')+'</select><select id="sgSkill" aria-label="選擇技能">'+nodes.map(n=>'<option value="'+n.k+'" '+(n.k===k?'selected':'')+'>'+escape(SK[n.k].nm)+(r.learned.includes(n.k)?' · 已學':'')+'</option>').join('')+'</select></div><article class="totem-detail"><div class="totem-skill-title"><b>'+escape(SK[k].nm)+'</b><small>'+escape(n.branch)+' · '+n.cost+'點'+(SK[k].mp?' · MP'+SK[k].mp:'')+'</small></div><p class="totem-description">'+escape(SK[k].desc||'')+'</p><p class="totem-prereq">'+(n.pre.length?'前置：'+n.pre.map(x=>escape(SK[x].nm)).join(' → '):'起點能力')+' · Lv'+n.lv+(n.adv?' · 需轉職':'')+'</p><div id="sgStatus" role="status" aria-live="polite">'+escape(on?'已永久點亮，不可逆；不再播放注入':TEST.on?'測試模式不花正式技能點':G.phase==='battle'||G.phase==='deploy'?'戰鬥結束後才能學習':why||'選擇技能後，按學習確認代價')+'</div><button class="btn primary" id="sgConfirm" '+(!can?'disabled':'')+'>'+(on?'已學會 · 永久點亮':'學習 · '+n.cost+'點')+'</button></article><footer class="totem-note">每升一級＋1點 · 學習立即存檔'+(r.legacy?' · 原有技能保留':'')+'</footer></section>');
   const select=(c,k)=>{if(flowBusy)return;selectedRoute={cls:c,k};open(c,returnTo);};
   document.querySelectorAll('[data-path-class]').forEach(b=>{const action=()=>select(b.dataset.pathClass,b.dataset.pathSkill==='guard'?targetOf(b.dataset.pathClass):b.dataset.pathSkill);b.onclick=action;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}};});
   document.querySelector('#sgClass').onchange=e=>select(e.target.value,targetOf(e.target.value));
   document.querySelector('#sgSkill').onchange=e=>select(cls,e.target.value);
   const confirm=document.querySelector('#sgConfirm');let pending=false;
   confirm.onclick=()=>{if(flowBusy||!can)return;if(!pending){pending=true;document.querySelector('#sgStatus').textContent='確認投入 '+n.cost+' 點學習「'+SK[k].nm+'」？此成長不可逆。';confirm.textContent='確認學習並注入';const cancel=document.createElement('button');cancel.className='btn';cancel.id='sgCancel';cancel.textContent='取消';cancel.onclick=()=>open(cls,returnTo);confirm.before(cancel);}else learnFromRoute(cls,k,returnTo);};
   document.querySelector('#treeClose').onclick=()=>{if(flowBusy)return;stopFlow();closeOvl();if(returnTo)returnTo();if(!document.querySelector('#sSetup')?.hidden&&setup.picks.length)renderSetup();};
  }
  const setupBase=renderSetup;renderSetup=function(...args){const r=setupBase(...args);bindButtons();return r;};
  const statusBase=openStatus;openStatus=function(...args){const r=statusBase(...args),p=partyList()[stIdx];if(p){const b=document.createElement('button');b.className='btn primary';b.textContent='技能樹 · '+owned(p.cls).points+' 點';b.onclick=()=>open(p.cls,()=>openStatus(stIdx));document.querySelector('#ovl .win')?.appendChild(b);}return r;};
  const worldBase=openWorld;openWorld=function(...args){const r=worldBase(...args),row=document.querySelector('.wbtns');if(row&&!row.querySelector('#worldSkillTree')){const b=document.createElement('button');b.className='btn';b.id='worldSkillTree';b.textContent='技能樹';b.onclick=()=>open();row.appendChild(b);}return r;};
  const performBase=perform;perform=async function(u,sk,x,z){
   if(u.cls&&u.team==='hero'&&!TEST.on&&sk!==SK[u.basic]&&sk!==SK.adv_aid&&sk.kind!=='item'&&!has(u.cls,Object.keys(SK).find(k=>SK[k]===sk))){toast('這項技能尚未學會，請先到技能樹學習。',2200);return;}
   const foe=unitAt(x,z);if(u.team==='hero'&&u.cls&&foe?.boss&&SIDE(foe)!==SIDE(u))discover(u.cls,foe.kind);
   return performBase(u,sk,x,z);
  };
  const learnBase=learnSkill;learnSkill=function(u,k){if(!window.SkillTree)return learnBase(u,k);if(!u.cls||TEST.on)return;const next=normalize(state);if(!next.classes[u.cls].found.includes(k))next.classes[u.cls].found.push(k);save(next);};
  const entry=document.createElement('button');entry.className='btn';entry.textContent='技能樹';entry.onclick=()=>open();document.querySelector('#sTitle .cta')?.appendChild(entry);
  for(const [cls,desc]of Object.entries({warrior:'先以普通攻擊與防禦立足；橫掃、震地與劍技由技能樹學習。',mage:'先以法杖與防禦冒險；貫流、綻放與高階法術需投入技能點。',support:'起初只有普通攻擊與防禦；回復、強化、說服與復活需學習。',rogue:'以普通攻擊與防禦起步；暗殺、二連與忍術需學習。',summoner:'以法杖與防禦起步；召喚術需技能點及冒險解鎖。',sorcerer:'以法杖與防禦起步；吸血、詛咒與死靈術需學習。',alchemist:'以藥瓶與防禦起步；回復藥劑與魔物配方需學習。'})){CLASSES[cls].tag=desc;ADV[cls].desc=cls==='summoner'?'數值提升、召喚 MP −25%；新召喚術仍需技能點學習。':'數值提升，解鎖進階分支；招式仍需技能點學習。';}
  api.runtime={catalog,context,owned:cls=>record(owned(cls)),loadout,has,level,buy,discover,chips,open,wheel,stopFlow,canCounter:u=>!u.cls||u.team!=='hero'||has(u.cls,'counter'),get state(){return normalize(state);}};
 }
 return{KEY,EDITION,PATHS,record,normalize,grant,migrate,reason,purchase,install};
});
