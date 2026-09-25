"""Blockout helpers for composition control, run inside Blender (blender -b --factory-startup -P <scene>.py -- <out_dir>).

Build a scene out of boxes and cylinders, then render control images by ray casting from the camera (no render engine,
no anti-aliasing, so object edges are exact):
  <name>-depth.png   depth for the Anima LLLite depth model (white = near, black = far; log scale so far things keep some shading)
  <name>-lines.png   black lines on white from object, normal and depth breaks (for the lineart / any-test LLLite models)
  <name>-color.png   flat colour guide (object colour with simple shading, sky gradient) for img2img
  <name>.blend       the scene, for opening in Blender
Units are metres. Axes: +Y forward (along the route or into the room), +X right, +Z up.
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

W, H = 1216, 832
_objs = []  # (object, rgb)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _objs.clear()


def _mat_for(rgb):
    name = 'c_%02x%02x%02x' % tuple(int(c * 255) for c in rgb)
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name)
        m.diffuse_color = (*rgb, 1)
    return m


def box(name, x0, x1, y0, y1, z0, z1, rgb=(0.7, 0.7, 0.7)):
    """Axis-aligned box from corner ranges."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(_mat_for(rgb))
    ob.color = (*rgb, 1)
    _objs.append((ob, rgb))
    return ob


