"""npc-base-1: cut out every attempt, frame it on the game's 597x768 portrait canvas, and make the review sheets.

Cut-out: BiRefNet-HR matting (tools/rmbg_local.py), then tools/matte_refine.py, as for Kenji and Eric.
Framing: Kenji's rule (kenji-expressions-1/post.py): the detected face box (imgutils) is scaled to 168 px high, its centre x
to 300 and its bottom to y 335, so every candidate shows the face at the same size and height as Kenji (168) and Mio (169).
Sheets, one per person: the approved neighbours (Eric, Mio, Kenji, Aoi as in the game), the portrait in the game now, then
every attempt in the order made, all on the game's dark colour at the same scale.

Run: python3 post.py   (re-executes itself in ~/ai/rmbg/rembg, which has PIL, numpy and scipy)"""
import os, sys, json, subprocess
HOME = os.path.expanduser('~')
PY = os.path.join(HOME, 'ai/rmbg/rembg/bin/python')
if os.path.realpath(sys.executable) != os.path.realpath(PY):
    os.execv(PY, [PY] + sys.argv)
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = os.path.join(ROOT, 'art/production/PC/npc-base-1')
W, H, FACE_H, CX, CHIN = 597, 768, 168, 300, 335
DARK = (18, 20, 28)
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)
GAME_ID = {'mori': 'mori', 'hamada': 'kuroda', 'guard': 'guard'}


def faces(paths):
    r = subprocess.run([os.path.join(HOME, 'ai/consist/.venv/bin/python'), os.path.join(ROOT, 'tools/imagegen/faces.py'), *paths],
                       capture_output=True, text=True, check=True)
    d = json.loads(r.stdout.strip().splitlines()[-1])
    return {p: max(b, key=lambda x: (x[2] - x[0]) * (x[3] - x[1])) if b else None for p, b in d.items()}


def cut(name):
    src = os.path.join(RAW, name + '.png')
    model = os.path.join(RAW, 'cut', name + '.png')
    ref = os.path.join(RAW, name + '-refined.png')
    if not os.path.exists(model):
        subprocess.check_call(['python3', os.path.join(ROOT, 'tools/rmbg_local.py'), '--method', 'birefnet-hr-matting', src,
                               '--out', os.path.join(RAW, 'cut')])
    if not os.path.exists(ref):
        subprocess.check_call([PY, os.path.join(ROOT, 'tools/matte_refine.py'), src, model, ref])
    return Image.open(ref).convert('RGBA')


def place(rgba, fb):
    s = FACE_H / (fb[3] - fb[1])
    L = (fb[0] + fb[2]) / 2 - CX / s
    T = fb[3] - CHIN / s
    pad = 400
    big = Image.new('RGBA', (rgba.width + 2 * pad, rgba.height + 2 * pad), (0, 0, 0, 0))
    big.paste(rgba, (pad, pad))
    box = (L + pad, T + pad, L + pad + W / s, T + pad + H / s)
    return big.convert('RGBa').resize((W, H), Image.LANCZOS, box=box).convert('RGBA'), [round(v, 1) for v in (L, T, L + W / s, T + H / s)]


def over(img):
    b = Image.new('RGB', img.size, DARK)
    b.paste(img, (0, 0), img)
    return b


def sheet(items, out, cols=5, tw=299, th=384):
    rows = (len(items) + cols - 1) // cols
    im = Image.new('RGB', (cols * tw, rows * (th + 30)), DARK)
    d = ImageDraw.Draw(im)
    for i, (label, t) in enumerate(items):
        x, y = (i % cols) * tw, (i // cols) * (th + 30)
        im.paste(over(t).resize((tw, th), Image.LANCZOS), (x, y + 30))
        d.text((x + 6, y + 6), label, fill=(235, 235, 235), font=FONT)
    im.save(out, 'WEBP', quality=88)


def main():
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    fbs = faces([os.path.join(RAW, n + '.png') for n in log])
    for n, e in log.items():
        fb = fbs[os.path.join(RAW, n + '.png')]
        c = cut(n)
        c.save(os.path.join(HERE, n + '-cut.webp'), 'WEBP', quality=90)
        if fb is None:
            print('no face', n)
            e['face_box'] = None
            continue
        fin, box = place(c, fb)
        fin.save(os.path.join(HERE, n + '-framed.webp'), 'WEBP', quality=90, method=6)
        e['face_box'], e['game_box'] = fb, box
    json.dump(log, open(os.path.join(HERE, 'prompts.json'), 'w'), indent=1, ensure_ascii=False)
    ref = [(f'{k} (approved)', Image.open(os.path.join(ROOT, f'game3d/assets/portraits/{k}-neutral.webp')).convert('RGBA'))
           for k in ('eric', 'mio', 'kenji', 'aoi')]
    for who in GAME_ID:
        names = [n for n, e in log.items() if e['who'] == who]
        now = ('in the game now', Image.open(os.path.join(ROOT, f'game3d/assets/portraits/{GAME_ID[who]}-neutral.webp')).convert('RGBA'))
        items = ref + [now] + [(f'{i + 1}. {n}', Image.open(os.path.join(HERE, n + '-framed.webp')).convert('RGBA'))
                               for i, n in enumerate(names) if os.path.exists(os.path.join(HERE, n + '-framed.webp'))]
        sheet(items, os.path.join(HERE, f'sheet-{who}.webp'))
    print('done')


if __name__ == '__main__':
    main()
