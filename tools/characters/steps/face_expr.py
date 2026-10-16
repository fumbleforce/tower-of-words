"""face-expr: a new expression on an approved portrait through the image service, repainting only the face.

The method of expressions-kuro-mio-1 (Mio's annoyed face, picked by Jørgen), split so the render itself is a recipe
(art/PROMPTS.md, How a picture is made): a square around the face of the source render is upscaled to 1024 and inpainted
by a recipe (`start` = that crop, `mask` = the face polygon below the fringe, feathered, with the glasses frame cut out of
it), then pasted back into the source through the same polygon, the frame pasted back identical. Hair, outfit and the
cut-out stay the installed neutral's.

Settings, a JSON file in the round folder (face.json):
  source   the full render the installed neutral was cut from (e.g. art/production/PC/mio/mio-v3-neutral-823.png)
  game     the installed neutral (game3d/assets/portraits/mio-neutral.webp): its size and alpha make the game file
  crop     [x0, y0, x1, y1], a square on the source
  poly     the face polygon on the source (below the fringe, inside the jaw line)
  frame    "mio" to keep her glasses frame (tools/portrait_candidates.py mio_frame_mask), or null
  grow     px the kept frame is grown by (9 for Mio: smaller left a second rim inside the frame)
  blur     the mask feather at 1024 (10)

  ~/ai/sd/venv/bin/python tools/characters/steps/face_expr.py prep <round>/face.json
      writes <round>/start/crop.png and <round>/start/mask.png (white = repaint) for the recipes
  ~/ai/sd/venv/bin/python tools/characters/steps/face_expr.py paste <round>/face.json <render.webp...>
      writes <render>-full.webp (the source with the new face) and <render>-cut.webp (game size, the neutral's alpha)
  ~/ai/sd/venv/bin/python tools/characters/steps/face_expr.py sheet <round>/face.json <out.webp> <label=picture ...>
      a contact sheet of the face area of each picture, labelled, in the order given
  ~/ai/sd/venv/bin/python tools/characters/steps/face_expr.py gamesize <round>/face.json <out.webp> <label=cut-out ...>
      the cut-outs at the CSS size the dialogue stage shows them (game3d/js/ui/portraits.js layoutStage): a phone row
      (face 57 px, 390x844) above a desktop row (face 112 px, 1366x860), each cut at the band or the screen bottom"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
UP = 1024


def load(cfg):
    s = json.load(open(cfg))
    s['round'] = os.path.dirname(os.path.abspath(cfg))
    s['src'] = Image.open(os.path.join(ROOT, s['source'])).convert('RGB')
    return s


def keep_mask(s):
    """The pixels that stay the source's exactly (the glasses frame), as an L image at source size, or None."""
    if not s.get('frame'):
        return None
    if s['frame'] != 'mio':
        raise SystemExit(f"unknown frame {s['frame']}")
    from portrait_candidates import mio_frame_mask
    k = mio_frame_mask(os.path.join(ROOT, s['source']), grow=s.get('grow', 3))
    return Image.fromarray((k * 255).astype('uint8'))


def face_mask(s):
    m = Image.new('L', s['src'].size, 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in s['poly']], fill=255)
    return m


def prep(cfg):
    s = load(cfg)
    C = s['crop']
    k = UP / (C[2] - C[0])
    out = os.path.join(s['round'], 'start')
    os.makedirs(out, exist_ok=True)
    s['src'].crop(C).resize((UP, UP), Image.LANCZOS).save(os.path.join(out, 'crop.png'))
    m = Image.new('L', (UP, UP), 0)
    ImageDraw.Draw(m).polygon([((x - C[0]) * k, (y - C[1]) * k) for x, y in s['poly']], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(s.get('blur', 10)))
    keep = keep_mask(s)
    if keep is not None:
        km = keep.crop(C).resize((UP, UP), Image.NEAREST)
        m = Image.composite(Image.new('L', (UP, UP), 0), m, km)
    m.convert('RGB').save(os.path.join(out, 'mask.png'))
    print(os.path.join(out, 'crop.png'), os.path.join(out, 'mask.png'))


