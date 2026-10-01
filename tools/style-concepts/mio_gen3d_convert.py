"""CPU-only PLY-to-GLB packaging for the raw TripoSG viewer, without mesh processing.

Run with ~/ai/triposg/venv/bin/python tools/style-concepts/mio_gen3d_convert.py.
The raw PLY remains untouched; no simplification, remesh, rig or generation runs.
"""
import hashlib
import json
from pathlib import Path

import trimesh

import mio_gen3d_paths as P

d = Path(P.RAW) / 'triposg-single'
src = d / 'model.ply'
dst = d / 'viewer.glb'
mesh = trimesh.load(src, process=False, force='mesh')
mesh.export(dst)
copy = trimesh.load(dst, process=False, force='mesh')
assert len(copy.vertices) == len(mesh.vertices)
assert (copy.vertices == mesh.vertices).all()
assert (copy.faces == mesh.faces).all()
receipt = {
    'operation': 'PLY to GLB for browser display; process=False, no geometry changes',
    'source': src.name,
    'source_sha256': hashlib.sha256(src.read_bytes()).hexdigest(),
    'output': dst.name,
    'output_sha256': hashlib.sha256(dst.read_bytes()).hexdigest(),
    'vertices': len(mesh.vertices),
    'faces': len(mesh.faces),
    'verified': 'all vertex coordinates and face indices equal after reload',
}
(d / 'viewer-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
