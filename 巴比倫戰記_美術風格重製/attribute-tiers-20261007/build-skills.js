/* Branches and second professions: no ownership reset, no auto-learning. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.BuildSkills=api;api.prepare();}})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const KEY='babylon-second-profession-v1';
 const PASSIVES={
 warrior:{k:'counter',nm:'反擊',desc:'鄰接反擊；投點後才會發動。'},
 mage:{k:'p_focus',nm:'節律施法',desc:'被動：魔法與治療技能 MP 消耗 −20%，最低1。'},
 support:{k:'p_mercy',nm:'醫者仁心',desc:'被動：自己施放的治療量 +25%。'},
 rogue:{k:'p_ambush',nm:'伏擊心得',desc:'被動：背後物理攻擊傷害再 +20%。'},
 summoner:{k:'p_pact',nm:'契約共鳴',desc:'被動：召喚 MP 消耗 −20%，可與本職轉職優惠疊加。'},
 sorcerer:{k:'p_veil',nm:'幽影護身',desc:'被動：體力不高於50%時，受到魔法傷害 −25%。'},
 alchemist:{k:'p_remedy',nm:'藥理精研',desc:'被動：調合與回復系技能治療量 +25%。'}
 };
 const HIGH_PASSIVES={
 warrior:[['p_resolve','不屈','體力低於50%時，受到物理傷害 −20%。'],['p_bulwark','鐵壁誓約','舉盾時，受到魔王技能傷害再 −25%。']],
 mage:[['p_power','咒式強化','魔法攻擊傷害 +15%。'],['p_overcast','魔力奔流','剩餘 MP 超過50%時，魔法傷害再 +20%。']],
 support:[['p_triage','急救心得','目標體力低於30%時，治療量再 +30%。'],['p_aegis','守命','自己低於50%體力時，受到傷害 −20%。']],
 rogue:[['p_evasion','身法','受到正面物理攻擊傷害 −20%。'],['p_execution','終結直覺','攻擊低於30%體力的敵人，傷害 +25%。']],
 summoner:[['p_attune','召喚調律','召喚攻擊傷害 +20%。'],['p_nexus','靈脈相繫','召喚 MP 再減20%，仍消耗行動。']],
 sorcerer:[['p_leech','吸魂精研','吸魂傷害與回復量 +15%。'],['p_pale','冥契','自己低於50%體力時，魔法傷害 +20%。']],
 alchemist:[['p_mixmaster','精準調合','治療 MP 消耗 −20%。'],['p_panacean','瀕危調理','治療低於30%體力的目標時，回復量再 +50%。']]
 };
 const SCHOOLS={
 support:{name:'醫者',item:'商隊醫者手札',node:'1-3',keys:['heal','p_mercy','fort']},
 mage:{name:'魔導',item:'灰燼魔導卷',node:'1-王',keys:['beam','p_focus','bloom']},
 warrior:{name:'守衛',item:'岩獄守誓',node:'2-王',keys:['quake','counter','holyguard']},
 rogue:{name:'影行',item:'霜岸暗行訣',node:'3-1',keys:['assassin','p_ambush','twin']},
 summoner:{name:'契約',item:'城門聖獸印',node:'獸1',keys:['sum_fire','p_pact','sum_wind']},
 sorcerer:{name:'幽咒',item:'双尾星刻',node:'★12',keys:['drain','p_veil','curse']},
 alchemist:{name:'調合',item:'商隊調合筆記',node:'1-3',keys:['brew','p_remedy','m_shell']}
 };
 function normalize(raw){const choices={};for(const [c,s]of Object.entries(raw?.choices||{}))if(SCHOOLS[c]&&SCHOOLS[s]&&c!==s)choices[c]=s;return{version:1,choices};}
 function unlock(s,cleared){return!!SCHOOLS[s]&&cleared.includes(SCHOOLS[s].node);}
 function bind(raw,cls,school,cleared){const state=normalize(raw);if(!SCHOOLS[cls]||!SCHOOLS[school]||cls===school)return{ok:false,error:'請選擇不同的第二職業',state};if(state.choices[cls])return{ok:false,error:'此角色已選定第二職業',state};if(!unlock(school,cleared))return{ok:false,error:'尚未取得傳承',state};state.choices[cls]=school;return{ok:true,state};}
 function secondaryNodes(s){if(!SCHOOLS[s])return[];return SCHOOLS[s].keys.map((k,i)=>({k:'sub_'+s+'_'+k,base:k,cost:i===2?3:2,lv:i===2?7:3,pre:i===2?['sub_'+s+'_'+SCHOOLS[s].keys[0]]:['guard'],branch:'第二職業 · '+SCHOOLS[s].name,secondary:s,secondaryItem:SCHOOLS[s].item,passive:i===1,recipe:k==='m_shell'}));}
 function prepare(){for(const rows of Object.values(HIGH_PASSIVES))for(const [k,nm,desc]of rows)SK[k]={nm,desc,passive:true,mp:0};for(const [cls,p]of Object.entries(PASSIVES))if(cls!=='warrior')SK[p.k]={nm:p.nm,desc:p.desc,passive:true,mp:0};for(const s of Object.keys(SCHOOLS))for(const n of secondaryNodes(s)){const base=SK[n.base]||{nm:'反擊',desc:'被攻擊後存活且鄰接時，自動反擊一次。',passive:true,mp:0};SK[n.k]={...base,nm:SCHOOLS[s].name+'・'+(n.base==='heal'?'回復術':base.nm),secondary:s,sourceSkill:n.base};if(n.base==='heal'||n.base==='brew')SK[n.k].desc+='；副職最低回復目標最大體力的22%，需消耗 MP 和行動。';}}
 function install(){
  document.documentElement.dataset.buildEdition='20261006-choice1';
  let state;try{state=normalize(JSON.parse(localStorage.getItem(KEY)))}catch(_){state=normalize(null)}
  const school=cls=>state.choices[cls]||null;
  const runtime=SkillTree.runtime;
  const has=(cls,k)=>runtime.owned(cls).learned.includes(k)||!!school(cls)&&runtime.owned(cls).learned.includes('sub_'+school(cls)+'_'+k);
  function choose(cls,s){if(TEST.on||G.phase==='battle'||G.phase==='deploy')return{ok:false,error:'請在正式冒險、非戰鬥時選擇'};const result=bind(state,cls,s,[...CLEARED]);if(!result.ok)return result;try{localStorage.setItem(KEY,JSON.stringify(result.state));state=result.state;return result}catch(_){return{ok:false,error:'無法儲存，選擇沒有生效'}}}
  const counter=runtime.canCounter;runtime.canCounter=u=>counter(u)||(u.team==='hero'&&u.cls&&has(u.cls,'counter'));
  const cost=mpCost;mpCost=function(u,sk){let m=cost(u,sk);if(u.cls&&has(u.cls,'p_mixmaster')&&sk.kind==='heal')m=Math.ceil(m*.8);if(u.cls&&has(u.cls,'p_nexus')&&sk.summon)m=Math.ceil(m*.8);if(u.cls&&has(u.cls,'p_focus')&&['mag','heal'].includes(sk.kind))m=Math.ceil(m*.8);if(u.cls&&has(u.cls,'p_pact')&&sk.summon)m=Math.ceil(m*.8);return sk.mp?Math.max(1,m):0;};
  const oldCalc=calc;calc=function(a,d,s,from){const r=oldCalc(a,d,s,from);if(a.cls){if(s.kind==='mag'){let scale=1;if(has(a.cls,'p_power'))scale*=1.15;if(has(a.cls,'p_overcast')&&a.mp/a.mmp>.5)scale*=1.2;if(has(a.cls,'p_pale')&&a.hp/a.mhp<=.5)scale*=1.2;if(has(a.cls,'p_leech')&&(s.drain||s.sourceSkill==='drain'))scale*=1.15;if(has(a.cls,'p_attune')&&s.summon)scale*=1.2;r.v=Math.round(r.v*scale);}if(['phys','mag','assassin'].includes(s.kind)&&has(a.cls,'p_execution')&&d.hp/d.mhp<.3)r.v=Math.round(r.v*1.25);if(s.kind==='heal'){if(d.hp/d.mhp<.3){if(has(a.cls,'p_triage'))r.v=Math.round(r.v*1.3);if(has(a.cls,'p_panacean'))r.v=Math.round(r.v*1.5);}if(s.secondary)r.v=Math.max(r.v,Math.ceil(d.mhp*.22));if(has(a.cls,'p_mercy')||has(a.cls,'p_remedy')){r.v=Math.round(r.v*1.25);r.mods?.push('治療專精 +25%');}}if(s.kind==='phys'&&has(a.cls,'p_ambush')&&relDir(from||a,d)==='back'){r.v=Math.round(r.v*1.2);r.mods?.push('伏擊 +20%');}}if(d.cls){if(d.hp/d.mhp<=.5&&has(d.cls,'p_aegis'))r.v=Math.round(r.v*.8);if(s.kind==='phys'&&d.hp/d.mhp<=.5&&has(d.cls,'p_resolve'))r.v=Math.round(r.v*.8);if(s.kind==='phys'&&has(d.cls,'p_evasion')&&relDir(from||a,d)==='front')r.v=Math.round(r.v*.8);if(a.boss&&d.guard&&has(d.cls,'p_bulwark'))r.v=Math.round(r.v*.75);}if(d.cls&&s.kind==='mag'&&d.hp/d.mhp<=.5&&has(d.cls,'p_veil')){r.v=Math.round(r.v*.75);r.mods?.push('幽影護身 −25%');}return r;};
  const result0=showResult;showResult=function(win){const result=result0(win);if(win&&!TEST.on){const rewards=Object.entries(SCHOOLS).filter(([,s])=>s.node===G.node?.id);if(rewards.length){const panel=document.createElement('div');panel.className='soon';panel.textContent='取得第二職業傳承：'+rewards.map(([,s])=>s.item).join('、')+'。回地圖開啟技能樹，各角色可選擇一種傳承；學招式仍須共用技能點。';document.querySelector('#resWrap')?.appendChild(panel);}}return result;};
  return{school,choose,has,get state(){return normalize(state);}};
 }
 return{KEY,PASSIVES,HIGH_PASSIVES,SCHOOLS,normalize,unlock,bind,secondaryNodes,prepare,install};
});
