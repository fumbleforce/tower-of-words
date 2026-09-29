# Base body build (Blender, headless): a closed, skin-only chibi body from one creator source (Mio or Eric).
#
#   blender -b --factory-startup -P tools/creator/base/build_base.py -- eric [variant]
#
# Reads art/parts/base/src-<id>.json (written by tools/creator/base/export.html: the source in the creator's shared
# bind space, height 1, cut labels per triangle) and writes art/parts/base/<id>-base<variant>.json + .png.
#
# How: the face and hands are the source's own skin triangles (the face with its eyes), made solid. The rest of the
# body (skull, neck, torso, arms, legs, feet) is simple shapes sized from the clothes around each bone, kept inside
# the clothes and the hair. Everything is merged by a voxel remesh (one closed shell, no holes), smoothed away from
# the face, cut down to a low triangle count and flat shaded. The colours (skin, eyes, brows) are baked from the
# source, with the stubble and anything else not skin painted skin first. Skin weights come from the nearest point
# on the source, so the body bends with the same weights as the clothes that go over it.
import bpy, bmesh, sys, json, math, os
import numpy as np
from mathutils import Vector, Quaternion, Matrix
from mathutils.bvhtree import BVHTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SID = argv[0] if argv else 'eric'
VAR = argv[1] if len(argv) > 1 else ''
CFG = json.loads(argv[2]) if len(argv) > 2 else {}
OUT = os.path.join(ROOT, 'art/parts/base')
S = json.load(open(os.path.join(OUT, f'src-{SID}.json')))

# per-source settings (fractions of the height; the model is 1 tall)
DEF = {
  'voxel': 0.0045,          # remesh voxel size
  'faces': 2600,            # triangles after decimation
  'margin': 0.008,          # the body stays this far inside the clothes and hair
  'limb': 0.62,             # limb radius as a share of the clothes' radius round the bone
  'torso': 0.78,            # torso width and depth as a share of the clothes'
  'skull': 0.93,            # skull radii as a share of the largest that fits inside the hair
  'smooth': 20,              # smoothing passes away from the face and hands
}
# per source: Mio's face skin runs up under her fringe, so her eye box stops lower
SRC_DEF = {'mio': {'eyeHi': 0.42, 'eyeX': 0.13, 'browPad': 0.5}, 'eric': {'eyeHi': 0.5, 'browPad': -0.02, 'margin': 0.012}}
C = dict(DEF); C.update(SRC_DEF.get(SID, {})); C.update(CFG)

bpy.ops.wm.read_factory_settings(use_empty=True)
T = S['T']
pos = np.array(S['pos'], dtype=np.float64).reshape(-1, 3)
uv = np.array(S['uv'], dtype=np.float64).reshape(-1, 2)
col = np.array(S['col'], dtype=np.float64).reshape(-1, 3)
use = np.array(S['useTex'], dtype=np.float64)
si = np.array(S['si'], dtype=np.int64).reshape(-1, 4)
sw = np.array(S['sw'], dtype=np.float64).reshape(-1, 4)
slot = S['slot']
BONES = S['bones']
P = {b: Vector(S['P'][b]) for b in BONES}
BQ = {b: Quaternion((S['B'][b][3], S['B'][b][0], S['B'][b][1], S['B'][b][2])) for b in BONES}

def dom_bone(t):
  vs = [t * 3 + k for k in range(3)]
  bs = [BONES[si[i][int(np.argmax(sw[i]))]] for i in vs]
  return max(sorted(set(bs)), key=bs.count)
TB = [dom_bone(t) for t in range(T)]
cen = pos.reshape(T, 3, 3).mean(axis=1)
nrm = np.cross(pos.reshape(T, 3, 3)[:, 1] - pos.reshape(T, 3, 3)[:, 0], pos.reshape(T, 3, 3)[:, 2] - pos.reshape(T, 3, 3)[:, 0])
area = np.linalg.norm(nrm, axis=1) / 2
nrm = nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)

# ---------- the source as Blender meshes ----------
def mesh_from_tris(name, tris, merge=True):
  bm = bmesh.new()
  uvl = bm.loops.layers.uv.new('UVMap')
  cl = bm.loops.layers.float_color.new('Col')
  ul = bm.faces.layers.float.new('use')
  tl = bm.faces.layers.int.new('tri')
  vmap = {}
  for t in tris:
    vs = []
    for k in range(3):
      p = tuple(np.round(pos[t * 3 + k], 6)) if merge else (t, k)
      if p not in vmap: vmap[p] = bm.verts.new(pos[t * 3 + k])
      vs.append(vmap[p])
    if len(set(vs)) < 3: continue
    try: f = bm.faces.new(vs)
    except ValueError: continue
    for k, lp in enumerate(f.loops):
      lp[uvl].uv = (uv[t * 3 + k][0], 1 - uv[t * 3 + k][1])   # glTF v runs down, Blender's up
      c = col[t * 3 + k]; lp[cl] = (c[0], c[1], c[2], 1.0)
    f[ul] = use[t * 3]; f[tl] = t
    f.material_index = 0
  me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
  ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
  return ob

