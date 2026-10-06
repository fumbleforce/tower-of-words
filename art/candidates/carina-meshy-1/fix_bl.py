"""carina-2 round 2 (reviews/carina-meshy-1; Jørgen on carina-2: "she has a small seam at the waist. Her head should
be 15% smaller. Her pants should be a different color"). Blender edits on her Meshy file (carina-2-tex-rigged.glb,
Meshy's auto-rig, which rig.py replaces with ours); nothing else of the model changes. No new Meshy generation.

  seam      The seam is in the texture, not the mesh or the rig: her top is closed under the hem by a ring of
            downward faces, and Meshy's texture pass painted that ring skin-beige and let the beige run onto the
            trouser faces where they meet it (3D height 0.384-0.395 m). From eye level it shows as a dotted light line
            under the hem. Fix: the ring's UV triangles are filled with the top's own colour at the hem, and the
            light texels of the trouser faces in that band take the trousers' colour.
  head=0.85 The head pieces (hair, face) scaled uniformly about the head joint at the top of the neck (rig.py's
            Head, metres (0, 0.635, -0.003), y up, front +z). The body is untouched, so the rig's joints and weights
            come out the same; the game and the viewers stand every model at its own height, so her height stays
            and her head is 15% smaller beside her body.
  trousers=denim|grey|none
            The trousers piece's UV islands (and their padding) recoloured: each texel keeps its brightness relative
            to the trousers' middle brightness (the shading and folds), on a new base colour. Shoes are separate
            pieces and stay.

  blender -b -P art/candidates/carina-meshy-1/fix_bl.py -- <in glb> <out glb> [seam=1] [head=0.85] [trousers=denim]
Also writes <out>.png, the texture.
"""
import bpy, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
opt = dict(kv.split('=', 1) for kv in argv[2:])
SEAM = opt.get('seam', '1') == '1'
HEAD = float(opt.get('head', '1'))
TROUSERS = opt.get('trousers', 'none')
BASE = {'denim': (40, 60, 92), 'grey': (122, 122, 124)}   # sRGB at the trousers' middle brightness
PIVOT = (0.0, 0.635, -0.0026)                             # rig.py's Head joint, glTF metres

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
assert sizes == [735, 648, 624, 594, 192, 192, 168, 162, 48], 'not carina-2'
HAIR, TOP, FACE, TROUSERS_P = 0, 1, 2, 3
fp = piece[tris[:, 0]]

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
if SEAM:
    Pg = G[tris]
    N = np.cross(Pg[:, 1] - Pg[:, 0], Pg[:, 2] - Pg[:, 0]); N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    cyf = Pg.mean(1)[:, 1]
    ring = np.where((fp == TOP) & (N[:, 1] < -0.9) & (cyf < 0.395))[0]
    hem = np.where((fp == TOP) & (np.abs(N[:, 1]) < 0.5) & (cyf > 0.39) & (cyf < 0.43))[0]
    r, c, f, _ = raster(hem)
    top_col = np.median(rgb[r, c], 0)
    r, c, f, _ = raster(ring)
    # the ring's triangles and two texels round them, so filtering at their edges reads no beige
    m = np.zeros((H, W), bool); m[r, c] = True
    for _ in range(2):
        m |= np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    m &= owner_map() == TOP
    rgb[m] = top_col
    # the line Meshy painted where the hem meets the trousers, on the trousers' top and the hem's lower edge:
    # brownish-light texels in that band (the cloth is a cool near-black, blue above red), with each piece's padding
    # round the band's triangles
    def clean_line(pc, lo, hi):
        r, c, f, B = raster(np.where(fp == pc)[0])
        y3 = np.einsum('kc,kcd->kd', B, Pg[f])[:, 1]
        k = (y3 > lo) & (y3 < hi)
        zone = np.zeros((H, W), bool); zone[r[k], c[k]] = True
        for _ in range(4):
            zone |= np.roll(zone, 1, 0) | np.roll(zone, -1, 0) | np.roll(zone, 1, 1) | np.roll(zone, -1, 1)
        zone &= owner_map() == pc
        zc = rgb[zone]
        off = (zc[:, 0] - zc[:, 2] > 0.0) | (luma(zc) > np.median(luma(zc)) + 0.05)
        col = np.median(zc[~off], 0)
        zc[off] = col
        rgb[zone] = zc
        return int(off.sum()), len(zc), (col * 255).round()
    print('SEAM ring faces', len(ring), 'texels', int(m.sum()), 'top colour', (top_col * 255).round(),
          'line on the trousers', clean_line(TROUSERS_P, 0.37, 0.43), 'on the hem', clean_line(TOP, 0.38, 0.415))

if HEAD != 1:
    piv_l = Mw.inverted() @ Vector((PIVOT[0], -PIVOT[2], PIVOT[1]))
    piv_l = np.array(piv_l)
    hv = np.isin(piece, (HAIR, FACE))
    L[hv] = piv_l + HEAD * (L[hv] - piv_l)
    me.vertices.foreach_set('co', L.ravel())
    me.update()
    print('HEAD scaled', HEAD, 'vertices', int(hv.sum()), 'pivot (glTF)', PIVOT)

if TROUSERS != 'none':
    own = owner_map()
    m = own == TROUSERS_P
    tr = np.where(fp == TROUSERS_P)[0]
    r, c, f, _ = raster(tr)
    mid = np.median(luma(rgb[r, c]))
    k = np.clip(luma(rgb[m]) / mid, 0.35, 1.8)[:, None]
    base = np.array(BASE[TROUSERS]) / 255.0                 # byte images keep their sRGB values in .pixels
    rgb[m] = np.clip(base * k, 0, 1)
    print('TROUSERS', TROUSERS, 'texels', int(m.sum()), 'middle luma', round(float(mid), 4))

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
