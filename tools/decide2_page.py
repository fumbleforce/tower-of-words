"""Build proto2/decide2/: chooser for cast decision round 2 (same format as proto2/decide)."""
import os, json, shutil, subprocess
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = os.path.join(ROOT, 'proto2')
OUTD = os.path.join(P, 'decide2')
D2 = os.path.join(ROOT, 'art', 'production', 'D2')
os.makedirs(OUTD, exist_ok=True)


def webp(src, name, w=640):
    dst = os.path.join(OUTD, f'{name}.webp')
    if os.path.exists(src):
        subprocess.run(['magick', src, '-resize', f'{w}x', '-quality', '86', dst], check=True)
        return name


NOTES = json.load(open(os.path.join(D2, 'notes.json'))) if os.path.exists(os.path.join(D2, 'notes.json')) else {}

REF = [('proto2/emi2/r3-rdbt-work-41.webp', 'Emi (approved)'), ('proto2/gallery/M-02-it-guy-601.webp', 'Main character (approved)'),
       ('proto2/gallery/B-rei-smirk.webp', 'Rei'), ('proto2/gallery/B-mio-bored.webp', 'Mio'), ('proto2/gallery/B-aoi-grin.webp', 'Aoi'),
       ('proto2/gallery/B-kaori-smile.webp', 'Kaori'), ('proto2/gallery/A-luna-s101.webp', 'Kuro 玖路, night receptionist (approved)')]
ref = []
for i, (src, lab) in enumerate(REF):
    s = os.path.join(ROOT, src)
    if os.path.exists(s):
        shutil.copy(s, os.path.join(OUTD, f'ref-{i}.webp')); ref.append((f'ref-{i}', lab))

SECTIONS = [
    ('yuzuki', 'Yuzuki (PR spokeswoman)', 'Three new designs meant to read clearly apart from Emi. Emi is shown first for comparison (not selectable).', ['yuzuki-a', 'yuzuki-b', 'yuzuki-c'], [('proto2/emi2/r3-rdbt-work-41.webp', 'Emi, for comparison')]),
    ('goro', 'Goro (rooftop gardener)', 'RDBT version of the FLUX Goro you picked (a), plus a variant (b). FLUX original shown first.', ['goro-a', 'goro-b'], [('proto2/cast-mappa2/goro-3.webp', 'FLUX original')]),
    ('jun', 'Jun (company bar)', 'Three new takes, avoiding the scarred mysterious barman: (a) payroll clerk by day, (b) ex-jazz drummer, (c) a woman bartender.', ['jun-a', 'jun-b', 'jun-c'], []),
    ('ishibashi', 'Ishibashi (gate guard)', '(a) heavy-set with a thermos, (b) bald ex-police with a visitor log, (c) broad ex-athlete with a chin scar.', ['ishibashi-a', 'ishibashi-b', 'ishibashi-c'], []),
    ('saki', 'Saki (legal)', 's102 attitude kept; hair, colours and silhouette moved away from Rei: (a) black bob, burgundy three-piece suit, (b) chestnut side braid, green dress.', ['saki-a', 'saki-b'], [('proto2/gallery/B-rei-smirk.webp', 'Rei, for comparison')]),
    ('kiyoko', 'Kiyoko (faction leader)', 'Same s101 face (masked and kept), new outfits: plum kimono-collar coat, camel suit with silk scarf, green dress with jade.', ['kiyoko-plum', 'kiyoko-camel', 'kiyoko-green'], [('proto2/gallery/A-kiyoko-s101.webp', 's101 original')]),
    ('nanami', 'Nanami (security)', '(a) braided, coffee in hand, (b) freckled and eager, (c) ponytail, radio.', ['nanami-a', 'nanami-b', 'nanami-c'], []),
    ('office', 'Basement office (from option 2)', 'Option 2 repainted: more space, chairs at the desks, empty ramen cups.', ['office'], [('proto2/gallery/O-office-basement-502.webp', 'option 2 (before)')]),
]
data = []
for sid, title, desc, prefixes, refs in SECTIONS:
    compare = []
    for i, (src, lab) in enumerate(refs):
        s = os.path.join(ROOT, src)
        if os.path.exists(s):
            shutil.copy(s, os.path.join(OUTD, f'{sid}-cmp{i}.webp')); compare.append((f'{sid}-cmp{i}', lab))
    opts = []
    for pre in prefixes:
        for f in sorted(os.listdir(D2)):
            if f.startswith(pre + '-') and f.endswith('.png') and 'mask' not in f:
                n = f[:-4]
                if webp(os.path.join(D2, f), n, 1216 if sid == 'office' else 640):
                    lab = n.replace('-', ' ', 1)
                    opts.append((n, f'{lab}' + (f': {NOTES[n]}' if n in NOTES else '')))
    if not opts:
        desc = 'Not rendered yet (stopped for the day). ' + desc
    data.append((sid, title, desc, opts, compare))
