# The face decal: the original's painted eyes, one pair of brows and (where there is one) the blush, lifted off its
# face texture.
#   blender -b --factory-startup -P tools/creator/blender/face.py -- <body>
# Writes to art/parts/blender/: <body>-face.png (RGBA: the features, clear everywhere else), <body>-face.json (the
# front projection: which world x/z the picture covers, and the skin colour it was keyed from), and, to check,
# <body>-face-capture.png (the unkeyed capture) and <body>-face-boxes.png (the capture with the boxes drawn on).
#
# How: the original's head is drawn straight from the front, unlit, with only its skin triangles (hair that hangs over
# the face is left out, so none of it lands in the picture). Inside a few boxes (each eye, each brow, the blush)
# every pixel is unmixed from the skin colour into colour + alpha; everything outside the boxes is clear. Nothing
# else of the old texture comes along (no stubble, no hair paint, no shading).
import json
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402

# Boxes as fractions of the capture, (left, top, right, bottom), read like the picture: top-down, and picture-left
# is the character's right side (it is taken from the front).
BOXES = {
    'eric': {'eyes': [(0.215, 0.45, 0.44, 0.70), (0.56, 0.45, 0.795, 0.70)],
             'brows': [(0.19, 0.33, 0.44, 0.45), (0.56, 0.33, 0.81, 0.45)]},
    'mio': {'eyes': [(0.14, 0.43, 0.44, 0.745), (0.56, 0.43, 0.85, 0.745)],
            'blush': [(0.17, 0.72, 0.33, 0.83), (0.67, 0.72, 0.83, 0.83)]},
}
# Eric's stubble (the patch on his chin), lifted into its own picture for the stubble mesh
STUBBLE = {'eric': [(0.34, 0.79, 0.66, 0.99)]}
# Mio's right eye (picture left) has a stroke of fringe painted across it in the texture: her left eye is mirrored
# onto it instead (the eyes are drawn symmetrical).
MIRROR = {'mio': ('eyes', 1, 0)}
# the face frame in units of the model height: centre x, centre z, span (square)
FRAME = {'eric': (0.0, 0.66, 0.36), 'mio': (0.0, 0.63, 0.36)}
# a textured head triangle is face (not hair) when at least this share of its texels is light (skin, eye white)
LIGHT = {'eric': 0.04, 'mio': 0.3}
# Mio's iris is pale tan (Jørgen, 2026-09-30); sRGB, from its shadowed top to its lit bottom
TAN_DARK, TAN_LIGHT = np.array([0.66, 0.51, 0.34]), np.array([0.93, 0.84, 0.69])
LASH = np.array([0.24, 0.15, 0.1])
SIZE = 1024
# how far from skin a pixel must be to count as painted (start, ramp): eye whites are close to skin, so eyes key tight
RAMP = {'eyes': (0.02, 0.06), 'brows': (0.03, 0.15), 'blush': (0.012, 0.06)}


def skin_triangles(body, mesh):
    """Polygons to keep: the head's skin, eyes, brows and mouth; not hair."""
    me = mesh.data
    names = {v: k for k, v in C.rig_names(body).items()}
    gname = {g.index: names.get(g.name, g.name) for g in mesh.vertex_groups}

    def head(vi):
        gs = me.vertices[vi].groups
        return bool(gs) and gname[max(gs, key=lambda g: g.weight).group] in ('Head', 'headfront', 'head_end')
    img = bpy.data.images.load(os.path.join(C.ROOT, C.TEXTURE[body]))
    w, h = img.size
    px = np.array(img.pixels[:]).reshape(h, w, 4)[:, :, :3]
    uv = me.uv_layers[0].data

    def light_share(p):
        """Share of texture samples inside the triangle that are skin or eye-white (light)."""
        uvs = [uv[li].uv for li in p.loop_indices][:3]
        n = hit = 0
        for a in np.linspace(0.05, 0.9, 6):
            for b in np.linspace(0.05, 0.9 - a, 4):
                u = uvs[0][0] * (1 - a - b) + uvs[1][0] * a + uvs[2][0] * b
                v = uvs[0][1] * (1 - a - b) + uvs[1][1] * a + uvs[2][1] * b
                r, g, _ = px[min(h - 1, int(v * h)), min(w - 1, int(u * w))]
                n += 1
                hit += r > 0.8 and g > 0.7
        return hit / n
    faces = json.load(open(os.path.join(C.ROOT, C.MIO_FACES)))['faces'] if body == 'mio' else None
    keep = []
    for p in me.polygons:
        if not all(head(v) for v in p.vertices):
            continue
        if faces is not None and faces[p.index] is not None:
            if faces[p.index] == [247, 227, 216]:
                keep.append(p.index)
            continue
        # hair (Mio's navy and teal fringe, Eric's brown) has (almost) no light texels
        if light_share(p) > LIGHT[body]:
            keep.append(p.index)
    return keep


