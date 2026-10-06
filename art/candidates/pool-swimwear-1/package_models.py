"""Keep Meshy's native clips; extract unchanged base texture for the game rig loader."""
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'art/candidates/rei-rig-1'))
from glbio import Glb
OUT = ROOT / 'art/parts/pool-swimwear-1'

for candidate in sys.argv[1:]:
    source = OUT / 'meshy' / candidate
    target = OUT / 'game' / candidate
    target.mkdir(parents=True, exist_ok=True)
    g = Glb(source / 'walking.glb')
    primitive = g.j['meshes'][0]['primitives'][0]
    material = g.j['materials'][primitive['material']]
    texture = material['pbrMetallicRoughness']['baseColorTexture']['index']
    image = g.j['images'][g.j['textures'][texture]['source']]
    view = g.j['bufferViews'][image['bufferView']]
    raw = g.bin[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
    pic = Image.open(io.BytesIO(raw)).convert('RGB')
    pic.save(target / 'base.webp', lossless=True)
    assert np.array_equal(np.asarray(pic), np.asarray(Image.open(target / 'base.webp')))
    hashes = {}
    for src, dest in [('walking', 'walk'), ('running', 'run')]:
        shutil.copyfile(source / (src + '.glb'), target / (dest + '.glb'))
        hashes[dest] = hashlib.sha256((target / (dest + '.glb')).read_bytes()).hexdigest()
        assert hashes[dest] == hashlib.sha256((source / (src + '.glb')).read_bytes()).hexdigest()
    (target / 'provenance.json').write_text(json.dumps(dict(candidate=candidate, native_clips=hashes,
        texture_pixels_unchanged=True, texture_size=list(pic.size)), indent=2) + '\n')
    print(candidate, 'native walk/run unchanged; texture pixels losslessly preserved')
