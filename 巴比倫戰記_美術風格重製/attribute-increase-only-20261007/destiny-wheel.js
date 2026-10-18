/* Wheel restoration — auto-placement; existing combat and save keys retained. */
'use strict';
document.documentElement.dataset.wheelEdition = '20261005-auto1';
cardArt = function (n) { return `art/cards/card_${n.inst === 'star' ? 'star' : 'evil'}_${n.def.key}.webp?v=auto1`; };
let wheelCollection = 'star';
const wheelEscape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function inspectWheelCard(n) {
  const owned = CARDS.got.includes(cardKey(n)), d = n.def;
  openOvl(`<div class="destiny-detail"><small>${n.inst === 'star' ? '十二星宿 · 青金金框' : '十一邪獸與金古 · 朱銅封印'}</small><h2>${wheelEscape(d.nm)}</h2>
    <img class="destiny-large" src="${owned ? cardArt(n) : 'art/cards/card_back.webp?v=auto1'}" alt="${owned ? wheelEscape(d.nm) + '卡面' : '尚未獲得的卡片背面'}">
    <p>${wheelEscape(d.el || '')} · ${wheelEscape(d.west || d.title || '')}</p>
    <p>${owned ? '已收藏・已自動嵌入天命之輪' : '尚未獲得・打倒對應星宿或邪獸後自動歸位'}</p>
    <button class="btn primary" id="wheelBack">返回天命之輪</button></div>`);
  $('#wheelBack').onclick = openWheel;
}

openWheel = function () {
  saveCards();
  const stars = STAR_NODES(), beasts = BEAST_NODES(), all = [...stars, ...beasts];
  const W = Math.min(340, Math.floor(innerWidth - 64)), f = W / 340;
  const done = wheelDone(), odin = CLEARED.has('6-王'), called = !!LS('babylon-temple-v1', false);
  const count = list => list.filter(n => CARDS.placed.includes(cardKey(n))).length;
  const slot = (n, i, outer) => {
    const k = cardKey(n), full = CARDS.placed.includes(k), a = i * 30 + (outer ? 0 : 15) - 90;
    const r = W * (outer ? .352 : .215), sw = (outer ? 30 : 24) * f, sh = sw * 1.5;
    return `<div aria-hidden="true" class="wslot${outer ? '' : ' inner'}${full ? ' full' : ''}" style="width:${sw}px;height:${sh}px;left:${W / 2 + Math.cos(a * Math.PI / 180) * r - sw / 2}px;top:${W / 2 + Math.sin(a * Math.PI / 180) * r - sh / 2}px;transform:rotate(${a + 90}deg)">${full ? `<img src="${cardArt(n)}" alt="">` : `<span>${outer ? n.def.glyph + '︎' : i + 1}</span>`}</div>`;
  };
  const list = wheelCollection === 'star' ? stars : beasts;
  openOvl(`<div class="destiny-panel"><small class="destiny-eyebrow">THE WHEEL OF DESTINY</small><h2>天命之輪</h2>
    <p class="destiny-intro">獲得卡片後自動嵌入。外圈十二星宿，內圈十一邪獸與金古。</p>
    <div class="wheel" role="img" aria-label="已歸位 ${CARDS.placed.length} 張，共二十四張" style="width:${W}px;height:${W}px;background-image:url(${wheelBg(W)})">
      <div class="wcore${done ? ' lit' : ''}"><b>${CARDS.placed.length}</b><small>/ 24</small></div>${stars.map((n,i)=>slot(n,i,true)).join('')}${beasts.map((n,i)=>slot(n,i,false)).join('')}</div>
    <div class="destiny-counts"><span>星宿 ${count(stars)} / 12</span><span>邪獸與金古 ${count(beasts)} / 12</span></div>
    <div class="destiny-requirements"><span>${done ? '✓' : '○'} 集齊二十四張卡片</span><span>${odin ? '✓' : '○'} 擊敗山巔奧丁</span><span>${called ? '✓ 地下神殿已現身' : done && odin ? '✧ 天命之門已準備好' : '集齊卡片並擊敗奧丁後，可呼叫神殿'}</span></div>
    ${!called ? `<button class="btn primary destiny-summon" id="wCall" ${done && odin ? '' : 'disabled'}>呼叫神殿</button>` : done && odin ? '<button class="btn primary destiny-summon" id="wTemple">前往地下神殿</button>' : ''}
    <div class="destiny-gallery-head"><h3>卡片圖鑑</h3><small>點卡片放大查看</small></div>
    <div class="destiny-tabs" role="group" aria-label="卡片分類"><button class="btn" id="wheelStars" aria-pressed="${wheelCollection === 'star'}">十二星宿</button><button class="btn" id="wheelBeasts" aria-pressed="${wheelCollection === 'beast'}">邪獸與金古</button></div>
    <div class="destiny-grid">${list.map(n => { const got = CARDS.got.includes(cardKey(n)); return `<button class="destiny-tile${got ? ' owned' : ''}" data-card="${cardKey(n)}" aria-label="查看${wheelEscape(n.def.nm)}，${got ? '已歸位' : '未獲得'}"><img loading="lazy" src="${got ? cardArt(n) : 'art/cards/card_back.webp?v=auto1'}" alt=""><b>${wheelEscape(n.def.nm)}</b><small>${got ? '已歸位' : '未獲得'}</small></button>`; }).join('')}</div>
    <button class="btn primary destiny-close" id="whClose">關閉</button><small class="destiny-version">自動嵌卡版 · 2026.10.05</small></div>`);
  $('#wheelStars').onclick = () => { wheelCollection = 'star'; openWheel(); };
  $('#wheelBeasts').onclick = () => { wheelCollection = 'beast'; openWheel(); };
  $('#whClose').onclick = () => { sfx('tap'); closeOvl(); };
  if ($('#wCall')) $('#wCall').onclick = async () => { const b = $('#wCall'); b.disabled = true; await callTemple(); if (b.isConnected) b.disabled = !(wheelDone() && CLEARED.has('6-王')); };
  if ($('#wTemple')) $('#wTemple').onclick = () => { closeOvl(); openWorld(NODES.find(n => n.id === '8-0')); };
  $('#ovl').querySelectorAll('[data-card]').forEach(b => b.onclick = () => inspectWheelCard(all.find(n => cardKey(n) === b.dataset.card)));
};

