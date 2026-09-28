"""Retarget a Meshy animation clip from one rig onto another skeleton, by world-space rotation.

Mio's model comes from Meshy's web app (Mixamo-style bone names and axes); the models rigged through the API
(Eric and the new cast) share a different skeleton. So a clip made for an API rig can't be played on Mio as it is.
This carries each mapped bone's world rotation change (relative to its bind pose) over to the target bone and
solves the target's local rotations. The target mesh and skeleton are untouched; only rotations are written
(plus the hips height change, scaled by leg length).

usage:
  retarget.py SRC.glb TGT.glb OUT.json [--fps 30] [--frames a:b] [--bones upper|all]
Writes a three.js AnimationClip JSON (tracks named '<bone>.quaternion'), loaded with THREE.AnimationClip.parse.
"""
import json, struct, sys, argparse
import numpy as np

API_TO_MIXAMO = {
    'Hips': 'mixamorig:Hips', 'Spine02': 'mixamorig:Spine', 'Spine01': 'mixamorig:Spine1', 'Spine': 'mixamorig:Spine2',
    'neck': 'mixamorig:Neck', 'Head': 'mixamorig:Head',
    'LeftShoulder': 'mixamorig:LeftShoulder', 'LeftArm': 'mixamorig:LeftArm', 'LeftForeArm': 'mixamorig:LeftForeArm', 'LeftHand': 'mixamorig:LeftHand',
    'RightShoulder': 'mixamorig:RightShoulder', 'RightArm': 'mixamorig:RightArm', 'RightForeArm': 'mixamorig:RightForeArm', 'RightHand': 'mixamorig:RightHand',
    'LeftUpLeg': 'mixamorig:LeftUpLeg', 'LeftLeg': 'mixamorig:LeftLeg', 'LeftFoot': 'mixamorig:LeftFoot', 'LeftToeBase': 'mixamorig:LeftToeBase',
    'RightUpLeg': 'mixamorig:RightUpLeg', 'RightLeg': 'mixamorig:RightLeg', 'RightFoot': 'mixamorig:RightFoot', 'RightToeBase': 'mixamorig:RightToeBase',
}
UPPER = {'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
         'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'}


# ---------- quaternions (x, y, z, w) ----------
def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return np.array([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz])
def qinv(q): return np.array([-q[0], -q[1], -q[2], q[3]]) / np.dot(q, q)
def qslerp(a, b, t):
    d = np.dot(a, b)
    if d < 0: b, d = -b, -d
    if d > 0.9995: r = a + t * (b - a); return r / np.linalg.norm(r)
    th = np.arccos(d); return (np.sin((1 - t) * th) * a + np.sin(t * th) * b) / np.sin(th)
