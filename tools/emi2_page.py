"""Build proto2/emi2/index.html from art/slice/emi2/<model>/ renders."""
import os, subprocess
ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'art/slice/emi2')
OUT = os.path.join(ROOT, 'proto2/emi2')
os.makedirs(OUT, exist_ok=True)


def conv(src, name):
    dst = os.path.join(OUT, name)
    subprocess.run(['magick', src, '-resize', '560x', '-quality', '86', dst], check=True)
    return name


old = None
for c in ('game/img/ch/emi-smile.webp', 'art/slice/ch/emi-smile.png'):
    if os.path.exists(os.path.join(ROOT, c)):
        old = conv(os.path.join(ROOT, c), 'old-emi.webp'); break

MODELS = [('rdbt', 'RDBT Anima (main)'), ('nova', 'Nova Anime AM (comparison)')]
PORTRAITS = [('work-41', 'Work, seed 41'), ('work-42', 'Work, seed 42'), ('dress-41', 'Off duty, seed 41'), ('dress-42', 'Off duty, seed 42')]
EXPR = [('work-smile', 'Smile'), ('work-laughing', 'Laughing'), ('work-surprised', 'Surprised'), ('work-teasing', 'Teasing'), ('work-neutral', 'Neutral')]


def fig(tag, key, cap):
    p = os.path.join(SRC, tag, f'{key}.png')
    if not os.path.exists(p):
        return ''
    return f'<figure><img src="{conv(p, f"{tag}-{key}.webp")}" loading="lazy"><figcaption>{cap}</figcaption></figure>'


sections = ''
for tag, name in MODELS:
    sections += f'<section><h2>{name}: portraits</h2><div class="imgs">{"".join(fig(tag, k, c) for k, c in PORTRAITS)}</div></section>'
    sections += f'<section><h2>{name}: expressions (work outfit)</h2><div class="imgs five">{"".join(fig(tag, k, c) for k, c in EXPR)}</div></section>'
oldsec = f'<section><h2>Current Emi in the game</h2><div class="imgs"><figure><img src="{old}"><figcaption>Old design</figcaption></figure></div></section>' if old else ''

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Emi redesign</title>
<style>body{{margin:0;background:#f5f6f8;color:#15171c;font:16px/1.5 system-ui,sans-serif}}main{{max-width:1400px;margin:0 auto;padding:28px 20px 60px}}h1{{margin:0 0 4px;font-size:26px}}.intro{{color:#4b5260;max-width:860px}}section{{background:#fff;border:1px solid #dadee4;border-radius:8px;padding:12px;margin:12px 0}}h2{{margin:0 0 8px;font-size:18px}}.imgs{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:start}}.imgs.five{{grid-template-columns:repeat(5,1fr)}}figure{{margin:0}}img{{width:100%;border-radius:6px;display:block}}figcaption{{font-size:13px;color:#4b5260}}@media(max-width:800px){{.imgs,.imgs.five{{grid-template-columns:1fr 1fr}}}}</style></head>
<body><main><h1>Emi redesign</h1><p class="intro">Generated from a written brief only: a 32-year-old British team lead with auburn shoulder-length hair parted on the left, warm brown eyes, tortoiseshell glasses, dimples and round cheeks only when smiling. Same prompts on two models. Safe images only.</p>{oldsec}{sections}</main></body></html>'''
open(os.path.join(OUT, 'index.html'), 'w').write(html)
print('page written', len(os.listdir(OUT)), 'files')
