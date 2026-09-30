#!/usr/bin/env python3
"""Repair a source-derived base (creator-base-5 feedback) into a new version.

  python repair_source_base.py eric source15 source16
  python repair_source_base.py mio source15 source16

Jørgen on creator-base-5: "texture bleed onto the body models currently, some hair colour is smearing onto the
body. Eric's head is not attached to the body without clothes." Two fixes, nothing else changes:

1. Clean skin texture. The base gets its own copy of the source texture in which every texel used by the base's
   textured head triangles is repainted skin, except inside the face window (eyes, brows, blush). Hair painted
   onto the original head (sideburns, strands at the temples, the back of Mio's head) goes. Positions, UVs and
   weights stay as they are; the shared source texture is untouched.
2. Neck plug. Where the bare body's neck stops short of the head (Eric), a closed eight-sided tube runs from
   inside the neck up into the head: bottom ring weighted like the neck top, top ring and cap on the Head bone.
   Mio's base already has one.

It also names each triangle's piece (`pieces`: body, head, neck, ear) and records the face layout (`face`: the window and each eye's box, in bind coordinates) for the creator's
eye styles. Requires numpy and Pillow. Writes clean-<id>-<new>.json/.png and copies the fitted layers
(clean-<id>-<new>-fit3-layers.json) with the new base id. Refuses to overwrite.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
PARTS = ROOT / 'art/parts'
BASE = PARTS / 'base'
HEAD, NECK = 21, 20   # shared skeleton indices (recipe.js BONES)

# Face layout per body, bind coordinates (height 1). Window: boxes (|x| range, y range) around everything drawn on
# the face that stays (eyes, lashes, brows); they stop short of the painted sideburns and strands beside the eyes. Eyes: the box each eye sits in (centre x of the eye on the character's left (image right), y;
# half width, half height), used by the creator's drawn eye styles. Measured on front projections of source15.
FACE = {
    'eric': {'window': [{'x': [0, 0.118], 'y': [0.596, 0.715]}], 'eye': {'c': [0.08, 0.642], 'h': [0.05, 0.048]},
             'brows': [0.692, 0.722], 'frontZ': 0.0},
    'mio': {'window': [{'x': [0.03, 0.127], 'y': [0.592, 0.662]}, {'x': [0.035, 0.12], 'y': [0.548, 0.592]}], 'eye': {'c': [0.083, 0.606], 'h': [0.05, 0.056]},
            'brows': None, 'frontZ': 0.0},
}


def srgb(linear):
    linear = np.asarray(linear, float)
    return np.where(linear <= 0.0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - 0.055) * 255


def components(corners):
    """Per-triangle connected piece of a triangle soup (corners welded by position)."""
    ids = {}
    vid = np.array([ids.setdefault(tuple(np.round(p, 5)), len(ids)) for p in corners])
    parent = list(range(len(ids)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for t in range(len(corners) // 3):
        a, b, c = vid[3 * t:3 * t + 3]
        parent[find(b)] = find(a)
        parent[find(c)] = find(a)
    roots = np.array([find(vid[3 * t]) for t in range(len(corners) // 3)])
    return np.unique(roots, return_inverse=True)[1]


def in_window(p, face):
    x, y = np.abs(p[..., 0]), p[..., 1]
    hit = np.zeros(p.shape[:-1], bool)
    for box in face['window']:
        hit |= (x >= box['x'][0]) & (x < box['x'][1]) & (y > box['y'][0]) & (y < box['y'][1])
    return hit & (p[..., 2] > face['frontZ'])


def clean_texture(d, face):
    """Repaint hair and other non-face paint on the base's textured triangles as skin (a new texture)."""
    tex = np.asarray(Image.open(PARTS / d['tex']).convert('RGBA')).copy()
    th, tw = tex.shape[:2]
    pos = np.array(d['pos']).reshape(-1, 3, 3)
    uv = np.array(d['uv']).reshape(-1, 3, 2)
    textured = np.array(d['useTex']).reshape(-1, 3)[:, 0] > 0.5
    skin = srgb(d['skin'])
    # skin and its shading: close to the skin colour and warm (red leads), so pale grey-cyan hair shine goes too
    near_skin = lambda c: ((np.linalg.norm(c[..., :3].astype(float) - skin, axis=-1) < 42)
                           & (c[..., 0] >= c[..., 1]) & (c[..., 0].astype(int) >= c[..., 2].astype(int) + 22))
    # blush: light pink (blue at least green). Hair paint (navy, teal, brown, tan highlights, grey-blue) is neither.
    blush = lambda c: (c[..., 0] > 215) & (c[..., 1] < c[..., 0] - 20) & (c[..., 2] >= c[..., 1] - 8)
    decided = {}   # texel -> keep?  (a texel on two triangles keeps only if both keep it)
    samples = []
    for t in np.where(textured)[0]:
        X, Y = uv[t, :, 0] * tw, uv[t, :, 1] * th   # flipY false: v runs down the image
        den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2])
        if abs(den) < 1e-9:
            continue
        pad = 2.5   # texels around the triangle too, so filtering never pulls hair paint in from its edge
        x0, x1 = int(max(0, X.min() - pad)), int(min(tw - 1, X.max() + pad))
        y0, y1 = int(max(0, Y.min() - pad)), int(min(th - 1, Y.max() + pad))
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
        a = ((Y[1] - Y[2]) * (gx - X[2]) + (X[2] - X[1]) * (gy - Y[2])) / den
        b = ((Y[2] - Y[0]) * (gx - X[2]) + (X[0] - X[2]) * (gy - Y[2])) / den
        c = 1 - a - b
        # distance outside the triangle, in texels (barycentric slack scaled by the triangle's size)
        size = max(X.max() - X.min(), Y.max() - Y.min(), 1)
        slack = -np.minimum(np.minimum(a, b), c) * size
        inside = slack <= pad
        if not inside.any():
            continue
        p = (np.clip(a, -.5, 1.5)[..., None] * pos[t, 0] + np.clip(b, -.5, 1.5)[..., None] * pos[t, 1]
             + np.clip(c, -.5, 1.5)[..., None] * pos[t, 2])
        patch = tex[y0:y1 + 1, x0:x1 + 1].astype(int)
        keep = in_window(p, face) | near_skin(patch) | blush(patch)
        ys, xs = np.where(inside)
        core = slack[ys, xs] <= 0
        for yy, xx, k, is_core in zip(ys + y0, xs + x0, keep[ys, xs], core):
            key = (int(yy), int(xx))
            decided[key] = decided.get(key, True) and bool(k)
            if is_core and near_skin(tex[yy, xx]):
                samples.append(tex[yy, xx, :3])
    tone = np.median(np.array(samples), axis=0) if samples else skin
    # Start from plain skin and copy only the kept texels: mipmaps then never average in hair paint from texels
    # the base doesn't use.
    clean = np.empty_like(tex)
    clean[..., :3] = tone
    clean[..., 3] = 255
    kept = [key for key, keep in decided.items() if keep]
    ys, xs = np.array(kept).T
    clean[ys, xs] = tex[ys, xs]
    painted = len(decided) - len(kept)
    return Image.fromarray(clean), {'paintedTexels': painted, 'keptTexels': len(kept), 'skinTone': [int(v) for v in tone]}


