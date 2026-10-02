"""The office woman from Jørgen's two reference pictures (2026-10-02, reviews/chibi-manual-1), on the chibi kit
(kit.py). Blender, -t 8:

  blender -b -t 8 --factory-startup -P tools/characters/chibi/build.py -- <attempt>

Collections, all skinned to one Mixamo-named armature (the game's Mio rig names, so her idle and walk carry over):
  base     the vinyl body with the painted face (face-base.svg)
  hair     shoulder-length bob with side-swept bangs over her right (image left)
  office   white blouse with rolled sleeves and collar, dark grey pencil skirt, dark flats
Writes <MAIN>/art/parts/chibi-manual/<attempt>/: chibi.blend, base.glb (body only), office.glb (dressed), face.png.
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hair  # noqa: E402
import kit  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = f'{kit.MAIN}/art/parts/chibi-manual/{argv[0] if argv else "a01"}'
os.makedirs(OUT, exist_ok=True)

SKIN, HAIR, BLOUSE, SKIRT, SHOE = '#f2c8ae', '#5a4037', '#f3e9e6', '#4a4241', '#3a302e'
SLEEVE = 0.95                              # rolled sleeves end just above the wrist
DZ = 0.095                                 # the bang lines were drawn with the floor at 1090 px
HAIR_SPEC = dict(
    shell=dict(c=(0, 0.006, 0.77), a=0.345, b=0.27, h=0.36, e=4.0, f=4.0),
    hairline=0.945, window_x=0.272, end_side=0.52, end_back=0.52, flare=0.03, clumps=18,
    locks=[([(x, z + DZ) for x, z in pts], w, 'hair') for pts, w in [
        ([(0.10, 0.985), (0.05, 0.92), (-0.04, 0.84), (-0.12, 0.76), (-0.165, 0.685)], 0.14),
        ([(0.13, 0.975), (0.09, 0.91), (0.02, 0.83), (-0.02, 0.75), (-0.03, 0.69)], 0.10),
        ([(0.0, 0.985), (-0.09, 0.93), (-0.18, 0.85), (-0.23, 0.76), (-0.25, 0.66)], 0.12),
        ([(0.17, 0.97), (0.21, 0.91), (0.245, 0.83), (0.262, 0.76)], 0.09),
        ([(-0.22, 0.92), (-0.25, 0.80), (-0.26, 0.68), (-0.255, 0.56), (-0.235, 0.46)], 0.06),
    ]],
)


def build_office(coll, mats):
    parts = {'blouse': kit.obj('blouse', kit.torso_blob(grow=0.009, dh=0.004), mats['blouse'], coll)}
    kit.pair(parts, 'collar', kit.flap_maker(0.045, 0.51, 0.06, 0.04, -35), mats['blouse'], coll)
    for k, z in enumerate((0.5, 0.455)):          # buttons down the front
        b = kit.blob((0, -kit.TORSO['b'] - 0.009, z), 0.007, 0.003, 0.007, n=4)
        parts[f'button{k}'] = kit.obj(f'button{k}', b, mats['button'], coll)
    kit.pair(parts, 'sleeve', kit.sleeve_maker(SLEEVE), mats['blouse'], coll)
    kit.pair(parts, 'cuff', kit.cuff_maker(SLEEVE), mats['blouse'], coll)
    skirt, band = kit.skirt_blobs()
    parts['skirt'] = kit.obj('skirt', skirt, mats['skirt'], coll)
    parts['waistband'] = kit.obj('waistband', band, mats['skirt'], coll)
    kit.pair(parts, 'shoe', kit.flat_shoe_maker(), mats['shoe'], coll)
    for s in ('L', 'R'): kit.solidify(parts[f'shoe.{s}'], 0.006)
    return parts


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    face_png = f'{OUT}/face.png'
    kit.rasterise(f'{HERE}/face-base.svg', face_png)
    mats = {'skin': kit.material('skin', SKIN, 0.55), 'face': kit.material('face', SKIN, 0.55, image=face_png),
            'hair': kit.material('hair', HAIR, 0.5), 'blouse': kit.material('blouse', BLOUSE, 0.65),
            'button': kit.material('button', '#e9e1de', 0.4), 'skirt': kit.material('skirt', SKIRT, 0.7),
            'shoe': kit.material('shoe', SHOE, 0.45)}
    base = kit.build_base(kit.collection('base'), mats)
    hair_parts = hair.build_hair(kit.collection('hair'), mats, base['head'], HAIR_SPEC)
    office = build_office(kit.collection('office'), mats)
    kit.finish(OUT, {'base': base, 'hair': hair_parts, 'office': office}, {'base': ['base'], 'office': ['base', 'hair', 'office']})


main()
