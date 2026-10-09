"""expressions-kuro-mio-1: webp copies, game files and contact sheets for every render in prompts.json.

The repaint only touches pixels inside gen's face polygon, which is all opaque face, so each game file is the installed
neutral (game3d/assets/portraits/<who>-neutral.webp: colour and matte) with the colour inside the polygon taken from the
render scaled to game size (Kuro 1096x1824 -> 630x1048, Mio 1008x1296 -> 597x768), through the same polygon feathered.

Writes here: <name>.webp (full render), <name>-game.webp, faces-sheet.webp (every attempt's face in order beside the
neutral, per person), lineup-sheet.webp (game size, each neutral first).
Run: ~/ai/sd/venv/bin/python post.py"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen
from PIL import Image, ImageDraw, ImageFilter

ROOT = gen.ROOT
NEUTRAL = {w: os.path.join(ROOT, f'game3d/assets/portraits/{w}-neutral.webp') for w in gen.PEOPLE}
REJECTED = {}  # name -> one-line reason (verdicts in the dashboard)
if os.path.exists(os.path.join(HERE, 'rejected.json')):
    REJECTED = json.load(open(os.path.join(HERE, 'rejected.json')))


def dash_numbers():
    """Store each render's dashboard number (#n, of its logged 1024 crop) in prompts.json."""
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import verdict
    agentlog, store = verdict._imagegen()
    rows = store.log_read()
    L = json.load(open(gen.LOG))
    for n, e in L.items():
        rel = agentlog.rel_path(os.path.join(gen.RAW, f"{e['who']}-{n}-crop1024.png"))
        hit = [r for r in rows if r.get('source') == 'agent' and r.get('out_path') == rel and not r.get('deleted')]
        if hit:
            e['dash_n'] = sorted(hit, key=lambda r: r.get('at') or '')[-1]['n']
            e['dash_image'] = rel
    json.dump(L, open(gen.LOG, 'w'), indent=1, ensure_ascii=False)


def make(name, who):
    src = Image.open(os.path.join(gen.RAW, f'{name}.png')).convert('RGB')
    src.save(os.path.join(HERE, f'{name}.webp'), 'WEBP', quality=92)
    inst = Image.open(NEUTRAL[who]).convert('RGBA')
    k = inst.width / src.width
    pm = Image.new('L', src.size, 0)
    ImageDraw.Draw(pm).polygon(gen.PEOPLE[who]['poly'], fill=255)
    pm = pm.filter(ImageFilter.GaussianBlur(3)).resize(inst.size, Image.LANCZOS)
    rgb = Image.composite(src.resize(inst.size, Image.LANCZOS), inst.convert('RGB'), pm)
    out = rgb.convert('RGBA')
    out.putalpha(inst.getchannel('A'))
    out.save(os.path.join(HERE, f'{name}-game.webp'), 'WEBP', lossless=True)


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, im.width, 22], fill=(255, 255, 255))
    d.text((6, 5), text, fill=(180, 0, 0) if 'REJECTED' in text else (0, 0, 0))
    return im


def sheets(L):
    tiles = []
    for who in gen.PEOPLE:
        ns = [n for n in L if L[n]['who'] == who]
        if not ns:
            continue
        C = gen.PEOPLE[who]['crop']
        box = (C[0] - 20, C[1] - 20, C[2] + 20, C[3] + 20)
        tiles.append(label(Image.open(gen.PEOPLE[who]['base']).convert('RGB').crop(box).resize((320, 320)), f'{who} neutral (installed)'))
        for n in ns:
            dn = L[n].get('dash_n') or L.get(L[n].get('from', ''), {}).get('dash_n', '?')
            t = f"{n} {L[n]['expression']} #{dn}"
            if n in REJECTED:
                t += ' REJECTED'
            tiles.append(label(Image.open(os.path.join(HERE, f'{n}.webp')).convert('RGB').crop(box).resize((320, 320)), t))
    cols = 4
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 324, rows * 324), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 324, (i // cols) * 324))
    sheet.save(os.path.join(HERE, 'faces-sheet.webp'), 'WEBP', quality=90)
    g = []
    for who in gen.PEOPLE:
        ns = [n for n in L if L[n]['who'] == who]
        if ns:
            g += [(Image.open(NEUTRAL[who]).convert('RGBA'), f'{who} neutral')] + \
                 [(Image.open(os.path.join(HERE, f'{n}-game.webp')), n + (' REJECTED' if n in REJECTED else '')) for n in ns]
    TW, TH = 300, 500
    cols = 6
    rows = (len(g) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * TW, rows * (TH + 24)), (200, 204, 210))
    for i, (im, t) in enumerate(g):
        s = min(TW / im.width, TH / im.height)
        r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x, y = (i % cols) * TW, (i // cols) * (TH + 24)
        sheet.paste(r, (x + (TW - r.width) // 2, y + 24), r)
        ImageDraw.Draw(sheet).text((x + 6, y + 6), t, fill=(180, 0, 0) if 'REJECTED' in t else (0, 0, 0))
    sheet.save(os.path.join(HERE, 'lineup-sheet.webp'), 'WEBP', quality=90)


if __name__ == '__main__':
    dash_numbers()
    L = json.load(open(gen.LOG))
    for n in L:
        make(n, L[n]['who'])
    sheets(L)
    print('done', len(L))
