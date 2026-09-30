"""kenji-noprop-1: cut out every arm repaint, carry it into Kenji's three picked faces, frame for the game, make the sheets.

The cut-out is kenji-expressions-1's h4 cut (art/production/PC/kenji-expr1/h4-refined.png, desk things cleared) everywhere
outside ARM; inside ARM it is a new cut of the repaint (BiRefNet-HR matting, then tools/matte_refine.py), joined through
ARM grown by 10 px with a 3 px feather. The three faces are then swapped in exactly as kenji-expressions-1/post.py does (grin g0-h4 is
h4's own face, neutral nk-d80-1, sheepish s3k-d80-1), so the three portraits match pixel for pixel outside the face
polygon, and the framing (BOX, FACE.kenji) is unchanged.

Run: python3 post.py            cut, frame and sheet every attempt in prompts.json
     python3 post.py --install <attempt>   write the game portraits and art/approved/kenji/ from that attempt
(re-executes itself in ~/ai/rmbg/rembg, which has PIL, numpy and scipy)"""
import os, sys, json, subprocess, shutil
HOME = os.path.expanduser('~')
PY = os.path.join(HOME, 'ai/rmbg/rembg/bin/python')
if os.path.realpath(sys.executable) != os.path.realpath(PY):
    os.execv(PY, [PY] + sys.argv)
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = os.path.dirname(subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                               text=True).strip())
import importlib.util


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


# kenji-expressions-1's helpers (place, face_swap, base_cut) read the expression renders from the main checkout
EX = _load('kenji_expr_post', os.path.join(MAIN, 'art/candidates/portraits/kenji-expressions-1/post.py'))
ARM = [(0, 370), (190, 370), (185, 470), (172, 560), (168, 700), (200, 735), (250, 730), (255, 850), (250, 1000),
       (260, 1152), (0, 1152)]   # = gen.ARM (gen imports comfy, which this venv lacks)
RAW = os.path.join(MAIN, 'art/production/PC/kenji-noprop1')
EXRAW = os.path.join(MAIN, 'art/production/PC/kenji-expr1')
BASE = os.path.join(MAIN, 'art/production/PC/kenji4/kenji3-h4-bedhead-761.png')
OUT = os.path.join(MAIN, 'art/candidates/portraits/kenji-noprop-1')       # webps: git-ignored, served from main
FACES = {'grin': None, 'neutral': 'nk-d80-1', 'sheepish': 's3k-d80-1'}
PEN_POT = (0, 780, 50, 1152)     # kenji-expressions-1's CLEAR box left of him; other CLEAR boxes are below the game crop
BGREY, KEY = (219, 218, 202), 16   # h4's background at (30, 450)
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)
DARK = (18, 20, 28)


def cut(name):
    """New cut of one repaint (cached in RAW/cut/)."""
    src = os.path.join(RAW, f'kenji-{name}.png')
    model = os.path.join(RAW, 'cut', f'kenji-{name}.png')
    ref = os.path.join(RAW, f'kenji-{name}-refined.png')
    if not os.path.exists(model):
        subprocess.check_call(['python3', os.path.join(MAIN, 'tools/rmbg_local.py'), '--method', 'birefnet-hr-matting', src,
                               '--out', os.path.join(RAW, 'cut')])
    if not os.path.exists(ref):
        subprocess.check_call([PY, os.path.join(MAIN, 'tools/matte_refine.py'), src, model, ref])
    return Image.open(ref).convert('RGBA')


def base_cut(name):
    old = EX.base_cut()                                    # h4's cut, desk things cleared
    new = np.asarray(cut(name)).copy()
    x0, y0, x1, y1 = PEN_POT
    new[y0:y1, x0:x1, 3] = 0
    # the matting model fills in the small enclosed gap between the hanging arm and his belly; key it out: pixels of the
    # repaint within KEY of h4's background grey, below y 1000 (above it the grey is shirt shading on his belly edge and the white sleeve)
    src = np.asarray(Image.open(os.path.join(RAW, f'kenji-{name}.png')).convert('RGB')).astype(np.float64)
    near = np.linalg.norm(src - np.array(BGREY), axis=-1) < KEY
    am = Image.new('L', old.size, 0)
    ImageDraw.Draw(am).polygon(ARM, fill=255)
    gap = ndimage.binary_opening(near & (np.asarray(am.filter(ImageFilter.MaxFilter(21))) > 0), iterations=2)   # ARM + the join band
    gap[:1000] = False
    gap = ndimage.binary_dilation(gap, iterations=2)   # and its light anti-aliased rim
    new[..., 3] = np.where(gap, 0, new[..., 3])
    m = Image.new('L', old.size, 0)
    ImageDraw.Draw(m).polygon(ARM, fill=255)
    # join 10 px outside ARM, where the repaint is h4's own pixels and both mattes agree (a join on ARM's edge mixed h4's
    # shirt with the new gap between arm and belly and left a light streak there)
    w = np.asarray(m.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.GaussianBlur(3))).astype(np.float64)[..., None] / 255
    o = np.asarray(old).astype(np.float64)
    return Image.fromarray(np.clip(o * (1 - w) + new * w + 0.5, 0, 255).astype(np.uint8), 'RGBA')


def faces(bc):
    return {e: bc if src is None else EX.face_swap(bc, os.path.join(EXRAW, f'kenji-{src}.png')) for e, src in FACES.items()}


def over(img, bg=DARK):
    b = Image.new('RGB', img.size, bg)
    b.paste(img, (0, 0), img)
    return b