# The whole source, for the "inside the clothes" test and the weights
src_ob = mesh_from_tris('source', range(T))
bvh_src = BVHTree.FromObject(src_ob, bpy.context.evaluated_depsgraph_get())

# which triangles are skin that the body keeps (face, ears, neck skin, hands), and which are stubble
skin_tris = [t for t in range(T) if slot[t] in ('head', 'hands')]
stubble = []
if SID == 'eric':
  # Eric's stubble is hair-coloured triangles on the lower face: cut as hair, below the eyes, facing forward
  eyeY = P['Head'].y + (P['head_end'].y - P['Head'].y) * C.get('stubbleTop', 0.42)
  for t in range(T):
    if slot[t] == 'hair' and cen[t][1] < eyeY and nrm[t][2] > -0.2 and abs(cen[t][0] - P['Head'].x) < 0.2 and TB[t] in ('Head', 'headfront', 'neck'):
      stubble.append(t)
face_tris = [t for t in skin_tris if slot[t] == 'head'] + stubble
hand_tris = [t for t in skin_tris if slot[t] == 'hands']
print('skin tris', len(skin_tris), 'face', len(face_tris), 'hands', len(hand_tris), 'stubble', len(stubble))

# ---------- sizes from the clothes ----------
def radial(bone_a, bone_b, tris_sel, q=0.5):
  """median distance of the given triangles' centres from the segment a-b (only those along the segment)"""
  a = np.array(P[bone_a]); b = np.array(P[bone_b]); d = b - a; L = np.linalg.norm(d); d /= L
  out = []
  for t in tris_sel:
    v = cen[t] - a; s = v @ d
    if s < 0.1 * L or s > 0.9 * L: continue
    out.append(np.linalg.norm(v - s * d))
  return float(np.quantile(out, q)) if out else 0.03

def tris_on(*bones):
  return [t for t in range(T) if TB[t] in bones]

objs = []
def add_prim(ob): objs.append(ob); return ob

def capsule(name, a, b, ra, rb, seg=24):
  """a tapered capsule from a to b (radii ra, rb): two spheres and a cone, merged later by the remesh"""
  a = Vector(a); b = Vector(b)
  for p, r in ((a, ra), (b, rb)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=p)
    add_prim(bpy.context.object)
  d = b - a
  bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=ra, radius2=rb, depth=d.length, location=(a + b) / 2)
  o = bpy.context.object
  o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
  add_prim(o)

def ellipsoid(name, c, r, rot=None, seg=32):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1, location=c)
  o = bpy.context.object; o.scale = r
  if rot is not None: o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot
  add_prim(o); return o

# The original clothed shell is the outer limit. inside(p): is p inside the source shell? Meshy shells have loose
# inner pieces, so ray parity lies; instead cast in 14 directions and look at which way the first surface faces
# (away from p: we are inside it). Most directions must agree.
DIRS = [Vector(d).normalized() for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1),
  (1, 1, 1), (1, 1, -1), (1, -1, 1), (1, -1, -1), (-1, 1, 1), (-1, 1, -1), (-1, -1, 1), (-1, -1, -1))]
def inside(p):
  p = Vector(p); k = 0
  for d in DIRS:
    loc, nm, _i, _dist = bvh_src.ray_cast(p, d)
    if loc is not None and nm.dot(d) > 0: k += 1
  return k >= 9

def clearance(p):
  loc, _n, _i, dist = bvh_src.find_nearest(Vector(p))
  return dist if inside(p) else -dist

