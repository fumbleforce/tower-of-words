"""Measure sagittal posture in the source rig and exported idle, without a renderer.

Pass the checkout containing assets. +Z is forward. The knee offset is measured
from the hip-to-ankle line; positive means normal forward knee flexion. These
are joint measurements, not a substitute for checking the skinned silhouette.
"""
import json
from pathlib import Path
import sys

import numpy as np
from scipy.spatial.transform import Rotation, Slerp

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'rei-rig-1'))
from glbio import Glb


def sample(times, values, time, quaternion=False):
    times, values = np.asarray(times), np.asarray(values)
    time = np.clip(time, times[0], times[-1])
    if len(times) == 1:
        return values[0]
    if quaternion:
        return Slerp(times, Rotation.from_quat(values))([time]).as_quat()[0]
    return np.array([np.interp(time, times, values[:, k]) for k in range(values.shape[1])])


def pose(g, tracks, time):
    overrides = {i: [n.get('translation', [0, 0, 0]), n.get('rotation', [0, 0, 0, 1]),
                     n.get('scale', [1, 1, 1])] for i, n in enumerate(g.j['nodes'])}
    for name, prop, times, values in tracks:
        if name not in g.names:
            continue
        index = {'translation': 0, 'rotation': 1, 'scale': 2}[prop]
        overrides[g.node(name)][index] = sample(times, values, time, index == 1)
    return g.arm_space(overrides)


def metrics(g, matrices):
    def p(name):
        return matrices[g.node(name)][:3, 3]
    torso = p('Head') - p('Hips')
    result = {'head_forward_degrees': float(np.degrees(np.arctan2(torso[2], torso[1])))}
    for side in ['Left', 'Right']:
        hip, knee, ankle = [p(side + joint) for joint in ['UpLeg', 'Leg', 'Foot']]
        leg_length = np.linalg.norm(hip - knee) + np.linalg.norm(knee - ankle)
        line_z = hip[2] + (ankle[2] - hip[2]) * (knee[1] - hip[1]) / (ankle[1] - hip[1])
        result[side.lower() + '_knee_forward_leg_fraction'] = float((knee[2] - line_z) / leg_length)
        result[side.lower() + '_ankle_ahead_leg_fraction'] = float((ankle[2] - hip[2]) / leg_length)
    return result


def glb_tracks(g):
    animation = g.j['animations'][0]
    return [(g.names[c['target']['node']], c['target']['path'],
             g.acc(animation['samplers'][c['sampler']]['input']).ravel(),
             g.acc(animation['samplers'][c['sampler']]['output'])) for c in animation['channels']]


def json_tracks(clip):
    props = {'position': 'translation', 'quaternion': 'rotation', 'scale': 'scale'}
    result = []
    for track in clip['tracks']:
        name, prop = track['name'].rsplit('.', 1)
        result.append((name, props[prop], track['times'],
                       np.asarray(track['values']).reshape(-1, 4 if prop == 'quaternion' else 3)))
    return result


def bounds(g, tracks):
    end = max(t[2][-1] for t in tracks)
    samples = [metrics(g, pose(g, tracks, time)) for time in np.linspace(0, end, 61)]
    return {key: [round(min(s[key] for s in samples), 4), round(max(s[key] for s in samples), 4)]
            for key in samples[0]}


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    report = {}
    source = Glb(root / 'art/parts/candidates/idle-neutral-3.glb')
    report['approved_source'] = bounds(source, glb_tracks(source))
    for character in sys.argv[2:] or ['mio2', 'kuro', 'aoi', 'emi', 'carina', 'rei']:
        g = Glb(root / f'game3d/assets/characters/{character}/walk.glb')
        clip = json.loads((root / f'game3d/assets/characters/relaxed-idle-{character}.json').read_text())
        report[character] = {'rest': metrics(g, g.arm_space()), 'walk': bounds(g, glb_tracks(g)),
                             'idle': bounds(g, json_tracks(clip))}
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
