"""Kuro through Jørgen's 3D character workflow (art/PROMPTS.md, "3D character workflow"), step 1 and 2 run locally.
He made Eric's and Mio's chibi pictures in ChatGPT as one conversation: each ask edits the picture before it. There is no
ChatGPT here, so each ask is one FLUX.2 Klein 4B multi-reference edit (tools/characters/chibi_local.py's workflow) on the
local GPU, fed the picture the previous ask made. Needs ComfyUI on 8188 and the GPU lock with our name (GUIDE).

  python3 art/candidates/kuro-meshy-orig-1/gen.py a 101 102 103 104                 ask 1 (portrait + Mio chibi)
  python3 art/candidates/kuro-meshy-orig-1/gen.py b --from a-102 201 202 203 204    ask 2 on a picked ask-1 picture
  python3 art/candidates/kuro-meshy-orig-1/gen.py c --from b-203 301 302 ...        ask 3: strip what Meshy garbles
  python3 art/candidates/kuro-meshy-orig-1/gen.py d --from c-302 401 402 ...        step 2: turn her to an angle

Pictures, their settings and the workflow go to the main checkout's art/parts/kuro-meshy-orig-1/pics/ (git-ignored);
every attempt is logged in order in pics/attempts.json.

Staging note (all asks): one figure, full body, standing, centred with room above the head and below the feet; plain
white background; soft even studio light; camera at her chest height, no tilt. Ask 1 to 3 keep the framing of the
picture they edit; step 2 turns her so she looks to the image's left with her body turned the same way, as Jørgen's
angled Mio. Nothing else in frame: no props, no text, no floor objects.
"""
import argparse, json, os, shutil, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/characters'))
import chibi_local as cl  # noqa: E402
from PIL import Image  # noqa: E402

MAIN = '/home/jorgen/repo/japanese'
OUT = os.path.join(MAIN, 'art/parts/kuro-meshy-orig-1/pics')
PORTRAIT = os.path.join(MAIN, 'game3d/assets/portraits/kuro-neutral.webp')
# Jørgen's Mio chibi picture: the front three-quarter one he made in ChatGPT (step 1); mio-chibi-angled.png is its
# step-2 turn, the one Meshy got.
MIO = os.path.join(MAIN, 'tools/characters/ref/mio-chibi-34.png')
OWNER = 'kuro-meshy-orig-1'

# Jørgen's asks, word for word where they fit; "image 1/2" says which attached picture is meant.
ASKS = {
    'a': ('make a 3d chibi anime character of the woman in image 1, in the style of the attached image 2. '
          'Full body, plain white background.'),
    'b': ('simplify the character in image 1 a LOT to match the detail level of the other chibi in image 2, '
          'with open eyes.'),
    'c': None,  # filled in from what Meshy would garble in the picked ask-2 picture (--ask)
    'd': ('Turn the character in image 1 looking to the left, same orientation as the body. Keep all features thick '
          'and sturdy, no fine strands or thin spikes. No text, no props, no extra subjects, no photorealism. '
          'Flat matte texture.'),
}


def on_white(src, name):
    im = Image.open(src)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im); im = bg
    im.convert('RGB').save(os.path.join(cl.INPUT, name))
    return name


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('step', choices=list(ASKS)); ap.add_argument('seeds', nargs='+', type=int)
    ap.add_argument('--from', dest='frm', help='picked picture id from the step before, e.g. a-102')
    ap.add_argument('--ask', help='the ask text (step c, or an override)')
    ap.add_argument('--steps', type=int, default=4); ap.add_argument('--cfg', type=float, default=1.0)
    ap.add_argument('--w', type=int, default=896); ap.add_argument('--h', type=int, default=1184)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    ask = a.ask or ASKS[a.step]
    if not ask: sys.exit('step c needs --ask')
    if a.step == 'a':
        refs = [on_white(PORTRAIT, 'kmo-portrait.png'), on_white(MIO, 'kmo-mio-chibi-34.png')]
    else:
        if not a.frm: sys.exit('--from is needed after step a')
        prev = on_white(os.path.join(OUT, a.frm + '.png'), f'kmo-{a.frm}.png')
        refs = [prev] + ([on_white(MIO, 'kmo-mio-chibi-34.png')] if a.step == 'b' else [])
    log_path = os.path.join(OUT, 'attempts.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    for seed in a.seeds:
        if OWNER not in open(cl.LOCK).read():
            sys.exit('GPU lock is not ours; stopping')
        name = f'{a.step}-{seed}'
        t0 = time.time()
        wf = cl.workflow(refs, ask, seed, a.w, a.h, a.steps, a.cfg, 'kmo-' + name)
        src = cl.run(wf)
        shutil.copy(src, os.path.join(OUT, name + '.png'))
        rec = {'id': name, 'step': a.step, 'from': a.frm, 'refs': refs, 'ask': ask, 'seed': seed, 'steps': a.steps,
               'cfg': a.cfg, 'size': [a.w, a.h], 'model': 'flux-2-klein-4b-fp8', 'seconds': round(time.time() - t0, 1)}
        json.dump({**rec, 'workflow': wf}, open(os.path.join(OUT, name + '.json'), 'w'), indent=1)
        log = [r for r in log if r['id'] != name] + [rec]
        json.dump(log, open(log_path, 'w'), indent=1)
        print(os.path.join(OUT, name + '.png'), rec['seconds'], 's', flush=True)


if __name__ == '__main__':
    main()
