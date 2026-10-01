# char-mio-gen3d: one labelled strip of pictures side by side, each cropped to the figure's columns at the picture's
# camera (the same crop for all, so heights line up), for sheets and quick looks.
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_gen3d_strip.py <out.webp> <label>=<png> ...
import sys

from PIL import Image, ImageDraw, ImageFont

X0, X1 = 300, 724  # columns kept at 1024 (the figure and its arms in every view)


def strip(out, items, h=1024, bg=(229, 232, 236)):
    font = ImageFont.load_default(size=22)
    W = X1 - X0
    sh = Image.new('RGB', (W * len(items), h + 36), (255, 255, 255))
    d = ImageDraw.Draw(sh)
    for i, (label, path) in enumerate(items):
        im = Image.open(path).convert('RGBA').resize((1024, 1024), Image.LANCZOS)
        base = Image.new('RGBA', im.size, bg + (255,))
        base.alpha_composite(im)
        sh.paste(base.convert('RGB').crop((X0, 0, X1, 1024)).resize((W, h)), (i * W, 36))
        d.text((i * W + 6, 6), label, fill=(0, 0, 0), font=font)
    sh.save(out, quality=90)
    print(out)


if __name__ == '__main__':
    strip(sys.argv[1], [a.split('=', 1) for a in sys.argv[2:]])
