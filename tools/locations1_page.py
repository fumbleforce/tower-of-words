"""Build proto2/locations1/: review page for the day-1 location backgrounds (round 1).
Shows only the images listed in art/production/L1/picks.json ({"name": "note"}), grouped by location, with the current game image first."""
import os, json, subprocess, html, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from locations1 import STAGING
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
L1 = os.path.join(ROOT, 'art', 'production', 'L1')
OUTD = os.path.join(ROOT, 'proto2', 'locations1')
os.makedirs(OUTD, exist_ok=True)
picks = json.load(open(os.path.join(L1, 'picks.json')))
man = {e['name']: e for e in json.load(open(os.path.join(ROOT, 'art', 'production', 'manifest.json'))) if e['batch'] == 'L1'}

SECTIONS = [
    ('monorail', 'Monorail (inside the carriage), redo', 'game/img/bg/monorail.webp',
     'Redone after your note that round 1 put the carriage at sea level. The car rides on the beam about 15 m up, so the side windows show sky, a low horizon and water far below. No beam or pillars outside the side windows; the island city is small on the horizon on the right (exit) side.'),
    ('gate', 'Gate (security entrance)', 'game/img/bg/gate.webp',
     'Picked: gate-lobby-2103.'),
    ('copyroom', 'Copy room', 'game/img/bg/copyroom.webp',
     'Picked: copyroom-copier-4203.'),
    ('sales', 'Sales (third floor)', 'game/img/bg/sales.webp',
     'Redone after your note that round 1 was too saturated. Back to the plain house prompt the copy room uses, with one change at a time from the earlier semi-realistic version, checked against copy room 4203 for colour.'),
]


def webp(src, dst, w=1600):
    subprocess.run(['magick', src, '-resize', f'{w}x', '-quality', '86', dst], check=True)


out = []
for sid, title, cur, desc in SECTIONS:
    items = []
    cname = f'{sid}-current.webp'
    webp(os.path.join(ROOT, cur), os.path.join(OUTD, cname))
    items.append({'f': cname, 't': 'Current game image (for comparison)', 'note': '', 'prompt': '', 'cur': True})
    for name, note in picks.items():
        if not name.startswith(sid):
            continue
        webp(os.path.join(L1, name + '.png'), os.path.join(OUTD, name + '.webp'))
        e = dict(man[name.replace('-fix', '')])
        if name.endswith('-fix'):
            e['seed'] = f"{e['seed']}, then the left-wall window repainted as bare wall (masked img2img, tools/locations1.py fix())"
        job = re.sub(r'-\d+(-fix)?$', '', name)
        from locations1 import STAGING_ALIAS
        st = STAGING.get(STAGING_ALIAS.get(job, job), {})
        items.append({'f': name + '.webp', 't': name, 'note': note, 'beat': st.get('beat', ''), 'cam': st.get('camera', ''), 'prompt': e['prompt'], 'neg': e['negative'],
                      'meta': f"RDBT Anima, seed {e['seed']}, {e['w']}x{e['h']}, Euler A, 30 steps, CFG 5"})
    out.append({'id': sid, 'title': title, 'desc': desc, 'items': items})

cards = []
idx = 0
for s in out:
    figs = []
    for it in s['items']:
        cls = 'cur' if it.get('cur') else ('picked' if it['note'].startswith('PICKED') else '')
        body = f'<p class="beat">Intent: {html.escape(it["beat"])}</p>' if it.get('beat') else ''
        body += f'<p class="meta">Camera: {html.escape(it["cam"])}</p>' if it.get('cam') else ''
        body += f'<p class="note">{html.escape(it["note"])}</p>' if it['note'] else ''
        if it['prompt']:
            body += (f'<p class="meta">{html.escape(it["meta"])}</p><details open><summary>Prompt</summary><p class="prompt">{html.escape(it["prompt"])}</p></details>'
                     f'<details><summary>Negative</summary><p class="prompt">{html.escape(it["neg"])}</p></details>')
        figs.append(f'<figure class="{cls}"><img src="{it["f"]}" data-i="{idx}" loading="lazy" alt="{html.escape(it["t"])}">'
                    f'<figcaption><h3>{html.escape(it["t"])}</h3>{body}</figcaption></figure>')
        idx += 1
    cards.append(f'<section><h2>{s["title"]}</h2><p class="desc">{s["desc"]}</p><div class="grid">{"".join(figs)}</div></section>')

open(os.path.join(OUTD, 'index.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Day-1 locations</title>
<style>
:root{--bg:#f4f6f7;--card:#fff;--ink:#15191d;--mute:#56606a;--line:#d8dde2;--acc:#0e8a96}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:2100px;margin:0 auto;padding:24px 16px 80px}h1{margin:0 0 6px;font-size:26px}.intro{color:var(--mute);max-width:900px;margin:0 0 8px}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:18px 0}h2{margin:0 0 4px;font-size:20px}.desc{margin:0 0 12px;color:var(--mute);max-width:900px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:16px}
figure{margin:0;background:#eef1f3;border-radius:8px;padding:6px}figure.cur{background:#e3e6e9}figure.picked{background:#d6efe9;outline:3px solid var(--acc)}figure.cur img{opacity:.85}
figure img{width:100%;display:block;border-radius:5px;cursor:zoom-in;aspect-ratio:1216/832;object-fit:cover;background:#d5d9dd}
figcaption{padding:6px 4px 2px}h3{margin:0;font-size:15px}.note{margin:4px 0;font-size:15px}.beat{margin:4px 0;font-size:14px;color:#0b6b74}.meta{margin:2px 0;font-size:12px;color:var(--mute)}
details{font-size:13px;color:var(--mute)}summary{cursor:pointer}.prompt{margin:4px 0;font:12px/1.45 ui-monospace,monospace;color:#39424b;word-break:break-word}
#lb{position:fixed;inset:0;background:rgba(8,10,12,.95);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:98vw;max-height:88vh}
#lb p{color:#dfe5ea;margin:8px 16px;text-align:center;font-size:15px}
</style></head><body><main>
<h1>Day-1 locations</h1>
<p class="intro">Round 2. The gate and copy room are picked. The monorail and Sales are redone after your notes. All drawn with RDBT Anima at the game's shape. The basement office is in the cast round (decide2). Each set starts with the current game image in grey. Nothing is in the game yet. Click an image to enlarge; arrow keys step through, Esc closes.</p>
''' + ''.join(cards) + '''</main><div id="lb"><div><img alt=""><p></p></div></div>
<script>
const imgs=[...document.querySelectorAll('figure img')],lb=document.getElementById('lb'),li=lb.querySelector('img'),lp=lb.querySelector('p');let cur=-1;
function show(i){cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lp.textContent=imgs[cur].alt;lb.classList.add('on')}
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>{lb.classList.remove('on');cur=-1};
addEventListener('keydown',e=>{if(cur<0)return;if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='Escape'){lb.classList.remove('on');cur=-1}});
</script></body></html>''')
print({s['id']: len(s['items']) - 1 for s in out})
