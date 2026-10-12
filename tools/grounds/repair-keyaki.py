"""Rebuild the two existing zelkova trunks without remaking other planting assets.

blender -b --factory-startup -P tools/grounds/repair-keyaki.py -- <source.glb> <output.glb>
The full planting generator uses the same joined skeleton for subsequent builds.
"""
import importlib.util
import os
from pathlib import Path
import sys
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
source, output = map(os.path.abspath, args)
spec = importlib.util.spec_from_file_location('planting', Path(__file__).with_name('planting.py'))
plants = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plants)
new = [plants.keyaki('trunk_keyaki', 3, 4, 0.03), plants.keyaki('trunk_keyaki_b', 8, 5, -0.05)]
material = plants.material()
for ob in new + plants.LIGHT:
    ob.data.materials.append(material)
    print(ob.name, len(ob.data.polygons), 'triangles')
Path(output).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=output + '.trunks.glb', export_format='GLB', export_yup=False,
                          export_apply=True, export_vertex_color='MATERIAL', export_normals=False,
                          export_texcoords=False, export_materials='EXPORT', export_extras=True)
# Replace only the four trunk meshes, preserving all other asset bytes and metadata.
import copy
import json
import struct

def read_glb(path):
    data = Path(path).read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + length]), data[28 + length:]

original, original_bytes = read_glb(source)
replacement, replacement_bytes = read_glb(output + '.trunks.glb')
views = original['bufferViews']
accessors = original['accessors']
view_offset, accessor_offset = len(views), len(accessors)
binary = bytearray(original_bytes)
while len(binary) % 4:
    binary.append(0)
byte_offset = len(binary)
binary.extend(replacement_bytes)
for view in replacement['bufferViews']:
    view = copy.deepcopy(view)
    view['byteOffset'] = view.get('byteOffset', 0) + byte_offset
    views.append(view)
for accessor in replacement['accessors']:
    accessor = copy.deepcopy(accessor)
    accessor['bufferView'] += view_offset
    accessors.append(accessor)
by_name = {node['name']: node for node in original['nodes']}
for node in replacement['nodes']:
    target = by_name[node['name']]
    mesh = copy.deepcopy(replacement['meshes'][node['mesh']])
    for primitive in mesh['primitives']:
        primitive['indices'] += accessor_offset
        primitive['attributes'] = {k: v + accessor_offset for k, v in primitive['attributes'].items()}
        primitive['material'] = original['meshes'][target['mesh']]['primitives'][0]['material']
    original['meshes'][target['mesh']] = mesh
    target['extras'] = node['extras']
# Compact the live mesh accessors and buffers, so repeated repairs never grow the library.
used = set()
for mesh in original['meshes']:
    for primitive in mesh['primitives']:
        used.add(primitive['indices'])
        used.update(primitive['attributes'].values())
new_accessors, new_views, packed, mapping = [], [], bytearray(), {}
for old in sorted(used):
    accessor = copy.deepcopy(accessors[old])
    view = copy.deepcopy(views[accessor['bufferView']])
    start, length = view.get('byteOffset', 0), view['byteLength']
    while len(packed) % 4:
        packed.append(0)
    view['byteOffset'] = len(packed)
    packed.extend(binary[start:start + length])
    accessor['bufferView'] = len(new_views)
    mapping[old] = len(new_accessors)
    new_accessors.append(accessor)
    new_views.append(view)
for mesh in original['meshes']:
    for primitive in mesh['primitives']:
        primitive['indices'] = mapping[primitive['indices']]
        primitive['attributes'] = {k: mapping[v] for k, v in primitive['attributes'].items()}
original['accessors'], original['bufferViews'] = new_accessors, new_views
original['buffers'] = [{'byteLength': len(packed)}]
encoded = json.dumps(original, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
packed += b'\0' * (-len(packed) % 4)
Path(output).write_bytes(struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(packed)) +
                         struct.pack('<II', len(encoded), 0x4e4f534a) + encoded +
                         struct.pack('<II', len(packed), 0x004e4942) + packed)
Path(output + '.trunks.glb').unlink()
print('Repaired keyaki trunks:', output)