json.dump({'ref': ref, 'sections': data}, open(os.path.join(OUTD, 'data.json'), 'w'), ensure_ascii=False)

open(os.path.join(OUTD, 'index.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Decisions, round 2</title>
<style>
body{margin:0;background:#f5f6f8;color:#15171c;font:16px/1.5 system-ui,sans-serif}main{max-width:2000px;margin:0 auto;padding:24px 20px 80px}
h1{margin:0 0 4px;font-size:26px}.intro{color:#4b5260;max-width:860px}
section{background:#fff;border:1px solid #dadee4;border-radius:8px;padding:12px;margin:14px 0}h2{margin:0 0 4px;font-size:19px}section p{margin:0 0 8px;color:#4b5260}
.opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:10px}.opts.wide{grid-template-columns:repeat(auto-fill,minmax(min(100%,460px),1fr))}
.ref{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.ref figure{margin:0}.ref img{width:100%;border-radius:5px;display:block}.ref figcaption{font-size:13px;color:#4b5260}
label.opt,.cmp{display:block;border:3px solid transparent;border-radius:8px;padding:4px;cursor:pointer;background:#eceef1}
.cmp{cursor:default;background:#e4e6ea;opacity:.9}.cmp span{font-style:italic}
label.opt:has(input:checked){border-color:#0f8b99;background:#dcf0f2}
label.opt img,.cmp img{width:100%;display:block;border-radius:5px;background:#d9dce0}
label.opt span,.cmp span{display:flex;gap:6px;align-items:center;font-size:14px;padding:4px 2px}
.row{display:flex;gap:10px;margin-top:8px;align-items:center;flex-wrap:wrap}.row label{font-size:14px;color:#4b5260}
.row input[type=text]{flex:1;min-width:240px;padding:7px 10px;border:1px solid #dadee4;border-radius:6px;font:14px system-ui}
.bar{position:sticky;bottom:0;background:#15171c;color:#fff;padding:12px 20px;display:flex;gap:12px;align-items:center}
.bar button{height:42px;padding:0 20px;border-radius:8px;border:0;background:#0f8b99;color:#fff;font:600 16px system-ui;cursor:pointer}
#lb{position:fixed;inset:0;background:rgba(10,12,16,.94);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:96vw;max-height:92vh}
</style></head><body><main>
<h1>Decisions, round 2</h1>
<p class="intro">Approved designs are shown at the top, so you can judge whether the new ones read as distinct. Pick one option per section (or "redo"), add a note if you like, then copy your picks at the bottom. Double-click any image to see it full size. Grey tiles are for comparison only.</p>
<section><h2>Approved so far (reference)</h2><div class="ref" id="ref"></div></section>
<div id="list"></div></main>
<div class="bar"><button id="copy">Copy my picks</button><span id="done"></span></div>
<div id="lb"><img alt=""></div>
<script>
fetch('data.json').then(r=>r.json()).then(({ref,sections:D})=>{
  document.getElementById('ref').innerHTML=ref.map(([f,l])=>`<figure><img src="${f}.webp" alt=""><figcaption>${l}</figcaption></figure>`).join('');
  const list=document.getElementById('list');
  for(const [id,title,desc,opts,cmp] of D){
    const s=document.createElement('section');
    s.innerHTML=`<h2>${title}</h2>${desc?`<p>${desc}</p>`:''}<div class="opts ${id==='office'?'wide':''}"></div><div class="row"><label><input type="radio" name="${id}" value="redo"> none of these, redo</label><input type="text" data-note="${id}" placeholder="note (optional)"></div>`;
    const box=s.querySelector('.opts');
    for(const [f,lab] of cmp){const d=document.createElement('div');d.className='cmp';d.innerHTML=`<img src="${f}.webp" loading="lazy" alt=""><span>${lab}</span>`;box.append(d);}
    for(const [f,lab] of opts){const l=document.createElement('label');l.className='opt';l.innerHTML=`<img src="${f}.webp" loading="lazy" alt=""><span><input type="radio" name="${id}" value="${f}"> ${lab}</span>`;box.append(l);}
    list.append(s);
  }
  const lb=document.getElementById('lb');document.querySelectorAll('img').forEach(i=>i.ondblclick=e=>{e.preventDefault();lb.querySelector('img').src=i.src;lb.classList.add('on')});lb.onclick=()=>lb.classList.remove('on');
  document.getElementById('copy').onclick=()=>{
    const out=D.map(([id,title])=>{const v=document.querySelector(`input[name="${id}"]:checked`)?.value||'(none)';const n=document.querySelector(`[data-note="${id}"]`).value;return `${title}: ${v}${n?' | '+n:''}`}).join('\\n');
    navigator.clipboard.writeText(out).then(()=>done.textContent='Copied. Paste it into the chat.',()=>done.textContent=out);
  };
});
</script></body></html>''')
print('sections', [(s[0], len(s[3])) for s in data])