def capture(body):
    C.reset()
    arm, mesh = C.import_original(body)
    H = C.height(mesh)
    import reference   # the stubble patch's own (all brown) triangles come along, so the whole patch is captured
    keep = set(skin_triangles(body, mesh)) | set(reference.stubble_polys(body, mesh))
    me = mesh.data
    # unlit: the texture's own colours (Mio's skin triangles in their palette colour); set up before the other
    # triangles go, since her palette is by triangle number
    mat = C.mio_palette_material(mesh) if body == 'mio' else C.textured_material(C.TEXTURE[body])
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(bsdf.inputs['Base Color'].links[0].from_socket, em.inputs['Color'])
    nt.links.new(em.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    me.materials.append(mat)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16
    sc.cycles.use_denoising = False
    sc.render.resolution_x = sc.render.resolution_y = SIZE
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.world = bpy.data.worlds.new('w')
    cx, cz, span = FRAME[body]
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = span * H
    cam.location = Vector((cx * H, -5 * H, cz * H))
    cam.rotation_euler = (1.5707963, 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    out = os.path.join(C.OUT, f'{body}-face-capture.png')
    os.makedirs(C.OUT, exist_ok=True)
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    return out, {'x0': (cx - span / 2) * H, 'z0': (cz - span / 2) * H, 'span': span * H, 'height': H}


def to_srgb(x):
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.clip(x, 0, 1), 1 / 2.4) - 0.055)