def ray_up(origin, tris):
    """Lowest hit above `origin` going +y against triangles (n,3,3); None if no hit."""
    best = None
    for tri in tris:
        a, b, c = tri
        e1, e2 = b - a, c - a
        h = np.cross([0, 1, 0], e2)
        det = e1 @ h
        if abs(det) < 1e-12:
            continue
        s = origin - a
        u = (s @ h) / det
        q = np.cross(s, e1)
        v = np.array([0, 1, 0]) @ q / det
        if u < 0 or v < 0 or u + v > 1:
            continue
        t = (e2 @ q) / det
        if t > 0 and (best is None or t < best):
            best = t
    return None if best is None else origin[1] + best


def neck_plug(d):
    """Eight-sided closed tube from inside the neck top into the head, or None when the neck already reaches."""
    pos = np.array(d['pos']).reshape(-1, 3)
    tri = pos.reshape(-1, 3, 3)
    comp = components(pos)
    tops = [tri[comp == k][..., 1].max() for k in range(comp.max() + 1)]
    lows = [tri[comp == k][..., 1].min() for k in range(comp.max() + 1)]
    body = int(np.argmin(lows))            # the piece reaching the floor
    head = int(np.argmax(tops))            # the piece reaching the crown
    if body == head:
        return None
    for k in range(comp.max() + 1):       # an existing plug: a piece spanning the neck/head join
        if k not in (body, head) and lows[k] < tops[body] and tops[k] > lows[head] and np.ptp(tri[comp == k][..., 0]) < .08:
            return None
    corners = np.where(np.repeat(comp == body, 3))[0]
    top_y = pos[corners, 1].max()
    ring = corners[pos[corners, 1] > top_y - 0.008]
    centre = pos[ring].mean(0)
    rx = 0.8 * np.abs(pos[ring, 0] - centre[0]).max()
    rz = 0.8 * np.abs(pos[ring, 2] - centre[2]).max()
    head_tris = tri[comp == head]
    hits = [ray_up(np.array([centre[0] + dx * rx, top_y - 0.05, centre[2] + dz * rz]), head_tris)
            for dx, dz in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]]
    hits = [h for h in hits if h is not None]
    if not hits:
        raise SystemExit('neck plug: no head surface above the neck')
    y_top = max(hits) + 0.015
    y_bottom = top_y - 0.04
    si = np.array(d['si']).reshape(-1, 4)
    sw = np.array(d['sw']).reshape(-1, 4)
    n = 8
    ang = np.arange(n) * 2 * np.pi / n
    ring_at = lambda y: np.stack([centre[0] + rx * np.cos(ang), np.full(n, y), centre[2] + rz * np.sin(ang)], 1)
    low, high = ring_at(y_bottom), ring_at(y_top)
    # weights: bottom ring like the nearest neck-top corner, top ring and cap all Head
    nearest = [ring[np.argmin(np.linalg.norm(pos[ring] - p, axis=1))] for p in low]
    faces = []   # (corner positions, corner weights)
    head_w = ([HEAD, NECK, 0, 0], [1, 0, 0, 0])
    lw = [(list(si[k]), list(sw[k])) for k in nearest]
    for i in range(n):
        j = (i + 1) % n
        # outward winding (counter-clockwise seen from outside)
        faces.append(([low[i], high[j], low[j]], [lw[i], head_w, lw[j]]))
        faces.append(([low[i], high[i], high[j]], [lw[i], head_w, head_w]))
        faces.append(([high[i], np.array([centre[0], y_top, centre[2]]), high[j]], [head_w, head_w, head_w]))
        faces.append(([low[i], low[j], np.array([centre[0], y_bottom, centre[2]])], [lw[i], lw[j], lw[i]]))
    # make every triangle face away from the tube's axis (or up/down for caps)
    out = []
    for ps, ws in faces:
        ps = [np.asarray(p, float) for p in ps]
        nrm = np.cross(ps[1] - ps[0], ps[2] - ps[0])
        mid = sum(ps) / 3
        want = mid - np.array([centre[0], mid[1], centre[2]])
        if abs(mid[1] - y_top) < 1e-6:
            want = np.array([0, 1, 0])
        elif abs(mid[1] - y_bottom) < 1e-6:
            want = np.array([0, -1, 0])
        if nrm @ want < 0:
            ps = [ps[0], ps[2], ps[1]]
            ws = [ws[0], ws[2], ws[1]]
            nrm = -nrm
        out.append((ps, ws, nrm / np.linalg.norm(nrm)))
    info = {'triangles': len(out), 'from': round(float(y_bottom), 4), 'to': round(float(y_top), 4),
            'neckTop': round(float(top_y), 4), 'headUnderside': round(float(max(hits)), 4)}
    return out, info


