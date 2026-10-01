# char-mio-facets: lift the measured facet maps into a 3D mesh. The facets ARE the geometry: every facet corner in
# the front picture is one vertex, placed on the camera ray through that corner, so the front render at the
# picture's camera puts every edge where the picture has it. Only the depth along the ray is modelled:
#   - each part (head, torso, sleeves, hands, legs, shoes, the hair lock over her chest) is a stack of elliptical
#     cross-sections, one per picture row: its width from the part's own facets in the front map, its depth from the
#     side views (gen t3 l90 and r90, which share rows with the front: their silhouettes give front and back edge
#     per row);
#   - a front corner sits on the front half of its part's ellipse, a back corner (from the back map, read the same
#     way at the back camera) on the back half; corners shared by two parts take the mean;
#   - the hair lock in front of her right shoulder (image left) and her left (image right) hangs 12 mm in front of
#     the hoodie;
#   - a dark core (the same sections, 96 % or cfg core; core_depth flattens it toward the middle, so it stays
#     between the two shells, whose facets cut straight across the section) closes the sides where the front and
#     back maps don't meet exactly.
# Each facet keeps one flat colour (its median in the picture). The eyes, brows, nose and mouth are the only
# texture: a decal over the face facets, cut from the clean reference.
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_facets_lift.py <attempt>
# Reads mio-facets.json (the attempts) and claude-miofacets/wire/<map>.json; writes claude-miofacets/<attempt>/
# mesh.json (vertices in metres, Z up, she faces -Y, her left +X), decal.png and parts.webp (the part map).
import json
import math
import os
import sys

import cv2
import numpy as np
from shapely.geometry import Point, Polygon
from scipy import ndimage

import mio_i2i_cam as C
from mio_facets_wire import OUT, figure_mask

HERE = os.path.dirname(os.path.abspath(__file__))
T3 = os.path.join(C.MAIN, 'art/parts/style-concepts/claude-mioi2i/gen/t3')
F = 512 / math.tan(math.radians(C.FOV) / 2)

# zones in the front picture's 1024 frame (image left = her right)
HAIRLOCK = [(410, 250), (474, 250), (474, 368), (447, 364), (432, 346), (428, 306), (414, 300)]
HAIRLEFT = [(574, 250), (606, 250), (606, 288), (588, 288)]
SLEEVE_R = [(300, 300), (424, 315), (413, 519), (403, 569), (300, 640)]  # her right sleeve, image left
SLEEVE_L = [(724, 300), (596, 319), (605, 519), (617, 569), (724, 640)]  # her left sleeve, image right
CHIN, NECK_LO, CUFF_LO, HEM_LO, SHOE_TOP = 260, 300, 604, 628, 878
DECAL_BOXES = [(440, 168, 576, 216), (502, 202, 525, 225), (498, 230, 526, 244), (566, 188, 594, 232)]


def inside(poly, p):
    return Polygon(poly).contains(Point(p))


def is_skin(rgb):
    r, g, b = rgb
    return r > 120 and r > g + 12 and g > b and r - b > 40


def front_part(p):
    x, y = p['c']
    rgb = p['rgb']
    if y >= SHOE_TOP:
        return 'shoe.L' if x > 512 else 'shoe.R'
    if y >= HEM_LO:
        if is_skin(rgb) or (x < 430 or x > 594):
            return 'hand.L' if x > 512 else 'hand.R'
        return 'leg.L' if x > 512 else 'leg.R'
    if y >= CUFF_LO - 8 and (x < 432 or x > 592) and is_skin(rgb):
        return 'hand.L' if x > 512 else 'hand.R'
    if y < CHIN:
        if inside(HAIRLOCK, (x, y)) and y > 246:
            return 'hairlock'
        return 'head'
    if inside(HAIRLOCK, (x, y)) and not is_skin(rgb):
        return 'hairlock'
    if inside(HAIRLEFT, (x, y)):
        return 'hairlock'
    if inside(SLEEVE_R, (x, y)):
        return 'sleeve.R'
    if inside(SLEEVE_L, (x, y)):
        return 'sleeve.L'
    if is_skin(rgb) and y < NECK_LO + 20:
        return 'neck'
    return 'torso'


