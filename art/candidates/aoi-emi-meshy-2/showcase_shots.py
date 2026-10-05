"""Copies the chosen in-game stills (game-shots.mjs, game3d/shots/aoi-emi-2/) into the Showcase entry's folder as webp.
  python3 art/candidates/aoi-emi-meshy-2/showcase_shots.py   (from the worktree root; Pillow)
"""
import os
from PIL import Image

S, D = 'game3d/shots/aoi-emi-2', 'bible/shots/showcase/aoi-emi-in-game-1'
PICKS = {
    'day1-{s}/train-aoi-close-2': 'aoi-seat-{s}',   # day 1, seated on the train, the camera closed on her
    'day1-{s}/train-aoi-3': 'aoi-line-{s}',         # day 1, her あ、すみません as played
    'day1-{s}/office-emi-close-1': 'emi-meet-{s}',  # day 1, meeting Eric in B2, closed on her
    'day1-{s}/office-emi-1': 'emi-line-{s}',        # the same line as played
    'day2-{s}/office-emi-close-1': 'emi-day2-{s}',  # day 2, the morning brief, closed on her
    'day2-{s}/office-emi-1': 'emi-day2-line-{s}',
}
os.makedirs(D, exist_ok=True)
for size in ('1366x860', '390x844'):
    for src, dst in PICKS.items():
        p = f'{S}/{src.format(s=size)}.jpg'
        if os.path.exists(p):
            Image.open(p).save(f'{D}/{dst.format(s=size)}.webp', quality=82, method=6)
            print('wrote', dst.format(s=size))
        else:
            print('missing', p)
