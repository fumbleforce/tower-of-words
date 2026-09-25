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
TF_INTRO = ('Her first face came out in a different style from the rest of the cast: a long profile that juts forward, and heavy contour shading. '
            'Only the face was repainted (brow to chin, in front of the ear), with RDBT at 0.85 denoise; hair, ear, outfit, hands and framing are the same pixels as before. '
            'The prompt is the style line plus a few plain sentences. Each option is also shown next to Emi, Mio and Sumi, cropped at the same scale. '
            'Nothing goes into the game until you pick one.')
LFL_INTRO = ('The options below compared her profile with faces that look at the viewer, which is not a fair test. Here the angle is the same in each row. '
             'Row 1: Tsubasa as approved, with Emi, Mio and Sumi repainted to look down to the side. Row 2: Tsubasa repainted to turn toward the viewer, '
             'next to the approved Emi, Mio and Sumi. Only the head area was repainted (RDBT, 0.85, or 0.88 for Emi); no face-style words in the prompts, '
             'so Tsubasa keeps her original face style. Known flaws: the turned Tsubasas have a soft seam where the repaint meets the jacket collar, and '
             'two of them gained hair clips (blue in 23, red in 24); Emi\'s hair came out a shade darker. Every crop is the same size (540×560 of the 896×1152 image). Nothing goes into the game.')
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

# Tsubasa face redo (tools/tsubasa_face.py): before and the face options, each also shown next to three cast faces at the same scale.
TF = os.path.join(ROOT, 'art', 'production', 'TF')
TF_PICKS = json.load(open(os.path.join(TF, 'picks.json'))) if os.path.exists(os.path.join(TF, 'picks.json')) else []
TF_REFS = [('Emi', 'art/slice/emi2/r3/rdbt/work-41.png'), ('Mio', 'art/production/B/mio-bored.png'), ('Sumi', 'art/production/D2/new-sumi-201.png')]
FACEBOX = '480x480+200+60'
tf_html = ''
if TF_PICKS:
    def strip(src, out):
        subprocess.run(['magick', 'montage', src] + [os.path.join(ROOT, r) for _, r in TF_REFS] +
                       ['-crop', FACEBOX, '-tile', '4x1', '-geometry', '360x360+3+3', '-quality', '86', os.path.join(OUTD, out)], check=True)
    items = [('before', 'Before (approved reframe)', os.path.join(TF, '..', 'RF', 'tsubasa.png'), os.path.join(ROOT, CAST['tsubasa'][0]))]
    items += [(p['name'], p['label'], os.path.join(TF, p['name'] + '-rf.png'), os.path.join(TF, p['name'] + '.png')) for p in TF_PICKS]
    figs, strips = '', ''
    for name, label, rf, flat in items:
        subprocess.run(['magick', rf, '-resize', '630x', '-quality', '88', os.path.join(OUTD, f'tsubasa-face-{name}.webp')], check=True)
        strip(flat, f'tsubasa-face-{name}-cmp.webp')
        probs = check(rf)
        note = next((p.get('note', '') for p in TF_PICKS if p['name'] == name), '')
        figs += (f'<figure><img src="tsubasa-face-{name}.webp" alt="Tsubasa {html.escape(label)}" loading="lazy"><figcaption><b>{html.escape(label)}</b>'
                 f'{" " + html.escape(note) if note else ""} Frame check: {html.escape("; ".join(probs) or "clear")}.</figcaption></figure>')
        strips += (f'<figure class="cmp"><img src="tsubasa-face-{name}-cmp.webp" alt="{html.escape(label)} next to Emi, Mio and Sumi" loading="lazy">'
                   f'<figcaption>{html.escape(label)}, then Emi, Mio, Sumi at the same scale</figcaption></figure>')
    tf_html = ('<section class="tf"><h2>Tsubasa face redo</h2><p class="intro">' + html.escape(TF_INTRO) + '</p>'
               '<div class="opts">' + figs + '</div><h3>Face next to the cast</h3><div class="cmps">' + strips + '</div></section>')

