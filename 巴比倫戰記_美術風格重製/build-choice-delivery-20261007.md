# 自由養成、第二職業與四天王戰術重整

2026-10-07 完成正式網站核對。Netlify 部署 `6ac5076d0b433e60abc0ffe7` 顯示 published，13 個新增／變更檔案；部署頁顯示時間 10:36 PM。
原網址：https://endearing-salamander-fc944d.netlify.app/
正式版標記：技能／養成 `20261006-choice1`，能力配點 `20261006-attributes1`，魔王壓力 `20261006-pressure1`，四天王素材 `20261006-wardens1`。

## 真正的選擇

開局技能樹把主動與被動並列，不再只顯示選中技能的祖先路線。主動、被動、第二職業共用原本有限的技能點，第一級以普通攻擊、防禦與回復草起步；Lv2取得第一點後，戰士可在橫掃與反擊之間取捨。不是互斥鎖死：之後可以補另一支，但會延後其他招式。
七職業均有被動後續，例如战士反擊→不屈→鐵壁誓約，法師節律施法→咒式強化→魔力奔流。
仍保留確認、一次注入與永久學會；沒有重播或退款。

## 第二職業

每個職業角色可個別選一個不同的第二職業，確認後不可更換。傳承來自已通關的特殊事件／關卡紀錄，永久可用，不是可消耗的背包物品；不能透過測試模式取得或花正式點數。

|傳承|取得條件|可學技能|
|---|---|---|
|醫者|1-3 商隊醫者手札|回復術、醫者仁心、堅守|
|魔導|1-王 灰燼魔導卷|貫流、節律施法、綻放|
|守衛|2-王 岩獄守誓|震地、反擊、聖盾陣|
|影行|3-1 霜岸暗行訣|暗殺、伏擊心得、連斬|
|契約|獸1 城門聖獸印|炎靈、契約共鳴、風靈|
|幽咒|★12 雙尾星刻|吸魂、幽影護身、詛咒|
|調合|1-3 商隊調合筆記|調合藥劑、藥理精研、甲殼硬化|

副職第一技能／被動各需2點、Lv3；後續需3點、Lv7及前置。甲殼硬化仍需相應魔物配方。選定傳承不直接送技能，也不套用另一職業的整套能力值。
副職治療最少回復目標最大體力22%，仍花MP和行動，避免戰士魔攻低而完全無法治療；本職輔助的能力親和與主動／被動治療優勢仍保留。

## 玩家分配能力點

能力點與技能點分開。新角色初始3點，每個新等級再得3點。確認前能增減預覽，確認後永久投入；戰鬥／佈陣時不能確認配點。
不同職業保留不同起始能力，單點成長也有親和：戰士HP+6、攻擊／防禦+2；法師MP+5、魔攻／魔防+2；刺客速度+1，其他多為+0.5。速度最多投入12點，移動／跳躍不接受配點，保留裝備與地形的意義。
舊存檔以當時等級的原本能力作基線，既有能力不撤回；不補發曾經已自動獲得成長的全部點數，從新等級起改為手動成長。裝備、轉職、負傷仍另外套用。

## 四天王的壓力與破解

- 葛隆：鎖甲壓制物理，魔法有效命中可開啟兩次魔王行動的破甲窗口；第二次行動出現盾衛。
- 瑟蕾娜：避免貼近前排、偏向遠距施法；蓄力時兩次地屬性命中可斷唱，之後恢復一回合。
- 伊格尼斯：每次行動標記兩處餘燼，下次行動爆發25%最大體力傷害。水屬性有效命中會減弱既有爆發，並阻止下一輪追加標記。
- 半藏：逼近脆弱角色、嘗試側背進攻。前排戰士在同隊目標兩格內時，提供25%牽制減傷；一文字仍先預告舊位置，不追蹤閃避者。

追加四種元素護符，在原商店系統中作為180G、tier1飾品供應，魔王對應元素技能傷害減35%；占用飾品欄，與速度／輸出飾品取捨。護符不減少環境餘燼傷害。
四天王耐久約×1.4，其他魔王約×1.2，速度最多18；沒有按玩家等級無限拉高數值。大招可以針對單一目標蓄力；只有四天王追加開場蓄力規則，其他王保留原本各自的行動／命中／血量觸發機制。
魔王一般單次攻擊與蓄力傷害設有上限，仍可能因連擊、地面標記或其他魔物接續攻擊而倒地。原倒地救援＋負傷系統保留。

## 驗證

