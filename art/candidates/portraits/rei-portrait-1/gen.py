"""Rei's base dialogue portrait, round 1. Jørgen (2026-10-03): "Make rei portrait". On her chibi the same day: "The white
haired woman also too happy naive looking instead of sly confident saleswoman".

Her approved look is art/approved/rei/rei-after.webp: gallery B-rei-smirk (RDBT, seed 202, art/production/manifest.json)
with headroom outpainted. It is from the same RDBT gallery as the house style anchors (mio-after, kuro-after), so this
round keeps that recipe word for word and changes only what the rules and the brief ask for:
  - the expression phrase: "thin knowing smile, looking down at the viewer" -> "sly confident look, slight knowing smile"
    (Jørgen's "sly confident"; her face stays in the cast's normal anime style, no narrow-eye words);
  - the build line from GUIDE (Build lines: "Rei: tall and curvy");
  - the house FRAME with room above the hair (tools/production.py FRAME);
  - the negative: the weighted red-rim words (art/PROMPTS.md "Eric (mc) portrait"; her gallery render has a red outline
    down her left side, image right), the base-portrait prop words (art/PROMPTS.md "Negative prompt base") and
    `fat, obese, plump`.

Staging note (for checking, not in the prompt):
  - Beat: Rei from Sales says a line in dialogue; the portrait sits on the screen edge like every cast portrait.
  - Camera: eye level with her face, about 1.5 m in front, waist-up, she faces the viewer at a slight three-quarter
    angle and looks into the lens. Head inside the frame with room above the hair; the frame cuts at the waist.
  - Heights: she is tall (about 1.75 m), so the camera is at her eye height, not looking up; her shoulders fill most of
    the width, the head small against them as on Mio's and Kuro's portraits.
  - In front of the lens: only her. Silver-grey hair in a high ponytail that hangs down behind her left shoulder (image
    right) as on rei-after, gold hoop earrings, light grey suit jacket over a black high-neck top.
  - Behind: plain light grey studio background, nothing else.
  - Hands: empty, at her sides or out of frame. Nothing held.
  - Eyelines: at the viewer.
  - Light: soft even studio light; no red or coloured rim along her outline.
  - Physical sense: one ponytail, two earrings, jacket lapels symmetrical, no extra hands.

Two ways, on the same seeds where they overlap:
  t-<seed>  text to image from the recipe above. Seed 202 is the seed of her approved picture; 2101-2105 are new.
  i<d>-<seed>  img2img from rei-after (scaled to 896x1152 on its own background) with the same prompt, at denoise 0.5
            and 0.65: keeps her approved drawing and lets the new expression in.
Every setting else: RDBT Anima, Euler A, 30 steps, CFG 5, 896x1152.

Step 2, rf-<seed>: every t- render had the ponytail touching or cut by the top edge (framecheck 0 to 9 px of headroom,
wants 34), as her gallery render had. The fix is the one rei-after got: tools/reframe.py outpaints room above (its 'rei'
options: 256 px on top, 100 px each side, RDBT masked img2img at 0.7, seed 301) and pastes the render back, so the
picture is unchanged inside the old frame. Its 'rei' prompt words say the tail falls behind her right shoulder; here
only "a high ponytail tied at the crown with a plain dark hair tie", since each render already draws the tail.

Usage: ~/ai/sd/venv/bin/python art/candidates/portraits/rei-portrait-1/gen.py [job ...]   (no job = all)
       ~/ai/sd/venv/bin/python art/candidates/portraits/rei-portrait-1/gen.py rf [rf-<seed> ...]
Raw PNGs: art/production/PC/rei-portrait-1/ (git-ignored); webp copies and prompts.json here.
"""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
import framecheck
from production import Q, N, FRAME, RDBT
from PIL import Image

OWNER = 'claude-agent:rei-portrait-1'
RAW = os.path.join(ROOT, 'art/production/PC/rei-portrait-1')
LOG = os.path.join(HERE, 'prompts.json')
APPROVED = os.path.join(ROOT, 'art/approved/rei/rei-after.webp')
W, H = 896, 1152

