"""Opening window shots, round 1: Eric and Mio seated in the monorail, for the cards behind the train's side window in
the anime opening (game3d/opening/shots/verse.js, shots eric-window and mio-window).

Jørgen on the first preview (2026-10-09): "the static character portraits dont fit well visually just pasted inside the
window, they need dedicated generations".

How they're used: cut out and placed on a card just behind the side window; the camera outside the car, at window height,
looks in. The window is about 1.3 wide by 0.8 tall, so a seated person shows from mid-chest or waist up, head and shoulders
in its upper part. The 3D car supplies seat, glass and frame: the pictures show the person only, on a plain flat
background that cuts out cleanly.

Staging notes (for checking; they do not go into the prompts)

1. eric-window
- Story beat: the first morning; Eric rides in and watches the view, calm, curious, a little hopeful.
- Script moment: verse 1, 朝のモノレール 窓の外 (shot eric-window), the camera running alongside the middle car.
- World: he sits on the bench inside the car; the car runs on its beam toward image right as seen from the camera.
- Camera: outside the car, about 3 m out, at his seated eye level, looking straight in. Medium close shot, eye level.
- In front of the lens: Eric alone, mid-chest/waist up, head in the upper part; plain light grey background.
- Behind the camera / out of frame: the sea, the island, the window, the seat, the train. None of it in the prompt.
- Motion: the train moves toward image right; he is still.
- Eyeline: turned toward his left (image right), looking out past the frame's right edge into the distance, not at us.
- Light: soft warm low morning sun from his left (image right); the image-left side of his face in soft shade. No red rim.
- Physical sense: hands down out of frame or one forearm low; nothing held; silver rectangular glasses on his face,
  stubble, dark-blond short ponytail, grey hoodie under the navy blazer, lanyard.

2. mio-window-phone
- Story beat: Mio, a window along, ignores the view; she is on her phone.
- Script moment: verse 1, shot mio-window, before the beat where she looks up.
- Camera: as shot 1 (outside, at her seated eye level, straight in, medium close).
- In front of the lens: Mio alone, mid-chest/waist up; plain light grey background.
- Behind the camera: as shot 1.
- Pose: body angled toward image left (her right); head bowed; both hands hold one phone at chest height, screen toward
  her, so we see its back; two hands, five fingers each.
- Eyeline: down at the phone screen.
- Light: the same morning sun from image right (her left).
- Physical sense: her exact glasses (taupe-grey rounded rectangles, art/PROMPTS.md "Mio's glasses"), dark green-black hair
  with light green underneath, messy bun, pale skin, light tan eyes, dark green hoodie, headphones round her neck.

3. mio-window-look
- The picked shot 2 with only her face changed: eyes raised to look straight at the viewer, head still slightly bowed,
  deadpan, unimpressed. Face-only repaint (brows to chin), her glasses frame pasted back so it stays identical.

Methods (identity is training-free; art/PROMPTS.md, GUIDE: Consistent characters)
- ipa:   RDBT txt2img with the approved portrait's own wording plus the shot's pose and light, and the Anima IP-Adapter
         (Character_Reference) fed the approved portrait (Eric 0.5 as tools/imagegen presets, Mio 0.7 as her mio-phone-2
         pick ipa7a-1001).
- flip:  Eric only: img2img at 0.65 from his approved render eric-ink-2001, mirrored so he turns toward image right, with
         the shot's prompt. Mirroring puts his loose fringe strand on the other side.
- i2i:   Mio only: img2img at 0.55 from her approved phone picture (reviews/mio-phone-5 pick blendk25-3501-exact-3401-v2,
         same canvas), then her exact frame with both lenses and eyes pasted back from it (straight paste, same pose).
- look:  shot 3: the picked shot-2 face repainted on a crop (LLLite inpainting-v2, eyes in the mask), frame pasted back.

Usage: ~/ai/sd/venv/bin/python gen.py [job ...]     (no job = every render job; 'look:<src>:<seed>:<d>' for shot 3)
Raw PNGs: art/production/opening-window-1/ (git-ignored); webp copies and prompts.json here."""
import sys, os, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'imagegen'))
sys.path.insert(0, os.path.join(ROOT, 'art/candidates/portraits/mio-phone-3'))
import comfy
import consist
from production import Q, N, RDBT
from PIL import Image, ImageDraw, ImageFilter, ImageOps

