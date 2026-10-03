"""Game copies of the Meshy chibis (Review chibi-cast-meshy-1: kuro-1, eric-1, mio-3; chibi-cast-meshy-2: the rest;
chibi-proportions-1: rei-2;
chibi-face-1: rei-2 and kuro-1 with their faces repainted; chibi-crowd-1: the generic islanders, ids gen-<base>).

From each rigged 60k-face file in art/parts/<round>/meshy/ (PICKS) this writes game3d/assets/characters/chibi-<id>/:
  model.glb     the mesh decimated to about 20k triangles (skin weights carried over, the full mesh's normals), the
                skeleton, fresh UVs, quantized (KHR_mesh_quantization), no embedded texture
  base.webp     the colour baked from the full mesh onto those UVs, 1024 px
  model-lo.glb, base-lo.webp   the same at about 8k triangles, for phones (chibi.js)
The generics (GEN) are crowd bodies, so smaller: about 5k triangles and 1024 px, and 3k and 512 px for phones (the
code-built crowd bodies are about 2.8k); each tier also
gets mask<suffix>.webp and regions<suffix>.json (chibi_regions.py: where the hair, the top and the bottom are, for the
colour variants in chibi.js), from the anchors in art/candidates/chibi-crowd-1/regions.json. The mesh and UVs of each
generic tier are kept in art/parts/chibi-crowd-1/game/ for that step (python3 tools/characters/chibi_regions.py).
Steps: chibi_bake_tex.py merge (Blender), gltf-transform weld and simplify (meshoptimizer), chibi_bake_tex.py
decimate, chibi_uv.py (xatlas), chibi_bake_tex.py bake (Blender, Cycles on the CPU), gltf-transform quantize. Then tools/characters/chibi-bake.mjs bakes the game's clips onto the skeleton (clips.json).
Usage: python3 tools/characters/chibi_game.py [id ...]   (needs blender, uv and npx on the PATH; CHIBI_PARTS: the art/parts
folder when the rigged files aren't in this checkout; CHIBI_TEX: texture size)
"""
import os, shutil, subprocess, sys, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PARTS = os.environ.get('CHIBI_PARTS', os.path.join(ROOT, 'art/parts'))
OUT = os.path.join(ROOT, 'game3d/assets/characters')
R1, R2, R3 = 'chibi-cast-meshy', 'chibi-cast-meshy-2', 'chibi-crowd-1'
PICKS = {'eric': (R1, 'eric-1'), 'mio': (R1, 'mio-3'), 'kuro': (R1, 'kuro-1')}
PICKS.update({w: (R2, w + '-1') for w in ('mori', 'kenji', 'emi', 'guard', 'kuroda', 'aoi')})
# Rei's rei-2 and Kuro's kuro-1 with their faces repainted on the texture (art/candidates/chibi-face-1, Review
# chibi-proportions-1 "Rei face" and "Kuro face"); the meshes are the same
PICKS['rei'] = ('chibi-face-1', 'rei-f3')
PICKS['kuro'] = ('chibi-face-1', 'kuro-f3')
# CHIBI_PICK=rei=chibi-face-1/rei-f2,kuro=...: bake another rigged file for a person (to try one in the game)
for p in filter(None, os.environ.get('CHIBI_PICK', '').split(',')):
    k, v = p.split('=')
    PICKS[k] = tuple(v.split('/'))
GEN = ('suit', 'shirt', 'blouse', 'cardigan', 'polo', 'hoodie', 'apron', 'dock')
PICKS.update({'gen-' + w: (R3, w + '-1') for w in GEN})
TEX = int(os.environ.get('CHIBI_TEX', 1024))
# file suffix: (triangles, texture px, the simplifier's error bound; it stops short of the count when that binds)
TIERS = {'': (20000, TEX, 0.05), '-lo': (8000, TEX, 0.05)}
GEN_TIERS = {'': (6000, 1024, 0.05), '-lo': (2800, 512, 0.12)}
KEEP = os.path.join(PARTS, R3, 'game')  # the generics' mesh and UVs, for chibi_regions.py
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
    gen = gid.startswith('gen-')
    for suffix, (tris, px, err) in (GEN_TIERS if gen else TIERS).items():
        model, tex = os.path.join(out, f'model{suffix}.glb'), os.path.join(out, f'base{suffix}.webp')
        with tempfile.TemporaryDirectory() as t:
            rnd, att = PICKS[gid]
            src = os.path.join(PARTS, rnd, 'meshy', att + '-rigged.glb')
            merged, welded, simple, blend, mesh, uv, png = (os.path.join(t, n) for n in (
                'merged.glb', 'welded.glb', 'simple.glb', 'work.blend', 'mesh.json', 'uv.json', 'base.png'))
            run(BL + ['merge', src, merged])
            run(GT + ['weld', merged, welded])
            run(GT + ['simplify', welded, simple, '--ratio', str(tris / FACES), '--error', str(err)])
            os.environ['CHIBI_TRIS'] = str(tris if gen else 0)  # the generics go below meshoptimizer's floor
            os.environ['CHIBI_CAGE'] = '2.0' if gen else os.environ.get('CHIBI_CAGE', '1.0')  # so further from the full
            # surface: a longer reach for the bake's rays, or they miss it and leave black flecks
            run(BL + ['decimate', src, simple, blend, mesh])
            print(gid + suffix, run(['uv', 'run', '--quiet', '--python', '3.12', '--with', 'xatlas', '--with', 'numpy',
                                     os.path.join(HERE, 'chibi_uv.py'), mesh, uv, str(px)]).strip())
            run(BL + ['bake', blend, uv, os.path.join(t, 'model.glb'), png, str(px)])
            run(GT + ['quantize', os.path.join(t, 'model.glb'), model])
            Image.open(png).convert('RGB').save(tex, 'WEBP', quality=90, method=6)
            if gen:
                keep = os.path.join(KEEP, gid + suffix)
                os.makedirs(keep, exist_ok=True)
                for f in (mesh, uv, png):
                    shutil.copy(f, keep)
        print(gid + suffix, os.path.getsize(model), os.path.getsize(tex))
