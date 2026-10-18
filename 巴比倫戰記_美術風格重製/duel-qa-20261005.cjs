const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'combat-cinematic-20261005'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
for(const f of ['duel-cinema.js','battle-premium.js','destiny-wheel.js'])new vm.Script(fs.readFileSync(path.join(root,f),'utf8'));
const rules=require(path.join(root,'wheel-state.js')),keys=JSON.parse(fs.readFileSync(path.join(__dirname,'天命之輪_卡片美術_20261005/cards.json'),'utf8')).cards.map(c=>c.key.replace(/^evil_/,'beast_'));
assert.equal(keys.length,24);assert.equal(rules.complete(rules.normalize({got:keys},keys),keys),true);assert.equal(rules.canCall(rules.normalize({got:keys},keys),keys,false),false);
assert.ok(html.includes('v.alive = false; later.add(v)'));assert.ok(html.includes('d.hp <= 0 || a.hp <= 0'));assert.ok(html.includes('timers.forEach(clearInterval); cinema.destroy(); box.remove()'));
console.log('PASS scripts parse, auto-card recovery, temple guard, KO deduplication, dead counter guard, scene cleanup');
const counterSource=html.slice(html.indexOf('  function canCounter(d, a)'),html.indexOf('  /* ── 角色圖 ── */'));
const c={MONS:{},SK:{basic:{kind:'phys',rng:[1,1]}},man:()=>1};vm.createContext(c);vm.runInContext(counterSource,c);
const alive={alive:true,hp:20,basic:'basic'};assert.equal(c.canCounter(alive,alive),true);assert.equal(c.canCounter({...alive,hp:0},alive),false);assert.equal(c.canCounter(alive,{...alive,hp:0}),false);assert.equal(c.canCounter({...alive,invuln:true},alive),false);
const wrap=html.slice(html.indexOf('  const _perform = perform;',html.indexOf('戰鬥演出與反擊')),html.indexOf("  if (location.hostname === '127.0.0.1') window.duelQA"));
let koCount=0;const u={alive:true,hp:40,mp:20,team:'hero',cls:null},d={alive:true,hp:10,team:'enemy'},sk={kind:'phys',mp:0};
const ctx={perform:async()=>{},unitAt:()=>d,affected:()=>[d],areaTiles:()=>[],SIDE:x=>x.team,duelOn:true,mpCost:()=>0,faceTo:()=>{},ko:async()=>koCount++,gainExp:()=>{},SK:{},floatText:()=>{},window:{},Math};
ctx.duelScene=async()=>{d.hp=0;await ctx.ko(d);assert.equal(d.alive,false);await ctx.ko(d);return {dealt:[10]}};
vm.createContext(ctx);vm.runInContext(wrap,ctx);ctx.perform(u,sk,1,1).then(()=>{assert.equal(koCount,1);assert.equal(u.acted,true);console.log('PASS executable counter guard + one KO/reward even after duplicate calls')}).catch(e=>{console.error(e);process.exitCode=1});
const qa=`<script>
const qp=document.createElement('nav');qp.id='cinemaQA';qp.style='position:fixed;bottom:0;left:0;right:0;z-index:200;background:#142631;color:white;font:12px sans-serif;padding:4px;display:flex;gap:4px;flex-wrap:wrap';
qp.innerHTML='<button id="qMelee">驗近戰</button><button id="qFire">驗火術</button><button id="qKill">驗擊倒</button><button id="qAll">驗六屬性</button><button id="qHold">定格</button><button id="qHide">收起測試</button><output id="qReport"></output>';
document.body.appendChild(qp);let busy=false;
const report=v=>{const o=document.querySelector('#qReport');if(o)o.textContent=typeof v==='string'?v:JSON.stringify(v)};
async function run(kind){if(busy)return;busy=true;const errors=[];const oldDD=dealDamage;
try{const u=units.find(x=>x.team==='hero'),d=units.find(x=>x.team==='enemy');if(!u||!d)throw Error('先選場景1');
const snap=[u,d].map(x=>({hp:x.hp,mhp:x.mhp,alive:x.alive,x:x.x,z:x.z}));u.x=4;u.z=4;d.x=5;d.z=4;u.hp=u.mhp=999;d.hp=d.mhp=999;u.alive=d.alive=true;
let strikes=0;
dealDamage=async(a,b,s)=>{strikes++;const damage=kind==='kill'?999:35;b.hp=Math.max(0,b.hp-damage);floatText(b,'爆擊 '+damage,'crit');if(!b.hp)b.alive=false;return damage};
let skill=kind==='fire'?Object.values(SK).find(s=>s.kind==='mag'&&(s.el==='火'||s.fxEl==='火')&&s.nm):SK[u.basic];
if(kind==='all'){for(const el of ELS){const s={...skill,nm:el+'之術',kind:'mag',mp:5,el,area:'single',rng:[1,3]};await duelQA.scene(u,d,s,[d]);}}
else {const r=await duelQA.scene(u,d,skill,[d]);if(kind==='kill'&&r.counter)errors.push('dead counter');}
[u,d].forEach((x,i)=>Object.assign(x,snap[i]));report({kind,strikes,errors,duelLeft:document.querySelectorAll('#duel').length,canvasLeft:document.querySelectorAll('.dcinema-fx').length});
}catch(e){report(e.stack);console.error(e)}finally{dealDamage=oldDD;busy=false}}
document.querySelector('#qMelee').onclick=()=>run('melee');document.querySelector('#qFire').onclick=()=>run('fire');document.querySelector('#qKill').onclick=()=>run('kill');document.querySelector('#qAll').onclick=()=>run('all');
document.querySelector('#qHide').onclick=()=>{qp.remove();document.querySelector('#artReview')?.remove()};
document.querySelector('#qHold').onclick=()=>{document.querySelector('#duel')?.getAnimations({subtree:true}).forEach(a=>a.pause());report('定格畫面')};
</script>`;
require('http').createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404).end();return;}const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});if(f.endsWith('index.html')&&u.searchParams.has('cinemaqa'))res.end(fs.readFileSync(f,'utf8').replace('</body>',qa+'</body>'));else fs.createReadStream(f).pipe(res)}).listen(4180,'127.0.0.1',()=>console.log('http://127.0.0.1:4180/?review&cinemaqa'));
