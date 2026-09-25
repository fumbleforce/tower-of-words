"""Build proto2/cast-fixed/: before/after for the reframed cast portraits (tools/reframe.py).
Before = the original render (896x1152); after = art/production/RF/fixed/<key>.webp (1008x1296, headroom and side room added).
A thin red line on the 'before' image marks the frame edge the head or arms touched (from tools/framecheck.py)."""
import os, sys, html, subprocess, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reframe import CAST, ROOT, FIXED
from framecheck import check

OUTD = os.path.join(ROOT, 'proto2', 'cast-fixed')
os.makedirs(OUTD, exist_ok=True)
NAMES = {'emi': 'Emi', 'mc-it-guy': 'Main character', 'rei': 'Rei', 'mio': 'Mio', 'aoi': 'Aoi', 'kaori': 'Kaori', 'kuro': 'Kuro (玖路)',
         'kiyoko-camel': 'Kiyoko (camel coat, your pick)', 'yuzuki-e': 'Yuzuki (e-201, your pick)', 'nanami-g': 'Nanami (g-204, ID-card desk)',
         'nanami-f': 'Nanami (f-201, night CCTV)', 'tsubasa': 'Tsubasa', 'kanae': 'Kanae', 'sumi': 'Sumi', 'goro': 'Goro', 'jun': 'Jun',
         'ishibashi': 'Ishibashi', 'saki': 'Saki'}
NOTES = json.load(open(os.path.join(FIXED, 'notes.json'))) if os.path.exists(os.path.join(FIXED, 'notes.json')) else {}

rows = []
ORDER = ['kiyoko-camel', 'yuzuki-e', 'nanami-g', 'nanami-f', 'tsubasa', 'kanae', 'sumi', 'goro', 'jun', 'ishibashi', 'saki',
         'emi', 'mc-it-guy', 'rei', 'mio', 'aoi', 'kaori', 'kuro']  # this round's picks first, then the earlier approved cast
for key in ORDER:
    src = CAST[key][0]
    after = os.path.join(FIXED, f'{key}.webp')
    if not os.path.exists(after):
        continue
    subprocess.run(['magick', os.path.join(ROOT, src), '-resize', '560x', '-quality', '86', os.path.join(OUTD, f'{key}-before.webp')], check=True)
    subprocess.run(['magick', after, '-resize', '630x', '-quality', '88', os.path.join(OUTD, f'{key}-after.webp')], check=True)
    before_probs = check(os.path.join(ROOT, src))
    rows.append((key, NAMES.get(key, key), before_probs, NOTES.get(key, '')))

cards = ''.join(
    f'<section><h2>{html.escape(n)}</h2><div class="pair">'
    f'<figure><img src="{k}-before.webp" alt="{html.escape(n)} before" loading="lazy"><figcaption>Before: {html.escape("; ".join(p) or "no edge contact")}</figcaption></figure>'
    f'<figure><img src="{k}-after.webp" alt="{html.escape(n)} after" loading="lazy"><figcaption>After{": " + html.escape(note) if note else ""}</figcaption></figure>'
    '</div></section>' for k, n, p, note in rows)

open(os.path.join(OUTD, 'index.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cast, reframed</title>
<style>
:root{--bg:#f4f6f7;--card:#fff;--ink:#15191d;--mute:#56606a;--line:#d8dde2}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}main{max-width:1500px;margin:0 auto;padding:24px 16px 80px}
h1{margin:0 0 6px;font-size:26px}.intro{color:var(--mute);max-width:900px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,640px),1fr));gap:16px}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px}h2{margin:0 0 8px;font-size:18px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end}figure{margin:0}
figure img{width:100%;display:block;border-radius:5px;cursor:zoom-in;outline:1px solid #c4cad0}figcaption{font-size:13px;color:var(--mute);margin-top:4px}
#lb{position:fixed;inset:0;background:rgba(8,10,12,.95);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:98vw;max-height:92vh}
</style></head><body><main>
<h1>Cast, reframed</h1>
<p class="intro">In most approved and picked portraits the hair touched or ran off the top edge, and some arms ran off the sides. The renders were made that way: the prompt asked for a waist-up portrait on an 896×1152 canvas and the model fills it to the edges. Kiyoko's new outfits were repainted around the s101 head, so they kept its tight crop. Nothing on the review pages cropped them.</p>
<p class="intro">Fix: each image sits on a larger canvas of the same shape (144 px more on top and 56 px each side; Rei and Kuro, with tall hair, 256 and 100). RDBT paints only where something was cut (hair above the old top edge, elbows at the sides), and the rest of the new border is the image's own background continued. The original pixels are then pasted back, so faces and outfits are unchanged; only a 40 px band along the old edge can differ. The outline on each image marks its frame. These are for your review only; nothing is swapped into the game. Click to enlarge.</p>
<div class="grid">''' + cards + '''</div></main><div id="lb"><img alt=""></div>
<script>const lb=document.getElementById('lb'),li=lb.querySelector('img');document.querySelectorAll('figure img').forEach(i=>i.onclick=()=>{li.src=i.src;lb.classList.add('on')});lb.onclick=()=>lb.classList.remove('on');addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('on')});</script>
</body></html>''')
print(len(rows), 'characters')
