"""Build proto2/opening/shots.html: candidate art for the opening's test segment, one section per shot slot with its
staging note, for Jørgen to pick from. Images are copied as webp into proto2/opening/cand/.
Run: python3 tools/opening/shots_page.py"""
import os, sys, json, html, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segment import SLOTS, CUTS, END_BAR

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
BASE = os.path.join(ROOT, 'art', 'opening', 'base')
OUT = os.path.join(ROOT, 'proto2', 'opening')
CAND = os.path.join(OUT, 'cand')
os.makedirs(CAND, exist_ok=True)
tv = json.load(open(os.path.join(ROOT, 'art', 'opening', 'audio', 'tv_map.json')))
B = lambda bar, beat=0: tv['beats'][bar * 4 + beat]


def prompt_of(png):
    if os.path.exists(png[:-4] + '.prompt.txt'):
        return open(png[:-4] + '.prompt.txt').read()
    wf = json.load(open(png[:-4] + '.workflow.json'))
    return [n['inputs']['text'] for n in wf.values() if n.get('class_type') == 'CLIPTextEncode'][0]


sections = []
for sid, title, note, cands in SLOTS:
    tiles = []
    for c, check in cands:
        src = os.path.join(BASE, c + '.png')
        if not os.path.exists(src):
            continue
        dst = os.path.join(CAND, c + '.webp')
        subprocess.run(['magick', src, '-resize', '1216x', '-quality', '88', dst], check=True)
        p = html.escape(prompt_of(src))
        tiles.append(f'<figure class="opt"><label><input type="radio" name="{sid}" value="{c}"> <b>{c}</b></label>'
                     f'<img src="cand/{c}.webp" alt="{c}" loading="lazy"><p class="chk">{html.escape(check)}</p><details><summary>Prompt</summary><p>{p}</p></details></figure>')
    rows = ''.join(f'<tr><th>{html.escape(k)}</th><td>{html.escape(v)}</td></tr>' for k, v in note)
    sections.append(f'<section id="{sid}"><h2>{html.escape(title)}</h2><table class="note">{rows}</table>'
                    f'<div class="grid">{"".join(tiles)}</div>'
                    f'<label class="redo"><input type="radio" name="{sid}" value="redo"> redo this shot</label>'
                    f'<input class="c" type="text" name="{sid}-note" placeholder="note (optional)"></section>')

drawn = [('drawn-phone', 'The company phone\'s new-hire app (10.0 s): 天川 logo, ようこそ typing in, the island map with his dorm pulsing, three rows: ちず, りょう, IDカード (kana only, per the UI rule). Drawn in code; the blurred background has visible ghosting that still needs fixing.'),
         ('drawn-title', 'Song title card (11.6 s): はじめまして pops in letter by letter on the beat, a teal rule, "OPENING THEME". Drawn in code.')]
tiles = ''.join(f'<figure class="opt"><label><input type="radio" name="{n}" value="ok"> <b>{n}</b> ok</label> <label><input type="radio" name="{n}" value="redo"> redo</label>'
                f'<img src="cand/{n}.webp" alt="{n}" loading="lazy"><p class="chk">{html.escape(t)}</p><input class="c" type="text" name="{n}-note" placeholder="note (optional)"></figure>' for n, t in drawn)
sections.append(f'<section id="drawn"><h2>Drawn in code (not generated)</h2><div class="grid">{tiles}</div></section>')

