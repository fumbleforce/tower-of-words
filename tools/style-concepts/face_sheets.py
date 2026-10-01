# Review sheets for the char-face round (claude-facetface), on top of sheets.py's per-attempt sheets.
#   python3 tools/style-concepts/face_sheets.py faces <attempt> [label]  the face close-ups beside the portraits
#   python3 tools/style-concepts/face_sheets.py all                      every attempt's faces, before first
#   python3 tools/style-concepts/face_sheets.py gen <job> <title>              every image of a face_gen.py job
#   python3 tools/style-concepts/face_sheets.py series <name> <title> <label>=<dir> ...
#                                                                        levels side by side at the game camera
# Everything is written next to the renders, in the main checkout's art/parts/style-concepts/ (git-ignored).
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheets import BG, font, out_root  # noqa: E402

ROOT = out_root()
MAIN = os.path.dirname(os.path.dirname(os.path.dirname(ROOT)))
FF = os.path.join(ROOT, 'claude-facetface')
EXPRS = {'mio': ('neutral', 'smile'), 'eric': ('neutral', 'surprised')}


def load(p, crop=None):
    im = Image.open(p).convert('RGBA')
    bg = Image.new('RGBA', im.size, BG + (255,))
    bg.alpha_composite(im)
    im = bg.convert('RGB')
    return im.crop(crop) if crop else im


def portrait(ch):
    return load(os.path.join(MAIN, f'game3d/assets/portraits/{ch}-neutral.webp'))


def grid(rows, cell, title, gap=34):
    f, ft = font(22), font(30)
    w, h = cell
    cols = max(len(r) for r in rows)
    top = 56
    sheet = Image.new('RGB', (cols * w, top + len(rows) * (h + gap)), (250, 250, 250))
    d = ImageDraw.Draw(sheet)
    d.text((14, 12), title, fill=(30, 30, 30), font=ft)
    for ri, r in enumerate(rows):
        for ci, cell_ in enumerate(r):
            if cell_ is None:
                continue
            cap, im = cell_
            x, y = ci * w, top + ri * (h + gap)
            k = min((w - 8) / im.width, (h - 8) / im.height)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            sheet.paste(im, (x + (w - im.width) // 2, y + gap + (h - im.height) // 2))
            d.text((x + 8, y + 6), cap, fill=(40, 40, 40), font=f)
    return sheet


def faces(attempt, label=None):
    base = os.path.join(FF, attempt)
    rd = os.path.join(base, 'renders')
    rows = []
    for ch, exprs in EXPRS.items():
        r = [(f'{ch} portrait (approved)', portrait(ch))]
        for ex in exprs:
            for tag, name in (('face', 'front'), ('face3q', 'three-quarter')):
                p = os.path.join(rd, f'x-{ch}-{tag}-{ex}.png')
                if os.path.exists(p):
                    r.append((f'{ch} {ex}, {name}', load(p)))
        rows.append(r)
    s = grid(rows, (520, 520), f'{label or "claude-facetface " + attempt}: faces beside the portrait')
    s.save(os.path.join(base, 'sheet-faces.webp'), quality=88)
    print('SHEET', os.path.join(base, 'sheet-faces.webp'))
    return s


def all_faces(attempts):
    rows = [[('mio portrait (approved)', portrait('mio')), ('eric portrait (approved)', portrait('eric'))]]
    before = os.path.join(ROOT, 'claude-facet/attempt-04/renders')
    rows.append([(f'before: claude-facet attempt-04, {ch}', load(os.path.join(before, f'{ch}-face.png')))
                 for ch in ('mio', 'eric')])
    for a, note in attempts:
        rd = os.path.join(FF, a, 'renders')
        r = []
        for ch in ('mio', 'eric'):
            p = os.path.join(rd, f'x-{ch}-face-neutral.png')
            if os.path.exists(p):
                r.append((f'{a} ({note}), {ch}', load(p)))
        if r:
            rows.append(r)
    s = grid(rows, (560, 560), 'Faces, every attempt in order (front, neutral)')
    p = os.path.join(FF, 'faces-all.webp')
    s.save(p, quality=86)
    print('SHEET', p)


def series(name, title, levels):
    """levels: [(label, attempt dir)] -> columns; rows: the game crops and the pair."""
    shots = [('forecourt, desktop (crop)', 'game-forecourt-desk-crop'), ('office, desktop (crop)', 'game-office-desk-crop'),
             ('forecourt, phone (crop)', 'game-forecourt-phone-crop'), ('office, phone (crop)', 'game-office-phone-crop'),
             ('front', 'pair'), ('three-quarter', 'pair-3q')]
    rows = []
    for cap, n in shots:
        r = []
        for lab, d in levels:
            p = os.path.join(ROOT, d, 'renders', n + '.png')
            r.append((f'{lab}: {cap}', load(p)) if os.path.exists(p) else None)
        rows.append(r)
    s = grid(rows, (640, 480), title)
    p = os.path.join(FF, f'series-{name}.webp')
    s.save(p, quality=86)
    print('SHEET', p)


def gen(job, title):
    """Every image of one face_gen.py job, in name order, captioned with its file name."""
    import json
    d = os.path.join(FF, 'gen', job)
    log = json.load(open(os.path.join(d, 'prompts.json')))
    names = sorted(n for n in log)
    ims = [(n, load(os.path.join(d, n + '.png'))) for n in names]
    cols = 4
    rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    s = grid(rows, (520, 520 if job != 'ref' else 760), title)
    p = os.path.join(d, 'sheet.webp')
    s.save(p, quality=86)
    print('SHEET', p)


def main():
    a = sys.argv[1:]
    if a[0] == 'faces':
        faces(a[1], a[2] if len(a) > 2 else None)
    elif a[0] == 'all':
        import json
        notes = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'face_attempts.json')))
        all_faces([(x['attempt'], x['short']) for x in notes['attempts']])
    elif a[0] == 'gen':
        gen(a[1], a[2])
    elif a[0] == 'series':
        series(a[1], a[2], [tuple(x.split('=', 1)) for x in a[3:]])


if __name__ == '__main__':
    main()
