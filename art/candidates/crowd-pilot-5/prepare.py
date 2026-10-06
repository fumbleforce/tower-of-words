"""Package actual Meshy textures on the unchanged crowd rigs; refuse incompatible UVs."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import shutil
import sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
MAIN = Path(str(ROOT).split('/.claude/worktrees/')[0])
sys.path.insert(0, str(ROOT / 'art/candidates/rei-rig-1'))
from glbio import Glb
OUT = MAIN / 'art/parts/crowd-pilot-5'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def corners(glb):
    p = glb.prim()
    a = p['attributes']
    index = glb.acc(p['indices']).ravel()
    return glb.acc(a['POSITION'])[index], glb.acc(a['TEXCOORD_0'])[index]


parser = argparse.ArgumentParser()
parser.add_argument('--style', choices=['image', 'text'], default='image')
style = parser.parse_args().style
for cid in ('a', 'b'):
    source = MAIN / f'art/parts/crowd-pilot-2/rig/{cid}-rigged.glb'
    output = OUT / f'meshy/{cid}-{style}.glb'
    original, generated = Glb(source), Glb(output)
    op, ou = corners(original)
    gp, gu = corners(generated)
    # Retexture normalizes this source's 1.1 m body to [-1, 1] without changing triangles.
    assert op.shape == gp.shape and np.allclose(op, (gp + [0, 1, 0]) * .55, atol=2e-6)
    assert np.array_equal(ou, gu), 'Texture cannot be used on the original UV layout'
    material = generated.j['materials'][generated.prim()['material']]
    ti = material['pbrMetallicRoughness']['baseColorTexture']['index']
    im = generated.j['images'][generated.j['textures'][ti]['source']]
    bv = generated.j['bufferViews'][im['bufferView']]
    raw = generated.bin[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    dest = OUT / f'game/{cid}-{style}'
    dest.mkdir(parents=True, exist_ok=True)
    (OUT / f'meshy/{cid}-{style}-base.jpg').write_bytes(raw)
    decoded = Image.open(io.BytesIO(raw)).convert('RGB')
    decoded.save(dest / 'base.webp', lossless=True)
    assert np.array_equal(np.asarray(decoded), np.asarray(Image.open(dest / 'base.webp')))
    preserved = {}
    for kind in ('walk', 'run', 'sit'):
        src = MAIN / f'art/parts/crowd-pilot-2/rig/{cid}-{kind}.glb'
        shutil.copyfile(src, dest / f'{kind}.glb')
        assert sha(src) == sha(dest / f'{kind}.glb')
        preserved[kind] = sha(src)
    src = MAIN / f'art/parts/crowd-pilot-3/game/{cid}/idle.json'
    shutil.copyfile(src, dest / 'idle.json')
    preserved['idle'] = sha(src)
    report = {'candidate': f'{cid}-{style}', 'source_rig_sha256': sha(source),
              'meshy_output_sha256': sha(output), 'original_triangle_count': len(op) // 3,
              'triangle_uvs_exact': True, 'normalized_position_error_m': float(abs(op-(gp+[0,1,0])*.55).max()),
              'texture_pixels_unchanged': True, 'texture_size': list(decoded.size),
              'base_webp_sha256': sha(dest / 'base.webp'), 'unchanged_animation_files': preserved}
    (dest / 'preservation.json').write_text(json.dumps(report, indent=2) + '\n')
    print(cid, 'original geometry/weights/clips, exact UVs, untouched Meshy pixels:', decoded.size)
