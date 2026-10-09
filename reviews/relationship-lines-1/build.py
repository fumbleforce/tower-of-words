"""Rebuild the reader page for the relationship-lines-1 review from notes/characters/<id>/route.md.
Run: python3 reviews/relationship-lines-1/build.py
Writes index.html, and fills each option's note and the question in review.json from its questions, context and ask fields.
The markdown renderer and page style come from the character-voices-2 reader.
"""
from pathlib import Path
import hashlib, importlib.util, json

BASE = Path(__file__).resolve().parents[2]
OUT = BASE / 'reviews/relationship-lines-1'
_spec = importlib.util.spec_from_file_location('voices2', BASE / 'reviews/character-voices-2/build.py')
voices2 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(voices2)
markdown, inline, esc, CSS, REPO = voices2.markdown, voices2.inline, voices2.esc, voices2.CSS, voices2.REPO

CAST = ['mio', 'kuro', 'rei']
NAMES = {'mio': 'Mio', 'kuro': 'Kuro', 'rei': 'Rei'}
REVIEW = json.loads((OUT / 'review.json').read_text())
OPTS = {o['id']: o for o in REVIEW['options']}


def card(ident, hashes):
    route = (BASE / 'notes/characters' / ident / 'route.md').read_text()
    hashes[ident] = hashlib.sha256(route.encode()).hexdigest()
    opt = OPTS[ident]
    qs = opt['questions']
    return f'''<section class="card" id="{ident}">
<div class="top"><img src="../../{opt['image']}" alt="{NAMES[ident]}, neutral portrait" width="597" height="768">
<div class="qbox"><h2>{ident}</h2><div class="changed"><h3>In short</h3><p>{inline(opt['summary'], ident)}</p></div>
<h3>{'Questions' if len(qs) > 1 else 'Question'} for you</h3><ol class="qs">{''.join('<li>' + inline(q, ident) + '</li>' for q in qs)}</ol>
<p class="how">Answer on the <a href="../../bible/#review/relationship-lines-1">Review page</a>: pick <b>{ident}</b> to approve the plan as it is, pick it and comment to approve it with your changes, or reject it to have it redone.</p></div></div>
<details class="part" open><summary>Steps 1 to 5</summary><article>{markdown(route, ident)}
<p class="source">Source: <a href="{REPO}notes/characters/{ident}/route.md">notes/characters/{ident}/route.md</a></p></article></details>
</section>'''


def main():
    hashes = {}
    cards = ''.join(card(c, hashes) for c in CAST)
    lede = ''.join('<p class="lede">' + inline(p, 'mio') + '</p>' for p in REVIEW['context'])
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Relationship lines, round 1</title><style>{CSS}</style></head>
<body><main><a href="../../bible/#review/relationship-lines-1">Back to Review</a><h1>Mio, Kuro and Rei, step by step</h1>
{lede}
<nav aria-label="Characters">{''.join(f'<a href="#{c}">{c}</a>' for c in CAST)}</nav>
{cards}
<footer>Built by reviews/relationship-lines-1/build.py from notes/characters/&lt;id&gt;/route.md. Issue #357.</footer></main>
<script>function reveal(){{const t=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(t)requestAnimationFrame(()=>t.scrollIntoView({{block:'start'}}));}}addEventListener('hashchange',reveal);reveal();</script>
</body></html>
<!-- Source SHA-256: {json.dumps(hashes, sort_keys=True)} -->
'''
    (OUT / 'index.html').write_text(page)
    for o in REVIEW['options']:
        o['note'] = o['summary'] + ' Questions: ' + ' '.join(f'{n}) {q}' for n, q in enumerate(o['questions'], 1))
    REVIEW['question'] = ' '.join(REVIEW['context']) + ' ' + REVIEW['ask']
    (OUT / 'review.json').write_text(json.dumps(REVIEW, ensure_ascii=False, indent=1) + '\n')
    print('wrote', OUT / 'index.html')


if __name__ == '__main__':
    main()
