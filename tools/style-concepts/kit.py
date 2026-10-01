# Shared Blender kit for the char-style-1 concepts (run inside Blender: blender -b --factory-startup -P build.py -- ...).
#
# Space: Z up, the character faces -Y, her left hand at +X (so her left is image right in a front view).
# Every part is a rigid mesh parented to one bone of a small armature, so an idle and a walk play without skinning.
# Outputs (glb, renders) are binaries: they go to the main checkout's art/parts/style-concepts/ (git-ignored there,
# served on :8771), whichever worktree runs the script.
import math
import os
import subprocess
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))


def main_checkout():
    try:
        common = subprocess.check_output(['git', '-C', ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                         text=True).strip()
        return os.path.dirname(common)
    except Exception:
        return ROOT


OUT = os.environ.get('STYLE_OUT') or os.path.join(main_checkout(), 'art/parts/style-concepts')


def args():
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgba(h, a=1.0):
    h = h.lstrip('#')
    return tuple(lin(int(h[i:i + 2], 16)) for i in (0, 2, 4)) + (a,)


_mats = {}


def mat(hexs, rough=0.7, coat=0.0, spec=0.35):
    key = (hexs, rough, coat, spec)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(f'{hexs.lstrip("#")}')
    if hasattr(m, 'use_nodes'):
        m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = rgba(hexs)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = spec
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.15
    m.diffuse_color = rgba(hexs)
    _mats[key] = m
    return m


def link(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o)
    return o


def to_obj(name, bm, mats, smooth_angle=None, coll=None):
    """bmesh -> object. smooth_angle None: flat faces; else smooth with edges sharper than that angle split."""
    if smooth_angle is not None:
        for f in bm.faces:
            f.smooth = True
        lim = math.radians(smooth_angle)
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
                e.smooth = False
    else:
        for f in bm.faces:
            f.smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))  # outward, for single-sided viewers
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    return link(bpy.data.objects.new(name, me), coll)


def xform(loc=(0, 0, 0), rot=(0, 0, 0), size=(1, 1, 1)):
    return Matrix.Translation(Vector(loc)) @ Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4() @ \
        Matrix.Diagonal(Vector(size)).to_4x4()


def prim(kind, name, col, loc=(0, 0, 0), size=(1, 1, 1), rot=(0, 0, 0), segs=24, taper=1.0, bevel=0.0,
         bevel_segs=3, smooth=None, m=None, coll=None, sub=1):
    """One primitive as its own object, vertices in world space. size is the full extent along x, y, z (before rot).
    kind: box, cyl (taper = top radius / bottom radius), sphere, ico (sub = subdivisions)."""
    bm = bmesh.new()
    if kind == 'box':
        bmesh.ops.create_cube(bm, size=1)
    elif kind == 'cyl':
        bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=0.5, radius2=0.5 * taper, depth=1)
    elif kind == 'sphere':
        bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(4, segs // 2), radius=0.5)
    elif kind == 'ico':
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=0.5)
    if bevel:
        edges = list(bm.edges)
        if kind == 'cyl':  # only round the rims, not the seams between side faces
            edges = [e for e in edges if any(len(f.verts) > 4 for f in e.link_faces)]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=bevel_segs, profile=0.5, affect='EDGES',
                        clamp_overlap=True)
    bm.transform(xform(loc, rot, size))
    return to_obj(name, bm, [m or mat(col)], smooth, coll)


def mesh(name, verts, faces, col, smooth=None, m=None, coll=None, mats=None, face_mat=None):
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in verts]
    for n, f in enumerate(faces):
        face = bm.faces.new([vs[i] for i in f])
        if face_mat:
            face.material_index = face_mat[n]
    bm.normal_update()
    return to_obj(name, bm, mats or [m or mat(col)], smooth, coll)


