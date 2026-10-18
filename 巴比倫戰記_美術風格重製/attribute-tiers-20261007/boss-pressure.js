/* Tactical pressure with escape windows, break conditions and preparation counters. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.BossPressure=api;api.runtime=api.install();}})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const rules={
 grom:{style:'堡壘・破甲窗口',rule:'開場鎖甲使物理傷害再減45%。魔法有效命中會破甲，接下來兩次葛隆行動之內可集中物理輸出；第二次行動召盾衛。',counter:'帶魔法破甲者與範圍招式；鎖子甲頂鞭擊，登山靴維持高低差走位。'},
 selena:{style:'歌姬・斷唱窗口',rule:'優先遠距施法，避免貼著前排。蓄力中的冰歌被地屬性有效命中兩次會中斷；中斷後下一次行動用於恢復。',counter:'地屬性角色分兩次打斷，或離開紅圈；擊殺祭司避免她補回體力，霜潮護符降低水傷。'},
 ignis:{style:'祭司・封熄窗口',rule:'每次行動都會留下兩處餘燼，下一次魔王行動爆發，留在原格損失25%最大體力。水屬性命中可封熄下輪的新標記，並減弱既有爆發。',counter:'用水屬性輪流壓火、預留移動與回復草；餘燼護符減火傷。不要全隊固定原地輸出。'},
 hanzo:{style:'獵手・側背威脅',rule:'優先逼近殘血與施法者，繞向側背。開局就使用蓄力一文字，紅圈鎖定舊位置、不追蹤閃避者。',counter:'前排留在後排兩格內牽制；把加速草交給受追擊者，分散並橫向閃一文字。疾風護符減風伤。'}
 };
 const wards={ac_ember:'火',ac_frost:'水',ac_stone:'地',ac_gale:'風'};
 function boundedDamage(v,hp,charged,guarded,ward=false){const cap=Math.max(1,Math.floor(hp*(charged?.86:.58)+1e-8));let damage=Math.min(Math.round(v*1.18),cap);if(guarded)damage=Math.min(damage,Math.max(1,Math.floor(hp*(charged?.35:.25))));if(ward)damage=Math.round(damage*.65);return Math.max(1,damage);}
 function positionScore(u,from,foes,kind='phys'){
  const distance=f=>Math.abs(from.x-f.x)+Math.abs(from.z-f.z),soft=foes.filter(f=>f.cls==='support'||f.cls==='mage'||f.hp/f.mhp<.5),front=foes.filter(f=>f.cls==='warrior'&&f.alive);
  if(u.kind==='selena')return foes.some(f=>distance(f)<=1)?-20:Math.min(8,Math.min(...foes.map(distance)))*.7;
  if(u.kind==='hanzo'){const victim=soft.length?soft:foes;const near=Math.min(...victim.map(distance));const protectedBack=front.some(t=>victim.some(v=>Math.abs(t.x-v.x)+Math.abs(t.z-v.z)<=2));return(8-near)*1.5-(protectedBack?8:0);}
  if(u.kind==='grom')return -Math.max(0,Math.abs(from.x-u.x)+Math.abs(from.z-u.z)-2)*3;
  if(u.kind==='ignis')return foes.filter(f=>distance(f)<=2).length*-2;
  return 0;
 }
 function install(){
  document.documentElement.dataset.pressureEdition='20261006-pressure1';
  for(const [id,el]of Object.entries(wards))EQUIP[id]={nm:{火:'餘燼護符',水:'霜潮護符',地:'岩紋護符',風:'疾風護符'}[el],slot:'acc',type:'acc',st:{res:2},price:180,tier:1,glyph:'◈',desc:el+'屬性魔王技能傷害 −35%，占用飾品欄，與攻擊／速度飾品取捨。'};
  for(const [k,r]of Object.entries(rules)){const p=BossDirector.profiles[k];p.rule+='　【戰術壓力】'+r.rule;p.counter=r.counter;if(k==='ignis'){p.hazardEvery=1;p.hazardDamage=.25;}if(k==='grom')p.triggers[0]={turn:2};MONS[k].tip+='　'+r.rule;}
  const build=buildBattle;buildBattle=function(){const result=build();for(const u of units.filter(u=>u.boss&&u.team==='enemy')){const factor=rules[u.kind]?1.4:1.2;u.hp=u.mhp=Math.round(u.mhp*factor);u.spd=Math.min(18,u.spd+2);u.ct=50;if(u.kind==='grom')u.pressureArmor=true;drawBar(u);}return result;};
  const calc0=calc;calc=function(a,d,s,from){const r=calc0(a,d,s,from);if(d.kind==='grom'&&d.pressureArmor&&s.kind==='phys'){r.v=Math.max(1,Math.round(r.v*.55));r.mods.push('鎖甲：先以魔法破甲');}if(a.boss&&a.team==='enemy'&&['phys','mag','assassin'].includes(s.kind)&&d.mhp){const charged=s===SK[bossKit(a).charge],id=gearOf(EQUIPPED[d.cls]?.acc)?.id,ward=wards[id]===(s.el||s.fxEl||a.el);r.v=boundedDamage(r.v,d.mhp,charged,d.guard,ward);if(a.kind==='hanzo'&&units.some(u=>u.alive&&u.cls==='warrior'&&u.team===d.team&&Math.abs(u.x-d.x)+Math.abs(u.z-d.z)<=2)){r.v=Math.round(r.v*.75);r.mods.push('前排牽制 −25%');}r.crit=0;r.mods.push(charged?'蓄力威脅':'魔王壓力');if(ward)r.mods.push('屬性護符 −35%');}return r;};
  const damage=dealDamage;dealDamage=async function(a,d,s){const before=d.hp,result=await damage(a,d,s);if(d.alive&&d.hp<before&&d.boss&&a.team!=='enemy'){
   if(d.kind==='grom'&&s.kind==='mag'){d.pressureArmor=false;d.pressureExposed=2;floatText(d,'鎖甲破裂・兩次行動窗口','txt');}
   if(d.kind==='selena'&&d.charge&&(s.el||a.el)==='地'){d.pressureBreak=(d.pressureBreak||0)+1;floatText(d,'斷唱 '+d.pressureBreak+'/2','txt');if(d.pressureBreak>=2){d.charge=null;d.pressureBreak=0;d.pressureRecover=true;clearBossMarks();floatText(d,'冰歌中斷・恢復一回合','txt');}}
   if(d.kind==='ignis'&&(s.el||a.el)==='水'){d.pressureCooled=true;floatText(d,'封熄・下一輪不追加餘燼','txt');}
  }return result;};
  const turn=bossTurn;bossTurn=async function(u,foes){if(u.pressureRecover){u.pressureRecover=false;u.actions=(u.actions||0)+1;floatText(u,'恢復詠唱・反攻窗口','txt');await wait(500);return;}
   const exposed=u.pressureExposed||0;await turn(u,foes);if(exposed>0){u.pressureExposed=Math.max(0,exposed-1);if(!u.pressureExposed&&u.alive){u.pressureArmor=true;floatText(u,'鎖甲復原','txt');}}if(!u.charge)u.pressureBreak=0;if(u.pressureCooled)u.pressureCooled=false;
  };
  return{rules};
 }
 return{rules,wards,boundedDamage,positionScore,install};
});
