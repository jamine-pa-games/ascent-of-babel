const fs=require('fs'),path=require('path');
const base=__dirname,file=path.join(base,'combat-cinematic-20261005/index.html');
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'); const original=s;
const fixed=fs.readFileSync(path.join(base,'wheel-fix-20261005/index.html'),'utf8').replace(/\r\n/g,'\n');
let chunks=[];
function swap(old,next){if(!s.includes(old))throw Error('Missing '+old.slice(0,100));if(s.indexOf(old)!==s.lastIndexOf(old))throw Error('Ambiguous '+old.slice(0,50));s=s.replace(old,next);chunks.push('@@\n'+old.split('\n').map(l=>'-'+l).join('\n')+'\n'+next.split('\n').map(l=>'+'+l).join('\n'));}
const start=s.indexOf('/* ════════════════ 天命之輪：'),end=s.indexOf('/* ════════════════ 戰鬥演出與反擊');
const ws=fixed.indexOf('/* ════════════════ 天命之輪：'),we=fixed.indexOf('/* ════════════════ 語言：');
swap(s.slice(start,end).trimEnd(),fixed.slice(ws,we).trimEnd());
swap('<script src="manuscript.js?v=20261003"></script>',`<script src="manuscript.js?v=20261003"></script>
<script src="destiny-wheel.js?v=20261005-auto1"></script>
<script src="battle-premium.js?v=20261005-bronze1"></script>
<link rel="stylesheet" href="duel-cinema.css?v=20261005-cinema2">`);
// Rules and cinema load before the inline game. The camera only starts on actual attacks.
const tag=s.indexOf('<script>\n',s.indexOf('</style>'));
swap(s.slice(tag,tag+Math.min(85,s.length-tag)),`<script src="wheel-state.js?v=20261005-auto1"></script>
<script src="duel-cinema.js?v=20261005-cinema2"></script>
`+s.slice(tag,tag+Math.min(85,s.length-tag)));
swap('if (!d.alive || !a.alive || d.invuln) return false;','if (!d.alive || !a.alive || d.hp <= 0 || a.hp <= 0 || d.invuln) return false;');
swap(`box.innerHTML = \`<div class="dbg" style="background-image:\${bg}"></div><div class="dfloor"></div>
      <div class="dtop"><button class="btn sm doff" type="button">演出：開</button></div>
      <div class="darena">\${figHTML(L, 'L')}\${figHTML(R, 'R')}</div>
      <div class="dpans">\${panel(L, 'L', stOf(L))}\${panel(R, 'R', stOf(R))}</div>\`;`, `box.innerHTML = \`<div class="dbg" style="background-image:\${bg}"></div><div class="dfloor"></div>
      <div class="dtop"><div class="dcaption">BABYLON CHRONICLES<b>戰鬥演出</b></div><div class="dcontrols"><button class="btn sm dfast" type="button">加速 ×4</button><button class="btn sm doff" type="button">關閉演出</button></div></div>
      <div class="dcamera"><div class="dplatform"></div><div class="dstage-haze"></div><div class="darena">\${figHTML(L, 'L')}\${figHTML(R, 'R')}</div></div>
      <div class="dpans">\${panel(L, 'L', stOf(L))}\${panel(R, 'R', stOf(R))}</div><div class="dscene-hint">輕觸畫面加速 · 保留原有傷害與技能規則</div>\`;`);
swap('    /* 讓圖照原比例放進框裡（主角的武器位置才對得上） */',`    const cinema = window.DuelCinema.create(box, RM), timers = new Set();
    const every = (fn, ms) => { if (RM) return 0; const id = setInterval(fn, ms); timers.add(id); return id; };
    const stopTimer = id => { clearInterval(id); timers.delete(id); };
    try {
    /* 讓圖照原比例放進框裡（主角的武器位置才對得上） */`);
swap("    box.onclick = e => { if (e.target.closest('.doff')) return; SPD.f = .25; };", "    const accelerate = () => { SPD.f = .25; box.querySelector('.dfast').textContent = '加速中 ×4'; box.setAttribute('data-speed', '4'); };\n    box.onclick = e => { if (e.target.closest('.doff')) return; accelerate(); };\n    box.querySelector('.dfast').onclick = accelerate;");
swap("const flashScr = (c = '#fff3c8', o = .7)","const flashScr = (c = '#fff3c8', o = .14)");
swap("{ background: c }); A(f, [{ opacity: o }","{ background: c }); A(f, [{ opacity: RM ? 0 : Math.min(o, .18) }");
swap("big ? 12 : 6","big ? 5 : 2");swap("big ? 6 : 3","big ? 2 : 1");swap("big ? 9 : 4","big ? 3 : 1");swap("big ? -5 : -2","big ? -2 : -1");
swap('const id = setInterval(() => {\n        const r = img.getBoundingClientRect()', 'const id = every(() => {\n        const r = img.getBoundingClientRect()');
swap('setTimeout(() => clearInterval(id), ms * SPD.f + 20);\n      return () => clearInterval(id);','setTimeout(() => stopTimer(id), ms * SPD.f + 20);\n      return () => stopTimer(id);');
const a0=s.indexOf('    function arcSlash('),a1=s.indexOf('    function claws(',a0);
swap(s.slice(a0,a1).trimEnd(),`    function arcSlash(fd, dir, crit, rot = 0, big = 1, col) { cinema.slash(fd, dir, big * (crit ? 1.1 : 1), rot, col || '#ecd4a5'); }
    function sparks(fd, n, col) { cinema.sparks(fd, n, col || '#ead3a7'); }`);
