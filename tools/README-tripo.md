# 通天之塔 × Tripo 3D 化

1. `pip install tripo3d pillow`
2. 設定金鑰（不要寫進檔案、不要貼進聊天）：
   PowerShell `$env:TRIPO_API_KEY="tsk_..."`，macOS `export TRIPO_API_KEY="tsk_..."`
3. 在遊戲根目錄：
   - `python tools/tripo_batch.py --list` 看清單（不扣點）
   - `python tools/tripo_batch.py hero-blob` 先試主角，再試 `slime`
   - `python tools/tripo_batch.py --group easy` 跑整組（easy / hard / boss / all）
4. 重新整理遊戲。`web/models/manifest.json` 有登記的怪物會變成 3D 模型，其餘用原本的像素圖當立牌。
   參考圖就是 `web/art-hd/<代號>.webp`，想換就放新圖、用同一個檔名。

- 2D／3D 切換：畫面左上角按鈕，或網址加 `?3d=0`／`?3d=1`。
- 模型太大或太小：改 `web/models/manifest.json` 裡該隻的 `h`（預設 0.95，頭目自動放大）；面向不對：加 `"yaw": 180`。
- 進度存在 `tools/tripo_state.json`，中斷後重跑會接著做，不會重複扣點。

- 單檔版 `index.html` 用 `python tools/build_single.py index.html --full` 重新打包，會一起包進 3D；但 3D 模型（.glb）要用 web/ 網站版才讀得到。
