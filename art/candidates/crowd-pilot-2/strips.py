"""Frame strips from game-walk.mjs's crops (Review crowd-pilot-2): each person's walk and run, frame by frame left to
right (0.1 s of game time apart), every crop scaled to one height and labelled with the game time and state.
  python3 art/candidates/crowd-pilot-2/strips.py <shots dir> <out dir> [height=260]
Writes <out>/<id>-<walk|run>.png for every <id>-<mode>/ folder in the shots dir.
"""
import json, os, sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
H = int(sys.argv[3]) if len(sys.argv) > 3 else 260
os.makedirs(out, exist_ok=True)
for d in sorted(os.listdir(src)):
    p = os.path.join(src, d)
    if not os.path.isdir(p) or not os.path.exists(f'{p}/boxes.json'):
        continue
    boxes = json.load(open(f'{p}/boxes.json'))
    tiles = []
    for i, b in enumerate(boxes):
        im = Image.open(f'{p}/frame-{i:02d}.png').convert('RGB')
        im = im.resize((round(im.width * H / im.height), H))
        tiles.append((im, f"{b['t']:.1f}s {b['state']}"))
    w = sum(t[0].width for t in tiles)
    strip = Image.new('RGB', (w, H + 20), 'white')
    dr = ImageDraw.Draw(strip)
    x = 0
    for im, lab in tiles:
        strip.paste(im, (x, 20))
        dr.text((x + 4, 4), lab, fill='black')
        x += im.width
    strip.save(f'{out}/{d}.png')
    print(f'{out}/{d}.png', strip.size)
