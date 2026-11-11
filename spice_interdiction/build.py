#!/usr/bin/env python3
"""Build the self-contained playable HTML with Python 3 (no package install).

    python3 build.py            -> dist/Spice_Interdiction_v0.3.html (+ dist/index.html, dist/build.json)
    python3 build.py --dev NAME -> dist/dev_NAME.html using src/dev/NAME.js instead of the game modules
"""
from pathlib import Path
import hashlib, json, sys
ROOT = Path(__file__).resolve().parent
ENGINE = ['core.js', 'materials.js', 'sky.js', 'terrain.js', 'render.js']
GAME = ['kit.js', 'world.js', 'harvester.js', 'thopter.js', 'worm.js', 'weapon.js', 'enemies.js', 'effects.js',
        'audio.js', 'input.js', 'hud.js', 'mission.js', 'extraction.js', 'game.js', 'main.js']
VERSION = '0.3'

def bundle(sources, out_name):
    shell = (ROOT/'src/shell.html').read_text(encoding='utf-8')
    css = (ROOT/'src/style.css').read_text(encoding='utf-8')
    parts = [(ROOT/'vendor/three-r180.js').read_text(encoding='utf-8')]
    for name in sources:
        parts.append('\n/* ===== src/' + name + ' ===== */\n' + (ROOT/'src'/name).read_text(encoding='utf-8'))
    code = '\n'.join(parts).replace('</script', '<\\/script')
    html = shell.replace('/*__STYLE__*/', css).replace('/*__CODE__*/', code)
    out = ROOT/'dist'/out_name
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    return out

def build():
    sources = ENGINE + GAME
    out = bundle(sources, f'Spice_Interdiction_v{VERSION}.html')
    (ROOT/'dist/index.html').write_bytes(out.read_bytes())
    manifest = {'artifact': out.name, 'bytes': out.stat().st_size, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
                'sources': sources, 'runtime': 'Three.js r180', 'external_asset_dependencies': []}
    (ROOT/'dist/build.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps(manifest, indent=2))
    return out

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--dev':
        extra = [s for s in sys.argv[3:]]
        print(bundle(ENGINE + extra + ['dev/' + sys.argv[2] + '.js'], 'dev_' + sys.argv[2] + '.html'))
    else:
        build()