def back_part(p):
    """The back picture: image left is her left. Mirror into the front frame and use the same zones (no hair lock:
    from behind the hair hangs over the hood)."""
    x, y = p['c']
    q = dict(p, c=[1024 - x, y])
    part = front_part(q)
    if part == 'hairlock':
        return 'head' if y < CHIN + 30 else 'torso'
    return part


# ---- camera ---------------------------------------------------------------------------------------------------

def cam(yaw):
    p = math.radians(C.PITCH)
    y = math.radians(yaw)
    pos = np.array(C.cam_pos(yaw))
    fwd = np.array([-math.sin(y) * math.cos(p), math.cos(y) * math.cos(p), -math.sin(p)])
    right = np.array([math.cos(y), math.sin(y), 0.0])
    up = np.cross(right, fwd)
    return pos, fwd, right, up


def ray(c, u, v):
    pos, fwd, right, up = c
    d = fwd + (u - 512) / F * right - (v - 512) / F * up
    return pos, d / np.linalg.norm(d)


def row_z(v):
    return C.unproject_z(v)


# ---- side profile ----------------------------------------------------------------------------------------------

def side_profile():
    """Per picture row: the figure's front and back edge in world Y, from the two side views (their mean)."""
    out = []
    for name, sign in (('l90', 1), ('r90', -1)):
        im = cv2.imread(os.path.join(T3, name + '.png'))
        m = figure_mask(im, None, 1024)
        m = ndimage.binary_opening(m, iterations=2)
        f = np.full(1024, np.nan)
        b = np.full(1024, np.nan)
        for v in range(1024):
            xs = np.nonzero(m[v])[0]
            if len(xs) < 3:
                continue
            ya = sign * (xs.min() - 512) / F * C.DIST + C.MID[1]
            yb = sign * (xs.max() - 512) / F * C.DIST + C.MID[1]
            f[v], b[v] = min(ya, yb), max(ya, yb)
        out.append((f, b))
    f = np.nanmean([out[0][0], out[1][0]], axis=0)
    b = np.nanmean([out[0][1], out[1][1]], axis=0)
    return smooth_rows(f), smooth_rows(b)


def smooth_rows(a, k=9):
    a = a.copy()
    ok = ~np.isnan(a)
    if not ok.any():
        return a
    idx = np.arange(len(a))
    a[~ok] = np.interp(idx[~ok], idx[ok], a[ok])
    a = ndimage.median_filter(a, size=k)
    return ndimage.uniform_filter1d(a, size=k)


# ---- part cross-sections --------------------------------------------------------------------------------------

class Section:
    """A part's elliptical cross-section per picture row: centre x, half width (from its front facets), centre y,
    half depth (from the side profile, or round)."""

    def __init__(self, mask, prof, round_=False, depth_scale=1.0, center=None):
        rows = np.nonzero(mask.any(axis=1))[0]
        self.v0, self.v1 = rows.min(), rows.max()
        cx = np.full(1024, np.nan)
        wx = np.full(1024, np.nan)
        for v in rows:
            xs = np.nonzero(mask[v])[0]
            z = row_z(v)
            a, b = C.unproject_x(xs.min(), z), C.unproject_x(xs.max() + 1, z)
            cx[v], wx[v] = (a + b) / 2, max((b - a) / 2, 0.004)
        self.cx = smooth_rows(cx, 5)
        self.wx = smooth_rows(wx, 5)
        f, b = prof
        if round_:
            self.dy = self.wx * depth_scale
            self.cy = (f + b) / 2 if center is None else center
        else:
            self.dy = (b - f) / 2 * depth_scale
            self.cy = (f + b) / 2
        self.cy = smooth_rows(np.asarray(self.cy, float), 9)

    def at(self, v):
        v = int(np.clip(round(v), self.v0, self.v1))
        return self.cx[v], self.wx[v], self.cy[v], self.dy[v]

    def surf_y(self, x, v, side):
        cx, wx, cy, dy = self.at(v)
        t = min(abs(x - cx) / wx, 1.0)
        return cy + side * dy * math.sqrt(1 - t * t)


