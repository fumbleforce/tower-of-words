"""UV layout numbers for a Meshy glb (the round-2 texture diagnosis): triangles, UV islands, how much of the atlas
the islands cover, and how many islands and texels the face (front of the head, the skin between the eyes and mouth
heights) gets.

  python3 art/candidates/kuro-meshy-orig-3/uvstats.py <model.glb> [face_zmin face_zmax as fractions of height]
  python3 art/candidates/kuro-meshy-orig-3/uvstats.py layout <model.glb> <out.png>
"""
import json, struct, sys
import numpy as np


def load(path):
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
        return np.frombuffer(blob, comp, a['count'] * k, o).reshape(a['count'], k) if k > 1 else \
            np.frombuffer(blob, comp, a['count'], o)
    pr = j['meshes'][0]['primitives'][0]
    return acc(pr['attributes']['POSITION']), acc(pr['attributes']['TEXCOORD_0']), acc(pr['indices']).reshape(-1, 3)


def islands(tris, pos, uv):
    # vertices split only for flat normals are the same UV vertex: join by position and UV
    key = {}
    canon = np.array([key.setdefault((tuple(np.round(p, 5)), tuple(np.round(t, 5))), i) for i, (p, t) in enumerate(zip(pos, uv))])
    tris = canon[tris]
    parent = list(range(len(pos)))

    def f(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for a, b, c in tris:
        parent[f(b)] = f(a); parent[f(c)] = f(a)
    return np.array([f(t[0]) for t in tris])


def area2(p):
    return np.abs((p[:, 1, 0] - p[:, 0, 0]) * (p[:, 2, 1] - p[:, 0, 1]) - (p[:, 2, 0] - p[:, 0, 0]) * (p[:, 1, 1] - p[:, 0, 1])) / 2


def main():
    pos, uv, tris = load(sys.argv[1])
    zlo, zhi = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (0.62, 0.80)
    isl = islands(tris, pos, uv)
    h = pos[:, 1].max() - pos[:, 1].min()
    y0 = pos[:, 1].min()
    cen = pos[tris].mean(axis=1)
    # glTF: +Y up, the character faces +Z
    e = pos[tris]
    nrm = np.cross(e[:, 1] - e[:, 0], e[:, 2] - e[:, 0]); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
    face = ((cen[:, 1] - y0) / h > zlo) & ((cen[:, 1] - y0) / h < zhi) & (nrm[:, 2] > 0.5) & (cen[:, 2] > np.median(cen[:, 2]))
    uva = area2(uv[tris].astype(np.float64))
    print('triangles', len(tris), 'UV islands', len(set(isl)), 'atlas covered %.2f' % uva.sum())
    print('face triangles', int(face.sum()), 'in', len(set(isl[face])), 'islands; face texels at 2048: %d (%.1f%% of the atlas)'
          % (uva[face].sum() * 2048 * 2048, 100 * uva[face].sum()))


def layout(path, out, px=1024):
    """the UV layout as a picture, every triangle outlined (glTF UV: v down, as the texture image)"""
    from PIL import Image, ImageDraw
    pos, uv, tris = load(path)
    im = Image.new('RGB', (px, px), 'white')
    d = ImageDraw.Draw(im)
    for t in tris:
        d.polygon([(float(uv[i][0]) * px, float(uv[i][1]) * px) for i in t], outline=(60, 60, 60))
    im.save(out)


if __name__ == '__main__':
    if sys.argv[1] == 'layout':
        layout(sys.argv[2], sys.argv[3])
    else:
        main()
