"""Build proto2/promptlab/: the prompt-lab review page (baseline grid over all local models, the ablation table,
our own masters and derivations, and the day-1 test shots), each image with the blind reviewer's verdict.
Data: art/production/promptlab/{results,verdicts}.json (tools/promptlab.py, tools/promptlab_review.py)."""
import os, re, json, html, subprocess, sys, collections, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import promptlab as P
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUTD = os.path.join(ROOT, 'proto2', 'promptlab')
IMG = os.path.join(OUTD, 'img')
os.makedirs(IMG, exist_ok=True)
res = P.load_results()
ver = json.load(open(os.path.join(P.OUT, 'verdicts.json')))
MODEL_NAME = {'rdbt': 'RDBT Anima', 'janima': 'JANIMA', 'oneobs': 'One Obsession', 'nova': 'Nova Anime AM v5', 'aesthetic': 'Anima Aesthetic',
              'yume': 'Anima Yume', 'miaomiao': 'Miaomiao Anima', 'lumina': 'NetaYume Lumina'}


def img(key, w=960):
    """key 'batch/name' (+ '-hr' allowed). Returns the page-relative path."""
    src = os.path.join(P.OUT, key + '.png')
    dst_name = key.replace('/', '__').replace('+', '_') + '.webp'
    dst = os.path.join(IMG, dst_name)
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        subprocess.run(['magick', src, '-resize', f'{w}x>', '-quality', '80', dst], check=True)
    return 'img/' + dst_name


def verdict_html(key):
    v = ver.get(key + '.png')
    if not v:
        return '<p class="verdict none">Not reviewed.</p>'
    extra = ''.join(f' {k} {v[k]}/5' for k in ('look', 'ref', 'match', 'consistency') if k in v)
    return (f'<p class="verdict {"ok" if v["pass"] else "bad"}"><b>{"Pass" if v["pass"] else "Fail"}</b>. {html.escape(v["reason"])}'
            f'<span class="sc">{extra}</span></p>')


def card(key, w=960, prompt=True, title=None):
    r = res[key]
    meta = f'{MODEL_NAME[r["model"]]}, seed {r["seed"]}, {r["w"]}×{r["h"]}, {r["sampler"]}/{r["scheduler"]} {r["steps"]} steps, CFG {r["cfg"]:g}'
    if r.get('init'):
        meta += f', img2img from {os.path.basename(r["init"]).rsplit(".", 1)[0]} at {r["denoise"]:g}'
    if r.get('control'):
        meta += ', ' + ', '.join(f'LLLite {c[0]} {c[2]:g} to {int(c[3] * 100)}%' for c in r['control'])
    if r.get('secs'):
        meta += f', {r["secs"]:.0f} s'
    p = f'<details><summary>Prompt</summary><p class="prompt">{html.escape(r["prompt"])}</p><p class="prompt neg">Negative: {html.escape(r["neg"])}</p></details>' if prompt else ''
    return (f'<figure><img src="{img(key, w)}" loading="lazy" alt="{html.escape(key)}"><figcaption><h3>{html.escape(title or key.split("/")[1])}</h3>'
            f'{verdict_html(key)}<p class="meta">{html.escape(meta)}</p>{p}</figcaption></figure>')


def rate(prefix_re):
    ks = [k[:-4] for k in ver if re.match(prefix_re, k)]
    n = len(ks)
    if not n:
        return 0, 0, 0, 0
    ps = sum(ver[k + '.png']['pass'] for k in ks)
    look = sum(ver[k + '.png'].get('look', 0) for k in ks) / n
    ref = sum(ver[k + '.png'].get('ref', 0) for k in ks) / n
    return ps, n, look, ref


S = []  # (id, title, html)

# ---- summary ----
NOTES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'promptlab_notes.json')))
S.append(('summary', 'What we found', NOTES['summary']))

# ---- baseline ----
rows = []
for m in P.MODELS:
    ps, n, look, ref = rate(rf'baseline/{m}-\d+\.png')
    t = statistics.median([res[f'baseline/{m}-{s}']['secs'] for s in P.SEEDS])
    rows.append(f'<tr><td>{MODEL_NAME[m]}</td><td>{ps}/{n}</td><td>{look:.1f}</td><td>{ref:.1f}</td><td>{t:.0f} s</td></tr>')