CFG = {}


def lift(c, u, v, sec, side, offset=0.0):
    """The point on the ray through (u, v) that lies on the part's surface (front side -1, back +1)."""
    pos, d = ray(c, u, v)
    y = sec.at(v)[2]
    for _ in range(6):
        t = (y - pos[1]) / d[1]
        p = pos + t * d
        y = sec.surf_y(p[0], v, side) + side * offset
    t = (y - pos[1]) / d[1]
    p = pos + t * d
    if side > 0 and CFG.get('clamp_back'):
        # the back map's outline is not the front's: keep its corners inside the part's front outline, so the back
        # never shows round the front's edges
        cx, wx, cy, dy = sec.at(v)
        if abs(p[0] - cx) > wx:
            p = np.array([cx + math.copysign(wx, p[0] - cx), cy, p[2]])
    return p


def extents(mask):
    """Per row: (left, right) pixel of the mask, rows without it filled from the nearest row that has it."""
    rows = np.nonzero(mask.any(axis=1))[0]
    lr = np.full((1024, 2), np.nan)
    for v in rows:
        xs = np.nonzero(mask[v])[0]
        lr[v] = xs.min(), xs.max() + 1
    idx = np.arange(1024)
    for j in (0, 1):
        ok = ~np.isnan(lr[:, j])
        lr[~ok, j] = np.interp(idx[~ok], idx[ok], lr[ok, j])
    return lr


def back_warp(B, front_masks):
    """The back map, mirrored into the front frame and stretched row by row so each part spans exactly what the
    same part spans from the front: the back's outline becomes the front's, so the two shells meet at the sides.
    Returns (part, u, v) -> (u, v) in the front picture (rows clamped to the part's rows from the front); the corner is then lifted along the front camera's ray."""
    mirrored = [[1024 - x, y] for x, y in B['verts']]
    bm = {}
    for p in B['polys']:
        bm.setdefault(back_part(p), []).append(p)
    bext = {k: extents(raster(ps, mirrored)) for k, ps in bm.items()}
    fext = {k: extents(m) for k, m in front_masks.items() if m.any()}

    rows = {k: np.nonzero(m.any(axis=1))[0] for k, m in front_masks.items() if m.any()}

    def warp(k, u, v):
        um = 1024 - u
        if k not in bext or k not in fext:
            return um, v
        # rows beyond the part's rows from the front (the back's hem hangs lower) are pulled up to its last row
        v = float(np.clip(v, rows[k].min(), rows[k].max()))
        r = int(round(v))
        bl, br = bext[k][r]
        fl, fr = fext[k][r]
        if br - bl < 1:
            return (fl + fr) / 2, v
        return fl + (um - bl) / (br - bl) * (fr - fl), v

    return warp


def raster(polys, verts):
    m = np.zeros((1024, 1024), np.uint8)
    for p in polys:
        pts = np.array([verts[i] for i in p['ring']], np.float32)
        cv2.fillPoly(m, [np.round(pts * 4).astype(np.int32)], 1, shift=2)
    return m > 0


# ---- build ------------------------------------------------------------------------------------------------------