def rod(name, a, b, w, d, m, coll=None, bevel=0.0, smooth=40):
    """A box from point a to point b, w wide (local x) and d deep, material m."""
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, profile=0.5, affect='EDGES',
                        clamp_overlap=True)
    bm.transform(Matrix.Diagonal((w, d, L, 1)))
    q = Vector((0, 0, 1)).rotation_difference(b - a)
    bm.transform(Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    return to_obj(name, bm, [m], smooth, coll)


def lathe_bm(profile, rx, ry, cx=0.0, cy=0.0, segs=40, phase=0.0):
    """A closed solid of revolution round Z. profile: [(r, z)] from the bottom centre (r 0) to the top centre
    (r 0); r is scaled by rx and ry; phase turns the rings (degrees),
    so a low segment count can put a flat face, not an edge, at the front."""
    bm = bmesh.new()
    rings = []
    for (r, z) in profile[1:-1]:
        ang = [2 * math.pi * i / segs + math.radians(phase) for i in range(segs)]
        rings.append([bm.verts.new((cx + rx * r * math.cos(a), cy + ry * r * math.sin(a), z)) for a in ang])
    bot = bm.verts.new((cx, cy, profile[0][1]))
    top = bm.verts.new((cx, cy, profile[-1][1]))
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new([bot, rings[0][j], rings[0][i]])
        for A, B in zip(rings, rings[1:]):
            bm.faces.new([A[i], A[j], B[j], B[i]])
        bm.faces.new([rings[-1][i], rings[-1][j], top])
    bm.normal_update()
    return bm


def dome_profile(z_bot, z_mid, rz, round_bot=0.0, steps=10):
    """Flat bottom, straight side up to z_mid, then a quarter-ellipse dome of height rz (radius 1)."""
    p = [(0, z_bot)]
    if round_bot:
        for k in range(4):
            a = math.pi / 2 * k / 3
            p.append((1 - round_bot * (1 - math.sin(a)), z_bot + round_bot * 0.15 * (1 - math.cos(a))))
    else:
        p.append((1, z_bot))
    for k in range(steps + 1):
        a = math.pi / 2 * k / steps
        p.append((math.cos(a), z_mid + rz * math.sin(a)))
    p[-1] = (0, z_mid + rz)
    return p


def cap(name, m, coll, rx, ry, z_bot, z_mid, rz, co, no, cy=0.0, segs=40, phase=0.0, smooth=None, profile=None,
        more=()):
    """A clip-on hair piece: straight sides and a domed top, everything behind the plane (co, no) cut away and the
    cut closed. profile overrides the dome; more: further (co, no) cuts."""
    bm = lathe_bm(profile or dome_profile(z_bot, z_mid, rz), rx, ry, cy=cy, segs=segs, phase=phase)
    planes = [(co, no)] + list(more)
    for pco, pno in planes:
        res = bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-6,
                                     plane_co=pco, plane_no=Vector(pno).normalized(), clear_inner=True)
        cut = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        bmesh.ops.holes_fill(bm, edges=cut, sides=0)
    bm.normal_update()
    return to_obj(name, bm, [m], smooth, coll)


# ---- voxels -----------------------------------------------------------------------------------------------------

DIRS = [((1, 0, 0), [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)]),
        ((-1, 0, 0), [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)]),
        ((0, 1, 0), [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)]),
        ((0, -1, 0), [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)]),
        ((0, 0, 1), [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)]),
        ((0, 0, -1), [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)])]


def voxels(name, cells, u, rough=0.85, coll=None):
    """cells: {(i, j, k): '#hex'}; cell (i, j, k) fills [i*u, (i+1)*u] etc. Only outside faces are built."""
    cols = sorted(set(cells.values()))
    idx = {c: n for n, c in enumerate(cols)}
    bm = bmesh.new()
    vcache = {}

    def v(p):
        if p not in vcache:
            vcache[p] = bm.verts.new((p[0] * u, p[1] * u, p[2] * u))
        return vcache[p]

    for (i, j, k), c in cells.items():
        for (d, quad) in DIRS:
            if (i + d[0], j + d[1], k + d[2]) in cells:
                continue
            f = bm.faces.new([v((i + a, j + b, k + cc)) for a, b, cc in quad])
            f.material_index = idx[c]
    bm.normal_update()
    return to_obj(name, bm, [mat(c, rough) for c in cols], None, coll)


# ---- rig ----------------------------------------------------------------------------------------------------------

def rig(name, bones, coll=None):
    """bones: [(name, head, tail, parent)], world coordinates, roll 0. Returns the armature object."""
    data = bpy.data.armatures.new(name)
    arm = link(bpy.data.objects.new(name, data), coll)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for bn, h, t, p in bones:
        eb = data.edit_bones.new(bn)
        eb.head, eb.tail = Vector(h), Vector(t)
        eb.roll = 0
        if p:
            eb.parent = data.edit_bones[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
    return arm


def attach(o, arm, bone):
    """Parent o to the bone, keeping where it is."""
    b = arm.data.bones[bone]
    pm = arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))
    o.parent = arm
    o.parent_type = 'BONE'
    o.parent_bone = bone
    o.matrix_parent_inverse = pm.inverted()


