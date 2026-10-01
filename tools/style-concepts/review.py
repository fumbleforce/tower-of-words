# Write reviews/char-style-1/review.json from tools/style-concepts/concepts.json: one option per concept (Claude's
# three and Codex's three), its final pair shot first, then the three-quarter pair and its sheets, then every earlier attempt's sheet in order.
#   python3 tools/style-concepts/review.py [--date YYYY-MM-DD]
# A concept made elsewhere (Codex) is an entry with id, label, about and either `dir` + `attempts` laid out like
# Claude's (renders/, sheet*.webp per attempt) or explicit `image` and `images` (repo-relative paths).
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))
ID = 'char-style-1'


def rel(p):
    return p.lstrip('/')


def option(c):
    if c.get('image'):
        return {'id': c['id'], 'label': c['label'], 'image': c['image'], 'images': c.get('images', []),
                'note': c.get('about', '')}
    base = os.path.dirname(rel(c['dir']).rstrip('/'))
    final = rel(c['dir'])
    images = [final + n for n in ('pair-3q.webp', 'sheet-mio.webp', 'sheet-eric.webp', 'sheet-game.webp')]
    lines = [c['about'], 'Attempts, in order:']
    for a, note in c['attempts']:
        lines.append(f'{a}: {note}')
        if final.rstrip('/').endswith(a):
            continue
        images.append(f'{base}/{a}/sheet.webp')
    return {'id': c['id'], 'label': c['label'], 'image': final + 'pair.webp', 'images': images,
            'note': ' '.join(lines)}


def side_by_side(opts, main_root):
    """One picture with every concept's lead image in a row of three, labelled, for the top of the item."""
    from PIL import Image, ImageDraw, ImageFont
    ims = [(o['label'], Image.open(os.path.join(main_root, o['image'])).convert('RGB')) for o in opts]
    W, H = 700, 700
    cols = 3
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W, rows * (H + 44)), (250, 250, 250))
    d = ImageDraw.Draw(sheet)
    try:
        f = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 28)
    except OSError:
        f = ImageFont.load_default()
    for n, (lab, im) in enumerate(ims):
        k = min(W / im.width, H / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        x, y = (n % cols) * W, (n // cols) * (H + 44)
        sheet.paste(im, (x + (W - im.width) // 2, y + 44))
        d.text((x + 12, y + 8), lab, fill=(30, 30, 30), font=f)
    path = 'art/parts/style-concepts/all-six.webp'
    sheet.save(os.path.join(main_root, path), quality=86)
    return path


def main():
    d = sys.argv[sys.argv.index('--date') + 1] if '--date' in sys.argv else date.today().isoformat()
    concepts = json.load(open(os.path.join(HERE, 'concepts.json')))
    item = {
        'title': 'Character style concepts: six ways to model Mio and Eric',
        'date': d,
        'by': 'Claude (concepts A to C) and Codex (concepts A to C)',
        'status': 'open',
        'question': "Which direction or directions should the game's characters take?",
        'multi': True,
        'media': [{'image': rel(c['dir']) + 'sheet.webp', 'caption': f"{c['label']}: contact sheet"}
                  for c in concepts if c.get('dir') and not c.get('image')] +
                 [{'image': c['sheet'], 'caption': f"{c['label']}: contact sheet"} for c in concepts if c.get('sheet')],
        'options': [option(c) for c in concepts],
        'links': [{'label': 'Turn them and play idle and walk (live 3D)', 'href': 'tools/style-concepts/viewer.html'}],
    }
    import subprocess
    common = subprocess.check_output(['git', '-C', ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                     text=True).strip()
    main_root = os.path.dirname(common)
    item['media'].insert(0, {'image': side_by_side(item['options'], main_root), 'caption': 'All concepts side by side'})
    out = os.path.join(ROOT, 'reviews', ID)
    os.makedirs(out, exist_ok=True)
    json.dump(item, open(os.path.join(out, 'review.json'), 'w'), indent=1, ensure_ascii=False)
    print('wrote', os.path.join(out, 'review.json'), len(item['options']), 'options')


if __name__ == '__main__':
    main()