def paste(cfg, renders):
    s = load(cfg)
    C, src = s['crop'], s['src']
    pm = face_mask(s).filter(ImageFilter.GaussianBlur(3))
    keep = keep_mask(s)
    game = Image.open(os.path.join(ROOT, s['game'])).convert('RGBA')
    for r in renders:
        new = Image.open(r).convert('RGB').resize((C[2] - C[0], C[3] - C[1]), Image.LANCZOS)
        full = src.copy()
        full.paste(new, tuple(C[:2]))
        res = Image.composite(full, src, pm)
        if keep is not None:
            res = Image.composite(src, res, keep.filter(ImageFilter.GaussianBlur(0.8)))  # the frame back, identical
        base = os.path.splitext(r)[0]
        res.save(base + '-full.webp', 'WEBP', quality=92)
        # game size: the installed neutral, with the colour inside the polygon from the new face, and its alpha
        gm = pm.resize(game.size, Image.LANCZOS)
        rgb = Image.composite(res.resize(game.size, Image.LANCZOS), game.convert('RGB'), gm)
        if keep is not None:
            rgb = Image.composite(game.convert('RGB'), rgb, keep.filter(ImageFilter.GaussianBlur(0.8)).resize(game.size, Image.LANCZOS))
        out = rgb.convert('RGBA')
        out.putalpha(game.getchannel('A'))
        out.save(base + '-cut.webp', 'WEBP', lossless=True)
        print(base + '-full.webp', base + '-cut.webp')


def sheet(cfg, out, cells):
    s = load(cfg)
    C = s['crop']
    sw, sh = s['src'].size
    tiles = []
    for cell in cells:
        label, path = cell.split('=', 1)
        im = Image.open(path).convert('RGBA')
        bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im); im = bg.convert('RGB')
        k = im.width / sw  # pictures at source size, game size or crop size: the same face box
        box = [round(v * k) for v in (C[0] - 20, C[1] - 20, C[2] + 20, C[3] + 20)]
        if im.size == (UP, UP):  # a raw 1024 crop
            box = [0, 0, UP, UP]
        t = im.crop(box).resize((400, 400), Image.LANCZOS)
        tiles.append((label, t))
    try:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)
    except OSError:
        font = ImageFont.load_default()
    cols, pad, top = 4, 10, 30
    rows = (len(tiles) + cols - 1) // cols
    W, H = cols * (400 + pad) + pad, rows * (400 + top + pad) + pad
    sh_ = Image.new('RGB', (W, H), (236, 238, 241))
    d = ImageDraw.Draw(sh_)
    for i, (label, t) in enumerate(tiles):
        x, y = pad + (i % cols) * (400 + pad), pad + (i // cols) * (400 + top + pad)
        d.text((x + 2, y + 4), label, fill=(170, 0, 0) if 'REJECT' in label else (29, 35, 39), font=font)
        sh_.paste(t, (x, y + top))
    sh_.save(out, 'WEBP', quality=90)
    print(out, sh_.size)


# game3d/js/ui/portraits.js: FACE box heights and layoutStage's face height F and chin-to-cut cutK
FACE_BOX = {'mio': (214, 383)}
STAGE = [('phone 390x844', min(58, 844 * 0.068), 1.55), ('desktop 1366x860', min(124, 860 * 0.13), 2.25)]


def gamesize(cfg, out, cells, who='mio'):
    f0, f1 = FACE_BOX[who]
    try:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 13)
    except OSError:
        font = ImageFont.load_default()
    rows = []
    for name, F, cutK in STAGE:
        s = F / (f1 - f0)
        tiles = []
        for cell in cells:
            label, path = cell.split('=', 1)
            im = Image.open(path).convert('RGBA')
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
            im = im.crop((0, 0, im.width, min(im.height, round((f1 + cutK * (f1 - f0)) * s))))  # the cut
            tiles.append((label, im))
        rows.append((f'{name}: face {F:.0f} px', tiles))
    pad, top = 8, 20
    W = max(sum(t.width + pad for _, t in tiles) + pad for _, tiles in rows)
    H = sum(max(t.height for _, t in tiles) + 2 * top + pad for _, tiles in rows)
    sh_ = Image.new('RGB', (W, H), (52, 60, 76))  # a dim stage behind them, as the game's darkened scene
    d = ImageDraw.Draw(sh_)
    y = 0
    for head, tiles in rows:
        d.text((pad, y + 4), head, fill=(235, 238, 242), font=font)
        y += top
        x = pad
        for label, t in tiles:
            d.text((x + 2, y + 3), label, fill=(235, 238, 242), font=font)
            sh_.paste(t, (x, y + top), t)
            x += t.width + pad
        y += top + max(t.height for _, t in tiles) + pad
    sh_.save(out, 'WEBP', quality=92)
    print(out, sh_.size)


if __name__ == '__main__':
    cmd, cfg, *rest = sys.argv[1:]
    if cmd == 'prep':
        prep(cfg)
    elif cmd == 'paste':
        paste(cfg, rest)
    elif cmd == 'sheet':
        sheet(cfg, rest[0], rest[1:])
    elif cmd == 'gamesize':
        gamesize(cfg, rest[0], rest[1:])
    else:
        raise SystemExit(__doc__)
