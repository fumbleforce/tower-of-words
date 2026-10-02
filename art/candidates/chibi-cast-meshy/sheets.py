"""Comparison sheets for reviews/chibi-cast-meshy-1 (run with ~/ai/sd/venv/bin/python). Everything is written to the
main checkout's art/parts/chibi-cast-meshy/ (git-ignored):

  sheets.py inputs           inputs-<who>.webp: his picture, the approved portrait, then every input picture in order
  sheets.py side             side-<who>.webp: per Meshy attempt, his picture and its input beside front, her/his left
                             3/4, left side and back (same Blender camera and soft light as chibi-meshy-1)
  sheets.py faces            faces.webp: his picture's face, then per attempt the input's face and the model's face
  sheets.py motion <a>...    motion-<a>.webp from the live viewer shots
"""
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/characters/parts'))
from sheet import cell          # noqa: E402
from compare import grid        # noqa: E402

MAIN = '/home/jorgen/repo/japanese'
ART = f'{MAIN}/art/parts/chibi-cast-meshy'
REF = f'{MAIN}/art/parts/chibi-meshy/inputs/dressed.png'
HERE = os.path.dirname(os.path.abspath(__file__))
WHO = ('kuro', 'eric', 'mio')
# Meshy attempts in the order made: attempt -> input picture name (art/parts/chibi-cast-meshy/inputs/<name>.png)
ATT = json.load(open(os.path.join(HERE, 'attempts.json')))
SIDE = {'kuro': 'her', 'eric': 'his', 'mio': 'her'}


def inputs():
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    for w in WHO:
        cells = [cell(Image.open(REF), 'Jørgen\'s picture (image 1)'),
                 cell(Image.open(f'{MAIN}/game3d/assets/portraits/{w}-neutral.webp'), 'approved portrait (image 2)')]
        used = {v for v in ATT.values()}
        for e in log:
            if e['who'] == w:
                mark = ' (to Meshy)' if e['name'] in used else ''
                cells.append(cell(Image.open(f'{ART}/inputs/{e["name"]}.png'), e['name'] + mark))
        grid(cells, 5, f'{ART}/inputs-{w}.webp', f'{w}: every input picture in the order made (FLUX.2 Klein, local)')


def side():
    for w in WHO:
        cells, s = [], SIDE[w]
        for a, pic in ATT.items():
            if not a.startswith(w): continue
            cells += [cell(Image.open(REF), 'Jørgen\'s picture'), cell(Image.open(f'{ART}/inputs/{pic}.png'), f'{a}: input {pic}')]
            for v, lab in (('front', 'front'), ('l45', f'{s} left 3/4'), ('l90', f'{s} left side'), ('back', 'back')):
                cells.append(cell(Image.open(f'{ART}/{a}/renders/{v}.png'), f'{a}: {lab}'))
        grid(cells, 6, f'{ART}/side-{w}.webp', f'{w}: each Meshy attempt beside his picture and its input')


def faces():
    cells = [cell(Image.open(REF).crop((380, 220, 880, 720)), 'Jørgen\'s picture: face')]
    for a, pic in ATT.items():
        cells.append(cell(Image.open(f'{ART}/inputs/{pic}.png').crop((262, 40, 762, 540)), f'{a}: input face'))
        cells.append(cell(Image.open(f'{ART}/{a}/renders/face.png'), f'{a}: model face'))
        cells.append(cell(Image.open(f'{ART}/{a}/renders/face-l40.png'), f'{a}: model, {SIDE[a.split("-")[0]]} left 3/4'))
    grid(cells, 4, f'{ART}/faces.webp', 'Faces: his picture, then per attempt the input picture and the 3D model (front, left 3/4)')


def motion(a):
    d = f'{ART}/viewer-shots'
    labs = [('rest', 0, 'rest pose'), ('idle', 0, 'game idle'), ('walk', 0, 'walk, front'), ('walk', 157, 'walk, left side'),
            ('walk', 314, 'walk, back')]
    cells = [cell(Image.open(f'{d}/{a}-{m}-{y}.png').crop((170, 20, 770, 780)), lab) for m, y, lab in labs]
    grid(cells, 5, f'{ART}/motion-{a}.webp', f'{a} in the live viewer: Meshy auto-rig, the game idle and walk (steps scaled for chibi legs)')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'motion':
        for a in sys.argv[2:]: motion(a)
    else:
        {'inputs': inputs, 'side': side, 'faces': faces}[cmd]()