swap("const id = setInterval(() => { const p = mk('dmote'", "const id = every(() => { const p = mk('dmote'");
swap("}, 50);\n      return () => { clearInterval(id); A(a,", "}, 90);\n      return () => { stopTimer(id); A(a,");
swap("async function elemFx(fd, el, big) {\n      const col", "async function elemFx(fd, el, big) {\n      cinema.element(fd, el, big);\n      const col");
swap("const id = setInterval(() => { const m = orb", "const id = every(() => { const m = orb");
swap("}, 25);\n      await A(orb", "}, 45);\n      await A(orb");swap('clearInterval(id); orb.remove();','stopTimer(id); orb.remove();');
swap('      if (r.crit) flashScr();', '      await cinema.impact(fig(def), dir, r.crit, big);\n      if (r.crit) flashScr();');
swap("      if (label) {", "      cinema.focus(fa, fd);\n      if (label) {");
swap("      if (isRanged(s)) {", "      if (isRanged(s)) {\n        cinema.cast(fa, el);");
swap("        sfx('move');\n        const stop = trail(fa, dir, 360);", "        sfx('move'); cinema.dust(fa);\n        const stop = trail(fa, dir, 280);");
swap("        await A(fa, [{ transform: 'none' }, { transform: `translateX(${dir * gap}px)` }], 360, 'cubic-bezier(.5,0,.7,1)');", "        await A(fa, [{ transform: 'none' }, { transform: `translateX(${dir * gap}px)` }], 280, 'cubic-bezier(.55,.03,.22,1)');");
swap('      await W8(280);\n      if (def.hp', '      cinema.reset();\n      await W8(280);\n      if (def.hp');
swap('    /* 出場 */\n    await A(box', '    /* 出場 */\n    cinema.intro();\n    await A(box');
swap('    box.remove();\n    return res;\n  }\n\n  /* 地圖上的反擊', '    return res;\n    } finally { timers.forEach(clearInterval); cinema.destroy(); box.remove(); }\n  }\n\n  /* 地圖上的反擊');
swap('const later = [], _ko = ko; ko = async v => { later.push(v); };', 'const later = new Set(), _ko = ko; ko = async v => { v.alive = false; later.add(v); };');
swap('try { res = await duelScene(u, prim, sk, hits); } finally { ko = _ko; }\n    for (const v of later) await _ko(v);', 'try { res = await duelScene(u, prim, sk, hits); } finally { ko = _ko; for (const v of later) await _ko(v); }');
// Local-only hooks for real-scene verification. The production server never injects the QA toolbar.
swap('  /* 地圖右上：演出開關（在「？」「♪」下面） */', "  if (location.hostname === '127.0.0.1') window.duelQA = { scene: duelScene, canCounter, setDuel };\n\n  /* 地圖右上：演出開關（在「？」「♪」下面） */");
for(const m of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new(require('vm').Script)(m[1]);
// Emit line-aligned hunks; three matching lines are sufficient anchors in this source.
const a=original.split('\n'),b=s.split('\n');let i=0,j=0,hunks=[],ranges=[];
while(i<a.length||j<b.length){if(a[i]===b[j]){i++;j++;continue;}const i0=i,j0=j;let found=null;
 for(let total=0;total<1200&&!found;total++)for(let di=0;di<=total;di++){const dj=total-di;if(i+di+2<a.length&&j+dj+2<b.length&&a[i+di]===b[j+dj]&&a[i+di+1]===b[j+dj+1]&&a[i+di+2]===b[j+dj+2]){found=[i+di,j+dj];break;}}
 if(found){i=found[0];j=found[1]}else{i=a.length;j=b.length}
 const prev=ranges.at(-1);if(prev&&i0-prev.i<=4){prev.i=i;prev.j=j}else ranges.push({i0,j0,i,j});
}
for(const r of ranges){const before=a.slice(Math.max(0,r.i0-2),r.i0).map(l=>' '+l),after=a.slice(r.i,Math.min(a.length,r.i+2)).map(l=>' '+l);hunks.push('@@\n'+[...before,...a.slice(r.i0,r.i).map(l=>'-'+l),...b.slice(r.j0,r.j).map(l=>'+'+l),...after].join('\n'));}
process.stdout.write(JSON.stringify('*** Begin Patch\n*** Update File: '+file.replace(/\\/g,'/')+'\n'+hunks.join('\n')+'\n*** End Patch'));
