"""idle: the approved relaxed-3 idle (reviews/creator-idle-neutral-3) baked onto this body's own rig, keeping its
leg and spine rest frames (tools/characters/export-approved-idle.mjs, on tools/characters/idle/rig.js). Reads
build/game/<id>/ and writes build/game/relaxed-idle-<id>.json (the cast's place), or build/game/<id>/idle.json with
`file: "folder"` (the crowd bodies'). Needs the local server on 8771 and one headless browser slot."""
import os, shutil, subprocess, sys
from common import MAIN, ROOT

# files the bake reads from the main checkout's art/parts (git-ignored), linked into a worktree while it runs
LINKS = ['art/parts/src/eric', 'art/parts/src/mio/mesh.glb', 'art/parts/src/mio/tex.webp',
         'art/parts/candidates/idle-neutral-3.glb']


def run(ctx, o):
    made = []
    for p in LINKS:
        here = os.path.join(ROOT, p)
        if ROOT != MAIN and not os.path.lexists(here):
            os.makedirs(os.path.dirname(here), exist_ok=True)
            os.symlink(os.path.join(MAIN, p), here)
            made.append(here)
    out = ctx.path('build', 'idle-out')
    os.makedirs(out, exist_ok=True)
    served = os.path.relpath(ROOT, MAIN)
    env = {**os.environ, 'IDLE_ONLY_EXTRA': '1', 'IDLE_OUTPUT': out,
           'IDLE_SOURCE': os.path.join(MAIN, 'art/parts/candidates/idle-neutral-3.glb'),
           'SOURCE_BASE': 'http://127.0.0.1:8771/' + ('' if served == '.' else served + '/'),
           'CHARACTER_DIR': os.path.relpath(ctx.dirs['game'], ROOT) + '/'}
    try:
        r = subprocess.run(['node', os.path.join(ROOT, 'tools/characters/export-approved-idle.mjs'), ctx.id],
                           env=env, cwd=ROOT, capture_output=True, text=True)
    finally:
        for p in made:
            os.remove(p)
    print(r.stdout[-2000:], r.stderr[-2000:])
    if r.returncode:
        sys.exit('idle bake failed')
    src = os.path.join(out, f'relaxed-idle-{ctx.id}.json')
    dst = (os.path.join(ctx.dirs['game'], ctx.id, 'idle.json') if o.get('file') == 'folder'
           else os.path.join(ctx.dirs['game'], f'relaxed-idle-{ctx.id}.json'))
    shutil.move(src, dst)
    print('idle', dst)
    ctx.files['idle'] = dst
