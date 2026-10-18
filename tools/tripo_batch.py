#!/usr/bin/env python3
"""
巴比倫戰記 × Tripo AI 批次 3D 化
把 art/ 裡的怪物手繪圖 → Tripo 生成 3D → 自動綁骨架 → 套動作 → 存進 models/
並更新 models/manifest.json。遊戲（models3d.js）讀到 manifest 就會自動把立牌換成 3D 模型。

準備（只要做一次）：
    pip install tripo3d pillow
    Windows PowerShell:  $env:TRIPO_API_KEY = "tsk_你的金鑰"
    macOS / Linux:       export TRIPO_API_KEY="tsk_你的金鑰"

用法（在遊戲根目錄執行）：
    python tools/tripo_batch.py --list              看分組清單，不花點數
    python tools/tripo_batch.py mon_golem           先試一隻
    python tools/tripo_batch.py --group easy        跑整組（easy / hard / boss / all）
    python tools/tripo_batch.py mon_wolf --redo     重做一隻（會再花點數）

每一步的 task id 都記在 tools/tripo_state.json，中途斷掉重跑會從斷點接著做，不會重複扣點。
"""
import argparse, asyncio, json, os, shutil, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art"
OUT = ROOT / "models"
TMP = ROOT / "tools" / "_tripo_tmp"
STATE = ROOT / "tools" / "tripo_state.json"
MANIFEST = OUT / "manifest.json"

# 實心、輪廓清楚的：AI 3D 成功率高
EASY = ["mon_golem", "mon_automaton", "mon_crab", "mon_scree", "mon_shroom", "mon_slime",
        "mon_goat", "mon_wolf", "mon_rat", "mon_salam", "mon_centip", "mon_tanuki",
        "mon_imp", "mon_skel", "mon_rguard", "mon_rarcher", "mon_tengu", "mon_hawk",
        "mon_clockhawk", "mon_dryad"]
# 煙霧、半透明、多頭：可以試，但常會糊掉
HARD = ["mon_ash", "mon_bladeghost", "mon_kensei", "mon_refr", "mon_babel_beast", "mon_odin"]
# 頭目與惡魔
BOSS = ["evil_bash", "evil_girt", "evil_kingu", "evil_kulu", "evil_kusa", "evil_lahm",
        "evil_mmah", "evil_mush", "evil_ugal", "evil_umu", "evil_urid", "evil_ushu",
        "fiend_earth", "fiend_fire", "fiend_lord", "fiend_water", "fiend_wind", "seraph"]
GROUPS = {"easy": EASY, "hard": HARD, "boss": BOSS, "all": EASY + HARD + BOSS}

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
    src = next((ART / f"{key}.{ext}" for ext in ("webp", "png", "jpg") if (ART / f"{key}.{ext}").exists()), None)
    if not src:
        raise FileNotFoundError(f"art/ 裡找不到 {key}")
    TMP.mkdir(parents=True, exist_ok=True)
    dst = TMP / f"{key}.png"
    im = Image.open(src).convert("RGBA")
    if max(im.size) > 1024:
        im.thumbnail((1024, 1024))
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
        await step("rig", lambda: client.rig_model(
            original_model_task_id=st["model"], out_format="glb", rig_type=rig_type, spec="tripo"))
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
             "clips": [ROLE.get(p, "walk") for p in presets], "h": 0.82,
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