21組自動檢查通過：技能點、能力點、前置、傳承解鎖及重複選擇、不可逆學習、舊存檔、職業亲和與防禦／護符減傷等。
独立測試站的實際互動：

- 能力投入2點後，戰士HP36→42、攻擊10→12，能力點6→4；重載／升級仍保留。
- 戰士選醫者傳承、以2技能點學回復後，實際戰鬥MP10→5，同伴HP5→11。
- 同一輪火王蓄力＋餘燼，Lv3兩人站著不動時HP42／24→0／0；使用原本防禦術則存活，HP17／10。
- 未觀察到相關瀏覽器錯誤；這是受控回合比較，不是完整戰役勝率或所有手機型號測試。

正式站390×844：技能樹視窗scrollHeight=clientHeight=792；能力視窗皆682。正式站只查看分支與配點介面，未替玩家花點、選副職、重置進度或測試打王。
圖片：`choice-branches-live-mobile-20261007.jpg`、`attributes-live-mobile-20261007.jpg`；火王對比與副職施法為獨立測試，不是玩家正式存檔。
長期難度、七職業極端配點及其他後期魔王仍需要整體遊玩校準，沒有宣稱全遊戲已達成最終平衡。

## 交付與素材

完整包：`babylon-choice-attributes-bosses-20261006.zip`，212檔案、20,144,787 bytes。內容在`build-choice-20261006/`，不覆寫此前版本。
圖片生成技能使用內建生成工具，保留原四天王身分並重製成熟奇幻全身素材；另修正2×2圖集邊界以防裁切。最終使用`build-choice-20261006/art/boss-wardens-atlas-v2-20261006.png`，原生成檔保留。四天王肖像也取自同一份素材，其他魔王仍保留原圖。

### 初始提示詞

Use case: stylized-concept. Asset type: ONE transparent game sprite atlas, 2x2 equal square cells, no gutters, square 2048x2048. Four full-body original Babylon Chronicle bosses, all entire figures/weapons/tails/feet visible with 8 percent padding in each cell, no overlap between cells, ground baseline at 90% cell height. References 1-4 are identity references in reading order: preserve each identity and motifs but redesign to premium mature painterly mythic fantasy, detailed gold metal, menacing silhouettes, visibly distinct tactical roles, not chibi or cheap photoreal cutouts. Top left Grom: enormous crouching muscular WHITE TIGER with black stripes, volcanic stone plates, heavy engraved bronze chains locked around shoulders and forelegs, a shattered basalt crest, roaring face, rock-fortress posture, no human face. Top right Selena: adult female ice sea queen, long silver-black hair, teal-blue scale robes with tortoise shell crown and flowing freezing-water ribbons, ornate slender staff, imperious cold expression, grounded standing body. Bottom left Ignis: ancient hooded fire priest, charred ash-red robes, skeletal gold mask, burnt phoenix feather wings, incandescent cracks, raised ritual staff, threatening burned-sacrificial silhouette. Bottom right Hanzo: adult male shadow ninja in deep jade-black layered robes, bronze-scaled dragon shoulder armor, single curved sword, wind-dragon tail, flowing silk torn banners, agile low side-on stance, severe visible eyes. These are living fantasy game opponents, not four similar armored humans. Isolated figures only, genuine alpha transparent background, no ground planes, no typography, no frames, no watermark. Consistent dramatic lighting, readable at small size and premium 1990s-JRPG handpainted game key art finish. Do not crop any tiger face, blade, wings or feet. This atlas will be sliced by runtime, exact 2x2 alignment is mandatory.

### 格線修正提示詞

Edit target: attached four-boss sprite atlas. Keep the four identities, painterly detailed look, materials and palette exactly. FIX ONLY TILE LAYOUT. Deliver square transparent 2048x2048 atlas with 2x2 equal cells. Each sprite must fit COMPLETELY inside its own 1024x1024 cell with generous 120px transparent margin on all sides. The tiger's mouth and right front paw must NOT cross the vertical center line. The ice queen's staff must NOT touch the top or right canvas edge. The phoenix priest wing tips/staff must NOT cross center or lower bounds. Ninja blade/tail/feet must NOT touch right/bottom canvas edge. Scale all figures down to about 70% of each cell, feet align near y=880 within each cell. EXACT global bounding box limits: tiger x120..904 y120..904; queen x1144..1928 y120..904; priest x120..904 y1144..1928; ninja x1144..1928 y1144..1928. Between cells, create WIDE EMPTY TRANSPARENT CROSS-SHAPED GUTTER. No background, text, borders, labels, checkerboard painted into image. Preserve true alpha.
