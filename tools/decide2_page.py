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
       ('proto2/gallery/B-kaori-smile.webp', 'Kaori'), ('proto2/gallery/A-luna-s101.webp', 'Kuro 玖路, night receptionist'),
       ('proto2/gallery/A-kiyoko-s101.webp', 'Kiyoko (face approved, new clothes below)'),
       ('art/production/D2/goro-a-202.png', 'Goro'), ('art/production/D2/jun-a-202.png', 'Jun'),
       ('art/production/D2/ishibashi-b-201.png', 'Ishibashi'), ('art/production/D2/saki-a-201.png', 'Saki')]
ref = []
for i, (src, lab) in enumerate(REF):
    s = os.path.join(ROOT, src)
    if os.path.exists(s):
        if s.endswith('.png'):
            webp(s, f'ref-{i}', 400)
        else:
            shutil.copy(s, os.path.join(OUTD, f'ref-{i}.webp'))
        ref.append((f'ref-{i}', lab))

NEW_INTRO = ('Extra women to choose from, all small or flat-chested. Each starts from a real job or a real Japanese street style '
             'instead of an anime type. Pick the ones you want in the game (one image each), or leave them.')
SECTIONS = [
    ('yuzuki', 'Yuzuki (PR spokeswoman)', 'Your pick yuzuki-c-202 (shown first) repainted with long hair in four colours no other woman has, and a flat chest. Emi is shown for comparison.',
     ['yuzuki-d', 'yuzuki-e', 'yuzuki-f', 'yuzuki-g'], [('art/production/D2/yuzuki-c-202.png', 'c-202, before'), ('proto2/emi2/r3-rdbt-work-41.webp', 'Emi, for comparison')], ''),
    ('kiyoko', 'Kiyoko (faction leader)', 'The s101 face is kept (masked); only the clothes are repainted. Plum haori jacket, ivory suit with a red obi belt, peacock-teal kimono-collar dress, camel coat dress with a silk scarf.',
     ['kiyoko-plum', 'kiyoko-ivory', 'kiyoko-teal', 'kiyoko-camel'], [('proto2/gallery/A-kiyoko-s101.webp', 's101 original')], ''),
    ('nanami', 'Nanami (security)', 'New start, away from the stoic woman in a black or navy tactical uniform. Each one is a real building-security job in Japan: '
     '(d) disaster-prevention centre officer who runs the fire drills, (e) traffic guard at the construction gate, (f) night-shift CCTV operator, '
     '(g) clerk at the ID-card and access desk, in the vest-and-skirt office uniform many Japanese firms still use.',
     ['nanami-d', 'nanami-e', 'nanami-f', 'nanami-g'], [], ''),
    ('office', 'Basement office (from option 2)', 'Option 2 zoomed out for more floor, the mid-wall window replaced by a narrow frosted one just under the ceiling, chairs at the desks and empty ramen cups.',
     ['office2'], [('proto2/gallery/O-office-basement-502.webp', 'option 2 (before)')], ''),
    ('tsubasa', 'Tsubasa, 27, company ekiden runner', 'Runs for the company ekiden team and works mornings in General Affairs. The board wants to cut the team to save money; '
     'she wants one more New Year race, and she wants to know how the new guy\'s numbers can be that good.<br><small>Usual types for this role: the bubbly sports girl, the tomboy with a crush, the one who is always eating. Here: quiet, counts everything, treats the team\'s survival as a budget fight.</small>',
     ['new-tsubasa'], [], 'new'),
    ('fumiko', 'Fumiko, 34, union officer', 'Works full time for the company union and keeps a spreadsheet of everyone\'s overtime. The player\'s impossible output worries her: '
     'management will use it to raise everyone\'s quotas.<br><small>Usual types: the shouting activist with a megaphone, the naive idealist, the rep in the bosses\' pocket. Here: soft-spoken, patient, dresses in the forest-girl (mori kei) layered linen style, and she is right.</small>',
     ['new-fumiko'], [], 'new'),
    ('chihiro', 'Chihiro, 26, expense checker', 'Checks every expense claim in Accounts Payable, and rejects them with a smile. Outside work she follows a stage actor from the 2.5D musicals; '
     'everything she owns is lavender, his colour. She never does overtime on show nights.<br><small>Usual types: the strict accountant in glasses, the shrieking otaku. Here: cheerful and ruthless about receipts, open about her hobby, and she audits the player first.</small>',
     ['new-chihiro'], [], 'new'),
    ('kanae', 'Kanae, 30, newsletter photographer', 'Shoots every department photo for the company newsletter and bosses executives around to get it. '
     'She wants one honest, unposed photo to get past the PR department, which puts her against Yuzuki.<br><small>Usual types: the shy girl hiding behind her camera, the snooping paparazzo. Here: loud and bossy about framing, in Ura-Harajuku streetwear.</small>',
     ['new-kanae'], [], 'new'),
    ('sumi', 'Sumi, 24, in-house calligrapher', 'General Affairs has one person who brush-writes the award certificates, condolence envelopes and event banners by hand. '
     'She does hundreds a month and wants her handwriting turned into a font she gets paid for.<br><small>Usual types: the serene girl in a kimono, the tea-ceremony calm. Here: fast, impatient, ink on her fingers, dressed in Showa-retro thrift clothes, treats brushwork as a production line.</small>',
     ['new-sumi'], [], 'new'),
]
data = []
for sid, title, desc, prefixes, refs, kind in SECTIONS:
    compare = []
    for i, (src, lab) in enumerate(refs):
        s = os.path.join(ROOT, src)
        if os.path.exists(s):
            if s.endswith('.png'):
                webp(s, f'{sid}-cmp{i}', 640)
            else:
                shutil.copy(s, os.path.join(OUTD, f'{sid}-cmp{i}.webp'))
            compare.append((f'{sid}-cmp{i}', lab))
    opts = []
    for pre in prefixes:
        for f in sorted(os.listdir(D2)):
            if f.startswith(pre + '-') and f.endswith('.png') and not any(x in f for x in ('mask', 'src', 'wide')):
                n = f[:-4]
                if webp(os.path.join(D2, f), n, 1216 if sid == 'office' else 640):
                    lab = n.replace('-', ' ', 1)
                    opts.append((n, f'{lab}' + (f': {NOTES[n]}' if n in NOTES else '')))
    if not opts:
        desc = 'Not rendered yet (stopped for the day). ' + desc
    data.append((sid, title, desc, opts, compare, kind))
