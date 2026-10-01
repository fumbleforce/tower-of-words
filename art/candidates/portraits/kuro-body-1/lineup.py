"""kuro-body-1: the cast lineup of showcase/cast-faces-1 redone with each Kuro candidate, placed the way the game places
them (game3d/js/ui/portraits.js FACE: same face height, chins on one line, cut 2.25 face heights below the chin).

Writes into bible/shots/kuro-body-1/ (a synced root, so the Review item keeps them after this worktree is gone):
  lineup-all.webp       the cast, Kuro as installed, then every attempt in order
  lineup-<id>.webp      the cast with that attempt in Kuro's place
  <id>.webp             the attempt's cut-out (what would be installed)
Run: ~/ai/rmbg/rembg/bin/python lineup.py"""
import os, sys, json, shutil
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(WT, 'art/candidates/portraits/cast-faces-1'))
import lineup as L   # cast-faces-1's placing and strip code

OUT = os.path.join(WT, 'bible/shots/kuro-body-1')
IDS = [f'{j}-s{s}' for j in 'abc' for s in (11, 12, 13)]
CAST = ['mio', 'eric', 'kenji', 'emi', 'aoi', 'guard', 'mori', 'kuroda']


def main():
    os.makedirs(OUT, exist_ok=True)
    t = L.face_table()
    cand_dir = os.path.join(OUT, '_p')
    os.makedirs(cand_dir, exist_ok=True)
    # serve the candidates to cast-faces-1's placer as extra "faces" of kuro, with their own height
    orig_placed = L.placed

    def placed(who, face, table):
        if who == 'kuro' and face != 'neutral':
            im = Image.open(os.path.join(HERE, f'{face}-cut.webp')).convert('RGBA')
            W, H, f = table['kuro']
            s = L.F / (f[3] - f[1])
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
            return im, (f[0] + f[2]) / 2 * s, f[3] * s
        return orig_placed(who, face, table)
    L.placed = placed
    names = {**L.NAME, 'kuro': 'Kuro'}
    row = [(w, 'neutral', names[w]) for w in CAST]
    L.strip(row + [('kuro', 'neutral', 'Kuro (installed)')] + [('kuro', i, i) for i in IDS], t).save(
        os.path.join(OUT, 'lineup-all.webp'), 'WEBP', quality=90)
    for i in IDS:
        L.strip(row + [('kuro', i, f'Kuro {i}')], t).save(os.path.join(OUT, f'lineup-{i}.webp'), 'WEBP', quality=90)
        shutil.copy(os.path.join(HERE, f'{i}-cut.webp'), os.path.join(OUT, f'{i}.webp'))
    os.rmdir(cand_dir)


if __name__ == '__main__':
    main()
