# The target picture's camera (char-face-1 gen-i2i mio-front-d60 was img2img over claude-facetface attempt-04's
# front render, build.py 'front': kit.aim(cam, mid, yaw 0, pitch 4, span H * 1.15), 20 degree vertical lens,
# 1024 square). Numbers read from that build (Blender, 2026-10-01): mid (0, -0.00771, 0.63384), H 1.27692.
# Plain Python (no bpy) so both Blender and the image scripts use it.
import math
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = os.path.dirname(subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute',
                                                '--git-common-dir'], text=True).strip())
OUT = os.path.join(MAIN, 'art/parts/style-concepts/claude-mioi2i')
TARGET = os.path.join(MAIN, 'art/parts/style-concepts/claude-facetface/gen/i2i-cf04/mio-front-d60.png')
TARGET2 = os.path.join(MAIN, 'art/parts/style-concepts/claude-facetface/gen/i2i-facet04/mio-front-d60.png')
# The clean version of the target Jørgen asked for (2026-10-01: high res, no floor shadow, no drawstrings, no
# glasses), made by another agent; same picture and framing, so the same camera.
CLEAN = os.path.join(MAIN, 'art/parts/style-concepts/mio-ref-clean/final.png')
CLEAN_CUT = os.path.join(MAIN, 'art/parts/style-concepts/mio-ref-clean/final-cutout.png')
# reference sets: the front picture, and the folder (under OUT) with its mask.png and hair.png
REFS = {'t1': (TARGET, 'ref'), 'clean': (CLEAN, 'ref-clean')}

MID = (0.0, -0.007713, 0.633841)
SPAN = 1.27692 * 1.15
FOV = 20.0
RES = 1024
PITCH = 4.0
DIST = SPAN / 2 / math.tan(math.radians(FOV) / 2)


def cam_pos(yaw=0.0, pitch=PITCH, target=MID, dist=DIST):
    y, p = math.radians(yaw), math.radians(pitch)
    return (target[0] + math.sin(y) * math.cos(p) * dist, target[1] - math.cos(y) * math.cos(p) * dist,
            target[2] + math.sin(p) * dist)


def _f():
    return RES / 2 / math.tan(math.radians(FOV) / 2)


def unproject_z(v):
    """Image row v -> height z where the ray through the image centre column meets the plane y = 0 (front camera)."""
    cx, cy, cz = cam_pos()
    p = math.radians(PITCH)
    # camera looks along +Y tilted down by pitch; ray direction for row v
    t = (v - RES / 2) / _f()
    fwd = (0, math.cos(p), -math.sin(p))
    up = (0, math.sin(p), math.cos(p))
    d = (0, fwd[1] - t * up[1], fwd[2] - t * up[2])
    s = (0 - cy) / d[1]
    return cz + s * d[2]


def unproject_x(u, z):
    """Image column u at height z on the plane y = 0 -> x (her left is +x, image right)."""
    cx, cy, cz = cam_pos()
    dist = math.hypot(0 - cy, z - cz)
    return (u - RES / 2) / _f() * dist
