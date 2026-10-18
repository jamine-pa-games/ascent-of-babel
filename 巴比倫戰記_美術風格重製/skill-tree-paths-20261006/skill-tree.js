/* Skill ownership is separate from old roster/progress saves. No resets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SkillTree=api;api.install();}})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const KEY='babylon-skill-tree-v1', EDITION='20261006-paths2';
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
  let selectedRoute=null,viewMode='overview',flowFrame=null,flowRender=null;
  function chips(cls){const l=loadout(cls);return [...new Set([l.basic,...l.skills,...(l.counter?['counter']:[])])].map(k=>'<span class="sk">'+escape(SK[k].nm)+'</span>').join('')+'<button class="btn sm" data-skill-tree="'+cls+'">技能樹 · '+owned(cls).points+' 點</button>';}
  function bindButtons(){document.querySelectorAll('[data-skill-tree]').forEach(b=>b.onclick=()=>open(b.dataset.skillTree));}
  function pathData(cls){return{cls,name:CLASSES[cls].nm.replace('煉金術士','煉金').replace('召喚士','召喚').replace('特殊','刺客'),path:PATHS[cls],nodes:catalog(cls),owned:owned(cls).learned,available:catalog(cls).filter(n=>!reason(owned(cls),n,context(cls))).map(n=>n.k),names:names()};}
  function wheel(cls){
   const data=pathData(cls),target=selectedRoute?.cls===cls?selectedRoute.k:PATHS[cls].ultimate;
   return'<div class="tree-wheel sg"><div class="sg-heading"><b>'+(viewMode==='overview'?'天命之輪 · 七條成長之路':escape(data.name)+' · 展開技能路線')+'</b><small>'+(viewMode==='overview'?'選擇職業端點，查看清楚的技能連接管道':'從前置節點出發，沿彎曲管道流向下一個技能')+'</small></div>'+(viewMode==='overview'?SkillPaths.overview(CLS_ORDER.map(pathData),cls):SkillPaths.route(data,target))+'<div class="sg-controls"><button class="btn sm" id="sgExpand">展開'+escape(data.name)+'路線</button><button class="btn sm" id="sgOverview">七職業總覽</button></div><label class="sg-picker">查看技能路線<select id="sgSkill" aria-label="查看技能路線">'+catalog(cls).map(n=>'<option value="'+n.k+'" '+(n.k===target?'selected':'')+'>'+escape(SK[n.k].nm)+(owned(cls).learned.includes(n.k)?' · 已學會':'')+'</option>').join('')+'</select></label></div>';
  }
  function stopFlow(){if(flowFrame!==null)cancelAnimationFrame(flowFrame);flowFrame=null;flowRender=null;}
  function animateRoute(cls,k,manual=false){
   if(!has(cls,k))return;
   stopFlow();const key=cls+':'+k,paths=[...document.querySelectorAll('[data-flow="'+key+'"]')];if(!paths.length)return;
   if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
   const tracks=paths.map(path=>{const svg=path.closest('svg'),head=svg.querySelector('[data-head="'+key+'"]'),pocket=svg.querySelector('[data-fluid-pocket="'+key+'"]'),liquid=svg.querySelector('[data-liquid="'+key+'"]'),slot=liquid?.closest('.sg-slot'),source=svg.querySelector('[data-path-skill="'+path.parentElement.dataset.from+'"]');return{path,svg,head,pocket,liquid,slot,source,length:path.getTotalLength()};});
   const controls=[...document.querySelectorAll('[data-tree-learn],[data-route-learn],#sgReplay')].map(b=>[b,b.disabled]);controls.forEach(([b])=>b.disabled=true);
   tracks.forEach(t=>{t.slot?.classList.add('charging');t.source?.classList.add('source-active');});
   const render=ms=>{const f=SkillPaths.flowAt(ms);for(const t of tracks){t.svg.dataset.flowPhase=f.phase;t.svg.dataset.flowProgress=f.travel.toFixed(3);t.svg.dataset.fillProgress=f.fill.toFixed(3);t.path.style.strokeDashoffset=String(1-f.travel);const p=t.path.getPointAtLength(t.length*f.travel);t.head.setAttribute('cx',p.x);t.head.setAttribute('cy',p.y);t.head.setAttribute('opacity',f.travel>0&&f.travel<1?'1':'0');t.pocket?.setAttribute('opacity',f.fill>0?'1':'0');if(t.liquid)t.liquid.style.transform='translateY('+((1-f.fill)*Number(t.liquid.dataset.distance))+'px)';if(f.done){t.slot?.classList.remove('charging');t.source?.classList.remove('source-active');}}if(f.done)controls.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled});return f;};
   flowRender=render;render(0);if(manual)return;
   const start=performance.now();const tick=now=>{const f=render(now-start);if(!f.done&&tracks[0].svg.isConnected)flowFrame=requestAnimationFrame(tick);else{flowFrame=null;flowRender=null;}};flowFrame=requestAnimationFrame(tick);
  }
  function learnFromRoute(cls,k,returnTo){const result=buy(cls,k);if(!result.ok){toast(result.error,2000);return;}selectedRoute={cls,k};viewMode='route';sfx('heal');open(cls,returnTo);animateRoute(cls,k);toast('靈光正沿管道流向「'+SK[k].nm+'」',2500);}
  function open(cls=partyList()[0]?.cls||'warrior',returnTo){
   stopFlow();
   const r=owned(cls),ctx=context(cls),nodes=catalog(cls),p=partyList().find(p=>p.cls===cls),l=loadout(cls);
   openOvl('<section class="skill-tree"><p class="tree-eyebrow">TABLET OF GROWTH · 成長泥板</p><h2>'+escape(p?.name||CLASSES[cls].name)+' · 技能樹</h2><div class="tree-summary"><span>'+escape(CLASSES[cls].nm)+' · Lv '+ctx.lv+'</span><strong>'+r.points+'<small> 可用技能點</small></strong></div><p class="tree-rule">每升 1 級獲得 1 點。點亮分支，由你決定先學反擊、回復或職業招式。戰鬥中不能學習。</p>'+(r.legacy?'<p class="tree-legacy">舊存檔原有招式與反擊已保留，不消耗技能點。</p>':'<p class="tree-rule">初始：普通攻擊、防禦術、回復草。救援是同伴互助，不需學習。反擊與回復術都要另外學。</p>')+(TEST.on?'<p class="tree-legacy">頭目測試：技能展示，不改正式紀錄。</p>':'')+'<div class="tree-tabs">'+CLS_ORDER.map(c=>'<button class="btn sm'+(c===cls?' primary':'')+'" data-tree-class="'+c+'">'+escape(CLASSES[c].nm)+'</button>').join('')+'</div><div class="tree-root"><span>Ⅰ</span><div><b>普通攻擊</b><small>'+escape(SK[l.basic].nm)+' · 初始能力 · 不耗 MP</small></div><em>已掌握</em></div>'+[...new Set(nodes.map(n=>n.branch))].map(branch=>'<div class="tree-branch"><h3>'+escape(branch)+'</h3>'+nodes.filter(n=>n.branch===branch).map(n=>{const on=r.learned.includes(n.k),why=reason(r,n,ctx),ready=!why&&!TEST.on&&G.phase!=='battle'&&G.phase!=='deploy';return'<div class="tree-node '+(on?'learned':ready?'ready':'locked')+'"><div class="tree-symbol">'+(on?'◆':ready?'◇':'·')+'</div><div class="tree-description"><b>'+escape(SK[n.k].nm)+(SK[n.k].passive?' <small>被動</small>':'')+'</b><small>'+escape(SK[n.k].desc||'')+'</small><span class="tree-path">'+(n.pre.length?'前置：'+n.pre.map(k=>escape(SK[k]?.nm||k)).join(' → ')+' · ':'')+'Lv'+n.lv+(n.adv?' · 轉職後':'')+(n.stage?' · 第'+n.stage+'章後':'')+' · '+n.cost+' 點'+(SK[n.k].mp?' · MP '+SK[n.k].mp:'')+'</span>'+(!on&&why?'<span class="tree-lock">'+escape(why)+'</span>':'')+'</div><button class="btn sm '+(ready?'primary':'')+'" data-tree-learn="'+n.k+'" '+(!ready?'disabled':'')+' aria-label="'+escape((on?'已學會':'學習')+SK[n.k].nm)+'">'+(on?'已學會':'學習 '+n.cost+' 點')+'</button></div>';}).join('')+'</div>').join('')+'<p class="tree-rule">學習會立即儲存；倒地或休養不會失去已學的招式。秘技、星宿與魔物配方仍須先完成冒險條件。</p><button class="btn primary" id="treeClose">返回冒險</button></section>');
   document.querySelector('.tree-summary').insertAdjacentHTML('afterend',wheel(cls));
   const selectPath=b=>{const c=b.dataset.pathClass,k=viewMode==='overview'&&b.dataset.pathSkill==='guard'?PATHS[c].ultimate:b.dataset.pathSkill;selectedRoute={cls:c,k};viewMode='route';open(c,returnTo);};
   document.querySelectorAll('[data-path-class]').forEach(b=>{b.onclick=()=>selectPath(b);b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPath(b);}};});
   document.querySelectorAll('[data-tree-class]').forEach(b=>b.onclick=()=>{selectedRoute={cls:b.dataset.treeClass,k:PATHS[b.dataset.treeClass].ultimate};open(b.dataset.treeClass,returnTo);});
   document.querySelectorAll('[data-tree-learn]').forEach(b=>b.onclick=()=>learnFromRoute(cls,b.dataset.treeLearn,returnTo));
   document.querySelector('#sgExpand').onclick=()=>{viewMode='route';selectedRoute={cls,k:PATHS[cls].ultimate};open(cls,returnTo);};
   document.querySelector('#sgOverview').onclick=()=>{viewMode='overview';open(cls,returnTo);};
   document.querySelector('#sgSkill').onchange=e=>{viewMode='route';selectedRoute={cls,k:e.target.value};open(cls,returnTo);};
   if(viewMode==='route'){
    const k=selectedRoute?.cls===cls?selectedRoute.k:PATHS[cls].ultimate,n=catalog(cls).find(n=>n.k===k),why=reason(r,n,ctx),on=r.learned.includes(k),can=!why&&!TEST.on&&G.phase!=='battle'&&G.phase!=='deploy',box=document.createElement('div');box.className='sg-selected';box.innerHTML='<b>'+escape(SK[k].nm)+'</b><small>'+escape(on?'已學會 · 動畫重播不會扣點':why||('注入 '+n.cost+' 點技能點學習'))+'</small><button class="btn primary" data-route-learn="'+k+'" '+(!can?'disabled':'')+'>注入靈光學習</button>'+(on&&n.pre.length?'<button class="btn" id="sgReplay">重播管內流動</button>':'');document.querySelector('.sg-picker').after(box);box.querySelector('[data-route-learn]').onclick=()=>learnFromRoute(cls,k,returnTo);if(document.querySelector('#sgReplay'))document.querySelector('#sgReplay').onclick=()=>animateRoute(cls,k);
   }
   document.querySelector('#treeClose').onclick=()=>{stopFlow();closeOvl();if(returnTo)returnTo();if(!document.querySelector('#sSetup')?.hidden&&setup.picks.length)renderSetup();};
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
  api.runtime={catalog,context,owned:cls=>record(owned(cls)),loadout,has,level,buy,discover,chips,open,wheel,animateRoute,stopFlow,flowAt:ms=>flowRender?.(ms),canCounter:u=>!u.cls||u.team!=='hero'||has(u.cls,'counter'),get state(){return normalize(state);}};
 }
 return{KEY,EDITION,PATHS,record,normalize,grant,migrate,reason,purchase,install};
});
