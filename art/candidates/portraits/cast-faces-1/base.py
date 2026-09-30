"""cast-faces-1: build each fixed base from the picked fix attempts (the guard's plate, shoulder patch and collar pin;
Aoi's chest patch). Each fix render changed only its own patch, so the base takes each patch's pixels through the same
feathered box the repaint was pasted with.

Run: ~/ai/sd/venv/bin/python base.py"""
import os
from PIL import Image, ImageDraw, ImageFilter
from gen import FIXES, RAW, BASE

PICK = {'guard': ['guard-plate-d75-2', 'guard-patch-d75-2', 'guard-collar-d75-1'], 'aoi': ['aoi-patch-d90-2']}


def build(who):
    im = Image.open(BASE[who]['src']).convert('RGB')
    for name in PICK[who]:
        fx = name.rsplit('-', 2)[0]
        box = FIXES[fx][1]
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle(box, 12, fill=255)
        im = Image.composite(Image.open(os.path.join(RAW, f'fix-{name}.png')).convert('RGB'), im, m.filter(ImageFilter.GaussianBlur(2)))
    im.save(os.path.join(RAW, f'base-{who}.png'))
    print('base', who, PICK[who])


if __name__ == '__main__':
    for who in PICK:
        if PICK[who]:
            build(who)
