"""Comparison sheets for reviews/chibi-cast-meshy-2 (run with ~/ai/sd/venv/bin/python), as round 1's sheets.py.
Everything is written to the main checkout's art/parts/chibi-cast-meshy-2/ (git-ignored):

  sheets.py inputs     inputs-<who>.webp: his picture, the approved portrait, then every input picture in order
  sheets.py side       side-<who>.webp: the portrait, the input, then the model front, left 3/4, left side and back
  sheets.py faces      faces.webp: per person the portrait's face, the input's face and the model's face (front, 3/4)
"""
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/characters/parts'))
from sheet import cell          # noqa: E402
from compare import grid        # noqa: E402

MAIN = '/home/jorgen/repo/japanese'
ART = f'{MAIN}/art/parts/chibi-cast-meshy-2'
REF = f'{MAIN}/art/parts/chibi-meshy/inputs/dressed.png'
HERE = os.path.dirname(os.path.abspath(__file__))
WHO = ('mori', 'kenji', 'emi', 'guard', 'kuroda', 'aoi', 'rei')
NAME = {'mori': 'Mr. Mori', 'kenji': 'Kenji', 'emi': 'Emi', 'guard': 'Mr. Ishibashi (guard)', 'kuroda': 'Mr. Hamada',
        'aoi': 'Aoi', 'rei': 'Rei'}
SIDE = {'mori': 'his', 'kenji': 'his', 'emi': 'her', 'guard': 'his', 'kuroda': 'his', 'aoi': 'her', 'rei': 'her'}
# Meshy attempts in the order made: attempt -> input picture name (inputs/<name>.png)
ATT = json.load(open(os.path.join(HERE, 'attempts.json')))
# the face in each portrait (x, y, size) for the close-ups
FACE = {'mori': (150, 40, 300), 'kenji': (150, 40, 300), 'emi': (150, 40, 300), 'guard': (150, 40, 300),
        'kuroda': (150, 40, 300), 'aoi': (150, 40, 300), 'rei': (100, 170, 300)}


def portrait(w):
    p = f'{MAIN}/game3d/assets/portraits/{w}-neutral.webp' if w != 'rei' else f'{MAIN}/art/approved/rei/rei-after.webp'
    im = Image.open(p)
    if im.mode == 'RGBA':
        bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im); im = bg
    return im.convert('RGB')


def inputs():
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    used = set(ATT.values())
    for w in WHO:
        cells = [cell(Image.open(REF), 'Jørgen\'s picture (image 1)'), cell(portrait(w), 'approved portrait (image 2)')]
        for e in log:
            if e['who'] == w:
                cells.append(cell(Image.open(f'{ART}/inputs/{e["name"]}.png'), e['name'] + (' (to Meshy)' if e['name'] in used else '')))
                if e['name'] + '-flip' in used:
                    cells.append(cell(Image.open(f'{ART}/inputs/{e["name"]}-flip.png'), e['name'] + '-flip (mirrored, to Meshy)'))
        grid(cells, 5, f'{ART}/inputs-{w}.webp', f'{NAME[w]}: every input picture in the order made (FLUX.2 Klein, local)')


def side():
    for w in WHO:
        cells, s = [], SIDE[w]
        for a, pic in ATT.items():
            if a.rsplit('-', 1)[0] != w or not os.path.exists(f'{ART}/{a}/renders/front.png'): continue
            cells += [cell(portrait(w), 'approved portrait'), cell(Image.open(f'{ART}/inputs/{pic}.png'), f'{a}: input {pic}')]
            for v, lab in (('front', 'front'), ('l45', f'{s} left 3/4'), ('l90', f'{s} left side'), ('back', 'back')):
                cells.append(cell(Image.open(f'{ART}/{a}/renders/{v}.png'), f'{a}: {lab}'))
        if cells:
            grid(cells, 6, f'{ART}/side-{w}.webp', f'{NAME[w]}: the Meshy model beside the portrait and its input picture')


def faces():
    cells = []
    for a, pic in ATT.items():
        w = a.rsplit('-', 1)[0]
        if not os.path.exists(f'{ART}/{a}/renders/face.png'): continue
        x, y, s = FACE[w]
        cells.append(cell(portrait(w).crop((x, y, x + s, y + s)), f'{NAME[w]}: portrait'))
        cells.append(cell(Image.open(f'{ART}/inputs/{pic}.png').crop((262, 40, 762, 540)), f'{a}: input face'))
        cells.append(cell(Image.open(f'{ART}/{a}/renders/face.png'), f'{a}: model face'))
        cells.append(cell(Image.open(f'{ART}/{a}/renders/face-l40.png'), f'{a}: model, {SIDE[w]} left 3/4'))
    grid(cells, 4, f'{ART}/faces.webp', 'Faces: the portrait, the input picture and the 3D model (front, left 3/4)')


if __name__ == '__main__':
    {'inputs': inputs, 'side': side, 'faces': faces}[sys.argv[1]]()
