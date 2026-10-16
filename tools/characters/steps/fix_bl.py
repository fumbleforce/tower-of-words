"""Blender (background): the head-scale and recolour steps on Meshy's rigged file. Lifted from
art/candidates/carina-meshy-1/fix_bl.py (carina-2 round 2: "Her head should be 15% smaller. Her pants should be a
different color") with Carina's pieces, pivot and colours as options; its seam repaint is left out (texture marks are
re-rolled, never painted). Nothing else of the model changes; the rig's joints and weights stay.

  head=<k>        the head pieces (head=<i,j>, piece numbers biggest first) scaled uniformly by k about the head joint
                  at the top of the neck (pivot=<x,y,z>, glTF metres, y up, front +z; default the rig's Head joint).
                  The body is untouched, and the game stands every model at its own height, so the height stays and
                  the head is smaller beside the body.
  recolour=<piece>:<r>,<g>,<b>
                  that piece's UV islands (and their padding) recoloured: each texel keeps its brightness relative to
                  the piece's middle brightness (the shading and folds), on the new base colour (sRGB at the middle
                  brightness). Shoes are separate pieces and stay.
  expect=<n,n,..> the piece sizes (vertex counts, biggest first) the options were written for; fails on another model.

  blender -b -P tools/characters/steps/fix_bl.py -- <in glb> <out glb> [head=0.85 heads=0,2 pivot=0,0.635,-0.0026]
          [recolour=3:122,122,124] [expect=735,648,...]
Also writes <out>.png, the texture.
"""
import bpy, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
opt = dict(kv.split('=', 1) for kv in argv[2:])
HEAD = float(opt.get('head', '1'))
HEADS = [int(i) for i in opt.get('heads', '0,2').split(',')]   # the head pieces (carina-2: pieces 0 and 2)
RECOLOUR = opt.get('recolour')                                # '<piece>:<r>,<g>,<b>'
PIVOT = tuple(float(c) for c in opt['pivot'].split(',')) if 'pivot' in opt else None

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent and o.parent.type == 'ARMATURE')
me = ob.data
Mw = ob.matrix_world
nv = len(me.vertices)
L = np.empty(nv * 3); me.vertices.foreach_get('co', L); L = L.reshape(-1, 3)
Wb = np.array([Mw @ Vector(c) for c in L])
G = np.c_[Wb[:, 0], Wb[:, 2], -Wb[:, 1]]                  # glTF space: y up, front +z
tris = np.array([p.vertices[:] for p in me.polygons])
assert tris.shape[1] == 3

# pieces, as rei-rig-1/joints.py pieces(): connected parts of the position-welded mesh, biggest first
par = np.arange(nv)


def find(a):
    while par[a] != a:
        par[a] = par[par[a]]; a = par[a]
    return a


key = {}
rep = np.array([key.setdefault(tuple(np.round(v, 4)), i) for i, v in enumerate(G)])
for a, b, c in rep[tris]:
    for x, y in ((a, b), (b, c)):
        ra, rb = find(x), find(y)
        if ra != rb:
            par[ra] = rb
comp = np.array([find(r) for r in rep])
u, cnt = np.unique(comp, return_counts=True)
order = {c: k for k, c in enumerate(u[np.argsort(-cnt, kind='stable')])}
piece = np.array([order[c] for c in comp])
sizes = [int((piece == k).sum()) for k in range(len(u))]
print('PIECES', sizes)
if 'expect' in opt:
    assert sizes == [int(n) for n in opt['expect'].split(',')], 'not the model these settings are for'
fp = piece[tris[:, 0]]
if PIVOT is None:                                         # the rig's Head joint, in glTF metres
    arm = ob.parent
    hb = arm.data.bones['Head'].head_local
    w = arm.matrix_world @ hb
    PIVOT = (w.x, w.z, -w.y)