def build(cfg):
    CFG.clear()
    CFG.update(cfg)
    W = json.load(open(os.path.join(OUT, 'wire', cfg['front'] + '.json')))
    prof = side_profile()
    fv = W['verts']
    for p in W['polys']:
        p['part'] = p.get('part') or front_part(p)  # hand-drawn maps name each facet's part
    parts = sorted({p['part'] for p in W['polys']})
    masks = {k: raster([p for p in W['polys'] if p['part'] == k], fv) for k in parts}
    body = np.zeros((1024, 1024), bool)
    for k in ('torso', 'neck', 'sleeve.L', 'sleeve.R'):
        if k in masks:
            body |= masks[k]
    secs = {}
    torso_sec = Section(masks['torso'], prof)
    for k in parts:
        if k == 'hairlock':
            continue
        if k.startswith('sleeve') or k.startswith('hand') or k == 'neck':
            secs[k] = Section(masks[k], prof, round_=True, center=torso_sec.cy)
        else:
            secs[k] = Section(masks[k], prof)
    secs['hairlock'] = Section(body | masks.get('hairlock', False), prof)

    verts, faces = [], []

    def add_side(Wm, part_of, yaw, side, warp=None):
        c = cam(yaw)
        c_lift = cam(0) if warp else c
        vv = Wm['verts']
        acc = {}
        for p in Wm['polys']:
            k = part_of(p)
            p['part'] = k
            ids = set(i for t in p['tris'] for i in t)
            for i in ids:
                key = (i, 'lock') if k == 'hairlock' else (i, 'body')
                u, v = vv[i]
                if warp:
                    u, v = warp(k, u, v)
                off = 0.012 if k == 'hairlock' else 0.0
                acc.setdefault(key, []).append(lift(c_lift, u, v, secs[k], side, off))
        index = {}
        for key, pts in acc.items():
            index[key] = len(verts)
            verts.append(np.mean(pts, axis=0))
        for p in Wm['polys']:
            kind = 'lock' if p['part'] == 'hairlock' else 'body'
            for t in p['tris']:
                tri = [index[(i, kind)] for i in t]
                # wind so the face normal points at the camera that saw it
                a, b, cc = (np.asarray(verts[i]) for i in tri)
                n = np.cross(b - a, cc - a)
                if np.dot(n, c[0] - a) < 0:
                    tri = tri[::-1]
                faces.append(dict(v=tri, rgb=p['rgb'], part=p['part'], side='front' if side < 0 else 'back',
                                  facet=p['id']))
        return index

    findex = add_side(W, lambda p: p['part'], 0, -1)
    if cfg.get('back'):
        B = json.load(open(os.path.join(OUT, 'wire', cfg['back'] + '.json')))
        warp = None
        if cfg.get('warp_back'):
            warp = back_warp(B, masks)
        add_side(B, back_part, 180, 1, warp)
    # dark core: each part's sections at 96 %, so the seams at the sides read as shadow, not holes
    core_rgb = {}
    for f in faces:
        core_rgb.setdefault(f['part'], []).append(f['rgb'])
    for k, sec in secs.items():
        if k == 'hairlock':
            continue
        col = [int(x * 0.55) for x in np.median(core_rgb.get(k, [[40, 40, 40]]), axis=0)]
        rows = list(range(int(sec.v0), int(sec.v1) + 1, 6))
        if rows[-1] != sec.v1:
            rows.append(int(sec.v1))
        n = 12
        CORE = CFG.get('core', 0.96)
        CORE_D = CFG.get('core_depth', CORE)
        rings = []
        for v in rows:
            cx, wx, cy, dy = sec.at(v)
            z = row_z(v)
            ring = []
            for j in range(n):
                a = 2 * math.pi * j / n
                ring.append(len(verts))
                verts.append(np.array([cx + CORE * wx * math.cos(a), cy + CORE_D * dy * math.sin(a), z]))
            rings.append(ring)
        for A, Bq in zip(rings, rings[1:]):
            for j in range(n):
                jj = (j + 1) % n
                faces.append(dict(v=[A[j], A[jj], Bq[jj]], rgb=col, part=k, side='core'))
                faces.append(dict(v=[A[j], Bq[jj], Bq[j]], rgb=col, part=k, side='core'))
        for ring, rev in ((rings[0], False), (rings[-1], True)):
            c0 = len(verts)
            verts.append(np.mean([verts[i] for i in ring], axis=0))
            for j in range(n):
                tri = [c0, ring[j], ring[(j + 1) % n]]
                faces.append(dict(v=tri[::-1] if rev else tri, rgb=col, part=k, side='core'))
    # the face decal: the face facets again, 1 mm toward the camera, textured with the picture's eyes, brows,
    # nose and mouth (alpha only where the picture differs from the facet's flat colour)
    decal = []
    c0 = cam(0)
    for p in W['polys']:
        if p['part'] != 'head' or not is_skin(p['rgb']):
            continue
        xs = [fv[i][0] for i in p['ring']]
        ys = [fv[i][1] for i in p['ring']]
        if not any(min(xs) < x1 and max(xs) > x0 and min(ys) < y1 and max(ys) > y0 for x0, y0, x1, y1 in DECAL_BOXES):
            continue
        for t in p['tris']:
            tri = []
            for i in t:
                q = np.asarray(verts[findex[(i, 'body')]]) - 0.001 * np.asarray(ray(c0, *fv[i])[1])
                tri.append(dict(co=[float(x) for x in q], uv=[fv[i][0] / 1024, 1 - fv[i][1] / 1024]))
            decal.append(tri)
    return W, verts, faces, decal, secs


