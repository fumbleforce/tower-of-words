"""rei-expressions-1: webp copies, cut-outs, game-size files and the contact sheets for every render in prompts.json.

The repaint only touches pixels inside gen.POLY, which is all opaque face, so each cut-out is rei-body-1's b-s11 cut-out
(art/candidates/portraits/rei-body-1/b-s11-cut.webp, the installed matte) with the colour inside the polygon taken from the
render (3 px feather, the same mask gen.py pasted with). The game file is that cut-out scaled by rei-body-1's 0.5951, the
size of game3d/assets/portraits/rei-neutral.webp (533x838).

Writes here: <name>.webp (full render), <name>-cut.webp, <name>-game.webp, faces-sheet.webp (every attempt's face in order
beside the neutral), lineup-sheet.webp (game size, the neutral first).
Run: ~/ai/sd/venv/bin/python post.py"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen
from PIL import Image, ImageDraw, ImageFilter

ROOT = gen.ROOT
CUT = os.path.join(ROOT, 'art/candidates/portraits/rei-body-1/b-s11-cut.webp')
NEUTRAL = os.path.join(ROOT, 'game3d/assets/portraits/rei-neutral.webp')
GAME = (533, 838)
REJECTED = {'s-d70-1', 's-d70-2', 's-d70-3'}  # pointed fangs (verdicts in the dashboard)


def dash_numbers():
    """Store each render's dashboard number (#n, of its logged 1024 crop) in prompts.json."""
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import verdict
    agentlog, store = verdict._imagegen()
    rows = store.log_read()
    L = json.load(open(gen.LOG))
    for n in L:
        rel = agentlog.rel_path(os.path.join(gen.RAW, f'rei-{n}-crop1024.png'))
        hit = [r for r in rows if r.get('source') == 'agent' and r.get('out_path') == rel and not r.get('deleted')]
        if hit:
            L[n]['dash_n'] = sorted(hit, key=lambda r: r.get('at') or '')[-1]['n']
            L[n]['dash_image'] = rel
    json.dump(L, open(gen.LOG, 'w'), indent=1, ensure_ascii=False)


def names():
    return list(json.load(open(gen.LOG)).keys())


def make(name):
    src = Image.open(os.path.join(gen.RAW, f'rei-{name}.png')).convert('RGB')
    src.save(os.path.join(HERE, f'{name}.webp'), 'WEBP', quality=92)
    cut = Image.open(CUT).convert('RGBA')
    pm = Image.new('L', src.size, 0)
    ImageDraw.Draw(pm).polygon(gen.POLY, fill=255)
    pm = pm.filter(ImageFilter.GaussianBlur(3))
    rgb = Image.composite(src, cut.convert('RGB'), pm)
    out = rgb.convert('RGBA')
    out.putalpha(cut.getchannel('A'))
    out.save(os.path.join(HERE, f'{name}-cut.webp'), 'WEBP', lossless=True)
    out.resize(GAME, Image.LANCZOS).save(os.path.join(HERE, f'{name}-game.webp'), 'WEBP', lossless=True)


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, im.width, 22], fill=(255, 255, 255))
    d.text((6, 5), text, fill=(0, 0, 0))
    return im


def sheets(ns):
    L = json.load(open(gen.LOG))
    box = (250, 340, 570, 660)
    tiles = [label(Image.open(os.path.join(ROOT, 'art/production/PC/rei-body-1/b-s11.png')).convert('RGB').crop(box).resize((320, 320)), 'neutral (installed)')]
    for n in ns:
        tiles.append(label(Image.open(os.path.join(HERE, f'{n}.webp')).convert('RGB').crop(box).resize((320, 320)),
                           f"{n}  {L[n]['expression']}  #{L[n].get('dash_n', '?')}" + ('  REJECTED: fangs' if n in REJECTED else '')))
    cols = 4
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 324, rows * 324), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 324, (i // cols) * 324))
    sheet.save(os.path.join(HERE, 'faces-sheet.webp'), 'WEBP', quality=90)
    gtiles = [(Image.open(NEUTRAL).convert('RGBA'), 'neutral')] + [(Image.open(os.path.join(HERE, f'{n}-game.webp')), n) for n in ns]
    cols = 5
    rows = (len(gtiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * GAME[0] // 2, rows * (GAME[1] // 2 + 24)), (200, 204, 210))
    for i, (g, t) in enumerate(gtiles):
        x, y = (i % cols) * GAME[0] // 2, (i // cols) * (GAME[1] // 2 + 24)
        sheet.paste(g.resize((GAME[0] // 2, GAME[1] // 2)), (x, y + 24), g.resize((GAME[0] // 2, GAME[1] // 2)))
        ImageDraw.Draw(sheet).text((x + 6, y + 6), t, fill=(0, 0, 0))
    sheet.save(os.path.join(HERE, 'lineup-sheet.webp'), 'WEBP', quality=90)


if __name__ == '__main__':
    ns = sys.argv[1:] or names()
    dash_numbers()
    for n in ns:
        make(n)
    sheets(names())
    print('done', len(ns))
