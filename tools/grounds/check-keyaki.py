"""Check repaired keyaki topology and unchanged meshes against the previous library."""
import json
from pathlib import Path
import struct
import sys

def meshes(path):
    data = Path(path).read_bytes()
    n = struct.unpack_from('<I', data, 12)[0]
    doc, binary = json.loads(data[20:20 + n]), data[28 + n:]
    def accessor(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        count = a['count'] * {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
        values = struct.unpack_from('<' + str(count) + {5126: 'f', 5123: 'H', 5125: 'I', 5121: 'B'}[a['componentType']], binary, start)
        return values
    return {node['name']: {k: accessor(v) for p in doc['meshes'][node['mesh']]['primitives']
                           for k, v in dict(p['attributes'], indices=p['indices']).items()}
            for node in doc['nodes'] if 'mesh' in node}

new = meshes(sys.argv[1])
old = meshes(sys.argv[2]) if len(sys.argv) > 2 else None
for name, mesh in new.items():
    if not name.startswith('trunk_keyaki'):
        if old:
            assert mesh == old[name], f'{name} changed outside the repair'
        continue
    parent = list(range(len(mesh['POSITION']) // 3))
    def root(i):
        while parent[i] != i:
            i = parent[i]
        return i
    indices = mesh['indices']
    edges = {}
    for i in range(0, len(indices), 3):
        face = indices[i:i + 3]
        for j in face[1:]:
            parent[root(j)] = root(face[0])
        for a, b in zip(face, face[1:] + face[:1]):
            key = tuple(sorted((a, b)))
            edges[key] = edges.get(key, 0) + 1
    components = len({root(i) for i in range(len(parent))})
    assert components == 1, f'{name}: {components} disconnected components'
    assert all(count == 2 for count in edges.values()), f'{name}: open or non-manifold surface'
    print(name, 'one closed connected surface,', len(indices) // 3, 'triangles')
print('PASS: keyaki joins and unchanged library meshes')
