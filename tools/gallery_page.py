"""Build proto2/gallery/index.html from art/production/manifest.json (webp previews, large grid, lightbox, prompt per image)."""
import json, os, html, subprocess
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'art', 'production')
OUT = os.path.join(ROOT, 'proto2', 'gallery')
os.makedirs(OUT, exist_ok=True)
TITLES = {'A': 'A. New characters', 'B': 'B. Cast expression sets (RDBT)', 'C': 'C. Environments', 'D': 'D. Story scenes (RDBT and JANIMA)'}
NOTES = {
    'A': 'Two seeds per character (s101, s102), then four expressions on the picked seed. Model: RDBT Anima.',
    'B': 'Five expressions per existing cast member, one seed per character so the face stays the same. Replaces the older mixed-model sprites once approved.',
    'C': 'No people. Time-of-day variants (day, evening, night) for the office, canteen and rooftop.',
    'D': 'Each scene rendered with RDBT and JANIMA, same prompt and seed, side by side.',
}
m = json.load(open(os.path.join(SRC, 'manifest.json')))
sections = ''
for b in ['A', 'B', 'C', 'D']:
    items = sorted([e for e in m if e['batch'] == b], key=lambda e: e['name'])
    if not items:
        continue
    figs = ''
    for e in items:
        webp = f"{b}-{e['name']}.webp"
        dst = os.path.join(OUT, webp)
        if not os.path.exists(dst):
            subprocess.run(['magick', os.path.join(SRC, e['file']), '-resize', '1400x1400>', '-quality', '85', dst], check=True)
        figs += (f'<figure><img src="{webp}" loading="lazy" alt="{html.escape(e["name"])}">'
                 f'<figcaption><b>{html.escape(e["name"])}</b> · {e["model"]} · seed {e["seed"]}'
                 f'<details><summary>prompt</summary><pre>{html.escape(e["prompt"])}\n\nNegative: {html.escape(e["negative"])}\n\n'
                 f'Euler A, 30 steps, CFG 5, {e["w"]}×{e["h"]}</pre></details></figcaption></figure>')
    sections += f'<section><h2>{TITLES[b]} <span class="n">{len(items)}</span></h2><p class="note">{NOTES[b]}</p><div class="imgs">{figs}</div></section>'

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Art production gallery</title>
<style>body{{margin:0;background:#f5f6f8;color:#15171c;font:16px/1.5 system-ui,sans-serif}}main{{max-width:2400px;margin:0 auto;padding:24px 20px 60px}}h1{{margin:0 0 4px;font-size:26px}}.intro{{color:#4b5260;max-width:860px}}
section{{background:#fff;border:1px solid #dadee4;border-radius:8px;padding:12px;margin:14px 0}}h2{{margin:0 0 2px;font-size:19px}}h2 .n{{font-size:13px;color:#4b5260;font-weight:500}}.note{{color:#4b5260;margin:0 0 8px;font-size:14px}}
.imgs{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,480px),1fr));gap:10px;align-items:start}}figure{{margin:0}}img{{width:100%;border-radius:6px;display:block;cursor:zoom-in}}
figcaption{{font-size:13px;color:#4b5260;margin-top:3px}}details summary{{cursor:pointer;color:#0f8b99}}pre{{white-space:pre-wrap;background:#f0f2f5;padding:8px;border-radius:6px;font-size:12px;margin:4px 0 0}}
#lb{{position:fixed;inset:0;background:rgba(10,12,16,.94);display:none;align-items:center;justify-content:center;flex-direction:column;z-index:9}}#lb.on{{display:flex}}#lb img{{max-width:96vw;max-height:88vh;width:auto;cursor:zoom-out}}#lb p{{color:#eee;margin:8px 0 0}}</style></head>
<body><main><h1>Art production gallery</h1><p class="intro">Everything generated locally on the RTX 3080 in this production run, grouped by batch. Click an image for full screen, arrow keys to step, Esc to close. Open "prompt" under an image to see exactly what it was given.</p>{sections}</main>
<div id="lb"><img alt=""><p></p></div>
<script>
const figs=[...document.querySelectorAll('figure')],lb=document.getElementById('lb');let i=0;
const show=k=>{{i=(k+figs.length)%figs.length;const f=figs[i];lb.querySelector('img').src=f.querySelector('img').src;lb.querySelector('p').textContent=f.querySelector('b').textContent+' · '+f.closest('section').querySelector('h2').firstChild.textContent;lb.classList.add('on');}};
figs.forEach((f,k)=>f.querySelector('img').onclick=()=>show(k));lb.onclick=()=>lb.classList.remove('on');
addEventListener('keydown',e=>{{if(!lb.classList.contains('on'))return;if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1);if(e.key==='Escape')lb.classList.remove('on');}});
</script></body></html>'''
open(os.path.join(OUT, 'index.html'), 'w').write(page)
print('gallery', sum(1 for e in m), 'images')
