"""Build proto2/opening/shots.html for the one-shot pilot: the exterior master from cloud models (staging note, prompt,
candidates with their check), the model and price comparison, and the revised shot list for the whole TV edit.
Run: python3 tools/opening/pilot_page.py"""
import os, sys, html, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shotlist import SHOTS, CLOUD_MASTERS

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CL = os.path.join(ROOT, 'art', 'opening', 'cloud')
OUT = os.path.join(ROOT, 'proto2', 'opening')
CAND = os.path.join(OUT, 'cand')
os.makedirs(CAND, exist_ok=True)
e = html.escape

STAGING = [
    ('Story beat', 'He is on his way to the island he is moving to: the train heads into the city.'),
    ('Script moment', 'Intro, 3.6 s, right after the sky: first sight of the train and the city.'),
    ('Where in the world', 'The train sits on a concrete guideway beam on pillars in the bay; the beam runs on to the island city, which is where the train is going.'),
    ('Camera', 'High above the bay, off to the side of the route, looking across the curve toward the city.'),
    ('Height and scale', 'Beam about 15 m above the water; the train is small in a wide frame; horizon at about 40% from the top.'),
    ('In front of the lens', 'Sea; the beam curving from the lower left across the water to the city on the right horizon; a four-car train on the beam in the lower left; the city of glass towers.'),
    ('Behind the camera', 'The mainland (not prompted).'),
    ('Motion', 'The train moves along the beam toward the city (animated as a slow drift; the picture shows the driver\'s cab at the city end).'),
    ('Light', 'Early morning, low sun just above the horizon, left of the city.'),
    ('Physical sense', 'Train on top of the beam, both ends visible, driver\'s cab toward the city, pillars under the beam, the beam continuous to the island, no boats, no mountains, no second track.'),
]
PROMPT = open(os.path.join(ROOT, 'tools', 'opening', 'cloud_pilot.mjs')).read().split("export const PROMPT = '")[1].split("';")[0].replace("'\n  + '", '')
CAB = ('A short white monorail train of four cars sits on top of the beam in the lower left. The driver\'s cab with its big curved windshield and headlights is at the right end of the train, '
       'the end closest to the city. The left end of the train is a plain flat back with small red tail lights.')
PROMPT_A = PROMPT.replace('A short white monorail train of four cars sits on top of the beam in the lower left, its rounded front car at the right end.', CAB)
SKETCH_LINE = 'Use the attached line drawing only as the layout: horizon, the curve of the beam and pillars, where the train and the city stand. Paint over it completely; no lines from the drawing may remain.'
EDIT_A = ('Edit only the train: give each of the four cars a row of passenger windows and a pair of sliding doors on the visible side, like a passenger monorail. '
          'Keep the driver cab at the right end, the train in the same place on the beam, and everything else in the picture unchanged.')

CANDS = [
    ('ext4-gptimage2-windows.webp', 'pilot-a', 'Passes every check: cab at the right end facing the city, flat back with tail lights at the left, four cars on top of the beam, pillars under it, beam continuous to the island, no boats or mountains. '
     'Made in two steps: GPT Image 2 from the prompt plus our line sketch (it drew the cars without windows), then one GPT Image 2 edit that added windows and doors. 1536×1024; would be upscaled locally.', 'openai/gpt-image-2, $0.12'),
    ('ext-nanobananapro-sketch.png', 'pilot-b', 'Fails direction: the driver\'s cab is at the lower-left end, so the train drives away from the city. Shown because it is the closest to your reference in look. Two edits and a re-prompt could not turn the train around.', 'google/nano-banana-pro, $0.15'),
    ('ext-seedream45-sketch.jpg', 'pilot-c', 'Direction right (front at the right end), but the pillars stand in front of the beam instead of under it.', 'bytedance/seedream-4.5, $0.04'),
]
ALL = [('ext-nanobananapro-text.png', 'Nano Banana Pro, prompt only', 'cab at the lower left (away from the city)'),
       ('ext-nanobananapro-sketch.png', 'Nano Banana Pro, prompt + sketch', 'cab at the lower left'),
       ('ext2-nanobananapro-edit.png', 'Nano Banana Pro, edit "turn the train around"', 'unchanged: cab still at the lower left'),
       ('ext2-nanobananapro-behind.png', 'Nano Banana Pro, "seen from behind"', 'cab still at the lower left'),
       ('ext3-nanobananapro-cab.png', 'Nano Banana Pro, cab described by its parts', 'cab still at the lower left'),
       ('ext-seedream45-text.jpg', 'Seedream 4.5, prompt only', 'train coming toward camera, away from the city; rails on the beam'),
       ('ext-seedream45-sketch.jpg', 'Seedream 4.5, prompt + sketch', 'direction right; pillars in front of the beam'),
       ('ext2-seedream45-edit.jpg', 'Seedream 4.5, edit', 'redrew the whole picture; train leaves the beam'),
       ('ext-gptimage2-text.webp', 'GPT Image 2, prompt only', 'cab at the lower left'),
       ('ext3-gptimage2-cab.webp', 'GPT Image 2, prompt + sketch, cab described', 'direction right; cars have no windows (reads as freight)'),
       ('ext4-gptimage2-windows.webp', 'GPT Image 2, edit of the one above', 'passes'),
       ('ext-flux2pro-sketch.webp', 'FLUX.2 Pro, prompt + sketch', 'cab at the left; ordinary railway train')]
