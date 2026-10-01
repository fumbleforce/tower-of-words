# Composite the transparent renders of one attempt onto the review backdrop, save each as webp, and make sheets.
#   python3 tools/style-concepts/sheets.py <style> <attempt> [label]
# Writes <attempt>/<name>.webp per render, <attempt>/sheet-mio.webp, sheet-eric.webp (front, three-quarter, side,
# back, face, face-3q, walk) and sheet.webp (both sheets plus the pair and game views), each with captions.
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
BG = (229, 232, 236)
HERE = os.path.dirname(os.path.abspath(__file__))


def out_root():
    import subprocess
    try:
        common = subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                         text=True).strip()
        return os.path.join(os.path.dirname(common), 'art/parts/style-concepts')
    except Exception:
        return os.path.join(HERE, '../../art/parts/style-concepts')


def font(n):
    for p in ('/usr/share/fonts/TTF/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf',
              '/usr/share/fonts/noto/NotoSans-Regular.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, n)
    return ImageFont.load_default()


def flat(path):
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, BG + (255,))
    bg.alpha_composite(im)
    return bg.convert('RGB')


def grid(items, cols, cell, title):
    f, ft = font(22), font(30)
    w, h = cell
    rows = (len(items) + cols - 1) // cols
    top = 56
    sheet = Image.new('RGB', (cols * w, top + rows * (h + 34)), (250, 250, 250))
    d = ImageDraw.Draw(sheet)
    d.text((14, 12), title, fill=(30, 30, 30), font=ft)
    for n, (cap, im) in enumerate(items):
        x, y = (n % cols) * w, top + (n // cols) * (h + 34)
        k = min((w - 8) / im.width, (h - 8) / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        sheet.paste(im, (x + (w - im.width) // 2, y + 34 + (h - im.height) // 2))
        d.text((x + 8, y + 6), cap, fill=(40, 40, 40), font=f)
    return sheet


def main():
    style, attempt = sys.argv[1], sys.argv[2]
    label = sys.argv[3] if len(sys.argv) > 3 else f'claude-{style} {attempt}'
    base = os.path.join(out_root(), 'claude-' + style, attempt)
    rd = os.path.join(base, 'renders')
    ims = {}
    for fn in sorted(os.listdir(rd)):
        if fn.endswith('.png'):
            name = fn[:-4]
            ims[name] = flat(os.path.join(rd, fn)) if not name.startswith('game-') or name == 'game-angle' else Image.open(os.path.join(rd, fn)).convert('RGB')
            ims[name].save(os.path.join(base, name + '.webp'), quality=90)
    order = ['front', 'three-quarter', 'side', 'back', 'face', 'face-3q', 'walk']
    sheets = []
    for ch in ('mio', 'eric'):
        items = [(f'{ch} {v}', ims[f'{ch}-{v}']) for v in order if f'{ch}-{v}' in ims]
        if items:
            s = grid(items, 4, (520, 520), f'{label}: {ch}')
            s.save(os.path.join(base, f'sheet-{ch}.webp'), quality=88)
            sheets.append(s)
    extra = [(n, ims[n]) for n in ('pair', 'pair-3q') if n in ims]
    if extra:
        s = grid(extra, 2, (700, 700), f'{label}: together')
        s.save(os.path.join(base, 'sheet-pair.webp'), quality=88)
        sheets.append(s)
    game = [(n.replace('game-', 'in the game: '), ims[n]) for n in
            ('game-forecourt-desk', 'game-forecourt-desk-crop', 'game-office-desk', 'game-office-desk-crop',
             'game-forecourt-phone', 'game-office-phone') if n in ims]
    if game:
        s = grid(game, 2, (1050, 680), f'{label}: at the game camera (desktop 1366x860 and phone 390x844)')
        s.save(os.path.join(base, 'sheet-game.webp'), quality=88)
        sheets.append(s)
    if sheets:
        W = max(s.width for s in sheets)
        all_ = Image.new('RGB', (W, sum(s.height for s in sheets)), (250, 250, 250))
        y = 0
        for s in sheets:
            all_.paste(s, (0, y))
            y += s.height
        all_.save(os.path.join(base, 'sheet.webp'), quality=86)
        print('SHEET', os.path.join(base, 'sheet.webp'), all_.size)


if __name__ == '__main__':
    main()