def boxes(name, ranges, rgb=(0.7, 0.7, 0.7)):
    """Many axis-aligned boxes as one object (for facade bands and other repeated detail). ranges: [(x0,x1,y0,y1,z0,z1), ...]."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    for (x0, x1, y0, y1, z0, z1) in ranges:
        vs = [bm.verts.new((x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
        for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            bm.faces.new([vs[i] for i in f])
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(_mat_for(rgb))
    _objs.append((ob, rgb))
    return ob


def obox(name, p0, p1, width, z0, z1, rgb=(0.7, 0.7, 0.7)):
    """Box of given width between two points in plan (x, y), from z0 to z1 (for curved beams made of segments)."""
    p0, p1 = Vector((p0[0], p0[1], 0)), Vector((p1[0], p1[1], 0))
    d = p1 - p0
    L = d.length
    ob = box(name, -width / 2, width / 2, 0, L, z0, z1, rgb)
    ob.matrix_world = Matrix.Translation(p0) @ Matrix.Rotation(math.atan2(-d.x, d.y), 4, 'Z')
    return ob


def cyl(name, x, y, r, z0, z1, rgb=(0.7, 0.7, 0.7), verts=12):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=z1 - z0)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (x, y, (z0 + z1) / 2)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(_mat_for(rgb))
    _objs.append((ob, rgb))
    return ob


def camera(pos, look_at, lens=24.0, roll=0.0):
    cam = bpy.data.cameras.new('cam')
    cam.lens = lens
    cam.sensor_width = 36
    cam.sensor_fit = 'HORIZONTAL'
    ob = bpy.data.objects.new('cam', cam)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = pos
    d = Vector(look_at) - Vector(pos)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    ob.rotation_euler.rotate_axis('Z', roll)
    bpy.context.scene.camera = ob
    s = bpy.context.scene
    s.render.resolution_x, s.render.resolution_y = W, H
    return ob


def _bvh():
    verts, polys, owner = [], [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for k, (ob, rgb) in enumerate(_objs):
        mw = ob.matrix_world
        base = len(verts)
        verts += [mw @ v.co for v in ob.data.vertices]
        for p in ob.data.polygons:
            polys.append([base + i for i in p.vertices])
            owner.append(k)
    return BVHTree.FromPolygons(verts, polys), np.array(owner)


def render(out_dir, name, sky=((0.62, 0.80, 0.95), (0.88, 0.93, 0.97)), sun=(0.4, -0.5, 0.75), near=0.5, far=3000.0, blend=True, ss=2):
    """ss: supersampling factor. Rays are cast at ss x the size and averaged down, so thin far-away lines don't alias into dots."""
    OW, OH = W, H
    W_, H_ = W * ss, H * ss
    os.makedirs(out_dir, exist_ok=True)
    bpy.context.view_layer.update()
    tree, owner = _bvh()
    cam = bpy.context.scene.camera
    mw = cam.matrix_world
    origin = mw.translation.copy()
    rot = mw.to_3x3()
    lens = cam.data.lens
    sx = 36.0 / lens
    sy = sx * H / W
    dist = np.full((H_, W_), np.inf, np.float32)
    ids = np.full((H_, W_), -1, np.int32)
    nrm = np.zeros((H_, W_, 3), np.float32)
    dirs_y = np.zeros((H_, W_, 3), np.float32)
    for j in range(H_):
        cy = (0.5 - (j + 0.5) / H_) * sy
        for i in range(W_):
            d = rot @ Vector((((i + 0.5) / W_ - 0.5) * sx, cy, -1.0))
            d.normalize()
            dirs_y[j, i] = d
            loc, n, fi, t = tree.ray_cast(origin, d, far)
            if loc is not None:
                dist[j, i] = t
                ids[j, i] = owner[fi]
                if n.dot(d) > 0:
                    n = -n
                nrm[j, i] = n
    hit = np.isfinite(dist)
    # depth: white near, black far, log scale; sky = black
    dd = np.where(hit, dist, far)
    depth = 1 - np.log(np.clip(dd, near, far) / near) / math.log(far / near)
    depth = np.where(hit, depth, 0)
    # lines: object boundaries, normal creases, depth jumps
    def nb(a, axis):
        return np.roll(a, 1, axis=axis)
    edge = np.zeros((H_, W_), bool)
    for ax in (0, 1):
        e_id = ids != nb(ids, ax)
        e_n = (nrm * nb(nrm, ax)).sum(-1) < 0.85
        dn = nb(dd, ax)
        e_d = np.abs(dd - dn) / np.minimum(dd, dn) > 0.06
        edge |= (e_id | e_n | (e_d & hit))
    edge[0, :] = edge[:, 0] = False
    # colour guide
    cols = np.array([rgb for _, rgb in _objs] + [(0, 0, 0)], np.float32)
    base = cols[ids]
    L = np.array(sun, np.float32)
    L /= np.linalg.norm(L)
    shade = 0.72 + 0.28 * np.clip((nrm * L).sum(-1), -1, 1)[..., None]
    t = np.clip(dirs_y[..., 2] * 3, 0, 1)[..., None]
    skyc = np.array(sky[1], np.float32) * (1 - t) + np.array(sky[0], np.float32) * t
    # fade far surfaces toward the horizon haze
    fog = np.clip((dd - 300) / 3000, 0, 0.6)[..., None]
    color = np.where(hit[..., None], base * shade * (1 - fog) + np.array(sky[1], np.float32) * fog, skyc)
    def down(a):
        return a.reshape(OH, ss, OW, ss, *a.shape[2:]).mean(axis=(1, 3))
    depth, color = down(depth), down(color)
    lines = np.clip(1 - down(edge.astype(np.float32)) * 1.6, 0, 1)
    _save(os.path.join(out_dir, f'{name}-depth.png'), np.dstack([depth] * 3))
    _save(os.path.join(out_dir, f'{name}-lines.png'), np.dstack([lines] * 3))
    _save(os.path.join(out_dir, f'{name}-color.png'), color)
    if blend:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, f'{name}.blend'), compress=True)
    print('rendered', name, flush=True)


def _save(path, arr):
    img = bpy.data.images.new(os.path.basename(path), W, H, alpha=True)
    rgba = np.ones((H, W, 4), np.float32)
    rgba[..., :3] = np.clip(arr, 0, 1)
    img.pixels = rgba[::-1].ravel()  # Blender images start bottom-left
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def out_dir():
    argv = sys.argv
    return argv[argv.index('--') + 1] if '--' in argv else os.path.join(os.path.dirname(__file__), 'out')
