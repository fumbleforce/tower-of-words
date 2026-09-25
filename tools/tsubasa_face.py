"""Tsubasa face redo: repaint only her face (brow to chin, profile edge) in the house RDBT style.
Base: art/production/D2/new-tsubasa-208.png (approved design, reframed on proto2/cast-fixed). Her face came out with a long jutting
profile and heavy contour shading, unlike the rest of the cast. Hair, outfit, pose and framing must stay identical, so the face
area is cropped, upscaled, inpainted with a latent noise mask (same graph as tools/puppet_frames.py), scaled back and pasted
through a feathered mask. The result is then placed into the reframed canvas at (56, 144), where reframe.py put the original.
Candidates: art/production/TF/<name>.png (896x1152) and art/production/TF/<name>-rf.png (1008x1296).
Run: ~/ai/sd/venv/bin/python tools/tsubasa_face.py <name>:<denoise>:<seed>[:<extra words>] ...
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy
from production import Q, N, ROOT
from puppet_frames import inpaint
from locations1 import wait_turn
from framecheck import check
from PIL import Image, ImageDraw, ImageFilter

BASE = os.path.join(ROOT, 'art/production/D2/new-tsubasa-208.png')
OUT = os.path.join(ROOT, 'art/production/TF')
CROP = (200, 60, 680, 540)   # 480 px square around the head
UP = 1024
# Face area in sprite coords: under the hairline to the chin, from in front of the ear out past the nose and chin line,
# so the model can redraw a shorter profile. The ear, the hair on top and the neck stay.
FACE_SMALL = [(355, 185), (530, 185), (535, 280), (530, 350), (490, 400), (445, 440), (405, 440), (350, 400), (315, 355), (315, 310), (335, 240)]
# Wider: out into the background in front of the profile and down over the throat, so the chin and nose can sit further back.
FACE_WIDE = [(350, 180), (530, 180), (540, 280), (535, 360), (500, 430), (450, 480), (390, 480), (330, 430), (285, 365), (285, 300), (320, 230)]
# Chin: the small mask with its lower edge moved down over the throat, so the jaw can end higher; the hair locks in front stay out.
FACE_CHIN = [(355, 185), (530, 185), (535, 280), (535, 360), (505, 430), (455, 475), (400, 470), (350, 400), (315, 355), (315, 310), (335, 240)]
FACE = FACE_SMALL
OFFSET = (56, 144)
DESC = ('1girl, solo, Tsubasa, a 27-year-old woman, short light-brown hair tied back in a small ponytail, lightly tanned skin, '
        'small stud earring, side view, looking down, calm face, closed mouth, royal-blue track jacket, plain light grey background')
# Prompt style from 2026-09-25 (art/PROMPTS.md reference): the style line, then a few plain sentences, one idea each.
STYLE_LINE = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart'
PLAIN = ('A young woman seen from the side, looking down at something in her hands. '
         'She has a soft, simple anime face with a small nose and a small chin. '
         'Her short light-brown hair is tied back in a small ponytail. '
         'She has lightly tanned skin and a small stud earring. '
         'Her expression is calm.')
PROMPT_MODE = 'tags'


def mask(size, pts, blur):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))


def run(name, denoise, seed, extra=''):
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f'{name}.png')
    if os.path.exists(out):
        return out
    base = Image.open(BASE).convert('RGB')
    s = UP / (CROP[2] - CROP[0])
    crop_png, mask_png = os.path.join(OUT, 'crop.png'), os.path.join(OUT, 'mask-crop.png')
    base.crop(CROP).resize((UP, UP), Image.LANCZOS).save(crop_png)
    mask((UP, UP), [((x - CROP[0]) * s, (y - CROP[1]) * s) for x, y in FACE], 10).convert('RGB').save(mask_png)
    if PROMPT_MODE == 'plain':
        prompt = f'{STYLE_LINE}. {PLAIN}' + (f' {extra}' if extra else '')
    else:
        prompt = f'{Q}, {DESC}' + (f', {extra}' if extra else '')
    wf = inpaint(crop_png, mask_png, prompt, seed, denoise)
    for d in (os.path.join(ROOT, 'tools/workflows'), os.path.expanduser('~/ai/workflows')):
        json.dump(wf, open(os.path.join(d, 'tsubasa-face-inpaint.json'), 'w'), indent=1)
    tmp = out + '.crop.png'
    wait_turn()
    comfy.run(wf, tmp)
    rep = Image.open(tmp).convert('RGB').resize((CROP[2] - CROP[0], CROP[3] - CROP[1]), Image.LANCZOS)
    full = base.copy()
    full.paste(rep, CROP[:2])
    Image.composite(full, base, mask(base.size, FACE, 4)).save(out)
    os.rename(tmp, os.path.join(OUT, f'{name}-crop.png'))
    rf = Image.open(os.path.join(ROOT, 'art/production/RF/tsubasa.png')).convert('RGB')
    rf.paste(Image.open(out), OFFSET)
    rf.save(os.path.join(OUT, f'{name}-rf.png'))
    log = os.path.join(OUT, 'log.json')
    L = json.load(open(log)) if os.path.exists(log) else {}
    L[name] = {'denoise': denoise, 'seed': seed, 'prompt': prompt, 'negative': N, 'crop': CROP, 'face_mask': FACE}
    json.dump(L, open(log, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, denoise, seed, '| frame:', '; '.join(check(os.path.join(OUT, f'{name}-rf.png'))) or 'clear', flush=True)
    return out


if __name__ == '__main__':
    for a in sys.argv[1:]:
        if a == '--wide':
            FACE = FACE_WIDE
            continue
        if a == '--chin':
            FACE = FACE_CHIN
            continue
        if a == '--plain':
            PROMPT_MODE = 'plain'
            continue
        p = a.split(':', 3)
        run(p[0], float(p[1]), int(p[2]), p[3] if len(p) > 3 else '')