PRICES = [
    ('GPT Image 2 (medium)', '~$0.06 (our ledger estimate; billed by tokens)', '$0.006–0.0135 at 1024², billed by tokens ($8 / $30 per 1M)', 'Only model that put the cab toward the city (with the sketch). Clean, bright, a bit flat.'),
    ('Nano Banana Pro (Gemini 3 Pro Image)', '$0.15 at 1K–2K, $0.30 at 4K', '$0.134', 'Closest to the reference look (soft light, painterly). Ignored the train direction five times.'),
    ('Seedream 4.5', '$0.04', '$0.04', 'Good 2560×1440 output; spatial errors (pillars, rails); edits redraw everything.'),
    ('Seedream 5.0 Pro', '$0.045–0.09', '$0.09', 'Not tested.'),
    ('FLUX.2 Pro', '$0.03 + $0.015 per reference image', '$0.03', 'Wrong train type and direction.'),
    ('Nano Banana 2 (Gemini 3.1 Flash Image)', 'about $0.04–0.07', '$0.067', 'Not tested.'),
]

tiles = []
for f, key, check, model in CANDS:
    src = os.path.join(CL, f)
    dst = os.path.join(CAND, key + '.webp')
    subprocess.run(['magick', src, '-resize', '1600x', '-quality', '88', dst], check=True)
    tiles.append(f'<figure class="opt"><label><input type="radio" name="exterior" value="{key}"> <b>{key}</b> · {e(model)}</label>'
                 f'<img src="cand/{key}.webp" alt="{key}" loading="lazy"><p class="chk">{e(check)}</p></figure>')
small = []
for f, lab, verdict in ALL:
    key = 'm-' + os.path.splitext(f)[0]
    subprocess.run(['magick', os.path.join(CL, f), '-resize', '800x', '-quality', '82', os.path.join(CAND, key + '.webp')], check=True)
    small.append(f'<figure class="sm"><img src="cand/{key}.webp" alt="" loading="lazy"><figcaption><b>{e(lab)}</b><br>{e(verdict)}</figcaption></figure>')
