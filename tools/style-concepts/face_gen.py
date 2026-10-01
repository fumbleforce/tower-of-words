# Local image generation for the char-face round (RDBT Anima on ComfyUI, art/PROMPTS.md settings: Euler A, 30 steps,
# CFG 5). Every render and its prompt go to the main checkout's art/parts/style-concepts/claude-facetface/gen/<job>/
# (git-ignored) with a prompts.json log, so every attempt can go on the Review page.
#   python3 tools/style-concepts/face_gen.py front            front-facing face close-ups, the face texture source
#   python3 tools/style-concepts/face_gen.py ref              full-body front views in a faceted low-poly look
#   python3 tools/style-concepts/face_gen.py i2i <job> <png>:<char> ... [--denoise 0.45,0.6]
#                                                             img2img over our own renders: how the face should look
#   python3 tools/style-concepts/face_gen.py hires <png>:<char>:<x0,y0,x1,y1> ...
#                                                             the face cropped, scaled to 1024 and repainted at 0.4
#   python3 tools/style-concepts/face_gen.py expr <char> <src.png> <mask.png> <expr> [seeds]
#                                                             repaint eyes, brows and mouth of a chosen front face
# Takes the GPU lock (GUIDE, GPU lock) and waits for it up to 40 minutes, checks it before every render, frees
# ComfyUI's VRAM and releases the lock at the end.
#
# Staging (shot-staging), front: one person, head and the top of the shoulders, camera straight in front at eye
# level, face square to the lens, eyes into the lens, plain white background, soft even light, no props.
# ref: one person standing, whole body in frame, camera in front at chest height, plain light grey background.
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy  # noqa: E402

MAIN = os.path.dirname(subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute',
                                                '--git-common-dir'], text=True).strip())
OUT = os.path.join(MAIN, 'art/parts/style-concepts/claude-facetface/gen')
LOCK = '/tmp/claude-1000/gpu.lock'
ME = 'claude-agent:char-face'
MODEL = 'rdbtAnima.safetensors'

QT = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic'
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, '
       'bad anatomy, extra limbs, child, loli, text, watermark, signature, fat, obese, plump, '
       '(rim light, red rim light, red outline, backlighting:1.4), holding, holding object, phone, cup')
NEG_2D = NEG + ', 3d, realistic, photorealistic, render, chubby, western cartoon, comic book, flat vector, poster art'
WHO = {
    'mio': ('1girl', 'Mio, a 25-year-old woman: black hair with green underneath, light tan eyes, narrow almond eyes, '
                     'half-lidded, slim with soft curves, oversized black hoodie'),
    'eric': ('1boy', 'Eric, a 29-year-old Nordic man: dark-blond hair, same colour all over, tied in a short ponytail '
                     'at the back, light blond eyebrows, blue eyes, fair pale skin, short stubble on his jaw and chin, '
                     'slim average build, grey hoodie under a navy blazer, no blush'),
}
EXPR = {'mio': 'calm neutral expression', 'eric': 'faint friendly smile'}
HAIR_BACK = {'mio': 'hair pulled back into a loose bun, forehead visible', 'eric': 'hair combed back, forehead visible'}
STYLE = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart'
HAIR_BACK2 = {'mio': 'all her hair tied back tightly into a bun, forehead and whole face clear of hair',
              'eric': 'hair combed straight back, forehead and whole face clear of hair'}
NEG_WHO = {'mio': '', 'eric': ', undercut, shaved sides, two-tone hair'}


def lock():
    t0 = time.time()
    while True:
        try:
            os.mkdir(LOCK)
            open(os.path.join(LOCK, 'owner'), 'w').write(ME)
            return
        except FileExistsError:
            if time.time() - t0 > 40 * 60:
                sys.exit('GPU lock still held after 40 minutes: ' + open(os.path.join(LOCK, 'owner')).read())
            time.sleep(90)


def mine():
    try:
        return ME in open(os.path.join(LOCK, 'owner')).read()
    except OSError:
        return False


