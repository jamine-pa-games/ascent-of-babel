/* ═══ 3D 模型層（Tripo）═══════════════════════════════════════
   models/manifest.json 裡有登記的怪物，就把手繪立牌換成 3D 模型；
   沒有的照舊用立牌，所以模型可以一隻一隻慢慢加，遊戲隨時都能玩。

   不改任何遊戲邏輯：位置、跳躍、前衝、閃紅、倒下、淡出，
   全部讀立牌原本的狀態（u.pos / u.off / u.hop / u.mat）再套到模型上。
   關掉：網址加 ?m3d=0，或在主控台執行 Models3D.toggle()。 */
(function () {
  'use strict';
  if (!window.THREE || !THREE.GLTFLoader) return;

  const M3D = window.Models3D = { manifest: {}, on: true, loaded: {}, failed: {} };
  try {
    const q = new URLSearchParams(location.search).get('m3d');
    if (q === '0') M3D.on = false;
    else if (q !== '1' && localStorage.getItem('babylon-m3d') === 'off') M3D.on = false;
  } catch (e) { }

  const loader = new THREE.GLTFLoader();
  const clone = (THREE.SkeletonUtils && THREE.SkeletonUtils.clone) || (o => o.clone(true));
  const cache = {};        // key → Promise<{scene, clips, box}>
  const ROLE_RE = { idle: /idle|stand|breath/i, walk: /walk|run|march|move/i, attack: /slash|attack|hit_?a|strike|shoot/i, hurt: /hurt|damage|hit$|react/i };

  function unitsList() { try { return units; } catch (e) { return []; } }
  function keyOf(u) {
    if (u.cls || u.human) return null;           // 主角群維持現在的立繪
    let m = {};
    try { m = MONS[u.kind] || {}; } catch (e) { }
    return m.art || ('mon_' + u.kind);
  }

  function load(key) {
    if (cache[key]) return cache[key];
    const e = M3D.manifest[key];
    cache[key] = new Promise((res, rej) => loader.load('models/' + e.file, g => {
      const box = new THREE.Box3().setFromObject(g.scene);
      // 沒有環境貼圖時，金屬感太重的 PBR 材質會變黑：壓低金屬度
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(mt => { if ('metalness' in mt) mt.metalness = Math.min(mt.metalness, .25); if ('roughness' in mt) mt.roughness = Math.max(mt.roughness, .55); });
      });
      M3D.loaded[key] = true;
      res({ scene: g.scene, clips: g.animations || [], box });
    }, undefined, err => { M3D.failed[key] = String(err && err.message || err); console.warn('[Models3D] 載入失敗', key, err); rej(err); }));
    return cache[key];
  }

  function nameClips(clips, entry) {
    const out = {};
    const order = entry.clips || [];
    clips.forEach((c, i) => {
      let role = Object.keys(ROLE_RE).find(r => ROLE_RE[r].test(c.name));
      if (!role && order[i]) role = order[i];
      if (role && !out[role]) out[role] = c;
    });
    if (!out.idle && clips.length === 1 && !out.walk) out.idle = clips[0];
    return out;
  }

  function attach(u, key, asset) {
    if (!u.grp || u.m3d) return;
    const entry = M3D.manifest[key];
    const inner = clone(asset.scene);
    const size = new THREE.Vector3(), ctr = new THREE.Vector3();
    asset.box.getSize(size); asset.box.getCenter(ctr);
    const h = Math.max(size.y, .001);
    const s = (u.sc || 1.3) * (entry.h || .82) / h;
    inner.scale.setScalar(s);
    inner.position.set(-ctr.x * s, -asset.box.min.y * s, -ctr.z * s);

    const holder = new THREE.Group(); holder.add(inner);
    const yawFix = (entry.yaw || 0) * Math.PI / 180;

    const mats = [];
    inner.traverse(o => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.push({ m, base: m.color ? m.color.clone() : null }));
    });

    const mixer = new THREE.AnimationMixer(inner);
    const roles = nameClips(asset.clips, entry), acts = {};
    for (const r in roles) { acts[r] = mixer.clipAction(roles[r]); }
    if (acts.attack) { acts.attack.setLoop(THREE.LoopOnce); acts.attack.clampWhenFinished = true; }
    if (acts.hurt) { acts.hurt.setLoop(THREE.LoopOnce); acts.hurt.clampWhenFinished = true; }

    u.grp.add(holder);
    u.m3d = { key, holder, inner, mats, mixer, acts, cur: null, yaw: Math.atan2(u.face[0], u.face[1]), yawFix,
      last: u.pos.clone(), lastHp: u.hp, hurtT: 0, moveT: 0, t: Math.random() * 10 };
    play(u.m3d, acts.idle ? 'idle' : null);
    setVisible(u, M3D.on);
  }

  function setVisible(u, on) {
    const d = u.m3d; if (!d) return;
    d.holder.visible = on;
    if (u.sprite) u.sprite.visible = !on;
    if (u.ghost) u.ghost.visible = !on;
  }

  function play(d, role) {
    if (d.cur === role) return;
    const next = role && d.acts[role];
    const prev = d.cur && d.acts[d.cur];
    if (next) { next.reset(); next.setEffectiveWeight(1); next.fadeIn(.15); next.play(); }
    if (prev && prev !== next) prev.fadeOut(.15);
    d.cur = role;
  }

  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  let lastT = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
    if (!M3D.on) return;
    for (const u of unitsList()) {
      if (!u || !u.grp) continue;
      const key = keyOf(u);
      if (!key || !M3D.manifest[key] || M3D.failed[key]) continue;
      if (!u.m3d) { if (!u._m3dWait) { u._m3dWait = 1; load(key).then(a => attach(u, key, a), () => { }); } continue; }
      const d = u.m3d;
      if (!u.grp.visible) continue;
      if (u.sprite.visible) setVisible(u, true);

      // 跳躍、浮動：沿用立牌的高度
      d.holder.position.y = u.sprite.position.y;
      // 擠壓：立牌被壓扁時模型也一起
      const sq = u.sc ? Math.abs(u.sprite.scale.y) / u.sc : 1;
      d.holder.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));

      // 面向
      const want = Math.atan2(u.face[0] || 0, u.face[1] || 1) + d.yawFix;
      d.yaw += wrap(want - d.yaw) * Math.min(1, dt * 12);
      d.holder.rotation.y = d.yaw;
      // 搖晃、倒下（立牌用 mat.rotation 表現）
      d.holder.rotation.z = -(u.mat.rotation || 0);

      // 顏色與透明度：閃紅、中毒變色、死亡淡出
      const c = u.mat.color, op = u.mat.opacity;
      for (const x of d.mats) {
        if (x.base) x.m.color.copy(x.base).multiply(c);
        const tr = op < .999;
        if (x.m.transparent !== tr) { x.m.transparent = tr; x.m.needsUpdate = true; }
        x.m.opacity = op;
      }

      // 動作判斷
      const sp = d.last.distanceTo(u.pos) / Math.max(dt, 1e-3); d.last.copy(u.pos);
      if (sp > .4) d.moveT = .12; else d.moveT -= dt;
      if (u.hp < d.lastHp) d.hurtT = .45; d.lastHp = u.hp; d.hurtT -= dt;
      let role = 'idle';
      if (u.anim === 'atk') role = 'attack';
      else if (d.hurtT > 0) role = 'hurt';
      else if (d.moveT > 0) role = 'walk';
      if (!d.acts[role]) role = d.acts.idle ? 'idle' : null;
      play(d, role);

      // 沒有動作檔的模型：程式補一點生命感
      d.t += dt;
      if (!d.cur) {
        const b = Math.sin(d.t * 2.6);
        d.inner.rotation.x = d.moveT > 0 ? Math.sin(d.t * 14) * .06 : 0;
        d.inner.rotation.z = d.hurtT > 0 ? Math.sin(d.t * 40) * .08 : 0;
        d.holder.scale.y *= 1 + b * .025; d.holder.scale.x *= 1 - b * .012; d.holder.scale.z *= 1 - b * .012;
      }
      d.mixer.update(dt);
    }
  }

  M3D.toggle = function (on) {
    M3D.on = on === undefined ? !M3D.on : !!on;
    try { localStorage.setItem('babylon-m3d', M3D.on ? 'on' : 'off'); } catch (e) { }
    for (const u of unitsList()) if (u && u.m3d) setVisible(u, M3D.on);
    return M3D.on;
  };
  M3D.reload = function () {
    for (const k in cache) delete cache[k];
    for (const u of unitsList()) if (u && u.m3d) { u.grp.remove(u.m3d.holder); setVisible(u, false); u.m3d = null; u._m3dWait = 0; }
    return fetch('models/manifest.json?t=' + Date.now()).then(r => r.ok ? r.json() : {}).then(j => { M3D.manifest = j || {}; });
  };

  fetch('models/manifest.json?v=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : {})
    .then(j => { M3D.manifest = j || {}; const n = Object.keys(M3D.manifest).length; if (n) console.info('[Models3D] 已登記 3D 模型', n, '隻'); })
    .catch(() => { })
    .finally(() => requestAnimationFrame(frame));
})();