note = ''.join(f'<tr><th>{e(k)}</th><td>{e(v)}</td></tr>' for k, v in STAGING)
prices = ''.join(f'<tr><td>{e(a)}</td><td>{e(b)}</td><td>{e(c)}</td><td>{e(d)}</td></tr>' for a, b, c, d in PRICES)
shots = ''.join(f'<tr{" class=cm" if n in CLOUD_MASTERS else ""}><td>{n}</td><td>{e(tm)}</td><td>{e(ly)}</td><td>{e(src)}</td><td>{e(what)}<div class="st">{e(st)}</div>'
                f'{f"<div class=pr>{e(pr)}</div>" if pr else ""}</td></tr>' for n, tm, ly, src, what, st, pr in SHOTS)

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Opening Pilot Shot</title>
<style>
:root{{--bg:#f5f6f8;--fg:#15171c;--dim:#4b5260;--card:#fff;--line:#dadee4;--acc:#0f8b99}}
body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}}main{{max-width:2000px;margin:0 auto;padding:24px 16px 90px}}
h1{{margin:0 0 6px;font-size:26px}}.intro{{color:var(--dim);max-width:900px}}
section{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:16px 0}}h2{{margin:0 0 8px;font-size:20px}}
table{{border-collapse:collapse;font-size:14px}}table.note{{max-width:1100px;margin-bottom:10px}}table.note th{{text-align:left;padding:2px 12px 2px 0;color:var(--dim);white-space:nowrap;vertical-align:top;font-weight:600}}
table.list td,table.list th{{padding:5px 10px 5px 0;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}}table.list tr.cm td{{background:#eaf6f7}}
.st{{color:var(--dim);font-size:13px}}.pr{{font-size:13px;font-family:ui-monospace,monospace;color:#2b3f4a;margin-top:2px}}
.prompt{{font:13px/1.5 ui-monospace,monospace;background:#eceef1;padding:10px;border-radius:6px;max-width:1100px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:12px}}
.gsm{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:10px}}
figure{{margin:0}}figure.opt{{border:3px solid transparent;border-radius:8px;padding:6px;background:#eceef1}}figure.opt:has(input:checked){{border-color:var(--acc);background:#dcf0f2}}
figure img{{width:100%;display:block;border-radius:5px;cursor:zoom-in;margin-top:4px}}p.chk{{margin:6px 2px 2px;font-size:14px}}
figure.sm figcaption{{font-size:13px;color:var(--dim)}}.scroll{{overflow-x:auto}}
input.c{{width:min(100%,600px);padding:7px 10px;border:1px solid var(--line);border-radius:6px;font:14px system-ui;margin-top:8px}}
.bar{{position:fixed;left:0;right:0;bottom:0;background:#15171c;color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center}}
.bar button{{height:42px;padding:0 20px;border-radius:8px;border:0;background:var(--acc);color:#fff;font:600 16px system-ui;cursor:pointer}}
#lb{{position:fixed;inset:0;background:rgba(10,12,16,.94);display:none;place-items:center;z-index:9}}#lb.on{{display:grid}}#lb img{{max-width:96vw;max-height:92vh}}
</style></head><body><main>
<h1>Opening pilot: one shot, start to finish</h1>
<p class="intro">We test the new process on one shot before anything else: staging note, a short prompt that names only what is visible, a few cloud candidates, my check against the staging list, then your pick. After you pick, I animate just this shot (depth parallax, a few seconds, at its place in the song, 3.6 s) and show it, so you can judge the whole pipeline on one shot. Pilot spend: about $1.10 of Replicate (ledger in tools/spend.json). Click an image to see it full size.</p>
<section id="anim"><h2>Pilot animation: your master, animated (3.2 s at 3.6 s in the song)</h2>
<p class="intro">Your approved master (monorail-bay-ref2), upscaled 2x locally, with a depth map from Depth Anything V2. The camera pushes slowly toward the city while the depth parallax slides the near beam and train against the far sea and skyline; glints on the water change on 2s; a white flash on the cut. It plays two bars here so the motion can be judged; in the full edit the shot is one bar. Live version (plays this part of the song): <a href="index.html">index.html</a> (press R for the review bar).</p>
<video src="pilot-bay.mp4" controls playsinline style="width:min(100%,1280px);display:block;border-radius:6px"></video>
<p class="intro">My frame check: no tearing at the depth edges (train, pillars, beam), pillars stay straight, the train doesn't warp, motion is even from frame to frame. Weak: the parallax is gentle, so it reads more as a camera push than as depth; the train itself does not move along the beam.</p></section>
<section id="exterior"><h2>Earlier pilot candidates (superseded by your master): shot 2: the monorail over the bay, heading into the city</h2>
<table class="note">{note}</table>
<p><b>Prompt for pilot-a</b> (GPT Image 2, with our line sketch tools/promptlab_guides/bay-lines.png attached as the layout):</p><div class="prompt">{e(SKETCH_LINE)} {e(PROMPT_A)}</div>
<p><b>Then one edit</b> of that image (GPT Image 2):</p><div class="prompt">{e(EDIT_A)}</div>
<p><b>First-round prompt</b> (every model; it named the front car only as "rounded front car at the right end", which the models ignored):</p><div class="prompt">{e(PROMPT)}</div>
<h3>Candidates</h3><div class="grid">{"".join(tiles)}</div>
<p><label><input type="radio" name="exterior" value="redo"> redo</label></p><input class="c" type="text" name="exterior-note" placeholder="note (optional)"></section>
<section><h2>Every image the pilot made (12, four models)</h2><p class="intro">The hard part was the direction of the train: most models put the driver's cab at the lower-left end, driving away from the city, whatever the prompt said.</p><div class="gsm">{"".join(small)}</div></section>
<section><h2>Price per image: Replicate and OpenRouter</h2><div class="scroll"><table class="list"><tr><th>Model</th><th>Replicate</th><th>OpenRouter</th><th>In this pilot</th></tr>{prices}</table></div>
<p class="intro">OpenRouter prices are from its own comparison of 11 September 2026 (1024×1024, default settings); ours are 3:2 or 16:9 and may cost more. GPT Image 2 is billed by tokens on both, so its price moves with size and quality. Replicate prices are from Replicate's model pages and our spend ledger. Using OpenRouter needs an API key set up for the tools.</p></section>
<section><h2>Revised shot list for the whole opening (89.6 s)</h2><p class="intro">Written, not rendered. Inside the train we only look out of a side window; progress toward the island is shown from outside. Highlighted rows need a new cloud master (five in all); everything else is already picked, drawn in code, an approved sprite, or made locally from an approved master.</p>
<div class="scroll"><table class="list"><tr><th>#</th><th>Time</th><th>Lyric</th><th>Source</th><th>What we see, staging, prompt</th></tr>{shots}</table></div></section>
</main><div class="bar"><button id="copy">Copy my pick</button><span id="done"></span></div><div id="lb"><img alt=""></div>
<script>
const imgs=[...document.querySelectorAll('figure img')];let cur=-1;const lb=document.getElementById('lb'),li=lb.querySelector('img');
const show=i=>{{cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lb.classList.add('on');}};
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>lb.classList.remove('on');
addEventListener('keydown',e=>{{if(!lb.classList.contains('on'))return;if(e.key==='Escape')lb.classList.remove('on');if(e.key==='ArrowRight')show(cur+1);if(e.key==='ArrowLeft')show(cur-1);}});
document.getElementById('copy').onclick=()=>{{const r=document.querySelector('input[name=exterior]:checked');const n=document.querySelector('input[name=exterior-note]').value.trim();
navigator.clipboard.writeText('Opening pilot pick: '+(r?r.value:'(none)')+(n?' ('+n+')':'')).then(()=>document.getElementById('done').textContent='Copied.');}};
</script></body></html>'''
open(os.path.join(OUT, 'shots.html'), 'w').write(page)
print('ok')