tbl = ('<table><thead><tr><th>Model</th><th>Reviewer pass</th><th>Look</th><th>Close to reference</th><th>Time (base + hires)</th></tr></thead><tbody>'
       + ''.join(rows) + '</tbody></table>')
ref_fig = ('<figure class="ref"><img src="img/reference.webp" alt="reference"><figcaption><h3>The reference (Jørgen)</h3>'
           '<p class="meta">Quality bar only. Never used as a source.</p></figcaption></figure>')
if not os.path.exists(os.path.join(IMG, 'reference.webp')):
    subprocess.run(['magick', os.path.join(ROOT, 'art', 'approved', 'monorail-bay-ref.webp'), '-resize', '960x', '-quality', '80',
                    os.path.join(IMG, 'reference.webp')], check=True)
figs = [ref_fig] + [card(f'baseline/{m}-{s}', 800, prompt=False, title=f'{MODEL_NAME[m]}, seed {s}') for m in P.MODELS for s in P.SEEDS]
S.append(('baseline', '1. Baseline: his exact prompt on every local model',
          f'<p class="desc">{html.escape(NOTES["baseline"])}</p>{tbl}<p class="desc">Full prompt, verbatim:</p><p class="prompt">{html.escape(P.REF)}</p>'
          f'<div class="grid small">{"".join(figs)}</div>'))

# ---- ablations ----
AB = NOTES['ablations']  # variant -> what changed
rows = []
for m in ('rdbt', 'oneobs'):
    base_ps, base_n, bl, br = rate(rf'baseline/{m}-\d+\.png')
    rows.append(f'<tr class="base"><td>{MODEL_NAME[m]}</td><td>baseline</td><td>his prompt, house negative, Euler A 30 steps CFG 5, 1216×832</td>'
                f'<td>{base_ps}/{base_n}</td><td>{bl:.1f}</td><td>{br:.1f}</td></tr>')
    for var, what in AB.items():
        ps, n, look, ref = rate(rf'ablate-{m}/{re.escape(var)}-\d+\.png')
        if n:
            rows.append(f'<tr><td>{MODEL_NAME[m]}</td><td>{html.escape(var)}</td><td>{html.escape(what)}</td><td>{ps}/{n}</td><td>{look:.1f}</td><td>{ref:.1f}</td></tr>')
tbl = ('<table><thead><tr><th>Model</th><th>Variant</th><th>The one change</th><th>Pass</th><th>Look</th><th>Ref</th></tr></thead><tbody>'
       + ''.join(rows) + '</tbody></table>')
ab_figs = [card(k[:-4], 640, title=k[:-4].split('/')[1]) for k in sorted(ver) if k.startswith('ablate-')]
S.append(('ablations', '2. Ablations: one change at a time',
          f'<p class="desc">{html.escape(NOTES["ablations_note"])}</p>{tbl}<details class="all"><summary>All {len(ab_figs)} ablation images with verdicts</summary>'
          f'<div class="grid small">{"".join(ab_figs)}</div></details>'))

# ---- our masters and derived shots ----
mk = [k[:-4] for k in sorted(ver) if k.startswith('masters/') and ver[k]['pass']]
S.append(('masters', '3. Our own masters, and shots derived from them',
          f'<p class="desc">{html.escape(NOTES["masters"])}</p><div class="grid">{"".join(card(k) for k in mk)}</div>'))
dk = [k[:-4] for k in sorted(ver) if k.startswith('derive-')]
if dk:
    S.append(('derive', '4. Derivation tests (img2img from our masters)',
              f'<p class="desc">{html.escape(NOTES["derive"])}</p><div class="grid small">{"".join(card(k, 800) for k in dk)}</div>'))

# ---- test shots ----
shot_html = ''
for sid, (title, intent) in NOTES['shots'].items():
    ks = [k[:-4] for k in sorted(ver) if re.match(rf'(shots-\w+/{re.escape(sid)}-\d+|shots2/{re.escape(sid)}-\w+-\d+)\.png$', k)]
    ps = sum(ver[k + '.png']['pass'] for k in ks)
    shot_html += (f'<h3 class="shot">{html.escape(title)}: {ps} of {len(ks)} passed</h3><p class="desc">Intent: {html.escape(intent)}</p>'
                  f'<div class="grid small">{"".join(card(k, 960) for k in ks)}</div>')
