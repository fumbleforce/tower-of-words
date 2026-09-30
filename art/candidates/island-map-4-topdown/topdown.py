# Straight-down, north-up version of the picked island map (art/candidates/island-map-4/01-overview.png).
#
# The picked map is an oblique bird's-eye picture. Rectifying its ground plane (REF in
# game3d/js/scenes/island-layout.js, read from that file so the two never drift) puts roads, coast, pitch and
# plaza in the right place, but every building leans north over its own footprint. Here each building is
# annotated once in buildings.json: its roof outline in the picture and its drop (how many picture pixels the
# roof sits above its base; walls in this picture are vertical in the image). The footprint in the picture is the
# roof moved down by the drop, and it goes through the same ground rectification. So:
#   ground pixel         -> the picture's own ground, rectified
#   footprint pixel      -> the building's roof, taken from (u, v - drop)
#   leaned-over pixel    -> hole (the ground there is hidden in the picture) -> filled by inpainting later
#
# Usage (repo root, ~/ai/sd/venv/bin/python):
#   topdown.py geom [--src PNG] [--out DIR]   geometric composite, hole mask, frame.json
#   topdown.py overlay PNG OUT                landmark overlay of a candidate against the expected points
import json, re, sys, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
ORIG = os.path.join(ROOT, 'art/candidates/island-map-4/01-overview.png')

def read_ref():
    js = open(os.path.join(ROOT, 'game3d/js/scenes/island-layout.js')).read()
    block = re.search(r'export const REF = \{(.*?)\};', js, re.S).group(1)
    ref = {k: float(v) for k, v in re.findall(r'(\w+):\s*(-?[\d.]+),', block)}
    ref['unit'] = float(re.search(r'export const UNIT = ([\d.]+)', js).group(1))  # metres a unit
    return ref

R = read_ref()
# output frame in island units (x east, z south), ppu pixels a unit; covers the whole island plus sea
FRAME = dict(x0=-120.0, z0=-215.0, x1=195.0, z1=95.0, ppu=6)
W = int(round((FRAME['x1'] - FRAME['x0']) * FRAME['ppu']))
H = int(round((FRAME['z1'] - FRAME['z0']) * FRAME['ppu']))

def from_image(u, v):
    D = R['k'] / (v - R['horizon'])
    return R['x0'] + (u - R['centre']) * D / R['focal'], R['d0'] - D

def to_image(x, z):
    D = R['d0'] - z
    return R['centre'] + R['focal'] * (x - R['x0']) / D, R['horizon'] + R['k'] / D

def to_px(x, z):
    return (x - FRAME['x0']) * FRAME['ppu'], (z - FRAME['z0']) * FRAME['ppu']

def grid():
    j, i = np.mgrid[0:H, 0:W].astype(np.float64)
    x = FRAME['x0'] + (i + 0.5) / FRAME['ppu']
    z = FRAME['z0'] + (j + 0.5) / FRAME['ppu']
    return to_image(x, z)

def hull(pts):
    pts = sorted(set(map(tuple, pts)))
    def half(ps):
        out = []
        for p in ps:
            while len(out) >= 2 and (out[-1][0]-out[-2][0])*(p[1]-out[-2][1]) - (out[-1][1]-out[-2][1])*(p[0]-out[-2][0]) <= 0:
                out.pop()
            out.append(p)
        return out
    lo, hi = half(pts), half(pts[::-1])
    return lo[:-1] + hi[:-1]

def sample(img, u, v):
    out = np.zeros(u.shape + (3,), np.float32)
    for c in range(3):
        out[..., c] = ndimage.map_coordinates(img[..., c], [v - 0.5, u - 0.5], order=1, mode='nearest')
    return out

def masks(buildings, size):
    """picture-space maps: footprint id (-1 none) and leaned-over silhouette"""
    fid = Image.new('I', size, -1)
    sil = Image.new('L', size, 0)
    df, ds = ImageDraw.Draw(fid), ImageDraw.Draw(sil)
    for b in buildings:
        roof = [tuple(p) for p in b['roof']]
        foot = [(x, y + b['drop']) for x, y in roof]
        ds.polygon(hull(roof + foot), fill=255)
    # footprints drawn north to south so a nearer building wins where two touch
    order = sorted(range(len(buildings)), key=lambda i: max(p[1] for p in buildings[i]['roof']) + buildings[i]['drop'])
    for i in order:
        b = buildings[i]
        df.polygon([(x, y + b['drop']) for x, y in b['roof']], fill=i)
    return np.array(fid), np.array(sil) > 0

