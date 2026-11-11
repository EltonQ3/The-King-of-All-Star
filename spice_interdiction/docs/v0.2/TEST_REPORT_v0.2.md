# 《香料斷流》v0.2.0 測試報告

測試與封版日期：2026-11-11。這份報告針對以下單一成品，而非先前版本。

- 成品：`Spice_Interdiction_v0.2.html`
- 大小：825,496 bytes（約 806.1 KiB）
- SHA-256：`8a0f6728fac12278e22fb3cebb2df85922c453af6657a77ef1468049fd92ee1d`
- 引擎：內嵌 Three.js r180；外部素材依賴：無。

## 結果摘要

原有功能回歸 **24/24 通過**；第二階段整合 **24/24 通過**，合計 **48/48**。另外，不開啟測試模式的普通遊戲，已驗證預設動畫循環、開始、射擊扣彈與暫停；`window.__test` 未在該普通運行測試中暴露。

兩組測試與普通模式檢查均未記錄到 JavaScript 未捕捉錯誤、控制台錯誤或頁面網絡請求。第二階段測試是在瀏覽器 offline=true、HTML connect-src none 的條件下進行。這不等同跨瀏覽器認證或人手遊玩驗收。

## 環境與方法

Linux Chromium / Xvfb / ANGLE SwiftShader（軟體 GPU）。回歸檢查視窗 960×540，最終美術截圖 1280×720。透過 Playwright 將**交付 HTML 的完整內容**載入瀏覽器，執行真實 WebGL 與 Web Audio；不是以示意圖替代畫面。

大部分整合測試使用明確測試模式，可指定位置、瞄準、事件和時間以重現特定條件。這些測試不應被解讀為真人操作或不使用測試輔助的通關。

另有一條連續路線：從預設出生點至撤離，使用原有移動、碰撞、射擊與關卡判定，不瞬移、不重設生命；由腳本自動瞄準。結果：1414 個模擬步、遊戲計時 23.57 秒、6 名守衛、狀態 `complete`。這個快速自動瞄準結果不能代表正常遊玩時長、敵人難度或手感。

### 本機檔案啟動限制

嘗試真實 `file://` 導航時，測試環境回報 `ERR_BLOCKED_BY_ADMINISTRATOR`，頁面未啟動。這項結果記錄為**環境阻擋，未完成直接本機啟動驗證**，沒有計入 48 項通過測試。可驗證的是同一 HTML 內容在斷網瀏覽器中成功運行。未在使用者 Mac、Safari 或真實手機上測試。

## 原有功能回歸

| 檢查 | 結果 |
|---|---|
| Browser initialization | PASS |
| Start button / input activation | PASS |
| WASD moves player through canyon | PASS |
| Mouse look input | PASS |
| Right mouse aiming | PASS |
| Solid cover collision | PASS |
| Left click / mesh hit / ammo consumption | PASS |
| Reload timing and reserve accounting | PASS |
| Cover blocks player shot | PASS |
| Jump and terrain landing | PASS |
| Enemy engagement / movement / fire | PASS |
| Premature extraction is rejected | PASS |
| First wave kills activate all three reinforcements | PASS |
| Six enemies can be cleared by real shooting | PASS |
| Walk into extraction -> completed state | PASS |
| Continuous canyon-to-extraction traversal (auto-aim, no teleport or health reset) | PASS |
| Fatal damage -> failure screen | PASS |
| Retry resets health, ammo, kills, enemies | PASS |
| Pause freezes gameplay | PASS |
| Resume button | PASS |
| Web Audio initializes and synthesizes sounds | PASS |
| Mobile touch UI initializes (emulation) | PASS |
| No external network requests | PASS |
| No uncaught browser errors | PASS |

## 第二階段整合

| 檢查 | 結果 |
|---|---|
| Initialize with browser network disabled | PASS |
| Recoil spring responds to a shot | PASS |
| Muzzle flash, transient light and case ejection | PASS |
| Recoil recovers and muzzle light ends | PASS |
| Magazine and support hand animate separately during reload | PASS |
| Optic reticle aligns with screen centre while ADS | PASS |
| Solid-surface hit leaves a bullet mark | PASS |
| Particle/decal budgets are enforced | PASS |
| Transient effects expire | PASS |
| Guard locomotion bends hips and knees | PASS |
| Guard visibly telegraphs before firing | PASS |
| Guard uses a three-shot burst then recovery | PASS |
| A hit interrupts the guard burst | PASS |
| Seismic event triggers from gameplay conditions | PASS |
| Warning advances through all stages and settles | PASS |
| This environmental warning does not damage the player | PASS |
| Pause freezes and resume advances the seismic clock | PASS |
| Reduced-motion setting removes seismic camera shake | PASS |
| Restart clears the warning and effects | PASS |
| Generated audio buffers are finite and seismic bus/limiter exist | PASS |
| All three quality presets render successfully | PASS |
| All local screenshots rendered without browser errors | PASS |
| No network requests while offline | PASS |
| No shader / console errors | PASS |

## 截圖索引與取景條件

`screenshots_v02/` 中的七張 PNG 全部使用上述交付版本及「高」畫質渲染。相機／階段由測試輔助設定，未在圖片上另加素材、重繪或改變光影。JPG 僅轉換格式。

| 檔案 | 內容 | 說明 |
|---|---|---|
| 01_title.png | 主選單 | 固定標題鏡頭 |
| 02_canyon.png | 岩隙出發 | 預設出生點 |
| 03_outpost.png | 採收前哨 | 定位相機，守衛正常顯示 |
| 04_aim.png | 瞄準 | 調整瞄準方向並推進動畫 |
| 05_fire.png | 開火 | 實際 fire()、扣彈、後座與槍口火光 |
| 06_reload.png | 換彈 | 實際 reload() 中間時點 |
| 07_seismic.png | 沙蟲預警 | 可到達的東側觀察位置，事件約 17.5 秒；隱藏守衛以觀察沙脊與沙塵 |

## 已檢查的資源與程式事項

所有 src/*.js 均通過 Node 語法檢查。效果有上限及過期清理；重試會清除殘留彈痕／短暫粒子及預警狀態。三檔畫質都完成渲染，且有對應 MSAA 和陰影解析度變化。

原始 jimao.html 和原先 v0.1 的 SHA-256 保持不變。發佈包已通過 ZIP CRC 檢查；遊戲 ZIP 內的 HTML 與獨立 HTML 指紋一致；原始碼 ZIP 解壓後以 build.py 重建，產生逐位元相同的 HTML。

## 未驗證與已知品質限制

- 沒有真實 Mac／Safari／iPhone 測試、硬件 GPU 幀率測量、長時間壓力測試或人工音訊聽感驗收。
- 手感、配樂品質、敵人難度及關卡節奏仍需真人試玩；自動化通過不代表這些主觀標準已達標。
- 角色、武器細節與程序化動作仍簡化；尚未達到「《幾貓》全部畫質標準」。沒有完整屏幕反射、物理體積散射、手工角色動畫、完整導航網格或布娃娃物理。
- 沙蟲部分是可觸發的環境預警，沒有可戰鬥沙蟲頭目、不造成額外傷害，也不改變撤離條件。
- 屏幕空間光束、深度遮蔽與熱擾動是即時近似；不是光線追蹤。
- 觸控僅確認模擬環境初始化，不代表真實手機可以流暢遊玩。

原始量測結果：tests/results.json、stage2_results.json、continuous_run.json、normal_mode.json、offline_file.json。
