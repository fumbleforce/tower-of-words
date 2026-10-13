#!/usr/bin/env python3
"""Fit a cut-out portrait to the game's portrait framing, so every character has the same head size and headroom.

  python3 tools/portrait_fit.py <cutout.webp> <out.webp> [--canvas 648x768] [--top 70] [--head 312]

The cut-out is only scaled (Lanczos) and placed on a transparent canvas: no pixel is recoloured or edited. The head
width is measured at 22 percent of the figure's height and scaled to --head (about 48 percent of the canvas, between
Emi 39 and Mio 56, Rei 51, Eric 51); the figure is centred on the head and its top sits --top px from the canvas top
(the cast has 9 to 12 percent of the height). Prints the face box estimate for data/mc/<id>.json portrait.crop.f."""
import argparse
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--canvas', default='648x768'); ap.add_argument('--top', type=int, default=70); ap.add_argument('--head', type=int, default=312)
a = ap.parse_args()
W, H = map(int, a.canvas.split('x'))
im = Image.open(a.src).convert('RGBA'); alpha = im.split()[3]; bb = alpha.getbbox()
ys = int(bb[1] + (bb[3] - bb[1]) * 0.22)
row = alpha.crop((0, ys, im.width, ys + 1)).getbbox()
s = a.head / (row[2] - row[0])
im2 = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
cx = (round(row[0] * s) + round(row[2] * s)) // 2
canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
canvas.paste(im2, (W // 2 - cx, a.top - round(bb[1] * s)), im2)
canvas.save(a.out, quality=92, method=6)
hw = a.head
print('face box f =', [round(W // 2 - .338 * hw), round(a.top + .468 * hw), round(W // 2 + .338 * hw), round(a.top + .468 * hw + .577 * hw)])
