const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, process.argv.includes('--tree') ? 'skill-tree-20261006' : process.argv.includes('--scale') ? 'creature-scale-20261006' : process.argv.includes('--soul') ? 'adventure-soul-20261006' : process.argv.includes('--boss') ? 'combat-boss-director-20261006' : process.argv.includes('--spectacle') ? 'combat-spectacle-20261006' : process.argv.includes('--ultima') ? 'combat-ultima-fix-20261006' : process.argv.includes('--cinema') ? 'combat-cinematic-20261005' : 'wheel-fix-20261005');
const rules = require(path.join(root, 'wheel-state.js'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, '天命之輪_卡片美術_20261005/cards.json'), 'utf8')).cards;
const keys = cards.map(c => c.key.replace(/^evil_/, 'beast_'));
const results = [];
const check = (name, test) => { test(); results.push(name); };
for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
check('24 unique card mappings', () => assert.equal(new Set(keys).size, 24));
check('null and malformed legacy saves', () => { for (const raw of [null, 1, '', {got: 'bad', placed: 24}]) assert.deepEqual(rules.normalize(raw, keys), {got:[],placed:[]}); });
check('duplicates and unknown keys cannot unlock', () => { const c = rules.normalize({got:[...Array(24).fill(keys[0]), 'fake'], placed:keys}, keys); assert.equal(c.placed.length,1); assert.equal(rules.complete(c, keys),false); });
check('legacy owned cards auto-place', () => { const c = rules.normalize({got:keys.slice(0,3),placed:[]},keys); assert.deepEqual(c.placed,keys.slice(0,3)); });
check('cleared bosses restore missing rewards', () => { const c=rules.normalize(null,keys,keys.slice(3,5)); assert.equal(c.placed.length,2); });
check('repeated awards are idempotent', () => { const c=rules.normalize({got:[...keys, ...keys]},keys); assert.equal(c.got.length,24); assert.equal(c.placed.length,24); });
check('24 valid cards and Odin are both required', () => { const c=rules.normalize({got:keys},keys); assert.equal(rules.canCall(c,keys,false),false); assert.equal(rules.canCall(c,keys,true),true); assert.equal(rules.canCall(rules.normalize({got:keys.slice(1)},keys),keys,true),false); });
check('placed-only invalid ownership does not grant cards', () => assert.equal(rules.normalize({placed:keys},keys).got.length,0));
check('Kingu is dark element', () => assert.equal(cards.find(c=>c.key==='evil_kingu').element,'闇'));
// Execute the actual reward wrapper, with combat/UI dependencies isolated.
const reward = html.slice(html.indexOf('const _resCard = showResult;'), html.indexOf('document.head.insertAdjacentHTML', html.indexOf('const _resCard = showResult;')));
const n={inst:'star',def:{key:keys[0].slice(5),nm:'測試星宿'}};
const context={showResult(){}, G:{node:n}, document:{querySelectorAll:()=>[],querySelector:()=>null}, CARDS:{got:[],placed:[]}, cardKey:n=>'star_'+n.def.key, wheelDone:()=>false, saveCards(){Object.assign(context.CARDS,rules.normalize(context.CARDS,keys))}};
vm.createContext(context); vm.runInContext(reward,context);
check('actual victory immediately owns AND places before animation', () => {context.showResult(true);assert.equal(context.CARDS.placed.length,1)});
check('actual repeated victory does not duplicate', () => {context.showResult(true);assert.equal(context.CARDS.placed.length,1)});
check('defeat never grants a card', () => {context.G.node={inst:'star',def:{key:keys[1].slice(5),nm:'test'}};context.showResult(false);assert.equal(context.CARDS.placed.length,1)});
check('24 art files + card back exist', () => { for(const c of cards) assert.ok(fs.existsSync(path.join(root,'art/cards',path.basename(c.webp))));assert.ok(fs.existsSync(path.join(root,'art/cards/card_back.webp'))); });
console.log(JSON.stringify({passed:results.length,results},null,2));

if (process.argv.includes('--serve')) {
 const qa = `<script>if(location.hostname==='127.0.0.1'){
 const panel=document.createElement('div');panel.id='qa';panel.style='position:fixed;bottom:0;left:0;z-index:9999;background:#fff;color:#111;padding:4px;max-width:100%;font:12px sans-serif';
 panel.innerHTML='<button id="qaEmpty">QA empty</button><button id="qaFirst">QA first card</button><button id="qaAll">QA 24 no Odin</button><button id="qaOdin">QA Odin</button><button id="qaWheel">QA wheel</button><button id="qaSlash">QA slash</button><button id="qaCast">QA cast</button><button id="qaReport">QA report</button><button id="qaHide">QA hide</button><output id="qaOutput"></output>';
 document.body.appendChild(panel);
 document.querySelector('#qaEmpty').onclick=()=>{CARDS.got=[];saveCards();CLEARED.clear();LSset('babylon-temple-v1',false);openWheel()};
 document.querySelector('#qaFirst').onclick=()=>{const n=STAR_NODES()[0];CARDS.got.push(cardKey(n));saveCards();openWheel();cardCeremony(n)};
 document.querySelector('#qaAll').onclick=()=>{CARDS.got=CARD_KEYS();saveCards();CLEARED.delete('6-王');openWheel()};
 document.querySelector('#qaOdin').onclick=()=>{CLEARED.add('6-王');openWheel()};
 document.querySelector('#qaWheel').onclick=openWheel;
 document.querySelector('#qaHide').onclick=()=>panel.remove();
 document.querySelector('#qaSlash').onclick=async()=>{const u=units.find(u=>u.team==='hero');if(u){const p=up(u.pos,.1).add(new THREE.Vector3(1,0,0));await lunge(u,u.x+1,u.z);await slashFx(u,p,'#ead9ae',1.7);await hitStop(80)}};
 document.querySelector('#qaCast').onclick=async()=>{const u=units.find(u=>u.team==='hero');if(u)await castPose(u,ELC.光)};
 document.querySelector('#qaReport').onclick=()=>document.querySelector('#qaOutput').textContent=JSON.stringify({slots:CARDS.placed.length,temple:nodeOpen(NODES.find(n=>n.id==='8-0')),palace:nodeOpen(NODES.find(n=>n.id==='8-1')),particles:vparts.length,tweens:anims.length,pose:units.filter(u=>u.team==='hero').map(u=>({off:u.off.toArray(),hop:u.hop,scale:u.poseScale}))});
}</script>`;
 const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
 require('node:http').createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');const f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  if(path.extname(f)==='.html'&&u.searchParams.has('qa'))res.end(fs.readFileSync(f,'utf8').replace('</body>',qa+'</body>'));else fs.createReadStream(f).pipe(res);
 }).listen(4179,'127.0.0.1',()=>console.log('QA http://127.0.0.1:4179/?qa'));
}
