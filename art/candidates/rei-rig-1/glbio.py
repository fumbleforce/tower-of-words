"""Read and write the Meshy GLBs of the cast (one skinned mesh under an `Armature` node scaled 0.01), for Rei's
new rig (Review rei-meshy-1). Matrices are column-vector 4x4 numpy arrays; "armature space" is the Armature
node's own space (centimetres; S = the Armature node's 0.01 scale); mesh positions and inverse bind matrices are in
metres.
"""
import json, struct
import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class Glb:
    def __init__(self, path):
        b = open(path, 'rb').read()
        n = struct.unpack('<I', b[12:16])[0]
        self.j = json.loads(b[20:20 + n])
        self.bin = bytearray(b[28 + n:28 + n + struct.unpack('<I', b[20 + n:24 + n])[0]])
        self.names = [nd.get('name', '') for nd in self.j['nodes']]

    def node(self, name):
        return self.names.index(name)

    def acc(self, i):
        a = self.j['accessors'][i]
        bv = self.j['bufferViews'][a['bufferView']]
        dt = np.dtype(CT[a['componentType']])
        nc = NC[a['type']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', 0) or dt.itemsize * nc
        raw = np.frombuffer(bytes(self.bin), dtype=np.uint8)
        rows = np.lib.stride_tricks.as_strided(raw[off:], shape=(a['count'], dt.itemsize * nc), strides=(stride, 1))
        out = np.ascontiguousarray(rows).view(dt).reshape(a['count'], nc)
        if a.get('normalized'):
            out = out.astype(np.float32) / np.iinfo(dt).max
        return out

    def add(self, arr, typ, ctype=5126, target=None, minmax=False):
        """Append an array as a new accessor (and buffer view); returns the accessor index."""
        arr = np.ascontiguousarray(arr.astype(CT[ctype]))
        while len(self.bin) % 4:
            self.bin.append(0)
        bv = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': arr.nbytes}
        if target:
            bv['target'] = target
        self.bin += arr.tobytes()
        self.j['bufferViews'].append(bv)
        a = {'bufferView': len(self.j['bufferViews']) - 1, 'componentType': ctype,
             'count': int(arr.shape[0]), 'type': typ}
        if minmax:
            a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
        self.j['accessors'].append(a)
        return len(self.j['accessors']) - 1

    def compact(self):
        """Drop accessors and buffer views nothing refers to any more (the replaced weights, bind matrices, clip)."""
        j = self.j
        refs = []
        for m in j['meshes']:
            for p in m['primitives']:
                refs += [('a', p['attributes'], k) for k in p['attributes']]
                if 'indices' in p:
                    refs.append(('a', p, 'indices'))
        for s in j.get('skins', []):
            if 'inverseBindMatrices' in s:
                refs.append(('a', s, 'inverseBindMatrices'))
        for an in j.get('animations', []):
            for s in an['samplers']:
                refs += [('a', s, 'input'), ('a', s, 'output')]
        used = sorted({o[k] for _, o, k in refs})
        amap = {old: new for new, old in enumerate(used)}
        j['accessors'] = [j['accessors'][i] for i in used]
        for _, o, k in refs:
            o[k] = amap[o[k]]
        vrefs = [(a, 'bufferView') for a in j['accessors'] if 'bufferView' in a]
        vrefs += [(im, 'bufferView') for im in j.get('images', []) if 'bufferView' in im]
        vused = sorted({o[k] for o, k in vrefs})
        vmap = {old: new for new, old in enumerate(vused)}
        out = bytearray()
        views = []
        for i in vused:
            v = dict(j['bufferViews'][i])
            while len(out) % 4:
                out.append(0)
            data = self.bin[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
            v['byteOffset'] = len(out); out += data
            views.append(v)
        for o, k in vrefs:
            o[k] = vmap[o[k]]
        j['bufferViews'] = views
        self.bin = out

    def save(self, path):
        self.compact()
        while len(self.bin) % 4:
            self.bin.append(0)
        self.j['buffers'] = [{'byteLength': len(self.bin)}]
        js = json.dumps(self.j, separators=(',', ':')).encode()
        js += b' ' * (-len(js) % 4)
        out = struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(self.bin))
        out += struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(self.bin), b'BIN\x00') + bytes(self.bin)
        open(path, 'wb').write(out)

    # --- transforms
    def local(self, i, trs=None):
        nd = self.j['nodes'][i]
        t, r, s = trs or (nd.get('translation', [0, 0, 0]), nd.get('rotation', [0, 0, 0, 1]), nd.get('scale', [1, 1, 1]))
        return compose(t, r, s)

    def parents(self):
        p = {}
        for i, nd in enumerate(self.j['nodes']):
            for c in nd.get('children', []):
                p[c] = i
        return p

    def arm_space(self, overrides=None):
        """Every node's matrix relative to the Armature node (node rest TRS, or overrides {i: (t, r, s)})."""
        par, arm = self.parents(), self.node('Armature')
        M = {}

        def get(i):
            if i in M:
                return M[i]
            L = self.local(i, (overrides or {}).get(i))
            M[i] = L if par.get(i) == arm or i == arm else get(par[i]) @ L
            if i == arm:
                M[i] = np.eye(4)
            return M[i]
        for i in range(len(self.j['nodes'])):
            if i == arm or self._under(i, arm, par):
                get(i)
        return M

    def _under(self, i, arm, par):
        while i in par:
            i = par[i]
            if i == arm:
                return True
        return False

    def skin(self):
        sk = self.j['skins'][0]
        return sk['joints'], self.acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)

    def prim(self):
        return self.j['meshes'][0]['primitives'][0]

    def skinned(self, M=None):
        """Vertex positions in the scene (metres, as three.js shows them), skinned with node matrices M (armature
        space; default: rest TRS). Meshy's convention: world = sum w * (S * M_j) * IBM_j * v, raw v in metres."""
        M = M or self.arm_space()
        joints, ibm = self.skin()
        S = self.local(self.node('Armature'))
        a = self.prim()['attributes']
        P = self.acc(a['POSITION']).astype(np.float64)
        J = self.acc(a['JOINTS_0']).astype(int)
        W = self.acc(a['WEIGHTS_0']).astype(np.float64)
        W = W / W.sum(1, keepdims=True)
        Ph = np.c_[P, np.ones(len(P))]
        mats = np.stack([(S @ M[j]) @ ibm[k] for k, j in enumerate(joints)])
        out = np.zeros_like(Ph)
        for c in range(4):
            out += W[:, c:c + 1] * np.einsum('nij,nj->ni', mats[J[:, c]], Ph)
        return out[:, :3]


def quat_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def compose(t, r, s):
    M = np.eye(4)
    M[:3, :3] = quat_mat(r) @ np.diag(s)
    M[:3, 3] = t
    return M