document.head.insertAdjacentHTML('beforeend', `<style>
.destiny-panel{--dg:#d7b775;--dn:#102b38;color:#ecdcb9;text-align:center;max-width:540px;margin:auto}.destiny-panel h2{margin:4px 0 8px}.destiny-eyebrow{font-size:9px;letter-spacing:.2em;color:var(--dg)}.destiny-intro{font-size:12px;line-height:1.8;margin:0 auto 16px;max-width:320px;color:#cbbd9e}
.destiny-panel .wheel{background-size:100% 100%;margin:14px auto}.destiny-panel .wslot{cursor:default}.destiny-panel .wslot img{object-fit:contain}.destiny-counts{display:flex;justify-content:center;gap:18px;font-size:12px;color:#e1c38b;margin:16px 0}.destiny-requirements{display:grid;gap:5px;text-align:left;font-size:12px;line-height:1.6;padding:12px 16px;background:#102b3880;border:1px solid #b490504a;border-radius:8px}.destiny-requirements span:last-child{color:#d7b775}
.destiny-summon{width:100%;margin-top:10px;min-height:44px}.destiny-summon:disabled{opacity:.45;cursor:not-allowed}.destiny-gallery-head{display:flex;justify-content:space-between;align-items:center;margin:22px 0 10px}.destiny-gallery-head h3{font-size:17px;margin:0;color:#edd3a0}.destiny-gallery-head small{font-size:11px;color:#bcae93}.destiny-tabs{display:flex;gap:8px;margin-bottom:14px}.destiny-tabs button{flex:1;min-height:44px}.destiny-tabs [aria-pressed=true]{background:#183c4b;color:#f3daa5;border-color:#ccaa6b}
.destiny-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 10px}.destiny-tile{border:0;background:transparent;color:#c5b899;padding:0;font:inherit;cursor:pointer;min-width:0}.destiny-tile img{display:block;width:100%;aspect-ratio:2/3;object-fit:contain;border-radius:6px;box-shadow:0 4px 12px #0007}.destiny-tile:not(.owned) img{filter:saturate(.45);opacity:.65}.destiny-tile b{display:block;font-size:11px;line-height:1.5;margin:7px 0 2px;overflow-wrap:anywhere}.destiny-tile small{font-size:10px;color:#ad9770}.destiny-tile.owned small{color:#d6b977}.destiny-tile:focus-visible,.destiny-tabs button:focus-visible{outline:2px solid #f2d393;outline-offset:4px}
.destiny-close{width:100%;min-height:44px;margin-top:20px}.destiny-version{display:block;color:#887f6d;font-size:10px;margin-top:10px}.destiny-detail{text-align:center;color:#ead3a0}.destiny-detail small{font-size:11px}.destiny-detail h2{margin:8px 0 14px}.destiny-large{display:block;width:min(270px,100%);max-height:58dvh;object-fit:contain;aspect-ratio:2/3;margin:auto;border-radius:10px;box-shadow:0 8px 32px #0009}.destiny-detail p{font-size:12px;line-height:1.7}.destiny-detail button{min-height:44px;width:100%}.cardget img{height:108px;object-fit:contain}.cfskip{position:absolute;right:16px;top:calc(16px + env(safe-area-inset-top,0px));min-height:44px;z-index:2}#cfx .cftxt{top:calc(50% + min(145px,36vw))}#cfx .cfmsg{top:calc(70px + env(safe-area-inset-top,0px))}
@media(prefers-reduced-motion:reduce){.wcore.lit,#cfx *{animation:none!important;transition:none!important}}@media(max-height:600px){#cfx .cfwrap{bottom:50px}#cfx .cfwheel{max-width:48vh;max-height:48vh}#cfx .cftxt b{font-size:19px}}
</style>`);
