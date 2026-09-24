"""Build proto2/rmbg/index.html: every sprite cut out by every method, shown over a checkerboard and over a dark scene.
Run with any Python that has Pillow, e.g. ~/ai/rmbg/hf/bin/python tools/rmbg_page.py"""
import os, json, html
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'art/slice/rmbg')
OUT = os.path.join(ROOT, 'proto2/rmbg')
BG = Image.open(os.path.join(ROOT, 'game/img/bg/office.webp')).convert('RGB')
METHODS = [
    ('replicate', 'Replicate (current)', os.path.join(ROOT, 'art/slice/cut'), '851-labs/background-remover in the cloud. The reference.'),
    ('isnet-anime', 'rembg · ISNet anime', os.path.join(SRC, 'isnet-anime'), 'Trained on anime characters. Tiny and very fast on CPU.'),
    ('birefnet-general', 'rembg · BiRefNet general', os.path.join(SRC, 'birefnet-general'), 'BiRefNet via onnx on CPU.'),
    ('birefnet-hr-matting', 'BiRefNet HR matting', os.path.join(SRC, 'birefnet-hr-matting'), 'High-res matting variant: soft alpha, meant for hair. CPU at 2048 px.'),
    ('rmbg2', 'BRIA RMBG-2.0', os.path.join(SRC, 'rmbg2'), 'Popular BiRefNet-based model from BRIA (non-commercial licence). CPU.'),
    ('comfy-lucida', 'ComfyUI · Lucida', os.path.join(SRC, 'comfy-lucida'), 'BiRefNet fine-tune for illustrations and soft alpha, run by ComfyUI\'s built-in node on the GPU.'),
]
H = 760


def checker(w, h, s=24):
    im = Image.new('RGB', (w, h), (205, 205, 205))
    px = im.load()
    for y in range(h):
        for x in range(w):
            if (x // s + y // s) % 2:
                px[x, y] = (245, 245, 245)
    return im


def composite(cut):
    im = Image.open(cut).convert('RGBA')
    w = round(im.width * H / im.height)
    im = im.resize((w, H), Image.LANCZOS)
    chk = checker(w, H)
    chk.paste(im, (0, 0), im)
    scene = BG.resize((round(BG.width * H / BG.height), H)).crop((0, 0, w, H))
    dark = Image.eval(scene, lambda v: int(v * .55))
    dark.paste(im, (0, 0), im)
    out = Image.new('RGB', (w * 2 + 8, H), (255, 255, 255))
    out.paste(chk, (0, 0)); out.paste(dark, (w + 8, 0))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    sprites = sorted(f for f in os.listdir(os.path.join(ROOT, 'art/slice/ch')) if f.endswith('.png'))
    times = {}
    for k, _, _, _ in METHODS:
        p = os.path.join(SRC, f'{k}.json')
        times[k] = json.load(open(p)) if os.path.exists(p) else {}
    avail = [m for m in METHODS if os.path.isdir(m[2])]
    for sp in sprites:
        for k, _, d, _ in avail:
            src = os.path.join(d, sp)
            dst = os.path.join(OUT, f'{k}-{sp[:-4]}.webp')
            if os.path.exists(src) and not os.path.exists(dst):
                composite(src).save(dst, quality=84)
    avg = {k: (sum(t.values()) / len(t) if t else None) for k, t in times.items()}
    order = ['mio-bored', 'rei-smirk', 'ishibashi-suspicious', 'aoi-panic', 'emi-smile', 'jun-neutral', 'goro-smile', 'yuzuki-tired']
    rest = [s[:-4] for s in sprites if s[:-4] not in order]
    legend = ''.join(f'<li><b>{html.escape(n)}</b>: {html.escape(note)} '
                     f'{"Average " + format(avg[k], ".1f") + " s per image." if avg.get(k) else ("Cloud call, a few seconds each, fractions of a cent." if k == "replicate" else "")}</li>'
                     for k, n, _, note in avail)
    rows = ''
    for sp in order + rest:
        cells = ''
        for k, n, _, _ in avail:
            f = f'{k}-{sp}.webp'
            if os.path.exists(os.path.join(OUT, f)):
                t = times.get(k, {}).get(sp + '.png')
                cells += f'<figure><img src="{f}" loading="lazy" alt="{n}"><figcaption>{html.escape(n)}{f" · {t:.1f} s" if t else ""}</figcaption></figure>'
        rows += f'<section><h2>{sp}</h2><div class="imgs">{cells}</div></section>'
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local background removal</title>
<style>body{{margin:0;background:#f5f6f8;color:#15171c;font:16px/1.5 system-ui,sans-serif}}main{{max-width:2400px;margin:0 auto;padding:24px 20px 60px}}h1{{margin:0 0 4px;font-size:26px}}.intro{{color:#4b5260;max-width:900px}}ul{{color:#4b5260;max-width:900px}}section{{background:#fff;border:1px solid #dadee4;border-radius:8px;padding:12px;margin:12px 0}}h2{{margin:0 0 6px;font-size:18px}}
.imgs{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:10px;align-items:start;margin-top:8px}}
figure{{margin:0}}img{{width:100%;border-radius:6px;display:block;cursor:zoom-in}}figcaption{{font-size:14px;color:#4b5260;margin-top:2px}}
#lb{{position:fixed;inset:0;background:rgba(10,12,16,.94);display:none;align-items:center;justify-content:center;flex-direction:column;z-index:9}}#lb.on{{display:flex}}#lb img{{max-width:96vw;max-height:88vh;width:auto;cursor:zoom-out}}#lb p{{color:#eee;margin:8px 0 0}}</style></head>
<body><main><h1>Local background removal</h1>
<p class="intro">Each sprite cut out by every method. Every cell shows the cutout twice: over a checkerboard (to see holes and leftover grey) and over the office scene darkened (to see halos and hair edges). Click to zoom, arrow keys to step through, Esc to close. You are the judge; my notes below are from looking at the results, not a verdict.</p>
<ul>{legend}</ul>
<p class="intro"><b>My read:</b> NOTES_PLACEHOLDER</p>
{rows}</main>
<div id="lb"><img alt=""><p></p></div>
<script>
const figs=[...document.querySelectorAll('figure')],lb=document.getElementById('lb');let i=0;
const show=k=>{{i=(k+figs.length)%figs.length;const f=figs[i];lb.querySelector('img').src=f.querySelector('img').src;lb.querySelector('p').textContent=f.closest('section').querySelector('h2').textContent+' · '+f.querySelector('figcaption').textContent;lb.classList.add('on');}};
figs.forEach((f,k)=>f.querySelector('img').onclick=()=>show(k));lb.onclick=()=>lb.classList.remove('on');
addEventListener('keydown',e=>{{if(!lb.classList.contains('on'))return;if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1);if(e.key==='Escape')lb.classList.remove('on');}});
</script></body></html>'''
    notes = open(os.path.join(SRC, 'notes.txt')).read() if os.path.exists(os.path.join(SRC, 'notes.txt')) else 'Pending.'
    open(os.path.join(OUT, 'index.html'), 'w').write(page.replace('NOTES_PLACEHOLDER', html.escape(notes)))
    print('methods', [m[0] for m in avail], 'sprites', len(sprites))


if __name__ == '__main__':
    main()