def decal_png(W, out):
    im = cv2.imread(C.CLEAN)
    im = cv2.resize(im, (2048, 2048), interpolation=cv2.INTER_AREA)
    flat = np.zeros_like(im)
    for p in W['polys']:
        pts = np.array([W['verts'][i] for i in p['ring']], np.float32) * 2
        cv2.fillPoly(flat, [np.round(pts).astype(np.int32)], tuple(int(x) for x in p['rgb'][::-1]))
    diff = np.abs(im.astype(int) - flat.astype(int)).max(axis=2)
    a = (diff > 22).astype(np.uint8) * 255
    box = np.zeros_like(a)
    for x0, y0, x1, y1 in DECAL_BOXES:
        box[y0 * 2:y1 * 2, x0 * 2:x1 * 2] = 255
    a = cv2.GaussianBlur(np.minimum(a, box), (3, 3), 0)
    cv2.imwrite(out, np.dstack([im, a]))


def part_sheet(W, out):
    cols = {}
    rng = np.random.default_rng(3)
    im = cv2.resize(cv2.imread(C.CLEAN), (1024, 1024), interpolation=cv2.INTER_AREA)
    over = im.copy()
    for p in W['polys']:
        k = p['part']
        if k not in cols:
            cols[k] = tuple(int(x) for x in rng.integers(60, 255, 3))
        pts = np.array([W['verts'][i] for i in p['ring']], np.float32)
        cv2.fillPoly(over, [np.round(pts * 4).astype(np.int32)], cols[k], shift=2)
    img = cv2.addWeighted(im, 0.45, over, 0.55, 0)
    for k, c in cols.items():
        ps = [p['c'] for p in W['polys'] if p['part'] == k]
        x, y = np.mean(ps, axis=0)
        cv2.putText(img, k, (int(x) - 20, int(y)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(out, img[40:1000, 300:724], [cv2.IMWRITE_WEBP_QUALITY, 90])


def main():
    att = sys.argv[1]
    cfg = json.load(open(os.path.join(HERE, 'mio-facets.json')))[att]
    d = os.path.join(OUT, att)
    os.makedirs(d, exist_ok=True)
    W, verts, faces, decal, secs = build(cfg)
    json.dump(dict(verts=[[round(float(x), 5) for x in v] for v in verts], faces=faces, decal=decal),
              open(os.path.join(d, 'mesh.json'), 'w'))
    decal_png(W, os.path.join(d, 'decal.png'))
    part_sheet(W, os.path.join(d, 'parts.webp'))
    print(att, len(verts), 'vertices', len(faces), 'faces',
          sum(1 for f in faces if f['side'] == 'front'), 'front', sum(1 for f in faces if f['side'] == 'back'), 'back',
          len(decal), 'decal')


if __name__ == '__main__':
    main()
