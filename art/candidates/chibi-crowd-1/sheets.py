"""Sheets for reviews/chibi-crowd-1 (run with ~/ai/sd/venv/bin/python), as the cast rounds' sheets.py. Everything is
written to the main checkout's art/parts/chibi-crowd-1/ (git-ignored):

  sheets.py inputs     inputs.webp: Jørgen's picture, then every input picture in the order made, by base
  sheets.py models     models.webp: per base the input sent to Meshy, then the model front, left 3/4, left side, back
                       and face (Blender, the cast rounds' camera and light)
  sheets.py variants <shots dir>   variants.webp: per base its five colour variants in the game, front and back
                       (game3d/tools/chibi-crowd-shots.mjs)
"""
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/characters/parts'))
from sheet import cell          # noqa: E402
from compare import grid        # noqa: E402

MAIN = '/home/jorgen/repo/japanese'
ART = f'{MAIN}/art/parts/chibi-crowd-1'
REF = f'{MAIN}/art/parts/chibi-meshy/inputs/dressed.png'
HERE = os.path.dirname(os.path.abspath(__file__))
BASES = ('suit', 'shirt', 'blouse', 'cardigan', 'polo', 'hoodie', 'apron', 'dock')
SIDE = {'suit': 'his', 'shirt': 'his', 'blouse': 'her', 'cardigan': 'her', 'polo': 'his', 'hoodie': 'her',
        'apron': 'her', 'dock': 'his'}
ATT = json.load(open(os.path.join(HERE, 'attempts.json')))


def inputs():
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    used = set(ATT.values())
    cells = [cell(Image.open(REF), 'Jørgen\'s picture (image 1)')]
    for b in BASES:
        for e in log:
            if e['who'] == b:
                cells.append(cell(Image.open(f'{ART}/inputs/{e["name"]}.png'),
                                  e['name'] + (' (to Meshy)' if e['name'] in used else '')))
    grid(cells, 7, f'{ART}/inputs.webp', 'Every input picture in the order made (FLUX.2 Klein, local), by base')


def models():
    cells = []
    for b in BASES:
        a = f'{b}-1'
        s = SIDE[b]
        cells.append(cell(Image.open(f'{ART}/inputs/{ATT[a]}.png'), f'{a}: input {ATT[a]}'))
        for v, lab in (('front', 'front'), ('l45', f'{s} left 3/4'), ('l90', f'{s} left side'), ('back', 'back'),
                       ('face', 'face')):
            cells.append(cell(Image.open(f'{ART}/{a}/renders/{v}.png'), f'{a}: {lab}'))
    grid(cells, 6, f'{ART}/models.webp', 'The eight Meshy models beside their input pictures (Blender, as the cast rounds)')


def variants(shots):
    cells = []
    for b in BASES:
        for side in ('', '-back'):
            im = Image.open(f'{shots}/variants-{b}{side}.png').convert('RGB')
            w, h = im.size
            im = im.crop((int(w * 0.06), int(h * 0.12), int(w * 0.94), int(h * 0.92)))
            c = Image.new('RGB', (im.width, im.height + 40), (236, 238, 241))
            c.paste(im, (0, 40))
            from sheet import font
            from PIL import ImageDraw
            ImageDraw.Draw(c).text((12, 8), f'gen-{b}: variants 0 to 4, ' + ('front' if not side else 'from behind'),
                                   fill=(20, 25, 30), font=font(24))
            cells.append(c)
    cw = max(c.width for c in cells)
    rows = [cells[i:i + 2] for i in range(0, len(cells), 2)]
    rh = [max(c.height for c in r) for r in rows]
    sh = Image.new('RGB', (cw * 2, sum(rh)), (236, 238, 241))
    y = 0
    for r, h in zip(rows, rh):
        for j, c in enumerate(r):
            sh.paste(c, (j * cw, y))
        y += h
    sh.save(f'{ART}/variants.webp', quality=88)
    print(f'{ART}/variants.webp')


if __name__ == '__main__':
    {'inputs': inputs, 'models': models, 'variants': lambda: variants(sys.argv[2])}[sys.argv[1]]()
