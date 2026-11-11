# 《香料斷流》v0.3.0 測試報告

- 成品：`Spice_Interdiction_v0.3.html`（與 `dist/index.html` 相同）
- SHA-256：`094a813dbfd3dd54f03927571b70c6258b41588b7e21527d88f1b0bd6101ee98`
- 執行時間：2026-11-11T13:29:49.610Z
- 結果：**47 項通過，0 項失敗**

## 環境與方法

Linux、Playwright、Chromium、ANGLE SwiftShader（軟體 GPU）。載入交付的 HTML 本身，執行真實的 WebGL 與遊戲邏輯。除「一般模式」外，測試以 `?test` 啟動：主迴圈改由腳本以固定 1/60 秒步進，因此結果可重現，且不受軟體渲染速度影響。

這份報告驗證的是流程與規則，**不是畫質、手感或效能**。軟體 GPU 的幀時間不能代表任何真實裝置。沒有人實際遊玩過這個版本。

## 兩條路線的實際數據

由 `tests/bot.js` 從出生點開始，透過輸入層（按鍵、轉向、扳機、互動鍵）操作到結算。不瞬移、不改任務狀態、不移除敵人；瞄準為腳本控制，所以用時與命中率不代表真人。

| | 西側維修道 | 東側採收場 |
|---|---|---|
| 完成順序 | relay → terminal → harvester → beacon | supply → harvester → terminal → beacon |
| 遊戲內用時 | 119.78 秒 | 137.8 秒 |
| 擊倒 | 16 | 25 |
| 承受傷害 | 8 | 124 |
| 警報 | cut（無增援） | active（增援已到） |
| 登機時仍存活的敵人 | 1 | 2 |
| 最高同時存活 | 10 | 10 |
| 結束時後備彈藥 | 24 | 48 |
| 單步位移超過 0.4 m 的次數 | 0 | 0 |

## 兩條路線完整通關（無夾具）

| 檢查 | 結果 |
|---|---|
| west: spawn to debrief through real input, no teleport | PASS |
| west: boarding was legal with enemies still alive | PASS |
| west: relay cut before any alarm -> no alarm wave | PASS |
| east: spawn to debrief through real input, no teleport | PASS |
| east: boarding was legal with enemies still alive | PASS |
| east: relay intact -> alarm and its wave; supply taken | PASS |
| route choice changes the fight (west faces fewer enemies than east) | PASS |

## 增援規則

| 檢查 | 結果 |
|---|---|
| live enemy count never exceeds the cap during either playthrough | PASS |
| nobody appears within 20 m of the player; most arrive out of sight | PASS |

## 互動系統

| 檢查 | 結果 |
|---|---|
| beacon refuses before both objectives, with a locked prompt | PASS |
| north gate stays shut and solid while the harvester runs | PASS |
| hold shows progress; releasing the key resets it | PASS |
| walking out of range resets progress | PASS |
| no interaction through the alcove wall | PASS |
| completed console offers no second interaction | PASS |

## 任務與目標

| 檢查 | 結果 |
|---|---|
| supply cache refills ammunition, repairs the suit, adds kits, once | PASS |
| harvester shutdown: machine spins down and the north gate opens | PASS |
| both objectives -> checkpoint stored, objective wave armed once | PASS |
| open gate can be walked through | PASS |
| mission completes with zero kills and zero shots fired [fixture] | PASS |

## 撤離

| 檢查 | 結果 |
|---|---|
| beacon starts the countdown, raises worm sign and brings pursuit | PASS |
| cannot board before the ornithopter has landed | PASS |
| ornithopter arrives after the countdown and opens boarding | PASS |
| boarding completes with hostiles alive; no damage during lift-off | PASS |
| lift-off shows the breach and only then the debrief | PASS |

## 暫停

| 檢查 | 結果 |
|---|---|
| pause freezes countdown, worm, aircraft, enemies and both clocks | PASS |
| resume continues from the same instant without a burst of spawns | PASS |

## 檢查點

| 檢查 | 結果 |
|---|---|
| death -> retry restores objectives, gate and shutdown harvester | PASS |
| retry leaves no residual countdown, aircraft or worm sign | PASS |
| retry restores the player near the outpost with health and counts the death | PASS |
| objective wave re-arms exactly once after a retry | PASS |

## 整關重開

| 檢查 | 結果 |
|---|---|
| full restart resets objectives, gate, harvester, garrison, worm and checkpoint | PASS |

## 穩定性

| 檢查 | 結果 |
|---|---|
| no uncaught errors in the fixture session | PASS |

## 警報後果

| 檢查 | 結果 |
|---|---|
| gunfire inside the outpost with the relay intact raises the alarm after a delay | PASS |
| the alarm wave arrives once only (4 soldiers), however long the fight lasts | PASS |
| cutting the relay afterwards silences the siren | PASS |
| relay cut -> the objective wave is the reduced one (2) | PASS |

## 特效預算

| 檢查 | 結果 |
|---|---|
| effect pools stay within their budgets | PASS |

## 一般模式與離線啟動

| 檢查 | 結果 |
|---|---|
| normal launch shows the title and exposes no test hooks | PASS |
| start button leads through the intro into play with the HUD up | PASS |
| left mouse button fires and consumes ammunition | PASS |
| M opens the tactical map and pauses play | PASS |
| M again closes the map and resumes | PASS |
| Esc pauses | PASS |
| resume button returns to play | PASS |
| no page errors and no network requests in a normal session | PASS |
| starts and renders with the network disabled | PASS |

## 渲染統計（僅供參考）

低畫質、世界通道：104 次繪製，602020 個三角形。高畫質另加陰影通道與後處理。

## 未驗證

- 人工遊玩：手感、難度、節奏、聽感。
- 真實 GPU 上的幀率與長時間穩定性。
- Mac、Safari、真實手機與觸控操作。
- 以 `file://` 以外方式（例如網頁伺服器、壓縮檔內預覽）啟動。
