"""expressions-kuro-mio-1, round 4 (Kuro only, no GPU): her lip colour put back to the neutral's.

Rounds 1 to 3 repainted Kuro's black lips as glossy navy-purple (d70, d55) and, with "glossy lips, purple lips" in the
negative (round 3), brown or dark teal. The neutral's lips are near-black navy (median 19, 24, 33). One change: on the
round-3 renders, every dark lip pixel in the mouth box keeps its brightness but takes the neutral's lip colour (weight
fades out between value 90 and 150, so skin and the white highlights stay). Nothing else is touched.

Run: ~/ai/sd/venv/bin/python lips.py kf3-d70-3 ...   writes <raw>/<name>-lip.png and a prompts.json entry <name>-lip."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen
import numpy as np
from PIL import Image, ImageDraw

MOUTH = (545, 780, 700, 860)       # around her mouth in the 1096x1824 render
NEUTRAL_LIP = np.array([19.0, 24.0, 33.0])


def fix(name):
    src = np.asarray(Image.open(os.path.join(gen.RAW, f'{name}.png')).convert('RGB')).astype(float)
    x0, y0, x1, y1 = MOUTH
    a = src[y0:y1, x0:x1]
    v = a.max(-1)
    poly = Image.new('L', (src.shape[1], src.shape[0]), 0)
    ImageDraw.Draw(poly).polygon(gen.PEOPLE['kuro']['poly'], fill=255)
    inside = np.asarray(poly)[y0:y1, x0:x1] > 0
    w = np.clip((150 - v) / 60, 0, 1) * inside
    lum = a.mean(-1, keepdims=True)
    tinted = np.clip(NEUTRAL_LIP * (lum / NEUTRAL_LIP.mean()), 0, 255)
    out = src.copy()
    out[y0:y1, x0:x1] = a * (1 - w[..., None]) + tinted * w[..., None]
    Image.fromarray(out.round().astype('uint8')).save(os.path.join(gen.RAW, f'{name}-lip.png'))
    L = json.load(open(gen.LOG))
    e = dict(L[name])
    e.pop('dash_n', None)
    e.pop('dash_image', None)
    e['from'] = name
    e['method'] = e['method'] + '; then lips.py: dark lip pixels in the mouth box recoloured to the neutral\'s lip colour, brightness kept'
    L[f'{name}-lip'] = e
    json.dump(L, open(gen.LOG, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, flush=True)


if __name__ == '__main__':
    for n in sys.argv[1:]:
        fix(n)
