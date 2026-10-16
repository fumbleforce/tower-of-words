"""sheets: the pictures a Review of the model needs, as the staff rounds made them (art/candidates/staff-meshy-1/
renders.sh and sheets.sh): a turnaround and face close-ups in Blender (tools/characters/steps/render_bl.py, the same
camera and light for every model), close-ups from below the chin in the texture's own colours to look for marks
(chin_bl.py), and contact sheets of both (sheet(), lifted from kuro-meshy-orig-2/sheet.py). Holds the GPU lock.

When a step flagged something (the texture still had marks after its re-rolls), the flag goes on the model's Review:
reviews/<review>/review.json gets the chin sheet with the flag as its caption, if that item exists.
Settings: chin (the chin's height as a fraction, 0.57), face_z (1.15), face_dist (1.5).
Writes build/renders/, build/sheets/turnaround.webp and chin.webp."""
import json, os, shutil
from PIL import Image, ImageDraw, ImageFont
from common import HERE, ROOT, blender


def sheet(out, h, cells):
    """A contact sheet: (label, picture) pairs in a row at height h, each labelled, transparent pictures on white."""
    ims = []
    for label, path in cells:
        im = Image.open(path).convert('RGBA')
        bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im); im = bg.convert('RGB')
        im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
        ims.append((label, im))
    pad, top = 12, 34
    W = sum(im.width for _, im in ims) + pad * (len(ims) + 1)
    s = Image.new('RGB', (W, h + top + pad), (236, 238, 241))
    d = ImageDraw.Draw(s)
    try:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 20)
    except OSError:
        font = ImageFont.load_default()
    x = pad
    for label, im in ims:
        s.paste(im, (x, top))
        d.text((x + 2, 7), label, fill=(29, 35, 39), font=font)
        x += im.width + pad
    os.makedirs(os.path.dirname(out), exist_ok=True)
    s.save(out, quality=90)
    print(out, s.size)


def run(ctx, o):
    model = ctx.files['rigged']
    r = ctx.path('build', 'renders')
    os.makedirs(r, exist_ok=True)
    name = f'character-build-{ctx.id}'
    blender(os.path.join(ROOT, 'tools/characters/steps/render_bl.py'),
            [model, r, 'size=768', f'face_z={o.get("face_z", 1.15)}', f'face_dist={o.get("face_dist", 1.5)}'], name)
    blender(os.path.join(HERE, 'chin_bl.py'), [model, os.path.join(r, 'chin'), f'chin={o.get("chin", 0.57)}'], name)
    s = ctx.path('build', 'sheets')
    sheet(os.path.join(s, 'turnaround.webp'), 520, [(n, os.path.join(r, f'{f}.png')) for n, f in (
        ('front', 'front'), ('3/4, the left side of the image', 'l45'), ('side', 'l90'), ('back', 'back'),
        ('3/4, the right side of the image', 'r45'), ('face', 'face'))])
    chin = os.path.join(s, 'chin.webp')
    sheet(chin, 470, [('from below, image left', os.path.join(r, 'chin-right.png')),
                      ('from below', os.path.join(r, 'chin-front.png')),
                      ('from below, image right', os.path.join(r, 'chin-left.png'))])
    review = os.path.join(ROOT, 'reviews', ctx.recipe.get('review') or '-', 'review.json')
    if ctx.flags and os.path.exists(review):
        # the picture beside the item, so the Review shows it (reviews/README.md: paths from the repo root)
        dst = os.path.join(os.path.dirname(review), f'{ctx.id}-marks.webp')
        shutil.copy2(chin, dst)
        item = json.load(open(review))
        item.setdefault('media', []).append({'image': os.path.relpath(dst, ROOT), 'caption': 'Flag: ' + ' '.join(ctx.flags)})
        json.dump(item, open(review, 'w'), indent=1, ensure_ascii=False)
        print('flagged on', os.path.relpath(review, ROOT))
