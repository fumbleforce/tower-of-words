# char-mio-i2i turnaround: the target's own recipe (RDBT Anima img2img, denoise 0.6, seed 301, Euler A, 30 steps,
# CFG 5, the same prompt and negative as char-face-1's gen-i2i) over renders of our model from the other angles, so
# there is a matching side, three-quarter and back picture to project onto the model.
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_gen.py <job> <tag>[,<tag>...] [--src <dir>] [--denoise 0.6]
#     [--clean]   (for the clean reference: no glasses or drawstrings in the views)
# Sources: claude-mioi2i/src/<tag>.png (mio_i2i_build.py ... src). Outputs: claude-mioi2i/gen/<job>/<tag>.png with
# prompts.json. Takes the GPU lock (GUIDE, GPU lock), checks it before every render, frees ComfyUI's VRAM and
# releases the lock at the end.
#
# Staging (shot-staging), every view: Mio alone, standing straight, arms down, whole body in frame with the same
# margins as the target, plain light grey background, soft light from her right-front-above. The camera circles
# her at the target's height and distance: l40 sees her front and her left side (image right), l90 her left side
# in profile, l140 her back and left side, back her back, and r140, r90, r40 the same toward her right. The prompt
# names only what that camera sees: no face words for the back views.
import json
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import comfy  # noqa: E402

import mio_i2i_cam as C  # noqa: E402

LOCK = '/tmp/claude-1000/gpu.lock'
ME = 'claude-agent:mio-i2i'
MODEL = 'rdbtAnima.safetensors'
QT = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic'
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, '
       'bad anatomy, extra limbs, child, loli, text, watermark, signature, fat, obese, plump, '
       '(rim light, red rim light, red outline, backlighting:1.4), holding, holding object, phone, cup, realistic, '
       'photorealistic')
WHO = ('1girl, solo, Mio, a 25-year-old woman: black hair with green underneath, light tan eyes, narrow almond eyes, '
       'half-lidded, slim with soft curves, oversized black hoodie')
STYLE = 'low poly 3d game character, faceted flat-shaded polygons'
# what each camera sees, in the target prompt's words (the target: "glasses, calm neutral expression, ..., anime face,
# looking at the viewer")
VIEW = {
    'front': 'glasses, calm neutral expression, {s}, anime face, looking at the viewer',
    'l40': 'glasses, calm neutral expression, {s}, anime face, three-quarter view, looking ahead',
    'r40': 'glasses, calm neutral expression, {s}, anime face, three-quarter view, looking ahead',
    'l90': 'glasses, calm neutral expression, {s}, from side, profile, looking ahead',
    'r90': 'glasses, calm neutral expression, {s}, from side, profile, looking ahead',
    'l140': '{s}, from behind, facing away',
    'r140': '{s}, from behind, facing away',
    'back': '{s}, from behind, facing away, back of the hoodie',
}


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
            time.sleep(120)


def mine():
    try:
        return ME in open(os.path.join(LOCK, 'owner')).read()
    except OSError:
        return False


def unlock():
    import urllib.request
    try:
        urllib.request.urlopen(urllib.request.Request(comfy.HOST + '/free', data=json.dumps(
            {'unload_models': True, 'free_memory': True}).encode(), headers={'Content-Type': 'application/json'}))
    except Exception as e:
        print('free failed', e)
    if mine():
        shutil.rmtree(LOCK)


def i2i_wf(image_name, prompt, negative, denoise, seed):
    wf = comfy.anima(prompt, negative, model=MODEL, w=1024, h=1024, seed=seed)
    wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': image_name}}
    wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
    del wf['6']
    wf['7']['inputs']['latent_image'] = ['11', 0]
    wf['7']['inputs']['denoise'] = denoise
    return wf


CLEAN = {'on': False}


def prompt_for(tag):
    v = VIEW[tag].format(s=STYLE)
    if CLEAN['on']:  # the clean reference has no glasses (they are geometry) and no drawstrings
        v = v.replace('glasses, ', '')
    return f'{QT}, safe, {WHO}, ' + v + ', plain light grey background'


def negative():
    return NEG + (', glasses, eyewear, drawstrings' if CLEAN['on'] else '')


def run(job, tags, src_dir, denoise, seed=301):
    from PIL import Image
    out = os.path.join(C.OUT, 'gen', job)
    os.makedirs(out, exist_ok=True)
    log = os.path.join(out, 'prompts.json')
    data = json.load(open(log)) if os.path.exists(log) else {}
    for tag in tags:
        if not mine():
            sys.exit('lost the GPU lock; stopping')
        png = os.path.join(src_dir, tag + '.png')
        tmp = os.path.join('/tmp/claude-1000', f'mioi2i-{job}-{tag}.png')
        im = Image.open(png).convert('RGBA')
        bg = Image.new('RGBA', im.size, (229, 232, 236, 255))
        bg.alpha_composite(im)
        bg.convert('RGB').save(tmp)
        p = prompt_for(tag)
        path = os.path.join(out, tag + '.png')
        comfy.run(i2i_wf(comfy.upload(tmp), p, negative(), denoise, seed), path)
        data[tag] = dict(model=MODEL, seed=seed, denoise=denoise, steps=30, cfg=5, sampler='euler_ancestral',
                         source=os.path.relpath(png, C.MAIN), prompt=p, negative=negative())
        json.dump(data, open(log, 'w'), indent=1, ensure_ascii=False)
        print('wrote', path, flush=True)


def main():
    a = sys.argv[1:]
    src = os.path.join(C.OUT, 'src')
    dn = 0.6
    if '--src' in a:
        k = a.index('--src')
        src = a[k + 1]
        a = a[:k] + a[k + 2:]
    if '--clean' in a:
        CLEAN['on'] = True
        a.remove('--clean')
    if '--denoise' in a:
        k = a.index('--denoise')
        dn = float(a[k + 1])
        a = a[:k] + a[k + 2:]
    job, tags = a[0], a[1].split(',')
    lock()
    try:
        run(job, tags, src, dn)
    finally:
        unlock()


if __name__ == '__main__':
    main()