def unlock():
    import urllib.request
    try:  # /free answers with an empty body
        urllib.request.urlopen(urllib.request.Request(comfy.HOST + '/free', data=json.dumps(
            {'unload_models': True, 'free_memory': True}).encode(), headers={'Content-Type': 'application/json'}))
    except Exception as e:
        print('free failed', e)
    if mine():
        shutil.rmtree(LOCK)


def i2i_wf(image_name, prompt, negative, denoise, seed, mask=None):
    wf = comfy.anima(prompt, negative, model=MODEL, w=1024, h=1024, seed=seed)
    wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': image_name}}
    wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
    latent = ['11', 0]
    if mask:
        wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': mask, 'channel': 'red'}}
        wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
        wf['14'] = {'class_type': 'DifferentialDiffusion', 'inputs': {'model': wf['7']['inputs']['model']}}
        wf['7']['inputs']['model'] = ['14', 0]
        latent = ['13', 0]
    del wf['6']
    wf['7']['inputs']['latent_image'] = latent
    wf['7']['inputs']['denoise'] = denoise
    return wf


def render(job, name, wf, meta):
    if not mine():
        sys.exit('lost the GPU lock; stopping')
    d = os.path.join(OUT, job)
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, name + '.png')
    comfy.run(wf, path)
    log = os.path.join(d, 'prompts.json')
    data = json.load(open(log)) if os.path.exists(log) else {}
    data[name] = meta
    json.dump(data, open(log, 'w'), indent=1, ensure_ascii=False)
    print('wrote', path, flush=True)


def front(seeds=(101, 102, 103, 104), v=1):
    """v1: the plain prompt (Eric came out photographic on three seeds of four). v2: the anime style anchors
    (art/PROMPTS.md, Models and prompt shape), pale skin, and no loose hair across the face."""
    job = 'front' if v == 1 else f'front{v}'
    for ch, (n, who) in WHO.items():
        if v == 1:
            p = (f'{QT}, safe, {n}, solo, {who}, {HAIR_BACK[ch]}, {EXPR[ch]}, close-up of the face, front view, '
                 f'facing the viewer straight on, looking at the viewer, plain white background, soft even light')
            neg = NEG_2D + ', glasses, eyewear, bangs covering eyebrows' + NEG_WHO[ch]
        else:
            p = (f'{QT}, {STYLE}, safe, {n}, solo, {who}, pale skin, {HAIR_BACK2[ch]}, {EXPR[ch]}, close-up of the '
                 f'face, front view, facing the viewer straight on, looking at the viewer, plain white background, '
                 f'soft even light')
            neg = (NEG_2D + ', glasses, eyewear, bangs, hair over eyes, hair across face, loose strands, tan, '
                   'dark skin' + NEG_WHO[ch])
        for s in seeds:
            wf = comfy.anima(p, neg, model=MODEL, w=1024, h=1024, seed=s)
            render(job, f'{ch}-{job}-{s}', wf, dict(model=MODEL, seed=s, size='1024x1024', steps=30, cfg=5,
                                                          sampler='euler_ancestral', prompt=p, negative=neg))


def ref(seeds=(201, 202, 203)):
    for ch, (n, who) in WHO.items():
        p = (f'{QT}, safe, {n}, solo, {who}, glasses, low poly 3d game character, faceted flat-shaded polygons, simple '
             f'shapes, anime face painted on the head, full body, standing, front view, facing the viewer, arms at '
             f'the sides, plain light grey background')
        neg = NEG + NEG_WHO[ch] + ', realistic, photorealistic'
        for s in seeds:
            wf = comfy.anima(p, neg, model=MODEL, w=832, h=1216, seed=s)
            render('ref', f'{ch}-ref-{s}', wf, dict(model=MODEL, seed=s, size='832x1216', steps=30, cfg=5,
                                                      sampler='euler_ancestral', prompt=p, negative=neg))


