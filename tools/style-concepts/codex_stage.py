"""Offline Blender recreation using actual forecourt meshes and runtime camera fits.

Run under the render lock, after codex_scene.mjs:
  blender -b -t 8 -P tools/style-concepts/codex_stage.py -- /absolute/attempt-dir [/tmp/codex-forecourt.json] [desk,phone]

Staging note: this is a character-scale comparison, not a story event. Mio and Eric stand on
walkable paving on the forecourt's main east-west path. Mio is west of Eric. Both face south,
with relaxed forward eyelines and no motion. Desktop looks north/down at the actual 46 degree
runtime elevation; phone looks east-north-east/down at 33 degrees. Buildings and garden beds
surround the paving; the southern town is behind the desktop lens. All shoes rest on the
paving. Eric is normalized to the loader's 1.2 m height, then the place's 1.18 multiplier.
Mio keeps her model's height relative to Eric.
Light follows the exported outdoor sun and fill directions. No additional scenery is invented.
The PNGs are offline Cycles renders, not captures from the game's WebGL framebuffer; canvas
signage, textures, UI, shader surface treatment and game post-processing are omitted.
"""
import gzip
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit

args = kit.args()
out = Path(args[0]).resolve()
source = Path(args[1] if len(args) > 1 else '/tmp/codex-forecourt.json').resolve()
views = args[2].split(',') if len(args) > 2 else ['desk', 'phone']
outputs = [out / 'forecourt-manifest.json', out / 'forecourt-scene.json.gz', out / 'codex_stage.py', out / 'codex_scene.mjs']
for view in views:
    outputs.extend(out / 'renders' / f'game-forecourt-{view}{suffix}.png' for suffix in ('', '-crop'))
for path in outputs:
    if path.exists():
        raise RuntimeError(f'Keep every attempt: output already exists: {path}')
raw = gzip.decompress(source.read_bytes()) if source.suffix == '.gz' else source.read_bytes()
data = json.loads(raw)
if any(view not in data['cameras'] for view in views):
    raise ValueError('View must be desk or phone')
bpy.ops.wm.open_mainfile(filepath=str(out / 'study.blend'))
sc = bpy.context.scene

# Three.js Y-up to Blender Z-up. This is a proper rotation, keeping the winding unchanged.
convert = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
def matrix(values):
    return Matrix([values[i:i + 4] for i in range(0, 16, 4)]).transposed()

def world_point(p):
    return convert @ Vector(p)

characters = {}
kept = set()
reference = bpy.data.collections['eric']
reference_arm = next(o for o in reference.all_objects if o.type == 'ARMATURE')
kit.pose_at(reference_arm, None, 1)
reference_arm.location = (0, 0, 0)
reference_arm.rotation_euler = (0, 0, 0)
reference_arm.scale = (1, 1, 1)
bpy.context.view_layer.update()
reference_lo, reference_hi = kit.bounds(list(reference.all_objects))
shared_scale = data['scale']['stagedHeight'] / (reference_hi.z-reference_lo.z)
for name, at in data['characters'].items():
    coll = bpy.data.collections[name]
    coll.hide_render = False
    coll.hide_viewport = False
    objs = list(coll.all_objects)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    kit.pose_at(arm, None, 1)
    arm.location = (0, 0, 0)
    arm.rotation_euler = (0, 0, 0)
    arm.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    lo, hi = kit.bounds(objs)
    scale = shared_scale
    arm.scale = (scale,) * 3
    arm.location = world_point(at) + Vector((0, 0, -lo.z * scale))
    bpy.context.view_layer.update()
    placed_lo, placed_hi = kit.bounds(objs)
    if abs(placed_lo.z) > 0.001 or abs(placed_hi.z - (hi.z-lo.z)*scale) > 0.001:
        raise RuntimeError(f'{name}: unexpected placed bounds {placed_lo}, {placed_hi}')
    characters[name] = {'sourceHeight': hi.z - lo.z, 'objectScale': scale,
                        'runtimeHeight': placed_hi.z - placed_lo.z, 'positionThree': at,
                        'boundsBlender': [list(placed_lo), list(placed_hi)]}
    kept.update(objs)
for obj in list(bpy.data.objects):
    if obj not in kept:
        bpy.data.objects.remove(obj, do_unlink=True)

coll = bpy.data.collections.new('actual forecourt geometry')
sc.collection.children.link(coll)
materials = []
for i, item in enumerate(data['materials']):
    m = bpy.data.materials.new(f'forecourt material {i}')
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes.get('Principled BSDF')
    base = (*item['color'], 1)
    bs.inputs['Base Color'].default_value = base
    bs.inputs['Roughness'].default_value = item['roughness']
    bs.inputs['Metallic'].default_value = item['metalness']
    bs.inputs['Alpha'].default_value = item['opacity']
    bs.inputs['Emission Color'].default_value = (*item['emissive'], 1)
    bs.inputs['Emission Strength'].default_value = item['emissiveIntensity']
    if item['vertexColors']:
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'game colors'
        mul = nt.nodes.new('ShaderNodeMixRGB')
        mul.blend_type = 'MULTIPLY'
        mul.inputs[0].default_value = 1
        mul.inputs[1].default_value = base
        nt.links.new(vc.outputs['Color'], mul.inputs[2])
        nt.links.new(mul.outputs[0], bs.inputs['Base Color'])
    if item['unlit']:
        if bs.inputs['Base Color'].links:
            nt.links.new(bs.inputs['Base Color'].links[0].from_socket, bs.inputs['Emission Color'])
        bs.inputs['Emission Color'].default_value = base
        bs.inputs['Emission Strength'].default_value = 1
        bs.inputs['Base Color'].default_value = (0, 0, 0, 1)
    materials.append(m)