# --- skull: an ellipsoid round the head centre, the largest that fits inside the hair and face (x margin) ---
head_tris = [t for t in range(T) if TB[t] in ('Head', 'head_end', 'headfront')]
hp = cen[head_tris]
hc = Vector(((hp[:, 0].min() + hp[:, 0].max()) / 2, 0, (hp[:, 2].min() + hp[:, 2].max()) / 2))
# vertical centre: between the chin (lowest face skin) and the top of the head
face_c = cen[[t for t in face_tris]] if face_tris else hp
chin = float(face_c[:, 1].min()); top = float(hp[:, 1].max())
hc.y = (chin + top) / 2 + C.get('skullUp', 0.0)
half = Vector(((hp[:, 0].max() - hp[:, 0].min()) / 2, (top - chin) / 2, (hp[:, 2].max() - hp[:, 2].min()) / 2))
half.x = min(half.x, half.z * 1.1)   # buns and spikes don't widen the skull
# The head is one surface seen from its centre: in every direction where the first thing out from the centre is the
# face (its own skin triangles, eyes, stubble), the head reaches exactly to it; elsewhere it is a round head (an
# ellipsoid of `skull` x the head's half size), always the margin inside the hair. In between, the radius is
# smoothed over the sphere with the face held fixed, so the forehead and cheeks run into the skull with no step.
tri_of_poly = [a.value for a in src_ob.data.attributes['tri'].data]   # source polygon -> dump triangle
face_set = set(face_tris)
SEG = C.get('skullSeg', 96)
bpy.ops.mesh.primitive_uv_sphere_add(segments=SEG, ring_count=SEG // 2, radius=1, location=(0, 0, 0))
sk = bpy.context.object; add_prim(sk)
dirs = [v.co.normalized() for v in sk.data.vertices]
forehead_y = P['Head'].y + (P['head_end'].y - P['Head'].y) * C.get('eyeHi', 0.56) + C.get('browPad', 0.03)
ell_r, hit, fixed = [], [], []
for d in dirs:
  ell_r.append(1 / math.sqrt((d.x / half.x) ** 2 + (d.y / half.y) ** 2 + (d.z / half.z) ** 2) * C['skull'])
  loc, nm, fi, dist = bvh_src.ray_cast(hc, d)
  hit.append(dist if loc is not None else None)
  # the face holds the head's shape up to just above the brows; above that (the skin under the fringe) the skull
  # takes over, so the hairline has no lip
  fixed.append(loc is not None and tri_of_poly[fi] in face_set and loc.y < forehead_y)
nb = [set() for _ in dirs]
for e in sk.data.edges: a_, b_ = e.vertices; nb[a_].add(b_); nb[b_].add(a_)
# rings from the face: the margin grows from 0 at the face's edge to full over three rings, so there is no step
ring = [0 if f else 99 for f in fixed]
for it in range(4):
  ring = [0 if fixed[i] else min(ring[i], 1 + min(ring[j] for j in nb[i])) for i in range(len(dirs))]
lim = []
for i in range(len(dirs)):
  if fixed[i]: lim.append(hit[i]); continue
  m = C['margin'] * min(1.0, ring[i] / 3)
  lim.append(hit[i] - m if hit[i] is not None else ell_r[i])
# the hair's inner layers are jagged: erode the limit over a few rings (face directions don't count), so the skull
# follows a smoothed version of it; three averaging passes of an erosion over four rings stay under the limit
INF = 1e9
L = [INF if fixed[i] else lim[i] for i in range(len(dirs))]
for it in range(C.get('skullErode', 4)):
  L = [L[i] if fixed[i] else min([L[i]] + [L[j] for j in nb[i]]) for i in range(len(dirs))]
L = [lim[i] if fixed[i] else min(L[i], lim[i]) for i in range(len(dirs))]
for it in range(3):
  L = [L[i] if fixed[i] else min(lim[i], sum([L[i]] + [L[j] for j in nb[i]]) / (1 + len(nb[i]))) for i in range(len(dirs))]
rad = [hit[i] if fixed[i] else min(ell_r[i], L[i]) for i in range(len(dirs))]
for it in range(C.get('skullSmooth', 60)):
  rad = [rad[i] if fixed[i] else min(L[i], 0.5 * rad[i] + 0.5 * sum(rad[j] for j in nb[i]) / len(nb[i])) for i in range(len(dirs))]
for v, d, r in zip(sk.data.vertices, dirs, rad): v.co = hc + d * r
print('skull centre', tuple(round(x, 3) for x in hc), 'half', tuple(round(x, 3) for x in half), 'radius min/max', round(min(rad), 3), round(max(rad), 3), 'face dirs', sum(fixed))

# --- neck ---
nr = C.get('neckR', 0.03)
capsule('neck', P['Spine'] + (P['neck'] - P['Spine']) * 0.5, P['Head'] + (hc - P['Head']) * 0.3, nr, nr)

# --- torso: an ellipsoid per spine segment and one for the hips, sized from the clothes round each ---
def size_round(bone, bones, up):
  """centre (x, z), half width and half depth of the clothes on these bones in a slice at the height of `bone`"""
  ts = [t for t in tris_on(*bones) if slot[t] not in ('hair', 'head', 'hands') and abs(cen[t][1] - P[bone].y) < up]
  if not ts: return (P[bone].x, P[bone].z), 0.08, 0.06
  c = cen[ts]
  x0, x1 = np.quantile(c[:, 0], [0.05, 0.95])
  # depth from a strip down the middle, whichever bone moves it
  mid = [t for t in range(T) if slot[t] not in ('hair', 'head', 'hands') and abs(cen[t][1] - P[bone].y) < up and abs(cen[t][0] - P[bone].x) < 0.06]
  cz = cen[mid][:, 2] if len(mid) > 3 else c[:, 2]
  z0, z1 = np.quantile(cz, [0.05, 0.95])
  return ((x0 + x1) / 2, (z0 + z1) / 2), float(x1 - x0) / 2, float(z1 - z0) / 2

tb = ('Spine02', 'Spine01', 'Spine', 'Hips', 'LeftShoulder', 'RightShoulder', 'neck')
cc, chest_w, chest_d = size_round('Spine', tb, 0.04)
wc, waist_w, waist_d = size_round('Spine01', tb, 0.04)
hc2, hip_w, hip_d = size_round('Hips', ('Hips', 'LeftUpLeg', 'RightUpLeg', 'Spine02'), 0.03)
k = C['torso']
# the hood and loose backs make the clothes deep; a body is wider than it is deep
chest_d = min(chest_d, chest_w * 0.85); waist_d = min(waist_d, waist_w * 0.85); hip_d = min(hip_d, hip_w * 0.8)
tw = C.get('torsoW', 1.0)
at = lambda c, y: Vector((c[0], y, c[1]))
ellipsoid('chest', at(cc, (P['Spine'].y + P['Spine01'].y) / 2), Vector((chest_w * k * 0.92 * tw, (P['neck'].y - P['Spine01'].y) * C.get('chestH', 0.5), chest_d * k * 0.95)))
ellipsoid('waist', at(wc, (P['Spine02'].y + P['Spine01'].y) / 2), Vector((waist_w * k * 0.85 * tw, (P['Spine01'].y - P['Hips'].y) * 0.75, waist_d * k * 0.9)))
ellipsoid('hips', at(hc2, P['Hips'].y - 0.012), Vector((hip_w * k * 0.95 * C.get('hipW', 1.0), (P['Spine02'].y - P['LeftUpLeg'].y) * 0.9 + 0.02, hip_d * k * 0.95)))
print('torso', [round(x, 3) for x in (chest_w, chest_d, waist_w, waist_d, hip_w, hip_d)], 'z', round(cc[1], 3), round(wc[1], 3), round(hc2[1], 3))

# --- limbs: tapered capsules from joint to joint; radius from the clothes round the bone ---
lk = C['limb']
for side in ('Left', 'Right'):
  sh, ar, fa, ha = side + 'Shoulder', side + 'Arm', side + 'ForeArm', side + 'Hand'
  r_up = radial(ar, fa, [t for t in tris_on(ar) if slot[t] == 'top']) * lk
  r_lo = radial(fa, ha, [t for t in tris_on(fa) if slot[t] in ('top', 'hands')]) * lk
  r_up = min(r_up, C.get('armMax', 0.04)); r_lo = min(r_lo, C.get('armMax', 0.04) * 0.85)
  capsule(sh, P[sh] + (P[ar] - P[sh]) * 0.2, P[ar], r_up * 1.05, r_up)
  capsule(ar, P[ar], P[fa], r_up, r_lo * 1.05)
  capsule(fa, P[fa], P[ha], r_lo * 1.05, r_lo * 0.85)
  ul, lg, ft, toe = side + 'UpLeg', side + 'Leg', side + 'Foot', side + 'ToeBase'
  r_th = radial(ul, lg, [t for t in tris_on(ul) if slot[t] in ('bottom', 'top')]) * C.get('legK', 0.82)
  r_sh = radial(lg, ft, [t for t in tris_on(lg) if slot[t] == 'bottom']) * C.get('legK', 0.82)
  r_th = min(r_th, C.get('thighMax', 0.06)); r_sh = min(r_sh, C.get('shinMax', 0.045))
  capsule(ul, P[ul] + Vector((0, 0.01, 0)), P[lg], r_th, r_sh * 1.05)
  capsule(lg, P[lg], P[ft], r_sh * 1.05, r_sh * 0.8)
  # foot: from the ankle to the toe, flat underneath; sized from the shoe
  sh_t = [t for t in tris_on(ft, toe) if slot[t] == 'shoes']
  sc = cen[sh_t] if sh_t else cen[tris_on(ft, toe)]
  fw = float(np.quantile(np.abs(sc[:, 0] - P[ft].x), 0.85)) * C.get('footK', 0.72)
  fy0 = float(sc[:, 1].min())
  fz0, fz1 = float(np.quantile(sc[:, 2], 0.05)), float(np.quantile(sc[:, 2], 0.95))
  fl = (fz1 - fz0) / 2 * C.get('footL', 0.82)
  fc = Vector((P[ft].x, fy0 + C['margin'] + 0.03, (fz0 + fz1) / 2 + 0.005))
  ellipsoid(ft, fc, Vector((fw, 0.03, fl)))
  capsule(ft + 'ankle', P[ft], fc + Vector((0, 0, -fl * 0.35)), r_sh * 0.8, 0.026)
  print(side, 'arm', round(r_up, 3), round(r_lo, 3), 'leg', round(r_th, 3), round(r_sh, 3), 'foot', round(fw, 3), round(fl, 3))

# --- the face and hands: the source's own skin, made solid ---
def solid_from(name, tris, thick):
  ob = mesh_from_tris(name, tris)
  m = ob.modifiers.new('solid', 'SOLIDIFY'); m.thickness = thick; m.offset = -1; m.use_rim = True; m.use_even_offset = False   # even offset explodes at sharp corners
  add_prim(ob); return ob
hand_ob = solid_from('hands', hand_tris, C.get('handThick', 0.018))
# keep the plain face and hands for the colour bake and the "keep the face" test
face_src = mesh_from_tris('face_src', face_tris)
hand_src = mesh_from_tris('hand_src', hand_tris)
keep_bvh = BVHTree.FromObject(mesh_from_tris('keep', face_tris + hand_tris), bpy.context.evaluated_depsgraph_get())

# ---------- merge: voxel remesh of everything ----------
dg = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new()
for o in objs:
  me = o.evaluated_get(dg).to_mesh()
  me.transform(o.matrix_world)
  bm.from_mesh(me)
  o.evaluated_get(dg).to_mesh_clear()
me = bpy.data.meshes.new('body'); bm.to_mesh(me); bm.free()
body = bpy.data.objects.new('body', me); bpy.context.scene.collection.objects.link(body)
for o in objs: bpy.data.objects.remove(o)
bpy.context.view_layer.objects.active = body; body.select_set(True)
me.remesh_voxel_size = C['voxel']; me.remesh_voxel_adaptivity = 0
bpy.ops.object.voxel_remesh()
print('remeshed', len(body.data.polygons))

if C.get('debug'):
  for nm, p in (('headc', hc), ('hips', P['Hips']), ('chest', P['Spine']), ('far', Vector((2, 2, 2))), ('head+x', P['Head'])):
    print('DEBUG', nm, tuple(round(x, 3) for x in p), inside(p), round(clearance(p), 4))
  sys.exit(0)
# how far each vertex is from the kept skin (face, hands): 1 far away, 0 on it
def keep_weight(p):
  loc, _n, _i, d = keep_bvh.find_nearest(p)
  if loc is None: return 1.0
  return min(1.0, max(0.0, (d - 0.004) / 0.03))

# smooth away from the face and hands (the joints between shapes), then keep inside the clothes
vg = body.vertex_groups.new(name='smooth')
for v in body.data.vertices: vg.add([v.index], keep_weight(v.co), 'REPLACE')
sm = body.modifiers.new('sm', 'SMOOTH'); sm.factor = 0.8; sm.iterations = C['smooth']; sm.vertex_group = 'smooth'
bpy.ops.object.modifier_apply(modifier='sm')

# only the largest piece (the remesh can leave crumbs from thin rims)
bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
comp = {}; cid = 0
for v in bm.verts:
  if v.index in comp: continue
  st = [v]; comp[v.index] = cid
  while st:
    x = st.pop()
    for e in x.link_edges:
      y = e.other_vert(x)
      if y.index not in comp: comp[y.index] = cid; st.append(y)
  cid += 1
sizes = np.bincount(np.array(list(comp.values())), minlength=cid); big = int(np.argmax(sizes))
bmesh.ops.delete(bm, geom=[v for v in bm.verts if comp[v.index] != big], context='VERTS')
bm.to_mesh(body.data); bm.free()
print('pieces after remesh', cid, 'kept', int(sizes[big]), 'verts')

# decimate to a low count, flat triangles
dec = body.modifiers.new('dec', 'DECIMATE'); dec.ratio = min(1.0, C['faces'] / 2 / max(1, len(body.data.polygons)))   # remesh gives quads: two triangles each; dec.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode='OBJECT')

# keep inside the clothes and hair. Seen along its own normal, a body vertex must be under a layer: the first
# surface out along the normal faces the same way (we are behind it) and is at least the margin away. A vertex
# that fails moves inward along its normal until it passes (at most 4 cm). The face and hands are skin already.
def covered(p, n):
  loc, nm, _i, d = bvh_src.ray_cast(p - n * 1e-4, n)
  return loc is not None and nm.dot(n) > 0 and d > C['margin']
def pokes(p, n):
  """p is through a layer: just outside a surface that faces the same way"""
  loc, nm, _i, d = bvh_src.ray_cast(p + n * 1e-4, -n)
  return loc is not None and nm.dot(n) > 0 and d < 0.03
body.data.update()
pushed = 0
for v in body.data.vertices:
  if keep_weight(v.co) < 0.5: continue
  n = v.normal.copy()
  ok = lambda q: covered(q, n) and not pokes(q, n) and inside(q + n * C['margin'])   # a hood lying over a shoulder covers it too
  if ok(v.co): continue
  q = v.co
  for step in range(1, 21):
    q = v.co - n * (0.002 * step)
    if ok(q): break
  v.co = q; pushed += 1
body.data.update()
# the flat triangles between vertices can still cut through a fold of the clothes: sample each triangle's centre and
# edge midpoints too, and move its corners in a step at a time until those points are covered as well
for rnd in range(C.get('pushRounds', 8)):
  me_ = body.data; moved = set()
  for poly in me_.polygons:
    vs = [me_.vertices[i] for i in poly.vertices]
    if min(keep_weight(v.co) for v in vs) < 0.5: continue
    n = poly.normal
    pts = [poly.center] + [(vs[i].co + vs[(i + 1) % 3].co) / 2 for i in range(3)]
    if all(inside(q + n * C['margin'] * 0.5) and not pokes(q, n) for q in pts): continue
    for v in vs: moved.add(v.index)
  for i in moved:
    v = me_.vertices[i]; v.co = v.co - v.normal * 0.002
  me_.update(); pushed += len(moved)
  print('  push round', rnd, 'moved', len(moved))
  if not moved: break
# The push leaves dents. Smooth the body again, but keep each move only if the vertex stays under its layer.
nb_ = [[] for _ in body.data.vertices]
for e in body.data.edges: a_, b_ = e.vertices; nb_[a_].append(b_); nb_[b_].append(a_)
body.data.update()
for it in range(C.get('safeSmooth', 8)):
  me_ = body.data; cos = [v.co.copy() for v in me_.vertices]; kept = 0
  for v in me_.vertices:
    if keep_weight(v.co) < 0.5 or not nb_[v.index]: continue
    avg = sum((cos[j] for j in nb_[v.index]), Vector()) / len(nb_[v.index])
    q = cos[v.index].lerp(avg, 0.5); n = v.normal
    if covered(q, n) and not pokes(q, n) and inside(q + n * C['margin']): v.co = q; kept += 1
  me_.update()
print('safe smooth moves', kept)
# a light smooth after the push so moved vertices don't leave dents
sm = body.modifiers.new('sm2', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 2; sm.vertex_group = 'smooth' if 'smooth' in body.vertex_groups else ''
bpy.ops.object.modifier_apply(modifier='sm2')
print('faces', len(body.data.polygons), 'pushed inside', pushed)

# ---------- checks ----------
bm = bmesh.new(); bm.from_mesh(body.data)
bnd = sum(1 for e in bm.edges if e.is_boundary); nonman = sum(1 for e in bm.edges if not e.is_manifold)
bm.verts.ensure_lookup_table()
seen = set(); isl = 0
for v in bm.verts:
  if v.index in seen: continue
  isl += 1; st = [v]; seen.add(v.index)
  while st:
    x = st.pop()
    for e in x.link_edges:
      y = e.other_vert(x)
      if y.index not in seen: seen.add(y.index); st.append(y)
bm.free()
print('CHECK boundary edges', bnd, 'non-manifold edges', nonman, 'pieces', isl)

# ---------- colour: bake from the source's face and hands onto a fresh UV map ----------
skin_rgb = None
# skin colour: the most common colour on the face skin (area weighted) from the texture/palette
img_path = os.path.join(ROOT, 'art/parts', S['tex'])
src_img = bpy.data.images.load(img_path)
W, H = src_img.size
px = np.array(src_img.pixels[:], dtype=np.float32).reshape(H, W, 4)
# texture UVs in the dump are glTF (origin top-left); Blender images have origin bottom-left
def tex_at(u, v):
  x = min(W - 1, max(0, int(u * W))); y = min(H - 1, max(0, int((1 - v) * H)))
  return px[y, x, :3]
srgb2lin = lambda x: np.where(x <= 0.04045, x / 12.92, np.power((x + 0.055) / 1.055, 2.4))
cols = []
for t in [t for t in face_tris if t not in stubble]:
  if use[t * 3] > 0.5:
    u_, v_ = uv[t * 3:t * 3 + 3].mean(axis=0); c = srgb2lin(tex_at(u_, v_))
  else: c = col[t * 3]
  cols.append((tuple(np.round(np.array(c) * 20) / 20), area[t]))
agg = {}
for c, a in cols: agg[c] = agg.get(c, 0) + a
skin_key = max(agg, key=agg.get)
# the mean of the colours near the key
near = [np.array(c) for c, a in cols if np.linalg.norm(np.array(c) - np.array(skin_key)) < 0.08]
skin_rgb = np.mean(near, axis=0) if near else np.array(skin_key)
print('skin (linear)', np.round(skin_rgb, 3))

# emission material on the bake sources: texture where useTex, palette colour otherwise; stubble painted skin
def bake_material(name):
  m = bpy.data.materials.new(name); m.use_nodes = True
  nt = m.node_tree; nt.nodes.clear()
  outn = nt.nodes.new('ShaderNodeOutputMaterial')
  em = nt.nodes.new('ShaderNodeEmission')
  tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = src_img; tex.interpolation = 'Closest'
  uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'UVMap'
  colattr = nt.nodes.new('ShaderNodeAttribute'); colattr.attribute_name = 'Col'
  useattr = nt.nodes.new('ShaderNodeAttribute'); useattr.attribute_name = 'use'
  mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
  nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
  nt.links.new(useattr.outputs['Fac'], mix.inputs['Factor'])
  nt.links.new(colattr.outputs['Color'], mix.inputs[6])
  nt.links.new(tex.outputs['Color'], mix.inputs[7])
  nt.links.new(mix.outputs[2], em.inputs['Color'])
  nt.links.new(em.outputs['Emission'], outn.inputs['Surface'])
  return m
# On the bake sources only the eyes, brows, mouth and cheeks keep their colours (a box on the front of the face,
# between the chin and the brows); everything else is painted skin: the stubble, hair colour that runs onto the
# forehead skin, the sleeve colour at the cuffs, the collar at the neck.
eye_lo = P['Head'].y + C.get('eyeLo', 0.01)
eye_hi = P['Head'].y + (P['head_end'].y - P['Head'].y) * C.get('eyeHi', 0.56)
eye_x = C.get('eyeX', 0.14)
def keep_colour(c, n):
  return eye_lo < c[1] < eye_hi and abs(c[0] - P['Head'].x) < eye_x and n[2] > 0.3
stub_set = set(stubble)
for ob in (face_src, hand_src):
  bm_ = bmesh.new(); bm_.from_mesh(ob.data)
  ul = bm_.faces.layers.float.get('use'); cl = bm_.loops.layers.float_color.get('Col')
  painted = 0
  for f in bm_.faces:
    c = f.calc_center_median()
    # stubble triangles by position
    is_stub = any(np.linalg.norm(np.array(c) - cen[t]) < 1e-4 for t in stubble) if ob is face_src else False
    if ob is hand_src or is_stub or not keep_colour(c, f.normal):
      f[ul] = 0.0; painted += 1
      for lp in f.loops: lp[cl] = (skin_rgb[0], skin_rgb[1], skin_rgb[2], 1)
  bm_.to_mesh(ob.data); bm_.free()
  print('bake source', ob.name, 'painted skin', painted)
# 'use' as a point-domain-free face attribute is fine for the Attribute node (face domain)
bm_mat = bake_material('bakesrc')
for o in (face_src, hand_src): o.data.materials.append(bm_mat)

# UVs on the body
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
TEX = C.get('tex', 1024)
bimg = bpy.data.images.new('base', TEX, TEX, alpha=False)
lin2srgb = lambda x: np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 0), 1 / 2.4) - 0.055)
bimg.pixels[:] = np.tile(np.array([*lin2srgb(skin_rgb), 1.0], dtype=np.float32), TEX * TEX)
bmat = bpy.data.materials.new('bodymat'); bmat.use_nodes = True
tn = bmat.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = bimg
bmat.node_tree.nodes.active = tn
body.data.materials.append(bmat)
scn = bpy.context.scene
scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = 1
scn.render.bake.use_selected_to_active = True
scn.render.bake.cage_extrusion = C.get('cage', 0.012)
scn.render.bake.max_ray_distance = C.get('ray', 0.03)
scn.render.bake.use_clear = False
scn.render.bake.margin = 2
scn.render.bake.target = 'IMAGE_TEXTURES'
bpy.ops.object.select_all(action='DESELECT')
for o in (face_src, hand_src): o.select_set(True)
body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type='EMIT')
png = os.path.join(OUT, f'{SID}-base{VAR}.png')
bimg.filepath_raw = png; bimg.file_format = 'PNG'; bimg.save()

