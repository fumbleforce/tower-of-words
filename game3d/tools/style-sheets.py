#!/usr/bin/env python3
"""Contact sheets for the style study (js/style/). Reads the stills from style-shots.mjs and writes, per style, one
sheet (desktop in the three places, phone crops, the Mio and Eric close-up, the reference) plus an overview of all.
  python3 game3d/tools/style-sheets.py <shots dir> <out dir> [perf.json]
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REF = os.path.join(ROOT, 'art/refs/style-target-kuro-pose-s202.webp')
BG, FG, DIM, ACC = (16, 19, 27), (236, 238, 243), (150, 158, 172), (111, 208, 198)
FONT = '/usr/share/fonts/TTF/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'

sys.path.insert(0, os.path.dirname(__file__))
NAMES = {0: ('Current look', 'What the game ships today, for comparison.')}


def styles_meta():
    # read names and notes out of js/style/index.js so the sheet matches the code
    import re
    src = open(os.path.join(ROOT, 'game3d/js/style/index.js')).read()
    out = dict(NAMES)
    for m in re.finditer(r"\n  (\d+): \{\n    name: '([^']*)',\n    note: '([^']*)'", src):
        out[int(m.group(1))] = (m.group(2), m.group(3).replace("\\'", "'"))
    return out


def font(sz, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, sz)


def fit(im, w=None, h=None):
    if w and h:
        return im.resize((w, h), Image.LANCZOS)
    if w:
        return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) > width and cur:
            lines.append(cur); cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def cost_line(perf, s):
    if not perf or str(s) not in perf:
        return ''
    p = perf[str(s)]
    return 'Phone profile: ' + ', '.join(f"{k} {v['ms']} ms ({v['rel']})" for k, v in p.items() if k != 'note') + (('. ' + p['note']) if p.get('note') else '')


def sheet(shots, s, meta, perf, out):
    W, pad = 2480, 24
    d0 = os.path.join(shots, f's{s}')
    img = lambda n: Image.open(os.path.join(d0, n + '.png')).convert('RGB')
    places = [('office', 'Office'), ('gate', 'Lobby'), ('train', 'Train')]
    cw = (W - pad * 4) // 3
    desk = [fit(img(p + '-desk'), w=cw) for p, _ in places]
    rowH2 = 780
    phones = [fit(img(p + '-phone'), h=rowH2) for p, _ in places]
    close = fit(img('close'), h=rowH2)
    ref = fit(Image.open(REF).convert('RGB'), h=rowH2)
    head = 150
    H = head + desk[0].height + 40 + rowH2 + 40 + pad * 3
    S = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(S)
    name, note = meta.get(s, ('?', ''))
    d.text((pad, 20), f'style {s}  {name}', font=font(44, True), fill=FG)
    d.text((pad + 8 + d.textlength(f'style {s}  {name}', font=font(44, True)) + 20, 36), f'?style={s}' if s else 'no flag', font=font(26), fill=ACC)
    y = 80
    for line in wrap(d, note + ('  ' + cost_line(perf, s) if cost_line(perf, s) else ''), font(24), W - pad * 2)[:2]:
        d.text((pad, y), line, font=font(24), fill=DIM); y += 32
    y = head
    for i, (im, (_, label)) in enumerate(zip(desk, places)):
        x = pad + i * (cw + pad)
        S.paste(im, (x, y + 30)); d.text((x, y), label + ', play camera, desktop', font=font(22), fill=DIM)
    y += desk[0].height + 40 + pad
    x = pad
    for im, (_, label) in zip(phones, places):
        d.text((x, y), label + ', phone', font=font(22), fill=DIM); S.paste(im, (x, y + 30)); x += im.width + pad
    d.text((x, y), 'Eric and Mio, close', font=font(22), fill=DIM); S.paste(close, (x, y + 30)); x += close.width + pad
    d.text((x, y), 'Reference', font=font(22), fill=DIM); S.paste(ref, (x, y + 30))
    S = S.crop((0, 0, W, y + 30 + rowH2 + pad))
    S.save(out, quality=86)
    return out


def overview(shots, styles, meta, perf, out):
    tw, pad = 560, 16
    cols = [('office-desk', 'Office'), ('gate-desk', 'Lobby'), ('train-desk', 'Train'), ('close', 'Eric and Mio')]
    th = round(860 * tw / 1366)
    lw = 380
    W = lw + len(cols) * (tw + pad) + pad
    rowh = th + pad
    refh = 420
    H = 90 + len(styles) * rowh + pad
    S = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(S)
    d.text((pad, 20), 'Style study, overview', font=font(40, True), fill=FG)
    d.text((pad, 68 - 6), 'Each row is one ?style= flag. Full sheets per style next to this file. Reference: art/refs/style-target-kuro-pose-s202.webp', font=font(20), fill=DIM)
    y = 100
    for s in styles:
        name, note = meta.get(s, ('?', ''))
        d.text((pad, y + 4), f'{s}', font=font(54, True), fill=ACC)
        d.text((pad + 56, y + 14), name, font=font(26, True), fill=FG)
        yy = y + 56
        for line in wrap(d, note, font(18), lw - pad * 2)[:6]:
            d.text((pad, yy), line, font=font(18), fill=DIM); yy += 24
        c = cost_line(perf, s)
        if c:
            for line in wrap(d, c, font(16), lw - pad * 2)[:3]:
                d.text((pad, yy + 6), line, font=font(16), fill=ACC); yy += 21
        x = lw
        for n, _ in cols:
            im = Image.open(os.path.join(shots, f's{s}', n + '.png')).convert('RGB')
            if n == 'close':
                im = im.crop((0, (im.height - round(im.width * 860 / 1366)) // 2, im.width, (im.height + round(im.width * 860 / 1366)) // 2))
            S.paste(fit(im, tw, th), (x, y)); x += tw + pad
        y += rowh
    # reference in the top right corner of the header area is too small; put it as a last column strip instead
    ref = fit(Image.open(REF).convert('RGB'), h=H - 100 - pad)
    S2 = Image.new('RGB', (W + ref.width + pad, H), BG)
    S2.paste(S, (0, 0)); S2.paste(ref, (W, 100))
    ImageDraw.Draw(S2).text((W, 70), 'Reference', font=font(20), fill=DIM)
    S2.save(out, quality=84)
    return out


if __name__ == '__main__':
    shots, outd = sys.argv[1], sys.argv[2]
    perf = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else None
    os.makedirs(outd, exist_ok=True)
    meta = styles_meta()
    styles = sorted(int(n[1:]) for n in os.listdir(shots) if n.startswith('s') and os.path.isfile(os.path.join(shots, n, 'close.png')))
    for s in styles:
        print(sheet(shots, s, meta, perf, os.path.join(outd, f'style-{s}.jpg')))
    print(overview(shots, styles, meta, perf, os.path.join(outd, 'overview.jpg')))