def i2i(job, items, denoises, seed=301):
    for it in items:
        png, ch = it.rsplit(':', 1)
        n, who = WHO[ch]
        name0 = os.path.splitext(os.path.basename(png))[0]
        src = os.path.join('/tmp/claude-1000', f'facegen-{job}-{name0}.png')
        from PIL import Image
        im = Image.open(png).convert('RGBA')
        bg = Image.new('RGBA', im.size, (229, 232, 236, 255))
        bg.alpha_composite(im)
        bg.convert('RGB').resize((1024, 1024)).save(src)
        up = comfy.upload(src)
        p = (f'{QT}, safe, {n}, solo, {who}, glasses, {EXPR[ch]}, low poly 3d game character, faceted flat-shaded '
             f'polygons, anime face, looking at the viewer, plain light grey background')
        neg = NEG + NEG_WHO[ch] + ', realistic, photorealistic'
        for d in denoises:
            render(job, f'{name0}-d{int(d * 100)}', i2i_wf(up, p, neg, d, seed),
                   dict(model=MODEL, seed=seed, denoise=d, source=os.path.relpath(png, MAIN), prompt=p, negative=neg))


def hires(items, denoise=0.4, seed=501):
    """Crop the face out of a front render (a square box), scale it to 1024 and repaint it lightly, so the eyes
    get drawn at texture resolution (art/PROMPTS.md, Deriving shots: crop toward the subject, repaint 0.35 to 0.5)."""
    from PIL import Image
    for it in items:
        png, ch, box = it.split(':')
        box = [int(v) for v in box.split(',')]
        n, who = WHO[ch]
        name0 = os.path.splitext(os.path.basename(png))[0]
        src = os.path.join('/tmp/claude-1000', f'facegen-hires-{name0}.png')
        Image.open(png).convert('RGB').crop(box).resize((1024, 1024), Image.LANCZOS).save(src)
        p = (f'{QT}, safe, {n}, solo, {who}, {HAIR_BACK[ch]}, {EXPR[ch]}, close-up of the face, front view, facing '
             f'the viewer straight on, looking at the viewer, plain white background, soft even light')
        neg = NEG_2D + ', glasses, eyewear' + NEG_WHO[ch]
        render('hires', f'{name0}-hires', i2i_wf(comfy.upload(src), p, neg, denoise, seed),
               dict(model=MODEL, seed=seed, denoise=denoise, source=os.path.relpath(png, MAIN), crop=box,
                    method='crop, scale to 1024, img2img', prompt=p, negative=neg))


def expr(ch, src, mask, words, seeds):
    n, who = WHO[ch]
    up, mk = comfy.upload(src), comfy.upload(mask)
    p = (f'{QT}, safe, {n}, solo, {who}, {HAIR_BACK[ch]}, {words}, close-up of the face, front view, facing the '
         f'viewer straight on, looking at the viewer, plain white background, soft even light')
    neg = NEG_2D + ', glasses, eyewear, frown, furrowed brow, angry' + NEG_WHO[ch]
    tag = words.split(',')[0].replace(' ', '-')
    for s in seeds:
        for d in (0.6, 0.72):
            render('expr', f'{ch}-{tag}-{s}-d{int(d * 100)}', i2i_wf(up, p, neg, d, s, mask=mk),
                   dict(model=MODEL, seed=s, denoise=d, source=os.path.relpath(src, MAIN), mask=os.path.relpath(mask, MAIN),
                        prompt=p, negative=neg, method='masked img2img, DifferentialDiffusion'))


def main():
    a = sys.argv[1:]
    lock()
    try:
        if a[0] == 'front':
            front()
        elif a[0] == 'ref':
            ref()
        elif a[0] == 'both':
            front()
            ref()
        elif a[0] == 'i2i':
            dn = [0.45, 0.6]
            if '--denoise' in a:
                k = a.index('--denoise')
                dn = [float(x) for x in a[k + 1].split(',')]
                a = a[:k] + a[k + 2:]
            i2i(a[1], a[2:], dn)
        elif a[0] == 'front2':
            front((111, 112, 113, 114), v=2)
        elif a[0] == 'hires':
            hires(a[1:])
        elif a[0] == 'expr':
            expr(a[1], a[2], a[3], a[4], [int(s) for s in (a[5].split(',') if len(a) > 5 else ['401', '402'])])
    finally:
        unlock()


if __name__ == '__main__':
    main()
