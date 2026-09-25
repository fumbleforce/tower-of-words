"""Build proto2/video2/index.html: the same three sources through each local video option, side by side, plus the puppet demo."""
import os, json, html

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'proto2/video2')
stats = json.load(open(os.path.join(OUT, 'stats.json')))
notes = json.load(open(os.path.join(OUT, 'notes.json')))

OPTIONS = [
    ('5b-plain', 'Wan 2.2 5B, plain prompt', 'Round-1 setup: one sentence of vague motion. 20 steps, CFG 5, 57 frames at 24 fps. Baseline.'),
    ('5b-timed', 'Wan 2.2 5B, timed prompt (option 4)', 'Same model. Motion written out second by second, camera terms, 30 steps, CFG 6, 121 frames at 24 fps (5 s).'),
    ('14b-lx', 'Wan 2.2 14B + Lightning LoRA (option 1)', 'Wan 2.2 I2V A14B fp8 (two experts, 14 GB each, streamed from RAM), lightx2v 4-step LoRA, 4 steps, CFG 1, shift 5, 81 frames at 16 fps.'),
    ('14b-anime', '14B + Lightning + anime LoRAs (option 1b)', 'As above, plus the Civitai "Anime Style" Wan 2.2 LoRA (both experts) and, on portraits, the "live 2d dynamic wallpaper" LoRA (low-noise expert, 0.8).'),
    ('dasiwa', 'DaSiWa Wan 2.2 14B Lightspeed (option 1c)', 'Civitai merge of Wan 2.2 I2V 14B with the 4-step speed-up baked in and anime tuning. fp8, 4 steps, CFG 1, shift 5, 81 frames at 16 fps.'),
]
SOURCES = [
    ('rei', 'Rei (approved RDBT sprite)', 'src-rei.webp'),
    ('mio', 'Mio (approved RDBT sprite)', 'src-mio.webp'),
    ('monorail', 'Monorail scene (the round-1 image)', 'src-monorail.webp'),
]


def esc(s):
    return html.escape(s or '')


def card(src, opt, label):
    name = f'{src}-{opt}'
    st = stats.get(name)
    if not st:
        return f'<article class="clip missing"><h3>{esc(label)}</h3><p>Not rendered: {esc(notes.get(name, "failed or skipped"))}</p></article>'
    note = notes.get(name, '')
    bad = notes.get(name + ':bad')
    tag = f'<span class="tag {"bad" if bad else "ok"}">{"looks bad" if bad else "usable"}</span>' if bad is not None else ''
    return (f'<article class="clip"><video src="{name}.mp4" poster="{name}.poster.webp" muted loop playsinline preload="metadata" controls></video>'
            f'<h3>{esc(label)} {tag}</h3>'
            f'<p class="meta">{st["size"]}, {st["frames"]} frames at {st["fps"]} fps ({st["seconds_of_video"]} s) · '
            f'<b>{st["generation_s"]} s</b> to generate · peak GPU {st["peak_vram_mb_total_gpu"] / 1024:.1f} GB</p>'
            f'<p>{esc(note)}</p>'
            f'<details><summary>Prompt</summary><pre>{esc(st["prompt"])}</pre></details></article>')


summary_rows = ''
for opt, label, desc in OPTIONS:
    clips = [stats[f'{s}-{opt}'] for s, _, _ in SOURCES if f'{s}-{opt}' in stats]
    if not clips:
        summary_rows += f'<tr><td>{esc(label)}</td><td colspan="3">not rendered</td><td>{esc(notes.get(opt, ""))}</td></tr>'
        continue
    t = [c['generation_s'] for c in clips]
    v = max(c['peak_vram_mb_total_gpu'] for c in clips)
    summary_rows += (f'<tr><td>{esc(label)}</td><td>{min(t)}–{max(t)} s</td><td>{v / 1024:.1f} GB</td>'
                     f'<td>{clips[0]["frames"]} @ {clips[0]["fps"]} fps</td><td>{esc(notes.get(opt, ""))}</td></tr>')
summary_rows += (f'<tr><td>Puppet sprite (option 3)</td><td>{esc(notes.get("puppet-time", ""))}</td><td>none at runtime</td>'
                 f'<td>live, 60 fps</td><td>{esc(notes.get("puppet", ""))}</td></tr>')

sections = ''
for src, title, img in SOURCES:
    cards = ''.join(card(src, opt, label) for opt, label, _ in OPTIONS)
    sections += (f'<section class="source" id="{src}"><div class="head"><img src="{img}" alt=""><div><h2>{esc(title)}</h2>'
                 f'<p>{esc(notes.get("src-" + src, ""))}</p><button class="sync">Play all from the start</button></div></div>'
                 f'<div class="grid {"wide" if src == "monorail" else ""}">{cards}</div></section>')

optlist = ''.join(f'<li><b>{esc(l)}.</b> {esc(d)}</li>' for _, l, d in OPTIONS)
LINES = [('game/audio/voice/00e13cec.mp3', '……ふふ。ミオ。今ゲーム中。話しかけないで。'),
         ('game/audio/voice/1a1d6c60.mp3', '静かな場所。……と、ゲーム。人は、ちょっときらい。'),
         ('game/audio/voice/f5108407.mp3', '新人くん、土曜日、ひま？')]
