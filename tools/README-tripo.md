# Tripo 3D 化

1. `pip install tripo3d pillow`
2. 設定金鑰（不要寫進檔案、不要貼進聊天）：
   PowerShell `$env:TRIPO_API_KEY="tsk_..."`，macOS `export TRIPO_API_KEY="tsk_..."`
3. 在遊戲根目錄：
   - `python tools/tripo_batch.py --list` 看清單（不扣點）
   - `python tools/tripo_batch.py mon_golem` 先試一隻
   - `python tools/tripo_batch.py --group easy` 跑整組（easy / hard / boss / all）
4. 重新整理遊戲。`models/manifest.json` 有登記的怪物會自動變成 3D，其餘維持手繪立牌。

- 關掉 3D：網址加 `?m3d=0`；主控台 `Models3D.toggle()` 可切換。
- 模型太大或太小：改 `models/manifest.json` 裡該隻的 `h`（預設 0.82）；面向不對：加 `"yaw": 180`。
- 進度存在 `tools/tripo_state.json`，中斷後重跑會接著做，不會重複扣點。
