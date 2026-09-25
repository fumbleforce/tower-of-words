"""Build proto2/opening/shots.html: the approved monorail shot (C), batch-1 masters for intro + verse 1 (ID, staging line, my check,
prompt), and the revised shot list. Run: python3 tools/opening/masters_page.py"""
import os, sys, html, subprocess, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shotlist import SHOTS

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
M = os.path.join(ROOT, 'art', 'opening', 'masters')
OUT = os.path.join(ROOT, 'proto2', 'opening')
MD = os.path.join(OUT, 'masters')
os.makedirs(MD, exist_ok=True)
e = html.escape
src = open(os.path.join(ROOT, 'tools', 'opening', 'masters1.mjs')).read()
STYLE = 'Match the painting style, colours and golden light of the first attached image. '
HEAD = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, '
PAL = 'Dominant gold and orange, broad deep amber shadow, sparse pale blue sky between the clouds.'


def prompt_of(key):
    m = re.search(r"'" + re.escape(key) + r"': \[(.*?), '\d:\d'\],", src, re.S)
    body = m.group(1)
    parts = re.findall(r"'((?:[^'\\]|\\.)*)'", body)
    txt = ''.join(p.replace("\\'", "'") for p in parts)
    txt = (HEAD if 'HEAD' in body else '') + txt + (PAL if 'PAL' in body and PAL not in txt else '')
    return STYLE + txt.replace('  ', ' ')


# (id, file, shot, staging line, my check)
ITEMS = [
    ('m-sky-1', 'Shot 1, 0.0–3.6 s: the dawn sky', 'Camera at sea level facing the sunrise; horizon a straight line near the bottom; only sky, sun and sea. Tilted down in the player.',
     'Passes: no land, boats or birds; the clouds follow perspective, no repeats in a line.'),
    ('m-pass-1', 'Shot 3, 5.2–6.8 s: the carriages pass in front of the sun', 'Flat side view close to the beam; three cars fill most of the width on top of the level beam; the sun low behind them.',
     'Passes: the train sits on the beam with both ends visible, no second track, no city. Will be cut out and slid right fast.'),
    ('m-him-1', 'Shots 4 and 8, 6.8–10.0 and 16.0–18.8 s: him at the window', 'Flat side view inside the carriage: his profile in the left third facing right, dark against a big bright window; the sea far below, horizon low.',
     'Mostly passes: glasses, short beard, grey hoodie under a navy blazer, looking out at the sea (no track visible, correct for a side window). Unsure: in the backlight his hair reads darker than the approved dark-blond; the face is in shadow so the fair skin barely shows.'),
    ('m-window-1', 'Shot 7, 12.8–16.0 s (朝のモノレール 窓の外): the window', 'Frontal view of one side window from the seat opposite; seat backs and frame dark; sea far below, horizon low, the sun.',
     'Passes: side view shows only sea and sky, no track; light shafts fall into the carriage.'),
    ('m-city-2', 'Shot 9, 18.8–21.2 s (知らない街が 光ってる): the city shining', 'Flat side view from sea level; the island city a band on the horizon with both ends visible; big sky above.',
     'Passes: an island with open sea beyond both ends, glass glowing, no landmark tower or mountains.'),
    ('m-city-1', 'Shot 9, alternative', 'Same staging.', 'Fails one check: the skyline runs off both edges, so it reads as a coastline, not an island.'),
    ('m-station-1', 'Shot 10, 21.2–24.4 s: arrival at the station', 'Flat side view across the platform; the stopped car behind glass platform doors; low sun, long shadows on the tiles.',
     'Passes: no rails, no people, no signs. The car\'s doors are closed; in the player they would slide open as a cel.'),
    ('m-street-1', 'Shot 12, 27.6–31.6 s: he walks into the company city', 'Frontal view down a wide street between glass towers; the low sun at the end; him small in the middle, from behind.',
     'Mostly passes: approved outfit from behind, one figure, no signs. Flaw: a low hill at the end of the street (the island is flat).'),
]

cards = []
for k, title, stage, check in ITEMS:
    f = os.path.join(M, k + '.webp')
    subprocess.run(['magick', f, '-resize', '1600x1600>', '-quality', '88', os.path.join(MD, k + '.webp')], check=True)
    key = k.rsplit('-', 1)[0] if k.endswith('-1') else k
    cards.append(f'<figure class="opt"><label><input type="radio" name="{e(title.split(":")[0])}" value="{k}"> <b>{k}</b> · {e(title)}</label>'
                 f'<img src="masters/{k}.webp" alt="{k}" loading="lazy"><p class="st"><b>Staging:</b> {e(stage)}</p><p class="chk"><b>My check:</b> {e(check)}</p>'
                 f'<details><summary>Prompt (GPT Image 2, with approved C attached as the style reference{", and his approved sprite" if k in ("m-him-1", "m-street-1") else ""})</summary><p>{e(prompt_of(key))}</p></details>'
                 f'<label class="redo"><input type="checkbox" name="redo-{k}"> redo</label></figure>')
