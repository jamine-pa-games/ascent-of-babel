const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,process.argv.includes('--tree')?'skill-tree-20261006':process.argv.includes('--scale')?'creature-scale-20261006':process.argv.includes('--soul')?'adventure-soul-20261006':process.argv.includes('--boss')?'combat-boss-director-20261006':process.argv.includes('--spectacle')?'combat-spectacle-20261006':'combat-ultima-fix-20261006'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const old=fs.readFileSync(path.join(__dirname,'combat-cinematic-20261005/index.html'),'utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
for(const f of ['duel-cinema.js','battle-premium.js','destiny-wheel.js'])new vm.Script(fs.readFileSync(path.join(root,f),'utf8'));
const damageBlock=s=>s.slice(s.indexOf('const _ddB = dealDamage;'),s.indexOf('/* 被打倒時把紅圈收掉'));
const performBlock=s=>s.slice(s.indexOf('  const _perform = perform;',s.indexOf('戰鬥演出與反擊')),s.indexOf("  if (location.hostname === '127.0.0.1') window.duelQA"));
async function fixture(source,{damage=40,extra=false,kill=false,duel=true}={}){
 const u={alive:true,hp:50,mhp:50,mp:100,team:'hero',cls:null},d={alive:true,hp:60,mhp:100,boss:true,team:'enemy'},e={...d};
 let open=false,dialogues=0,kos=0;
 const c={perform:async()=>{},unitAt:()=>d,affected:()=>extra?[d,e]:[d],areaTiles:()=>[],SIDE:x=>x.team,duelOn:duel,mpCost:()=>24,faceTo:()=>{},ko:async x=>{x.alive=false;kos++},gainExp:()=>{},SK:{},floatText:()=>{},window:{},Math,G:{phase:'battle'},wait:async()=>{}};
 c.dealDamage=async(a,b)=>{if(!b.alive)return 0;b.hp=Math.max(0,b.hp-(kill?100:damage));if(!b.hp)await c.ko(b);return damage};
 c.bossEnrage=async b=>{dialogues++;if(open)return new Promise(()=>{});b.enraged=true};
 c.duelScene=async()=>{open=true;const list=extra?[d,e]:[d];const dealt=await Promise.all(list.map(b=>c.dealDamage(u,b)));if(extra)await c.dealDamage(u,d);open=false;return {dealt}};
 vm.createContext(c);vm.runInContext(damageBlock(source),c);vm.runInContext(performBlock(source),c);
 const task=c.perform(u,{kind:'mag',mp:24,fx:'ultima'},0,0);
 const result=await Promise.race([task.then(()=>true),new Promise(r=>setTimeout(()=>r(false),60))]);
 return {result,u,d,e,dialogues,kos,open};
}
(async()=>{
 assert.equal((await fixture(old)).result,false,'old code reproduces hidden-dialog wait');
 let r=await fixture(html);assert.equal(r.result,true);assert.equal(r.open,false);assert.equal(r.dialogues,1);assert.equal(r.d.enraged,true);assert.equal(r.u.mp,76);assert.equal(r.u.acted,true);
 r=await fixture(html,{damage:5});assert.equal(r.dialogues,0);
 r=await fixture(html,{kill:true});assert.equal(r.dialogues,0);assert.equal(r.kos,1);
 r=await fixture(html,{damage:15,extra:true});assert.equal(r.dialogues,2);assert.ok(r.d.enraged&&r.e.enraged);
 // Non-cinematic damage still uses its original immediate enrage path.
 const c={window:{},dealDamage:async()=>20,G:{phase:'battle'},wait:async()=>{},bossEnrage:async d=>{d.enraged=true}};vm.createContext(c);vm.runInContext(damageBlock(html),c);const b={hp:20,mhp:100,alive:true,boss:true,team:'enemy'};await c.dealDamage({},b,{});assert.equal(b.enraged,true);
 console.log('PASS: old deadlock reproduced; threshold spell completes; no early enrage; KO skips enrage; multiple bosses deduplicated; MP once; actor turn completes; non-duel path preserved');
})().catch(e=>{console.error(e);process.exitCode=1});

const qa=`<script>
artReady.then(()=>{
 const panel=document.createElement('nav');panel.id='ultimaQA';panel.style='position:fixed;bottom:0;left:0;right:0;z-index:200;background:#142631;color:white;padding:5px;font:12px sans-serif';
 panel.innerHTML='<button id="uqLoad">載入同一魔王</button><button id="uqThreshold">究極跨半血</button><button id="uqRepeat">再次究極</button><button id="uqKill">究極擊倒</button><button id="uqHide">收起測試</button><output id="uqReport"></output>';
 document.body.appendChild(panel);let busy=false,u,b;
 const report=t=>{const el=document.querySelector('#uqReport');if(el)el.textContent=typeof t==='string'?t:JSON.stringify(t)};
 document.querySelector('#uqLoad').onclick=()=>{
  setup.picks=[{cls:'warrior',name:'小星',col:5,el:'水',lead:true},{cls:'support',name:'艾莉',el:'光',col:1,sex:'f'}];
  for(const cls of ['warrior','support'])ROSTER[cls]={lv:15,exp:0,adv:true,learned:['ultima']};
  curNode=NODES.find(n=>n.inst==='beast'&&n.def.key==='ushu');buildBattle();chooseZone(ZONES[0]);
  G.phase='battle';mode='busy';$('#deploy').hidden=true;$('#bottom').hidden=true;
  u=units.find(x=>x.cls==='support');b=units.find(x=>x.boss);
  const spots=[];for(let x=0;x<W;x++)for(let z=0;z<D;z++)if(walkable(T(x,z))&&man({x,z},b)===4&&!unitAt(x,z))spots.push({x,z});
  Object.assign(u,spots[0]);u.pos.copy(tileCenter(u.x,u.z));u.grp.visible=true;u.mp=u.mmp=100;u.mag=30;drawBar(u);
  let n=0;while(calc(u,b,SK.ultima).v>b.mhp*.32&&n++<60)u.mag--;
  report({ready:true,boss:b.name,mhp:b.mhp,damage:calc(u,b,SK.ultima).v});
 };
 async function run(kind){if(busy||!u)return;busy=true;const baseCalc=calc;
 try{if(kind==='threshold'){b.enraged=false;b.hp=Math.ceil(b.mhp*.55)}if(kind==='kill'){b.hp=1;b.alive=true}u.mp=100;u.acted=false;
  calc=(...args)=>({...baseCalc(...args),hit:100,crit:0});duelQA.setDuel(true);report('實際究極施放中');
  const before=b.hp;await perform(u,SK.ultima,b.x,b.z);
  report({complete:true,kind,before,hp:b.hp,enraged:!!b.enraged,alive:b.alive,mp:u.mp,acted:u.acted,duelLeft:document.querySelectorAll('#duel').length,canvasLeft:document.querySelectorAll('.dcinema-fx').length});
 }catch(e){report(e.stack);console.error(e)}finally{calc=baseCalc;busy=false}}
 document.querySelector('#uqThreshold').onclick=()=>run('threshold');document.querySelector('#uqRepeat').onclick=()=>run('repeat');document.querySelector('#uqKill').onclick=()=>run('kill');
 document.querySelector('#uqHide').onclick=()=>panel.style.display='none';
});
</script>`;
const fxQA=`<script>artReady.then(()=>{
 const p=document.createElement('nav');p.id='fxQA';p.style='position:fixed;top:90px;left:5px;z-index:220;background:#142631;color:white;font:12px sans-serif;padding:5px';
 p.innerHTML='<button id="fqHero">角色三大招</button><button id="fqBoss">魔王六攻擊</button><button id="fqPhoto">光球預覽</button><button id="fqBossPhoto">魔王業火預覽</button><button id="fqHide">收起特效測試</button><output id="fqReport"></output>';document.body.appendChild(p);let busy=false;
 const out=t=>document.querySelector('#fqReport').textContent=JSON.stringify(t);
 if(new URLSearchParams(location.search).has('fxphoto')){const draw=SpellSpectacle.draw;SpellSpectacle.draw=(x,q,t)=>{q.age=q.life*.44;draw(x,q,.44)}}
 async function play(boss,keys){if(busy)return;busy=true;const native=dealDamage;
 try{const u=units.find(x=>x.cls==='support'),b=units.find(x=>x.boss);if(!u||!b)throw Error('先載入魔王');const a=boss?b:u,d=boss?u:b;const snap=[a,d].map(x=>({hp:x.hp,mhp:x.mhp,alive:x.alive}));a.hp=a.mhp=d.hp=d.mhp=999;a.alive=d.alive=true;
  dealDamage=async(att,def)=>{def.hp-=30;floatText(def,'30','');return 30};
  for(const k of keys)await duelQA.scene(a,d,SK[k],[d]);[a,d].forEach((x,i)=>Object.assign(x,snap[i]));out({complete:true,boss,skills:keys,duelLeft:document.querySelectorAll('#duel').length,canvasLeft:document.querySelectorAll('.dcinema-fx').length});
 }catch(e){out({error:e.stack});console.error(e)}finally{dealDamage=native;busy=false}}
 document.querySelector('#fqHero').onclick=()=>play(false,['ultima','rain','ninpo'].map(k=>SK[k]?k:k==='rain'?'bx_rain':'bx_ninpo'));
 document.querySelector('#fqBoss').onclick=()=>play(true,['claw','bx_kiln','bx_zero','bx_c_闇','bx_chain','bx_fissure']);
 document.querySelector('#fqPhoto').onclick=()=>play(false,['ultima']);document.querySelector('#fqBossPhoto').onclick=()=>play(true,['bx_kiln']);
 document.querySelector('#fqHide').onclick=()=>p.style.display='none';
});</script>`;
const bossQA=`<script>artReady.then(()=>{
 const panel=document.createElement('nav');panel.id='bossQA';panel.style='position:fixed;top:84px;left:0;right:0;max-height:230px;overflow:auto;z-index:220;background:#142631;color:white;padding:5px;font:12px sans-serif';
 panel.innerHTML='<select id="bqKind" aria-label="測試魔王">'+Object.keys(BossDirector.profiles).filter(k=>MONS[k]).map(k=>'<option value="'+k+'">'+MONS[k].nm+'</option>').join('')+'</select><button id="bqLoad">載入魔王</button><button id="bqPhase">觸發專屬階段</button><button id="bqRound">魔王行動一次</button><button id="bqHeal">祭司行動</button><button id="bqKill">清除護衛</button><button id="bqRepeat">再次觸發檢查</button><button id="bqReport">機制狀態</button><button id="bqHide">收起測試</button><output id="bqOutput"></output>';document.body.appendChild(panel);let boss,busy=false;
 const report=(extra={})=>{document.querySelector('#bqOutput').textContent=JSON.stringify({boss:boss?.name,stage:boss?.bossStage||0,hp:boss?.hp,turns:boss?.bossTurns||0,hits:boss?.bossHits||0,summoned:boss?.bdSummoned||0,army:units.filter(a=>a.alive&&a.bdOwner===boss?.id).map(a=>({name:a.name,role:a.bdRole,hp:a.hp})),hazards:boss?boss._bdHazards?.length||0:0,duelLeft:document.querySelectorAll('#duel').length,...extra})};
 document.querySelector('#bqLoad').onclick=()=>{const kind=document.querySelector('#bqKind').value,n=NODES.find(n=>n.inst&&(n.inst==='star'?'star_':'beast_')+n.def.key===kind)||NODES.find(n=>n.boss&&stageOf(n).boss===kind);if(!n){report({error:'missing node'});return}
  const lv=Math.max(3,MONS[kind].lv);setup.picks=[{cls:'warrior',name:'小星',col:5,el:'水',lead:true},{cls:'mage',name:'米菈',col:4,el:'火',sex:'f'},{cls:'support',name:'艾莉',col:1,el:'光',sex:'f'}];for(const cls of ['warrior','mage','support'])ROSTER[cls]={lv,exp:0,adv:lv>=5,learned:['ultima']};
  curNode=n;buildBattle();chooseZone(ZONES[0]);G.phase='battle';mode='busy';$('#deploy').hidden=true;$('#bottom').hidden=true;boss=units.find(a=>a.boss);boss.awake=true;
  const spots=[];for(let x=0;x<W;x++)for(let z=0;z<D;z++)if(walkable(T(x,z))&&man({x,z},boss)>=3&&man({x,z},boss)<=5&&!unitAt(x,z))spots.push({x,z});
  for(const a of units.filter(a=>a.team==='hero')){const at=spots.shift();if(at){Object.assign(a,at);a.pos.copy(tileCenter(a.x,a.z));a.grp.visible=true;a.mp=a.mmp=100;drawBar(a)}}report();
 };
 const run=async(fn)=>{if(busy||!boss)return;busy=true;try{await fn();report({complete:true})}catch(e){report({error:e.stack});console.error(e)}finally{busy=false}};
 document.querySelector('#bqPhase').onclick=()=>run(async()=>{const t=BossDirector.get(boss).triggers[boss.bossStage||0];if(t){if(t.hp)boss.hp=Math.floor(boss.mhp*t.hp);if(t.turn)boss.bossTurns=t.turn;if(t.hits)boss.bossHits=t.hits;drawBar(boss)}await bossEnrage(boss)});
 document.querySelector('#bqRound').onclick=()=>run(()=>bossTurn(boss,units.filter(a=>a.alive&&SIDE(a)!==SIDE(boss))));
 document.querySelector('#bqHeal').onclick=()=>run(async()=>{for(const a of units.filter(a=>a.alive&&a.bdOwner===boss.id&&a.bdRole==='healer'))await aiTurn(a)});
 document.querySelector('#bqKill').onclick=()=>run(async()=>{for(const a of units.filter(a=>a.alive&&a.bdOwner===boss.id&&a.bdRole==='guard')){a.hp=0;await ko(a)}});
 document.querySelector('#bqRepeat').onclick=()=>run(()=>bossEnrage(boss));document.querySelector('#bqReport').onclick=()=>report();document.querySelector('#bqHide').onclick=()=>panel.style.display='none';
});</script>`;
if(process.argv.includes('--serve'))require('http').createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404).end();return;}
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
 res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
 if(f.endsWith('index.html')&&url.searchParams.has('ultimaqa')){
  let doc=fs.readFileSync(f,'utf8');
  // Local photographic fixture only. The published game has no pause injection.
  if(url.searchParams.has('ratio'))doc=doc.replace('    await W8(150);','    await W8(150); await new Promise(() => {});');
  if(url.searchParams.has('quick'))doc=doc.replace('    SPD.f = 1;','    SPD.f = .25;');
  if(url.searchParams.has('fxphoto'))doc=doc.replace('const duration = cinema.element(fd, el, big, skill);','const duration = cinema.element(fd, el, big, skill); await new Promise(() => {});');
  res.end(doc.replace('</body>',qa+(process.argv.includes('--spectacle')?fxQA:'')+(process.argv.includes('--boss')?bossQA:'')+'</body>'));
 }else fs.createReadStream(f).pipe(res);
}).listen(process.argv.includes('--boss')?4183:process.argv.includes('--spectacle')?4182:4181,'127.0.0.1',()=>console.log('QA server ready'));
