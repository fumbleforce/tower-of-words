"""One 3D character from its recipe (art/MESHY.md): tools/characters/recipes/<id>.json lists the source picture, the
round and Review, the Meshy task ids, and the steps in order with their settings; each step is a module in
tools/characters/steps/. Outputs go to the main checkout's art/candidates/<round>/<id>/ (src/, meshy/, build/; all
git-ignored); build/game/ is laid out as game3d/assets/characters/, ready to promote (tools/assets/live.mjs).

  python3 tools/characters/build.py <id> [--spend] [--until <step>]
  python3 tools/characters/build.py --steps        the step names and what each does

Meshy costs credits, so a Meshy step only sends a request with --spend; without it a step whose file is not on disk
stops the build. A recipe's `import` copies a cached round's files into meshy/ first (key: the file in meshy/, value:
its path in the main checkout), so an old model rebuilds without a single Meshy call. `supplied: true` marks a model
Jørgen made: it may only get the steps that leave his face, eyes and body alone (SUPPLIED_OK).
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VENV = os.path.expanduser('~/ai/sd/venv/bin/python')
try:
    import numpy, PIL, scipy  # noqa: F401
except ImportError:                                   # the steps need numpy, Pillow and scipy: the image venv has them
    if os.path.exists(VENV) and os.path.abspath(sys.executable) != VENV:
        os.execv(VENV, [VENV, *sys.argv])
    raise
sys.path.insert(0, os.path.join(HERE, 'steps'))
import common  # noqa: E402
import checks, face_uv, fix, hands, idle, meshy_steps, package, region_mask, reweight, rerig, sheets  # noqa: E402

STEPS = {
    'meshy-shape': meshy_steps.shape, 'face-uv': face_uv.run, 'meshy-texture': meshy_steps.texture,
    'meshy-rig': meshy_steps.rig, 'meshy-anim': meshy_steps.anim, 'head-scale': fix.head_scale,
    'recolour': fix.recolour, 'hand-scale': hands.run, 'reweight': reweight.run, 'rerig': rerig.run,
    'package': package.run, 'region-mask': region_mask.run, 'idle': idle.run, 'checks': checks.run,
    'sheets': sheets.run,
}
DOCS = {
    'meshy-shape': 'image to 3D: smart topology, 1,050 polygons, A-pose, no texture (5 credits)',
    'face-uv': 'our UV layout, the face one island at 3x density',
    'meshy-texture': 'Meshy retexture on that layout (10 credits a roll), texture-marks check, up to 3 re-rolls',
    'meshy-rig': "Meshy's auto-rig at 1.1 m with its walk and run (5 credits)",
    'meshy-anim': 'one library clip, by default Chair_Sit_Idle_F as sit (3 credits)',
    'head-scale': 'head pieces scaled about the neck (only when a Review asks)',
    'recolour': "one piece's colour changed (only when a Review asks)",
    'hand-scale': 'checks game3d/js/cast3d.js HANDS has the scale a Review asked for',
    'reweight': "bone-heat skin weights on Meshy's skeleton (only when a Review flags the weights)",
    'rerig': "our skeleton with donor clips (only when a Review flags Meshy's rig)",
    'package': 'walk/run/sit without the texture, base.webp and its 1024 and 512 copies',
    'region-mask': 'hair, top and bottom regions for crowd tints; faces stay untinted',
    'idle': "the approved relaxed-3 idle baked onto this body's rig (server on 8771)",
    'checks': "idle stance in the game's loader; seat-check on request",
    'sheets': 'turnaround, face and under-chin renders and their sheets; flags go on the Review',
}
# what a model Jørgen supplied may get: rigging, packaging and checks, never a new texture, UVs or proportions
SUPPLIED_OK = {'meshy-rig', 'meshy-anim', 'reweight', 'rerig', 'package', 'region-mask', 'idle', 'checks', 'sheets'}


def main():
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'):
        sys.exit(__doc__)
    if a[0] == '--steps':
        for name, text in DOCS.items():
            print(f'{name:14s} {text}')
        return
    until = a[a.index('--until') + 1] if '--until' in a else None
    ctx = common.Ctx(os.path.join(HERE, 'recipes', a[0] + '.json'), spend='--spend' in a)
    r = ctx.recipe
    for dst, src in (r.get('import') or {}).items():
        if common.copy_in(os.path.join(common.MAIN, src), os.path.join(os.path.dirname(ctx.dirs['src']), dst)):
            print('imported', dst, '<-', src)
    for st in r['steps']:
        name = st['step']
        if name not in STEPS:
            sys.exit(f'unknown step {name}; see --steps')
        if r.get('supplied') and name not in SUPPLIED_OK:
            sys.exit(f'{name} would change a model Jørgen supplied (his face, eyes or body); not run')
    for st in r['steps']:
        name = st['step']
        print(f'== {name}', flush=True)
        STEPS[name](ctx, {k: v for k, v in st.items() if k != 'step'})
        if name == until:
            break
    print('built', ctx.id, '->', common.rel(ctx.dirs['build']))
    if ctx.flags:
        print('FLAGS (on the Review):', *ctx.flags, sep='\n  ')


if __name__ == '__main__':
    main()