json.dump({'ref': ref, 'intro_new': NEW_INTRO, 'sections': data}, open(os.path.join(OUTD, 'data.json'), 'w'), ensure_ascii=False)

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
section p small{display:block;margin-top:4px;color:#6a7180}.group{margin:34px 0 0;padding:0 4px}.group h2{font-size:22px;margin:0 0 4px}.group p{color:#4b5260;max-width:860px;margin:0}
#lb{position:fixed;inset:0;background:rgba(10,12,16,.94);display:none;place-items:center;z-index:9}#lb.on{display:grid}#lb img{max-width:96vw;max-height:92vh}
</style></head><body><main>
<h1>Decisions, round 2</h1>
<p class="intro">Approved designs are at the top, so you can check the new ones stand apart. Goro, Jun, Ishibashi and Saki are decided and have moved up there. Pick one option per section (or "redo"), add a note if you like, then copy your picks at the bottom. Double-click any image to see it full size. Grey tiles are for comparison only.</p>
<section><h2>Approved so far (reference)</h2><div class="ref" id="ref"></div></section>
<div id="list"></div></main>
<div class="bar"><button id="copy">Copy my picks</button><span id="done"></span></div>
<div id="lb"><img alt=""></div>
<script>
fetch('data.json').then(r=>r.json()).then(({ref,intro_new,sections:D})=>{
  document.getElementById('ref').innerHTML=ref.map(([f,l])=>`<figure><img src="${f}.webp" alt=""><figcaption>${l}</figcaption></figure>`).join('');
  const list=document.getElementById('list');
  let grouped=false;
  for(const [id,title,desc,opts,cmp,kind] of D){
    if(kind==='new'&&!grouped){grouped=true;const h=document.createElement('div');h.className='group';h.innerHTML=`<h2>New character ideas</h2><p>${intro_new}</p>`;list.append(h);}
    const s=document.createElement('section');
    const none=kind==='new'?'not this character':'none of these, redo';
    s.innerHTML=`<h2>${title}</h2>${desc?`<p>${desc}</p>`:''}<div class="opts ${id==='office'?'wide':''}"></div><div class="row"><label><input type="radio" name="${id}" value="${kind==='new'?'no':'redo'}"> ${none}</label><input type="text" data-note="${id}" placeholder="note (optional)"></div>`;
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