# ---------- skin weights ----------
# A body vertex under a layer takes the weights of the layer point straight over it (out along its normal), so it
# moves with the cloth that covers it and stays under it when the pose bends. The face and hands, and anything not
# under a layer, take the nearest point on the source. Then a few smoothing passes over the body so neighbouring
# vertices covered by different pieces (armpit: sleeve and side) don't pull apart.
body.data.update()
vw = []
for v in body.data.vertices:
  hitp = None
  if keep_weight(v.co) >= 0.5:
    loc, nm, fi, d = bvh_src.ray_cast(v.co, v.normal)
    if loc is not None and nm.dot(v.normal) > 0 and d < 0.08: hitp = (loc, fi)
  if hitp is None:
    loc, _n, fi, _d = bvh_src.find_nearest(v.co); hitp = (loc, fi)
  vw.append(hitp)
def bary(p, a, b, c):
  v0, v1, v2 = b - a, c - a, p - a
  d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
  den = d00 * d11 - d01 * d01
  if abs(den) < 1e-14: return np.array([1 / 3, 1 / 3, 1 / 3])
  v_ = (d11 * d20 - d01 * d21) / den; w_ = (d00 * d21 - d01 * d20) / den
  r = np.clip(np.array([1 - v_ - w_, v_, w_]), 0, 1); return r / r.sum()
