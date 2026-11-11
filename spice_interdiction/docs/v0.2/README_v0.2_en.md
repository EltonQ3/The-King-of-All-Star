# Spice Interdiction 0.2.0

An offline, single-file Three.js FPS slice. See `README_繁體中文.md` for the full user/developer guide and `TEST_REPORT.md` for exact tested-build results and limits.

## Play

Open `dist/Spice_Interdiction_v0.2.html` in a browser that supports JavaScript and WebGL 2, or extract the play ZIP and open `index.html`. The game contains its library, generated assets and sound synthesis; it needs no external asset downloads. File previews are not necessarily full browser execution environments.

WASD: move. Mouse: look. Left button: fire. Right button: aim. R: reload. Space: jump. Shift: sprint. C: crouch. Esc: pause.

Clear the three guards and three reinforcements, then reach the northern extraction marker. A scripted seismic warning with audio, a rising sand ridge and dust now plays during the mission. It is not a sandworm boss and does not inflict damage or block extraction.

## Build

```sh
python3 build.py
```

Python 3 is the only build requirement. No npm packages or network fetches are needed. `dist/build.json` records the exact artifact hash and modules.

## v0.2

Procedural material detail, HDR/bloom/depth-aware ambient occlusion, environment reflection, screen-space light shafts, improved terrain grounding and harvester detail. Rebuilt viewmodel with separate magazine/bolt/support hand, spring recoil, shell ejection and impact decals. Articulated guard movement, readable fire telegraphs, three-shot bursts and hit interruptions. Three quality presets, FOV and reduced-camera-motion controls. Bounded effects and a pause/reset-aware seismic sequence.

## Testing

48 automated assertions passed for the delivered hash, plus a default-mode start/fire/pause smoke test. All rendering is actual WebGL via Linux Chromium/Xvfb/SwiftShader. The stage-two test disables browser networking. The environment blocks `file://` navigation, so HTML contents were loaded directly into the browser for functional tests. This is not native Mac, Safari or physical mobile validation, or a hardware-performance benchmark.

Test scripts use Python Playwright and `/usr/bin/chromium`; adapt the browser path to rerun outside the original environment. Screenshots are repeatable camera/time fixtures, not human playthroughs or AI-generated images.

This remains a non-official Dune-inspired technical prototype with original procedural content. It does not claim visual parity with every aspect of the supplied reference. Three.js license is in `vendor/LICENSE-three.txt`.
