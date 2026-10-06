"""The settled idle pose of a game person (its walk.glb rest skeleton with relaxed-idle-<id>.json applied, frame by
frame over the clip), without the walk-to-idle cross-fade the crowd-pilot-2 probe counts in its idle numbers:
elbow bend (degrees), upper arm out from the body (degrees), thigh out (degrees), and how far the hips, head and hands
move over the clip, in leg lengths (hip height at rest).
  python3 art/candidates/rei-rig-2/idlepose.py <walk.glb> <idle.json> [<walk.glb> <idle.json> ...]
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb, compose


def sample(track, t):
    times, v = np.array(track['times']), np.array(track['values'], dtype=float)
    n = 4 if track['name'].endswith('quaternion') else 3
    v = v.reshape(-1, n)
    k = int(np.clip(np.searchsorted(times, t) - 1, 0, len(times) - 1))
    if k + 1 >= len(times):
        return v[k]
    a = (t - times[k]) / max(times[k + 1] - times[k], 1e-9)
    if n == 4:
        q0, q1 = v[k], v[k + 1] * (1 if v[k] @ v[k + 1] >= 0 else -1)
        q = (1 - a) * q0 + a * q1
        return q / np.linalg.norm(q)
    return (1 - a) * v[k] + a * v[k + 1]


def pose(g, clip, t):
    tr = {x['name']: x for x in clip['tracks']}
    over = {}
    for i, nd in enumerate(g.j['nodes']):
        n = nd.get('name')
        if not n:
            continue
        T = sample(tr[n + '.position'], t) if n + '.position' in tr else nd.get('translation', [0, 0, 0])
        R = sample(tr[n + '.quaternion'], t) if n + '.quaternion' in tr else nd.get('rotation', [0, 0, 0, 1])
        over[i] = (T, R, nd.get('scale', [1, 1, 1]))
    M = g.arm_space(over)
    S = g.local(g.node('Armature'))
    return {g.names[i]: (S @ M[i])[:3, 3] for i in M if g.names[i]}


def ang(a, b, c):
    u, v = a - b, c - b
    return 180 - np.degrees(np.arccos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1)))


def side(a, b):
    return np.degrees(np.arctan2(abs(b[0] - a[0]), a[1] - b[1]))


for gp, cp in zip(sys.argv[1::2], sys.argv[2::2]):
    g, clip = Glb(gp), json.load(open(cp))
    rows = [pose(g, clip, t) for t in np.linspace(0, clip['duration'], 41)]
    L = rows[0]['Hips'][1]
    mv = lambda k: float(np.ptp(np.array([r[k] for r in rows]), 0).sum() / L)
    rg = lambda f: [round(float(min(map(f, rows))), 0), round(float(max(map(f, rows))), 0)]
    out = {'elbow': [rg(lambda r: ang(r[s + 'Arm'], r[s + 'ForeArm'], r[s + 'Hand'])) for s in ('Left', 'Right')],
           'armOut': [rg(lambda r: side(r[s + 'Arm'], r[s + 'ForeArm'])) for s in ('Left', 'Right')],
           'thighOut': [rg(lambda r: side(r[s + 'UpLeg'], r[s + 'Leg'])) for s in ('Left', 'Right')],
           'hipsMove': round(mv('Hips'), 3), 'headMove': round(mv('Head'), 3),
           'handMove': round(max(mv('LeftHand'), mv('RightHand')), 3)}
    print(os.path.basename(os.path.dirname(gp)).ljust(8), json.dumps(out))