rows = ''.join(f'<tr><td>{n}</td><td>{e(tm)}</td><td>{e(ly)}</td><td>{e(s)}</td><td>{e(w)}<div class="st">{e(st)}</div><div class="st">{e(mv)}</div></td></tr>'
               for n, tm, ly, s, w, st, mv in SHOTS)
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Opening Shot Masters</title>
<style>
:root{{--bg:#f5f6f8;--fg:#15171c;--dim:#4b5260;--card:#fff;--line:#dadee4;--acc:#0f8b99}}
body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}}main{{max-width:2000px;margin:0 auto;padding:24px 16px 90px}}
h1{{margin:0 0 6px;font-size:26px}}.intro{{color:var(--dim);max-width:900px}}
section{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:16px 0}}h2{{margin:0 0 8px;font-size:20px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:12px}}
figure{{margin:0}}figure.opt{{border:3px solid transparent;border-radius:8px;padding:6px;background:#eceef1}}figure.opt:has(input[type=radio]:checked){{border-color:var(--acc);background:#dcf0f2}}
figure img{{width:100%;display:block;border-radius:5px;cursor:zoom-in;margin-top:4px}}p.st,p.chk{{margin:6px 2px 2px;font-size:14px}}.redo{{font-size:14px}}
details{{font-size:13px;color:var(--dim)}}details p{{margin:4px 0}}
table{{border-collapse:collapse;font-size:14px}}td,th{{padding:5px 10px 5px 0;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}}div.st{{color:var(--dim);font-size:13px}}.scroll{{overflow-x:auto}}
input.c{{width:min(100%,600px);padding:7px 10px;border:1px solid var(--line);border-radius:6px;font:14px system-ui;margin-top:8px}}
.bar{{position:fixed;left:0;right:0;bottom:0;background:#15171c;color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center}}
.bar button{{height:42px;padding:0 20px;border-radius:8px;border:0;background:var(--acc);color:#fff;font:600 16px system-ui;cursor:pointer}}
#lb{{position:fixed;inset:0;background:rgba(10,12,16,.94);display:none;place-items:center;z-index:9}}#lb.on{{display:grid}}#lb img{{max-width:96vw;max-height:92vh}}
</style></head><body><main>
<h1>Opening: masters for the intro and verse 1</h1>
<p class="intro">Your method: simple, flat compositions (side-on or frontal), strong light and a big painted sky, animated as layered cels. Your approved monorail shot (C) is the style reference for every master below, so they share its light and palette. Seven shots need new art in this batch; the phone, the logo and the ID card are drawn in code, and the gate uses your approved location. Pick what works, mark "redo" on the rest. Nothing is animated until you've picked. Batch cost: $0.48 of Replicate (GPT Image 2). Click an image to see it full size.</p>
<section><h2>Approved: shot 2, the monorail (C)</h2><video src="pilot-c-silhouette.mp4" controls playsinline style="width:min(100%,1100px);display:block;border-radius:6px"></video>
<p class="intro">Live in the player: <a href="index.html">index.html</a>.</p></section>
<section><h2>New masters</h2><div class="grid">{"".join(cards)}</div><input class="c" type="text" name="note" placeholder="note (optional)"></section>
<section><h2>Revised shot list, intro and verse 1 (0–37 s)</h2><p class="intro">Every shot is flat and readable. The chorus and verse 2 are planned in the next batch.</p>
<div class="scroll"><table><tr><th>#</th><th>Time</th><th>Lyric</th><th>Source</th><th>What we see · staging · motion</th></tr>{rows}</table></div></section>
</main><div class="bar"><button id="copy">Copy my picks</button><span id="done"></span></div><div id="lb"><img alt=""></div>
<script>
const imgs=[...document.querySelectorAll('figure img')];let cur=-1;const lb=document.getElementById('lb'),li=lb.querySelector('img');
const show=i=>{{cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lb.classList.add('on');}};
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>lb.classList.remove('on');
addEventListener('keydown',e=>{{if(!lb.classList.contains('on'))return;if(e.key==='Escape')lb.classList.remove('on');if(e.key==='ArrowRight')show(cur+1);if(e.key==='ArrowLeft')show(cur-1);}});
document.getElementById('copy').onclick=()=>{{const picks=[...document.querySelectorAll('input[type=radio]:checked')].map(r=>r.value);const redo=[...document.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.name.slice(5));
const n=document.querySelector('input[name=note]').value.trim();
navigator.clipboard.writeText('Opening masters, picked: '+(picks.join(', ')||'(none)')+'; redo: '+(redo.join(', ')||'(none)')+(n?'; note: '+n:'')).then(()=>document.getElementById('done').textContent='Copied.');}};
</script></body></html>'''
open(os.path.join(OUT, 'shots.html'), 'w').write(page)
print('ok', len(cards))
