# Build one char-mio-i2i attempt: the model (mio_i2i.py), its texture (mio_i2i_tex.py), idle and walk, the glb, and
# the review renders at the target picture's camera.
#   ~/.local/bin/blender -b --factory-startup -t 8 -P tools/style-concepts/mio_i2i_build.py -- <attempt> [src]
# src: also render the img2img sources (the flat-colour model from every turnaround angle, same framing as the target).
# Outputs go to the main checkout's art/parts/style-concepts/claude-mioi2i/<attempt>/ (git-ignored, served on :8771).
#
# Staging for every render (shot-staging): Mio alone on an empty floor that only takes shadows, standing straight,
# looking ahead; soft sky fill and one sun from her right-front-above (image left), as the render the target was
# painted over. Camera: the target's (20 degree lens, 4 degrees above level, aimed at mid-body, the whole figure with
# the same margins), swung round her: front 0, l40 three-quarter toward her left (image right), l90 her left side,
# back 180, r40 and r90 the same toward her right. Face close-ups: the head alone, level with the eyes.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import kit  # noqa: E402
import mio_i2i as M  # noqa: E402
import mio_i2i_cam as C  # noqa: E402
import mio_i2i_tex as T  # noqa: E402

YAWS = {'front': 0, 'l40': 40, 'l90': 90, 'l140': 140, 'back': 180, 'r140': -140, 'r90': -90, 'r40': -40}
# l140 and r140 are left out: at those angles the model drew her face turned over the shoulder (gen t1)
TURN = ['l40', 'l90', 'back', 'r90', 'r40']
ATTEMPTS = {
    # the shape alone: modelled to the picture, flat colours sampled from it, lit
    'mi-01': dict(views=(), unlit=False),
    # + the target picture projected from its own camera (front only; what it doesn't see keeps the flat colours)
    'mi-02': dict(views=('front',), unlit=False),
    # + the hair's front surface built from the picture's hairline (mio_i2i.hair_sheet) instead of hand-made fringe
    'mi-03': dict(views=('front',), unlit=False, sheet=True),
    # + the generated turnaround (img2img over mi-01 from five more angles) projected and blended
    'mi-04': dict(views=('front',) + tuple(TURN), unlit=False, sheet=True),
    # + unlit: the painted light and shade only, no scene light on top
    'mi-05': dict(views=('front',) + tuple(TURN), unlit=True, sheet=True),
}
# the clean reference (C.CLEAN): glasses as geometry, no drawstrings. 'src-clean' is only the flat-colour model the
# new turnaround is painted over (no glasses on it, so the model doesn't draw them into the views).
CLEAN = dict(ref='clean', sheet=True, gear=dict(strings=False, glasses=True, teeth=True))
ATTEMPTS.update({
    # the clean reference (one switch: front picture, glasses as geometry, no drawstrings, the green underside's
    # pointed edge), front only, unlit as mi-05
    'mi-06': dict(CLEAN, views=('front',), unlit=True, vset='c2'),
    # + the turnaround painted again over the clean model, without glasses or drawstrings (gen t2)
    'mi-07': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c2'),
    # + the generated views' colours matched to the front picture
    'mi-08': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c2m'),
    # + the crown's outline fitted to the picture row by row (an angular peak, not a dome)
    'mi-09': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c2m',
                  gear=dict(strings=False, glasses=True, teeth=True, crown_fit=True)),
    # + the front picture keeps what it sees at a glancing angle (front weight seen^1 x4, was seen^2 x3)
    'mi-10': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c2m', front=(4.0, 1.0),
                  gear=dict(strings=False, glasses=True, teeth=True, crown_fit=True)),
    # + the facet skin: the clean front's facets (wire/front.json) as the model's front faces
    'mi-11': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c2m', front=(4.0, 1.0),
                  gear=dict(strings=False, glasses=True, teeth=True, crown_fit=True, skins=(('front', 0),))),
    # + the diptych turnaround (gen t3: each view painted beside the clean front) in place of t2
    'mi-12': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c3', front=(4.0, 1.0),
                  gear=dict(strings=False, glasses=True, teeth=True, crown_fit=True, skins=(('front', 0),))),
    # + the back hair cut to where the aligned views end it
    'mi-13': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c3', front=(4.0, 1.0),
                  gear=dict(strings=False, glasses=True, teeth=True, crown_fit=True, short_back=True,
                            skins=(('front', 0),))),
    # + facet skins from the back and both sides (their wireframes), each only where it faces its camera within 45 deg
    'mi-14': dict(CLEAN, views=('front',) + tuple(TURN), unlit=True, vset='c3', front=(4.0, 1.0),
                  gear=dict(strings=False, glasses=True, teeth=True, crown_fit=True, short_back=True,
                            skins=(('front', 0, 0.71), ('t3-back', 180, 0.71), ('t3-l90', 90, 0.71),
                                   ('t3-r90', -90, 0.71)))),
    'src-clean': dict(views=(), unlit=False, sheet=True, ref='clean', gear=dict(strings=False, teeth=True),
                      srcdir='src-clean'),
})
REVIEW = ['front', 'l40', 'l90', 'back', 'r40', 'r90']