def geom(src_path, out_dir, plain=False):
    buildings = [] if plain else json.load(open(os.path.join(HERE, 'buildings.json')))
    img = np.asarray(Image.open(src_path).convert('RGB'), np.float32)
    h, w = img.shape[:2]
    fid, sil = masks(buildings, (w, h))
    seasil = masks([b for b in buildings if b.get('sea')], (w, h))[1]  # structures over the water (the beam)
    u, v = grid()
    inside = (u >= 0) & (u < w) & (v >= 0) & (v < h)
    ui = np.clip(u.astype(int), 0, w - 1); vi = np.clip(v.astype(int), 0, h - 1)
    f = np.where(inside, fid[vi, ui], -1)
    s = inside & sil[vi, ui]
    drop = np.array([b['drop'] for b in buildings] + [0], np.float64)
    dv = np.where(f >= 0, drop[f], 0.0)
    out = sample(img, u, v - dv)
    hole = s & (f < 0)
    seahole = hole & seasil[vi, ui]
    outside = ~inside
    vis = out.copy()
    vis[hole] = (255, 0, 255)
    vis[outside] = (40, 40, 40)
    os.makedirs(out_dir, exist_ok=True)
    if plain:  # the ground-plane rectification alone, as the map's compare view draws it
        Image.fromarray(np.clip(vis, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, 'rectified.png'))
        return
    Image.fromarray(np.clip(vis, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, 'geom-holes.png'))
    # the plain composite with holes pre-filled from their surroundings (a start for inpainting)
    fill = out.copy()
    need = hole | outside
    idx = ndimage.distance_transform_edt(need, return_distances=False, return_indices=True)
    fill = fill[idx[0], idx[1]]
    fill[outside] = (40, 110, 190)
    Image.fromarray(np.clip(fill, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, 'geom-filled.png'))
    # second start: holes take the nearest open ground (never a roof), blurred so no shapes carry over;
    # outside the picture takes the sea colour of the nearest picture edge
    foot = f >= 0
    idx = ndimage.distance_transform_edt(hole | outside | foot, return_distances=False, return_indices=True)
    g = out[idx[0], idx[1]]
    g = np.stack([ndimage.gaussian_filter(g[..., c], 6) for c in range(3)], -1)
    fill2 = out.copy()
    fill2[hole | outside] = g[hole | outside]
    # holes over the water take the nearest open sea
    sea = (out[..., 2] > out[..., 0] + 120) & ~(hole | outside | foot)
    idx = ndimage.distance_transform_edt(~sea, return_distances=False, return_indices=True)
    gs = out[idx[0], idx[1]]
    gs = np.stack([ndimage.gaussian_filter(gs[..., c], 10) for c in range(3)], -1)
    fill2[seahole] = gs[seahole]
    Image.fromarray(np.clip(fill2, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, 'geom-groundfill.png'))
    Image.fromarray((hole * 255).astype(np.uint8)).save(os.path.join(out_dir, 'mask-holes.png'))
    Image.fromarray((outside * 255).astype(np.uint8)).save(os.path.join(out_dir, 'mask-outside.png'))
    # what the later fills repaint: land holes (hidden ground) and the sea outside the picture; holes over the
    # water keep the blurred sea of geom-groundfill
    Image.fromarray(((hole & ~seahole) * 255).astype(np.uint8)).save(os.path.join(out_dir, 'mask-landholes.png'))
    Image.fromarray((((hole & ~seahole) | outside) * 255).astype(np.uint8)).save(os.path.join(out_dir, 'mask-fill2.png'))
    Image.fromarray(((f >= 0) * 255).astype(np.uint8)).save(os.path.join(out_dir, 'mask-footprints.png'))
    frame = dict(FRAME, width=W, height=H, ref=R,
                 note='pixel (i, j) centre = island point (x0 + (i + 0.5) / ppu, z0 + (j + 0.5) / ppu); x east, z south, north up')
    json.dump(frame, open(os.path.join(out_dir, 'frame.json'), 'w'), indent=1)
    print('holes', int(hole.sum()), 'outside', int(outside.sum()), 'size', W, H)

