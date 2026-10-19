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
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
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
  TW.ent = o => ents.get(o);            // 除錯用
  function entPos3(o, noLunge) {
    let x = o.x, y = o.y;
    const a = G.anim && G.anim.find(v => v.o === o);
    if (a) { const k = 1 - Math.min(1, a.t / (a.dur || .11)); x = o.x + (a.fx - o.x) * k; y = o.y + (a.fy - o.y) * k; }
    if (o.lunge && !noLunge) { const k = Math.sin(Math.min(1, o.lunge.t / .19) * Math.PI); x += o.lunge.dx * k * .32; y += o.lunge.dy * k * .32; }
    return [x, y];
  }

  /* 畫面上的大小跟 2D 完成版同一套規則（bossVisualScale）：
     雜魚 = 主角大小、菁英 1.5、頭目 2（寬高都是主角兩倍 → 面積 4 倍）、
     門之守望 2.72、序章門衛 3.05。判定仍只佔腳下一格。 */
  function scaleOf(d) {
    if (!d) return 1;
    if (d.id === 'b_gate') return 2.72;
    if (d.id === 'b_keeper') return 3.05;
    if (d.boss || d.visualBoss) return 2;
    return d.elite ? 1.5 : 1;
  }
  // 會飛的離地多高（2D 的 FLY_H = 5/16 格；投石妖精再高 3/16）
  const flyLift = o => (!o.d || !o.d.fly || (o.st && (o.st['睡'] || o.st['麻'] || o.st['石']))) ? 0 : (o.d.id === 'imp' ? .5 : .31);

  function makeEnt(o, isHero) {
    const mul = isHero ? 1 : scaleOf(o.d), boss = mul > 1.6;
    const size = 1.12 * mul;
    const grp = new THREE.Group();
    const e = { grp, boss, mul, size, sprite: null, cvNow: null, model: null, last: new THREE.Vector2(o.x, o.y), moveT: 0, face: 0, isHero };
    grp.add(newShadow(Math.max(1, mul * .9)));
    if (isHero) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(.36, .44, 32), new THREE.MeshBasicMaterial({ color: 0xc9973f, transparent: true, opacity: .8, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .02; grp.add(ring);
    }
    scene.add(grp);
    ents.set(o, e);
    if (!isHero && o.d && TW.manifest[o.d.id] && !TW.failed[o.d.id]) loadModel(o.d.id).then(a => attachModel(e, o.d.id, a), () => { });
    if (isHero && TW.manifest.hero && !TW.failed.hero) loadModel('hero').then(a => attachModel(e, 'hero', a), () => { });
    return e;
  }

  function spriteFor(e, cv) {
    if (e.model) return;
    if (!e.sprite) { e.sprite = newSprite(cv, e.size); e.grp.add(e.sprite); e.cvNow = cv; }
    else if (e.cvNow !== cv) { e.sprite.material.map = tex(cv); e.sprite.material.needsUpdate = true; e.cvNow = cv; }
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
    if (ent.clean) dropBits(inner, ent.clean);         // Tripo 做出來散在旁邊的碎片
    a.box.getSize(size); a.box.getCenter(ctr);
    // 跟 2D 一樣「放進一格的框」：高度到 h，但又長又扁的（蜈蚣、展翅的鳥）寬度最多 1.3 格，不會蓋到隔壁
    const mul = e.mul || 1, s = mul * Math.min((ent.h || .95) / Math.max(size.y, 1e-3), (ent.w || 1.3) / Math.max(size.x, size.z, 1e-3));
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
  /* ── 主角裝備：manifest 裡的 weap_<id>／shld_<id>／hat_<id> 掛在主角模型上 ──
     座標以主角面向 +z 為準（右手在 -x）。每件裝備可在 manifest 裡覆蓋同名欄位。
     武器：自動找長軸，細的那端當握把，握把放進手裡。
     盾牌：最薄的軸是厚度（thick 倍數加厚），凸出的那面朝外，放在手的外側不讓手穿出。
     帽子：主角整顆都是頭，scl 把帽子撐寬包住兩側和後面，tilt 往後仰讓眼睛露出來。 */
  const GEAR_SLOT = TW.gearSlot = {
    weap: { hand: [-.6, .42, .24], dir: [-.25, 1, .45], size: .62 },
    shld: { hand: [.62, .42, .22], dir: [1, 0, 1.1], size: .76, thick: 2.2, gap: .02 },
    // Tripo 的帽子面框朝 +x，轉 -90° 朝前；flare 讓兩側往下展開，back 讓後面包住身體，armY 在手的上方挖拱形
    hat:  { pos: [0, .74, -.06], rot: [0, -Math.PI / 2, 0], tilt: -.2, size: 1.12, scl: [1.4, .95, 1.15], flare: .35, back: .35, armY: .56 },
  };
  function gearInfo(scn) {
    const P = []; scn.updateMatrixWorld(true);
    scn.traverse(n => {
      if (!n.isMesh) return; const p = n.geometry.attributes.position, v = new THREE.Vector3();
      const st = Math.max(1, Math.floor(p.count / 4000)); for (let i = 0; i < p.count; i += st) P.push(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).clone());
    });
    const box = new THREE.Box3().setFromObject(scn), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const c = P.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(P.length || 1);
    let d = new THREE.Vector3(.3, 1, .2).normalize();
    for (let it = 0; it < 24; it++) { const n = new THREE.Vector3(); for (const v of P) { const q = v.clone().sub(c); n.addScaledVector(q, q.dot(d)); } if (n.lengthSq()) d = n.normalize(); }
    const t = P.map(v => v.clone().sub(c).dot(d)); let t0 = Math.min(...t), t1 = Math.max(...t);
    const len = t1 - t0;
    const avgR = (a, b) => { let s = 0, n = 0; P.forEach((v, i) => { if (t[i] >= a && t[i] <= b) { s += v.clone().sub(c).addScaledVector(d, -t[i]).length(); n++; } }); return n ? s / n : 0; };
    if (avgR(t0, t0 + len * .3) > avgR(t1 - len * .3, t1)) { d.negate(); [t0, t1] = [-t1, -t0]; }   // d：握把（細）→ 頭（粗）
    const grip = c.clone().addScaledVector(d, t0 + len * .2), gripAlt = c.clone().addScaledVector(d, t1 - len * .2);
    // 盾牌平面：第二主軸 e2，法線 = e1 × e2（Tripo 做出來本身歪斜也抓得到）
    let e2 = new THREE.Vector3(1, 0, 0).addScaledVector(d, -d.x).normalize();
    for (let it = 0; it < 24; it++) { const n = new THREE.Vector3(); for (const v of P) { const q = v.clone().sub(c); n.addScaledVector(q, q.dot(e2)); } n.addScaledVector(d, -n.dot(d)); if (n.lengthSq()) e2 = n.normalize(); }
    const normal = new THREE.Vector3().crossVectors(d, e2).normalize();
    const u = P.map(v => v.clone().sub(c)), s1 = u.map(q => q.dot(d)), s2 = u.map(q => q.dot(e2)), s3 = u.map(q => q.dot(normal));
    const r1 = (Math.max(...s1) - Math.min(...s1)) * .11, r2 = (Math.max(...s2) - Math.min(...s2)) * .11;
    let hi = -1e9, lo = 1e9; u.forEach((q, i) => { if (Math.abs(s1[i]) < r1 && Math.abs(s2[i]) < r2) { hi = Math.max(hi, s3[i]); lo = Math.min(lo, s3[i]); } });
    if (hi < -lo) normal.negate();                                     // 中間凸出比較多的那面當正面（判反用 turn）
    const thick = Math.max(...s3) - Math.min(...s3), face = Math.max(Math.max(...s1) - Math.min(...s1), Math.max(...s2) - Math.min(...s2));
    return { size, ctr, cen: c, axis: d, len, grip, gripAlt, normal, thick, face };
  }
  // 把模型的 normal 轉到 out，同時讓模型原本的上方（+y）盡量朝上
  function uprightTo(normal, out) {
    const basis = (n, up) => { const u = up.clone().addScaledVector(n, -up.dot(n)); if (u.lengthSq() < 1e-6) u.set(0, 0, 1).addScaledVector(n, -n.z); u.normalize(); return new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(u, n), u, n); };
    const Y = new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromRotationMatrix(basis(out.clone().normalize(), Y).multiply(basis(normal.clone().normalize(), Y).invert()));
  }
  function placeGear(slot, a, d) {
    const info = a.gear || (a.gear = gearInfo(a.scene));
    const g = new THREE.Group(), m = cloneS(a.scene), r = new THREE.Group();
    if (slot === 'weap') {
      const axis = d.flip ? info.axis.clone().negate() : info.axis;   // flip：劍的護手比劍身寬時，自動判斷的握把會反過來
      r.quaternion.setFromUnitVectors(axis, new THREE.Vector3(...d.dir).normalize()); r.scale.setScalar(d.size / Math.max(info.len, 1e-3));
      m.position.copy(d.flip ? info.gripAlt : info.grip).negate(); r.add(m); g.position.fromArray(d.hand);
    } else if (slot === 'shld') {
      const n = new THREE.Group(), N = d.turn ? info.normal.clone().negate() : info.normal, t = (d.thick || 1) - 1;   // 沿法線加厚：I + t·N·Nᵀ
      n.matrixAutoUpdate = false;
      n.matrix.set(1 + t * N.x * N.x, t * N.x * N.y, t * N.x * N.z, 0, t * N.y * N.x, 1 + t * N.y * N.y, t * N.y * N.z, 0, t * N.z * N.x, t * N.z * N.y, 1 + t * N.z * N.z, 0, 0, 0, 0, 1);
      m.position.copy(info.cen).negate(); n.add(m);
      const k = d.size / Math.max(info.face, 1e-3), out = new THREE.Vector3(...d.dir).normalize();
      r.quaternion.copy(uprightTo(N, out)); r.scale.setScalar(k); r.add(n);
      g.position.fromArray(d.hand).addScaledVector(out, info.thick * (d.thick || 1) * k / 2 + (d.gap || 0));
    } else {
      r.rotation.set(...d.rot); r.scale.setScalar(d.size / Math.max(info.size.x, info.size.y, info.size.z, 1e-3));
      m.position.copy(info.ctr).negate(); r.add(m); g.add(r);
      if (d.clean) dropBits(m, d.clean);
      if (d.flare || d.back) bendHat(g, m, d);
      g.position.fromArray(d.pos); if (d.scl) g.scale.set(...d.scl); g.rotation.x = d.tilt || 0; g.rotation.z = d.roll || 0;
      if (d.cut != null) cutBelow(g, m, d.cut);
      if (d.settle != null) settleOnHead(g, m, d.settle);
      if (d.hug != null) hugHead(g, m, d.hug, 9, d.face || null);
      if (d.cap) { const o = new THREE.Group(); g.add(r); o.add(g, makeCap(m, d.cap)); return o; }
    }
    if (!r.parent) g.add(r);
    return g;
  }
  // 拿掉沒連在主體上的小碎片（Tripo 偶爾會把參考圖旁邊的雜點也做成模型）
  function dropBits(m, frac) {
    m.traverse(n => {
      if (!n.isMesh || !n.geometry.index) return;
      if (!n.userData.own) { n.geometry = n.geometry.clone(); n.userData.own = 1; }
      const g = n.geometry, idx = g.index.array, pos = g.attributes.position, nv = pos.count;
      // 位置相同的頂點當同一點（UV 接縫會把頂點拆開）
      const key = new Map(), root = new Int32Array(nv);
      for (let i = 0; i < nv; i++) { const k = pos.getX(i).toFixed(4) + ',' + pos.getY(i).toFixed(4) + ',' + pos.getZ(i).toFixed(4); if (!key.has(k)) key.set(k, i); root[i] = key.get(k); }
      const par = Int32Array.from({ length: nv }, (_, i) => i);
      const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
      const join = (a, b) => { a = find(root[a]); b = find(root[b]); if (a !== b) par[a] = b; };
      for (let t = 0; t < idx.length; t += 3) { join(idx[t], idx[t + 1]); join(idx[t + 1], idx[t + 2]); }
      const cnt = new Map();
      for (let t = 0; t < idx.length; t += 3) { const r = find(root[idx[t]]); cnt.set(r, (cnt.get(r) || 0) + 1); }
      const total = idx.length / 3, keep = [];
      for (let t = 0; t < idx.length; t += 3) if (cnt.get(find(root[idx[t]])) >= total * frac) keep.push(idx[t], idx[t + 1], idx[t + 2]);
      g.setIndex(keep);
    });
  }
  // 剪掉主角座標 y 低於 cut 的三角形（例如頭巾拖到地上的長尾巴）
  function cutBelow(g, m, cut) {
    g.updateMatrixWorld(true); const v = new THREE.Vector3();
    m.traverse(n => {
      if (!n.isMesh || !n.geometry.index) return;
      if (!n.userData.own) { n.geometry = n.geometry.clone(); n.userData.own = 1; }
      const idx = n.geometry.index.array, p = n.geometry.attributes.position, keep = [];
      const y = i => v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y;
      for (let t = 0; t < idx.length; t += 3) if (Math.max(y(idx[t]), y(idx[t + 1]), y(idx[t + 2])) >= cut) keep.push(idx[t], idx[t + 1], idx[t + 2]);
      n.geometry.setIndex(keep);
    });
  }
  // 布罩：貼著頭的球面，把橘色包起來（頭巾、兜帽用）。角度都以頭頂為 0°：
  // front / back = 正前方、正後方往下包到幾度；win = [左右半寬, 上緣, 下緣] 在正前方留給眼睛的開口
  function makeCap(m, c) {
    const R = HEAD.r + (c.gap || .006), geo = new THREE.SphereGeometry(R, 64, 40).toNonIndexed(), p = geo.attributes.position;
    const keep = [], uv = geo.attributes.uv, kuv = [], D = Math.PI / 180, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 3) {
      v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.x += p.getX(i + k) / 3, v.y += p.getY(i + k) / 3, v.z += p.getZ(i + k) / 3;
      const polar = Math.acos(Math.max(-1, Math.min(1, v.y / v.length()))) / D, az = Math.atan2(v.x, v.z) / D;
      const lim = c.back + (c.front - c.back) * (1 + Math.cos(az * D)) / 2;
      const win = c.win && Math.abs(az) < c.win[0] && polar > c.win[1] && polar < c.win[2];
      if (polar < lim && !win) for (let k = 0; k < 3; k++) { keep.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); kuv.push(uv.getX(i + k), uv.getY(i + k)); }
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(kuv, 2)); g2.computeVertexNormals();
    let mat = null; m.traverse(n => { if (!mat && n.isMesh) mat = n.material; });
    mat = c.color ? new THREE.MeshStandardMaterial({ color: new THREE.Color(c.color).convertSRGBToLinear(), roughness: .85, metalness: 0 }) : mat.clone();
    mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(g2, mat); mesh.position.y = HEAD.y; mesh.frustumCulled = false;
    if (c.skirt) {                                                 // 袍子下擺：把手和腳也包進去 skirt = [上半徑, 下半徑, 高度]
      const [rt, rb, h] = c.skirt, sk = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 48, 1, true), mat);
      sk.position.y = h / 2 - HEAD.y; sk.frustumCulled = false; mesh.add(sk);
    }
    return mesh;
  }
  // 放下去：帽子從正上方落下，停在帽子內面剛好碰到頭頂（上半球）的位置 —— 不穿進頭、也不浮著
  function settleOnHead(g, m, gap) {
    g.updateMatrixWorld(true);
    const v = new THREE.Vector3(), R = HEAD.r + gap; let lift = -1e9;
    m.traverse(n => {
      if (!n.isMesh) return; const p = n.geometry.attributes.position, idx = n.geometry.index, used = idx ? new Set(idx.array) : null;
      for (let j = 0; j < p.count; j++) {
        if (used && !used.has(j)) continue;
        v.fromBufferAttribute(p, j).applyMatrix4(n.matrixWorld);
        const h = Math.hypot(v.x, v.z); if (h >= R) continue;
        const surf = HEAD.y + Math.sqrt(R * R - h * h);          // 這個水平位置的頭頂高度
        if (v.y > HEAD.y - .02) lift = Math.max(lift, surf - v.y);
      }
    });
    if (lift > -1e8) g.position.y += lift;
  }
  // 伏貼頭頂：主角的頭幾乎是一顆球（中心高 .48、半徑 .48），帽子陷進頭裡的點推到球面外 gap 的地方
  const HEAD = { y: .48, r: .48 };
  function hugHead(g, m, gap, deep = 9, face = null) {   // face = [左右半寬°, 上緣°, 下緣°]：臉的範圍不往外推（布的開口露出臉）
    g.updateMatrixWorld(true);                                     // g 還沒掛上主角，matrixWorld 就是主角座標
    const v = new THREE.Vector3(), R = HEAD.r + gap;
    m.traverse(n => {
      if (!n.isMesh) return;
      if (!n.userData.own) { n.geometry = n.geometry.clone(); n.userData.own = 1; }
      const M = n.matrixWorld, Mi = new THREE.Matrix4().copy(M).invert(), p = n.geometry.attributes.position;
      for (let j = 0; j < p.count; j++) {
        v.fromBufferAttribute(p, j).applyMatrix4(M);
        const dx = v.x, dy = v.y - HEAD.y, dz = v.z, L = Math.hypot(dx, dy, dz);
        const inFace = face && (() => { const pol = Math.acos(Math.max(-1, Math.min(1, dy / (L || 1)))) * 57.3, az = Math.atan2(dx, dz) * 57.3; return Math.abs(az) < face[0] && pol > face[1] && pol < face[2]; })();
        if (!inFace && L < R && L > R - deep && dy > -HEAD.r * .35) { const s = R / L; v.set(dx * s, HEAD.y + dy * s, dz * s); }   // 太深的點本來就藏在頭裡，不拉出來（避免抹在頭上）
        v.applyMatrix4(Mi); p.setXYZ(j, v.x, v.y, v.z);
      }
      p.needsUpdate = true; n.geometry.computeVertexNormals(); n.geometry.computeBoundingSphere();
    });
  }
  // 帽子變形（主角座標，面向 +z）：越往下越寬、後半部往後鼓，兩側在手上方抬成拱形
  function bendHat(g, m, d) {
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), v = new THREE.Vector3();
    const meshes = []; m.traverse(n => { if (n.isMesh) meshes.push(n); });
    const mats = meshes.map(n => new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld));
    let y0 = 1e9, y1 = -1e9, xm = 1e-6;
    meshes.forEach((n, i) => { const p = n.geometry.attributes.position; for (let j = 0; j < p.count; j++) { v.fromBufferAttribute(p, j).applyMatrix4(mats[i]); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); xm = Math.max(xm, Math.abs(v.x)); } });
    const armY = d.armY != null ? (d.armY - d.pos[1]) / (d.scl ? d.scl[1] : 1) : null;
    const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    meshes.forEach((n, i) => {
      n.geometry = n.geometry.clone();
      const p = n.geometry.attributes.position, back = new THREE.Matrix4().copy(mats[i]).invert();
      for (let j = 0; j < p.count; j++) {
        v.fromBufferAttribute(p, j).applyMatrix4(mats[i]);
        const t = 1 - (v.y - y0) / (y1 - y0), f = 1 + (d.flare || 0) * t * t, side = ss(.5, .8, Math.abs(v.x) / xm);
        v.x *= f; v.z *= v.z < 0 ? f * (1 + (d.back || 0) * t * (1 - side)) : 1 + (d.flare || 0) * .35 * t * t;
        if (armY != null && v.y < armY) v.y += (armY - v.y) * side * ss(-.45, .1, v.z / xm);
        v.applyMatrix4(back); p.setXYZ(j, v.x, v.y, v.z);
      }
      p.needsUpdate = true; n.geometry.computeVertexNormals(); n.geometry.computeBoundingSphere();
    });
  }
  function heroGear(p) {
    const id = v => v && (typeof v === 'string' ? v : v.id || (v.d && v.d.id));
    return { weap: id(p.weap) && 'weap_' + id(p.weap), shld: id(p.shld) && 'shld_' + id(p.shld), hat: id(p.hat) && 'hat_' + id(p.hat) };
  }
  function syncGear(e, p) {
    const md = e.model;
    if (!md.gearRig) { md.gearRig = new THREE.Group(); md.gearRig.rotation.y = -md.yawFix; md.holder.add(md.gearRig); md.gear = {}; }
    const want = heroGear(p);
    for (const slot in GEAR_SLOT) {
      const id = want[slot] && TW.manifest[want[slot]] && !TW.failed[want[slot]] ? want[slot] : null;
      const cur = md.gear[slot];
      if ((cur && cur.id) === id) continue;
      if (cur && cur.obj) md.gearRig.remove(cur.obj);      // 幾何是共用快取，不 dispose
      md.gear[slot] = { id, obj: null };
      if (!id) continue;
      loadModel(id).then(a => {
        if (md.gear[slot].id !== id) return;
        md.gear[slot].obj = placeGear(slot, a, Object.assign({}, GEAR_SLOT[slot], TW.manifest[id]));
        md.gearRig.add(md.gear[slot].obj);
      }, () => { });
    }
  }
  function playRole(md, role) {
    if (md.cur === role) return;
    const nx = role && md.acts[role], pv = md.cur && md.acts[md.cur];
    if (nx) { nx.reset(); nx.fadeIn(.12); nx.play(); }
    if (pv && pv !== nx) pv.fadeOut(.12);
    md.cur = role;
  }

  /* ── 主角動作（程式做的，不用骨架）──────────────────────
     走路：一跳一跳、落地壓扁，武器跟盾跟著晃
     揮擊：遊戲出手（o.lunge）時武器以握把為軸 往後舉 → 用力劈下 → 收回（0.42 秒）
     防禦：被打到、或有怪物撲向主角時，盾從側邊轉到身體前面擋（0.5 秒）
     閃避：怪物沒打中（o.dodge）時往旁邊跳開再回來（0.38 秒） */
  function heroMoves(e, o, dt) {
    const md = e.model, A = md.moves || (md.moves = { swing: -1, guard: -1, dodge: -1, back: -1, walk: 0, lunge: null, dir: [1, 0], backDir: [0, 1] });
    const ease = x => x * x * (3 - 2 * x);
    if (o.lunge && o.lunge !== A.lunge) { A.lunge = o.lunge; A.swing = 0; }
    if (o.dodge) {                                   // 用掉就清掉（只是畫面旗標），不然之後永遠不會再防禦
      A.dodge = 0; A.guard = -1;
      A.dir = (o.dodge.dx || o.dodge.dy) ? [-o.dodge.dy, o.dodge.dx] : [1, 0];   // 往攻擊方向的側邊閃
      o.dodge = null;
    }
    if (A.dodge < 0 && A.guard < 0 && A.swing < 0 && A.back < 0) {
      let hit = (o.flash || 0) > 0, from = null;
      for (const m of (G.mons || [])) {
        if (!m.lunge || m.lunge.t > .12) continue;
        const ax = Math.sign(o.x - m.x), ay = Math.sign(o.y - m.y);   // 牠撲過來的方向（含遠程）
        if ((ax || ay) && m.lunge.dx === ax && m.lunge.dy === ay) { hit = true; from = [m.x - o.x, m.y - o.y]; }
      }
      if (hit) {
        // 攻擊從背後來（跟面向夾角超過約 110°）：擋不到 → 往前踉蹌、閃紅光
        const fx = Math.sin(e.face), fz = Math.cos(e.face), L = from ? Math.hypot(from[0], from[1]) : 0;
        if (from && (from[0] * fx + from[1] * fz) / L < -.35) { A.back = 0; A.backDir = [-from[0] / L, -from[1] / L]; }
        else A.guard = 0;
      }
    }
    const W = md.gear && md.gear.weap && md.gear.weap.obj, S = md.gear && md.gear.shld && md.gear.shld.obj;
    // 揮擊：斜劈（從上方鏡頭看得清楚）—— 往右後方拉 → 往左前下方掃過身體 → 收回
    let sx = 0, sy = 0;
    if (A.swing >= 0) {
      A.swing += dt; const p = A.swing / .42;
      // 劍尖：拉到右後（x<0 往後倒、y 轉向右）→ 掃到左前（x>0 往前倒、y 轉向左）
      if (p < .3) { const k = ease(p / .3); sx = -.6 * k; sy = .8 * k; }
      else if (p < .5) { const k = ease((p - .3) / .2); sx = -.6 + 2.0 * k; sy = .8 + .3 * k; }
      else { const k = 1 - ease((p - .5) / .5); sx = 1.4 * k; sy = 1.1 * k; }
      if (p >= 1) A.swing = -1;
    }
    // 走路
    const walking = e.moveT > 0;
    A.walk = walking ? A.walk + dt * 15 : 0;
    const hop = walking ? Math.abs(Math.sin(A.walk)) : 0;
    md.holder.position.y += hop * .09;
    if (walking) { const q = 1 - hop; md.holder.scale.set(1 + q * .06, 1 - q * .08, 1 + q * .06); }
    if (W) { W.rotation.order = 'YXZ'; W.rotation.x = sx + (walking ? Math.sin(A.walk) * .18 : 0); W.rotation.y = sy; }   // 先往前倒（x）再繞身體掃（y）
    // 防禦
    let gd = 0;
    if (A.guard >= 0) {
      A.guard += dt; const p = A.guard / .5;
      gd = p < .25 ? ease(p / .25) : p < .7 ? 1 : 1 - ease((p - .7) / .3);
      if (p >= 1) A.guard = -1;
    }
    if (S) {
      const b = S.userData.base || (S.userData.base = S.position.clone());
      S.position.set(b.x + (.3 - b.x) * gd, b.y + (.46 - b.y) * gd + (walking ? Math.sin(A.walk + 1) * .03 : 0), b.z + (.62 - b.z) * gd);
      S.rotation.y = -.8 * gd;
    }
    // 閃避
    md.holder.position.x = md.holder.position.z = 0;
    if (A.dodge >= 0) {
      A.dodge += dt; const p = A.dodge / .38, k = Math.sin(Math.min(1, p) * Math.PI);
      md.holder.position.x = A.dir[0] * k * .38; md.holder.position.z = A.dir[1] * k * .38;
      md.holder.position.y += k * .12; md.holder.rotation.z = -A.dir[0] * k * .25;
      if (p >= 1) A.dodge = -1;
    }
    // 背後被打：沒防住，被往前推一下、身體前傾、閃紅光（0.4 秒）
    if (A.back >= 0) {
      A.back += dt; const p = A.back / .4, k = p < .25 ? ease(p / .25) : 1 - ease((p - .25) / .75);
      md.holder.position.x += A.backDir[0] * k * .22; md.holder.position.z += A.backDir[1] * k * .22;
      // 整個人（腳底為軸）往被推的方向傾：繞 (dz, 0, -dx) 轉
      e.grp.rotation.set(A.backDir[1] * k * .35, 0, -A.backDir[0] * k * .35);
      const red = Math.max(0, 1 - p * 1.6);
      for (const m of md.mats) m.emissive.setRGB(red * .9, 0, 0);
      if (p >= 1) { A.back = -1; e.grp.rotation.set(0, 0, 0); }
    }
  }

  function updateEnt(e, o, cv, dt, visible) {
    e.grp.visible = visible;
    if (!visible) return;
    spriteFor(e, cv);
    const [x, y] = entPos3(o);
    const bob = ((o.st && (o.st['睡'] || o.st['麻'])) ? 0 : (Math.sin(clock * 3.4 + (e.isHero ? 0 : o.x * 1.7)) > .45 ? .035 : 0)) + (e.isHero ? 0 : flyLift(o));   // 影子在 grp 上，留在地面
    e.grp.position.set(x + .5, 0, y + .5);
    // 面向只看真正的走動；攻擊往前衝再退回不算（不然打完會轉身背對敵人），出手時直接面向目標
    const [bx, by] = entPos3(o, true);
    const mv = Math.hypot(bx - e.last.x, by - e.last.y);
    if (mv > 1e-3) { e.face = Math.atan2(bx - e.last.x, by - e.last.y); e.moveT = .14; } else e.moveT -= dt;
    if (o.lunge && (o.lunge.dx || o.lunge.dy)) e.face = Math.atan2(o.lunge.dx, o.lunge.dy);
    e.last.set(bx, by);
    const fl = Math.max(0, Math.min(1, (o.flash || 0) / .09));
    if (e.sprite) {
      e.sprite.position.y = bob;
      const b = 1 + fl * 1.6; e.sprite.material.color.setRGB(b, b, b);
    }
    if (e.model) {
      const md = e.model;
      if (e.isHero) syncGear(e, o);
      md.holder.position.y = bob;
      md.holder.rotation.y += (Math.atan2(Math.sin(e.face + md.yawFix - md.holder.rotation.y), Math.cos(e.face + md.yawFix - md.holder.rotation.y))) * Math.min(1, dt * 12);
      for (const m of md.mats) m.emissive.setScalar(fl * .8);
      let role = o.lunge ? 'attack' : fl > 0 ? 'hurt' : e.moveT > 0 ? 'walk' : 'idle';
      if (!md.acts[role]) role = md.acts.idle ? 'idle' : null;
      playRole(md, role);
      md.t += dt;
      if (!md.cur) {                       // 沒有動作檔：程式補呼吸與走路搖擺
        const k = Math.sin(md.t * 2.6);
        md.inner.parent.scale.set(1 - k * .012, 1 + k * .025, 1 - k * .012);
        md.holder.rotation.z = e.moveT > 0 ? Math.sin(md.t * 16) * .07 : fl * Math.sin(md.t * 50) * .08;
      }
      if (e.isHero) heroMoves(e, o, dt);
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
    if (TW.camHook) TW.camHook(cam, camT);   // 除錯用：截圖時換角度
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
    const dt = Math.min(.1, (now - lastT) / 1000) * (TW.slow || 1); lastT = now;   // TW.slow：除錯用慢動作
    const live = TW.on && typeof G !== 'undefined' && G && G.f && G.p;
    document.body.classList.toggle('t3d', !!live);
    if (!live) return;
    resize();
    if (G.f !== builtF || themeNow() !== builtTheme) { for (const [, e] of ents) { scene.remove(e.grp); dispose(e.grp); } ents.clear(); buildFloor(); camInit = false; }
    updateFog();

    const alive = new Set([G.p]);
    let he = ents.get(G.p) || makeEnt(G.p, true);
    updateEnt(he, G.p, heroNow(), dt, true);
    for (const m of G.mons) {
      if (m.hp <= 0) continue;
      alive.add(m);
      const e = ents.get(m) || makeEnt(m, false);
      const cv = m.d.mind === 2 ? heroNow() : (atlas[m.d.id] || atlas.rat);
      updateEnt(e, m, cv, dt, (G.seen[key(m.x, m.y)] | 0) === 2);
    }
    for (const [o, e] of ents) if (!alive.has(o)) { scene.remove(e.grp); dispose(e.grp); ents.delete(o); }

    updateLoot(); updateFloats(); updateParts(); updateWarn();
    updateCam(dt);
    renderer.render(scene, cam);
  }

  TW.frame = frame;                     // 除錯用：手動推進一格（畫面隱藏時 requestAnimationFrame 會停）

  TW.toggle = function (on) {
    TW.on = on === undefined ? !TW.on : !!on;
    try { localStorage.setItem('tower-3d', TW.on ? 'on' : 'off'); } catch (e) { }
    label(); return TW.on;
  };

  fetch('models/manifest.json?v=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : {}).then(j => { TW.manifest = j || {}; })
    .catch(() => { }).finally(() => requestAnimationFrame(frame));
})();