OWNER = 'opening-window-1'
RAW = os.path.join(ROOT, 'art/production/opening-window-1')
LOG = os.path.join(HERE, 'prompts.json')
LLLITE_INPAINT = 'anima-lllite-inpainting-v2.safetensors'

ERIC_SRC = os.path.join(ROOT, 'art/production/PC/style-align-1/eric-ink-2001.png')     # 976x1152, approved eric-ink-2001
MIO_REF = os.path.join(ROOT, 'art/approved/mio/mio-after.webp')
MIO_PHONE = os.path.join(ROOT, 'art/production/mio-phone-5/mio-phone3-blendk25-3501-exact-3401-v2.png')  # 1008x1296, approved phone

REDRIM = '(rim light, red rim light, red outline, backlighting:1.4)'
LIGHT = 'soft warm morning sunlight from the right, plain light grey background'
NOSET = 'chair, bench, seat, window, train interior, scenery, outdoors'

# Eric: the approved eric-ink-2001 wording (style-align-1 CHAR['eric']), its pose, expression and studio frame replaced
ERIC = ('male focus, a Scandinavian man in his early thirties, fair pale skin, blue eyes, company lanyard, dark-blond hair, '
        'same colour all over, tied in a short ponytail at the back, (facial hair, dark-blond stubble:1.3), '
        '(silver rectangular glasses:1.2), grey hoodie under a navy blazer')
ERIC_POSE = ('sitting, upper body, three-quarter view turned to the right, looking away to the right, looking afar, '
             'calm curious expression, faint hopeful smile, hands out of frame')
ERIC_NEG = (N + ', fat, obese, ' + REDRIM + ', holding, holding object, tool, pen, cup, phone, papers, book, bag'
            ', undercut, shaved sides, two-tone hair, closed eyes, blush, looking at viewer, ' + NOSET)

# Mio: the cast line from art/PROMPTS.md (Cast prompt lines) and docs/game/cast.md, plus her clothes from the portrait
MIO = ('Mio, a 30-year-old woman, pale skin, slim with soft curves, very dark green hair bordering on black in a messy loose '
       'bun with bangs, bright green underneath showing at the ends and nape, light tan eyes, thin-framed glasses with clear '
       'lenses, oversized dark green hoodie, dark teal and white headphones around her neck, teal company lanyard')
MIO_POSE = ('sitting, upper body, body turned to the left, head bowed, looking down at a smartphone held in both hands at '
            'chest height, bored, tired')
MIO_NEG = (N + ', fat, obese, ' + REDRIM + ', extra hands, extra arms, fused fingers, blue eyes, green eyes, tan, dark skin, '
           'teal hair, streaked hair, looking at viewer, hands in pockets, ' + NOSET)


# batch 2: the ipa renders came out near profile (her glasses then can't take her own frame, and shot 3 needs her to look
# at the viewer). One phrase changed: "body turned to the left" -> "three-quarter view, body angled slightly to the left".
MIO_POSE_3Q = MIO_POSE.replace('body turned to the left', 'three-quarter view, body angled slightly to the left')


def eric_prompt():
    return f'{Q}, safe, 1boy, solo, {ERIC}, {ERIC_POSE}, {LIGHT}'


