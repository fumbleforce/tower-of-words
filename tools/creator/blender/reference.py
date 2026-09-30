# Pieces of the original model used as references (never exported): its hair shell and, for Eric, the stubble patch.
import json
import os

import bmesh
import bpy
import numpy as np

import common as C
import face as F


def head_polys(body, mesh, bones=('Head', 'headfront', 'head_end')):
    names = {v: k for k, v in C.rig_names(body).items()}
    gname = {g.index: names.get(g.name, g.name) for g in mesh.vertex_groups}
    me = mesh.data

    def head(vi):
        gs = me.vertices[vi].groups
        return bool(gs) and gname[max(gs, key=lambda g: g.weight).group] in bones
    return [p.index for p in me.polygons if sum(head(v) for v in p.vertices) >= 2]


def median_colour(mesh, img_px, p):
    h, w = img_px.shape[:2]
    uv = mesh.data.uv_layers[0].data
    uvs = [uv[li].uv for li in p.loop_indices][:3]
    samples = []
    for a, b in ((0.2, 0.2), (0.33, 0.33), (0.6, 0.2), (0.2, 0.6), (0.4, 0.15)):
        u = uvs[0][0] * (1 - a - b) + uvs[1][0] * a + uvs[2][0] * b
        v = uvs[0][1] * (1 - a - b) + uvs[1][1] * a + uvs[2][1] * b
        samples.append(img_px[min(h - 1, int(v * h)), min(w - 1, int(u * w))])
    return np.median(np.array(samples), axis=0)


def hair_polys(body, mesh):
    """The original's hair: head and neck triangles that are hair-coloured, not face skin, eyes, the hood or (Eric)
    the stubble patch on the chin. The hair at the nape is weighted to the neck bone, so the neck counts too."""
    skin = set(F.skin_triangles(body, mesh))
    H = C.height(mesh)
    W = mesh.matrix_world
    img = bpy.data.images.load(os.path.join(C.ROOT, C.TEXTURE[body]))
    px = np.array(img.pixels[:]).reshape(img.size[1], img.size[0], 4)[:, :, :3]
    faces = json.load(open(os.path.join(C.ROOT, C.MIO_FACES)))['faces'] if body == 'mio' else None
    out = []
    # Mio's side locks are weighted to her upper body, so for her every triangle above the collar is a candidate
    cands = head_polys(body, mesh, ('Head', 'headfront', 'head_end', 'neck')) if body == 'eric' else \
        [p.index for p in mesh.data.polygons if (W @ p.center).z / H > 0.5]
    for i in cands:
        if i in skin:
            continue
        p = mesh.data.polygons[i]
        c = (W @ p.center) / H
        if body == 'eric':
            if c.z < 0.6 and c.y < -0.05:
                continue        # the stubble patch on the chin
            if min((W @ mesh.data.vertices[v].co).z for v in p.vertices) / H < 0.54:
                continue        # strands down the nape that the hood hid
            r, g, b = median_colour(mesh, px, p)
            if r - b < 0.06 or r > 0.85:
                continue        # the grey hood, the dark shirt collar, the neck's skin
        else:
            if c.z < 0.5 or (c.z < 0.56 and abs(c.x) < 0.1):
                continue        # the hood's collar round her neck
        out.append(i)
    return out


def stubble_polys(body, mesh):
    if body != 'eric':
        return []
    skin = set(F.skin_triangles(body, mesh))
    H = C.height(mesh)
    W = mesh.matrix_world
    out = []
    for i in head_polys(body, mesh):
        c = (W @ mesh.data.polygons[i].center) / H
        if i not in skin and 0.52 < c.z < 0.6 and c.y < -0.05:
            out.append(i)
    return out


def copy_polys(mesh, polys, name):
    """A new object holding just these polygons of the original (world space, height units untouched)."""
    me = mesh.data.copy()
    me.transform(mesh.matrix_world)      # world coordinates in the mesh itself; the object sits at the origin
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    keep = set(polys)
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    bm.to_mesh(me)
    bm.free()
    obj.vertex_groups.clear()
    return obj
