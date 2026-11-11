# Changelog

## 0.3.0 — Presentation rebuild and the complete mission
Presentation
- Merged-geometry `Batch` builder with chamfered primitives, vertex tint and surface classes.
- Three shader families (mineral, hard-surface kit, sand) fed by one tiling four-channel noise map; insignia atlas with invented glyphs.
- Analytic sky convolved into image-based ambient; height haze that warms toward the sun; player-following 4096 shadow map with rim fade.
- HDR pipeline: six-level bloom pyramid, eye adaptation, lens dirt and flare, sun shafts, heat shimmer, chromatic fringe, ADS periphery blur, filmic curve and grade. Ambient occlusion snapped to depth texels.
- New outpost: ziggurat control tower, sand walls and three gates, silo spine, pipe racks, tanks, windtraps, masts, crates, landing pad.
- New harvester, ornithopter, worm, first-person carbine with arms, skinned infantry in two types.
- Instanced particle pools, travelling tracers, decals, casings, wind-borne sand.
- Audio: reverb, positional cues, machine/aircraft/alarm/worm beds, tension-driven score.

Mission
- Objective-driven flow replaces kill counts: survey records and harvester shutdown in either order, beacon, countdown, boarding, lift-off, debrief.
- Two routes with consequences: alarm relay (west) and supply cache (east); two cross-passages.
- Event reinforcements: alarm wave, objective wave, three pursuit waves; each fires once, spawns out of sight, respects a live cap.
- Unified hold-to-interact with distance, facing, line-of-sight, release and range reset; refusals explain themselves.
- One checkpoint restoring mission, alarm, supply, gate, harvester, enemies and extraction state.
- Tactical map, objective list, compass and world markers, radio lines, extraction clock, seismograph.
- Navigation grid with A* and string pulling for enemies and for the test pilot.
- Settings persist locally; four quality presets; three difficulty levels.

Verification
- `tests/bot.js` plays both routes through the input layer; `tests/run.js` adds fixture, runtime and offline checks.

## 0.2.0 — Stage two
- HDR, depth-aware AO, bloom, sun shafts; multiscale materials; rebuilt weapon; articulated guards; seismic warning event.

## 0.1.0 — Initial playable slice
- Canyon-to-outpost mission, movement, gunplay, two enemy waves and extraction.
