"""Assemble Mio from separately generated parts (#171 parts method, reviews/char-mio-parts-1). Blender, run with -t 8:

  blender -b -t 8 -P tools/characters/parts/assemble.py -- <attempt> <body.glb> <head.glb> [key=value ...]

Placement comes from the target picture (3072 px, art/parts/style-concepts/mio-ref-clean/final.png): each part was cut
from it, so each mesh's front width and top/bottom map back to known pixel boxes. The body sets the scale (its
sleeve-to-sleeve width against the picture's) and the feet sit on the floor; the head is scaled by its width and its
top goes where the hair top is in the picture. Depth: the head's neck is centred on the body's neck opening.
Options: trim=1 deletes the hood Meshy closed over the missing head (body vertices above the picture's collar line,
collar=<px>, default 850, over trim_x=<px>,<px>, default the hair's span); lining=ring|plane adds a dark
piece behind the neck where the hood's inside shows in the picture; dz=<px> nudges the head up/down in picture pixels; dy=<m> nudges it forward/back.
Writes <out>/<attempt>/mio.blend and mio-full.glb (all generated detail, for stills) in the main checkout's
art/parts/char-mio-parts/ (git-ignored), and a placement record next to them.
"""
import bpy, bmesh, json, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
attempt, body_glb, head_glb = argv[:3]
opt = dict(kv.split('=', 1) for kv in argv[3:])
OUT = f'/home/jorgen/repo/japanese/art/parts/char-mio-parts/{attempt}'
os.makedirs(OUT, exist_ok=True)

# picture boxes (px) of each part, from tools/characters/parts/inputs.py cuts
BODY_X = (1081, 1989); FLOOR = 2898          # sleeve to sleeve; soles
HEAD_X = (1249, 1810); HEAD_TOP = 215        # hair box
NECK_PX = (1538, 830)                        # centre of the neck cut
HEIGHT = 1.60                                # final standing height in metres (top of hair)


def load(path, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    mesh = [o for o in new if o.type == 'MESH'][0]
    for o in new:
        if o is not mesh: bpy.data.objects.remove(o)
    mesh.name = name
    mesh.data.materials[0].name = name
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh.select_set(False)
    return mesh


def verts(o):
    a = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', a); return a.reshape(-1, 3)


def set_verts(o, v):
    o.data.vertices.foreach_set('co', v.ravel()); o.data.update()


bpy.ops.wm.read_factory_settings(use_empty=True)
body, head = load(body_glb, 'body'), load(head_glb, 'head')
B, H = verts(body), verts(head)

# body: picture px -> metres via its front width; soles at z=0, centred on x
k = (B[:, 0].max() - B[:, 0].min()) / (BODY_X[1] - BODY_X[0])
B[:, 2] -= B[:, 2].min()
bx_px = (BODY_X[0] + BODY_X[1]) / 2
B[:, 0] -= (B[:, 0].max() + B[:, 0].min()) / 2
px = lambda x, y: ((x - bx_px) * k, (FLOOR - y) * k)            # picture px -> (x, z) metres

# head: scale by width, top to the hair top
s = (HEAD_X[1] - HEAD_X[0]) * k / (H[:, 0].max() - H[:, 0].min())
H *= s
hx, hz = px((HEAD_X[0] + HEAD_X[1]) / 2, HEAD_TOP)
H[:, 0] += hx - (H[:, 0].max() + H[:, 0].min()) / 2
H[:, 2] += hz - H[:, 2].max() + float(opt.get('dz', 0)) * -k

# depth: centre the head's neck (its vertices within 25 px of the neck cut, near the middle) on the body's neck
nx, nz = px(*NECK_PX)
near = lambda V, r: V[(np.abs(V[:, 0] - nx) < 40 * k) & (np.abs(V[:, 2] - nz) < r * k)]
hn, bn = near(H, 25), near(B, 60)
head_neck_y = (hn[:, 1].min() + hn[:, 1].max()) / 2 if len(hn) else H[:, 1].mean()
body_neck_y = (bn[:, 1].min() + bn[:, 1].max()) / 2 if len(bn) else B[:, 1].mean()
H[:, 1] += body_neck_y - head_neck_y + float(opt.get('dy', 0))

set_verts(body, B); set_verts(head, H)

trimmed = 0
if opt.get('trim') == '1':
    # Meshy closed the hood up round the missing head, to her chin. In the picture the collar sits at the base of
    # the neck (y=850 px), so body vertices above that line and inside the head's left-right span go, except what
    # lies behind the back of the hair (the hood resting on her back).
    cz = px(0, float(opt.get('collar', 850)))[1]
    hb = H[H[:, 2] > cz]
    back = hb[:, 1].max() if len(hb) else 1e9
    x0, x1 = (px(float(v), 0)[0] for v in opt.get('trim_x', f'{HEAD_X[0]},{HEAD_X[1]}').split(','))
    inside = np.where((B[:, 2] > cz) & (B[:, 0] > x0) & (B[:, 0] < x1) & (B[:, 1] < back))[0]
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in inside], context='VERTS')
    bm.to_mesh(body.data); bm.free(); trimmed = len(inside)

