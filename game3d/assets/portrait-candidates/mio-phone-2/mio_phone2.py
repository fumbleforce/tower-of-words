"""Mio reading the server alert on her phone, round 2: full new renders (txt2img), not an edit of her standard portrait.

Round 1 (reviews/mio-phone) painted hands over the approved portrait; Jørgen rejected it: "like you MS painted over 2 stubby
hands on top of her, she still has her normal hands in her pockets, REMAKE THE IMAGE IN FULL." Here the whole pose is new.

Staging note
- Beat / script moment: train.js mio_phone ("あー, no, no... the server's down again"): she has just looked at the buzz.
- Camera: same as her other dialogue portraits: eye level, waist-up, body at a slight angle, headroom above the bun,
  plain light grey background, soft even studio light. Nothing else in frame.
- In front of the lens: Mio alone. Her head is tilted down, eyes down on the phone. The phone is held in BOTH hands at
  chest height in front of her, screen toward her, so we see its dark back. Both hands visible, fingers around its
  edges; elbows bent at her sides; oversized hoodie sleeves down to the wrists. Headphones around her neck, lanyard and
  ID card hanging (the card can sit behind her forearms).
- Eyeline: down at the phone screen. Expression: tired, a small frown.
- Physical sense: exactly two hands, five fingers each, both on the phone; no hand in a pocket; the phone is one object.
- Identity (art/approved/mio/mio-after.webp): black hair with bright green underneath, loose messy bun, blunt fringe,
  thin taupe-grey glasses, light tan eyes, black-green oversized hoodie, dark teal and white headphones, teal lanyard.

Variants (one change each):
- txt: RDBT text only.
- ipa: the same prompt plus the Anima IP-Adapter (Character_Reference) with the approved portrait as reference, 0.5
  (ipa7 = 0.7). Batch 1: text only drifted off-model (top bun, lime streaks, beige background); ipa held her look.
- pose b: the back of the phone toward the viewer spelled out.
Usage: ~/ai/sd/venv/bin/python mio_phone2.py <variant>:<seed> ...   |   frame <name> ...   |   cut <name> ...
"""
import sys, os, json, subprocess, shutil
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(REPO, 'tools'))
sys.path.insert(0, os.path.join(REPO, 'tools', 'imagegen'))
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(REPO, 'art/production/mio-phone-2')  # full-size PNGs (art/production is git-ignored)
REF = os.path.join(REPO, 'art/approved/mio/mio-after.webp')
OWNER = 'mio-phone-2'
LOG = os.path.join(HERE, 'log.json')

Q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
     'anime screenshot, anime coloring, 2d, cel shading, clean lineart')
MIO = ('Mio, a 25-year-old woman: messy black hair with bright green underneath in a loose bun, blunt fringe, '
       'thin grey rectangular glasses with clear lenses, light tan eyes, oversized black hoodie, '
       'dark teal and white headphones around her neck, teal company lanyard')
POSE = {
    'a': 'holding a smartphone in both hands in front of her chest, looking down at the phone screen, head tilted down, tired, small frown',
    # b: one change, the back of the phone toward the viewer spelled out
    'b': 'holding a smartphone with both hands in front of her chest, the back of the phone facing the viewer, looking down at the screen, head tilted down, tired, small frown',
}
FRAME = ('waist-up portrait facing the viewer at a slight angle, (the whole head inside the frame with empty space above the hair:1.2), '
         'plain light grey background, soft even studio light')
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
       'missing fingers, extra fingers, fused fingers, extra hands, extra arms, long fingernails, claws, extra limbs, merged limbs, text, '
       'watermark, signature, 3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli, western cartoon, comic book, '
       'flat vector, thick outlines, poster art, pop art, rim light, red rim light, backlighting, looking at viewer, hands in pockets')


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def prompt(pose):
    return f'{Q}, safe, 1girl, solo, {MIO}, {POSE[pose]}, {FRAME}'


def log(entry):
    L = json.load(open(LOG)) if os.path.exists(LOG) else []
    L = [e for e in L if e['name'] != entry['name']] + [entry]
    json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)


def render(spec):
    import comfy, consist
    variant, seed = spec.split(':')
    seed = int(seed)
    kind, pose = variant[:-1], variant[-1]  # txta, ipab ...
    name = f'mio-phone2-{variant}-{seed}'
    out = os.path.join(RAW, name + '.png')
    if os.path.exists(out):
        return name
    check_lock()
    p = prompt(pose)
    wf = comfy.anima(p, NEG, model='rdbtAnima.safetensors', w=896, h=1152, steps=30, cfg=5, sampler='euler_ancestral',
                     scheduler='normal', seed=seed)
    method = 'RDBT Anima txt2img, text only'
    if kind.startswith('ipa'):
        st = int(kind[3:]) / 10 if kind[3:] else 0.5  # ipa = 0.5, ipa7 = 0.7
        wf = consist.ipa(wf, REF, st)
        method = f'RDBT Anima txt2img + Anima IP-Adapter Character_Reference {st} (ref art/approved/mio/mio-after.webp)'
    wf['9']['inputs']['filename_prefix'] = 'miophone2/' + name
    comfy.run(wf, out)
    json.dump(wf, open(os.path.join(HERE, f'workflow-{kind}.json'), 'w'), indent=1)
    log({'name': name, 'method': method, 'prompt': p, 'negative': NEG, 'seed': seed, 'w': 896, 'h': 1152, 'steps': 30, 'cfg': 5,
         'sampler': 'euler_ancestral normal'})
    Image.open(out).convert('RGB').resize((597, 768), Image.LANCZOS).save(os.path.join(HERE, name + '.webp'), quality=92)
    try:
        import framecheck
        framecheck.warn(out)
    except Exception as e:
        print('framecheck skipped', e)
    print('ok', name, flush=True)
    return name


def frame(names):
    """tools/reframe.py: 896x1152 -> 1008x1296 with outpainted headroom (original pixels pasted back), the same canvas
    as her approved portrait (art/production/RF/mio.png), so the phone portrait sits at the same scale in the game."""
    import reframe
    for n in names:
        e = [x for x in json.load(open(LOG)) if x['name'] == n][0]
        reframe.CAST[n] = (os.path.relpath(os.path.join(RAW, n + '.png'), REPO), e['prompt'])
        check_lock()
        out = reframe.reframe(n, seed=301)
        shutil.copy(out, os.path.join(RAW, n + '-rf.png'))


def cut(names):
    """BiRefNet-HR matting on the reframed canvas, then tools/matte_refine.py, then 597x768 like the game portraits."""
    tmp = os.path.join(RAW, 'cut')
    os.makedirs(tmp, exist_ok=True)
    srcs = [os.path.join(RAW, n + '-rf.png') for n in names]
    subprocess.run(['python3', os.path.join(REPO, 'tools/rmbg_local.py'), '--method', 'birefnet-hr-matting', *srcs, '--out', tmp], check=True)
    for n in names:
        ref = os.path.join(tmp, n + '-refined.png')
        subprocess.run([os.path.expanduser('~/ai/rmbg/rembg/bin/python'), os.path.join(REPO, 'tools/matte_refine.py'),
                        os.path.join(RAW, n + '-rf.png'), os.path.join(tmp, n + '-rf.png'), ref], check=True)
        Image.open(ref).resize((597, 768), Image.LANCZOS).save(os.path.join(HERE, n + '-cut.webp'), quality=92)
        print('cut', n, flush=True)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    if sys.argv[1] == 'cut':
        cut(sys.argv[2:])
    elif sys.argv[1] == 'frame':
        frame(sys.argv[2:])
    else:
        for s in sys.argv[1:]:
            render(s)
