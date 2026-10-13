"""Contact sheets for carina-3: sheet.png (finals + extras, labelled), attempt sheets of all twelve for v1, v2, v3."""
import glob, sys, json
sys.path.insert(0, '.')
from pick import FINAL
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 17)
FB = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', 22)
R = json.load(open('results.json'))
W, H = 448, 576
def tile(path, title, sub, ok=None):
    t = Image.new('RGB', (W, H + 56), (22, 26, 30))
    t.paste(Image.open(path).convert('RGB').resize((W, H)), (0, 56))
    d = ImageDraw.Draw(t)
    d.text((8, 4), title, font=FB, fill=(245, 245, 245))
    d.text((8, 32), sub, font=F, fill=(120, 220, 140) if (ok or '').startswith('PASS') else (240, 170, 90))
    return t
def grid(tiles, cols, out):
    rows = (len(tiles) + cols - 1) // cols
    s = Image.new('RGB', (cols * W, rows * (H + 56)), (22, 26, 30))
    for i, t in enumerate(tiles): s.paste(t, ((i % cols) * W, (i // cols) * (H + 56)))
    s.save(out + '.png'); s.save(out + '.webp', quality=88)
EX = {(1,'2'):'PASS (head small, zoom 0.96)',(1,'3'):'DRIFT: hair cut at top edge',(12,'2'):'DRIFT: hair cut at top edge',(12,'3'):'DRIFT: gold ring artifact'}
tiles = []
for n, v in FINAL.items():
    f = glob.glob(f'carina3-{n:02d}-*-{v}.webp')[0]
    r = R[str(n)]
    tiles.append(tile(f, f"{n}. {r['name']}", r['mark'][:48], r['mark']))
for f in sorted(glob.glob('carina3-*-s[23].webp')):
    n = int(f.split('-')[1]); k = f.split('-s')[-1][0]
    m = EX[(n, k)]
    tiles.append(tile(f, f'{n}. extra seed {k}', m, m))
grid(tiles, 6, 'sheet')
for v, d in (('v1', 'attempt1'), ('v2', 'attempt2'), ('v3', '.')):
    fs = sorted(glob.glob(f'{d}/carina3-*-{v}.webp'))
    grid([tile(f, f"{i+1}. attempt {v[1]}", f.split('/')[-1][9:-5]) for i, f in enumerate(fs)], 6, f'attempt-{v}-sheet')
