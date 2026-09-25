"""Build proto2/monorail/: Jørgen's monorail references, their RDBT style-matched versions (img2img denoise sweep) and
outside shots derived from the bay master that show progress toward the island. Renders come from tools/promptlab.py
(batch 'stylematch'); reviewer verdicts from art/production/promptlab/verdicts.json; my notes from NOTES below."""
import os, json, html, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import promptlab as P
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUTD = os.path.join(ROOT, 'proto2', 'monorail')
SM = os.path.join(P.OUT, 'stylematch')
res = P.load_results()
ver = json.load(open(os.path.join(P.OUT, 'verdicts.json'))) if os.path.exists(os.path.join(P.OUT, 'verdicts.json')) else {}
MODEL_NAME = {'rdbt': 'RDBT Anima', 'oneobs': 'One Obsession'}


def webp(src, dst, w=1600):
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        subprocess.run(['magick', src, '-resize', f'{w}x>', '-quality', '86', dst], check=True)


def fig(src_rel, title, note='', prompt='', meta='', verdict=None, cls=''):
    body = f'<p class="note">{html.escape(note)}</p>' if note else ''
    if verdict:
        ok = verdict['pass']
        body += (f'<p class="verdict {"ok" if ok else "bad"}">Reviewer: {"pass" if ok else "fail"}. {html.escape(verdict["reason"])}'
                 + (f' Style match {verdict["match"]}/5.' if 'match' in verdict else '') + '</p>')
    if meta:
        body += f'<p class="meta">{html.escape(meta)}</p>'
    if prompt:
        body += f'<details open><summary>Prompt</summary><p class="prompt">{html.escape(prompt)}</p></details>'
    return (f'<figure class="{cls}"><img src="{src_rel}" loading="lazy" alt="{html.escape(title)}">'
            f'<figcaption><h3>{html.escape(title)}</h3>{body}</figcaption></figure>')


sections = []
# 1. approved RDBT locations for comparison
strip = []
for rel, t in (('../locations1/gate-lobby-2103.webp', 'gate-lobby-2103'), ('../locations1/copyroom-copier-4203.webp', 'copyroom-copier-4203'),
               ('../locations2/office-reverse-5202-fix-a.webp', 'office-reverse-5202-fix-a'), ('../locations2/dorm-worst-c.webp', 'dorm-worst-c')):
    strip.append(f'<figure class="small"><img src="{rel}" loading="lazy" alt="{t}"><figcaption><h3>{t}</h3></figcaption></figure>')
sections.append(('Approved RDBT locations (for comparison)', 'The house style the monorail shots need to sit next to: clean dark lineart, flat cel shading, saturated but even colour.',
                 f'<div class="strip">{"".join(strip)}</div>'))

# 2. style-matched versions of each reference, and 3. progress shots. SHOW lists what goes on the page (passes plus the
# informative failures); every render and verdict is in art/production/promptlab/.
SRC = {'bay': ('bay-ref.webp', P.MASTER_BAY), 'side': ('side-ref.webp', P.MASTER_SIDE), 'interior': ('interior-ref.webp', P.MASTER_INT),
       'side-empty': ('monorail-side-empty.webp', P.SIDE_EMPTY), 'progress': ('bay-ref.webp', P.MASTER_BAY)}
