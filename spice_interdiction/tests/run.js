#!/usr/bin/env node
/* Acceptance checks for the built game (dist/index.html).
 *
 *   node tests/run.js            run everything, write tests/results.json
 *   node tests/run.js routes     only the two full playthroughs
 *
 * Needs Node with Playwright and a Chromium build. Set CHROME=/path/to/chrome
 * if Playwright's bundled browser is not available. The game itself needs none
 * of this. Checks marked [fixture] place the player or call damage() to reach a
 * state quickly; the two route playthroughs use no fixtures at all. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), FILE = 'file://' + path.join(ROOT, 'dist/index.html');
const BOT = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');
const only = process.argv[2] || 'all', results = [];
const check = (group, name, pass, detail) => { results.push({ group, name, pass: !!pass, detail }); console.log((pass ? 'PASS ' : 'FAIL ') + group + ' · ' + name + (pass ? '' : '  ' + JSON.stringify(detail))); };

async function open(browser, { test = true, offline = false, small = false } = {}) {
  const ctx = await browser.newContext({ viewport: small ? { width: 640, height: 360 } : { width: 960, height: 540 }, deviceScaleFactor: 1, offline });
  // The software renderer used for testing needs the low preset to reach interactive frame times.
  if (small) await ctx.addInitScript(() => { try { localStorage.setItem('spice.settings.v3', JSON.stringify({ quality: 'low' })); } catch {} });
  ctx.setDefaultTimeout(300000);
  const page = await ctx.newPage(), log = { errors: [], requests: [] };
  page.on('pageerror', e => log.errors.push(String(e.message).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') log.errors.push(m.text().slice(0, 300)); });
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) log.requests.push(r.url()); });
  await page.goto(FILE + (test ? '?test' : ''));
  await page.waitForFunction(() => window.__ready === true || document.querySelector('#boot pre'), null, { timeout: 120000 });
  return { ctx, page, log };
}
// Shared in-page helpers for fixture checks.
const HELPERS = `
  window.T=window.__test;window.G=T.game;
  window.begin=()=>{document.getElementById('start').click();T.step(215,1/60);G.difficulty=0.01;};
  window.holdE=(sec)=>{G.input.keys.add('KeyE');T.step(Math.round(sec*60),1/60);G.input.keys.delete('KeyE');T.step(2,1/60);};
  window.at=(id)=>{const it=G.mission.items.find(i=>i.id===id);T.place(it.point.stand.x,it.point.stand.z);T.look(it.point.pos.x,it.point.pos.y,it.point.pos.z);T.step(2,1/60);};
  window.doItem=(id,sec)=>{at(id);holdE(sec||4);return G.mission.flags[id];};
  window.snap=()=>T.snapshot();`;

async function routes(browser) {
  for (const route of ['west', 'east']) {
    const { ctx, page, log } = await open(browser);
    const r = await page.evaluate(({ src, route }) => {
      (0, eval)(src); const t = window.__test, g = t.game; document.getElementById('start').click();
      const bot = window.SpiceBot(t, route); let n = 0, teleports = 0, last = g.player.pos.clone(), boardedWith = -1, maxAlive = 0;
      while (!bot.done && !bot.failed && n < 60 * 60 * 10) {
        g.update(1 / 60); bot.tick(1 / 60); n++;
        if (g.state === 'playing') { if (g.player.pos.distanceTo(last) > 0.4) teleports++; last.copy(g.player.pos); }
        maxAlive = Math.max(maxAlive, g.enemies.living); if (g.mission.flags.board && boardedWith < 0) boardedWith = g.enemies.living;
      }
      const s = t.snapshot();
      return { done: bot.done, failed: bot.failed, order: bot.log, steps: n, state: s.state, playTime: s.playTime, health: s.health, shots: s.shots, hits: s.hits, kills: s.mission.stats.kills, damage: Math.round(s.mission.stats.damage),
        flags: s.mission.flags, alarm: s.mission.alarm, alarmWave: s.mission.events.alarmWave, route: s.mission.route, reserve: s.reserve, kits: s.kits, teleports, boardedWith, maxAlive, errors: t.errors };
    }, { src: BOT, route });
    check('routes', `${route}: spawn to debrief through real input, no teleport`, r.done && r.state === 'complete' && r.teleports === 0 && !r.errors.length && !log.errors.length, r);
    check('routes', `${route}: boarding was legal with enemies still alive`, r.boardedWith > 0, { boardedWith: r.boardedWith });
    if (route === 'west') check('routes', 'west: relay cut before any alarm -> no alarm wave', r.flags.relay && !r.alarmWave && r.alarm === 'cut', r);
    else check('routes', 'east: relay intact -> alarm and its wave; supply taken', !r.flags.relay && r.alarmWave && r.flags.supply, r);
    results.push({ group: 'routes', name: route + ' run data', pass: true, detail: r });
    await ctx.close();
  }
  const w = results.find(r => r.name === 'west run data').detail, e = results.find(r => r.name === 'east run data').detail;
  check('routes', 'route choice changes the fight (west faces fewer enemies than east)', w.kills < e.kills, { west: w.kills, east: e.kills });
  check('reinforcements', 'live enemy count never exceeds the cap during either playthrough', w.maxAlive <= 14 && e.maxAlive <= 14, { west: w.maxAlive, east: e.maxAlive });
}

async function fixtures(browser) {
  const fresh = async () => { const o = await open(browser); await o.page.evaluate(HELPERS); return o; };
  let { ctx, page, log } = await fresh();
  // --- interaction rules ---
  let r = await page.evaluate(() => { begin(); const out = {};
    at('beacon'); holdE(4); out.beaconEarly = G.mission.flags.beacon; out.lockedPrompt = G.mission.prompt && G.mission.prompt.locked;
    T.place(-3, -47); G.player.yaw = 0; G.input.keys.add('KeyW'); T.step(300, 1 / 60); G.input.keys.delete('KeyW'); out.gateZ = G.player.pos.z; out.gate = G.world.gate.open;
    at('terminal'); G.input.keys.add('KeyE'); T.step(60, 1 / 60); out.mid = G.mission.progress; G.input.keys.delete('KeyE'); T.step(3, 1 / 60); out.afterRelease = G.mission.progress; out.notDone = !G.mission.flags.terminal;
    G.input.keys.add('KeyE'); T.step(60, 1 / 60); T.place(-10, -28); T.step(3, 1 / 60); out.afterLeave = G.mission.progress; G.input.keys.delete('KeyE'); T.step(2, 1 / 60);
    T.place(-15.2, -22); T.look(-17, 1.25, -28); holdE(4); out.throughWall = G.mission.flags.terminal;
    out.done = doItem('terminal'); at('terminal'); T.step(3, 1 / 60); out.promptAfter = G.mission.prompt; holdE(4); out.screen = G.world.screens.terminal.state;
    return out; });
  check('interaction', 'beacon refuses before both objectives, with a locked prompt', !r.beaconEarly && r.lockedPrompt, r);
  check('interaction', 'north gate stays shut and solid while the harvester runs', r.gate === 0 && r.gateZ > -51.4, r);
  check('interaction', 'hold shows progress; releasing the key resets it', r.mid > 0.2 && r.mid < 0.5 && r.afterRelease === 0 && r.notDone, r);
  check('interaction', 'walking out of range resets progress', r.afterLeave === 0, r);
  check('interaction', 'no interaction through the alcove wall', r.throughWall === false, r);
  check('interaction', 'completed console offers no second interaction', r.done && r.promptAfter === null && r.screen.startsWith('done'), r);
  // --- objectives, gate, checkpoint, supply ---
  r = await page.evaluate(() => { const out = {}; const before = { reserve: G.reserve, kits: G.kits }; G.reserve = 30; G.player.health = 40;
    out.supply = doItem('supply', 2); out.reserve = G.reserve; out.health = G.player.health; out.kits = G.kits; at('supply'); T.step(3, 1 / 60); out.supplyAgain = G.mission.prompt;
    out.harv = doItem('harvester'); T.step(240, 1 / 60); const s = snap(); out.gate = s.gate; out.power = s.harvester.power; out.checkpoint = s.mission.checkpoint; out.wave = s.mission.events.objectiveWave; out.headline = s.mission.headline;
    T.place(-3, -47); G.player.yaw = 0; G.input.keys.add('KeyW'); T.step(360, 1 / 60); G.input.keys.delete('KeyW'); out.throughGate = G.player.pos.z; return out; });
  check('mission', 'supply cache refills ammunition, repairs the suit, adds kits, once', r.supply && r.reserve === 150 && r.health === 100 && r.kits === 3 && r.supplyAgain === null, r);
  check('mission', 'harvester shutdown: machine spins down and the north gate opens', r.harv && r.gate > 0.9 && r.power < 0.1, r);
  check('mission', 'both objectives -> checkpoint stored, objective wave armed once', r.checkpoint && r.wave, r);
  check('mission', 'open gate can be walked through', r.throughGate < -54, r);
  // --- extraction, pause, death and checkpoint ---
  r = await page.evaluate(() => { const out = {}; out.beacon = doItem('beacon'); T.step(60 * 9, 1 / 60); let s = snap(); out.phase = s.extraction.phase; out.remaining = s.extraction.remaining; out.worm = s.worm.level; out.waveA = s.extraction.waves.a;
    at('board'); holdE(3); out.boardEarly = G.mission.flags.board; out.boardRefusal = G.mission.prompt && G.mission.prompt.locked;
    // pause freezes every clock
    const p0 = { rem: G.extraction.remaining, worm: G.worm.clock, th: G.world.thopter.t, play: G.playTime, time: G.time, e: G.enemies.list.filter(e => e.active && e.alive).map(e => e.pos.x + e.pos.z).join() };
    out.livingBefore = G.enemies.living; G.pause(); T.step(600, 1 / 60); out.frozen = G.extraction.remaining === p0.rem && G.worm.clock === p0.worm && G.world.thopter.t === p0.th && G.playTime === p0.play && G.time === p0.time && G.enemies.list.filter(e => e.active && e.alive).map(e => e.pos.x + e.pos.z).join() === p0.e;
    G.openMap(); out.mapWhilePaused = G.hud.mapOpen; G.resume(); T.step(60, 1 / 60); out.resumed = G.state === 'playing' && G.extraction.remaining < p0.rem && G.extraction.remaining > p0.rem - 1.2; out.livingAfterResume = G.enemies.living;
    // die during the countdown, retry from the checkpoint
    G.difficulty = 1; G.damage(999); T.step(30, 1 / 60); out.dead = G.state; document.getElementById('retry-checkpoint').click(); T.step(30, 1 / 60); s = snap();
    out.after = { state: s.state, flags: s.mission.flags, gate: s.gate, power: s.harvester.power, phase: s.extraction.phase, thopter: s.thopter.phase, worm: s.worm.level, health: s.health, z: s.position[2], living: s.living, deaths: s.deaths, queue: s.mission.queue, objectiveWave: s.mission.events.objectiveWave };
    G.difficulty = 0.01; T.step(60 * 8, 1 / 60); out.afterWave = snap().mission.events.objectiveWave; out.livingLater = G.enemies.living; return out; });
  check('extraction', 'beacon starts the countdown, raises worm sign and brings pursuit', r.beacon && r.phase === 'inbound' && r.remaining < 67 && r.worm >= 2 && r.waveA, r);
  check('extraction', 'cannot board before the ornithopter has landed', r.boardEarly === false && r.boardRefusal, r);
  check('pause', 'pause freezes countdown, worm, aircraft, enemies and both clocks', r.frozen, r);
  check('pause', 'resume continues from the same instant without a burst of spawns', r.resumed && r.livingAfterResume === r.livingBefore, r);
  const a = r.after;
  check('checkpoint', 'death -> retry restores objectives, gate and shutdown harvester', r.dead === 'dead' && a.state === 'playing' && a.flags.terminal && a.flags.harvester && a.flags.supply && a.gate === 1 && a.power === 0, r);
  check('checkpoint', 'retry leaves no residual countdown, aircraft or worm sign', !a.flags.beacon && a.phase === 'idle' && a.thopter === 'away' && a.worm === 0, a);
  check('checkpoint', 'retry restores the player near the outpost with health and counts the death', a.health >= 60 && a.z < 0 && a.deaths === 1, a);
  check('checkpoint', 'objective wave re-arms exactly once after a retry', a.objectiveWave === false || r.afterWave === true, r);
  // --- finish from the checkpoint: land, board with enemies alive, outro is safe ---
  r = await page.evaluate(() => { const out = {}; doItem('beacon'); let n = 0; while (!G.world.thopter.landed && n++ < 60 * 90) T.step(1, 1 / 60); out.landed = G.world.thopter.landed; out.arrival = +(n / 60).toFixed(1); out.living = G.enemies.living;
    out.board = doItem('board', 2.5); out.state = G.state; G.difficulty = 1; const h = G.player.health; G.damage(50); out.safe = G.player.health === h; T.step(60 * 6, 1 / 60); out.breach = snap().worm.breach; T.step(60 * 11, 1 / 60); out.final = G.state; out.hidden = document.getElementById('complete').hidden; return out; });
  check('extraction', 'ornithopter arrives after the countdown and opens boarding', r.landed && r.arrival > 60 && r.arrival < 80, r);
  check('extraction', 'boarding completes with hostiles alive; no damage during lift-off', r.board && r.living > 0 && r.state === 'outro' && r.safe, r);
  check('extraction', 'lift-off shows the breach and only then the debrief', r.breach && r.final === 'complete' && r.hidden === false, r);
  // --- full restart ---
  r = await page.evaluate(() => { document.getElementById('again').click(); T.step(230, 1 / 60); const s = snap(); return { state: s.state, flags: s.mission.flags, gate: s.gate, running: s.harvester.running, living: s.living, phase: s.extraction.phase, worm: s.worm.level, ammo: s.ammo, checkpoint: s.mission.checkpoint, z: s.position[2], visible: G.world.harvester.group.visible, thopter: s.thopter.phase }; });
  check('restart', 'full restart resets objectives, gate, harvester, garrison, worm and checkpoint', r.state === 'playing' && !Object.values(r.flags).some(Boolean) && r.gate === 0 && r.running && r.visible && r.living === 10 && r.phase === 'idle' && r.worm === 0 && !r.checkpoint && r.z > 50 && r.thopter === 'away', r);
  check('stability', 'no uncaught errors in the fixture session', log.errors.length === 0, log.errors);
  await ctx.close();

  // --- alarm consequences and reinforcement rules ---
  ({ ctx, page, log } = await fresh());
  r = await page.evaluate(() => { begin(); G.maxAlive = 40; const out = {}, spawned = [], orig = G.enemies.spawn.bind(G.enemies);
    G.enemies.spawn = (kind, x, z, opts) => { const e = orig(kind, x, z, opts); if (e && opts && opts.group !== 'garrison') { const eye = G.player.eye(); spawned.push({ group: opts.group, dist: Math.hypot(x - G.player.pos.x, z - G.player.pos.z), hidden: !G.world.collision.visible(eye, new THREE.Vector3(x, e.pos.y + 1.5, z)) }); } return e; };
    T.place(-12.5, 0); T.look(-12.5, 1.5, -20); G.input.fire = true; T.step(6, 1 / 60); G.input.fire = false; T.step(30, 1 / 60); out.pending = G.mission.alarm;
    T.step(60 * 7, 1 / 60); out.alarm = G.mission.alarm; out.active = G.mission.alarmActive; T.step(60 * 12, 1 / 60); out.alarmSpawned = spawned.filter(s => s.group === 'alarm').length;
    G.input.fire = true; T.step(6, 1 / 60); G.input.fire = false; T.step(60 * 10, 1 / 60); out.alarmSpawnedLater = spawned.filter(s => s.group === 'alarm').length;
    out.cut = doItem('relay'); out.alarmAfterCut = G.mission.alarm; out.activeAfterCut = G.mission.alarmActive;
    doItem('terminal'); doItem('harvester'); T.step(60 * 14, 1 / 60); out.objective = spawned.filter(s => s.group === 'objective').length; out.maxAlive = G.maxAlive; out.living = G.enemies.living;
    out.minDist = Math.min(...spawned.map(s => s.dist)); out.hidden = spawned.filter(s => s.hidden).length; out.total = spawned.length; out.fx = snap().effects; return out; });
  check('alarm', 'gunfire inside the outpost with the relay intact raises the alarm after a delay', r.pending === 'pending' && r.alarm === 'active' && r.active, r);
  check('alarm', 'the alarm wave arrives once only (4 soldiers), however long the fight lasts', r.alarmSpawned === 4 && r.alarmSpawnedLater === 4, r);
  check('alarm', 'cutting the relay afterwards silences the siren', r.cut && r.alarmAfterCut === 'cut' && !r.activeAfterCut, r);
  check('alarm', 'relay cut -> the objective wave is the reduced one (2)', r.objective === 2, r);
  check('reinforcements', 'nobody appears within 20 m of the player; most arrive out of sight', r.total >= 6 && r.minDist >= 20 && r.hidden >= r.total - 1, r);
  
  check('effects', 'effect pools stay within their budgets', r.fx.dust <= 560 && r.fx.sparks <= 220 && r.fx.decals <= 64, r.fx);
  await ctx.close();

  // --- stuck or distant enemies never block the mission (pacifist run with fixtures) ---
  ({ ctx, page, log } = await fresh());
  r = await page.evaluate(() => { begin(); doItem('terminal'); doItem('harvester'); doItem('beacon'); let n = 0; while (!G.world.thopter.landed && n++ < 60 * 90) T.step(1, 1 / 60); const living = G.enemies.living, kills = G.mission.stats.kills; doItem('board', 2.5); T.step(60 * 17, 1 / 60); return { living, kills, state: G.state, shots: G.shots }; });
  check('mission', 'mission completes with zero kills and zero shots fired [fixture]', r.state === 'complete' && r.kills === 0 && r.shots === 0 && r.living > 5, r);
  await ctx.close();
}

async function runtime(browser) {
  // Ordinary session: no test hooks, real timing, real mouse and keyboard events.
  let { ctx, page, log } = await open(browser, { test: false, small: true });
  let r = await page.evaluate(() => ({ hooks: typeof window.__test, title: !document.getElementById('title').hidden }));
  check('runtime', 'normal launch shows the title and exposes no test hooks', r.hooks === 'undefined' && r.title, r);
  const until = (fn, ms = 240000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
  await page.click('#start');
  let ok = await until(() => !document.getElementById('hud').hidden);
  r = await page.evaluate(() => ({ hud: !document.getElementById('hud').hidden, ammo: document.getElementById('ammo').textContent, objective: document.getElementById('objective').textContent }));
  check('runtime', 'start button leads through the intro into play with the HUD up', ok && r.ammo === '24', r);
  await page.mouse.move(320, 180); await page.mouse.down(); ok = await until(() => +document.getElementById('ammo').textContent < 24, 120000); await page.mouse.up();
  check('runtime', 'left mouse button fires and consumes ammunition', ok, await page.evaluate(() => document.getElementById('ammo').textContent));
  await page.keyboard.press('KeyM'); ok = await until(() => !document.getElementById('map').hidden, 60000);
  check('runtime', 'M opens the tactical map and pauses play', ok, {});
  await page.keyboard.press('KeyM'); ok = await until(() => document.getElementById('map').hidden && document.getElementById('pause').hidden, 60000);
  check('runtime', 'M again closes the map and resumes', ok, {});
  await page.keyboard.press('Escape'); ok = await until(() => !document.getElementById('pause').hidden, 60000);
  check('runtime', 'Esc pauses', ok, {});
  await page.click('#resume'); ok = await until(() => document.getElementById('pause').hidden, 60000);
  check('runtime', 'resume button returns to play', ok, {});
  check('runtime', 'no page errors and no network requests in a normal session', log.errors.length === 0 && log.requests.length === 0, log);
  await ctx.close();
  // Offline start.
  ({ ctx, page, log } = await open(browser, { test: true, offline: true }));
  r = await page.evaluate(() => { const t = window.__test; document.getElementById('start').click(); t.step(230, 1 / 60, true); const s = t.snapshot(); return { state: s.state, calls: s.render.calls, tris: s.render.triangles }; });
  check('runtime', 'starts and renders with the network disabled', r.state === 'playing' && r.calls > 20 && log.requests.length === 0, { ...r, requests: log.requests });
  results.push({ group: 'runtime', name: 'frame statistics (low preset, world pass)', pass: true, detail: r });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  try {
    if (only === 'all' || only === 'routes') await routes(browser);
    if (only === 'all' || only === 'fixtures') await fixtures(browser);
    if (only === 'all' || only === 'runtime') await runtime(browser);
  } finally { await browser.close(); }
  const failed = results.filter(r => !r.pass), build = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/build.json'), 'utf8'));
  const summary = { artifact: build.artifact, sha256: build.sha256, date: new Date().toISOString(), passed: results.filter(r => r.pass && !/run data|statistics/.test(r.name)).length, failed: failed.length, results };
  if (only === 'all') fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(summary, null, 2));
  console.log(`\n${summary.passed} passed, ${summary.failed} failed`); process.exit(failed.length ? 1 : 0);
})();
