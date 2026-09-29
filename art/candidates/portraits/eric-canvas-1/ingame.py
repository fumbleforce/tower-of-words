"""In-game before/after pictures for eric-canvas-1 from game3d/shots/eric-canvas/ (eric-canvas-shots.mjs): for each
screen size, the whole screen before and after, plus a crop around Eric side by side (and a 2x zoom on the shoulder at
2560x1440). Run: ~/ai/sd/venv/bin/python art/candidates/portraits/eric-canvas-1/ingame.py"""
import os
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(REPO, 'game3d/shots/eric-canvas')
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 20)
SIZES = {'2560x1440': (1900, 800, 2560, 1440), '1366x860': (950, 330, 1366, 860), '390x844': (0, 380, 390, 844)}


def pair(ims, labels, scale=1):
    ims = [i.resize((i.width * scale, i.height * scale), Image.LANCZOS) for i in ims]
    w, h = ims[0].size
    c = Image.new('RGB', (2 * w + 12, h + 34), (40, 40, 44))
    d = ImageDraw.Draw(c)
    for k, (im, lb) in enumerate(zip(ims, labels)):
        c.paste(im, (k * (w + 12), 34))
        d.text((k * (w + 12) + 6, 6), lb, font=FONT, fill=(255, 255, 255))
    return c


def main():
    for size, crop in SIZES.items():
        for face in ('neutral', 'surprised', 'tired'):
            ims = [Image.open(os.path.join(SHOTS, f'{size}-{s}-{face}.png')).convert('RGB') for s in ('before', 'after')]
            pair([i.crop(crop) for i in ims], [f'before, {size}, {face}', f'after, {size}, {face}']).save(
                os.path.join(HERE, f'ingame-{size}-{face}.webp'), 'WEBP', quality=88)
            if face == 'neutral':
                for s, im in zip(('before', 'after'), ims):
                    im.save(os.path.join(HERE, f'ingame-{size}-{s}-full.webp'), 'WEBP', quality=85)
    ims = [Image.open(os.path.join(SHOTS, f'2560x1440-{s}-neutral.png')).convert('RGB').crop((2330, 1180, 2560, 1440))
           for s in ('before', 'after')]
    pair(ims, ['before, 2x', 'after, 2x'], 2).save(os.path.join(HERE, 'ingame-2560x1440-shoulder-2x.webp'), 'WEBP', quality=90)


if __name__ == '__main__':
    main()
