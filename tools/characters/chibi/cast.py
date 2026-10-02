"""Kuro, Eric and Mio on the hand-built chibi kit (reviews/chibi-cast-manual-1; Jørgen 2026-10-02: "Now try making
kuro, eric and mio in that style"). Looks from their approved portraits (game3d/assets/portraits/<id>-neutral.webp)
and docs/game/cast.md; glasses where canon (painted on the face, face.py); no props, so no headphones, lanyards or
hair sticks. Blender, -t 8:

  blender -b -t 8 --factory-startup -P tools/characters/chibi/cast.py -- <attempt> [mio kuro eric]

Each person: collections base (the shared body in their skin), hair and outfit, skinned to the kit's rig.
Writes <MAIN>/art/parts/chibi-cast-manual/<attempt>/<id>/: chibi.blend, <id>.glb, face.svg, face.png.
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import face  # noqa: E402
import hair  # noqa: E402
import kit  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ATTEMPT = argv[0] if argv else 'a01'
WHO = argv[1:] or ['mio', 'kuro', 'eric']
T = kit.TORSO
SHELL = dict(c=(0, 0.006, 0.77), a=0.345, b=0.27, h=0.36, e=4.0, f=4.0)


def sphere(c, r, sy=1.0):
    return lambda: kit.blob(c, r, r * sy, r, 2.2, 2.2, n=12)


def side_locks(x, top, bottom, w, mk_left='hair', mk_right='hair'):
    """A lock down each side of the face from the bangs to `bottom`; her left lock first."""
    line = [(x, top), (x + 0.02, top - 0.13), (x + 0.025, (top + bottom) / 2 - 0.03), (x + 0.012, bottom)]
    return [(line, w, mk_left), ([(-px, z) for px, z in line], w, mk_right)]


LOOKS = {
    # dark green bordering on black, lighter green underneath and in one lock; blunt bangs; a bun at the back on
    # her left; dark teal hoodie, dark cargo trousers, sneakers (cast.md; the hair colours are the game's)
    'mio': dict(
        colours=dict(hair='#13292f', under='#20a081', top='#123137', top2='#0f2a2f', string='#d6dbd8',
                     bottom='#23272c', shoe='#1d2a33', sole='#ecebe7'),
        hair=dict(shell=SHELL, hairline=0.845, window_x=0.245, end_side=0.55, end_back=0.56, flare=0.02, clumps=18,
                  fringe=0.022, inner='under',
                  locks=side_locks(0.232, 0.93, 0.575, 0.06, mk_left='under'),
                  extras=[('bun', sphere((0.15, 0.29, 0.98), 0.085), 'hair')]),
        outfit='hoodie'),
    # black hair in a high bun with blunt bangs and long locks beside the face; black blazer over a dark shirt,
    # black pencil skirt, black flats; black glasses with clear lenses (cast.md, art/PROMPTS.md)
    'kuro': dict(
        colours=dict(hair='#15161f', top='#191b22', top2='#2c303b', lapel='#23252e', button='#0e0f12',
                     skirt='#1d1f26', shoe='#121317'),
        hair=dict(shell=SHELL, hairline=0.85, window_x=0.235, end_side=0.50, end_back=0.58, flare=0.0, clumps=20,
                  fringe=0.02, locks=side_locks(0.222, 0.93, 0.525, 0.07),
                  extras=[('bun', sphere((0, 0.19, 1.12), 0.12), 'hair')]),
        outfit='suit'),
    # dark-blond hair swept back into a short ponytail, a few strands over his right brow, stubble, silver
    # rectangular glasses; grey hoodie under a navy blazer (cast.md), dark trousers and trainers
    'eric': dict(
        colours=dict(hair='#a48a5c', top='#1f2d4d', top2='#8d9096', lapel='#1b2844', string='#e3e4e6',
                     bottom='#2a2e38', shoe='#2b2c31', sole='#e6e6e6', tie='#1f2d4d'),
        hair=dict(shell=SHELL, hairline=1.0, window_x=0.30, end_side=0.80, end_back=0.64, flare=0.0, clumps=22,
                  groove=0.008, tip=0.006,
                  locks=[([(-0.02, 1.06), (-0.10, 1.0), (-0.18, 0.955), (-0.235, 0.93)], 0.09, 'hair'),
                         ([(0.06, 1.065), (0.0, 1.0), (-0.06, 0.955)], 0.07, 'hair'),
                         ([(0.12, 1.065), (0.18, 1.0), (0.24, 0.96)], 0.08, 'hair')],
                  extras=[('tail', lambda: kit.blob((0, 0.30, 0.69), 0.05, 0.045, 0.09, 2.2, 2.2, n=12), 'hair'),
                          ('tail1', lambda: kit.blob((0, 0.285, 0.765), 0.04, 0.035, 0.016, 2.2, 3, n=8), 'tie')]),
        outfit='blazer'),
}


def hoodie(parts, mats, coll, grow=0.014, under=False):
    """A hoodie body with a hem band, hood behind the neck, kangaroo pocket and drawstrings."""
    parts['hoodie'] = kit.obj('hoodie', kit.torso_blob(grow=grow, dz=-0.02, dh=0.02), mats['top2' if under else 'top'], coll)
    m = mats['top2' if under else 'top']
    parts['hem'] = kit.obj('hem', kit.blob((0, 0, 0.205), T['a'] + grow + 0.006, T['b'] + grow + 0.006, 0.016, 2.6, 4.0, n=16), m, coll)
    parts['hood'] = kit.obj('hood', kit.blob((0, 0.12, 0.53), 0.15, 0.07, 0.055, 2.4, 2.4, n=12), m, coll)
    for k, x in enumerate((0.03, -0.03)):
        parts[f'string{k}'] = kit.obj(f'string{k}', kit.blob((x, -T['b'] - grow - 0.006, 0.47), 0.005, 0.005, 0.035, n=4),
                                      mats['string'], coll)
    if not under:
        parts['pocket'] = kit.obj('pocket', kit.blob((0, -T['b'] - grow - 0.004, 0.27), 0.085, 0.008, 0.04, 2.4, 3.0, n=8), m, coll)


def trousers(parts, mats, coll, grow=0.013):
    seat, leg = kit.trouser_makers()
    parts['seat'] = kit.obj('seat', seat(), mats['bottom'], coll)
    kit.pair(parts, 'trouser', leg, mats['bottom'], coll)
    upper, sole = kit.sneaker_makers()
    kit.pair(parts, 'shoe', upper, mats['shoe'], coll)
    kit.pair(parts, 'sole', sole, mats['sole'], coll)


def build_outfit(kind, coll, mats):
    parts = {}
    if kind == 'hoodie':                   # Mio
        hoodie(parts, mats, coll)
        kit.pair(parts, 'sleeve', kit.sleeve_maker(0.97, grow=0.014), mats['top'], coll)
        kit.pair(parts, 'cuff', kit.cuff_maker(0.97, grow=0.012, depth=0.03), mats['top'], coll)
        trousers(parts, mats, coll)
    elif kind == 'suit':                   # Kuro
        parts['shirt'] = kit.obj('shirt', kit.torso_blob(grow=0.006), mats['top2'], coll)
        bm = kit.open_front(kit.cut_below(kit.torso_blob(grow=0.014, dz=-0.01, dh=0.01), 0.33), 0.42, 0.0, 0.6)
        parts['blazer'] = kit.solidify(kit.obj('blazer', bm, mats['top'], coll), 0.006)
        kit.pair(parts, 'lapel', kit.flap_maker(0.045, 0.475, 0.032, 0.06, -28, dy=0.016), mats['lapel'], coll)
        for k, z in enumerate((0.40, 0.355)):
            parts[f'button{k}'] = kit.obj(f'button{k}', kit.blob((0, -T['b'] - 0.02, z), 0.008, 0.004, 0.008, n=4), mats['button'], coll)
        kit.pair(parts, 'sleeve', kit.sleeve_maker(0.97, grow=0.012), mats['top'], coll)
        skirt, band = kit.skirt_blobs()
        parts['skirt'] = kit.obj('skirt', skirt, mats['skirt'], coll)
        parts['waistband'] = kit.obj('waistband', band, mats['skirt'], coll)
        kit.pair(parts, 'shoe', kit.flat_shoe_maker(), mats['shoe'], coll)
        for s in ('L', 'R'): kit.solidify(parts[f'shoe.{s}'], 0.006)
    elif kind == 'blazer':                 # Eric
        hoodie(parts, mats, coll, grow=0.014, under=True)
        bm = kit.open_front(kit.torso_blob(grow=0.022, dz=-0.012, dh=0.012), 0.26, 0.035, 0.25)
        parts['blazer'] = kit.solidify(kit.obj('blazer', bm, mats['top'], coll), 0.006)
        kit.pair(parts, 'lapel', kit.flap_maker(0.06, 0.45, 0.03, 0.075, -18, dy=0.026), mats['lapel'], coll)
        kit.pair(parts, 'sleeve', kit.sleeve_maker(0.97, grow=0.016), mats['top'], coll)
        kit.pair(parts, 'cuff', kit.cuff_maker(0.985, grow=0.012, depth=0.02), mats['top2'], coll)
        trousers(parts, mats, coll)
    return parts


def build(who):
    out = f'{kit.MAIN}/art/parts/chibi-cast-manual/{ATTEMPT}/{who}'
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    look, f = LOOKS[who], face.FACES[who]
    svg = face.write(who, f'{out}/face.svg')
    kit.rasterise(svg, f'{out}/face.png')
    mats = {'skin': kit.material('skin', f['skin'], 0.55), 'face': kit.material('face', f['skin'], 0.55, image=f'{out}/face.png')}
    for k, c in look['colours'].items():
        mats[k] = kit.material(k, c, 0.4 if k in ('sole', 'button', 'shoe') else 0.55 if k in ('hair', 'under') else 0.7)
    base = kit.build_base(kit.collection('base'), mats)
    hair_parts = hair.build_hair(kit.collection('hair'), mats, base['head'], look['hair'])
    outfit = build_outfit(look['outfit'], kit.collection('outfit'), mats)
    kit.finish(out, {'base': base, 'hair': hair_parts, 'outfit': outfit}, {who: ['base', 'hair', 'outfit']})


for w in WHO:
    build(w)
