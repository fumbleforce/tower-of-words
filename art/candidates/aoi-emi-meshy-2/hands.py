"""Hand size on the rigged models, for Aoi round 2 (Jørgen on aoi-1: "her hands are larger than the others").
For each model: the vertices whose strongest skin weight is a hand bone (LeftHand, RightHand, and Mio's finger end
bones), in the rest pose. Hand size = the longest side of each hand's box, averaged over both hands, over the model's
height; also the hand's box over the forearm's. Counted, not judged by eye.

  python3 art/candidates/aoi-emi-meshy-2/hands.py <out.json> <name>=<rigged.glb> ...
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
        comp = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
        k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride')
        size = np.dtype(comp).itemsize * k
        if stride and stride != size:
            rows = [np.frombuffer(blob, comp, k, o + r * stride) for r in range(a['count'])]
            x = np.array(rows)
        else:
            x = np.frombuffer(blob, comp, a['count'] * k, o).reshape(a['count'], k)
        if a.get('normalized') and comp in (np.uint8, np.uint16):
            x = x / np.iinfo(comp).max
        return x
    return j, acc


def measure(path):
    j, acc = load(path)
    names = [j['nodes'][i]['name'].split(':')[-1] for i in j['skins'][0]['joints']]
    P, J, W = [], [], []
    for m in j['meshes']:
        for pr in m['primitives']:
            at = pr['attributes']
            if 'JOINTS_0' not in at:
                continue
            P.append(acc(at['POSITION']).astype(float)); J.append(acc(at['JOINTS_0']).astype(int))
            W.append(acc(at['WEIGHTS_0']).astype(float))
    P, J, W = np.vstack(P), np.vstack(J), np.vstack(W)
    top = J[np.arange(len(J)), W.argmax(1)]
    up = int(np.argmax(np.ptp(P, 0)))           # the tallest axis is up
    H = np.ptp(P[:, up])
    res = {}
    for side in ('Left', 'Right'):
        hand = [i for i, nm in enumerate(names) if nm.startswith(side + 'Hand')]
        fore = [i for i, nm in enumerate(names) if nm == side + 'ForeArm']
        h = P[np.isin(top, hand)]
        f = P[np.isin(top, fore)]
        res[side] = {'verts': int(len(h)), 'size': float(np.ptp(h, 0).max() / H) if len(h) else 0,
                     'box': float(np.prod(np.ptp(h, 0)) / H ** 3) if len(h) else 0,
                     'fore_box': float(np.prod(np.ptp(f, 0)) / H ** 3) if len(f) else 0}
    size = (res['Left']['size'] + res['Right']['size']) / 2
    box = (res['Left']['box'] + res['Right']['box']) / 2
    fbox = (res['Left']['fore_box'] + res['Right']['fore_box']) / 2
    return {'hand_over_height': round(size, 4), 'hand_box_over_height3': round(box * 1e4, 3),
            'hand_box_over_forearm_box': round(box / fbox, 2) if fbox else None, 'sides': res}


def main():
    out = {}
    for arg in sys.argv[2:]:
        name, path = arg.split('=', 1)
        out[name] = measure(path)
        r = out[name]
        print(f'{name:22s} hand {r["hand_over_height"]:.3f} of height   hand box {r["hand_box_over_height3"]:.2f}e-4 H^3   '
              f'hand box / forearm box {r["hand_box_over_forearm_box"]}')
    json.dump(out, open(sys.argv[1], 'w'), indent=1)


if __name__ == '__main__':
    main()