def to_linear(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def save(name, rgba):
    """rgba: top-down sRGB rows."""
    im = bpy.data.images.new(name, rgba.shape[1], rgba.shape[0], alpha=True)
    flat = np.concatenate([to_linear(rgba[::-1, :, :3]), rgba[::-1, :, 3:]], axis=2)
    im.pixels[:] = flat.ravel()
    path = os.path.join(C.OUT, name + '.png')
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    return path


def rows(box):
    """(left, top, right, bottom) fractions -> top-down pixel slices."""
    l, t, r, b = box
    return slice(int(t * SIZE), int(b * SIZE)), slice(int(l * SIZE), int(r * SIZE))


def drop_specks(alpha, least):
    """Clear every patch of painted pixels smaller than `least` pixels (hair flecks, shading edges)."""
    seen = np.zeros(alpha.shape, bool)
    on = alpha > 0.1
    h, w = alpha.shape
    for r0, c0 in zip(*np.nonzero(on)):
        if seen[r0, c0]:
            continue
        stack, patch = [(r0, c0)], []
        seen[r0, c0] = True
        while stack:
            r, c = stack.pop()
            patch.append((r, c))
            for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= rr < h and 0 <= cc < w and on[rr, cc] and not seen[rr, cc]:
                    seen[rr, cc] = True
                    stack.append((rr, cc))
        if len(patch) < least:
            rs, cs = zip(*patch)
            alpha[list(rs), list(cs)] = 0
    # faint pixels no longer next to a kept patch go too
    alpha[(alpha <= 0.1)] = 0


def key(body, path, frame):
    im = bpy.data.images.load(path)
    px = np.array(im.pixels[:]).reshape(SIZE, SIZE, 4)[::-1]   # top-down now
    rgb, a0 = to_srgb(px[:, :, :3]), px[:, :, 3]
    # skin: the most common opaque colour
    solid = rgb[a0 > 0.99]
    q = np.round(solid * 32)
    vals, counts = np.unique(q, axis=0, return_counts=True)
    skin = solid[(q == vals[counts.argmax()]).all(1)].mean(0)
    dist = np.linalg.norm(rgb - skin, axis=2)
    alpha = np.zeros(dist.shape)
    kind_at = np.zeros(dist.shape, '<U5')
    for kind, boxes in BOXES[body].items():
        lo, width = RAMP[kind]
        for box in boxes:
            rs, cs = rows(box)
            alpha[rs, cs] = np.clip((dist[rs, cs] - lo) / width, 0, 1)
            kind_at[rs, cs] = kind
    alpha *= a0 > 0.5
    drop_specks(alpha, SIZE * SIZE // 4000)
    # unmix the colour from the skin under it
    a = np.maximum(alpha, 1e-4)[:, :, None]
    col = np.where(alpha[:, :, None] > 0.02, np.clip((rgb - (1 - a) * skin) / a, 0, 1), skin)
    if body in MIRROR:
        kind, src, dst = MIRROR[body]
        (rs, cs), (rd, cd) = rows(BOXES[body][kind][src]), rows(BOXES[body][kind][dst])
        # mirror about the face's middle: the source box flipped left-right lands on the destination's mirror image
        c0, c1 = SIZE - cs.stop, SIZE - cs.start
        alpha[rs, cd] = 0
        col[rs, cd] = skin
        alpha[rs, c0:c1] = alpha[rs, cs][:, ::-1]
        col[rs, c0:c1] = col[rs, cs][:, ::-1]
    if body == 'mio':
        # her iris: the teal/blue painted part of the eyes goes pale tan, keeping its light and dark
        mx, mn = col.max(2), col.min(2)
        sat = (mx - mn) / np.maximum(mx, 1e-4)
        lum = col @ np.array([0.2126, 0.7152, 0.0722])
        # the lashes (the darkest navy) stay as painted
        iris = (kind_at == 'eyes') & (sat > 0.3) & (col[:, :, 2] > col[:, :, 0] + 0.08) & (alpha > 0)
        t = np.clip((lum - 0.4) / 0.3, 0, 1)[:, :, None]
        tan = TAN_DARK * (1 - t) + TAN_LIGHT * t
        # the dark navy of the lash line and the top of the iris becomes a dark brown, so the eye keeps its outline
        dark = LASH * np.clip(lum / 0.4, 0.5, 1)[:, :, None]
        col = np.where(iris[:, :, None], np.where((lum < 0.4)[:, :, None], dark, tan), col)
    out = save(f'{body}-face', np.dstack([col, alpha]))
    # the check picture: the capture with every box drawn on it
    dbg = np.dstack([rgb, np.ones(dist.shape)])
    for kind, boxes in BOXES[body].items():
        for box in boxes:
            rs, cs = rows(box)
            for r in (rs.start, rs.stop - 1):
                dbg[r, cs] = (1, 0, 1, 1)
            for c in (cs.start, cs.stop - 1):
                dbg[rs, c] = (1, 0, 1, 1)
    for box in STUBBLE.get(body, []):
        rs, cs = rows(box)
        for r in (rs.start, rs.stop - 1):
            dbg[r, cs] = (0, 1, 0, 1)
        for c in (cs.start, cs.stop - 1):
            dbg[rs, c] = (0, 1, 0, 1)
    save(f'{body}-face-boxes', dbg)
    if body in STUBBLE:
        # the stubble goes on its own mesh, so it gets its own picture (same frame as the face)
        sa = np.zeros(dist.shape)
        for box in STUBBLE[body]:
            rs, cs = rows(box)
            sa[rs, cs] = np.clip((dist[rs, cs] - 0.04) / 0.15, 0, 1)
        sa *= a0 > 0.5
        drop_specks(sa, SIZE * SIZE // 4000)
        a = np.maximum(sa, 1e-4)[:, :, None]
        scol = np.where(sa[:, :, None] > 0.02, np.clip((rgb - (1 - a) * skin) / a, 0, 1), skin)
        save(f'{body}-stubble', np.dstack([scol, sa]))
    frame['skin'] = [round(float(x), 4) for x in skin]
    json.dump(frame, open(os.path.join(C.OUT, f'{body}-face.json'), 'w'), indent=1)
    print('FACE', out, frame)


if __name__ == '__main__':
    body = C.args()[0]
    path, frame = capture(body)
    key(body, path, frame)
