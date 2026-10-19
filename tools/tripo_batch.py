#!/usr/bin/env python3
"""
通天之塔 × Tripo AI 批次 3D 化
把 art3d/ 裡的怪物手繪圖（巴比倫戰記新版美術） → Tripo 生成 3D → 自動綁骨架 → 套動作 → 存進 models/
並更新 models/manifest.json。遊戲（tower3d.js）讀到 manifest 就會自動把立牌換成 3D 模型。

準備（只要做一次）：
    pip install tripo3d pillow
    Windows PowerShell:  $env:TRIPO_API_KEY = "tsk_你的金鑰"
    macOS / Linux:       export TRIPO_API_KEY="tsk_你的金鑰"

用法（在遊戲根目錄執行）：
    python tools/tripo_batch.py --list              看分組清單，不花點數
    python tools/tripo_batch.py slime               先試一隻（用通天之塔的怪物代號）
    python tools/tripo_batch.py --group easy        跑整組（easy / hard / boss / all）
    python tools/tripo_batch.py wolf --redo          重做一隻（會再花點數）

每一步的 task id 都記在 tools/tripo_state.json，中途斷掉重跑會從斷點接著做，不會重複扣點。
"""
import argparse, asyncio, json, os, shutil, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art3d"
OUT = ROOT / "models"
TMP = ROOT / "tools" / "_tripo_tmp"
STATE = ROOT / "tools" / "tripo_state.json"
MANIFEST = OUT / "manifest.json"

# 通天之塔的怪物代號 → 當作 Tripo 參考圖的美術檔（art3d/ 裡）。想換參考圖就改這裡。
TOWER_ART = {
    "rat": "mon_rat", "slime": "mon_slime", "shroom": "mon_shroom", "imp": "mon_imp",
    "skeleton": "mon_skel", "wolf": "mon_wolf", "golem": "mon_golem", "mage": "hum_sorcerer_m",
    "knight": "mon_kensei", "dryad": "mon_dryad", "hawk": "mon_hawk", "ibex": "mon_goat",
    "scree": "mon_scree", "crab": "mon_crab", "salam": "mon_salam", "ash": "mon_ash",
    "tengu": "mon_tengu", "tanuki": "mon_tanuki", "refr": "mon_refr", "centip": "mon_centip",
    "seraph": "seraph", "warden": "mon_automaton", "chimera": "evil_ushu",
    # 頭目
    "b_warden": "mon_golem", "b_treant": "mon_dryad", "b_pyro": "fiend_fire", "b_lord": "evil_kulu",
    "b_phoenix": "sum_phoenix", "b_oni": "evil_urid", "b_mermaid": "fiend_water", "b_gate": "mon_babel_beast",
}
# 前幾層就會遇到、外型實心的：先做這組最有感
EASY = ["rat", "slime", "shroom", "imp", "skeleton", "wolf", "golem", "mage", "crab", "salam", "ibex", "centip"]
HARD = ["knight", "dryad", "hawk", "scree", "ash", "tengu", "tanuki", "refr", "seraph", "warden", "chimera"]
# 完成版（v23.1）才有的怪物與頭目：參考圖用 art-revamp 分支 web/art-hd/ 的高解析圖，存成 art3d/hd_<代號>
EXTRA_MON = ["goblin", "grub", "turret", "wasp", "mossy", "eel", "prism", "ratking", "moth", "chochin",
             "shinobi", "shadow", "axiom", "parad", "unnamed", "samurai_spirit"]
EXTRA_BOSS = ["b_artisan", "b_ballista", "b_doll_heal", "b_doll_mage", "b_doll_tank", "b_gaoler", "b_genmaan",
              "b_hallking", "b_hanzo", "b_keeper", "b_mind", "b_mind1", "b_mind2", "b_musashimaru", "b_prism", "b_queen"]
# 舊參考圖跟完成版長得明顯不一樣的，也改用完成版的高解析圖（其餘外型相近的保留原本那隻）
REDO_HD = ["slime", "shroom", "imp", "mage", "knight", "ash", "tengu", "seraph",
           "b_warden", "b_lord", "b_oni", "b_mermaid", "b_gate"]
