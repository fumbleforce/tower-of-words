"""Minimal, reversible Meshy cleanup candidates. CPU only; no texture repaint or topology change.

Run with ~/ai/cv-venv/bin/python tools/style-concepts/mio_clean_build.py.
01 removes scene-light shading from the already painted atlas.
02 also moves only forward eye-band vertices back toward the adjacent face surface.
Original GLB, UVs, indices, texture bytes and vertex count stay untouched.
"""
import copy
import hashlib
import json
from pathlib import Path
import struct
import subprocess

import numpy as np

MAIN = Path(subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip()).parent
ROOT = MAIN / 'art/parts/style-concepts/claude-miogen3d'
SOURCE = ROOT / 'raw/meshy-single/norm.glb'
OUT = ROOT / 'clean'
a = SOURCE.read_bytes()
length = struct.unpack_from('<I', a, 12)[0]
j = json.loads(a[20:20 + length])
bin_start = 28 + length
bin_len = struct.unpack_from('<I', a, 20 + length)[0]
binary = a[bin_start:bin_start + bin_len]

def accessor(index, data):
    acc = j['accessors'][index]
    view = j['bufferViews'][acc['bufferView']]
    width = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[acc['type']]
    dtype = {5126: '<f4', 5125: '<u4'}[acc['componentType']]
    return np.frombuffer(data, dtype=dtype, count=acc['count'] * width,
                         offset=view.get('byteOffset', 0) + acc.get('byteOffset', 0)).reshape(-1, width)

def smooth(lo, hi, values):
    t = np.clip((values - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)

for name, eyes in [('01-material', False), ('02-eyes', True), ('03-clean', True), ('04-border', True), ('05-safe', True)]:
    doc = copy.deepcopy(j)
    data = bytearray(binary)
    doc.setdefault('extensionsUsed', []).append('KHR_materials_unlit')
    for mat in doc['materials']:
        mat.setdefault('extensions', {})['KHR_materials_unlit'] = {}
        if name in ('03-clean', '04-border', '05-safe'):
            mat.setdefault('extras', {})['mioCleanFilter'] = True
    p = accessor(0, data)
    original = p.copy()
    scale = j['nodes'][1]['scale'][0]
    translation = np.array(j['nodes'][1]['translation'])
    world = original * scale + translation
    receipt = {'source': str(SOURCE.relative_to(MAIN)), 'source_sha256': hashlib.sha256(a).hexdigest(),
               'texture': 'Original embedded JPEG bytes preserved exactly', 'material': 'KHR_materials_unlit',
               'vertices': len(p), 'triangles': j['accessors'][3]['count'] // 3,
               'geometry_change': 'none', 'moved_vertices': 0}
    if eyes:
        x, y, z = world.T
        # Eye region measured on the normalised 1.262 m guide. Keep the nose bridge, outer head contour,
        # forehead, cheeks and hair out of the correction. +Z is the front; only depth changes.
        weight = (smooth(.012, .023, abs(x)) * (1 - smooth(.076, .088, abs(x))) *
                  smooth(1.064, 1.073, y) * (1 - smooth(1.087, 1.099, y)) * smooth(.04, .055, z))
        plane = .079 - 3.6 * x * x
        movement = weight * np.maximum(z - plane, 0)
        if name in ('03-clean', '04-border'):
            movement *= .6  # preserve depth ordering instead of collapsing the shelf to a plane
        elif name == '05-safe':
            movement *= .2  # bounded backoff below the first source-face normal reversal
        if name == '04-border':
            # Independently observed crossings in 03, at the upper/lower edge of the eye mask.
            # Freeze their vertices, including identical-position copies on UV seams, then ease back
            # into 03's displacement through neighbouring triangle rings. No other region expands.
            faces = accessor(3, binary).reshape(-1, 3)
            border_faces = [433254, 433272, 433845, 434180, 433938, 434354, 434062,
                            434465, 434664, 434690, 434472]
            _, weld = np.unique(original, axis=0, return_inverse=True)
            protected = np.zeros(weld.max() + 1, dtype=bool)
            protected[weld[faces[border_faces].ravel()]] = True
            taper = np.ones(len(protected))
            taper[protected] = 0
            for amount in (.25, .75):
                adjacent = np.unique(weld[faces[protected[weld[faces]].any(axis=1)]].ravel())
                new = adjacent[~protected[adjacent]]
                taper[new] = amount
                protected[new] = True
            movement *= taper[weld]
        movement[movement <= 1e-7] = 0
        p[:, 2] -= (movement / scale).astype(np.float32)
        moved = movement > 1e-7
        receipt.update(geometry_change='Eye-band depth only; raised vertices eased back to adjacent face surface',
                       moved_vertices=int(moved.sum()), max_depth_change_m=float(movement.max()),
                       bounds_m={'x_abs': [.012, .088], 'y': [1.064, 1.099], 'z_min': .04},
                       reference_surface='z = 0.079 - 3.6*x*x, smooth regional weight',
                       x_y_unchanged=bool(np.array_equal(p[:, :2], original[:, :2])))
        if name in ('03-clean', '04-border', '05-safe'):
            receipt['geometry_change'] = 'Reduce forward eye-band protrusion by 60%, with regional falloff'
            receipt['material_filter'] = 'Viewer-only bilateral 5x5 texture sampling, 1.5 texel spacing; no atlas repaint'
            if name == '04-border':
                receipt['border_fix'] = 'Crossing border vertices fixed; matching UV seam vertices share 0/0.25/0.75 ring taper'
            elif name == '05-safe':
                receipt['geometry_change'] = 'Reduce forward eye-band protrusion by 20%, with regional falloff'
        # Material is unlit, so the original normals have no effect on the candidate's appearance.
        # Keep them with all other attributes to avoid incidental edits outside the authorised patch.
        assert np.array_equal(p[~moved], original[~moved])
    else:
        assert data == binary
    assert np.array_equal(accessor(2, data), accessor(2, binary))
    assert np.array_equal(accessor(3, data), accessor(3, binary))
    image_view = j['bufferViews'][j['images'][0]['bufferView']]
    lo = image_view.get('byteOffset', 0); hi = lo + image_view['byteLength']
    assert data[lo:hi] == binary[lo:hi]
    encoded = json.dumps(doc, separators=(',', ':')).encode(); encoded += b' ' * (-len(encoded) % 4)
    content = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(encoded) + 8 + len(data))
    content += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
    content += struct.pack('<II', len(data), 0x004E4942) + data
    dest = OUT / name; dest.mkdir(parents=True, exist_ok=True)
    (dest / 'mio.glb').write_bytes(content)
    receipt['output_sha256'] = hashlib.sha256(content).hexdigest()
    (dest / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(name, json.dumps(receipt))
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == hashlib.sha256(a).hexdigest()
