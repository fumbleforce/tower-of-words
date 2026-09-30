# The review cameras, shared by the original and the new models so the pictures line up.
import os

import bpy
from mathutils import Vector

import common as C


def pose(arm, frame):
    """frame None: bind pose. Otherwise the walk action at that frame (the original GLB's walk clip)."""
    if frame is None:
        if arm.animation_data:
            arm.animation_data.action = None
        for pb in arm.pose.bones:
            pb.matrix_basis.identity()
        return
    act = next(a for a in bpy.data.actions if 'alk' in a.name and a.frame_range[1] - a.frame_range[0] > 5)
    arm.animation_data_create()
    arm.animation_data.action = act
    if act.slots:
        arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(int(float(frame)))


def shoot(body, arm, objs, outdir, tag, engine='BLENDER_EEVEE', only=None):
    cam = C.setup_render(engine)
    # frame on the posed model: its bones where the pose puts them, its size from the deformed meshes
    bpy.context.view_layer.update()
    names = C.rig_names(body)
    J = {k: arm.matrix_world @ arm.pose.bones[v].head for k, v in names.items()}
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        pts += [ev.matrix_world @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    height = hi.z - lo.z
    full = J['Hips'].copy()
    full.z = lo.z + height * 0.5
    head = (J['Head'] + J['head_end']) * 0.5
    neck = J['neck']
    shots = {
        'front': (full, 0, 4, height * 1.12),
        'three-quarter': (full, 40, 6, height * 1.12),
        'side': (full, 90, 3, height * 1.12),
        'back': (full, 180, 4, height * 1.12),
        'face': (head, 0, 2, height * 0.5),
        'face-3q': (head, 35, 4, height * 0.5),
        'neck': (neck, 25, 10, height * 0.3),
        'neck-back': (neck, 160, 20, height * 0.3),
        'hood': (neck, 175, 50, height * 0.34),
        'hand': (J['LeftHand'], 60, 5, height * 0.3),
        'cuff': (J['LeftHand'], 110, -25, height * 0.22),
        'feet': ((J['LeftFoot'] + J['RightFoot']) * 0.5, 30, 12, height * 0.35),
        'top': (head, 0, 80, height * 0.6),
    }
    for name, (target, yaw, pitch, span) in shots.items():
        if only and name not in only:
            continue
        C.aim(cam, target, yaw, pitch, span, dist=height * 6)
        C.render(os.path.join(outdir, f'{tag}-{name}.png'))
