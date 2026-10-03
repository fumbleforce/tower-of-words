"""Game copies of the Meshy chibis (Review chibi-cast-meshy-1: kuro-1, eric-1, mio-3; chibi-cast-meshy-2: the rest).

From each rigged 60k-face file in art/parts/<round>/meshy/ (PICKS) this writes game3d/assets/characters/chibi-<id>/:
  model.glb     the mesh decimated to about 20k triangles (skin weights carried over, the full mesh's normals), the
                skeleton, fresh UVs, quantized (KHR_mesh_quantization), no embedded texture
  base.webp     the colour baked from the full mesh onto those UVs, 1024 px
  model-lo.glb, base-lo.webp   the same at about 8k triangles, for phones (chibi.js)
Steps: chibi_bake_tex.py merge (Blender), gltf-transform weld and simplify (meshoptimizer), chibi_bake_tex.py
decimate, chibi_uv.py (xatlas), chibi_bake_tex.py bake (Blender, Cycles on the CPU), gltf-transform quantize. Then tools/characters/chibi-bake.mjs bakes the game's clips onto the skeleton (clips.json).
Usage: python3 tools/characters/chibi_game.py [id ...]   (needs blender, uv and npx on the PATH; CHIBI_PARTS: the art/parts
folder when the rigged files aren't in this checkout; CHIBI_TEX: texture size)
"""
import os, subprocess, sys, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PARTS = os.environ.get('CHIBI_PARTS', os.path.join(ROOT, 'art/parts'))
OUT = os.path.join(ROOT, 'game3d/assets/characters')
R1, R2 = 'chibi-cast-meshy', 'chibi-cast-meshy-2'
PICKS = {'eric': (R1, 'eric-1'), 'mio': (R1, 'mio-3'), 'kuro': (R1, 'kuro-1')}
PICKS.update({w: (R2, w + '-1') for w in ('mori', 'kenji', 'emi', 'guard', 'kuroda', 'aoi', 'rei')})
# file suffix: triangles
TIERS = {'': 20000, '-lo': 8000}
TEX = int(os.environ.get('CHIBI_TEX', 1024))
BL = ['blender', '-b', '--python', os.path.join(HERE, 'chibi_bake_tex.py'), '--']
GT = ['npx', '--yes', '@gltf-transform/cli@4.5.1']
FACES = 60000  # in the rigged files


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stdout[-3000:] + r.stderr[-3000:])
    return r.stdout


for gid in sys.argv[1:] or PICKS:
    out = os.path.join(OUT, 'chibi-' + gid)
    os.makedirs(out, exist_ok=True)
    for suffix, tris in TIERS.items():
        model, tex = os.path.join(out, f'model{suffix}.glb'), os.path.join(out, f'base{suffix}.webp')
        with tempfile.TemporaryDirectory() as t:
            rnd, att = PICKS[gid]
            src = os.path.join(PARTS, rnd, 'meshy', att + '-rigged.glb')
            merged, welded, simple, blend, mesh, uv, png = (os.path.join(t, n) for n in (
                'merged.glb', 'welded.glb', 'simple.glb', 'work.blend', 'mesh.json', 'uv.json', 'base.png'))
            run(BL + ['merge', src, merged])
            run(GT + ['weld', merged, welded])
            run(GT + ['simplify', welded, simple, '--ratio', str(tris / FACES), '--error', '0.05'])
            run(BL + ['decimate', src, simple, blend, mesh])
            print(gid + suffix, run(['uv', 'run', '--quiet', '--python', '3.12', '--with', 'xatlas', '--with', 'numpy',
                                     os.path.join(HERE, 'chibi_uv.py'), mesh, uv, str(TEX)]).strip())
            run(BL + ['bake', blend, uv, os.path.join(t, 'model.glb'), png, str(TEX)])
            run(GT + ['quantize', os.path.join(t, 'model.glb'), model])
            Image.open(png).convert('RGB').save(tex, 'WEBP', quality=90, method=6)
        print(gid + suffix, os.path.getsize(model), os.path.getsize(tex))
