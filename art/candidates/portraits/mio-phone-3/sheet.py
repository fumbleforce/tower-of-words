"""Review sheets for mio-phone-3: every attempt's glasses beside the approved portrait's, same scale (both canvases are
1008x1296 with the face at the same size), and a full-picture strip.
Usage: python3 sheet.py <name> ...   (names in art/production/mio-phone-3, in the order they were made)"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/jorgen/repo/japanese'
RAW = os.path.join(REPO, 'art/production/mio-phone-3')
APPR = os.path.join(REPO, 'art/production/RF/mio.png')
PICK = os.path.join(REPO, 'art/production/mio-phone-2/mio-phone2-ipa7a-1001-rf.png')
AB = (300, 400, 680, 620)   # approved glasses
TB = (310, 440, 690, 660)   # the pick's glasses (her head sits 40-60 px lower on the canvas)
Z = 2
try:
    FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 26)
except OSError:
    FONT = ImageFont.load_default()


def label(img, text):
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, img.width, 38), fill=(20, 24, 28))
    d.text((10, 5), text, fill=(240, 240, 240), font=FONT)
    return img


def pair(path, name):
    a = Image.open(APPR).convert('RGB').crop(AB)
    b = Image.open(path).convert('RGB').crop(TB)
    w, h = a.width * Z, a.height * Z
    out = Image.new('RGB', (2 * w + 12, h + 40), (20, 24, 28))
    out.paste(label(Image.new('RGB', (w, 40)), 'approved mio-after'), (0, 0))
    out.paste(label(Image.new('RGB', (w, 40)), name), (w + 12, 0))
    out.paste(a.resize((w, h), Image.LANCZOS), (0, 40))
    out.paste(b.resize((w, h), Image.LANCZOS), (w + 12, 40))
    return out


if __name__ == '__main__':
    names = sys.argv[1:]
    rows = [pair(PICK, 'ipa7a-1001 (before)')] + [pair(os.path.join(RAW, n + '.png'), n.replace('mio-phone3-', '')) for n in names]
    for n, r in zip(['before'] + names, rows):
        r.convert('RGB').save(os.path.join(HERE, f'glasses-{n.replace("mio-phone3-", "")}.webp'), quality=90)
    W = rows[0].width
    sheet = Image.new('RGB', (W, sum(r.height + 10 for r in rows)), (20, 24, 28))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height + 10
    sheet.save(os.path.join(HERE, '..', 'mio-phone-3-glasses-sheet.webp'), quality=88)
    # full pictures: approved, before, then every attempt
    fulls = [(APPR, 'approved'), (PICK, 'ipa7a-1001 before')] + [(os.path.join(RAW, n + '.png'), n.replace('mio-phone3-', '')) for n in names]
    tw, th = 336, 432
    cols = 4
    rws = (len(fulls) + cols - 1) // cols
    strip = Image.new('RGB', (cols * (tw + 8), rws * (th + 48)), (20, 24, 28))
    for i, (p, t) in enumerate(fulls):
        im = Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS)
        x, y = (i % cols) * (tw + 8), (i // cols) * (th + 48)
        strip.paste(label(Image.new('RGB', (tw, 40)), t), (x, y))
        strip.paste(im, (x, y + 40))
    strip.save(os.path.join(HERE, '..', 'mio-phone-3-sheet.webp'), quality=88)
    print('sheets written', len(rows))
