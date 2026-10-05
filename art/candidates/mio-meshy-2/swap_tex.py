"""Put another texture pass's picture into a rigged GLB of the same shape (reviews/mio-meshy-2). Both of Mio's texture
passes (styled from d1 and from h1) were painted on the same UV layout (mio-2b-uv.glb, original UVs kept), and the
rig was made once from the h1 one, so the d1 texture fits the rigged mesh unchanged. The UVs of both files are
compared first (sorted, since the rig may reorder vertices); the mesh, skin and clips are copied unchanged.

  python3 art/candidates/mio-meshy-2/swap_tex.py <rigged.glb> <textured.glb> <out.glb>
"""
import json, os, struct, sys
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb  # noqa: E402


def parts(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    blob = b[28 + n:28 + n + struct.unpack('<I', b[20 + n:24 + n])[0]]
    return j, blob


def image(j, blob):
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    return blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']], j['images'][0].get('mimeType', 'image/png')


def uvs(path):
    g = Glb(path)
    p = g.prim()
    uv = g.acc(p['attributes']['TEXCOORD_0']).round(4)
    return uv[np.lexsort(uv.T[::-1])]


def main():
    rig, tex, out = sys.argv[1:4]
    a, b = uvs(rig), uvs(tex)
    same = a.shape == b.shape and np.abs(a - b).max() < 1e-3
    print('uv rows', a.shape, b.shape, 'same layout' if same else 'DIFFERENT')
    if not same:
        sys.exit('the UV layouts differ; not swapping')
    j, blob = parts(rig)
    img, mime = image(*parts(tex))
    # append the new picture as a new buffer view and point the image at it
    pad = (-len(blob)) % 4
    blob = blob + b'\0' * pad
    j['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(img)})
    j['images'][0] = {'bufferView': len(j['bufferViews']) - 1, 'mimeType': mime}
    blob = blob + img + b'\0' * ((-len(img)) % 4)
    j['buffers'][0]['byteLength'] = len(blob)
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(blob), 0x004E4942) + blob)
    print('wrote', out)


if __name__ == '__main__':
    main()
