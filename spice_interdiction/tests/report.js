#!/usr/bin/env node
/* Turn tests/results.json into docs/TEST_REPORT.md. */
const fs = require('fs'), path = require('path');
const r = JSON.parse(fs.readFileSync(path.join(__dirname, 'results.json'), 'utf8'));
const data = n => (r.results.find(x => x.name === n) || {}).detail || {};
const w = data('west run data'), e = data('east run data'), fr = data('frame statistics (low preset, world pass)');
const groups = {}; for (const x of r.results) { if (/run data|statistics/.test(x.name)) continue; (groups[x.group] = groups[x.group] || []).push(x); }
const title = { routes: '兩條路線完整通關（無夾具）', reinforcements: '增援規則', interaction: '互動系統', mission: '任務與目標', extraction: '撤離', pause: '暫停', checkpoint: '檢查點', restart: '整關重開', alarm: '警報後果', effects: '特效預算', stability: '穩定性', runtime: '一般模式與離線啟動' };
let md = `# 《香料斷流》v0.3.0 測試報告\n\n- 成品：\`${r.artifact}\`（與 \`dist/index.html\` 相同）\n- SHA-256：\`${r.sha256}\`\n- 執行時間：${r.date}\n- 結果：**${r.passed} 項通過，${r.failed} 項失敗**\n\n`;
md += `## 環境與方法\n\nLinux、Playwright、Chromium、ANGLE SwiftShader（軟體 GPU）。載入交付的 HTML 本身，執行真實的 WebGL 與遊戲邏輯。除「一般模式」外，測試以 \`?test\` 啟動：主迴圈改由腳本以固定 1/60 秒步進，因此結果可重現，且不受軟體渲染速度影響。\n\n這份報告驗證的是流程與規則，**不是畫質、手感或效能**。軟體 GPU 的幀時間不能代表任何真實裝置。沒有人實際遊玩過這個版本。\n\n`;
md += `## 兩條路線的實際數據\n\n由 \`tests/bot.js\` 從出生點開始，透過輸入層（按鍵、轉向、扳機、互動鍵）操作到結算。不瞬移、不改任務狀態、不移除敵人；瞄準為腳本控制，所以用時與命中率不代表真人。\n\n| | 西側維修道 | 東側採收場 |\n|---|---|---|\n`;
const row = (k, f) => md += `| ${k} | ${f(w)} | ${f(e)} |\n`;
row('完成順序', d => (d.order || []).map(s => s.split('@')[0]).join(' → ')); row('遊戲內用時', d => d.playTime + ' 秒'); row('擊倒', d => d.kills); row('承受傷害', d => d.damage); row('警報', d => d.alarm + (d.alarmWave ? '（增援已到）' : '（無增援）'));
row('登機時仍存活的敵人', d => d.boardedWith); row('最高同時存活', d => d.maxAlive); row('結束時後備彈藥', d => d.reserve); row('單步位移超過 0.4 m 的次數', d => d.teleports);
md += `\n`;
for (const g of Object.keys(groups)) { md += `## ${title[g] || g}\n\n| 檢查 | 結果 |\n|---|---|\n`; for (const x of groups[g]) md += `| ${x.name} | ${x.pass ? 'PASS' : '**FAIL**'} |\n`; md += '\n'; }
md += `## 渲染統計（僅供參考）\n\n低畫質、世界通道：${fr.calls} 次繪製，${fr.tris} 個三角形。高畫質另加陰影通道與後處理。\n\n## 未驗證\n\n- 人工遊玩：手感、難度、節奏、聽感。\n- 真實 GPU 上的幀率與長時間穩定性。\n- Mac、Safari、真實手機與觸控操作。\n- 以 \`file://\` 以外方式（例如網頁伺服器、壓縮檔內預覽）啟動。\n`;
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'TEST_REPORT.md'), md); console.log('wrote docs/TEST_REPORT.md');