def mio_prompt(pose=None):
    return f'{Q}, safe, 1girl, solo, {MIO}, {pose or MIO_POSE}, {LIGHT}'


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def init_eric_flip():
    p = os.path.join(RAW, 'init-eric-flip.png')
    if not os.path.exists(p):
        src = ImageOps.mirror(Image.open(ERIC_SRC).convert('RGB'))
        c = Image.new('RGB', (1024, 1152), src.getpixel((4, 4)))
        c.paste(src, ((1024 - src.width) // 2, 0))
        c.save(p)
    return p


def wf_i2i(prompt, neg, init, w, h, seed, d):
    wf = comfy.anima(prompt, neg, model=RDBT, w=w, h=h, steps=30, cfg=5, seed=seed)
    wf['I0'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(init)}}
    wf['I1'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['I0', 0], 'vae': ['3', 0]}}
    wf['7']['inputs'].update(latent_image=['I1', 0], denoise=d)
    return wf


# ---- Mio's frame and eyes on the approved phone picture (1008x1296) ----
MIO_PHONE_EYES = [(370, 518, 442, 568), (498, 492, 584, 546)]   # her right eye (image left), left eye (image right)


def mio_phone_frame(grow=1):
    from geom import frame_mask
    m = frame_mask(MIO_PHONE, (300, 430, 700, 640), 50, 175, 45)
    from scipy import ndimage
    return ndimage.binary_dilation(m, iterations=grow) if grow else m


def paste_frame_eyes(img):
    """Her frame, both lenses with everything inside them (eyes, lens shine), the bridge and nose pads between them and 5 px
    round it all (the frame's convex hull), from the approved picture.
    Pasting only the frame line and the eyes (first try) left the render's own redrawn silver frame showing as a ghost
    line inside and under the lenses, because img2img at 0.55 moved and thinned the frame."""
    from scipy import ndimage
    src = Image.open(MIO_PHONE).convert('RGB')
    f = mio_phone_frame()
    filled = ndimage.binary_fill_holes(ndimage.binary_closing(f, iterations=4))
    # and the space between the lenses (bridge and nose pads): the convex hull of the frame, so the render's own silver
    # bridge and pads don't show either
    from scipy.spatial import ConvexHull
    ys, xs = np.nonzero(f)
    pts = np.stack([xs, ys], 1)
    hull = pts[ConvexHull(pts).vertices]
    hm = Image.new('L', img.size, 0)
    ImageDraw.Draw(hm).polygon([tuple(map(int, q)) for q in hull], fill=255)
    m = ndimage.binary_dilation(filled | f | (np.asarray(hm) > 0), iterations=5)
    fm = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.5))
    return Image.composite(src, img, fm)


JOBS = {}
for s in (4101, 4102, 4103, 4104):
    JOBS[f'eric-ipa-{s}'] = dict(shot='eric-window', method='ipa', seed=s, st=0.5)
for s in (4101, 4102, 4103):
    JOBS[f'eric-flip-{s}'] = dict(shot='eric-window', method='flip', seed=s, d=0.65)
for s in (4201, 4202, 4203, 4204):
    JOBS[f'miophone-ipa-{s}'] = dict(shot='mio-window-phone', method='ipa', seed=s, st=0.7)
for s in (4201, 4202, 4203):
    JOBS[f'miophone-i2i-{s}'] = dict(shot='mio-window-phone', method='i2i', seed=s, d=0.55)
for s in (4201, 4202, 4203, 4204):
    JOBS[f'miophone-ipa3q-{s}'] = dict(shot='mio-window-phone', method='ipa', seed=s, st=0.7, pose='3q')


