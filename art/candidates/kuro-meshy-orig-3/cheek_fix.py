"""Kuro's approved model (Review kuro-meshy-orig-3; Jørgen: "Yes, very good. The only thing that stands out is black
discoloration under her cheek"): repaint the black texels on the skin under her jaw, and nothing else.

Meshy's texture pass left black streaks on the triangles under her chin and jaw (the black background its edge fill
pulls in). The fix picks those triangles from the model itself: skin triangles facing down (normal more than 30 degrees
below level) between 58 and 69 % of her height, the band under the chin and jaw. Inside them, and in the empty margin
2 texels round them (so filtering at the edges reads skin too), every black texel and the grey fringe round it is
filled from the skin texels around it (repeated neighbour averaging, so the fill takes their colour and light). The
mouth, the faint line under it, the eyes, the hair and every other texel are left exactly as they were.

  python art/candidates/kuro-meshy-orig-3/cheek_fix.py <rigged.glb> <out.png|out.webp> [mask.png]
(needs numpy and Pillow, e.g. ~/ai/sd/venv/bin/python). The game's texture is
  cheek_fix.py art/parts/kuro-meshy-orig-3/meshy/kuro-3b-tex-rigged.glb game3d/assets/characters/kuro/base.webp
and its walk, run and sit files are Meshy's GLBs (kuro-3b-tex-walking and -running from the auto-rig, and
Chair_Sit_Idle_F from `tools/characters/meshy.py anim kuro <rig task> 32 sit`) with the embedded texture taken out by
game3d/tools/slim_glb.py; the idle is `tools/characters/export-approved-idle.mjs kuro`.
"""
import io, json, struct, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out = sys.argv[1:3]
b = open(src, 'rb').read()
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

# glTF: +Y up
y0, y1 = pos[:, 1].min(), pos[:, 1].max()
P = pos[tri]
nrm = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0])
nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
hy = (P[:, :, 1].mean(1) - y0) / (y1 - y0)

idx = Image.new('I', (W, W), -1)
d = ImageDraw.Draw(idx)
for i, t in enumerate(tri):
    d.polygon([(u * W, v * W) for u, v in uv[t]], fill=i)  # glTF UVs: v down the image
I = np.asarray(idx)
skin = np.array([0.98, 0.88, 0.80])
pick = Image.new('L', (W, W), 0)
dp = ImageDraw.Draw(pick)
chosen = []
for i, t in enumerate(tri):
    if not (0.58 < hy[i] < 0.69 and nrm[i, 1] < -0.5):
        continue
    m = I == i
    if m.sum() < 3 or np.abs(np.median(A[m], 0) - skin).max() > 0.2:
        continue
    chosen.append(i)
    dp.polygon([(u * W, v * W) for u, v in uv[tri[i]]], fill=255, outline=255)
print('triangles', len(chosen), chosen)
# the triangles plus 2 texels of the empty margin round them (never texels of any other triangle)
other = (I >= 0) & ~np.isin(I, chosen)
area = (np.asarray(pick.filter(ImageFilter.MaxFilter(5))) > 0) & ~other
# black: the skin here is 0.8 to 0.9 luminance (0.8 in the soft shade under the chin, which stays); the streaks are
# below 0.3, and their grey JPEG fringe (up to 0.6) is caught by the one-texel ring added next
bad = area & (lum < 0.6)
# and a texel of fringe round each bad one, inside the area
bad = area & (np.asarray(Image.fromarray((bad * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0)
print('texels repainted', int(bad.sum()))
F = A.copy()
known = area & ~bad
F[~known] = 0
wsum = known.astype(float)
acc_ = F * known[..., None]
# fill from the outside in: each pass, unknown texels next to known ones take their neighbours' mean
todo = bad.copy()
for _ in range(400):
    if not todo.any():
        break
    s = np.zeros_like(F); c = np.zeros(wsum.shape)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy:
                s += np.roll(np.roll(acc_, dy, 0), dx, 1)
                c += np.roll(np.roll(wsum, dy, 0), dx, 1)
    grow = todo & (c > 0)
    acc_[grow] = s[grow] / c[grow][:, None]
    wsum[grow] = 1
    todo &= ~grow
# a few smoothing passes over the filled texels only, so the fill has no seams of its own
for _ in range(20):
    s = np.zeros_like(F); c = np.zeros(wsum.shape)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            s += np.roll(np.roll(acc_, dy, 0), dx, 1)
            c += np.roll(np.roll(wsum, dy, 0), dx, 1)
    sm = bad & (c > 0)
    acc_[sm] = s[sm] / c[sm][:, None]
R = A.copy()
R[bad] = acc_[bad]
Image.fromarray((R * 255).round().clip(0, 255).astype(np.uint8)).save(
    out, **({'quality': 90, 'method': 6} if out.endswith('.webp') else {}))
if len(sys.argv) > 3:
    Image.fromarray((bad * 255).astype(np.uint8)).save(sys.argv[3])