SHOW = {
    'bay': ['bay-rdbt-0.35', 'bay-rdbt-0.45', 'bay-rdbt-0.55', 'bay-rdbt-0.65', 'bay-oneobs-0.45'],
    'side': ['side-rdbt-0.35', 'side-rdbt-0.45', 'side-rdbt-0.55', 'side-oneobs-0.45'],
    'interior': ['interior-rdbt-0.35', 'interior-calm-rdbt-0.25-701', 'interior-oneobs-0.35', 'interior-oneobs-0.45'],
    'side-empty': ['side-empty-calm-rdbt-0.35-701', 'side-empty-calm-rdbt-0.35-702', 'side-empty-calm-rdbt-0.45-702', 'side-empty-rdbt-0.35', 'side-empty-oneobs-0.35'],
    'progress': ['progress-mid-rdbt-0.85-711', 'progress3-beam-rdbt-0.7-721', 'progress3-beam-rdbt-0.6-721',
                 'progress3-near-crop-rdbt-0.55-721', 'progress3-near-crop-rdbt-0.45-721', 'progress-near-oneobs-0.85-711'],
}
NOTE = {
    'bay-rdbt-0.45': 'My pick for the style match: same composition, RDBT line and colour.',
    'bay-rdbt-0.55': 'Also good; a little more RDBT, the train slightly redrawn.',
    'bay-rdbt-0.65': 'Too strong: the track starts to loop and pillars grow.',
    'side-rdbt-0.45': 'My pick: RDBT look, nothing added.',
    'side-rdbt-0.55': 'Too strong: a steel gantry appears top right.',
    'interior-rdbt-0.35': 'RDBT always draws white breaking waves under the sill, which puts the carriage at sea level. Every RDBT interior failed on this, even at 0.25 with "The sea far below is calm and flat, no waves."',
    'interior-calm-rdbt-0.25-701': 'The calm-sea line and the lowest strength: still surf under the sill.',
    'interior-oneobs-0.45': 'One Obsession keeps the sea calm, but its look is softer than the RDBT locations (reviewer style match 3/5).',
    'side-empty-calm-rdbt-0.35-701': 'My pick for the game background: RDBT look, calm sea. The calm-sea sentence fixed this one (the version with the man still gets surf).',
    'side-empty-rdbt-0.35': 'Without the calm-sea sentence: cresting waves at the sill.',
    'progress-mid-rdbt-0.85-711': 'Island at mid distance, five cars. Made from the original master at high strength; most seeds at this strength grew 8 to 12 car trains, ordinary rails or a mountain mainland.',
    'progress3-beam-rdbt-0.7-721': 'From the style-matched bay (bay-rdbt-0.45) at 0.7, with "four cars" and "a single smooth concrete monorail beam without rails" in the prompt. Still eight or nine cars.',
    'progress3-beam-rdbt-0.6-721': 'Three cars, clean beam; the reviewer failed it because the nose is boxier than your train.',
    'progress3-near-crop-rdbt-0.55-721': 'Near: the island half of bay-rdbt-0.45 cropped, scaled up and repainted at 0.55. Same towers and viaduct as the master, so it reads as the same place, closer.',
    'progress3-near-crop-rdbt-0.45-721': 'Same crop at 0.45; the reviewer saw a melted shape on the far viaduct.',
    'progress-near-oneobs-0.85-711': 'One Obsession: good distance and a four-car train, but soft (style match 2/5).',
}
DESC = {
    'bay': 'The bay master repainted with RDBT. 0.35 to 0.55 keep the geometry; 0.65 starts to redesign the track.',
    'side': 'The side view of one carriage. The windows must show only sea and sky.',
    'interior': 'Straight-on side window from a seat. Only sea and sky in the window, and the carriage is about 15 m up, so no surf right below the sill.',
    'side-empty': 'The empty-seat version, which is the monorail scene background.',
    'progress': 'Outside shots showing the train getting closer. What worked: crop the style-matched master around the island and repaint it at 0.45 to 0.55, so it stays the same place. What did not: asking for a new distance at high strength (0.75 to 0.85). The model then redraws the train as a long commuter train on ordinary rails and turns the island into a mountain coast. No far shot passed. One thing the reviewer noticed: in your bay master the nose of the train is at the left end, so it may be leaving the island rather than heading to it.',
}
os.makedirs(OUTD, exist_ok=True)
for k, (orig, path) in SRC.items():
    if not os.path.exists(os.path.join(OUTD, orig)):
        webp(path, os.path.join(OUTD, orig))
    figs = []
    if k != 'progress':
        figs.append(fig(orig, f'{k} (original)', 'The source for the repaint.' if k != 'side-empty'
                        else 'Your interior with the man repainted as an empty seat and the edges extended to the game\'s background size (1216×832).', cls='cur'))
    for name in SHOW[k]:
        src = os.path.join(SM, name + '.png')
        webp(src, os.path.join(OUTD, name + '.webp'))
        r = res[f'stylematch/{name}']
        m = MODEL_NAME[r['model']]
        base = os.path.basename(r['init']).replace('.png', '').replace('.webp', '')
        figs.append(fig(name + '.webp', name, NOTE.get(name, ''), r['prompt'],
                        f'{m}, img2img from {base}, strength (denoise) {r["denoise"]:g}, seed {r["seed"]}, {r["w"]}×{r["h"]}, Euler A 30 steps, CFG 5',
                        ver.get(f'stylematch/{name}.png')))
    title = 'Progress toward the island (outside shots)' if k == 'progress' else f'Style match: {k}'
    sections.append((title, DESC[k], f'<div class="grid">{"".join(figs)}</div>'))