def key_action(arm, name, frames, keys):
    """keys: {bone: [(frame, (rx, ry, rz) degrees, (lx, ly, lz) or None)]}. Makes a new action on the armature."""
    arm.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data.action = act
    for bn, ks in keys.items():
        pb = arm.pose.bones[bn]
        for f, r, l in ks:
            pb.rotation_euler = [math.radians(a) for a in r]
            pb.keyframe_insert('rotation_euler', frame=f)
            if l is not None:
                pb.location = l
                pb.keyframe_insert('location', frame=f)
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    act.frame_range = frames
    # a track per action, so the glTF exporter writes each as its own clip
    tr = arm.animation_data.nla_tracks.new()
    tr.name = name
    st = tr.strips.new(name, frames[0], act)
    arm.animation_data.action = None
    return act


def cyc(n, f, amp, phase=0.0):
    return amp * math.sin(2 * math.pi * (f / n + phase))


def motions(arm, H, legs=('leg.L', 'leg.R'), arms=('arm.L', 'arm.R'), knees=None, swing=26, arm_swing=22, sign=1,
            arm_out=4):
    """Idle (2 s) and walk (1 s, two steps) at 24 fps. Rotations about the bone's local X swing forward/back.
    sign flips the swing direction if the rig's X points the other way. arm_out lifts the arms off the body."""
    # idle: a slow breath, a small head tilt, arms barely moving
    N = 48
    keys = {'root': [], 'torso': [], 'head': [], arms[0]: [], arms[1]: []}
    for f in range(0, N + 1, 6):
        keys['root'].append((f + 1, (0, 0, 0), (0, cyc(N, f, H * 0.006) + H * 0.006, 0)))
        keys['torso'].append((f + 1, (cyc(N, f, 1.5) * sign, 0, 0), None))
        keys['head'].append((f + 1, (cyc(N, f, -1.5, 0.15) * sign, 0, cyc(N, f, 3, 0.25)), None))
        keys[arms[0]].append((f + 1, (cyc(N, f, 2) * sign, 0, arm_out + cyc(N, f, 1)), None))
        keys[arms[1]].append((f + 1, (cyc(N, f, 2) * sign, 0, -arm_out - cyc(N, f, 1)), None))
    key_action(arm, 'idle', (1, N + 1), keys)
    # walk: legs and arms swing opposite, the body bobs twice per cycle and twists a little
    N = 24
    keys = {'root': [], 'torso': [], 'head': [], legs[0]: [], legs[1]: [], arms[0]: [], arms[1]: []}
    if knees:
        keys[knees[0]] = []
        keys[knees[1]] = []
    for f in range(0, N + 1, 2):
        s = math.sin(2 * math.pi * f / N)
        keys['root'].append((f + 1, (0, 0, 0), (0, H * 0.025 * abs(math.cos(2 * math.pi * f / N)) * -1 + H * 0.025, 0)))
        keys['torso'].append((f + 1, (4 * sign, 0, 5 * s), None))
        keys['head'].append((f + 1, (-3 * sign, 0, -4 * s), None))
        keys[legs[0]].append((f + 1, (swing * s * sign, 0, 0), None))
        keys[legs[1]].append((f + 1, (-swing * s * sign, 0, 0), None))
        keys[arms[0]].append((f + 1, (-arm_swing * s * sign, 0, arm_out), None))
        keys[arms[1]].append((f + 1, (arm_swing * s * sign, 0, -arm_out), None))
        if knees:
            # the knee bends while its leg swings forward (through the passing pose)
            c = math.cos(2 * math.pi * f / N)
            keys[knees[0]].append((f + 1, (-max(0, -c) * 40 * sign - 6 * sign, 0, 0), None))
            keys[knees[1]].append((f + 1, (-max(0, c) * 40 * sign - 6 * sign, 0, 0), None))
    key_action(arm, 'walk', (1, N + 1), keys)


def pose_at(arm, action_name, frame):
    """Show an action at a frame (None: rest)."""
    arm.animation_data_create()
    for tr in arm.animation_data.nla_tracks:
        tr.mute = True
    if action_name is None:
        arm.animation_data.action = None
        for pb in arm.pose.bones:
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)
    else:
        act = bpy.data.actions[action_name]
        arm.animation_data.action = act
        if getattr(act, 'slots', None) and len(act.slots):
            arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(frame or 1)
    bpy.context.view_layer.update()


# ---- export ---------------------------------------------------------------------------------------------------------

def export(coll, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lc = bpy.context.view_layer.layer_collection.children[coll.name]
    bpy.context.view_layer.active_layer_collection = lc
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_active_collection=True, export_apply=True,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_yup=True,
                              export_materials='EXPORT')
    print('EXPORTED', path)