cutrows = []
for i, (what, (bar, beat), lyric) in enumerate(CUTS):
    s = 0.0 if i == 0 else B(bar, beat)
    e = B(*CUTS[i + 1][1]) if i + 1 < len(CUTS) else B(*END_BAR)
    cutrows.append(f'<tr><td>{i + 1}</td><td>{s:.1f}–{e:.1f} s</td><td>{html.escape(what)}</td><td>{html.escape(lyric)}</td></tr>')

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Opening Shot Picks</title>
<style>
:root{{--bg:#f5f6f8;--fg:#15171c;--dim:#4b5260;--card:#fff;--line:#dadee4;--acc:#0f8b99}}
body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}}main{{max-width:2000px;margin:0 auto;padding:24px 16px 90px}}
h1{{margin:0 0 6px;font-size:26px}}.intro{{color:var(--dim);max-width:900px}}
section{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:16px 0}}h2{{margin:0 0 8px;font-size:20px}}
table.note{{border-collapse:collapse;font-size:14px;margin-bottom:10px;max-width:1100px}}table.note th{{text-align:left;padding:2px 12px 2px 0;color:var(--dim);white-space:nowrap;vertical-align:top;font-weight:600}}table.note td{{padding:2px 0}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:12px}}
figure.opt{{margin:0;border:3px solid transparent;border-radius:8px;padding:6px;background:#eceef1}}figure.opt:has(input:checked){{border-color:var(--acc);background:#dcf0f2}}
figure.opt img{{width:100%;display:block;border-radius:5px;cursor:zoom-in;margin-top:4px}}figure.opt label{{cursor:pointer;font-size:14px}}
p.chk{{margin:6px 2px 2px;font-size:14px}}details{{font-size:13px;color:var(--dim)}}details p{{margin:4px 0}}.redo{{display:inline-block;margin:10px 12px 0 0;font-size:14px}}
input.c{{width:min(100%,600px);padding:7px 10px;border:1px solid var(--line);border-radius:6px;font:14px system-ui;margin-top:8px}}
table.cuts{{border-collapse:collapse;font-size:14px}}table.cuts td{{padding:3px 12px 3px 0;border-bottom:1px solid var(--line)}}
.bar{{position:fixed;left:0;right:0;bottom:0;background:#15171c;color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center}}
.bar button{{height:42px;padding:0 20px;border-radius:8px;border:0;background:var(--acc);color:#fff;font:600 16px system-ui;cursor:pointer}}
#lb{{position:fixed;inset:0;background:rgba(10,12,16,.94);display:none;place-items:center;z-index:9}}#lb.on{{display:grid}}#lb img{{max-width:96vw;max-height:92vh}}
</style></head><body><main>
<h1>Opening: shot picks for the test segment</h1>
<p class="intro">The first 21 seconds of the opening (intro and the first two lines of verse 1, on the new 89 s TV edit of the song). Six shots need art; each has one to three candidates, drawn with RDBT Anima and checked against the staging note above it. Pick one per shot, or "redo", then copy your picks at the bottom. Nothing is animated until you've picked. The final approach into the station is left out: it waits for the Blender blockout. Click an image to see it full size (arrow keys step, Esc closes).</p>
<section><h2>Cut list for the segment</h2><table class="cuts">{"".join(cutrows)}</table>
<p class="intro">Shots marked "drawn" are made in code (the company phone's welcome screen and the song title card), not generated art. The song edit: game/audio/music/opening-tv.mp3.</p></section>
{"".join(sections)}
</main><div class="bar"><button id="copy">Copy my picks</button><span id="done"></span></div><div id="lb"><img alt=""></div>
<script>
const imgs=[...document.querySelectorAll('figure.opt img')];let cur=-1;const lb=document.getElementById('lb'),li=lb.querySelector('img');
const show=i=>{{cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lb.classList.add('on');}};
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>lb.classList.remove('on');
addEventListener('keydown',e=>{{if(!lb.classList.contains('on'))return;if(e.key==='Escape')lb.classList.remove('on');if(e.key==='ArrowRight')show(cur+1);if(e.key==='ArrowLeft')show(cur-1);}});
document.getElementById('copy').onclick=()=>{{const out=[...document.querySelectorAll('section[id] figure.opt, section[id]:not(#drawn)')].filter(e=>e.tagName==='SECTION'||e.closest('#drawn')).map(s=>{{const id=s.tagName==='SECTION'?s.id:s.querySelector('b').textContent;const r=s.querySelector('input[type=radio]:checked');const c=s.querySelector('input.c');const n=c?c.value.trim():'';return `${{id}}: ${{r?r.value:'(no pick)'}}${{n?' ('+n+')':''}}`;}}).join('\\n');
navigator.clipboard.writeText('Opening shot picks\\n'+out).then(()=>document.getElementById('done').textContent='Copied.');}};
</script></body></html>'''
open(os.path.join(OUT, 'shots.html'), 'w').write(page)
print('shots.html', len(sections), 'sections')
