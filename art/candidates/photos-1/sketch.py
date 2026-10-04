"""Line sketch for the Early train photo (pass c): black lines on white, 1152x864, for Anima LLLite lineart
(art/PROMPTS.md, composition control: the quick line sketch). The layout of the current drawing: horizon at 58%, one
narrow beam crossing the whole picture left to right, round pillars down into the water, a short train of three cars
sitting astride the beam (its skirts reach down over the beam's sides), the low sun right of centre.
Writes art/production/photos-1/monorail-lines.png."""
import os
from PIL import Image, ImageDraw

W, H = 1152, 864
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'production', 'photos-1', 'monorail-lines.png')
HZ = int(H * 0.58)


def beam_y(x):  # top of the beam, gently falling to the right
    return H * 0.40 + (x / W) * H * 0.05


def main():
    im = Image.new('L', (W, H), 255)
    d = ImageDraw.Draw(im)
    d.line([(0, HZ), (W, HZ)], fill=0, width=2)
    sun = (W * 0.72, HZ - 40)
    d.ellipse([sun[0] - 38, sun[1] - 38, sun[0] + 38, sun[1] + 38], outline=0, width=2)
    th = 34  # beam depth
    for x in (W * 0.16, W * 0.47, W * 0.80):  # round pillars into the water
        y = beam_y(x) + th
        d.rectangle([x - 16, y, x + 16, H + 5], outline=0, width=2)
        d.line([(x - 16, y + (HZ - y) + 6), (x + 16, y + (HZ - y) + 6)], fill=0, width=1)
    d.line([(0, beam_y(0)), (W, beam_y(W))], fill=0, width=3)
    d.line([(0, beam_y(0) + th), (W, beam_y(W) + th)], fill=0, width=3)
    # three cars astride the beam: body above, skirt down over the beam's side to two thirds of its depth
    x0, car, gap = W * 0.10, W * 0.155, 10
    for i in range(3):
        a, b = x0 + i * (car + gap), x0 + i * (car + gap) + car
        ta, tb = beam_y(a) - 78, beam_y(b) - 78
        sa, sb = beam_y(a) + th * 0.65, beam_y(b) + th * 0.65
        r = 26 if i in (0, 2) else 6
        pts = [(a + (r if i == 0 else 0), ta), (b - (r if i == 2 else 0), tb), (b, tb + (r if i == 2 else 0)), (b, sb), (a, sa),
               (a, ta + (r if i == 0 else 0))]
        d.polygon(pts, fill=255)
        d.line(pts + [pts[0]], fill=0, width=3)
        # a band of windows
        for k in range(5):
            wa = a + 14 + k * (car - 28) / 5
            wb = wa + (car - 28) / 5 - 8
            d.rectangle([wa, beam_y(wa) - 64, wb, beam_y(wb) - 40], outline=0, width=2)
    # a few glints on the water under the sun
    for k in range(6):
        y = HZ + 20 + k * 30
        d.line([(sun[0] - 30 + k * 4, y), (sun[0] + 30 - k * 4, y)], fill=0, width=1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT)
    print(OUT)


if __name__ == '__main__':
    main()
