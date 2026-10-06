"""Bake corrected Emi idle onto Rei's donor-aligned rig, matching rerig2.py's clip mapping.
Usage: donor_idle.py rei-walk.glb emi-walk.glb emi-idle.json output.json
The selected mesh and weights stay untouched. All offsets use Rei's bone lengths.
"""
import copy, json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'rei-rig-1'))
from glbio import Glb


def bake(rei_path, donor_path, idle_path, out_path):
    rei, donor = Glb(rei_path), Glb(donor_path)
    clip = copy.deepcopy(json.loads(Path(idle_path).read_text()))
    source_metadata = json.loads(clip.get('userData', '{}'))
    if source_metadata.get('stance') != 'host-rest-frames':
        raise ValueError('The donor idle must use the corrected host-rest-frames bake')
    own_hip = np.array(rei.j['nodes'][rei.node('Hips')]['translation'])
    donor_hip = np.array(donor.j['nodes'][donor.node('Hips')]['translation'])
    leg_scale = own_hip[1] / donor_hip[1]
    for track in clip['tracks']:
        name, prop = track['name'].rsplit('.', 1)
        if prop != 'position':
            continue
        values = np.array(track['values']).reshape(-1, 3)
        if name == 'Hips':
            values = own_hip + (values - donor_hip) * leg_scale
        else:
            values[:] = rei.j['nodes'][rei.node(name)]['translation']
        track['values'] = values.ravel().tolist()
    override = {}
    for i, node in enumerate(rei.j['nodes']):
        override[i] = [node.get('translation', [0, 0, 0]), node.get('rotation', [0, 0, 0, 1]), node.get('scale', [1, 1, 1])]
    for track in clip['tracks']:
        name, prop = track['name'].rsplit('.', 1)
        size = 4 if prop == 'quaternion' else 3
        override[rei.node(name)][{'position': 0, 'quaternion': 1, 'scale': 2}[prop]] = track['values'][:size]
    floor_lift = -float(rei.skinned(rei.arm_space(override))[:, 1].min())
    offset = np.linalg.inv(rei.local(rei.node('Armature')))[:3, :3] @ [0, floor_lift, 0]
    for track in clip['tracks']:
        if track['name'] == 'Hips.position':
            values = np.array(track['values']).reshape(-1, 3) + offset
            track['values'] = values.ravel().tolist()
    clip['userData'] = json.dumps({'approval': 'creator-idle-neutral-3/relaxed-3', 'stance': 'emi-donor-frames',
                                 'donor': 'emi', 'sourceSha256': source_metadata.get('sourceSha256'),
                                 'floorLift': floor_lift, 'hipsTravelScale': leg_scale})
    Path(out_path).write_text(json.dumps(clip) + '\n')
    print('wrote', out_path, 'floor lift', floor_lift)


if __name__ == '__main__':
    bake(*sys.argv[1:5])