body = ''.join(f'<section><h2>{html.escape(t)}</h2><p class="desc">{html.escape(d)}</p>{c}</section>' for t, d, c in sections)
open(os.path.join(OUTD, 'index.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Monorail backgrounds</title>
<style>
:root{--bg:#f4f6f7;--card:#fff;--ink:#15191d;--mute:#56606a;--line:#d8dde2;--acc:#0e8a96}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:2100px;margin:0 auto;padding:24px 16px 80px}h1{margin:0 0 6px;font-size:26px}.intro{color:var(--mute);max-width:900px;margin:0 0 8px}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:18px 0}h2{margin:0 0 4px;font-size:20px}.desc{margin:0 0 12px;color:var(--mute);max-width:900px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:16px}
.strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}
figure{margin:0;background:#eef1f3;border-radius:8px;padding:6px}figure.cur{background:#e3e6e9}
figure img{width:100%;display:block;border-radius:5px;cursor:zoom-in;background:#d5d9dd}
figcaption{padding:6px 4px 2px}h3{margin:0;font-size:15px}.note{margin:4px 0;font-size:15px}.meta{margin:2px 0;font-size:12px;color:var(--mute)}
.verdict{margin:4px 0;font-size:14px}.verdict.ok{color:#0b6b3a}.verdict.bad{color:#9a2a1c}
details{font-size:13px;color:var(--mute)}summary{cursor:pointer}.prompt{margin:4px 0;font:12px/1.45 ui-monospace,monospace;color:#39424b;word-break:break-word}
#lb{position:fixed;inset:0;background:rgba(8,10,12,.95);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:98vw;max-height:88vh}
#lb p{color:#dfe5ea;margin:8px 16px;text-align:center;font-size:15px}
</style></head><body><main>
<h1>Monorail backgrounds</h1>
<p class="intro">Your monorail references came from a different model, so next to the RDBT locations they look like another show. Here each one is repainted with RDBT (and One Obsession for comparison) by image-to-image at a few strengths: low strength keeps your composition, higher strength gives more of the house look and more risk. Inside is the side view only; progress toward the island is shown from outside. Each option has its ID as the heading. The reviewer lines come from a separate strict reviewer that saw only the pictures, the originals and the four approved locations. "Style match" is its score against those locations. Click an image to enlarge; arrow keys step through, Esc closes.</p>
''' + body + '''</main><div id="lb"><div><img alt=""><p></p></div></div>
<script>
const imgs=[...document.querySelectorAll('figure img')],lb=document.getElementById('lb'),li=lb.querySelector('img'),lp=lb.querySelector('p');let cur=-1;
function show(i){cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lp.textContent=imgs[cur].alt;lb.classList.add('on')}
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>{lb.classList.remove('on');cur=-1};
addEventListener('keydown',e=>{if(cur<0)return;if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='Escape'){lb.classList.remove('on');cur=-1}});
</script></body></html>''')
print('ok', len(sections))
