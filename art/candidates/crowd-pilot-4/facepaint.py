"""Paint on a Meshy model's face from the front (Review crowd-pilot-3): texture painting by projection, the way Blender's
texture-paint projects a stroke from the view onto the UV texture, in numpy so it runs without the GPU.

  front(glb, tex, px_per_m)        the head seen from straight in front (orthographic, rest pose): an RGB picture, and
                                   per pixel the depth (for occlusion). Image right is the model's left (+x).
  project(glb, tex, paint, ...)    an RGBA picture painted on that front view, written into the texture through every
                                   triangle that faces the camera and is visible from the front (depth test), so a stroke
                                   lands exactly where it shows. Nothing outside the stroke's alpha changes.

Model space: metres, front +z, floor y = 0 (the rigged GLB's mesh, rest pose). The front view spans x in [-HALF, HALF]
and y in [Y0, Y1].
"""
import sys, os
import numpy as np
from scipy import ndimage
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb

HALF, Y0, Y1 = 0.24, 0.62, 1.12


def mesh(glb, yaw=0):
    g = Glb(glb)
    p = g.prim()
    V = g.acc(p['attributes']['POSITION']).astype(np.float64)
    if yaw:
        c, s = np.cos(yaw), np.sin(yaw)
        V = V @ np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])
    uv = g.acc(p['attributes']['TEXCOORD_0']).astype(np.float64)
    idx = g.acc(p['indices']).reshape(-1, 3).astype(np.int64)
    return V, uv, idx


def _raster(P, n_img, cb):
    """For every triangle (3x2 pixel coords in P[t]), call cb(t, ys, xs, w0, w1, w2) with the pixel centres inside it."""
    H, W = n_img
    for t in range(len(P)):
        a, b, c = P[t]
        x0, x1 = int(max(0, np.floor(min(a[0], b[0], c[0])))), int(min(W - 1, np.ceil(max(a[0], b[0], c[0]))))
        y0, y1 = int(max(0, np.floor(min(a[1], b[1], c[1])))), int(min(H - 1, np.ceil(max(a[1], b[1], c[1]))))
        if x1 < x0 or y1 < y0:
            continue
        det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(det) < 1e-9:
            continue
        ys, xs = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        px, py = xs + 0.5, ys + 0.5
        w0 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / det
        w1 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / det
        w2 = 1 - w0 - w1
        m = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if m.any():
            cb(t, ys[m], xs[m], w0[m], w1[m], w2[m])


def _screen(V, k):
    """Model x, y to front-view pixel coords at k px per metre."""
    return np.stack([(V[:, 0] + HALF) * k, (Y1 - V[:, 1]) * k], 1)


def front(glb, tex, k=4000, yaw=0):
    V, uv, idx = mesh(glb, yaw)
    T = np.asarray(Image.open(tex).convert('RGB'))
    th, tw = T.shape[:2]
    W, H = int(2 * HALF * k), int((Y1 - Y0) * k)
    img = np.full((H, W, 3), 236, np.uint8)
    z = np.full((H, W), -1e9)
    S = _screen(V, k)
    # front-facing only (normal toward +z)
    n = np.cross(V[idx[:, 1]] - V[idx[:, 0]], V[idx[:, 2]] - V[idx[:, 0]])
    keep = np.where(n[:, 2] > 0)[0]

    def cb(t, ys, xs, w0, w1, w2):
        i = idx[keep[t]]
        zz = w0 * V[i[0], 2] + w1 * V[i[1], 2] + w2 * V[i[2], 2]
        m = zz > z[ys, xs]
        if not m.any():
            return
        ys, xs, w0, w1, w2, zz = ys[m], xs[m], w0[m], w1[m], w2[m], zz[m]
        u = w0 * uv[i[0], 0] + w1 * uv[i[1], 0] + w2 * uv[i[2], 0]
        v = w0 * uv[i[0], 1] + w1 * uv[i[1], 1] + w2 * uv[i[2], 1]
        img[ys, xs] = T[np.clip((v * th).astype(int), 0, th - 1), np.clip((u * tw).astype(int), 0, tw - 1)]
        z[ys, xs] = zz
    _raster(S[idx[keep]], (H, W), cb)
    return img, z


