"""A colour tweak of mio-2's texture toward her portrait (reviews/mio-meshy-2, option mio-2-green): ChatGPT and Meshy
painted her hair and hoodie dark navy (median of the dark texels #172332, hue 213 degrees), where the portrait's are
dark green bordering on black (game colours, docs/game/cast.md: hair #13292f, hoodie #09232a, hue 193). Every dark
blue texel (value under 0.45, hue 195-245) turns 20 degrees toward green, keeping its value and saturation, so shading
and edges stay as painted. The face, skin, teal streaks and white soles are untouched; so is the model.

  python3 art/candidates/mio-meshy-2/green.py <base.webp> <out.webp>
"""
import sys
import numpy as np
from PIL import Image


def main():
    src, out = sys.argv[1:3]
    im = Image.open(src).convert('RGB')
    hsv = np.asarray(im.convert('HSV')).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    m = (v < 0.45) & (h > 195) & (h < 245) & (s > 0.15)
    h = np.where(m, h - 20, h)
    hsv[..., 0] = np.round(h * 255 / 360) % 256
    res = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
    # PIL's HSV round trip shifts untouched texels slightly; keep them exactly as they were
    res = Image.fromarray(np.where(m[..., None], np.asarray(res), np.asarray(im)))
    res.save(out, quality=90, method=6)
    print('recoloured', round(float(m.mean()) * 100, 1), '% of texels ->', out)


if __name__ == '__main__':
    main()
