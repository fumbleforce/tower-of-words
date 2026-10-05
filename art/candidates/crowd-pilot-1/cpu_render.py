"""CPU render of a textured GLB (numpy z-buffer, texture sampled per pixel, simple light), for checking a Meshy
texture or a still pose without the GPU (Review crowd-pilot-1; the GPU was Jørgen's at the time).
Views turn the model about the vertical: 0 front, 45 three-quarter (her left side, image right, turned to us),
90 side, 180 back; 'face' is a front close-up of the head.
  python3 art/candidates/crowd-pilot-1/cpu_render.py <glb> <out.png> [size=640] [views=0,45,90,180,face] [tex=<other texture>]
"""
import io, json, struct, sys
import numpy as np
from PIL import Image


def load(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n]); blob = b[28 + n:]
    CT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        dt = np.dtype(CT[a['componentType']]); nc = NC[a['type']]
        return np.frombuffer(blob, dt, a['count'] * nc, off).reshape(a['count'], nc)
    p = j['meshes'][0]['primitives'][0]
    V = acc(p['attributes']['POSITION']).astype(np.float64)
    UV = acc(p['attributes']['TEXCOORD_0']).astype(np.float64)
    F = acc(p['indices']).reshape(-1, 3).astype(int)
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    tex = np.asarray(Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB'))
    # node scale (Meshy's rigged files keep the mesh under a scaled node): normalise to height 1
    V = V - V.min(0)
    V = V / V[:, 1].max()
    V[:, 0] -= 0.5 * (V[:, 0].max()); V[:, 2] -= 0.5 * V[:, 2].max()
    return V, UV, F, tex


def render(V, UV, F, tex, yaw, size, face=False):
    a = np.radians(yaw)
    R = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]])
    P = V @ R.T
    if face:
        top = P[:, 1].max(); c = np.array([0, top - 0.2, 0]); s = size / 0.5
    else:
        c = np.array([0, 0.5, 0]); s = size / 1.1
    X = (P[:, 0] - c[0]) * s + size / 2
    Y = size / 2 - (P[:, 1] - c[1]) * s
    Z = P[:, 2]
    img = np.full((size, size, 3), 240.0); zb = np.full((size, size), -1e9)
    th, tw = tex.shape[:2]
    light = np.array([-0.4, 0.6, 0.7]); light /= np.linalg.norm(light)
    for f in F:
        x, y, z = X[f], Y[f], Z[f]
        n = np.cross(P[f[1]] - P[f[0]], P[f[2]] - P[f[0]])
        if n[2] <= 0:
            continue
        sh = 0.55 + 0.45 * max(0, (n / np.linalg.norm(n)) @ light)
        x0, x1 = int(max(np.floor(x.min()), 0)), int(min(np.ceil(x.max()), size - 1))
        y0, y1 = int(max(np.floor(y.min()), 0)), int(min(np.ceil(y.max()), size - 1))
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2])
        if abs(d) < 1e-9:
            continue
        w0 = ((y[1] - y[2]) * (xs - x[2]) + (x[2] - x[1]) * (ys - y[2])) / d
        w1 = ((y[2] - y[0]) * (xs - x[2]) + (x[0] - x[2]) * (ys - y[2])) / d
        w2 = 1 - w0 - w1
        m = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        zz = w0 * z[0] + w1 * z[1] + w2 * z[2]
        sub = zb[y0:y1 + 1, x0:x1 + 1]
        m &= zz > sub
        if not m.any():
            continue
        u = w0 * UV[f[0], 0] + w1 * UV[f[1], 0] + w2 * UV[f[2], 0]
        v = w0 * UV[f[0], 1] + w1 * UV[f[1], 1] + w2 * UV[f[2], 1]
        col = tex[np.clip((v * th).astype(int), 0, th - 1), np.clip((u * tw).astype(int), 0, tw - 1)]
        sub[m] = zz[m]
        img[y0:y1 + 1, x0:x1 + 1][m] = col[m] * (0.35 + 0.65 * sh)
    return Image.fromarray(img.clip(0, 255).astype(np.uint8))


def main():
    src, out = sys.argv[1:3]
    opt = dict(a.split('=', 1) for a in sys.argv[3:])
    size = int(opt.get('size', 640))
    views = opt.get('views', '0,45,90,180,face').split(',')
    V, UV, F, tex = load(src)
    if opt.get('tex'):                                   # another texture on the same UVs (a colour variant)
        tex = np.asarray(Image.open(opt['tex']).convert('RGB'))
    tiles = [render(V, UV, F, tex, 0 if v == 'face' else float(v), size, v == 'face') for v in views]
    sheet = Image.new('RGB', (size * len(tiles), size), 'white')
    for i, t in enumerate(tiles):
        sheet.paste(t, (i * size, 0))
    sheet.save(out)
    print(out, sheet.size)


if __name__ == '__main__':
    main()