# the texture (Blender keeps image rows bottom-up and flips glTF's v, so v here indexes rows from the bottom)
img = next(i for i in bpy.data.images if i.size[0] > 0)
W, H = img.size
px = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(px)
tex = px.reshape(H, W, 4)
uvl = me.uv_layers.active.data
UVc = np.empty(len(uvl) * 2); uvl.foreach_get('uv', UVc); UVc = UVc.reshape(-1, 2)
loops = np.array([p.loop_indices[:] for p in me.polygons])
UVt = UVc[loops] * [W, H]                                 # (faces, 3, 2) in pixels


def raster(faces):
    """Pixels inside the UV triangles of these faces: (rows, cols, face, barycentric weights)."""
    R, C, F, B = [], [], [], []
    for f in faces:
        t = UVt[f]
        x0, y0 = np.floor(t.min(0)).astype(int); x1, y1 = np.ceil(t.max(0)).astype(int)
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, W)), np.arange(max(y0, 0), min(y1 + 1, H)))
        p = np.c_[xs.ravel() + 0.5, ys.ravel() + 0.5]
        a, b, c = t
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9:
            continue
        w0 = ((b[1] - c[1]) * (p[:, 0] - c[0]) + (c[0] - b[0]) * (p[:, 1] - c[1])) / d
        w1 = ((c[1] - a[1]) * (p[:, 0] - c[0]) + (a[0] - c[0]) * (p[:, 1] - c[1])) / d
        w = np.c_[w0, w1, 1 - w0 - w1]
        m = (w >= -0.02).all(1)
        R.append(ys.ravel()[m]); C.append(xs.ravel()[m]); F.append(np.full(m.sum(), f)); B.append(w[m])
    return np.concatenate(R), np.concatenate(C), np.concatenate(F), np.concatenate(B)


_own = []


def owner_map():
    """Each texel's piece: its own triangle's, padding texels the nearest triangle's (12 rounds of growing)."""
    if _own:
        return _own[0]
    own = np.full((H, W), -1)
    r, c, f, _ = raster(range(len(tris)))
    own[r, c] = fp[f]
    for _ in range(12):
        grow = own.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(own, dy, 0), dx, 1)
            grow = np.where((grow < 0) & (sh >= 0), sh, grow)
        own = grow
    _own.append(own)
    return own


rgb = tex[:, :, :3]
luma = lambda a: a @ np.array([0.2126, 0.7152, 0.0722])
if HEAD != 1:
    piv_l = Mw.inverted() @ Vector((PIVOT[0], -PIVOT[2], PIVOT[1]))
    piv_l = np.array(piv_l)
    hv = np.isin(piece, HEADS)
    L[hv] = piv_l + HEAD * (L[hv] - piv_l)
    me.vertices.foreach_set('co', L.ravel())
    me.update()
    print('HEAD scaled', HEAD, 'vertices', int(hv.sum()), 'pivot (glTF)', PIVOT)

if RECOLOUR:
    P_RE = int(RECOLOUR.split(':')[0])
    own = owner_map()
    m = own == P_RE
    tr = np.where(fp == P_RE)[0]
    r, c, f, _ = raster(tr)
    mid = np.median(luma(rgb[r, c]))
    k = np.clip(luma(rgb[m]) / mid, 0.35, 1.8)[:, None]
    base = np.array([int(v) for v in RECOLOUR.split(':')[1].split(',')]) / 255.0   # byte images keep sRGB in .pixels
    rgb[m] = np.clip(base * k, 0, 1)
    print('RECOLOUR', RECOLOUR, 'texels', int(m.sum()), 'middle luma', round(float(mid), 4))

tex[:, :, :3] = rgb
img.pixels.foreach_set(tex.ravel())
img.update()
png = out.rsplit('.', 1)[0] + '.png'
img.filepath_raw = png; img.file_format = 'PNG'; img.save()
# the import packed Meshy's original into the file, and the exporter would write that: point the material at the
# edited PNG instead
new = bpy.data.images.load(png)
for mat in bpy.data.materials:
    for nd in (mat.node_tree.nodes if mat.use_nodes else []):
        if nd.type == 'TEX_IMAGE' and nd.image == img:
            nd.image = new
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_skins=True,
                          export_yup=True, export_apply=False, export_image_format='AUTO')
print('WROTE', out, png)
