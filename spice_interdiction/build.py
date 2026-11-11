#!/usr/bin/env python3
"""Build the self-contained playable HTML with Python 3 (no package install)."""
from pathlib import Path
import hashlib, json
ROOT = Path(__file__).resolve().parent
SOURCES = ['core.js','materials.js','world.js','world_detail.js','weapon.js','enemies.js','effects.js','audio.js','render.js','atmosphere.js','input.js','game.js','main.js']

def build():
    shell = (ROOT/'src/shell.html').read_text(encoding='utf-8')
    css = (ROOT/'src/style.css').read_text(encoding='utf-8')
    parts = [(ROOT/'vendor/three-r180.js').read_text(encoding='utf-8')]
    for name in SOURCES:
        parts.append('\n/* ===== src/' + name + ' ===== */\n' + (ROOT/'src'/name).read_text(encoding='utf-8'))
    code = '\n'.join(parts).replace('</script', '<\\/script')
    html = shell.replace('/*__STYLE__*/', css).replace('/*__CODE__*/', code)
    out = ROOT/'dist/Spice_Interdiction_v0.2.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    manifest = {'artifact':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sources':SOURCES,'runtime':'Three.js r180','external_asset_dependencies':[]}
    (ROOT/'dist/build.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps(manifest,indent=2))
    return out
if __name__ == '__main__': build()
