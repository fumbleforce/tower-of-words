"""After the renders of rei-portrait-1 (gen.py): cut-outs, game-scale canvases and the two review sheets. CPU only.

  cut    tools/rmbg_local.py --method isnet-anime, then tools/matte_refine.py, on the i- and rf- renders (the t- renders
         are the rf- ones without the outpainted top, so they are not cut). Writes <render>-cut.webp next to each render.
  game   each cut-out on a 597x768 canvas at the cast's game scale: the face box (imgutils detect_faces, the detector the
         FACE boxes in game3d/js/ui/portraits.js came from) scaled to the median face height of Aoi, the guard, Kenji,
         Hamada, Mio, Emi and Mori (169 px), its chin at y 336 and centred at x 300, as Aoi's. Writes <render>-game.webp.
         A proposal for the game crop only; nothing goes into the game until Jørgen picks.
  sheet  sheet-attempts.webp: approved rei-after, then every render in the order it was made, labelled.
         sheet-game.webp: the approved cast portraits as the game shows them (same face size; Kuro at her 0.85), then
         each Rei game canvas, all on one dark background with the chin on one line.

Usage: ~/ai/consist/.venv/bin/python art/candidates/portraits/rei-portrait-1/post.py cut|game|sheet
"""
import os, sys, json, subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = os.path.join(ROOT, 'art/production/PC/rei-portrait-1')
RF = os.path.join(ROOT, 'art/production/RF')
CUT = os.path.join(RAW, 'cut')
REMBG = os.path.expanduser('~/ai/rmbg/rembg/bin/python')
SEEDS_T = (202, 2101, 2102, 2103, 2104, 2105)
ORDER = ([f'rei-t-{s}' for s in SEEDS_T] + [f'rei-i{d}-{s}' for d in (50, 65) for s in (2101, 2102)]
         + [f'rei-rf-{s}' for s in SEEDS_T])
CUTS = [n for n in ORDER if not n.startswith('rei-t-')]
GW, GH, FH, CHIN, CX = 597, 768, 169, 336, 300
PORT = os.path.join(ROOT, 'game3d/assets/portraits')
FONT = '/usr/share/fonts/TTF/DejaVuSans.ttf'


def raw_png(n):
    return os.path.join(RF, n + '-s301.png') if n.startswith('rei-rf-') else os.path.join(RAW, n + '.png')


def cut():
    os.makedirs(CUT, exist_ok=True)
    srcs = [raw_png(n) for n in CUTS]
    subprocess.run(['python3', os.path.join(ROOT, 'tools/rmbg_local.py'), '--method', 'isnet-anime',
                    *srcs, '--out', os.path.join(CUT, 'model')], check=True)
    for n, s in zip(CUTS, srcs):
        out = os.path.join(CUT, n + '-cut.png')
        subprocess.run([REMBG, os.path.join(ROOT, 'tools/matte_refine.py'), s, os.path.join(CUT, 'model', os.path.basename(s)), out],
                       check=True)
        Image.open(out).save(os.path.join(HERE, n + '-cut.webp'), lossless=False, quality=92)
        print('cut', n, flush=True)


def face(im):
    from imgutils.detect import detect_faces
    g = Image.new('RGB', im.size, (128, 128, 128))
    g.paste(im, mask=im.getchannel('A'))
    f = detect_faces(g)
    (x0, y0, x1, y1), _, _ = max(f, key=lambda r: r[2] * (r[0][2] - r[0][0]))
    return x0, y0, x1, y1


def game():
    log = {}
    for n in CUTS:
        im = Image.open(os.path.join(HERE, n + '-cut.webp')).convert('RGBA')
        x0, y0, x1, y1 = face(im)
        k = FH / (y1 - y0)
        s = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        c = Image.new('RGBA', (GW, GH), (0, 0, 0, 0))
        c.alpha_composite(s, (round(CX - (x0 + x1) / 2 * k), round(CHIN - y1 * k)))
        c.save(os.path.join(HERE, n + '-game.webp'), quality=92)
        log[n] = {'face_box': [round(v) for v in (x0, y0, x1, y1)], 'scale': round(k, 4)}
        print('game', n, log[n], flush=True)
    json.dump(log, open(os.path.join(HERE, 'game-canvas.json'), 'w'), indent=1)


def font(n):
    return ImageFont.truetype(FONT, n)


def sheet_attempts():
    names = ['approved: rei-after'] + ORDER
    W, H, T, C = 448, 576, 40, 6
    rows = -(-len(names) // C)
    img = Image.new('RGB', (W * C, (H + T) * rows), (24, 28, 34))
    d = ImageDraw.Draw(img)
    for i, n in enumerate(names):
        x, y = (i % C) * W, (i // C) * (H + T)
        p = os.path.join(ROOT, 'art/approved/rei/rei-after.webp') if i == 0 else os.path.join(HERE, n + '.webp')
        im = Image.open(p).convert('RGB')
        im.thumbnail((W - 8, H - 8))
        img.paste(im, (x + (W - im.width) // 2, y + T + (H - im.height) // 2))
        d.text((x + 8, y + 8), f'{i}. {n}' if i else n, fill=(235, 235, 235), font=font(22))
    img.save(os.path.join(HERE, 'sheet-attempts.webp'), quality=90)


def sheet_game():
    cast = [('mio', 1.0), ('kuro', 0.85), ('aoi', 1.0), ('emi', 1.0)]
    faces = {'mio': (192, 214, 361, 383), 'kuro': (254, 325, 452, 525), 'aoi': (219, 167, 381, 336), 'emi': (217, 168, 383, 337)}
    cells = []
    for who, size in cast:
        im = Image.open(os.path.join(PORT, f'{who}-neutral.webp')).convert('RGBA')
        x0, y0, x1, y1 = faces[who]
        cells.append((f'{who}-neutral (approved)', im, FH * size / (y1 - y0), (x0 + x1) / 2, y1))
    for n in CUTS:
        cells.append((n, Image.open(os.path.join(HERE, n + '-game.webp')).convert('RGBA'), 1.0, CX, CHIN))
    C, T = 7, 40
    rows = -(-len(cells) // C)
    img = Image.new('RGB', (GW * C, (GH + T) * rows), (34, 40, 56))
    d = ImageDraw.Draw(img)
    for i, (label, im, k, cx, chin) in enumerate(cells):
        x, y = (i % C) * GW, (i // C) * (GH + T)
        s = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        cell = Image.new('RGBA', (GW, GH), (34, 40, 56, 255))
        cell.alpha_composite(s, (round(CX - cx * k), round(CHIN - chin * k)))
        img.paste(cell.convert('RGB'), (x, y + T))
        d.text((x + 8, y + 8), label, fill=(235, 235, 235), font=font(22))
    img.save(os.path.join(HERE, 'sheet-game.webp'), quality=90)


if __name__ == '__main__':
    {'cut': cut, 'game': game, 'sheet': lambda: (sheet_attempts(), sheet_game())}[sys.argv[1]]()
