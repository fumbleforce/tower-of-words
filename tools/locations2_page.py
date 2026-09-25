"""Build proto2/locations2/: review page for day-1 locations round 2 (basement office from scratch, dorm room).
Shows the images listed in art/production/L2/picks.json ({"name": "note"}); rejects in art/production/L2/rejects.json
({"name": "reason"}) are listed as text at the end of each section."""
import os, json, subprocess, html, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from locations2 import STAGING
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
L2 = os.path.join(ROOT, 'art', 'production', 'L2')
OUTD = os.path.join(ROOT, 'proto2', 'locations2')
os.makedirs(OUTD, exist_ok=True)
picks = json.load(open(os.path.join(L2, 'picks.json')))
rejects = json.load(open(os.path.join(L2, 'rejects.json'))) if os.path.exists(os.path.join(L2, 'rejects.json')) else {}
man = {e['name']: e for e in json.load(open(os.path.join(ROOT, 'art', 'production', 'manifest.json'))) if e['batch'] == 'L2'}

SECTIONS = [
    ('office', 'Basement office: Planning Office 7, B2', 'game/img/bg/office.webp',
     'Redone from scratch, not from option 2. Asked for: a big forgotten room on basement level 2 with a four-desk block in the middle, Emi\'s desk facing it, Mio\'s gaming corner, ramen cups, filing cabinets, fluorescent tubes and no windows. '
     'RDBT gives every room plenty of floor but mostly puts the desks along the walls; only island-5402 has desks in the middle. It would not do a high corner view (four tries, all at eye level). The first image is the wide shot from the doorway.'),
    ('dorm', 'Dorm room (end of day 1)', 'game/img/bg/dorm.webp',
     'His new company dorm room, seen for the first time at night after day 1. Small studio, bed with one pillow at the head end, desk, kitchenette, '
     'three unopened moving boxes that were sent ahead, and the company towers lit up outside the window. The current game image (grey) has pillows at both ends of the bed.'),
]


def webp(src, dst, w=1600):
    subprocess.run(['magick', src, '-resize', f'{w}x', '-quality', '86', dst], check=True)


out = []
for sid, title, cur, desc in SECTIONS:
    items = []
    if cur and os.path.exists(os.path.join(ROOT, cur)):
        cname = f'{sid}-current.webp'
        webp(os.path.join(ROOT, cur), os.path.join(OUTD, cname))
        items.append({'f': cname, 't': 'Current game image (for comparison)', 'note': '', 'prompt': '', 'cur': True})
    for name, note in picks.items():
        if not name.startswith(sid):
            continue
        webp(os.path.join(L2, name + '.png'), os.path.join(OUTD, name + '.webp'))
        e = man[name]
        st = STAGING.get(re.sub(r'-\d+$', '', name), {})
        items.append({'f': name + '.webp', 't': name, 'note': note, 'beat': st.get('beat', ''), 'cam': st.get('camera', ''), 'script': st.get('script', ''),
                      'prompt': e['prompt'], 'neg': e['negative'], 'meta': f"RDBT Anima, seed {e['seed']}, {e['w']}x{e['h']}, Euler A, 30 steps, CFG 5"})
    rej = [(n, r) for n, r in rejects.items() if n.startswith(sid)]
    out.append({'id': sid, 'title': title, 'desc': desc, 'items': items, 'rej': rej})

cards = []
for s in out:
    figs = []
    for it in s['items']:
        cls = 'cur' if it.get('cur') else ''
        body = f'<p class="beat">Intent: {html.escape(it["beat"])}</p>' if it.get('beat') else ''
        body += f'<p class="meta">Script moment: {html.escape(it["script"])}</p>' if it.get('script') else ''
        body += f'<p class="meta">Camera: {html.escape(it["cam"])}</p>' if it.get('cam') else ''
        body += f'<p class="note">{html.escape(it["note"])}</p>' if it['note'] else ''
        if it['prompt']:
            body += (f'<p class="meta">{html.escape(it["meta"])}</p><details open><summary>Prompt</summary><p class="prompt">{html.escape(it["prompt"])}</p></details>'
                     f'<details><summary>Negative</summary><p class="prompt">{html.escape(it["neg"])}</p></details>')
        figs.append(f'<figure class="{cls}"><img src="{it["f"]}" loading="lazy" alt="{html.escape(it["t"])}">'
                    f'<figcaption><h3>{html.escape(it["t"])}</h3>{body}</figcaption></figure>')
    rej = ''
    if s['rej']:
        rej = '<details class="rej"><summary>Rejected before this page (' + str(len(s['rej'])) + ')</summary><ul>' + ''.join(
            f'<li><b>{html.escape(n)}</b>: {html.escape(r)}</li>' for n, r in s['rej']) + '</ul></details>'
    cards.append(f'<section><h2>{s["title"]}</h2><p class="desc">{s["desc"]}</p><div class="grid">{"".join(figs)}</div>{rej}</section>')

open(os.path.join(OUTD, 'index.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Day-1 locations, round 2</title>
<style>
:root{--bg:#f4f6f7;--card:#fff;--ink:#15191d;--mute:#56606a;--line:#d8dde2;--acc:#0e8a96}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:2100px;margin:0 auto;padding:24px 16px 80px}h1{margin:0 0 6px;font-size:26px}.intro{color:var(--mute);max-width:900px;margin:0 0 8px}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:18px 0}h2{margin:0 0 4px;font-size:20px}.desc{margin:0 0 12px;color:var(--mute);max-width:900px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:16px}
figure{margin:0;background:#eef1f3;border-radius:8px;padding:6px}figure.cur{background:#e3e6e9}figure.cur img{opacity:.85}
figure img{width:100%;display:block;border-radius:5px;cursor:zoom-in;background:#d5d9dd}
figcaption{padding:6px 4px 2px}h3{margin:0;font-size:15px}.note{margin:4px 0;font-size:15px}.beat{margin:4px 0;font-size:14px;color:#0b6b74}.meta{margin:2px 0;font-size:12px;color:var(--mute)}
details{font-size:13px;color:var(--mute)}summary{cursor:pointer}.prompt{margin:4px 0;font:12px/1.45 ui-monospace,monospace;color:#39424b;word-break:break-word}
.rej{margin-top:12px;font-size:14px}.rej li{margin:2px 0}
#lb{position:fixed;inset:0;background:rgba(8,10,12,.95);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:98vw;max-height:88vh}
#lb p{color:#dfe5ea;margin:8px 16px;text-align:center;font-size:15px}
</style></head><body><main>
<h1>Day-1 locations, round 2</h1>
<p class="intro">The basement office, redrawn from scratch with more floor space, and the new dorm room where day 1 ends. RDBT Anima at the game's shape, no people. Each image has the intent and the camera position it was staged for, so you can judge it against that. Click an image to enlarge; arrow keys step through, Esc closes.</p>
''' + ''.join(cards) + '''</main><div id="lb"><div><img alt=""><p></p></div></div>
<script>
const imgs=[...document.querySelectorAll('figure img')],lb=document.getElementById('lb'),li=lb.querySelector('img'),lp=lb.querySelector('p');let cur=-1;
function show(i){cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lp.textContent=imgs[cur].alt;lb.classList.add('on')}
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>{lb.classList.remove('on');cur=-1};
addEventListener('keydown',e=>{if(cur<0)return;if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='Escape'){lb.classList.remove('on');cur=-1}});
</script></body></html>''')
print({s['id']: len(s['items']) for s in out})