S.append(('shots', '5. Day-1 test shots with the recipe', f'<p class="desc">{html.escape(NOTES["shots_note"])}</p>{shot_html}'))

nav = ''.join(f'<a href="#{i}">{html.escape(t)}</a>' for i, t, _ in S)
body = ''.join(f'<section id="{i}"><h2>{html.escape(t)}</h2>{h}</section>' for i, t, h in S)
open(os.path.join(OUTD, 'index.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prompt lab</title>
<style>
:root{--bg:#f4f6f7;--card:#fff;--ink:#15191d;--mute:#56606a;--line:#d8dde2;--acc:#0e8a96}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:2100px;margin:0 auto;padding:24px 16px 80px}h1{margin:0 0 6px;font-size:26px}.intro{color:var(--mute);max-width:900px;margin:0 0 8px}
nav{display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0 4px;font-size:14px}nav a{color:var(--acc)}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:18px 0}h2{margin:0 0 6px;font-size:20px}
h3.shot{font-size:17px;margin:18px 0 2px}.desc{margin:0 0 12px;color:var(--mute);max-width:980px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:16px}
.grid.small{grid-template-columns:repeat(auto-fill,minmax(min(100%,480px),1fr))}
figure{margin:0;background:#eef1f3;border-radius:8px;padding:6px}figure.ref{outline:2px solid var(--acc)}
figure img{width:100%;display:block;border-radius:5px;cursor:zoom-in;background:#d5d9dd}
figcaption{padding:6px 4px 2px}figcaption h3{margin:0;font-size:14px}.meta{margin:2px 0;font-size:12px;color:var(--mute)}
.verdict{margin:4px 0;font-size:14px}.verdict.ok{color:#0b6b3a}.verdict.bad{color:#9a2a1c}.verdict.none{color:var(--mute)}.sc{color:var(--mute);font-size:12px;margin-left:6px}
details{font-size:13px;color:var(--mute)}summary{cursor:pointer}.prompt{margin:4px 0;font:12px/1.45 ui-monospace,monospace;color:#39424b;word-break:break-word}
details.all{margin-top:12px;font-size:15px;color:var(--ink)}
.tw{overflow-x:auto}table{border-collapse:collapse;font-size:14px;margin:6px 0 14px;min-width:560px}th,td{border-bottom:1px solid var(--line);padding:5px 10px;text-align:left;vertical-align:top}
th{font-weight:600;background:#eef1f3}tr.base td{font-weight:600}
.summary p,.summary li{max-width:980px}.summary li{margin:3px 0}
#lb{position:fixed;inset:0;background:rgba(8,10,12,.95);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:98vw;max-height:88vh}
#lb p{color:#dfe5ea;margin:8px 16px;text-align:center;font-size:15px}
</style></head><body><main>
<h1>Prompt lab: reference-level scenery from local models</h1>
<p class="intro">Can our local models make scenery like Jørgen's reference, with correct logic, without cloud models? Every image here was judged by a separate strict reviewer that saw only the pictures and a one-line intent, with the model names hidden. Pass means no logic error. Look (finish quality), ref (closeness to the reference) and match (fit with the approved RDBT locations) are scored out of 5. Click an image to enlarge; arrow keys step through, Esc closes.</p>
<nav>''' + nav + '</nav>' + body.replace('<table>', '<div class="tw"><table>').replace('</table>', '</table></div>') + '''</main><div id="lb"><div><img alt=""><p></p></div></div>
<script>
const imgs=[...document.querySelectorAll('figure img')],lb=document.getElementById('lb'),li=lb.querySelector('img'),lp=lb.querySelector('p');let cur=-1;
function show(i){cur=(i+imgs.length)%imgs.length;li.src=imgs[cur].src;lp.textContent=imgs[cur].alt;lb.classList.add('on')}
imgs.forEach((im,i)=>im.onclick=()=>show(i));lb.onclick=()=>{lb.classList.remove('on');cur=-1};
addEventListener('keydown',e=>{if(cur<0)return;if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='Escape'){lb.classList.remove('on');cur=-1}});
</script></body></html>''')
print('ok', sum(1 for _ in os.listdir(IMG)), 'images')
