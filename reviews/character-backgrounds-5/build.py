"""Rebuild the round 5 reader from notes/character-backgrounds/{aoi,emi}.md.
Run: python3 reviews/character-backgrounds-5/build.py
The open questions live in review.json and are shown under each bio.
"""
from pathlib import Path
import html, json, re, posixpath

base = Path(__file__).resolve().parents[2]
out = base / 'reviews/character-backgrounds-5'
repo = 'https://github.com/fumbleforce/tower-of-words/blob/main/'
review = json.loads((out / 'review.json').read_text())
order = [o['id'] for o in review['options']]


def link(raw):
    if raw.startswith('http'):
        return raw
    path, _, frag = raw.partition('#')
    norm = posixpath.normpath('notes/character-backgrounds/' + path)
    return repo + norm + ('#' + frag if frag else '')


def inline(text):
    text = html.escape(text, quote=False)
    return re.sub(r'\[([^]]+)\]\(([^)]+)\)',
                  lambda m: '<a href="' + html.escape(link(m[2])) + '">' + m[1] + '</a>', text)


def article(key):
    md = (base / f'notes/character-backgrounds/{key}.md').read_text()
    paras, title = [], key
    for block in md.split('\n\n'):
        block = block.strip()
        if not block:
            continue
        if block.startswith('# '):
            title = block[2:]
        elif block.startswith('## '):
            paras.append('<h3>' + inline(block[3:]) + '</h3>')
        else:
            paras.append('<p>' + inline(' '.join(block.splitlines())) + '</p>')
    return title, paras


css = """*{box-sizing:border-box}:root{--bg:#f6f8f8;--fg:#203237;--card:#fff;--line:#dce4e5;--muted:#61747a;--link:#146c73;--q:#eef5f5}
@media(prefers-color-scheme:dark){:root{--bg:#141b1d;--fg:#dde7e8;--card:#1c2528;--line:#2e3b3f;--muted:#94a6ab;--link:#6cc6cf;--q:#1f2d30}}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:36px 24px 80px}
h1{font-size:clamp(28px,5vw,42px);line-height:1.15;margin:16px 0}h3{line-height:1.3;margin-top:32px}a{color:var(--link);text-underline-offset:3px}
nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin:24px 0 32px;padding:18px;background:var(--card);border:1px solid var(--line);border-radius:8px}
section{margin:18px 0;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:24px;scroll-margin-top:12px}
.head{display:flex;gap:20px;align-items:center}.head img{width:120px;height:120px;object-fit:cover;object-position:top;border-radius:8px;border:1px solid var(--line)}
.head h2{margin:0;font-size:28px}article{max-width:80ch}article p{margin:18px 0}
.q{background:var(--q);border-radius:8px;padding:6px 20px;margin-top:24px}.q li{margin:12px 0}
article h3+p{font-size:14px;color:var(--muted)}@media(max-width:600px){main{padding:20px 16px 50px}section{padding:18px}.head img{width:84px;height:84px}}"""

parts = ['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
         '<meta name="robots" content="noindex,nofollow"><title>Character bios, round 5</title><style>' + css + '</style></head><body><main>',
         '<a href="../../bible/#review/character-backgrounds-5">Back to Review</a><h1>Character bios, round 5: Aoi and Emi</h1>']
for line in review['context']:
    parts.append('<p>' + html.escape(line) + '</p>')
parts.append('<p><a href="../character-backgrounds-4/index.html">Round 4 (Mio, Kenji, Kuro, Rei)</a></p>')
parts.append('<nav aria-label="Characters">' + ''.join(f'<a href="#{k}">{k.title()}</a>' for k in order) + '</nav>')
for opt in review['options']:
    key = opt['id']
    title, paras = article(key)
    img = '../../' + opt['image']
    parts.append(f'<section id="{key}"><div class="head"><img src="{img}" alt="{title}, portrait"><h2>{title}</h2></div><article>')
    split = next(i for i, p in enumerate(paras) if p.startswith('<h3>'))
    parts += paras[:split]
    parts.append('<div class="q"><h3>Open questions</h3><ol>' + ''.join('<li>' + html.escape(q) + '</li>' for q in opt['questions']) + '</ol></div>')
    parts += paras[split:]
    parts.append('</article></section>')
parts.append('</main></body></html>')
(out / 'index.html').write_text('\n'.join(parts) + '\n')
print('wrote', out / 'index.html')
