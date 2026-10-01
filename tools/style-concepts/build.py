# Build one char-style-1 concept (Mio and Eric), export each as a glb with idle and walk, and render the review views.
#   ~/.local/bin/blender -b --factory-startup -P tools/style-concepts/build.py -- <style> <attempt> [views]
# style: voxel | toyfig | facet (a module next to this file with build(char, coll) -> (armature, meshes)).
# views: comma list (default all): front,three-quarter,side,back,face,face-3q,walk,pair,game
#
# Staging (shot-staging note for every view): one character alone on an empty floor that only takes shadows,
# looking straight ahead, soft sky fill plus one sun from her right-front-above (image left). Front yaw 0, three-quarter
# 40 toward her left (image right), side 90 (her left side), back 180, the face close-up on the head, the walk view at
# mid-stride. The pair shot: Mio at image left, Eric at image right, half a metre apart, both facing camera. The game
# view: both at the game camera's elevation (56 degrees) and lens (22 degrees vertical).
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import kit  # noqa: E402

a = kit.args()
style, attempt = a[0], a[1]
views = a[2].split(',') if len(a) > 2 else ['front', 'three-quarter', 'side', 'back', 'face', 'face-3q', 'walk', 'pair',
                                           'game']
mod = importlib.import_module(style)
out = os.path.join(kit.OUT, 'claude-' + style, attempt)
kit.reset()
chars = {}
for ch in ('mio', 'eric'):
    coll = bpy.data.collections.new(ch)
    bpy.context.scene.collection.children.link(coll)
    arm, objs = mod.build(ch, coll)
    kit.motions(arm, kit.bounds(objs)[1].z, **getattr(mod, 'MOTION', {}))
    kit.pose_at(arm, None, 1)
    kit.export(coll, os.path.join(out, ch + '.glb'))
    chars[ch] = (coll, arm, objs)

cam = kit.setup_render()


def only(names):
    for ch, (coll, arm, objs) in chars.items():
        coll.hide_render = ch not in names


for ch, (coll, arm, objs) in chars.items():
    only([ch])
    kit.pose_at(arm, None, 1)
    lo, hi = kit.bounds(objs)
    H = hi.z - lo.z
    mid = (lo + hi) / 2
    head = getattr(mod, 'HEAD', {}).get(ch) or (mid.x, mid.y, hi.z - H * 0.22)
    hs = getattr(mod, 'HEAD_SPAN', 0.5)
    shots = {'front': (mid, 0, 4, H * 1.15), 'three-quarter': (mid, 40, 6, H * 1.15), 'side': (mid, 90, 3, H * 1.15),
             'back': (mid, 180, 4, H * 1.15), 'face': (head, 0, 3, H * hs), 'face-3q': (head, 32, 5, H * hs)}
    for v, (t, yaw, pitch, span) in shots.items():
        if v in views:
            kit.aim(cam, t, yaw, pitch, span)
            kit.render(os.path.join(out, 'renders', f'{ch}-{v}.png'))
    if 'walk' in views:
        kit.pose_at(arm, 'walk', 7)
        kit.aim(cam, mid, 40, 6, H * 1.15)
        kit.render(os.path.join(out, 'renders', f'{ch}-walk.png'))
        kit.pose_at(arm, None, 1)

if 'pair' in views or 'game' in views:
    only(['mio', 'eric'])
    chars['mio'][1].location.x = -0.33
    chars['eric'][1].location.x = 0.33
    bpy.context.view_layer.update()
    lo, hi = kit.bounds(chars['mio'][2] + chars['eric'][2])
    mid = (lo + hi) / 2
    H = hi.z - lo.z
    if 'pair' in views:
        kit.aim(cam, mid, 0, 5, H * 1.2)
        kit.render(os.path.join(out, 'renders', 'pair.png'))
        kit.aim(cam, mid, 25, 8, H * 1.2)
        kit.render(os.path.join(out, 'renders', 'pair-3q.png'))
    if 'game' in views:
        # the game camera: 56 degrees down, 22 degree lens, at a distance where they are about the size the game
        # shows them (a 1.1 m person is about 13 percent of the frame height at the fitted distance)
        bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = 1366, 860
        kit.aim(cam, (mid.x, mid.y, 0.5), 20, 56, 8.0, fov=22)
        kit.render(os.path.join(out, 'renders', 'game-angle.png'))