# Like-for-like (tools/likeforlike.py): row 1 everyone in profile, row 2 everyone turned toward the viewer, same crop size for all.
LFL = os.path.join(ROOT, 'art', 'production', 'LFL')
LFL_PICKS = json.load(open(os.path.join(LFL, 'picks.json'))) if os.path.exists(os.path.join(LFL, 'picks.json')) else None
HEADBOX = {'tsubasa': 230, 'emi': 130, 'mio': 220, 'sumi': 160}  # left edge of a 540x560 box; top 0 (Mio 40)
ORIG = {'tsubasa': CAST['tsubasa'][0], 'emi': TF_REFS[0][1], 'mio': TF_REFS[1][1], 'sumi': TF_REFS[2][1]}
lfl_html = ''
if LFL_PICKS:
    def head(key, src, out):
        x, y = HEADBOX[key], 40 if key == 'mio' else 0
        subprocess.run(['magick', src, '-crop', f'540x560+{x}+{y}', '+repage', '-resize', '360x', '-quality', '86', os.path.join(OUTD, out)], check=True)
        return out
    def fig(img, cap):
        return f'<figure><img src="{img}" alt="{html.escape(cap)}" loading="lazy"><figcaption>{html.escape(cap)}</figcaption></figure>'
    row1 = fig(head('tsubasa', os.path.join(ROOT, ORIG['tsubasa']), 'lfl-tsubasa-orig.webp'), 'Tsubasa, original')
    for k in ('emi', 'mio', 'sumi'):
        n = LFL_PICKS['profile'][k]
        row1 += fig(head(k, os.path.join(LFL, n + '.png'), f'lfl-{k}-profile.webp'), f'{k.capitalize()} in profile ({n})')
    row2 = ''
    for i, n in enumerate(LFL_PICKS['facing']):
        row2 += fig(head('tsubasa', os.path.join(LFL, n + '.png'), f'lfl-tsubasa-facing-{i}.webp'), f'Tsubasa turned to the viewer ({n})')
    for k in ('emi', 'mio', 'sumi'):
        row2 += fig(head(k, os.path.join(ROOT, ORIG[k]), f'lfl-{k}-orig.webp'), f'{k.capitalize()}, original')
    lfl_html = ('<section class="tf"><h2>Like-for-like</h2><p class="intro">' + html.escape(LFL_INTRO) + '</p>'
                '<h3>All in profile, looking down</h3><div class="opts lfl">' + row1 + '</div>'
                '<h3>All turned toward the viewer</h3><div class="opts lfl">' + row2 + '</div></section>')

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
.tf{margin:0 0 20px}.opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:10px;align-items:start}h3{font-size:16px;margin:16px 0 8px}
.lfl{grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))}.cmps{display:grid;gap:10px}.cmp img{max-width:1100px}
#lb{position:fixed;inset:0;background:rgba(8,10,12,.95);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:98vw;max-height:92vh}
</style></head><body><main>
<h1>Cast, reframed</h1>
<p class="intro">In most approved and picked portraits the hair touched or ran off the top edge, and some arms ran off the sides. The renders were made that way: the prompt asked for a waist-up portrait on an 896×1152 canvas and the model fills it to the edges. Kiyoko's new outfits were repainted around the s101 head, so they kept its tight crop. Nothing on the review pages cropped them.</p>
<p class="intro">Fix: each image sits on a larger canvas of the same shape (144 px more on top and 56 px each side; Rei and Kuro, with tall hair, 256 and 100). RDBT paints only where something was cut (hair above the old top edge, elbows at the sides), and the rest of the new border is the image's own background continued. The original pixels are then pasted back, so faces and outfits are unchanged; only a 40 px band along the old edge can differ. The outline on each image marks its frame. These are for your review only; nothing is swapped into the game. Click to enlarge.</p>
''' + lfl_html + tf_html + '''<div class="grid">''' + cards + '''</div></main><div id="lb"><img alt=""></div>
<script>const lb=document.getElementById('lb'),li=lb.querySelector('img');document.querySelectorAll('figure img').forEach(i=>i.onclick=()=>{li.src=i.src;lb.classList.add('on')});lb.onclick=()=>lb.classList.remove('on');addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('on')});</script>
</body></html>''')
print(len(rows), 'characters')
