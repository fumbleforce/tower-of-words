"""Review images for mio-phone-5 (helpers from ../mio-phone-4/sheet4.py).
- glasses-<n>.webp: the glasses beside the approved portrait's at the same scale.
- frame-<n>.webp: round 4 and round 5 cut-outs of the same pick, HER left lens (the image's right) on a checkerboard, 4x.
- bg-<n>.webp: the round-5 cut-out on dark, light and a checkerboard.
- approved-lens.webp: the approved portrait at the same lens: there her fringe hangs in front of that stretch of bar.
Usage: python3 sheet5.py"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(HERE, '..', 'mio-phone-4'))
import sheet4 as s4  # noqa: E402

R4 = os.path.join(REPO, 'art/production/mio-phone-4')
R5 = os.path.join(REPO, 'art/production/mio-phone-5')
LENS = (470, 460, 640, 580)       # her left lens (image right) and the hinge, on the 1008x1296 canvas
Z = 4

if __name__ == '__main__':
    s4.s3.RAW = R5
    z = lambda im, box=LENS: im.crop(box).resize(((box[2] - box[0]) * Z, (box[3] - box[1]) * Z), Image.LANCZOS)
    for n in s4.NAMES:
        full = 'mio-phone3-' + n
        s4.s3.pair(os.path.join(R5, full + '.png'), n).save(os.path.join(HERE, f'glasses-{n}.webp'), quality=90)
        Image.open(os.path.join(R5, full + '.png')).convert('RGB').resize((597, 768), Image.LANCZOS).save(
            os.path.join(HERE, full + '.webp'), quality=92)
        c5 = s4.cut(R5, n)
        c5.resize((597, 768), Image.LANCZOS).save(os.path.join(HERE, full + '-cut.webp'), quality=92)
        s4.row([s4.titled(s4.over(z(s4.cut(R4, n)), 'checker'), 'round 4'),
                s4.titled(s4.over(z(c5), 'checker'), 'round 5')]).save(os.path.join(HERE, f'frame-{n}.webp'), quality=90)
        box = (300, 420, 720, 680)
        g = c5.crop(box).resize(((box[2] - box[0]) * 2, (box[3] - box[1]) * 2), Image.LANCZOS)
        s4.row([s4.titled(s4.over(g, s4.DARK), 'dark'), s4.titled(s4.over(g, s4.LIGHT), 'light'),
                s4.titled(s4.over(g, 'checker'), 'checkerboard')]).save(os.path.join(HERE, f'bg-{n}.webp'), quality=90)
    appr = Image.open(os.path.join(REPO, 'art/production/RF/mio.png')).convert('RGB')
    s4.titled(z(appr, (440, 400, 610, 520)), 'approved: her fringe hangs over the top bar here').save(
        os.path.join(HERE, 'approved-lens.webp'), quality=90)
    print('ok')
