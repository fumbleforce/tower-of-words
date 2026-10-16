"""Texture marks: dark texels Meshy's texture pass leaves on the skin under the jaw (the black background its edge fill
pulls in; Kuro round 3, Emi round 2). Counts them; never paints them. The texture step re-rolls a texture with marks
(Jørgen's rule: re-roll Meshy's texture, at most 3 times, then flag it on the model's Review).

The triangles are picked from the model as art/candidates/kuro-meshy-orig-3/cheek_fix.py picked the ones it
repainted: skin triangles (median texel within 0.2 of skin, and warm: red above blue) facing down (normal more than
30 degrees below level) between lo and hi of the height, within half_w of the middle (not the arms). Inside them, 2
texels in from their edges, blobs of texels darker than `dark` luminance (the streaks are below 0.3, the skin 0.8 to
0.9; lines up to 4 texels wide, a drawn mouth, are left out), plus one texel of fringe, are marks. More than `limit` marked texels fails. On the cached rounds this marks Kuro
round 3 (2,600 texels) and Emi round 2 (2,700), whose marks Jørgen saw, and passes Mori, Aoi, Kenji, the guard and
older-1.

  python3 tools/characters/steps/marks.py <textured or rigged glb> [lo=0.45] [hi=0.69] [half_w=0.10] [dark=0.35] [limit=40] [mask=<png>]
"""
import io, json, struct, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SKIN = np.array([0.98, 0.88, 0.80])


def count(path, lo=0.45, hi=0.69, half_w=0.10, dark=0.35, limit=40, skip=(), mask=None):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    blob = b[28 + n:]

    def acc(i):
        a = j['accessors'][i]
        bv = j['bufferViews'][a['bufferView']]
        comp = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
        k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        x = np.frombuffer(blob, comp, a['count'] * k, o)
        return x.reshape(a['count'], k) if k > 1 else x

    pr = j['meshes'][0]['primitives'][0]
    pos, uv = acc(pr['attributes']['POSITION']).astype(float), acc(pr['attributes']['TEXCOORD_0']).astype(float)
    tri = acc(pr['indices']).reshape(-1, 3)
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    img = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
    W = img.size[0]
    A = np.asarray(img).astype(float) / 255
    lum = A @ [0.2126, 0.7152, 0.0722]
    y0, y1 = pos[:, 1].min(), pos[:, 1].max()
    P = pos[tri]
    nrm = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0])
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
    hy = (P[:, :, 1].mean(1) - y0) / (y1 - y0)
    xc = (pos[:, 0].min() + pos[:, 0].max()) / 2
    hx = np.abs(P[:, :, 0].mean(1) - xc) / (y1 - y0)
    idx = Image.new('I', (W, W), -1)
    d = ImageDraw.Draw(idx)
    for i, t in enumerate(tri):
        d.polygon([(u * W, v * W) for u, v in uv[t]], fill=i)
    I = np.asarray(idx)
    pick = Image.new('L', (W, W), 0)
    dp = ImageDraw.Draw(pick)
    chosen = []
    for i, t in enumerate(tri):
        if i in skip or not (lo < hy[i] < hi and hx[i] < half_w and nrm[i, 1] < -0.5):
            continue
        m = I == i
        med = np.median(A[m], 0)
        if m.sum() < 3 or np.abs(med - SKIN).max() > 0.2 or med[0] - med[2] < 0.08:
            continue
        chosen.append(i)
        dp.polygon([(u * W, v * W) for u, v in uv[tri[i]]], fill=255, outline=255)
    # inside the triangles, 2 texels in from their edges: filtering at a UV edge reads its neighbours (a collar, the
    # hair), and the streaks Jørgen saw were in the middle of the skin
    area = np.asarray(pick.filter(ImageFilter.MinFilter(5))) > 0
    bad = area & (lum < dark)
    # blobs, not lines: a drawn mouth or lash line (up to 4 texels wide) is opened away; a streak survives
    im = Image.fromarray((bad * 255).astype(np.uint8))
    bad = np.asarray(im.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))) > 0
    bad = area & (np.asarray(Image.fromarray((bad * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0)
    texels = int(bad.sum())
    if mask:
        vis = (A * 255).astype(np.uint8).copy()
        vis[area] = (vis[area] * 0.5 + [0, 0, 120]).astype(np.uint8)
        vis[bad] = [255, 0, 0]
        Image.fromarray(vis).save(mask)
    return {'texels': texels, 'triangles': len(chosen), 'ok': texels <= limit, 'band': [lo, hi], 'dark': dark,
            'limit': limit}


if __name__ == '__main__':
    opt = {k: (v if k == 'mask' else float(v)) for k, v in (a.split('=', 1) for a in sys.argv[2:])}
    print(json.dumps(count(sys.argv[1], **opt)))
