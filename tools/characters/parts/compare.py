"""Comparison sheets for reviews/char-mio-parts-1 (run with ~/ai/sd/venv/bin/python):
faces.webp (target, meshy-single and each attempt, face front and her left 3/4), inputs.webp (the part pictures and
the lock inpaint seeds), motion-<a>.webp (viewer frames: rest, idle, walk front, side, back)."""
import os
from PIL import Image, ImageDraw
from sheet import cell, font, CELL, TARGET

ART = '/home/jorgen/repo/japanese/art/parts/char-mio-parts'
ATT = ['meshy-single', 'a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08', 'a09', 'a10', 'a11']


def grid(cells, cols, out, title):
    rows = (len(cells) + cols - 1) // cols
    sh = Image.new('RGB', (cols * CELL, rows * (CELL + 34) + 44), (236, 238, 241))
    ImageDraw.Draw(sh).text((12, 10), title, fill=(20, 25, 30), font=font(24))
    for i, c in enumerate(cells):
        sh.paste(c, ((i % cols) * CELL, 44 + (i // cols) * (CELL + 34)))
    sh.save(out, quality=88); print(out)


def faces():
    t = Image.open(TARGET).crop((1150, 220, 1950, 1020))
    for view, lab in (('face', 'face'), ('face-l40', 'face, her left 3/4')):
        cells = [cell(t, 'target')] + [cell(Image.open(f'{ART}/{a}/renders/{view}.png'), a) for a in ATT
                                       if os.path.exists(f'{ART}/{a}/renders/{view}.png')]
        grid(cells, 7, f'{ART}/faces-{view}.webp', f'{lab}: target, meshy-single, then every parts attempt in order')


def inputs():
    d = f'{ART}/inputs'
    cells = [cell(Image.open(f'{d}/head.png'), 'head part input'), cell(Image.open(f'{d}/body.png'), 'body part input')]
    for s in (401, 402, 403, 404, 405, 406):
        p = f'{d}/no-lock-s{s}.png'
        if os.path.exists(p):
            cells.append(cell(Image.open(p).crop((1060, 700, 1700, 1340)), f'lock painted out, seed {s}' + (' (used)' if s == 405 else '')))
    grid(cells, 4, f'{ART}/inputs.webp', 'Part pictures cut from the target, and the hair lock painted out of the hoodie')


def motion(a):
    d = f'{ART}/viewer-shots'
    labs = [('rest', 0, 'rest pose'), ('idle', 0, 'approved idle'), ('walk', 0, 'walk, front'), ('walk', 157, 'walk, her left side'),
            ('walk', 314, 'walk, back')]
    cells = [cell(Image.open(f'{d}/{a}-{m}-{y}.png').crop((290, 20, 650, 780)), lab) for m, y, lab in labs]
    grid(cells, 5, f'{ART}/motion-{a}.webp', f'{a} in the live viewer: her game idle and walk carried over by bone name')


if __name__ == '__main__':
    faces(); inputs()
    for a in ('a07', 'a11'): motion(a)
