"""Colour fix after a render: deterministic hue edits inside boxes, no reroll. The image gen queue runs it as a post-step
(a job's `huefix` list, server.py); the math is the rounds' colour fix, made generic (any hue, any box).

Each step is a dict with `box` [x0, y0, x1, y1] in the picture's pixels and an `op`:
  hue      pixels with hue hmin..hmax and saturation above `sat` (default .15) move so their median hue lands on
           `target`; saturation and value stay (wrong hair or eye colour)
  recolour pixels with hue hmin..hmax and saturation above .6 get hue `target` at 70% saturation and 55% value (a prop
           drawn in the wrong colour, as dyed cloth)
  blacken  pixels with hue hmin..hmax (default 160..260) and saturation above .25 lose their colour and darken, keeping
           their shading (a coloured streak back to black hair)
Hue ranges may wrap (hmin > hmax). Masks are feathered 1.5 px.

  python3 tools/imagegen/huefix.py <in.png> <out.png> '<steps json>'"""
import json, sys

try:  # numpy and Pillow are in the image venv (~/ai/sd/venv) the dashboard runs in; the checks import this without them
    import numpy as np
    from PIL import Image, ImageFilter
except ImportError:
    np = Image = ImageFilter = None


def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0)
    return h, s, mx


def hsv2rgb(h, s, v):
    c = v * s; x = c * (1 - np.abs((h / 60) % 2 - 1)); m = v - c
    k = (h // 60).astype(int) % 6
    z = np.zeros_like(h)
    r = np.choose(k, [c, x, z, z, x, c]); g = np.choose(k, [x, c, c, x, z, z]); b = np.choose(k, [z, z, x, c, c, x])
    return np.stack([r + m, g + m, b + m], -1)


def _box(shape, box):
    m = np.zeros(shape, bool)
    x0, y0, x1, y1 = (int(round(v)) for v in box)
    m[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = True
    return m


def _range(h, lo, hi):
    return (h >= lo) & (h <= hi) if lo <= hi else (h >= lo) | (h <= hi)


def fix(img, steps):
    """img: a PIL image. Returns (fixed image, {step index: pixels changed})."""
    a = np.asarray(img.convert('RGB')).astype(float) / 255
    h, s, v = rgb2hsv(a)
    oh, os_, ov = h.copy(), s.copy(), v.copy()
    touched = np.zeros(h.shape, bool)
    report = {}
    for i, st in enumerate(steps):
        op, box = st.get('op'), st.get('box') or [0, 0, a.shape[1], a.shape[0]]
        lo, hi = float(st.get('hmin', 160 if op == 'blacken' else 0)), float(st.get('hmax', 260 if op == 'blacken' else 360))
        if op == 'hue':
            m = _box(h.shape, box) & _range(h, lo, hi) & (s > float(st.get('sat', .15)))
            if m.any():
                oh = np.where(m, (h + float(st['target']) - float(np.median(h[m]))) % 360, oh)
        elif op == 'recolour':
            m = _box(h.shape, box) & _range(h, lo, hi) & (s > .6)
            oh = np.where(m, float(st['target']), oh); os_ = np.where(m, s * .7, os_); ov = np.where(m, v * .55, ov)
        elif op == 'blacken':
            m = _box(h.shape, box) & _range(h, lo, hi) & (s > .25)
            os_ = np.where(m, s * .12, os_); ov = np.where(m, .06 + .35 * v, ov)
        else:
            raise ValueError(f'unknown colour fix: {op}')
        touched |= m
        report[i] = int(m.sum())
    w = np.asarray(Image.fromarray((touched * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)[..., None] / 255
    out = a * (1 - w) + hsv2rgb(oh, os_, ov) * w
    return Image.fromarray((out.clip(0, 1) * 255).round().astype(np.uint8)), report


def clean(steps):
    """Validated steps from a request (raises ValueError)."""
    out = []
    for st in steps or []:
        if st.get('op') not in ('hue', 'recolour', 'blacken'):
            raise ValueError('unknown colour fix')
        box = [float(x) for x in st.get('box') or []]
        if len(box) != 4:
            raise ValueError('a colour fix needs a box')
        item = dict(op=st['op'], box=box)
        for k in ('hmin', 'hmax', 'target', 'sat'):
            if st.get(k) not in (None, ''):
                item[k] = float(st[k])
        if st['op'] != 'blacken' and 'target' not in item:
            raise ValueError('a colour fix needs a target hue')
        out.append(item)
    return out[:12]


if __name__ == '__main__':
    src, dst, steps = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
    img, rep = fix(Image.open(src), clean(steps))
    img.save(dst)
    print(json.dumps(rep))