scene_objects = []
for index, item in enumerate(data['meshes']):
    verts = np.asarray(item['positions'], dtype=np.float32).reshape((-1, 3))
    indices = item['indices'] if item['indices'] is not None else range(len(verts))
    faces = np.asarray(indices, dtype=np.int32).reshape((-1, 3))
    mesh = bpy.data.meshes.new(item['name'])
    mesh.from_pydata(verts.tolist(), [], faces.tolist())
    mesh.update()
    if item['normals']:
        mesh.normals_split_custom_set_from_vertices(np.asarray(item['normals']).reshape((-1, 3)).tolist())
    for mat_id in item['materials']:
        mesh.materials.append(materials[mat_id])
    for group in item['groups']:
        for poly in mesh.polygons[group['start'] // 3:(group['start'] + group['count']) // 3]:
            poly.material_index = group['materialIndex']
    if item['colors']:
        colors = np.asarray(item['colors'], dtype=np.float32).reshape((-1, 3))
        attr = mesh.color_attributes.new(name='game colors', type='FLOAT_COLOR', domain='POINT')
        rgba = np.column_stack((colors, np.ones(len(colors), dtype=np.float32)))
        attr.data.foreach_set('color', rgba.ravel())
    obj = bpy.data.objects.new(item['name'], mesh)
    coll.objects.link(obj)
    obj.matrix_world = convert @ matrix(item['matrix'])
    obj.visible_shadow = item['castShadow']
    scene_objects.append((obj, item['views']))

sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 24
sc.cycles.use_denoising = True
sc.render.threads_mode = 'FIXED'
sc.render.threads = 8
sc.render.film_transparent = False
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0
sc.view_settings.gamma = 1
world = bpy.data.worlds.new('forecourt daylight')
world.use_nodes = True
sc.world = world
bg = world.node_tree.nodes.get('Background')
hemi = next(light for light in data['lights'] if light['type'] == 'HemisphereLight')
bg.inputs[0].default_value = (*hemi['color'], 1)
bg.inputs[1].default_value = 0.8
for index, light in enumerate(data['lights']):
    if light['type'] != 'DirectionalLight':
        continue
    ld = bpy.data.lights.new(f'game sun {index}', 'SUN')
    ld.color = light['color']
    ld.energy = light['intensity']
    ld.angle = math.radians(8)
    obj = bpy.data.objects.new(ld.name, ld)
    sc.collection.objects.link(obj)
    obj.location = world_point(light['position'])
    target = world_point(light['target'] or [0, 0, 0])
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()

cam = bpy.data.objects.new('exported game camera', bpy.data.cameras.new('exported game camera'))
sc.collection.objects.link(cam)
sc.camera = cam
manifest = {'label': data['label'], 'sceneSHA256': hashlib.sha256(raw).hexdigest(), 'scale': data['scale'],
            'characters': characters, 'cameras': {}, 'render': {'engine': 'Cycles CPU', 'samples': 24,
                      'lighting': 'Exported directional light directions/colors/intensities; hemisphere approximated by world strength 0.8'},
            'omitted': data['omitted'], 'staging': __doc__}
for view in views:
    spec = data['cameras'][view]
    width, height = spec['resolution']
    sc.render.resolution_x, sc.render.resolution_y = width, height
    cam.matrix_world = convert @ matrix(spec['matrix'])
    cam.data.type = 'PERSP'
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.sensor_height = 32
    cam.data.lens = cam.data.sensor_height / (2 * math.tan(math.radians(spec['fov']) / 2))
    cam.data.clip_start, cam.data.clip_end = spec['near'], spec['far']
    for obj, obj_views in scene_objects:
        obj.hide_render = view not in obj_views
    bpy.context.view_layer.update()
    image_path = out / 'renders' / f'game-forecourt-{view}.png'
    kit.render(str(image_path))
    # A literal pixel crop of both bodies, kept at native resolution. No second camera or enlarged render.
    projected = []
    for info in characters.values():
        lo, hi = info['boundsBlender']
        for x in (lo[0], hi[0]):
            for y in (lo[1], hi[1]):
                for z in (lo[2], hi[2]):
                    projected.append(world_to_camera_view(sc, cam, Vector((x, y, z))))
    x0 = max(0, math.floor(min(p.x for p in projected) * width) - 18)
    y0 = max(0, math.floor(min(p.y for p in projected) * height) - 18)
    x1 = min(width, math.ceil(max(p.x for p in projected) * width) + 18)
    y1 = min(height, math.ceil(max(p.y for p in projected) * height) + 18)
    if x1 <= x0 or y1 <= y0:
        raise RuntimeError(f'{view}: character crop outside frame')
    img = bpy.data.images.load(str(image_path), check_existing=False)
    pixels = np.empty(width * height * 4, dtype=np.float32)
    img.pixels.foreach_get(pixels)
    cropped = pixels.reshape((height, width, 4))[y0:y1, x0:x1].copy()
    crop = bpy.data.images.new(f'{view} actual pixel crop', x1 - x0, y1 - y0, alpha=True)
    crop.pixels.foreach_set(cropped.ravel())
    crop.filepath_raw = str(out / 'renders' / f'game-forecourt-{view}-crop.png')
    crop.file_format = 'PNG'
    crop.save()
    bpy.data.images.remove(img)
    bpy.data.images.remove(crop)
    manifest['cameras'][view] = {**spec, 'cropPixelsBottomLeft': [x0, y0, x1, y1]}

(out / 'forecourt-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
with gzip.open(out / 'forecourt-scene.json.gz', 'wb') as handle:
    handle.write(raw)
for name in ('codex_stage.py', 'codex_scene.mjs'):
    shutil.copyfile(Path(__file__).parent / name, out / name)
print('STAGED', out, 'offline Blender recreation; game framebuffer unavailable')