# landmarks as the picked map draws them, at the point where each meets the ground (picture px); the first nine
# are the map code's LANDMARKS (game3d/js/map/reference.js), the rest add the coast, docks and grounds
LANDMARKS = [
    ('station', 'Station', (417, 571), 'station'), ('ho_door', 'Head office door', (505, 571), None),
    ('tower', 'Head office tower', (545, 544), 'tower'), ('shed', 'Platform roof', (392, 548), 'shed'),
    ('fountain', 'Fountain', (715, 612), None), ('canteen', 'Canteen', (736, 544), 'canteen'),
    ('shops', 'Shop row', (715, 705), None), ('dorm_door', 'Dorm entrance', (955, 705), None),
    ('dorm_block', 'Dorm block', (1009, 694), None),
    ('pitch', 'Pitch centre', (1015, 168), None), ('pool', 'Pool', (1017, 420), None),
    ('ferry_pier', 'Ferry pier end', (48, 248), None), ('supply_pier', 'Supply quay end', (143, 340), None),
    ('beach_stairs', 'Beach stairs foot', (648, 845), None), ('se_point', 'South-east promenade corner', (1222, 905), None),
    ('onsen', 'Onsen gate', (1380, 520), None), ('hall', 'History hall', (1235, 225), 'history_hall'),
]

def lm_px(u, v):
    return to_px(*from_image(u, v))

def match(ref, cand, px, py, r=12, s=28):
    """offset (dx, dy) in px of the patch around (px, py) of ref inside cand, best normalised correlation"""
    px, py = int(round(px)), int(round(py))
    a = ref[py - r:py + r, px - r:px + r].astype(np.float64)
    if a.shape != (2 * r, 2 * r, 3):
        return None
    a = (a - a.mean()) / (a.std() + 1e-6)
    best = (-9, 0, 0)
    for dy in range(-s, s + 1):
        for dx in range(-s, s + 1):
            b = cand[py + dy - r:py + dy + r, px + dx - r:px + dx + r].astype(np.float64)
            if b.shape != a.shape:
                continue
            c = ((b - b.mean()) / (b.std() + 1e-6) * a).mean()
            if c > best[0]:
                best = (c, dx, dy)
    return best

def check(ref_path, cand_path, out_json):
    ref = np.asarray(Image.open(ref_path).convert('RGB'))
    cand = np.asarray(Image.open(cand_path).convert('RGB').resize((W, H)))
    rows = []
    for lid, label, (u, v), _ in LANDMARKS:
        px, py = lm_px(u, v)
        c, dx, dy = match(ref, cand, px, py)
        rows.append(dict(id=lid, label=label, px=[round(px, 1), round(py, 1)], island=[round(x, 2) for x in from_image(u, v)],
                         dx=dx, dy=dy, metres=round(np.hypot(dx, dy) / FRAME['ppu'] * R['unit'], 2), corr=round(c, 2)))
    json.dump(rows, open(out_json, 'w'), indent=1)
    for r in rows:
        print(f"{r['label']:30s} dx {r['dx']:+3d} dy {r['dy']:+3d} px  {r['metres']:5.2f} m  corr {r['corr']}")

def markers(path, out, picture=False):
    im = Image.open(path).convert('RGB')
    d = ImageDraw.Draw(im)
    for lid, label, (u, v), _ in LANDMARKS:
        x, y = (u, v) if picture else lm_px(u, v)
        if not picture:
            x, y = x * im.width / W, y * im.height / H
        d.ellipse((x - 7, y - 7, x + 7, y + 7), outline=(255, 0, 60), width=3)
        d.line((x - 11, y, x + 11, y), fill=(255, 0, 60), width=1); d.line((x, y - 11, x, y + 11), fill=(255, 0, 60), width=1)
        d.text((x + 9, y - 14), label, fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    im.save(out)

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'geom':
        src = a[a.index('--src') + 1] if '--src' in a else ORIG
        out = a[a.index('--out') + 1] if '--out' in a else os.path.join(HERE, 'work')
        geom(src, out, '--plain' in a)
    elif a[0] == 'check':
        check(a[1], a[2], a[3])
    elif a[0] == 'markers':
        markers(a[1], a[2], '--picture' in a)