parts = [body, head]
if opt.get('lining') in ('1', 'ring', 'plane'):
    # The trimmed hood leaves open sky under the back hair's hem beside her neck. In the picture that is the dark
    # inside of the hood. lining=ring (a05, a06): a dark band round the back of the neck, open at the front
    # (lining_open degrees each side), radius lining_r px; it sat in front of the green underside of the back hair.
    # lining=plane (a07 on): a flat dark card just behind the back hair, from the collar to lining_top px.
    import math
    z0, z1 = px(0, float(opt.get('collar', 850)) + 30)[1], px(0, float(opt.get('lining_top', 740)))[1]
    bm = bmesh.new()
    if opt['lining'] == 'plane':
        band = H[(H[:, 2] > z0) & (H[:, 2] < z1)]
        yb = np.percentile(band[:, 1], 98) + 12 * k
        xa, xb = (px(float(v), 0)[0] for v in opt.get('lining_x', '1380,1700').split(','))
        q = [bm.verts.new(c) for c in ((xa, yb, z0), (xb, yb, z0), (xb, yb, z1), (xa, yb, z1))]
        bm.faces.new(q)
    else:
        r = float(opt.get('lining_r', 150)) * k
        half = math.radians(float(opt.get('lining_open', 35)))
        cy = body_neck_y; n = 32; ring = []
        for i in range(n + 1):
            a = half + (2 * math.pi - 2 * half) * i / n          # 0 = straight in front of her (-Y)
            x, y = nx + r * math.sin(a), cy - r * math.cos(a)
            ring.append((bm.verts.new((x, y, z0)), bm.verts.new((x, y, z1))))
        for (a0, a1), (b0, b1) in zip(ring, ring[1:]):
            bm.faces.new((a0, b0, b1, a1))
    me = bpy.data.meshes.new('lining'); bm.to_mesh(me); bm.free()
    lin = bpy.data.objects.new('lining', me); bpy.context.scene.collection.objects.link(lin)
    mat = bpy.data.materials.new('lining'); mat.use_nodes = True
    mat.use_backface_culling = True     # a10: from behind the card showed over the hair; it faces her front only
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.022, 0.027, 0.03, 1)     # the hood's shadowed inside, sampled sRGB #29 2e 31
    bsdf.inputs['Roughness'].default_value = 1.0
    me.materials.append(mat)
    parts.append(lin)

# final scale: top of hair at HEIGHT
top = max(verts(head)[:, 2].max(), verts(body)[:, 2].max())
for o in parts:
    V = verts(o) * (HEIGHT / top); set_verts(o, V)

rec = {'attempt': attempt, 'body': body_glb, 'head': head_glb, 'options': opt, 'metres_per_px': k * HEIGHT / top,
       'head_scale': s, 'trimmed_body_vertices': trimmed,
       'faces': {'body': len(body.data.polygons), 'head': len(head.data.polygons)}}
json.dump(rec, open(f'{OUT}/placement.json', 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/mio.blend')
bpy.ops.export_scene.gltf(filepath=f'{OUT}/mio-full.glb', export_format='GLB', use_selection=False)
print('ASSEMBLED', json.dumps(rec))
