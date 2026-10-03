"""rei-body-1: the cast lineup (cast-faces-1's placer: game3d/js/ui/portraits.js FACE, same face height, chins on one
line, cut 2.25 face heights below the chin) with Rei as installed, every extension attempt, and the picked render
before the extension (rei-portrait-1's game canvas) for comparison.

Writes into bible/shots/rei-body-1/:
  lineup-all.webp     the cast, Rei before (chest), Rei installed (b-s11), then every attempt in order
  lineup-<id>.webp    the cast with that attempt in Rei's place
  <id>.webp           the attempt's game-size cut-out
Run: ~/ai/rmbg/rembg/bin/python lineup.py"""
import os, sys, shutil
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'art/candidates/portraits/cast-faces-1'))
import lineup as L

OUT = os.path.join(ROOT, 'bible/shots/rei-body-1')
IDS = [f'{j}-s{s}' for j in 'ab' for s in (11, 12, 13)]
CAST = ['mio', 'eric', 'kenji', 'emi', 'aoi', 'guard', 'mori', 'kuroda', 'kuro']
BEFORE = os.path.join(ROOT, 'art/candidates/portraits/rei-portrait-1/rei-i65-2102-game.webp')


def main():
    os.makedirs(OUT, exist_ok=True)
    t = L.face_table()
    orig = L.placed

    def placed(who, face, table):
        if who == 'rei' and face == 'before':
            # rei-portrait-1's canvas: face 169 px, chin at y 336, centred at x 300
            im = Image.open(BEFORE).convert('RGBA')
            s = L.F / 169
            return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS), 300 * s, 336 * s
        if who == 'rei' and face != 'neutral':
            W, H, f, _ = table['rei']
            s = L.F / (f[3] - f[1])
            im = Image.open(os.path.join(HERE, f'{face}-game.webp')).convert('RGBA')
            return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS), (f[0] + f[2]) / 2 * s, f[3] * s
        return orig(who, face, table)
    L.placed = placed
    names = {**L.NAME, 'mio': 'Mio'}
    row = [(w, 'neutral', names[w]) for w in CAST]
    L.strip(row + [('rei', 'before', 'Rei before'), ('rei', 'neutral', 'Rei installed')] + [('rei', i, i) for i in IDS], t).save(
        os.path.join(OUT, 'lineup-all.webp'), 'WEBP', quality=90)
    for i in IDS:
        L.strip(row + [('rei', i, f'Rei {i}')], t).save(os.path.join(OUT, f'lineup-{i}.webp'), 'WEBP', quality=90)
        shutil.copy(os.path.join(HERE, f'{i}-game.webp'), os.path.join(OUT, f'{i}.webp'))


if __name__ == '__main__':
    main()
