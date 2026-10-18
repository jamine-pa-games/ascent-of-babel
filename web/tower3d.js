/* ═══ 通天之塔 3D 畫面層 ═══════════════════════════════════════
   遊戲規則一行都不動：回合、移動、戰鬥、視野全部還是原本那套。
   這一層每一幀讀遊戲狀態（G.f 地圖、G.seen 視野、G.p 主角、G.mons 怪物、
   G.items 道具、G.floats 飄字、G.parts 粒子），在 3D 裡重畫一次。

   怪物：models/manifest.json 裡有 Tripo 模型的就用 3D 模型，
         沒有的用原本的像素圖當立牌，所以模型可以一隻一隻慢慢加。
   切換：畫面右下角的「2D／3D」，或網址加 ?3d=0 / ?3d=1。 */
(function () {
  'use strict';
  if (!window.THREE) return;
  const $ = id => document.getElementById(id);
  const game = $('game'), wrap = $('screenwrap');
  if (!game || !wrap) return;

  const TW = window.Tower3D = { on: true, manifest: {}, failed: {} };
  try {
    const q = new URLSearchParams(location.search).get('3d');
    if (q === '0') TW.on = false;
    else if (q !== '1' && localStorage.getItem('tower-3d') === 'off') TW.on = false;
  } catch (e) { }

  /* ── 版面：3D 畫布疊在原本的像素畫布上，大小完全一樣 ── */
  const css = document.createElement('style');
  css.textContent = `
#game3d{position:absolute;left:0;top:0;width:100%;display:none;pointer-events:none}
body.t3d #game3d{display:block}
body.t3d #game{opacity:0}
body.t3d #tags{display:none}
#t3dBtn{position:absolute;left:8px;top:8px;z-index:6;line-height:1;font:600 12px/1 ui-monospace,monospace;
  letter-spacing:.06em;color:#f2e6cf;background:rgba(18,14,10,.72);border:1px solid rgba(201,151,63,.7);
  border-radius:6px;padding:6px 8px;cursor:pointer}
#t3dBtn:focus-visible{outline:2px solid #c9973f;outline-offset:2px}`;
  document.head.appendChild(css);
  const cvs = document.createElement('canvas'); cvs.id = 'game3d';
  game.after(cvs);
  const btn = document.createElement('button'); btn.id = 't3dBtn'; btn.type = 'button';
  wrap.appendChild(btn);
  const label = () => { btn.textContent = TW.on ? '2D' : '3D'; btn.title = TW.on ? '切回像素 2D' : '切換成 3D'; };
  label();
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', e => { e.stopPropagation(); TW.toggle(); btn.blur(); });

  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1.4, .1, 80);
  const hemi = new THREE.HemisphereLight(0xb8c0e0, 0x3a2c20, .45); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 0); sun.position.set(-4, 10, 6); scene.add(sun); scene.add(sun.target);
  const torch = new THREE.PointLight(0xffb066, 2.2, 11, 1.4); scene.add(torch);

  /* ── 貼圖：原本的像素圖直接拿來當 3D 的材質，保留通天之塔的手感 ── */
  const texCache = new WeakMap();
  function tex(cv) {
    if (!cv) return null;
    let t = texCache.get(cv);
    if (!t) {
      t = new THREE.CanvasTexture(cv);
      const hd = (cv.width || cv.naturalWidth || 0) > 64;
      t.magFilter = hd ? THREE.LinearFilter : THREE.NearestFilter;
      t.minFilter = hd ? THREE.LinearFilter : THREE.NearestFilter;
      t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
      texCache.set(cv, t);
    }
    return t;
  }
  const colCache = {};
  const colorOf = s => colCache[s] || (colCache[s] = new THREE.Color(s));

  /* ── 地圖 ─────────────────────────────────────────────── */
  let world = null, builtF = null, builtTheme = null, fogOut = false;
  const WALL_H = 1.15, FLOOR_H = .18;
  const BG = { sky: 0x9ec3e6, water: 0x2d5f7c, cloud: 0xc8cfe0, void: 0x0c0a14 };
  const _m = new THREE.Matrix4(), _c = new THREE.Color(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);

  function dispose(o) {
    o.traverse(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose());
    });
  }

  function buildFloor() {
    if (world) { scene.remove(world.group); dispose(world.group); }
    const theme = themeNow(), th = THEMES[theme] || {};
    const TS = tilesFor(theme);
    const g = new THREE.Group();
    const lists = new Map();            // texture canvas → [{k,x,y,h}]
    const add = (cv, k, x, y, kind) => { if (!lists.has(cv)) lists.set(cv, { kind, items: [] }); lists.get(cv).items.push({ k, x, y }); };
    const walk = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && G.f.t[key(x, y)] !== WALL;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const k = key(x, y), t = G.f.t[k];
      if (t === WALL) {
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && walk(x + dx, y + dy)) { edge = true; break; }
        if (edge) add('wall', k, x, y, 'wall');
      } else if (t === DOWN || (G.f.stairs && G.f.stairs.x === x && G.f.stairs.y === y)) {
        add(TILE_ART.stairs, k, x, y, 'stairs');
      } else if (t === CORR) {
        add(TS.corr[(x * 7 + y * 13) % TS.corr.length], k, x, y, 'floor');
      } else {
        add(TS.floor[(x * 7 + y * 13) % TS.floor.length], k, x, y, 'floor');
      }
    }
    const meshes = [];
    const floorGeo = new THREE.BoxGeometry(1, FLOOR_H, 1);
    const wallGeo = new THREE.BoxGeometry(1, WALL_H, 1);
    for (const [cv, L] of lists) {
      let mesh;
      if (L.kind === 'wall') {
        const side = new THREE.MeshLambertMaterial({ map: tex(TS.wallFace) });
        const top = new THREE.MeshLambertMaterial({ map: tex(TS.wall) });
        mesh = new THREE.InstancedMesh(wallGeo, [side, side, top, top, side, side], L.items.length);
      } else {
        const mat = new THREE.MeshLambertMaterial({ map: tex(cv) });
        if (L.kind === 'stairs') { mat.emissive = new THREE.Color(0x3a2a10); mat.emissiveMap = mat.map; }
        mesh = new THREE.InstancedMesh(floorGeo, mat, L.items.length);
      }
      const yOff = L.kind === 'wall' ? WALL_H / 2 : -FLOOR_H / 2;
      L.items.forEach((it, i) => { _m.makeTranslation(it.x + .5, yOff, it.y + .5); mesh.setMatrixAt(i, _m); mesh.setColorAt(i, _c.setScalar(0)); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData = { items: L.items, yOff, seen: new Int8Array(L.items.length).fill(-1) };
      g.add(mesh); meshes.push(mesh);
    }
    // 樓梯：一道往上的暖光，遠遠就知道出口在哪
    const st = G.f.stairs;
    let beacon = null;
    if (st) {
      const bc = document.createElement('canvas'); bc.width = 16; bc.height = 64;
      const bx = bc.getContext('2d'), gr = bx.createLinearGradient(0, 64, 0, 0);
      gr.addColorStop(0, 'rgba(245,210,122,.85)'); gr.addColorStop(1, 'rgba(245,210,122,0)');
      bx.fillStyle = gr; bx.fillRect(0, 0, 16, 64);
      beacon = new THREE.Mesh(new THREE.PlaneGeometry(.7, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      beacon.position.set(st.x + .5, 1.2, st.y + .5); beacon.visible = false; g.add(beacon);
    }
    scene.add(g);
    const bg = new THREE.Color(BG[th.back] || 0x0b0a0d);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 10, 20); fogOut = !!th.back;
    hemi.intensity = th.lightAll ? .95 : .62;
    sun.intensity = th.lightAll ? .8 : 0;
    world = { group: g, meshes, beacon, st };
    builtF = G.f; builtTheme = theme;
  }

  // 視野：沒看過的格子不畫，看過但不在視線內的變暗，看得到的全亮
  function updateFog() {
    for (const mesh of world.meshes) {
      const ud = mesh.userData;
      let dirty = false;
      for (let i = 0; i < ud.items.length; i++) {
        const it = ud.items[i];
        let s = G.seen[it.k] | 0;
        if (s === 0 && mesh.material.length) {        // 牆：旁邊有看過的地板就讓牆一起出現
          for (let dy = -1; dy <= 1 && !s; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x = it.x + dx, y = it.y + dy;
            if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
            const v = G.seen[key(x, y)] | 0; if (v > s) s = v;
          }
        }
        if (ud.seen[i] === s) continue;
        ud.seen[i] = s; dirty = true;
        if (s === 0) mesh.setMatrixAt(i, _zero);
        else { _m.makeTranslation(it.x + .5, ud.yOff, it.y + .5); mesh.setMatrixAt(i, _m); }
        mesh.setColorAt(i, _c.setScalar(s === 2 ? 1 : .34));
      }
      if (dirty) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    }
    if (world.beacon) world.beacon.visible = (G.seen[key(world.st.x, world.st.y)] | 0) > 0;
  }

  /* ── 角色 ─────────────────────────────────────────────── */
  function newSprite(cv, size) {
    const mat = new THREE.SpriteMaterial({ map: tex(cv), alphaTest: .4 });
    const sp = new THREE.Sprite(mat);
    sp.center.set(.5, .06); sp.scale.set(size, size, 1);
    return sp;
  }
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  function newShadow(s) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.9 * s, .9 * s), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = .01; return m;
  }

  const ents = new Map();               // 遊戲物件 → 3D 物件
  function entPos3(o) {
    let x = o.x, y = o.y;
    const a = G.anim && G.anim.find(v => v.o === o);
    if (a) { const k = 1 - Math.min(1, a.t / (a.dur || .11)); x = o.x + (a.fx - o.x) * k; y = o.y + (a.fy - o.y) * k; }
    if (o.lunge) { const k = Math.sin(Math.min(1, o.lunge.t / (o.lunge.dur || .19)) * Math.PI); x += o.lunge.dx * k * .32; y += o.lunge.dy * k * .32; }
    return [x, y];
  }

  function makeEnt(o, isHero) {
    const boss = !!(o.d && (o.d.boss || o.d.visualBoss));
    const size = boss ? 2.1 : 1.12;
    const grp = new THREE.Group();
    const e = { grp, boss, size, sprite: null, cvNow: null, model: null, last: new THREE.Vector2(o.x, o.y), moveT: 0, face: 0, isHero };
    grp.add(newShadow(boss ? 1.8 : 1));
    if (isHero) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(.36, .44, 32), new THREE.MeshBasicMaterial({ color: 0xc9973f, transparent: true, opacity: .8, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .02; grp.add(ring);
    }
    scene.add(grp);
    ents.set(o, e);
    const mid = isHero ? heroModelKey() : (o.d && o.d.id);
    if (mid && TW.manifest[mid] && !TW.failed[mid]) { e.modelKey = mid; loadModel(mid).then(a => attachModel(e, mid, a), () => { }); }
    return e;
  }

  // 主角的 Tripo 模型依外型（村莊裡選的 blob／biped／cat…）分開登記，例如 hero-blob
  function heroModelKey() { try { return 'hero-' + (VILLAGE.skin || 'blob'); } catch (err) { return 'hero-blob'; } }

  function spriteFor(e, cv) {
    if (e.model) return;
    if (!e.sprite) { e.sprite = newSprite(cv, e.size); e.grp.add(e.sprite); e.cvNow = cv; }
    else if (e.cvNow !== cv) { e.sprite.material.map = tex(cv); e.sprite.material.needsUpdate = true; e.cvNow = cv; }
    const w = cv.width || cv.naturalWidth || 1, h = cv.height || cv.naturalHeight || 1;
    e.sprite.scale.set(e.size * Math.min(1.6, w / h), e.size, 1);
  }

  /* ── Tripo 模型 ───────────────────────────────────────── */
  const gltf = THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
  const cloneS = (THREE.SkeletonUtils && THREE.SkeletonUtils.clone) || (o => o.clone(true));
  const modelCache = {};
  const ROLE_RE = { idle: /idle|stand|breath/i, walk: /walk|run|march|move/i, attack: /slash|attack|strike|shoot/i, hurt: /hurt|damage|react/i };
  function loadModel(id) {
    if (!gltf) return Promise.reject();
    if (modelCache[id]) return modelCache[id];
    const ent = TW.manifest[id];
    return modelCache[id] = new Promise((res, rej) => gltf.load('models/' + ent.file, g => {
      g.scene.traverse(n => {
        if (!n.isMesh) return;
        n.frustumCulled = false;
        (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => {
          if ('metalness' in m) m.metalness = Math.min(m.metalness, .25);
          if ('roughness' in m) m.roughness = Math.max(m.roughness, .55);
        });
      });
      res({ scene: g.scene, clips: g.animations || [], box: new THREE.Box3().setFromObject(g.scene) });
    }, undefined, err => { TW.failed[id] = String(err && err.message || err); console.warn('[Tower3D] 模型載入失敗', id, err); rej(err); }));
  }
  function attachModel(e, id, a) {
    const ent = TW.manifest[id];
    const inner = cloneS(a.scene), size = new THREE.Vector3(), ctr = new THREE.Vector3();
    a.box.getSize(size); a.box.getCenter(ctr);
    const s = (e.boss ? 1.9 : 1) * (ent.h || .95) / Math.max(size.y, 1e-3);
    inner.scale.setScalar(s); inner.position.set(-ctr.x * s, -a.box.min.y * s, -ctr.z * s);
    const holder = new THREE.Group(); holder.add(inner);
    const mats = [];
    inner.traverse(n => {
      if (!n.isMesh) return;
      n.material = Array.isArray(n.material) ? n.material.map(m => m.clone()) : n.material.clone();
      (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { if (m.emissive) mats.push(m); });
    });
    const mixer = new THREE.AnimationMixer(inner), acts = {};
    a.clips.forEach((c, i) => {
      let r = Object.keys(ROLE_RE).find(k => ROLE_RE[k].test(c.name)) || (ent.clips || [])[i];
      if (r && !acts[r]) acts[r] = mixer.clipAction(c);
    });
    ['attack', 'hurt'].forEach(r => { if (acts[r]) { acts[r].setLoop(THREE.LoopOnce); acts[r].clampWhenFinished = true; } });
    if (e.sprite) { e.grp.remove(e.sprite); e.sprite.material.dispose(); e.sprite = null; }
    e.grp.add(holder);
    e.model = { holder, inner, mixer, acts, mats, cur: null, yawFix: (ent.yaw || 0) * Math.PI / 180, t: Math.random() * 9 };
  }
  function playRole(md, role) {
    if (md.cur === role) return;
    const nx = role && md.acts[role], pv = md.cur && md.acts[md.cur];
    if (nx) { nx.reset(); nx.fadeIn(.12); nx.play(); }
    if (pv && pv !== nx) pv.fadeOut(.12);
    md.cur = role;
  }

  function updateEnt(e, o, cv, dt, visible) {
    e.grp.visible = visible;
    if (!visible) return;
    spriteFor(e, cv);
    const [x, y] = entPos3(o);
    const bob = (o.st && (o.st['睡'] || o.st['麻'])) ? 0 : (Math.sin(clock * 3.4 + (e.isHero ? 0 : o.x * 1.7)) > .45 ? .035 : 0);
    e.grp.position.set(x + .5, 0, y + .5);
    const mv = Math.hypot(x - e.last.x, y - e.last.y);
    if (mv > 1e-3) { e.face = Math.atan2(x - e.last.x, y - e.last.y); e.moveT = .14; } else e.moveT -= dt;
    e.last.set(x, y);
    const fl = Math.max(0, Math.min(1, (o.flash || 0) / .09));
    if (e.sprite) {
      e.sprite.position.y = bob;
      const b = 1 + fl * 1.6; e.sprite.material.color.setRGB(b, b, b);
    }
    if (e.model) {
      const md = e.model;
      md.holder.position.y = bob;
      md.holder.rotation.y += (Math.atan2(Math.sin(e.face + md.yawFix - md.holder.rotation.y), Math.cos(e.face + md.yawFix - md.holder.rotation.y))) * Math.min(1, dt * 12);
      for (const m of md.mats) m.emissive.setScalar(fl * .8);
      let role = o.lunge ? 'attack' : (fl > 0 || o.recoil) ? 'hurt' : e.moveT > 0 ? 'walk' : 'idle';
      if (!md.acts[role]) role = md.acts.idle ? 'idle' : null;
      playRole(md, role);
      md.t += dt;
      if (!md.cur) {                       // 沒有動作檔：程式補呼吸與走路搖擺
        const k = Math.sin(md.t * 2.6);
        md.inner.parent.scale.set(1 - k * .012, 1 + k * .025, 1 - k * .012);
        md.holder.rotation.z = e.moveT > 0 ? Math.sin(md.t * 16) * .07 : fl * Math.sin(md.t * 50) * .08;
      }
      md.mixer.update(dt);
    }
  }

  /* ── 道具、飄字、粒子 ─────────────────────────────────── */
  const loot = new Map();
  function updateLoot() {
    const keep = new Set();
    const put = (tag, k, cv, s) => {
      k = +k; const id = tag + k; keep.add(id);
      let sp = loot.get(id);
      if (!sp) { sp = newSprite(cv, s); scene.add(sp); loot.set(id, sp); }
      const x = k % MW, y = (k / MW) | 0, seen = G.seen[k] | 0;
      sp.visible = seen > 0;
      sp.material.color.setScalar(seen === 2 ? 1 : .45);
      sp.position.set(x + .5, .02 + (seen === 2 ? Math.sin(clock * 2 + k) * .03 + .04 : 0), y + .5);
    };
    for (const k in (G.items || {})) { const it = G.items[k]; if (it) try { put('i', k, iconOf(it), .62); } catch (e) { } }
    for (const k in (G.gold || {})) if (G.gold[k]) put('g', k, goldIcon, .55);
    for (const [k, sp] of loot) if (!keep.has(k)) { scene.remove(sp); sp.material.dispose(); loot.delete(k); }
  }

  const floatPool = [];
  function textSprite() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    sp.scale.set(1.6, .4, 1); sp.renderOrder = 20; sp.userData = { c, t, txt: '' }; scene.add(sp); return sp;
  }
  function updateFloats() {
    const fs = G.floats || [];
    while (floatPool.length < fs.length) floatPool.push(textSprite());
    floatPool.forEach((sp, i) => {
      const f = fs[i]; sp.visible = !!f; if (!f) return;
      const u = sp.userData, sig = f.txt + '|' + f.col;
      if (u.txt !== sig) {
        const x = u.c.getContext('2d'); x.clearRect(0, 0, 128, 32);
        x.font = 'bold 22px ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.lineWidth = 5; x.strokeStyle = '#000'; x.strokeText(f.txt, 64, 17); x.fillStyle = f.col; x.fillText(f.txt, 64, 17);
        u.t.needsUpdate = true; u.txt = sig;
      }
      sp.position.set(f.x + .5, 1.35 + f.t * 1.1, f.y + .5);
      sp.material.opacity = Math.max(0, 1 - f.t / .85);
    });
  }

  const MAXP = 600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; scene.add(pts);
  function updateParts() {
    let n = 0;
    for (const p of (G.parts || [])) {
      if (p.t < 0 || n >= MAXP) continue;
      const k = p.t / p.life, a = Math.max(0, 1 - k * k);
      pPos[n * 3] = p.px / T; pPos[n * 3 + 1] = .35 + (1 - k) * .5 + (p.s || 1) * .02; pPos[n * 3 + 2] = p.py / T;
      const c = colorOf(p.col || '#fff'); pCol[n * 3] = c.r * a; pCol[n * 3 + 1] = c.g * a; pCol[n * 3 + 2] = c.b * a;
      n++;
    }
    pGeo.setDrawRange(0, n);
    pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = true;
  }

  // 頭目射擊預告：整行／整列亮白
  const warnMat = new THREE.MeshBasicMaterial({ color: 0xf6efe3, transparent: true, opacity: .25, depthWrite: false });
  const warnGeo = new THREE.PlaneGeometry(1, 1);
  const warnPool = [];
  function updateWarn() {
    let n = 0;
    const tile = (x, y) => {
      if ((G.seen[key(x, y)] | 0) !== 2) return;
      let m = warnPool[n]; if (!m) { m = new THREE.Mesh(warnGeo, warnMat); m.rotation.x = -Math.PI / 2; scene.add(m); warnPool.push(m); }
      m.visible = true; m.position.set(x + .5, .015, y + .5); n++;
    };
    for (const m of (G.mons || [])) if (m.warn) { for (let x = 0; x < MW; x++) tile(x, m.warn.y); for (let y = 0; y < MH; y++) tile(m.warn.x, y); }
    warnMat.opacity = .16 + .1 * Math.sin(clock * 9);
    for (let i = n; i < warnPool.length; i++) warnPool[i].visible = false;
  }

  /* ── 鏡頭 ─────────────────────────────────────────────── */
  const camT = new THREE.Vector3(), camGoal = new THREE.Vector3();
  let camInit = false;
  function updateCam(dt) {
    const [px, py] = entPos3(G.p);
    camGoal.set(px + .5, .4, py + .5);
    if (!camInit) { camT.copy(camGoal); camInit = true; }
    camT.lerp(camGoal, Math.min(1, dt * 8));
    const z = Math.max(1, G.zoom || 1);
    // 直式手機畫面很窄：依寬度決定距離，讓左右至少看得到 9 格（跟 2D 差不多）
    const half = Math.tan(cam.fov * Math.PI / 360);
    const dist = Math.max(8.5, 9.5 / (2 * half * cam.aspect)) / Math.pow(z, .7);
    cam.position.set(camT.x, camT.y + dist * .74, camT.z + dist * .67);
    cam.lookAt(camT);
    // 霧從鏡頭到玩家的距離之後才開始，遠處的房間慢慢沒入黑暗
    if (scene.fog) { scene.fog.near = dist * (fogOut ? 1.1 : .95); scene.fog.far = dist * (fogOut ? 2.4 : 1.65); }
    torch.position.set(px + .5, 1.6, py + .5);
    const f = 1 + Math.sin(performance.now() * .005) * .05 + Math.sin(performance.now() * .017) * .03;
    torch.intensity = 2.2 * f;
    sun.target.position.copy(camT); sun.position.set(camT.x - 4, 10, camT.z + 6);
  }

  function resize() {
    const r = game.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cvs._w !== w || cvs._h !== h) {
      cvs._w = w; cvs._h = h; cvs.style.height = h + 'px';
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
  }

  /* ── 主迴圈 ───────────────────────────────────────────── */
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
    const live = TW.on && typeof G !== 'undefined' && G && G.f && G.p;
    document.body.classList.toggle('t3d', !!live);
    if (!live) return;
    resize();
    if (G.f !== builtF || themeNow() !== builtTheme) { for (const [, e] of ents) { scene.remove(e.grp); dispose(e.grp); } ents.clear(); buildFloor(); camInit = false; }
    updateFog();

    const alive = new Set([G.p]);
    let he = ents.get(G.p);
    if (he && he.modelKey !== undefined && he.modelKey !== heroModelKey()) { scene.remove(he.grp); dispose(he.grp); ents.delete(G.p); he = null; }
    if (!he) { he = makeEnt(G.p, true); he.modelKey = he.modelKey || heroModelKey(); }
    updateEnt(he, G.p, heroNow(), dt, true);
    for (const m of G.mons) {
      if (m.hp <= 0) continue;
      alive.add(m);
      const e = ents.get(m) || makeEnt(m, false);
      let cv = m.d.mind === 2 ? heroNow() : (atlas[m.d.id] || atlas.rat);
      if (m.d.mind !== 2 && typeof animFrameFor === 'function') {
        try {
          const a = G.anim && G.anim.find(v => v.o === m);
          const pose = m.recoil ? { kind: 'hurt', phase: Math.min(1, m.recoil.t / (m.recoil.dur || .2)) }
            : m.lunge ? { kind: 'attack', phase: Math.min(1, m.lunge.t / (m.lunge.dur || .26)) }
            : a ? { kind: 'walk', phase: Math.min(1, a.t / (a.dur || .11)) } : { kind: 'idle', phase: 0 };
          const fr = animFrameFor((m.d.boss || m.d.visualBoss) ? 'boss' : 'mon', m.d.id, m, pose, (m.id || 0) * 1.7);
          if (fr && fr.img) cv = fr.img;
        } catch (err) { }
      }
      updateEnt(e, m, cv, dt, (G.seen[key(m.x, m.y)] | 0) === 2);
    }
    for (const [o, e] of ents) if (!alive.has(o)) { scene.remove(e.grp); dispose(e.grp); ents.delete(o); }

    updateLoot(); updateFloats(); updateParts(); updateWarn();
    updateCam(dt);
    renderer.render(scene, cam);
  }

  TW.toggle = function (on) {
    TW.on = on === undefined ? !TW.on : !!on;
    try { localStorage.setItem('tower-3d', TW.on ? 'on' : 'off'); } catch (e) { }
    label(); return TW.on;
  };

  fetch('models/manifest.json?v=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : {}).then(j => { TW.manifest = j || {}; })
    .catch(() => { }).finally(() => requestAnimationFrame(frame));
})();