def mat_to_q(m):
    m = m[:3, :3] / np.linalg.norm(m[:3, :3], axis=0)   # drop scale
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1) * 2; return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s])
    i = np.argmax([m[0, 0], m[1, 1], m[2, 2]])
    if i == 0:
        s = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; return np.array([0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s])
    if i == 1:
        s = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; return np.array([(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s])
    s = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; return np.array([(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s])


class GLB:
    def __init__(self, path):
        b = open(path, 'rb').read()
        jl = struct.unpack('<I', b[12:16])[0]
        self.j = json.loads(b[20:20 + jl])
        o = 20 + jl
        self.bin = b[o + 8:o + 8 + struct.unpack('<I', b[o:o + 4])[0]]
        self.parent = {}
        for i, n in enumerate(self.j['nodes']):
            for c in n.get('children', []): self.parent[c] = i
        self.name = {n.get('name', str(i)): i for i, n in enumerate(self.j['nodes'])}

    def acc(self, k):
        a = self.j['accessors'][k]; v = self.j['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        assert a['componentType'] == 5126
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = v.get('byteStride', 4 * n)
        out = np.zeros((a['count'], n), np.float64)
        for i in range(a['count']):
            out[i] = struct.unpack_from('<%df' % n, self.bin, off + i * stride)
        return out

    def rest_local(self, i):
        n = self.j['nodes'][i]
        if 'matrix' in n: return mat_to_q(np.array(n['matrix']).reshape(4, 4).T)
        return np.array(n.get('rotation', [0, 0, 0, 1]), float)

    def bind_world(self):
        """world rotation of each joint in its bind pose, from the inverse bind matrices and the skeleton's parent chain"""
        sk = self.j['skins'][0]
        ibm = self.acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
        # the mesh node's world transform (usually identity) times inverse(ibm) = joint world
        out = {}
        for k, ji in enumerate(sk['joints']):
            out[ji] = mat_to_q(np.linalg.inv(ibm[k]))
        return out

    def static_world(self, i, local):
        """world rotation of node i given local rotations (dict node -> q), walking up to the scene root"""
        q = local.get(i, self.rest_local(i))
        p = self.parent.get(i)
        while p is not None:
            q = qmul(local.get(p, self.rest_local(p)), q); p = self.parent.get(p)
        return q

    def tracks(self, anim=0):
        a = self.j['animations'][anim]; tr = {}
        for ch in a['channels']:
            s = a['samplers'][ch['sampler']]
            tr[(ch['target']['node'], ch['target']['path'])] = (self.acc(s['input'])[:, 0], self.acc(s['output']), s.get('interpolation', 'LINEAR'))
        return tr


def sample(track, t):
    ts, vs, interp = track
    if t <= ts[0]: return vs[0]
    if t >= ts[-1]: return vs[-1]
    k = np.searchsorted(ts, t) - 1
    if interp == 'STEP': return vs[k]
    f = (t - ts[k]) / (ts[k + 1] - ts[k])
    if vs.shape[1] == 4: return qslerp(vs[k], vs[k + 1], f)
    return vs[k] + f * (vs[k + 1] - vs[k])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('tgt'); ap.add_argument('out')
    ap.add_argument('--fps', type=float, default=30); ap.add_argument('--frames', default=None)
    ap.add_argument('--bones', default='all'); ap.add_argument('--name', default='clip')
    ap.add_argument('--same', action='store_true', help='target uses the same (API rig) bone names as the source')
    a = ap.parse_args()
    S, T = GLB(a.src), GLB(a.tgt)
    sb, tb = S.bind_world(), T.bind_world()
    tr = S.tracks()
    dur = max(v[0][-1] for v in tr.values())
    times = np.arange(0, dur + 1e-6, 1 / a.fps)
    if a.frames:
        f0, f1 = (int(x) for x in a.frames.split(':')); times = times[f0:f1]
    use = [s for s in API_TO_MIXAMO if a.bones == 'all' or s in UPPER]
    M = {k: k for k in API_TO_MIXAMO} if a.same else API_TO_MIXAMO
    pairs = [(S.name[s], T.name[M[s]], M[s]) for s in use if s in S.name and M[s] in T.name]
    # target joints solved parent-first
    depth = lambda i: 0 if i not in T.parent else 1 + depth(T.parent[i])
    pairs.sort(key=lambda p: depth(p[1]))
    out = {n: [] for _, _, n in pairs}
    for t in times:
        sl = {node: sample(v, t) for (node, path), v in tr.items() if path == 'rotation'}
        tl = {}
        for si, ti, n in pairs:
            ws = S.static_world(si, sl)
            delta = qmul(ws, qinv(sb[si]))                # the source bone's turn away from its bind pose, in world
            wt = qmul(delta, tb[ti])                       # the same turn applied to the target's bind pose
            pw = T.static_world(T.parent[ti], tl) if ti in T.parent else np.array([0, 0, 0, 1.0])
            lq = qmul(qinv(pw), wt); lq /= np.linalg.norm(lq)
            tl[ti] = lq
            out[n].append(lq)
    tracks = []
    for n, qs in out.items():
        vals = []
        prev = None
        for q in qs:
            if prev is not None and np.dot(prev, q) < 0: q = -q
            vals += [round(float(x), 4) for x in q]; prev = q
        tracks.append({'name': n.replace(':', '') + '.quaternion', 'type': 'quaternion', 'times': [round(float(x - times[0]), 4) for x in times], 'values': vals})
    clip = {'name': a.name, 'duration': float(times[-1] - times[0]), 'tracks': tracks, 'uuid': a.name, 'blendMode': 2500}
    json.dump(clip, open(a.out, 'w'), separators=(',', ':'))
    print(a.out, len(tracks), 'tracks', len(times), 'frames')


if __name__ == '__main__':
    main()
