/* Encounter identities, bounded reinforcements and readable counterplay. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.BossDirector=api;api.runtime=api.install();}})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const hp=n=>({hp:n}),turn=n=>({turn:n}),hits=n=>({hits:n}),minion=(base,name,role='striker')=>({base,name,role});
 const profiles={
  goat:{title:'岩角守勢',triggers:[],mode:'guard',period:3,guardEvery:3,rule:'不召兵。每三次行動架起一次岩角守勢，物理攻擊減傷；魔法可穿透。',counter:'先用魔法破守勢，山崩紅圈出現後分散站位。'},
  grom:{title:'岩獄軍陣',triggers:[turn(3)],mode:'guard',period:3,waves:[[minion('golem','岩獄盾衛','guard'),minion('golem','鎖鏈守衛','guard')]],rule:'第三次行動叫來兩名岩獄盾衛；護衛活著時，葛隆受到的傷害降低。',counter:'用範圍魔法先打倒盾衛，不要一直硬打葛隆。',line:'鎖鏈不是拿來綁我的。守衛，封住出口。'},
  selena:{title:'冰潮祭儀',triggers:[hp(.65)],mode:'tide',period:3,waves:[[minion('refr','霜晶護衛','guard'),minion('slime','冰潮祭司','healer')]],rule:'65% 體力啟動冰潮祭儀，召霜晶護衛與祭司；祭司每兩次行動可治療主人。',counter:'先集火祭司，再破護衛；寒潮直線前要錯開站位。',line:'不要讓歌聲斷掉。替我，把海帶回來。'},
  ignis:{title:'餘燼焚場',triggers:[hp(.35)],mode:'fire',period:3,fastPeriod:2,hazardEvery:2,hazardCount:2,rule:'不召兵。每兩次行動標記兩處餘燼，下一次行動爆發；35% 體力後大招更密集。',counter:'橙色灼痕有一個魔王回合的逃離時間，先移開再攻擊。',line:'灰裡沒有僕人。只有還沒燒完的路。'},
  hanzo:{title:'疾風追獵',triggers:[turn(2)],mode:'hunter',period:4,fastPeriod:3,cooldown:1,haste:true,rule:'不召兵。第二次行動進入追獵，優先威脅輔助與受傷者，連段冷卻較短。',counter:'保護後排、保持距離；一文字紅圈可橫向躲開。',line:'別找我的影子。看清自己腳下的退路。'},
  odin:{title:'見切決鬥',triggers:[hp(.4)],mode:'guard',period:3,fastPeriod:2,guardEvery:2,rule:'不召兵。每兩次行動取得一次見切，擋掉部分物理傷害；40% 體力改用更密集劍招。',counter:'用魔法繞過見切；不要把隊伍排成劍雨的十字。',line:'不需要旁人。這一劍，只問你們。'},
  lisanking:{title:'鹽潮風靈',triggers:[turn(2)],mode:'storm',period:3,hazardEvery:3,hazardCount:2,waves:[[minion('tengu','鹽潮風靈','mage')]],rule:'第二次行動只召一名鹽潮風靈，並週期性標記鹽風落點。',counter:'先打風靈削弱魔王增幅，移開鹽風標記。',line:'一陣風就夠了。把他們的水，留在鹽裡。'},
  beast_mush:{title:'城門守火',triggers:[hp(.7)],mode:'fire',period:3,hazardEvery:3,hazardCount:1,waves:[[minion('salam','城門守火者')]],rule:'70% 體力召一名守火者，火痕將封住常停留的位置。',counter:'別守在同一格施法；先打守火者再處理蛇龍。',line:'門可以倒，守門的火不能熄。'},
  beast_ugal:{title:'暴風獵場',triggers:[turn(2)],mode:'hunter',period:3,cooldown:1,rule:'不召兵。第二次行動展開獵場，優先追擊受傷與施法角色。',counter:'讓前排靠近保護法師，用分散站位減少風暴波及。',line:'門口不需要人群。只要我的爪子。'},
  beast_kulu:{title:'退潮援軍',triggers:[hp(.75)],mode:'tide',period:4,waves:[[minion('crab','潮殼衛兵','guard'),minion('slime','退潮祭司','healer'),minion('slime','潮汐斥候')]],rule:'75% 體力召三種水族：護衛、祭司與斥候，各有不同用途。',counter:'祭司會回復主人；用地屬性範圍技破陣。',line:'潮退的時候，他們也留在岸上。現在，回來。'},
  beast_bash:{title:'毒痕封路',triggers:[],mode:'venom',period:3,hazardEvery:2,hazardCount:2,rule:'不狂暴、不召兵。每兩次行動留下兩處延遲毒痕。',counter:'綠紫色毒痕下一次行動才爆發，不要為貪傷害站著不動。'},
  beast_kusa:{title:'門柱守勢',triggers:[],mode:'guard',period:4,guardEvery:2,rule:'不召兵。每兩次行動補上一層門柱守勢，專門壓制物理硬打。',counter:'守勢只能減免一次物理命中，魔法能繞過。'},
  beast_urid:{title:'狂犬殘命',triggers:[hp(.3)],mode:'rage',period:3,fastPeriod:2,rule:'不召兵。30% 體力才進入殘命追殺，攻擊與速度提高，但防禦降低。',counter:'前段穩住隊伍，殘命時集中火力利用破綻。',line:'……最後一口氣，也要追上你們。'},
  beast_girt:{title:'地底蠍陣',triggers:[turn(3)],mode:'venom',period:3,hazardEvery:3,hazardCount:2,waves:[[minion('centip','地底毒甲')]],rule:'第三次行動只召一名毒甲，蠍陣會標記兩處毒痕。',counter:'先清毒甲騰出走位空間，別站在毒痕等待下一回合。',line:'天上有一個我。地底，還有這一個。'},
  beast_lahm:{title:'守門反制',triggers:[],mode:'guard',period:4,guardEvery:1,rule:'不召兵、不狂暴。每次行動準備一次守門反制，魔法不受見切減傷。',counter:'用魔法攻擊，或先以一次普通攻擊消耗守勢。'},
  beast_umu:{title:'風暴分裂',triggers:[turn(4)],mode:'storm',period:3,hazardEvery:3,hazardCount:2,waves:[[minion('ash','東風碎影','mage'),minion('dryad','西風碎影'),minion('hawk','南風碎影')]],rule:'第四次行動裂成三個不同的風暴碎影；法術型碎影會增幅主人。',counter:'不要拖到碎影展開；出現後優先打掉法術型碎影。',line:'我是一整場風暴。你們只能一次抓住一陣風。'},
  beast_mmah:{title:'七首爭鳴',triggers:[hits(4)],mode:'tide',period:4,waves:[[minion('slime','第一首潮影'),minion('crab','第四首潮影','guard'),minion('slime','第七首潮影','healer')]],rule:'受到四次有效命中後，三個蛇首潮影各自出戰；不是半血觸發。',counter:'連擊會提早叫出潮影；先辨認祭司與護衛。',line:'一個頭要留下。一個頭要出去。最後一個，想活。'},
  beast_ushu:{title:'太古龍息',triggers:[hp(.6)],mode:'dragon',period:3,fastPeriod:2,hazardEvery:3,hazardCount:2,acts:['bx_flare','bx_c_闇'],charge:'bd_dragon',rule:'不召兵。60% 體力展開太古龍息，紅圈與地面的龍息落點交錯施壓。',counter:'不要把全隊擠在龍前，留出能走離紅圈與灼痕的路。',line:'我不用借別人的爪。整片鹹海，都在我喉嚨裡。'},
  beast_kingu:{title:'命運軍陣',triggers:[hp(.75)],mode:'commander',period:3,waves:[[minion('golem','命運盾衛','guard'),minion('ash','泥板軍師','mage')]],rule:'75% 體力召一名盾衛與一名軍師；盾衛減伤、軍師增幅。',counter:'先打軍師降低威脅，再以魔法清盾衛。',line:'盾衛守住泥板。軍師，讀出他們的命運。'},
  babel_beast:{title:'七首末戰',triggers:[hp(.75),hp(.35)],mode:'final',period:3,fastPeriod:2,hazardEvery:2,hazardCount:2,waves:[[minion('salam','火首殘影'),minion('crab','甲首殘影','guard')],[minion('ash','末首殘影','mage')]],rule:'75% 與 35% 體力有兩段轉變，援軍組成不同，末段灼燒區更頻繁。',counter:'每段援軍只來一次，先拆護衛或軍師，再留路閃避七首吐息。',line:'（七個頭不再同時開口。最後一個，開始倒數。）'},
  star_hired:{title:'牧笛疾行',triggers:[turn(2)],mode:'hunter',period:4,rule:'不召兵。第二次行動開始追獵，試煉隊伍的走位。',counter:'保持前後排，不要讓牧笛把你的施法者逼入角落。',line:'羊群散了。讓我看見，你们回家的路。'},
  star_bull:{title:'天牛衝陣',triggers:[hp(.4)],mode:'rage',period:3,fastPeriod:2,rule:'不召兵。40% 體力後衝撞更密集，防禦也會露出破綻。',counter:'橫向走出衝撞直線，在衝撞後反攻。',line:'衝的時候，不回頭。你們呢？'},
  star_twins:{title:'冥門雙影',triggers:[hits(3)],mode:'commander',period:4,waves:[[minion('kensei','冥門左影'),minion('imp','冥門右影','mage')]],rule:'受到三次有效命中後召出兩種冥門之影。',counter:'先清法術影，再決定要用連擊還是大招。',line:'門的兩邊，都要有人。'},
  star_crab:{title:'星殼壁壘',triggers:[],mode:'guard',period:4,guardEvery:2,rule:'不召兵。每兩次行動取得一次星殼守勢。',counter:'魔法穿透星殼，不要只靠物理連砍。'},
  star_lion:{title:'城門獅吼',triggers:[turn(3)],mode:'rage',period:3,rule:'不召兵。第三次行動後進入獅吼決鬥，攻擊較重但防禦鬆開。',counter:'避免貼身圍成一團，等獅吼之後集中反擊。',line:'門外的那一步，敢不敢走？'},
  star_furrow:{title:'犁溝生機',triggers:[hp(.7)],mode:'tide',period:4,waves:[[minion('dryad','犁溝守靈','healer')]],rule:'70% 體力只召一名治療守靈。',counter:'先打守靈，別讓試煉變成消耗戰。',line:'地裡還有一口氣。替我守住它。'},
  star_scales:{title:'天秤見切',triggers:[hits(4)],mode:'guard',period:3,guardEvery:2,rule:'受到四次有效命中後切換審判架勢，不召兵。',counter:'魔法可穿透見切，連擊則會提早觸發審判。',line:'每一擊，都要放到另一邊。'},
  star_scorp:{title:'星毒封路',triggers:[],mode:'venom',period:3,hazardEvery:2,hazardCount:1,rule:'不召兵、不狂暴。以單點毒痕限制走位。',counter:'看清標記，不要讓受傷角色被封在死角。'},
  star_pabil:{title:'射手獵場',triggers:[turn(3)],mode:'hunter',period:3,cooldown:1,rule:'不召兵。第三次行動進入遠距獵場，優先瞄準後排。',counter:'用前排牽制，別讓法師與輔助毫無掩護。',line:'看見的路，不一定走得到。'},
  star_goatfish:{title:'山羊魚雙潮',triggers:[hp(.6)],mode:'tide',period:3,waves:[[minion('slime','魚尾潮靈','healer')]],rule:'60% 體力只召一名潮靈，專注治療主人。',counter:'先打潮靈，再打主體；不要在水波直線上站成一排。',line:'一個想飛。一個，先替我們把傷口補上。'},
  star_great:{title:'天河倒流',triggers:[turn(3)],mode:'storm',period:3,hazardEvery:3,hazardCount:2,rule:'不召兵。第三次行動後開始標記天河落點。',counter:'落點會提前一個魔王回合顯示，先移開再施法。',line:'倒下來的河，也有兩岸。'},
  star_tails:{title:'雙尾纏流',triggers:[hits(5)],mode:'hunter',period:3,rule:'不召兵。受到五次有效命中後，水流開始追擊後排。',counter:'大招與連擊會讓節奏不同，先保護殘血者。',line:'繩子不是用來困住人的。可你們，別把它踩住。'},
 };
 const fallback={title:'獨行試煉',triggers:[],mode:'hunter',period:4,rule:'不召兵，以既有招式與走位決鬥。',counter:'觀察蓄力紅圈與屬性弱點。'};
 const get=u=>profiles[typeof u==='string'?u:u.kind]||fallback;
 function ready(u){if(!u.alive||u.hp<=0||u._bdApplying)return false;const p=get(u),t=p.triggers[u.bossStage||0];return !!t&&((t.hp!=null&&u.hp/u.mhp<=t.hp)||(t.turn!=null&&(u.bossTurns||0)>=t.turn)||(t.hits!=null&&(u.bossHits||0)>=t.hits));}
 const chargeEvery=u=>u.enraged?(get(u).fastPeriod||get(u).period):get(u).period;
 const attackMultiplier=u=>u.enraged?(get(u).mode==='rage'?1.27:1.16):1.12;
 function stats(lv,role){return {hp:Math.round(24+lv*4),mp:0,atk:Math.round(6+lv*.8),def:Math.round(3+lv*.4),mag:Math.round(6+lv*.8),res:Math.round(3+lv*.35),spd:role==='guard'?7:10,mov:role==='guard'?3:4,jump:3};}
 function install(){
  document.documentElement.dataset.bossEdition='20261006-identities1';
  const marks=new Set(),cleanup=arr=>{for(const m of arr||[]){if(m.parent)scene.remove(m);m.geometry.dispose();m.material.dispose();marks.delete(m)}};
  const reset=()=>{cleanup([...marks]);for(const u of units)u._bdHazards=[]};
  const load=loadStageTiles;loadStageTiles=function(...args){reset();return load(...args)};
  Object.assign(SK,{bd_dragon:{nm:'太古龍息',mp:0,kind:'mag',el:'闇',fx:'ultima',tgt:'dir',area:'line',len:7,pow:1.4,desc:'蓄力：一條七格龍息直線，橫向走開可以避過'}});
  for(const [kind,p]of Object.entries(profiles))if(MONS[kind]){
   MONS[kind].tip=(MONS[kind].tip||'').replace(/　【狂暴】[^。]*。/g,'')+'　【'+p.title+'】'+p.rule+'　【破解】'+p.counter;
   for(const [stage,wave]of (p.waves||[]).entries())for(const [i,s]of wave.entries()){
    const base=MONS[s.base];if(!base)throw Error('Missing reinforcement '+s.base);
    const id='bd_'+kind+'_'+stage+'_'+i;s.id=id;
    MONS[id]={...base,boss:0,rare:0,art:base.art||'mon_'+s.base,nm:s.name,el:p.mode==='venom'?'闇':base.el,tip:s.role==='healer'?'祭司：每兩次行動可治療主人，優先打倒。':s.role==='guard'?'護衛：活著時主人減傷，魔法較容易穿過軍陣。':s.role==='mage'?'軍師：活著時主人傷害提高，優先打倒。':'專屬援兵：每段只召一次。'};
    REACT[id]={no:['召喚印記沒有消失，牠不會離開主人。'],almost:['印記還在發光。'],yes:['印記仍然鎖住牠。']};
   }
  }
  for(const s of STAR_DEF)if(['phys','mag'].includes(s.sk.kind)){const id='bd_star_'+s.key;SK[id]={...s.sk,mp:0};const p=profiles['star_'+s.key];if(p)p.acts=[id,'bx_e_'+s.el];}
  const oldKit=bossKit;bossKit=function(u){const old=oldKit(u),p=get(u);return {...old,acts:p.acts||old.acts,charge:p.charge||old.charge,haste:!!p.haste,line:p.line||p.rule};};
  const helpers=(u,role)=>units.filter(a=>a.alive&&a.team==='enemy'&&a.bdOwner===u.id&&(!role||a.bdRole===role));
  async function summon(u,p,stage){
   const wave=p.waves?.[stage]||[];u.bdSummoned=u.bdSummoned||0;if(!wave.length||u.bdSummoned>=4||u.bdWavesDone?.includes(stage))return 0;
   u.bdWavesDone=[...(u.bdWavesDone||[]),stage];
   const spots=[];for(let r=1;r<=4;r++)for(let x=u.x-r;x<=u.x+r;x++)for(let z=u.z-r;z<=u.z+r;z++){
    if(Math.max(Math.abs(x-u.x),Math.abs(z-u.z))!==r)continue;const t=T(x,z),home=T(u.x,u.z);
    if(t&&home&&walkable(t)&&!t.pit&&!t.vortex&&!t.seal&&!t.guard&&!t.bush&&!unitAt(x,z)&&Math.abs(t.h-home.h)<=3)spots.push({x,z});
   }
   let count=0;for(const s of wave){if(!spots.length||u.bdSummoned>=4||units.filter(a=>a.alive&&a.team==='enemy').length>=14)break;const at=spots.shift(),lv=Math.max(1,u.lv-2),m=MONS[s.id];
    const a=makeUnit({team:'enemy',kind:s.id,name:s.name,el:m.el,lv,st:stats(lv,s.role),basic:s.role==='healer'||s.role==='mage'?'hex':m.basic,skills:[],x:at.x,z:at.z,face:u.face.slice(),bdOwner:u.id,bdRole:s.role});
    a.awake=true;a.ct=0;u.bdSummoned++;count++;holyLight(a.pos,ELC[a.el],.7);await wait(120);
   }if(count){toast(p.title+'：援軍 '+count+' 名',2000);renderOrder()}return count;
  }
  bossEnrage=async function(u){
   if(!ready(u))return;const p=get(u),stage=u.bossStage||0,m0=mode;u._bdApplying=true;u.bossStage=stage+1;u.enraged=true;mode='busy';
   try{focusOn(u,1.65);bigText(p.title,ELC[u.el]);sfx('charge');await chargeFx(u,ELC[u.el],360);
    if(stage===0){if(p.mode==='rage'){u.atk=Math.round(u.atk*1.08);u.def=Math.max(1,Math.round(u.def*.8));u.spd+=2}else if(p.mode==='hunter'){u.spd+=2;u.mov=Math.max(u.mov,5)}}
    bgm('boss2');await summon(u,p,stage);const voice=u.kind==='babel_beast'&&stage===1?'（最後一個頭睜開眼睛。其餘六個，把吐息留給了它。）':p.line;if(voice)await say([[u,u.name,voice]]);
   }finally{mode=m0;u._bdApplying=false}
  };
  const oldCalc=calc;calc=function(att,tgt,sk,from){const r=oldCalc(att,tgt,sk,from);
   if(tgt.boss&&tgt.team==='enemy'&&['phys','mag','assassin'].includes(sk.kind)){
    if(helpers(tgt,'guard').length){r.v=Math.max(1,Math.round(r.v*(sk.kind==='phys'?.65:.9)));r.mods?.push('護衛軍陣')}
    if(tgt.bossGuard&&sk.kind==='phys'){r.v=Math.max(1,Math.round(r.v*.55));r.mods?.push('見切')}
   }
   if(att.boss&&sk.kind!=='heal'&&helpers(att,'mage').length){r.v=Math.round(r.v*1.15);r.mods?.push('軍師增幅')}return r;
  };
  const damage=dealDamage;dealDamage=async function(att,tgt,sk){const before=tgt.hp,guard=tgt.bossGuard;const v=await damage(att,tgt,sk);if(tgt.hp<before&&guard&&sk.kind==='phys')tgt.bossGuard=0;return v;};
  const pc=persuadeChance;persuadeChance=function(a,d,...args){return d.bdOwner?0:pc(a,d,...args)};
  function addHazards(u,p,foes){
   const chosen=foes.filter(f=>f.alive).sort((a,b)=>(a.cls==='support'?-3:0)-(b.cls==='support'?-3:0)||a.hp/a.mhp-b.hp/b.mhp).slice(0,p.hazardCount||1),arr=[];
   for(const f of chosen){const t=T(f.x,f.z);if(!t)continue;const color=p.mode==='venom'?'#ba73da':p.mode==='storm'?'#8ecce0':'#ec984a';
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.95,.95),new THREE.MeshBasicMaterial({map:TEX.circle,color,transparent:true,opacity:.85,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(f.x,topY(t)+.055,f.z);m.renderOrder=4;scene.add(m);marks.add(m);arr.push({x:f.x,z:f.z,mesh:m});floatText(f,'標記：移動避開','txt');
   }u._bdHazards=arr;if(arr.length)toast(p.title+'：落點已標記，下一次魔王行動爆發',2800);
  }
  async function resolveHazards(u,p){const arr=u._bdHazards||[];u._bdHazards=[];cleanup(arr.map(a=>a.mesh));
   for(const q of arr){impact(tileCenter(q.x,q.z),p.mode==='venom'?'闇':p.mode==='storm'?'風':'火',.8);for(const f of units.filter(f=>f.alive&&SIDE(f)!==SIDE(u)&&f.x===q.x&&f.z===q.z))await envDamage(f,Math.max(1,Math.round(f.mhp*.12)),p.title)}
  }
  const oldTurn=bossTurn;bossTurn=async function(u,foes){
   const p=get(u);u.bossTurns=(u.bossTurns||0)+1;await resolveHazards(u,p);const live=foes.filter(f=>f.alive);if(!u.alive||!live.length)return;
   if(p.guardEvery&&u.bossTurns%p.guardEvery===0){u.bossGuard=1;floatText(u,'守勢：魔法可穿透','txt')}
   await oldTurn(u,live);
   const hazardPeriod=u.kind==='babel_beast'&&(u.bossStage||0)<2?3:p.hazardEvery;
   if(u.alive&&hazardPeriod&&u.bossTurns%hazardPeriod===0){addHazards(u,p,live)}
  };
  const targets=bossTargets;bossTargets=function(u,sk,from){
   if(get(u).mode!=='hunter')return targets(u,sk,from);let best=null;
   for(const [tx,tz]of validTargets(u,sk,from)){const area=areaTiles(u,sk,tx,tz,from),found=affected(u,sk,area);if(!found.length)continue;let s=0;
    for(const h of found){const r=calc(u,h,sk,from);s+=Math.min(r.v,h.hp)+(r.v>=h.hp?30:0)+8+(h.cls==='support'?18:h.cls==='mage'?12:0)+(h.hp<h.mhp*.4?10:0)}if(!best||s>best.s)best={s,tx,tz,area,n:found.length};
   }return best;
  };
  const ai=aiTurn;aiTurn=async function(u){if(u.bdRole==='healer'&&u.team==='enemy'){const owner=units.find(a=>a.id===u.bdOwner&&a.alive&&a.team==='enemy');u.bdHealTurns=(u.bdHealTurns||0)+1;
    if(owner&&owner.hp<owner.mhp*.95&&u.bdHealTurns%2===1){const heal=Math.min(owner.mhp-owner.hp,Math.max(1,Math.round(owner.mhp*.06)));owner.hp+=heal;drawBar(owner);floatText(owner,'祭司 +'+heal,'heal');await holyLight(owner.pos,ELC.水,.65);return}
   }return ai(u);
  };
  const koBase=ko;ko=async function(u){if(u.boss){cleanup((u._bdHazards||[]).map(a=>a.mesh));u._bdHazards=[]}return koBase(u)};
  const button=document.createElement('button');button.className='btn';button.id='bossRule';button.type='button';button.textContent='王';button.title='魔王機制與破解';button.setAttribute('aria-label','魔王機制與破解');
  button.onclick=()=>{const boss=units.find(u=>u.alive&&u.boss&&u.team==='enemy');if(!boss){toast('進入魔王戰後可查看機制',1500);return}const p=get(boss);openOvl('<h2>'+boss.name+'・'+p.title+'</h2><p>'+p.rule+'</p><div class="sec">破解方式</div><p>'+p.counter+'</p><p class="wsub">轉變次數 '+(boss.bossStage||0)+'・魔王行動 '+(boss.bossTurns||0)+'・有效受擊 '+(boss.bossHits||0)+'</p><button class="btn primary" id="bdClose">關閉</button>');document.querySelector('#bdClose').onclick=closeOvl};document.querySelector('#tools').appendChild(button);
  return {reset,summon,helpers};
 }
 return {profiles,get,ready,chargeEvery,attackMultiplier,stats,install};
});
