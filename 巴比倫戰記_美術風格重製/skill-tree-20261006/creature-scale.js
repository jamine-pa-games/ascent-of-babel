/* Rendering only: species size is independent of team, level and combat stats. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.CreatureScale=api;document.documentElement.dataset.creatureEdition='20261006-depth1';}})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const species={
  tiny:['slime','rat','centip','tanuki','imp'],
  small:['shroom','salam','crab','hawk','clockhawk','ash'],
  standard:['wolf','refr','dryad'],
  humanoid:['tengu','kensei','skel','rguard','rarcher','bladeghost','nimrod'],
  large:['scree','golem','automaton'],
 };
 const tiers={
  tiny:{world:.78,cinema:.23,foot:.65,bar:.62},
  small:{world:1.02,cinema:.29,foot:.8,bar:.72},
  standard:{world:1.3,cinema:1/3,foot:.95,bar:.82},
  humanoid:{world:1.58,cinema:1/3,foot:1,bar:.86},
  large:{world:1.9,cinema:.48,foot:1.15,bar:1.03},
  boss:{world:2.9,cinema:1,foot:1.35,bar:1.5},
 };
 const lookup=Object.fromEntries(Object.entries(species).flatMap(([tier,keys])=>keys.map(k=>[k,tier])));
 function classify(u={},metadata={}){if(u.cls)return'party';if(u.boss)return'boss';const source=(metadata.art||'').replace(/^mon_/,'');return lookup[u.kind]||lookup[source]||'standard';}
 function get(u={},metadata={}){const tier=classify(u,metadata);if(tier==='party')return {tier,world:u.human?1.82:1.18,cinema:1/3,foot:1,bar:.86};return{tier,...tiers[tier]};}
 function figure(u,metadata={}){if(u.cls||u.boss)return'';const s=get(u,metadata);return ' data-creature="1" data-size-tier="'+s.tier+'" style="--creature-scale:'+s.cinema+'"';}
 return{species,tiers,classify,get,figure};
});