NB = len(BONES)
W8 = np.zeros((len(body.data.vertices), NB))
for i, (loc, fi) in enumerate(vw):
  t = tri_of_poly[fi]
  b = bary(np.array(loc), pos[t * 3], pos[t * 3 + 1], pos[t * 3 + 2])
  for k in range(3):
    for q in range(4): W8[i, si[t * 3 + k, q]] += b[k] * sw[t * 3 + k, q]

nbv = [[] for _ in body.data.vertices]
for e in body.data.edges: a_, b_ = e.vertices; nbv[a_].append(b_); nbv[b_].append(a_)
free = np.array([keep_weight(v.co) >= 0.5 for v in body.data.vertices])
for it in range(C.get('weightSmooth', 3)):
  avg = np.array([W8[n_].mean(axis=0) if n_ else W8[i] for i, n_ in enumerate(nbv)])
  W8[free] = 0.5 * W8[free] + 0.5 * avg[free]

# ---------- write ----------
dm = body.data
dm.calc_loop_triangles()
uvd = dm.uv_layers.active.data
out_pos, out_uv, out_si, out_sw = [], [], [], []
for lt in dm.loop_triangles:
  for li, vi in zip(lt.loops, lt.vertices):
    out_pos += list(dm.vertices[vi].co)
    u_, v_ = uvd[li].uv; out_uv += [u_, 1 - v_]   # back to glTF-style v (flipY false)
    w = W8[vi]; top4 = np.argsort(-w)[:4]; ws = w[top4]; ws = ws / max(ws.sum(), 1e-9)
    out_si += [int(x) for x in top4]; out_sw += [round(float(x), 4) for x in ws]
res = {'id': f'{SID}-base{VAR}', 'source': SID, 'tex': f'base/{SID}-base{VAR}.png', 'skin': [round(float(x), 4) for x in skin_rgb],
       'T': len(dm.loop_triangles), 'pos': [round(x, 5) for x in out_pos], 'uv': [round(x, 5) for x in out_uv], 'si': out_si, 'sw': out_sw,
       'stubble': stubble, 'cfg': C, 'check': {'boundary': bnd, 'nonmanifold': nonman, 'pieces': isl}}
json.dump(res, open(os.path.join(OUT, f'{SID}-base{VAR}.json'), 'w'))
print('wrote', f'{SID}-base{VAR}.json', res['T'], 'tris')