def label(im, text, dark=True):
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, im.width, 28), fill=(0, 0, 0) if dark else (240, 240, 240))
    d.text((8, 4), text, fill=(255, 255, 255) if dark else (20, 20, 20), font=FONT)
    return im


def game_now():
    return {e: Image.open(os.path.join(MAIN, f'game3d/assets/portraits/kenji-{e}.webp')).convert('RGBA') for e in FACES}


def main():
    os.makedirs(OUT, exist_ok=True)
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    names = list(log)
    before = Image.open(BASE).convert('RGB')
    arm_box = (0, 350, 520, 1152)
    tiles, framed = [], []
    for n in names:
        bc = base_cut(n)
        bc.save(os.path.join(RAW, f'kenji-{n}-cut-full.png'))
        f = faces(bc)
        for e, im in f.items():
            EX.place(im).save(os.path.join(RAW, f'kenji-{n}-{e}-597.png'))
        fin = EX.place(f['neutral'])
        fin.save(os.path.join(OUT, f'kenji-{n}.webp'), 'WEBP', quality=90, method=6)
        framed.append((n, fin))
        src = Image.open(os.path.join(RAW, f'kenji-{n}.png')).convert('RGB')
        tiles.append((n, src.crop(arm_box)))
        # per attempt: before | after, framed at game size (neutral face)
        pair = Image.new('RGB', (597 * 2 + 12, 768), DARK)
        pair.paste(over(game_now()['neutral']), (0, 0))
        pair.paste(over(fin), (597 + 12, 0))
        label(pair, f'in the game now                     {n}')
        pair.save(os.path.join(OUT, f'pair-{n}.webp'), 'WEBP', quality=90)
        # the arm close up from the full-size render: h4 | attempt
        z = Image.new('RGB', (520 * 2 + 12, 802), DARK)
        z.paste(before.crop(arm_box), (0, 0))
        z.paste(src.crop(arm_box), (532, 0))
        label(z, f'arm: h4 | {n}')
        z.save(os.path.join(OUT, f'arm-{n}.webp'), 'WEBP', quality=90)
    # every attempt in order, h4 first: arm close-ups, and the framed neutral on the game's dark colour
    items = [('h4 (before)', before.crop(arm_box))] + tiles
    cols, tw, th = 4, 390, 602
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 30)), (245, 245, 245))
    d = ImageDraw.Draw(sheet)
    for i, (n, t) in enumerate(items):
        x, y = i % cols, i // cols
        sheet.paste(t.resize((tw, th), Image.LANCZOS), (x * tw, y * (th + 30) + 30))
        d.text((x * tw + 6, y * (th + 30) + 5), f'{i + 1}. {n}', fill=(20, 20, 20), font=FONT)
    sheet.save(os.path.join(OUT, 'all-attempts-arm.webp'), 'WEBP', quality=88)
    items = [('in the game now', game_now()['neutral'])] + framed
    game = Image.new('RGB', (cols * 300, rows * (386 + 30)), DARK)
    d = ImageDraw.Draw(game)
    for i, (n, fin) in enumerate(items):
        x, y = i % cols, i // cols
        game.paste(over(fin).resize((300, 386), Image.LANCZOS), (x * 300, y * 416 + 30))
        d.text((x * 300 + 6, y * 416 + 5), f'{i + 1}. {n}', fill=(230, 230, 230), font=FONT)
    game.save(os.path.join(OUT, 'all-attempts-framed.webp'), 'WEBP', quality=88)
    print(len(names), 'attempts ->', OUT)


def install(n):
    bc = Image.open(os.path.join(RAW, f'kenji-{n}-cut-full.png')).convert('RGBA')
    f = faces(bc)
    now = game_now()
    trio_b, trio_a = Image.new('RGB', (597 * 3, 768), DARK), Image.new('RGB', (597 * 3, 768), DARK)
    approved = {'grin': 'kenji-g0-h4', 'neutral': 'kenji-nk-d80-1', 'sheepish': 'kenji-s3k-d80-1'}
    frames = {}
    for i, (e, im) in enumerate(f.items()):
        fin = EX.place(im)
        frames[e] = np.asarray(fin)
        trio_b.paste(over(now[e]), (i * 597, 0))
        trio_a.paste(over(fin), (i * 597, 0))
        for p in (os.path.join(MAIN, f'game3d/assets/portraits/kenji-{e}.webp'),
                  os.path.join(MAIN, f'art/approved/kenji/{approved[e]}.webp')):
            if os.path.islink(p):
                os.unlink(p)
            fin.save(p, 'WEBP', quality=90, method=6)
    # the three must differ only inside the face polygon (scaled onto the canvas)
    diff = np.any(frames['grin'] != frames['neutral'], -1) | np.any(frames['grin'] != frames['sheepish'], -1)
    ys, xs = np.nonzero(diff)
    print('expressions differ only in box x', xs.min(), xs.max(), 'y', ys.min(), ys.max())
    ba = Image.new('RGB', (597 * 3, 768 * 2 + 12), DARK)
    ba.paste(label(trio_b, 'before: grin | neutral | sheepish'), (0, 0))
    ba.paste(label(trio_a, f'after ({n}): grin | neutral | sheepish'), (0, 780))
    ba.save(os.path.join(OUT, 'before-after.webp'), 'WEBP', quality=90)
    print('installed', n)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--install']:
        install(sys.argv[2])
    else:
        main()
