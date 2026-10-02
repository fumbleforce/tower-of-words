"""Comparison sheets for reviews/chibi-meshy-1 (run with ~/ai/sd/venv/bin/python): side-by-side.webp (the two
reference pictures, then front, her left 3/4, her left side and back of every attempt in order), faces.webp (the
reference faces and every attempt's face, front and her left 3/4) and motion-<a>.webp (viewer frames of the rigged
ones: rest, idle, walk front, side, back). Per-attempt sheets come from sheet.py."""
import os
from PIL import Image
from sheet import cell
from compare import grid

ART = '/home/jorgen/repo/japanese/art/parts/chibi-meshy'
ATT = ['dressed', 'base', 'dressed-t2', 'base-nopose', 'dressed-nopose']   # the order they were made
REF = {'dressed': (f'{ART}/inputs/dressed.png', (380, 220, 880, 720)), 'base': (f'{ART}/inputs/base.png', (300, 120, 960, 780))}


def side_by_side():
    cells = []
    for a in ATT:
        ref, _ = REF['base' if a.startswith('base') else 'dressed']
        cells.append(cell(Image.open(ref), f'reference ({a})'))
        for v, lab in (('front', 'front'), ('l45', 'her left 3/4'), ('l90', 'her left side'), ('back', 'back')):
            cells.append(cell(Image.open(f'{ART}/{a}/renders/{v}.png'), f'{a}: {lab}'))
    grid(cells, 5, f'{ART}/side-by-side.webp', 'Each attempt in the order made, beside its reference picture (soft light)')


def faces():
    cells = []
    for k, (ref, box) in REF.items():
        cells.append(cell(Image.open(ref).crop(box), f'reference face ({k})'))
    for a in ATT:
        for v, lab in (('face', 'face'), ('face-l40', 'her left 3/4')):
            cells.append(cell(Image.open(f'{ART}/{a}/renders/{v}.png'), f'{a}: {lab}'))
    grid(cells, 4, f'{ART}/faces.webp', 'Faces: the references, then every attempt front and her left 3/4 (image right side turned to us)')


def motion(a):
    d = f'{ART}/viewer-shots'
    labs = [('rest', 0, 'rest pose'), ('idle', 0, 'game idle'), ('walk', 0, 'walk, front'), ('walk', 157, 'walk, her left side'),
            ('walk', 314, 'walk, back')]
    cells = [cell(Image.open(f'{d}/{a}-{m}-{y}.png').crop((170, 20, 770, 780)), lab) for m, y, lab in labs]
    grid(cells, 5, f'{ART}/motion-{a}.webp', f'{a} in the live viewer: Meshy auto-rig, the game idle and walk carried over by bone name')


if __name__ == '__main__':
    side_by_side(); faces()
    for a in ('dressed-nopose', 'dressed-t2', 'base-nopose'):
        if os.path.exists(f'{ART}/viewer-shots/{a}-rest-0.png'): motion(a)
