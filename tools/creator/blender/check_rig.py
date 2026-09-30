# Check that an exported GLB keeps the original rig exactly: same bone names, same node rest transforms
# (translation, rotation, scale) and same parents, so the game's clips play on it unchanged.
#   python3 tools/creator/blender/check_rig.py <original.glb> <new.glb>
import json
import struct
import sys


def gltf(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    return json.loads(b[20:20 + n])


def bones(j):
    joints = set(j['skins'][0]['joints'])
    parent = {c: i for i, nd in enumerate(j['nodes']) for c in nd.get('children', [])}
    out = {}
    for i in joints:
        nd = j['nodes'][i]
        out[nd['name']] = (nd.get('translation', [0, 0, 0]), nd.get('rotation', [0, 0, 0, 1]), nd.get('scale', [1, 1, 1]),
                           j['nodes'][parent[i]]['name'] if i in parent else None)
    # the armature node above the root bone carries Eric's 0.01 scale
    roots = [i for i in joints if parent.get(i) not in joints]
    top = [(j['nodes'][parent[r]].get('name'), j['nodes'][parent[r]].get('scale'), j['nodes'][parent[r]].get('rotation')) for r in roots if r in parent]
    return out, top


a, ta = bones(gltf(sys.argv[1]))
b, tb = bones(gltf(sys.argv[2]))
bad = 0
for name, (t, r, s, p) in a.items():
    if name not in b:
        print('missing', name)
        bad += 1
        continue
    t2, r2, s2, p2 = b[name]
    d = max(max(abs(x - y) for x, y in zip(t, t2)), min(max(abs(x - y) for x, y in zip(r, r2)), max(abs(x + y) for x, y in zip(r, r2))),
            max(abs(x - y) for x, y in zip(s, s2)))
    if d > 1e-3 or p != p2:
        print('differs', name, round(d, 5), p, p2)
        bad += 1
print('armature node', ta, 'vs', tb)
print('rig', 'OK' if not bad else f'{bad} differences', len(a), 'bones')
sys.exit(1 if bad else 0)