for _k in EXTRA_MON + EXTRA_BOSS + REDO_HD:
    TOWER_ART[_k] = "hd_" + _k
BOSS = [k for k in TOWER_ART if k.startswith("b_") and k not in EXTRA_BOSS]
GROUPS = {"easy": EASY, "hard": HARD, "boss": BOSS, "extra": EXTRA_MON + EXTRA_BOSS,
          "all": EASY + HARD + BOSS + EXTRA_MON + EXTRA_BOSS}

# 依骨架種類套的動作（Tripo 內建 preset）
PRESETS = {
    "biped":      ["preset:idle", "preset:walk", "preset:slash", "preset:hurt"],
    "quadruped":  ["preset:quadruped:walk"],
    "hexapod":    ["preset:hexapod:walk"],
    "octopod":    ["preset:octopod:walk"],
    "serpentine": ["preset:serpentine:march"],
    "aquatic":    ["preset:aquatic:march"],
}
# preset → 遊戲裡的動作名稱
ROLE = {"preset:idle": "idle", "preset:walk": "walk", "preset:slash": "attack", "preset:hurt": "hurt"}

FACE_LIMIT = 12000   # 手機也跑得動的面數


def load_json(p, default):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(p, data):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def to_png(key):
    """Tripo 吃 png/jpg；把 webp 轉成透明背景 png。"""
    from PIL import Image
    name = TOWER_ART.get(key, key)
    src = next((ART / f"{name}.{ext}" for ext in ("webp", "png", "jpg") if (ART / f"{name}.{ext}").exists()), None)
    if not src:
        raise FileNotFoundError(f"art3d/ 裡找不到 {name}（怪物 {key}）")
    TMP.mkdir(parents=True, exist_ok=True)
    dst = TMP / f"{key}.png"
    im = Image.open(src).convert("RGBA")
    if max(im.size) > 1024:
        im.thumbnail((1024, 1024))
    elif max(im.size) < 768:
        # 小圖（192～320px）先裁掉透明邊、放大置中到 1024 —— Tripo 拿到大一點的圖，形狀抓得比較準
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        s = 880 / max(im.size)
        im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
        canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        canvas.paste(im, ((1024 - im.size[0]) // 2, (1024 - im.size[1]) // 2), im)
        im = canvas
    im.save(dst)
    return str(dst)


async def run(client, key, state, redo, lock):
    from tripo3d.models import TaskStatus
    st = {} if redo else dict(state.get(key, {}))

    async def step(name, make):
        """建立任務並等它完成；已完成的步驟直接沿用 task id。"""
        if st.get(name + "_done"):
            return await client.get_task(st[name])
        if not st.get(name):
            st[name] = await make()
            async with lock:
                state[key] = st; save_json(STATE, state)
        print(f"  [{key}] {name} 進行中…")
        task = await client.wait_for_task(st[name], polling_interval=4)
        if task.status != TaskStatus.SUCCESS:
            st.pop(name, None)
            async with lock:
                state[key] = st; save_json(STATE, state)
            raise RuntimeError(f"{name} 失敗：{task.status} {getattr(task, 'error_msg', '') or ''}")
        st[name + "_done"] = True
        async with lock:
            state[key] = st; save_json(STATE, state)
        return task

    print(f"▶ {key}")
    model = await step("model", lambda: client.image_to_model(
        image=to_png(key), face_limit=FACE_LIMIT, texture_quality="standard", auto_size=True))

    check = await step("check", lambda: client.check_riggable(st["model"]))
    riggable = bool(check.output.riggable)
    rig_type = getattr(check.output.rig_type, "value", check.output.rig_type) or "others"
    presets = PRESETS.get(rig_type, []) if riggable else []

    dl_dir = TMP / key
    dl_dir.mkdir(parents=True, exist_ok=True)
    final_task = model
    if presets:
        # 舊版綁骨架（v1.0，預設）只支援人形；四腳等其他骨架要用 v2.5
        rig_ver = "v1.0-20240301" if rig_type == "biped" else "v2.5-20260210"
        await step("rig", lambda: client.rig_model(
            original_model_task_id=st["model"], model_version=rig_ver, out_format="glb", rig_type=rig_type, spec="tripo"))
        final_task = await step("anim", lambda: client.retarget_animation(
            original_model_task_id=st["rig"], animation=presets, out_format="glb",
            export_with_geometry=True, animate_in_place=True))

    files = await client.download_task_models(final_task, str(dl_dir))
    src = files.get("model") or files.get("pbr_model") or next((v for v in files.values() if v and v.endswith(".glb")), None)
    if not src:
        raise RuntimeError("下載不到 GLB")
    OUT.mkdir(exist_ok=True)
    shutil.copyfile(src, OUT / f"{key}.glb")

    entry = {"file": f"{key}.glb", "rig": rig_type if presets else "static",
             "clips": [ROLE.get(p, "walk") for p in presets], "h": 0.95,
             "made": time.strftime("%Y-%m-%d")}
    async with lock:
        man = load_json(MANIFEST, {})
        man[key] = entry
        save_json(MANIFEST, man)
        st["done"] = True
        state[key] = st; save_json(STATE, state)
    print(f"✔ {key} → models/{key}.glb（{entry['rig']}，動作：{', '.join(entry['clips']) or '程式動作'}）")


async def main():
    ap = argparse.ArgumentParser(description="把怪物手繪圖批次轉成 3D 模型")
    ap.add_argument("keys", nargs="*", help="美術檔名，例如 mon_golem")
    ap.add_argument("--group", choices=GROUPS.keys())
    ap.add_argument("--list", action="store_true", help="只列清單，不花點數")
    ap.add_argument("--redo", action="store_true", help="忽略之前的進度重做")
    ap.add_argument("--jobs", type=int, default=3, help="同時跑幾隻（預設 3）")
    a = ap.parse_args()

    keys = list(a.keys) + (GROUPS[a.group] if a.group else [])
    state = load_json(STATE, {})
    if a.list or not keys:
        for g, ks in GROUPS.items():
            if g == "all":
                continue
            done = [k for k in ks if state.get(k, {}).get("done")]
            print(f"{g:5s}（{len(ks)} 隻，已完成 {len(done)}）: {' '.join(ks)}")
        print("\n每隻大約：生成 1 次 + 骨架檢查 + 綁骨架 + 套動作；實際扣點以 Tripo 帳單為準。")
        return

    if not os.environ.get("TRIPO_API_KEY"):
        sys.exit("找不到 TRIPO_API_KEY。請先設定環境變數（見檔案開頭說明）。")

    from tripo3d import TripoClient
    todo = [k for k in dict.fromkeys(keys) if a.redo or not state.get(k, {}).get("done")]
    skipped = len(set(keys)) - len(todo)
    if skipped:
        print(f"略過已完成的 {skipped} 隻（要重做請加 --redo）")
    lock, sem = asyncio.Lock(), asyncio.Semaphore(max(1, a.jobs))
    async with TripoClient() as client:
        bal = await client.get_balance()
        print(f"Tripo 點數餘額：{bal.balance}（凍結 {bal.frozen}）｜本次 {len(todo)} 隻")

        async def one(k):
            async with sem:
                try:
                    await run(client, k, state, a.redo, lock)
                    return k, None
                except Exception as e:
                    print(f"✘ {k}：{e}")
                    return k, str(e)

        res = await asyncio.gather(*(one(k) for k in todo))
        bal2 = await client.get_balance()
        ok = [k for k, e in res if not e]
        bad = [k for k, e in res if e]
        print(f"\n完成 {len(ok)} 隻，失敗 {len(bad)} 隻 {bad if bad else ''}")
        print(f"點數：{bal.balance} → {bal2.balance}（用掉 {round(bal.balance - bal2.balance, 2)}）")
        print("重新整理遊戲頁面，有模型的怪物就會變成 3D。")


if __name__ == "__main__":
    asyncio.run(main())