a = kit.args()
attempt = a[0]
cfg = ATTEMPTS[attempt]
out = os.path.join(C.OUT, attempt)
os.makedirs(out, exist_ok=True)
kit.reset()
sc = bpy.context.scene
sc.render.threads_mode = 'FIXED'
sc.render.threads = 8
coll = bpy.data.collections.new('mio')
sc.collection.children.link(coll)
M.SHEET['on'] = cfg.get('sheet', False)
M.SHEET['ref'] = C.REFS[cfg.get('ref', 't1')][1]
M.GEAR.update(cfg.get('gear', {}))
arm, ob = M.build(coll)
face_slot = M.SLOTS.index('face')
T.uv_unwrap(ob, face_slot)
lo, hi = kit.bounds([ob])
print('BOUNDS', tuple(lo), tuple(hi))

cam_d = bpy.data.cameras.new('projcam')
pcam = kit.link(bpy.data.objects.new('projcam', cam_d))
sc.camera = pcam
sc.render.resolution_x = sc.render.resolution_y = C.RES


def aim_view(cam, tag):
    kit.aim(cam, C.MID, YAWS[tag], C.PITCH, C.SPAN, fov=C.FOV)
    bpy.context.view_layer.update()


mat = None
if cfg['views']:
    views = []
    for tag in cfg['views']:
        c = bpy.data.objects.new('cam-' + tag, bpy.data.cameras.new('cam-' + tag))
        kit.link(c)
        aim_view(c, tag)
        views.append((tag, c, os.path.join(C.OUT, 'views', cfg.get('vset', 't1'), tag + '.png')))
    fg, fp = cfg.get('front', (3.0, 2.0))
    mat = T.apply(ob, views, out, face_slot, M.SLOTS.index('frame') if M.GEAR['glasses'] else None, front_gain=fg,
                  p_front=fp)
    T.set_unlit(mat, cfg['unlit'], ob)

kit.motions(arm, hi.z, **M.MOTION)
kit.pose_at(arm, None, 1)
kit.export(coll, os.path.join(out, 'mio.glb'))


def rest():
    # the glTF exporter leaves the last NLA strip live: mute every track again and zero the pose
    kit.pose_at(arm, None, 1)
    arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()


rest()

cam = kit.setup_render(samples=32)
sc.render.threads_mode = 'FIXED'
sc.render.threads = 8
for tag in REVIEW:
    aim_view(cam, tag)
    kit.render(os.path.join(out, 'renders', tag + '.png'))
for tag, yaw in (('face', 0), ('face-l32', 32)):
    kit.aim(cam, M.HEAD, yaw, 3, M.HEAD_SPAN)
    kit.render(os.path.join(out, 'renders', tag + '.png'))
kit.pose_at(arm, 'walk', 7)
kit.aim(cam, C.MID, 40, 6, C.SPAN)
kit.render(os.path.join(out, 'renders', 'walk.png'))
rest()
if 'src' in a:
    for tag in YAWS:
        aim_view(cam, tag)
        kit.render(os.path.join(C.OUT, cfg.get('srcdir', 'src'), tag + '.png'))

# clay renders with every edge drawn: the model's own facets, to lay over the picture's wireframe
if 'clay' in a or cfg.get('skins') or M.GEAR['skins']:
    clay = kit.mat('#c9ccd1', rough=0.9, spec=0.1)
    saved = list(ob.data.materials)
    for i in range(len(saved)):
        ob.data.materials[i] = clay
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = 'ABSOLUTE'
    sc.render.line_thickness = 1.0
    fs = bpy.context.view_layer.freestyle_settings
    fs.crease_angle = 3.14159
    ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('all')
    ls.select_by_visibility = True
    ls.select_by_edge_types = True
    ls.select_crease = ls.select_silhouette = ls.select_border = True
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new('edges')
    ls.linestyle.color = (0.75, 0.0, 0.45)
    ls.linestyle.thickness = 1.0
    floor = bpy.data.objects.get('floor')
    if floor:
        floor.hide_render = True
    for tag in ('front', 'l40', 'l90', 'back'):
        aim_view(cam, tag)
        kit.render(os.path.join(out, 'renders', 'clay-' + tag + '.png'))
    sc.render.use_freestyle = False
    for i, m in enumerate(saved):
        ob.data.materials[i] = m