# rei-after's own words (manifest B rei-smirk), minus its expression phrase
DESC = ('Rei, a 26-year-old woman: long silver-grey hair in a sleek high ponytail, steel-grey eyes, sharp eyeliner, gold hoop '
        'earrings, tailored white suit over a black shirt, gold pin on the lapel, narrow refined face, high cheekbones')
BUILD = 'tall and curvy'
EXPR = 'sly confident look, slight knowing smile'
PROMPT = f'{Q}, safe, 1girl, solo, {DESC}, {BUILD}, {EXPR}, {FRAME}'
NEG = (N + ', fat, obese, plump, (rim light, red rim light, red outline, backlighting:1.4), '
       'holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book')

JOBS = {}
for s in (202, 2101, 2102, 2103, 2104, 2105):
    JOBS[f't-{s}'] = dict(kind='t2i', seed=s)
for d in (0.5, 0.65):
    for s in (2101, 2102):
        JOBS[f'i{round(d * 100)}-{s}'] = dict(kind='i2i', seed=s, d=d)


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def init_png():
    p = os.path.join(RAW, 'init-rei-after.png')
    if not os.path.exists(p):
        a = Image.open(APPROVED).convert('RGB')
        s = W / a.width
        a = a.resize((W, round(a.height * s)), Image.LANCZOS)
        c = Image.new('RGB', (W, H), a.getpixel((4, 4)))
        c.paste(a, (0, 0))
        c.save(p)
    return p


def workflow(j):
    wf = comfy.anima(PROMPT, NEG, model=RDBT, w=W, h=H, steps=30, cfg=5, seed=j['seed'])
    if j['kind'] == 'i2i':
        wf['I0'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(init_png())}}
        wf['I1'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['I0', 0], 'vae': ['3', 0]}}
        wf['7']['inputs'].update(latent_image=['I1', 0], denoise=j['d'])
        del wf['6']
    return wf


def reframe_all(names):
    import reframe
    opt = dict(reframe.OPTS['rei'], pos=', a high ponytail tied at the crown with a plain dark hair tie')
    reframe.prompt_for = lambda spec: (PROMPT, NEG)
    L = json.load(open(LOG))
    for name, j in JOBS.items():
        if j['kind'] != 't2i' or (names and f'rf-{j["seed"]}' not in names):
            continue
        key = f'rei-rf-{j["seed"]}'
        reframe.CAST[key] = (os.path.relpath(os.path.join(RAW, f'rei-{name}.png'), ROOT), PROMPT)
        reframe.OPTS[key] = opt
        check_lock()
        out = reframe.reframe(key, seed=301)
        Image.open(out).convert('RGB').save(os.path.join(HERE, key + '.webp'), quality=92)
        L[key] = {'method': 'reframe outpaint of ' + f'rei-{name}', 'source': f'rei-{name}', 'tool': 'tools/reframe.py',
                  'canvas': '1096x1408 (256 px added on top, 100 px each side)', 'seed': 301, 'denoise': 0.7,
                  'prompt': PROMPT + opt['pos'] + reframe.HEADROOM, 'negative_extra': opt['neg'],
                  'frame_warn': framecheck.check(out)}
        json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)


def main(names):
    os.makedirs(RAW, exist_ok=True)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for name, j in JOBS.items():
        if names and name not in names:
            continue
        out = os.path.join(RAW, f'rei-{name}.png')
        if not os.path.exists(out):
            check_lock()
            comfy.run(workflow(j), out)
        Image.open(out).convert('RGB').save(os.path.join(HERE, f'rei-{name}.webp'), quality=92)
        L[f'rei-{name}'] = {'model': 'rdbtAnima', 'method': j['kind'], 'seed': j['seed'], 'denoise': j.get('d', 1.0),
                            'source': 'art/approved/rei/rei-after.webp' if j['kind'] == 'i2i' else None,
                            'prompt': PROMPT, 'negative': NEG, 'w': W, 'h': H, 'steps': 30, 'cfg': 5,
                            'sampler': 'euler_ancestral normal', 'frame_warn': framecheck.check(out)}
        json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', name, L[f'rei-{name}']['frame_warn'], flush=True)


if __name__ == '__main__':
    if sys.argv[1:2] == ['rf']:
        reframe_all(sys.argv[2:])
    else:
        main(sys.argv[1:])
