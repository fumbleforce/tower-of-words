"""Build proto2/monorail/: our own monorail masters made locally from scratch (short prompts, no img2img from Jørgen's
references), and progress shots derived only from our best master. Renders: tools/promptlab.py batches 'masters' and
'progress_ours'; verdicts from the blind reviewer in art/production/promptlab/verdicts.json.
The earlier style-match page (repaints of Jørgen's references, rejected) is in git history before this change."""
import os, json, html, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import promptlab as P
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUTD = os.path.join(ROOT, 'proto2', 'monorail')
res = P.load_results()
ver = json.load(open(os.path.join(P.OUT, 'verdicts.json')))
MODEL_NAME = {'rdbt': 'RDBT Anima', 'oneobs': 'One Obsession'}


def webp(src, dst, w=1600):
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        subprocess.run(['magick', src, '-resize', f'{w}x>', '-quality', '86', dst], check=True)


def fig(key, note=''):
    """key: '<batch>/<name>' in the prompt lab."""
    r = res[key]
    name = key.split('/')[1]
    webp(os.path.join(P.OUT, key + '.png'), os.path.join(OUTD, name + '.webp'))
    v = ver.get(key + '.png')
    body = f'<p class="note">{html.escape(note)}</p>' if note else ''
    if v:
        body += (f'<p class="verdict {"ok" if v["pass"] else "bad"}">Reviewer: {"pass" if v["pass"] else "fail"}. {html.escape(v["reason"])}</p>')
    how = f'{MODEL_NAME[r["model"]]}, seed {r["seed"]}, {r["w"]}×{r["h"]}, Euler A {r["steps"]} steps, CFG {r["cfg"]:g}'
    if r.get('init'):
        how += f', img2img from {os.path.basename(r["init"]).replace(".png", "")} at strength {r["denoise"]:g}'
    body += f'<p class="meta">{html.escape(how)}</p><details open><summary>Prompt</summary><p class="prompt">{html.escape(r["prompt"])}</p></details>'
    return (f'<figure><img src="{name}.webp" loading="lazy" alt="{html.escape(name)}">'
            f'<figcaption><h3>{html.escape(name)}</h3>{body}</figcaption></figure>')


def passes(prefix):
    return sorted(k[:-4] for k, v in ver.items() if k.startswith(prefix) and v['pass'])


SECTIONS = [
    ('Exterior master', 'Made from scratch: your prompt text as written, One Obsession and RDBT, six seeds each, plus six each with a "visible only" rewrite '
     '(the destination and "crossing toward" taken out). Only the passes are shown. 5 of 24 passed; the two One Obsession ones are the only ones near your quality bar. '
     'RDBT turns open scenery into flat poster art (reviewer look 2/5), so One Obsession is the model for these.',
     [('masters/ext-ref-oneobs-906', 'The master the progress shots below are derived from.'), ('masters/ext-ref-oneobs-903', '')]
     + [(k, 'Passes on logic but flat poster style.') for k in passes('masters/ext-ref-rdbt')]),
    ('Interior master: straight-on side window', 'Made from scratch with your interior prompt minus the man, plus "The sea far below is calm and flat, no waves." '
     '9 of 16 passed. One Obsession gives painted windows with calm water seen from above; RDBT gives flat vector art and often striped skies or surf at the sill. '
     'None shows the sun disc and none has exactly two seats (benches of three or four).',
     [(k, '') for k in passes('masters/int-oneobs')] + [(k, 'Passes on logic, but flat vector style.') for k in passes('masters/int-rdbt')]),
    ('Progress toward the island', 'Derived only from our master ext-ref-oneobs-906: cropped toward the island and repainted with One Obsession at low strength, '
     'so the train, beam and island keep their shape. 4 of 12 passed; the best mid and near are shown. The rest mostly had the beam stop right behind the train, '
     'or no visible last car. At these low strengths the view gets only a little closer; a bigger step would need a new master.',
     [('masters/progress-mid-oneobs-0.5-933', 'Mid: the beam continues past the train and the last car is clear.'),
      ('masters/progress-near-oneobs-0.35-933', 'Near: tighter on the island; the beam visibly curves on behind it.')]),
]

os.makedirs(OUTD, exist_ok=True)
body = ''
for t, d, items in SECTIONS:
    figs = ''.join(fig(k, n) for k, n in items) or '<p class="desc">Nothing passed the reviewer.</p>'
    body += f'<section><h2>{html.escape(t)}</h2><p class="desc">{html.escape(d)}</p><div class="grid">{figs}</div></section>'

open(os.path.join(OUTD, 'index.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Monorail backgrounds</title>
<style>
:root{--bg:#f4f6f7;--card:#fff;--ink:#15191d;--mute:#56606a;--line:#d8dde2;--acc:#0e8a96}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:2100px;margin:0 auto;padding:24px 16px 80px}h1{margin:0 0 6px;font-size:26px}.intro{color:var(--mute);max-width:900px;margin:0 0 8px}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:18px 0}h2{margin:0 0 4px;font-size:20px}.desc{margin:0 0 12px;color:var(--mute);max-width:900px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:16px}
figure{margin:0;background:#eef1f3;border-radius:8px;padding:6px}
figure img{width:100%;display:block;border-radius:5px;cursor:zoom-in;background:#d5d9dd}
figcaption{padding:6px 4px 2px}h3{margin:0;font-size:15px}.note{margin:4px 0;font-size:15px}.meta{margin:2px 0;font-size:12px;color:var(--mute)}
.verdict{margin:4px 0;font-size:14px}.verdict.ok{color:#0b6b3a}.verdict.bad{color:#9a2a1c}
details{font-size:13px;color:var(--mute)}summary{cursor:pointer}.prompt{margin:4px 0;font:12px/1.45 ui-monospace,monospace;color:#39424b;word-break:break-word}
#lb{position:fixed;inset:0;background:rgba(8,10,12,.95);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:98vw;max-height:88vh}
#lb p{color:#dfe5ea;margin:8px 16px;text-align:center;font-size:15px}
</style></head><body><main>
<h1>Monorail backgrounds</h1>
<p class="intro">Our own monorail masters, made locally from scratch with short prompts. Your images were used only as the quality bar, never as a source. Every image here passed a separate strict reviewer that saw only the pictures; its line is under each one. The progress shots are derived from our exterior master. Nothing is in the game. Click an image to enlarge; arrow keys step through, Esc closes.</p>
''' + body + '''</main><div id="lb"><div><img alt=""><p></p></div></div>
<script>
const imgs=[...document.querySelectorAll('figure img')],lb=document.getElementById('lb'),li=lb.querySelector('img'),lp=lb.querySelector('p');let cur=-1;
function show(i){cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lp.textContent=imgs[cur].alt;lb.classList.add('on')}
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>{lb.classList.remove('on');cur=-1};
addEventListener('keydown',e=>{if(cur<0)return;if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='Escape'){lb.classList.remove('on');cur=-1}});
</script></body></html>''')
print('ok')
