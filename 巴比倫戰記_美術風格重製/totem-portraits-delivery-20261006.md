# 七羽天命圖騰與成長肖像框

2026-10-06 20:53（台灣時間）已發布原 Netlify 網站。
部署 `6ac4ef2dffce0b7c5a57d33a` 顯示 published，7 個新增／變更檔案。
正式頁已確認技能樹與肖像標記均為 `20261006-totem1`。

## 完成內容

- 保留圓形天命之輪，七羽金雕形成完整圖騰。管殼沿曲線有粗肩、細腰的輪廓變化，深色管腔保留可讀路徑。
- 選職業／技能、查看說明、確認學習都在同一屏。沒有長技能列表與重播按鈕。全部原技能仍能從選單查看，選中技能顯示真正前置路線。
- 先按學習查看不可逆代價，再按確認；儲存成功後才啟動一次注入。途中控制鎖定，避免重複扣點。重新開啟只顯示永久學會，不重播、不退款、不逆向播放。動畫不改戰鬥數值。
- 圓形肖像：未轉職銀框；已轉職金框；敵方深色金屬框。對話、隊伍選取、狀態與戰鬥演出使用同一個角色來源。轉職狀態來自原角色紀錄，不改轉職門檻。
- 新增七職業男女共 14 張成熟奇幻肖像，以及寧錄、瑟蕾娜 2 張肖像，存為一張 4×4 圖集。其他魔王保留原畫並統一圓框；沒有宣稱所有魔物重繪。戰場全身素材、配裝、故事、音樂與卡片保持原版本。

## 檢查與範圍

16 組自動檢查通過，包含技能點、前置條件、舊存檔相容、究極技、一次確認、三種肖像框狀態。
獨立本地瀏覽器：第一次學習按鈕未扣點；確認後 1→0 點、travel→complete，反擊永久學會。重載保留反擊且不播放動畫。對話資料確認銀框→金框→敵方框。
正式網站 390×844：輪盤和確認區同屏，視窗 scrollHeight=clientHeight=792，沒有長列表溢出。正式存檔未花點，未重置。
沒有宣稱已跑完整冒險或所有手機型號。螢幕高度小於650px仍保留安全捲動，以免內容不可操作。

正式截圖：`totem-live-mobile-20261006.jpg`。
對話示意（獨立測試）：`portrait-dialogue-silver-20261006.jpg`；测试導覽未打包。
完整遊戲包：`babylon-gold-totem-portraits-20261006.zip`，204 檔案、14,287,956 bytes。

## 生成素材與提示詞

使用內建圖片生成，參考使用者兩張角色圖片的成熟奇幻插畫質感，沒有照搬其角色、標誌或構圖。原生成檔保留；專案素材在 `skill-totem-20261006/art/portrait-atlas-20261006.png`。

提示詞：Use case: stylized-concept. Asset type: one production portrait sprite atlas for original Babylon Chronicle tactical RPG. Generate ONE square 2048x2048 sprite atlas, precisely 4 equal columns and 4 equal rows (16 tiles), no gutters. Every tile is a distinct finely painted bust portrait with a LARGE centered face, face entirely inside central 65% of tile, chest shoulders lower, full hair/horns visible. Same deep navy background for all cells, no frames or text. References are STYLE ONLY: mature, exquisite illustrated ancient fantasy, lustrous gold engraving, dimensional skin, nuanced serious expressions and rich fabric, NOT their specific characters, pose, trademark or logos. Not chibi, not photorealistic, not childish. Row1 left to right: male bronze-armored brown-haired warrior with gold circlet; female bronze-armored auburn-haired warrior; female blonde ivory-and-olive hooded healer; male pale-haired ivory-and-olive priest. Row2: female fiery copper-haired mage with elegant red gold tall hat; male dark-haired fire mage with red gold hat; female platinum-haired jeweled crowned summoner in emerald-gold; male long silver-haired jeweled crowned summoner in emerald-gold. Row3: male black-haired shadow assassin dark violet scarf; female black-haired shadow assassin dark violet scarf; male violet-haired stern dark sorcerer in black gold hood; female violet-haired dark sorceress in black gold hood. Row4: female brown-haired alchemist wearing olive leather hood brass goggles and necklace of tiny potion bottles; male brown-haired alchemist with brass goggles olive leather hood; imposing silver-haired demonic king with a black gold crown, scarlet eyes and basalt armor; mature silver-haired ice queen with aquamarine crown blue silver dress. Tiles consistent lighting, gold rim light, crisp expressive eyes, painterly ornate fantasy finishes. Exact 16 tiles, no extra miniatures, no captions, no watermark. UI atlas will be displayed at 48-112px per tile so prioritize faces over background detail.