def render(name):
    j = JOBS[name]
    out = os.path.join(RAW, name + '.png')
    meta = dict(j, model='rdbtAnima', steps=30, cfg=5, sampler='euler_ancestral normal')
    if j['shot'] == 'eric-window':
        p, n = eric_prompt(), ERIC_NEG
        if j['method'] == 'ipa':
            wf = comfy.anima(p, n, model=RDBT, w=1024, h=1152, steps=30, cfg=5, seed=j['seed'])
            wf = consist.ipa(wf, ERIC_SRC, j['st'])
            meta.update(size='1024x1152', ip_adapter=f"Character_Reference {j['st']}, ref art/production/PC/style-align-1/eric-ink-2001.png")
        else:
            wf = wf_i2i(p, n, init_eric_flip(), 1024, 1152, j['seed'], j['d'])
            meta.update(size='1024x1152', source=f"eric-ink-2001 mirrored, img2img denoise {j['d']}")
    else:
        p, n = mio_prompt(MIO_POSE_3Q if j.get('pose') == '3q' else None), MIO_NEG
        if j['method'] == 'ipa':
            wf = comfy.anima(p, n, model=RDBT, w=1024, h=1152, steps=30, cfg=5, seed=j['seed'])
            wf = consist.ipa(wf, MIO_REF, j['st'])
            meta.update(size='1024x1152', ip_adapter=f"Character_Reference {j['st']}, ref art/approved/mio/mio-after.webp")
        else:
            wf = wf_i2i(p, n, MIO_PHONE, 1008, 1296, j['seed'], j['d'])
            meta.update(size='1008x1296', source=f"approved phone picture (mio-phone-5 blendk25-3501-exact-3401-v2), img2img denoise {j['d']}; frame, lenses and eyes pasted back")
    meta.update(prompt=p, negative=n)
    if not os.path.exists(out):
        check_lock()
        comfy.run(wf, out)
    im = Image.open(out).convert('RGB')
    if j['shot'] == 'mio-window-phone' and j['method'] == 'i2i':
        im.save(os.path.join(RAW, name + '-raw.png')) if not os.path.exists(os.path.join(RAW, name + '-raw.png')) else None
        im = paste_frame_eyes(Image.open(os.path.join(RAW, name + '-raw.png')).convert('RGB'))
        im.save(os.path.join(RAW, name + '-final.png'))
    im.save(os.path.join(HERE, name + '.webp'), quality=92)
    meta['file'] = f'art/candidates/portraits/opening-window-1/{name}.webp'
    return meta


def main(names):
    os.makedirs(RAW, exist_ok=True)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    todo = [n for n in JOBS if not names or n in names]
    for name in todo:
        L[name] = render(name)
        json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', name, flush=True)


def comfy_up():
    """Start ComfyUI if it isn't running (log ~/ai/comfy.log); returns the process we started, or None."""
    import subprocess, time, urllib.request
    def up():
        try:
            urllib.request.urlopen(comfy.HOST + '/system_stats', timeout=3)
            return True
        except Exception:
            return False
    if up():
        return None
    log = open(os.path.expanduser('~/ai/comfy.log'), 'ab')
    pr = subprocess.Popen([os.path.expanduser('~/ai/sd/venv/bin/python'), 'main.py', '--listen', '127.0.0.1', '--port', '8188',
                           '--disable-auto-launch'], cwd=os.path.expanduser('~/ai/ComfyUI'), stdout=log, stderr=log)
    for _ in range(120):
        if up():
            return pr
        time.sleep(2)
    raise SystemExit('ComfyUI did not come up')


def comfy_free(pr):
    import urllib.request
    try:
        req = urllib.request.Request(comfy.HOST + '/free', data=json.dumps({'unload_models': True, 'free_memory': True}).encode(),
                                     headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=30)
    except Exception as e:
        print('free failed', e)
    if pr is not None:
        pr.terminate()
        pr.wait(60)


if __name__ == '__main__':
    with comfy.gpu(OWNER, 'render'):
        pr = comfy_up()
        try:
            args = sys.argv[1:]
            looks = [a for a in args if a.startswith('look:')]
            blends = [a for a in args if a.startswith('blend:')]
            if blends:
                import glasses
                for a in blends:
                    glasses.blend(a)
            if looks:
                import look
                for a in looks:
                    look.run(a)
            elif not blends:
                main(args)
        finally:
            comfy_free(pr)