def project(glb, tex, paint, k=4000, out=None, zbuf=None, tol=0.004, yaw=0, depth_filter=9):
    """paint: RGBA array (H, W, 4) on the front view at k px/m. Returns the new texture (RGB uint8)."""
    V, uv, idx = mesh(glb, yaw)
    T = np.asarray(Image.open(tex).convert('RGB')).astype(np.float64)
    th, tw = T.shape[:2]
    if zbuf is None:
        _, zbuf = front(glb, tex, k, yaw)
    H, W = zbuf.shape
    S = _screen(V, k)
    n = np.cross(V[idx[:, 1]] - V[idx[:, 0]], V[idx[:, 2]] - V[idx[:, 0]])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    keep = np.where(n[:, 2] > 0.05)[0]
    P = paint.astype(np.float64)
    P[..., :3] *= P[..., 3:] / 255  # premultiplied, so sampling at a stroke's edge doesn't pull in black
    a_any = P[..., 3] > 0
    ys_, xs_ = np.where(a_any)
    if not len(ys_):
        return T.astype(np.uint8)
    bx0, bx1, by0, by1 = xs_.min(), xs_.max(), ys_.min(), ys_.max()
    # only triangles whose front-view footprint touches the painted area
    tri = S[idx[keep]]
    near = ((tri[:, :, 0].max(1) >= bx0 - 2) & (tri[:, :, 0].min(1) <= bx1 + 2) &
            (tri[:, :, 1].max(1) >= by0 - 2) & (tri[:, :, 1].min(1) <= by1 + 2))
    keep = keep[near]
    UVp = uv * [tw, th]

    def sample(img, x, y):
        x = np.clip(x - 0.5, 0, img.shape[1] - 1.001); y = np.clip(y - 0.5, 0, img.shape[0] - 1.001)
        x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
        fx, fy = (x - x0)[:, None], (y - y0)[:, None]
        return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) +
                img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)
    done = np.zeros((th, tw), bool)
    # visible from the front: in front of (or level with) the nearest surface within a few pixels, so texels along a
    # triangle's edge next to a nearer piece (hair over the forehead) are painted too
    zfront = ndimage.minimum_filter(zbuf, depth_filter)

    def cb(t, ys, xs, w0, w1, w2):
        i = idx[keep[t]]
        sx = w0 * S[i[0], 0] + w1 * S[i[1], 0] + w2 * S[i[2], 0]
        sy = w0 * S[i[0], 1] + w1 * S[i[1], 1] + w2 * S[i[2], 1]
        zz = w0 * V[i[0], 2] + w1 * V[i[1], 2] + w2 * V[i[2], 2]
        xi, yi = np.clip(sx.astype(int), 0, W - 1), np.clip(sy.astype(int), 0, H - 1)
        vis = (zz >= zfront[yi, xi] - tol) & ~done[ys, xs]
        if not vis.any():
            return
        ys, xs, sx, sy = ys[vis], xs[vis], sx[vis], sy[vis]
        c = sample(P, sx, sy)
        a = c[:, 3:4] / 255
        T[ys, xs] = T[ys, xs] * (1 - a) + c[:, :3]
        done[ys, xs] = True
    _raster(UVp[idx[keep]], (th, tw), cb)
    # the gutter: texels no triangle covers, next to painted ones, take the nearest painted colour (the renderer's
    # filtering reads a texel or two past a triangle's edge)
    cov = np.zeros((th, tw), bool)
    _raster(UVp[idx], (th, tw), lambda t, ys, xs, *w: cov.__setitem__((ys, xs), True))
    near_done = ndimage.binary_dilation(done, iterations=4) & ~cov
    _, (iy, ix) = ndimage.distance_transform_edt(~done, return_indices=True)
    T[near_done] = T[iy[near_done], ix[near_done]]
    R = np.clip(T, 0, 255).astype(np.uint8)
    if out:
        Image.fromarray(R).save(out, quality=92, method=6) if out.endswith('.webp') else Image.fromarray(R).save(out)
    return R


if __name__ == '__main__':
    glb, tex, out = sys.argv[1:4]
    img, _ = front(glb, tex)
    Image.fromarray(img).save(out)
    print(out, img.shape)
