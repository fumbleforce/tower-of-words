"""Final-approach interior by compositing (Jørgen's idea, 2026-09-25): start from his approved straight-on window shot
(art/approved/monorail-interior-ref.webp), make it an empty seat bay at the game's size, and paste a separately rendered
view of the island station into the window, then blend with a light masked img2img pass.

Steps (all RDBT Anima, short prompts that describe only what is visible):
  1. base:   the master resized to 1216 wide, padded to 1216x832, pad strips outpainted (masked img2img, denoise 1.0)
  2. empty:  the man on the left repainted as an empty seat (masked, denoise 0.95)
  3. view:   the window view rendered on its own (txt2img)
  4. paste:  the view scaled into the window rectangle (feathered edge)
  5. blend:  masked img2img over the window at low denoise, so glass, reflections and light match the room
Usage: ~/ai/sd/venv/bin/python tools/blockout/composite.py [platform|approach|close] [view_seed ...]
Output: art/production/B1/comp-*.png"""
import os, sys, json, subprocess, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy
from shots import wait_turn, NO_PEOPLE_N

ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(ROOT, 'art', 'production', 'B1')
WORK = os.path.join(OUT, 'comp-work')
REF = os.path.join(ROOT, 'art', 'approved', 'monorail-interior-ref.webp')
STYLE = ('anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, '
         'no humans, scenery, ')
NEG = NO_PEOPLE_N + ', readable text, logo'
W, H = 1216, 832
PAD = (H - 684) // 2          # the 1672x941 master becomes 1216x684, padded top and bottom
WIN = (140, 45 + PAD, 1162, 487 + PAD)   # window glass rectangle in the padded image (x0, y0, x1, y1)

ROOM = STYLE + 'Interior view inside a monorail train, straight on angle at one big side window. Two empty blue seats below the window. '


def magick(*a):
    subprocess.run(['magick', *a], check=True)


def masked(image, mask, prompt, denoise, seed, out, inpaint=True):
    wf = comfy.anima(prompt, NEG, model='rdbtAnima.safetensors', w=W, h=H, seed=seed)
    wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(image)}}
    wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
    wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mask), 'channel': 'red'}}
    wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
    wf['7']['inputs']['latent_image'] = ['13', 0]
    if inpaint:  # Anima LLLite inpainting patch: sees the unmasked picture, so the repaint matches its surroundings
        wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}}
        wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                               'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
        wf['7']['inputs']['model'] = ['A', 0]
    wf['7']['inputs']['denoise'] = denoise
    del wf['6']
    wf['9']['inputs']['filename_prefix'] = 'blockout/comp'
    wait_turn()
    comfy.run(wf, out)
    return wf


def base():
    os.makedirs(WORK, exist_ok=True)
    b0, m0 = os.path.join(WORK, 'pad.png'), os.path.join(WORK, 'pad-mask.png')
    b1, m1 = os.path.join(WORK, 'base.png'), os.path.join(WORK, 'man-mask.png')
    b2 = os.path.join(WORK, 'empty.png')
    if not os.path.exists(b2):
        # 1. pad with grey, mask the pad strips (white = repaint), outpaint
        magick(REF, '-resize', f'{W}x', '-background', '#8a8f96', '-gravity', 'center', '-extent', f'{W}x{H}', b0)
        magick('-size', f'{W}x{H}', 'xc:black', '-fill', 'white', '-draw', f'rectangle 0,0 {W},{PAD + 8}', '-draw', f'rectangle 0,{H - PAD - 8} {W},{H}', '-blur', '0x6', m0)
        masked(b0, m0, ROOM + 'A plain light grey ceiling with a light strip above, the seat fronts and a grey floor below. Morning light.', 1.0, 9101, b1)
        # 2. the man on the left becomes an empty seat
        magick('-size', f'{W}x{H}', 'xc:black', '-fill', 'white', '-draw', f'rectangle 0,{PAD + 140} 480,{H}', '-draw', f'rectangle 0,600 650,{H}', '-blur', '0x10', m1)
        masked(b1, m1, ROOM + 'Nobody on the seats. Morning light.', 0.95, 9102, b2)
    return b2


VIEW = (STYLE + 'painted clouds, the view from a monorail window: an elevated station platform right outside, with platform screen doors, '
        'a long flat roof on white pillars and glass walls, office towers of a city behind it catching the morning sun, clear blue sky. '
        'dominant clear sky blue, broad white and glass, sparse warm morning orange accents, bright hopeful light.')
# Seeds 9301/9302 used an earlier line ("close by the waterfront of a man-made island city ...") and got green hills; 9303+ use this one.
APPROACH = (STYLE + 'painted clouds, the view from a high monorail window: the calm sea far below with sunlight glittering on the water, '
            'a concrete monorail beam on tall pillars running alongside, and close by a flat man-made island city with office towers '
            'behind a straight stone seawall. '
            'dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light.')


# 9306+: the island came out small and far with "man-made island city", so this names only what fills the view.
CLOSE = (STYLE + 'painted clouds, the view from a high monorail window: the calm sea below with sunlight glittering on the water, '
         'a concrete monorail beam on tall pillars running alongside, and on the right, close by, the waterfront of a city with tall office towers '
         'and an elevated station with a long flat roof. '
         'dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light.')


def build(kind, view_seed, blend_seed=9201, blend=0.4):
    room = base()
    view = os.path.join(WORK, f'view-{kind}-{view_seed}.png')
    if not os.path.exists(view):
        wf = comfy.anima({'platform': VIEW, 'approach': APPROACH, 'close': CLOSE}[kind], NEG, model='rdbtAnima.safetensors', w=W, h=H // 2 + 16 * 5, seed=view_seed)
        wait_turn()
        comfy.run(wf, view)
    x0, y0, x1, y1 = WIN
    pasted = os.path.join(WORK, f'paste-{kind}-{view_seed}.png')
    from PIL import Image, ImageDraw, ImageFilter, ImageOps
    r = Image.open(room).convert('RGB')
    v = ImageOps.fit(Image.open(view).convert('RGB'), (x1 - x0, y1 - y0))
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((x0, y0, x1, y1), radius=28, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(3))
    layer = r.copy()
    layer.paste(v, (x0, y0))
    Image.composite(layer, r, m).save(pasted)
    out = os.path.join(OUT, f'comp-{kind}-{view_seed}.png')
    bmask = os.path.join(WORK, 'blend-mask.png')
    magick('-size', f'{W}x{H}', 'xc:black', '-fill', 'white', '-draw', f'roundrectangle {x0 - 20},{y0 - 20} {x1 + 20},{y1 + 20} 40,40', '-blur', '0x12', bmask)
    # the blend pass is a plain low-denoise repaint (no inpainting patch), so the pasted view is kept
    prompt = ROOM + {'platform': 'Through the window an elevated station platform right outside, office towers behind it. Morning light.',
                     'approach': 'Through the window the sea below and the island city with an elevated station close by. Morning light.',
                     'close': 'Through the window the sea below and a waterfront city with office towers close by. Morning light.'}[kind]
    wf = masked(pasted, bmask, prompt, blend, blend_seed, out, inpaint=False)
    return out, wf


if __name__ == '__main__':
    args = sys.argv[1:]
    kinds = [a for a in args if not a.isdigit()] or ['platform', 'approach']
    seeds = [int(s) for s in args if s.isdigit()] or [9301, 9302]
    for s in seeds:
        for kind in kinds:
            print(build(kind, s)[0], flush=True)