buttons = ''.join(f'<button data-src="../../{p}">▶ {esc(t)}</button>' for p, t in LINES)

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Video round 2</title>
<style>
:root{{--bg:#f5f6f8;--card:#fff;--line:#dadee4;--ink:#15171c;--muted:#4b5260;--accent:#0f766e;--bad:#b42318;--ok:#0f766e}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}}
main{{max-width:1600px;margin:0 auto;padding:24px 16px 60px}}h1{{margin:0 0 6px;font-size:26px}}
.intro{{color:var(--muted);max-width:980px}}.intro li{{margin:3px 0}}
section{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:16px 0}}
h2{{margin:0 0 6px;font-size:20px}}h3{{margin:8px 0 2px;font-size:16px}}
table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}}
.tablewrap{{overflow-x:auto}}
.head{{display:flex;gap:14px;align-items:flex-start;margin-bottom:10px}}.head img{{width:150px;border-radius:6px;flex:none}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:14px}}.grid.wide{{grid-template-columns:repeat(auto-fill,minmax(520px,1fr))}}
.clip video{{width:100%;border-radius:6px;background:#000;display:block}}.clip p{{margin:4px 0;font-size:14px}}.meta{{color:var(--muted)}}
.missing{{border:1px dashed var(--line);border-radius:6px;padding:10px}}
.tag{{font-size:12px;padding:1px 7px;border-radius:10px;color:#fff;vertical-align:2px}}.tag.bad{{background:var(--bad)}}.tag.ok{{background:var(--ok)}}
pre{{white-space:pre-wrap;background:#f0f2f5;padding:8px;border-radius:6px;font-size:12px}}
button{{font:inherit;font-size:14px;border:1px solid var(--accent);background:#fff;color:var(--accent);border-radius:6px;padding:6px 10px;cursor:pointer;margin:3px 4px 3px 0}}
button:hover{{background:#e6f3f1}}
.puppetwrap{{display:grid;grid-template-columns:minmax(0,520px) minmax(0,1fr);gap:18px;align-items:start}}
.puppet canvas{{width:100%;aspect-ratio:896/1152;display:block;border-radius:6px;background:#d6dae0}}
.puppet .fallback{{display:none;width:100%;border-radius:6px}}.puppet.failed canvas{{display:none}}.puppet.failed .fallback{{display:block}}
.fx label{{margin-right:12px;font-size:14px;white-space:nowrap}}
@media(max-width:800px){{.grid,.grid.wide{{grid-template-columns:1fr}}.puppetwrap{{grid-template-columns:1fr}}.head img{{width:90px}}}}
</style></head><body><main>
<h1>Video round 2: three local options, same sources</h1>
<div class="intro"><p>Round 1 (proto2/video) was rejected: the train rippled like a worm and the women barely moved. Here every option gets the same three images:
Rei and Mio from the approved RDBT sprites, and the monorail scene from round 1. All local on the RTX 3080 (10 GB) with 60 GB of RAM; no cloud.
Times are ComfyUI's own execution time (queue waiting excluded). Peak GPU is the whole card, including about 1.4 GB used by the desktop.
The notes under each clip come from checking extracted frames, not from the prompt.</p><ul>{optlist}</ul>
<p>Workflows to open in ComfyUI: tools/workflows/video2-*.json and ~/ai/workflows/video2-*.json. The puppet frames: tools/workflows/puppet-face-inpaint.json.</p></div>
<section><h2>Summary</h2><div class="tablewrap"><table><tr><th>Option</th><th>Time per clip</th><th>Peak GPU</th><th>Length</th><th>Verdict from frame checks</th></tr>{summary_rows}</table></div>
<p>{esc(notes.get("overall", ""))}</p></section>
<section id="puppet"><h2>Option 3: animated sprite (no video model)</h2><div class="puppetwrap">
<div class="puppet" data-dir="puppet/"><canvas></canvas><img class="fallback" src="puppet/base.webp" alt="Mio"><audio preload="none"></audio></div>
<div><p>{esc(notes.get("puppet-how", ""))}</p><p>Play a line of hers (voice A) and the mouth follows the sound:</p><div>{buttons}</div>
<p class="fx">Effects: <label><input type="checkbox" data-fx="blink" checked> blink</label><label><input type="checkbox" data-fx="breath" checked> breathing</label>
<label><input type="checkbox" data-fx="hair" checked> hair</label><label><input type="checkbox" data-fx="head" checked> head tilt</label></p>
<p>{esc(notes.get("puppet", ""))}</p></div></div></section>
{sections}
</main>
<script src="puppet.js"></script>
<script>
document.querySelectorAll('.source').forEach(s => s.querySelector('.sync').addEventListener('click', () => {{
  const vs = s.querySelectorAll('video'); vs.forEach(v => {{ v.currentTime = 0; }}); vs.forEach(v => v.play());
}}));
</script></body></html>'''
open(os.path.join(OUT, 'index.html'), 'w').write(page)
print('written')