# ---- render ---------------------------------------------------------------------------------------------------------

def setup_render(res=(1024, 1024), samples=48, sun=(50, 0, -38), sun_e=3.2, world='#eef0f3', world_e=0.9):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w')
    sc.world = w
    if hasattr(w, 'use_nodes'):
        w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = rgba(world)
    bg.inputs[1].default_value = world_e
    ld = bpy.data.lights.new('sun', 'SUN')
    ld.energy = sun_e
    ld.angle = math.radians(8)
    so = link(bpy.data.objects.new('sun', ld))
    so.rotation_euler = [math.radians(a) for a in sun]
    # ground that only takes shadows
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
    fl = to_obj('floor', bm, [mat('#cccccc')])
    fl.is_shadow_catcher = True
    cd = bpy.data.cameras.new('cam')
    cam = link(bpy.data.objects.new('cam', cd))
    sc.camera = cam
    return cam


def aim(cam, target, yaw, pitch, span, fov=20.0, aspect=1.0):
    """Camera looking at target from yaw degrees round Z (0 = in front, on -Y; positive swings toward +X, her left)
    and pitch degrees up; span is the vertical extent that fills the frame."""
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle_y = math.radians(fov)
    d = span / 2 / math.tan(math.radians(fov) / 2)
    y, p = math.radians(yaw), math.radians(pitch)
    pos = Vector(target) + Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p))) * d
    cam.location = pos
    cam.rotation_euler = (Vector(target) - pos).to_track_quat('-Z', 'Y').to_euler()
    cam.data.clip_end = d * 4 + 50


def render(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('RENDERED', path)


def bounds(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        pts += [ev.matrix_world @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi


# ---- round 2 helpers ----------------------------------------------------------------------------------------------

def cbox(name, m, lo, hi, ch=0.012, rot=(0, 0, 0), pivot=None, coll=None, taper=None):
    """A chamfered box from corner lo to corner hi (world metres), one flat bevel of ch on every edge (the world's
    detail.js cbox), turned by rot degrees about pivot (default its centre). taper (tx, ty) scales the top face."""
    lo, hi = Vector(lo), Vector(hi)
    size, c = hi - lo, (lo + hi) / 2
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    if taper:
        for v in bm.verts:
            if v.co.z > 0:
                v.co.x *= taper[0]
                v.co.y *= taper[1]
    bm.transform(Matrix.Diagonal((size.x, size.y, size.z, 1)))
    if ch:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(ch, min(size) * 0.45), segments=1, profile=0.5,
                        affect='EDGES', clamp_overlap=True)
    p = Vector(pivot) if pivot is not None else c
    bm.transform(Matrix.Translation(c))
    bm.transform(Matrix.Translation(p) @ Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4() @
                 Matrix.Translation(-p))
    return to_obj(name, bm, [m], None, coll)


def hull_mat(col='#15171c'):
    """Outline material for an inverted hull: one-sided (backface culling), so a viewer that culls (three.js, the
    game) shows only the far side peeking round the silhouette. Cycles ignores culling, so renders swap in
    hull_render_mat() (prepare_render)."""
    key = ('hull', col)
    if key in _mats:
        return _mats[key]
    m = mat(col, rough=1.0, spec=0.0)
    m = m.copy()
    m.name = 'outline'
    m.use_backface_culling = True
    _mats[key] = m
    return m


def hull_render_mat(m, objs=()):
    """Turn the outline material into: transparent where its face points at the camera, the ink colour elsewhere.
    The hull objects are made camera-only: otherwise every shadow and bounce ray leaving the figure hits the hull's
    inside and the figure renders black."""
    for o in objs:
        o.visible_shadow = o.visible_diffuse = o.visible_glossy = o.visible_transmission = False
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    bsdf = nt.nodes.get('Principled BSDF')
    ink = nt.nodes.new('ShaderNodeEmission')
    ink.inputs[0].default_value = bsdf.inputs['Base Color'].default_value
    ink.inputs[1].default_value = 0.35
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(geo.outputs['Backfacing'], mix.inputs[0])
    # the hull's faces are flipped, so its near side is the backfacing one: that side lets the figure show through
    nt.links.new(ink.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])


def hull(o, w, m, coll=None):
    """An inverted-hull outline round mesh object o: a copy pushed out w along its vertex normals, faces flipped."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.transform(o.matrix_world)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * w
    bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.normal_update()
    me = bpy.data.meshes.new(o.name + '-ink')
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(m)
    return link(bpy.data.objects.new(o.name + '-ink', me), coll)