def pieces(d):
    """Name each triangle's closed piece: body (reaches the floor), head (reaches the crown), neck plug or ear."""
    tri = np.array(d['pos']).reshape(-1, 3, 3)
    comp = components(tri.reshape(-1, 3))
    names = {}
    tops = {k: tri[comp == k][..., 1].max() for k in set(comp)}
    lows = {k: tri[comp == k][..., 1].min() for k in set(comp)}
    body, head = min(lows, key=lows.get), max(tops, key=tops.get)
    for k in tops:
        names[k] = 'body' if k == body else 'head' if k == head else 'neck' if np.ptp(tri[comp == k][..., 0]) < .08 else 'ear'
    return [names[k] for k in comp]


def main():
    sid, old, new = sys.argv[1:4]
    face = FACE[sid]
    src = BASE / f'clean-{sid}-{old}.json'
    out_json, out_png = BASE / f'clean-{sid}-{new}.json', BASE / f'clean-{sid}-{new}.png'
    fit_in, fit_out = BASE / f'clean-{sid}-{old}-fit3-layers.json', BASE / f'clean-{sid}-{new}-fit3-layers.json'
    for path in (out_json, out_png, fit_out):
        if path.exists():
            raise SystemExit(f'{path} exists; pick a new version')
    d = json.loads(src.read_text())
    image, paint = clean_texture(d, face)
    plug = neck_plug(d)
    repair = {'from': d['id'], 'texture': paint, 'neckPlug': None}
    if plug:
        tris, info = plug
        for ps, ws, nrm in tris:
            for p, (i, w) in zip(ps, ws):
                d['pos'] += [float(v) for v in p]
                d['normal'] += [float(v) for v in nrm]
                d['uv'] += [0.0, 0.0]
                d['si'] += [int(v) for v in i]
                d['sw'] += [float(v) for v in w]
                d['col'] += list(d['skin'])
                d['useTex'].append(0.0)
        d['T'] += len(tris)
        repair['neckPlug'] = info
    d['pieces'] = pieces(d)
    d['id'] = f'clean-{sid}-{new}'
    d['tex'] = f'base/clean-{sid}-{new}.png'
    d['face'] = {k: v for k, v in face.items() if k != 'frontZ'} | {'frontZ': face['frontZ']}
    d['construction'] = dict(d['construction'], repair=repair)
    image.save(out_png, optimize=True)
    out_json.write_text(json.dumps(d, separators=(',', ':')))
    fit = json.loads(fit_in.read_text())
    fit['base'] = d['id']
    fit_out.write_text(json.dumps(fit, separators=(',', ':')))
    print(json.dumps({'id': d['id'], 'T': d['T'], **repair}))


if __name__ == '__main__':
    main()
