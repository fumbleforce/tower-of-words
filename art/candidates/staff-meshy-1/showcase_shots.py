"""Copies the chosen in-game stills (game-shots.mjs, game3d/shots/staff-meshy/) into the Showcase entry's folder as
webp, for showcase/staff-in-game-1.
  python3 art/candidates/staff-meshy-1/showcase_shots.py   (from the worktree root; Pillow)
"""
import os
from PIL import Image

S, D = 'game3d/shots/staff-meshy', 'bible/shots/showcase/staff-in-game-1'
PICKS = {
    'mori-day1-1366x860/office-start-1': 'mori-door-1366x860',        # greeting Eric at the B2 door
    'mori-day1-1366x860/office-mori-close-4': 'mori-b2-1366x860',     # in B2, by the copier
    'kenji-day1-1366x860/office-kenji-close-1': 'kenji-desk-1366x860',  # round 2, at his desk with Eric
    'guard-day1-1366x860/gate-guard-close-2': 'guard-desk-1366x860',  # seated at the gate desk, Eric in front
    'guard-day1-1366x860/gate-guard-close-4': 'guard-nine-1366x860',  # "at nine"
    'kuroda-day1-1366x860/train-kuroda-close-1': 'hamada-asleep-1366x860',  # asleep on the train
    'kuroda-day1-1366x860/train-kuroda-close-2': 'hamada-awake-1366x860',   # awake
    'kuroda-day1-1366x860/gate-kuroda-close-3': 'hamada-gate-1366x860',     # at the gate
    'mori-kenji-guard-kuroda-day1-390x844/office-mori-close-1': 'mori-390x844',
    'mori-kenji-guard-kuroda-day1-390x844/office-kenji-close-1': 'kenji-390x844',
    'mori-kenji-guard-kuroda-day1-390x844/gate-guard-close-1': 'guard-390x844',
    'mori-kenji-guard-kuroda-day1-390x844/train-kuroda-close-2': 'hamada-390x844',
}
os.makedirs(D, exist_ok=True)
for src, dst in PICKS.items():
    p = f'{S}/{src}.jpg'
    if os.path.exists(p):
        Image.open(p).save(f'{D}/{dst}.webp', quality=82, method=6)
        print('wrote', dst)
    else:
        print('missing', p)
