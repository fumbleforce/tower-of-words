"""checks: the built body in the game's own loader (tools/characters/check-idle-stance.mjs on build/game/): the idle
keeps the feet planted and on the floor, the knees bend forward, it moves, and walk, run and idle blend without
jumps. Writes build/idle-stance.json. With `seats: [<scene>, ...]` it also runs game3d/tools/seat-check.mjs on those
scenes (ONLY=...); that measures the installed copy, so add it once the body is in the game. Needs the server on
8771."""
import os, subprocess, sys
from common import MAIN, ROOT


def run(ctx, o):
    served = os.path.relpath(ROOT, MAIN)
    env = {**os.environ, 'MODEL_DIR': ctx.dirs['game'], 'OUT': ctx.path('build', 'idle-stance.json'),
           'BASE_URL': 'http://127.0.0.1:8771/' + ('' if served == '.' else served + '/')}
    r = subprocess.run(['node', os.path.join(ROOT, 'tools/characters/check-idle-stance.mjs'), ctx.id], env=env,
                       cwd=ROOT, capture_output=True, text=True)
    print(r.stdout[-1500:], r.stderr[-1500:])
    if r.returncode:
        sys.exit('idle stance check failed')
    if o.get('seats'):
        env = {**os.environ, 'ONLY': ','.join(o['seats']), 'SHOTS': '0'}
        r = subprocess.run(['node', 'game3d/tools/seat-check.mjs'], env=env, cwd=ROOT, capture_output=True, text=True)
        print(r.stdout[-1500:], r.stderr[-1500:])
        if r.returncode:
            sys.exit('seat check failed')
