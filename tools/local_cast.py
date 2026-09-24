"""Run the cast through several local models via ComfyUI. Output: art/company/local/<set>/<character>.png"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'company', 'local')
CAST = {
    'rei': '1girl, solo, mature female, grey hair, long hair, high ponytail, sharp eyes, eyeliner, gold hoop earrings, white suit, black shirt, lapel pin, holding pen, pen to lips, looking down, smirk',
    'emi': '1girl, solo, mature female, brown hair, long hair, wavy hair, claw clip, red-framed eyewear, white collared shirt, sleeves rolled up, lanyard, crossed arms, smirk',
    'mio': '1girl, solo, black hair, green inner hair, messy hair, hair bun, glasses, half-closed eyes, tired, black hoodie, off shoulder, headphones around neck, holding can, expressionless',
    'aoi': '1girl, solo, pink hair, two-tone hair, black roots, medium hair, varsity jacket, crop top, midriff, holding lollipop, one eye closed, grin',
    'kaori': '1girl, solo, mature female, grey hair, short hair, chef uniform, sleeves rolled up, arm tattoo, towel on shoulder, holding bowl, curry, smile',
    'goro': '1boy, solo, old man, white hair, stubble, round eyewear, beige cardigan, plaid shirt, gardening gloves, holding potted plant, tomato plant, smile',
    'ishibashi': '1boy, solo, old man, grey hair, mustache, thick eyebrows, glasses, security guard, navy uniform, peaked cap, holding newspaper, suspicious, squinting',
    'jun': '1boy, solo, mature male, black hair, long hair, ponytail, scar on eyebrow, black vest, white shirt, sleeves rolled up, holding glass, towel, half smile',
    'yuzuki': '1girl, solo, mature female, brown hair, long hair, wavy hair, makeup, pearl earrings, cream blouse, pencil skirt, holding microphone, smile, tired eyes',
}
COMMON = 'upper body, looking at viewer, simple background, grey background'
SDXL_Q = 'masterpiece, best quality, amazing quality, very aesthetic, absurdres, anime coloring, anime screencap'
SDXL_N = 'lowres, bad anatomy, bad hands, missing fingers, extra digits, cropped, text, signature, watermark, username, blurry, worst quality, low quality, jpeg artifacts, child, loli'
ANIMA_Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe, anime screenshot'
ANIMA_N = 'worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, missing fingers, extra fingers, child, loli'

SETS = [('anima-nova', None, None, None), ('anima-nova-rl', None, 'anima-rl-v0.1.safetensors', None)] + [(f'sdxl-{n}', f'{n}.safetensors', None, None) for n in
        ['waiIllustriousSDXL_v170', 'waiMature', 'hassaku', 'novaAnime', 'oneObsession', 'prefect']] + [
    ('wai-jjk', 'waiIllustriousSDXL_v170.safetensors', 'jjk_style.safetensors', 'jjk_style_v3'),
    ('wai-screencap', 'waiIllustriousSDXL_v170.safetensors', 'anime_screencap.safetensors', 'anime screencap, anime coloring'),
]

only = sys.argv[1:]
for name, ckpt, lora, trigger in SETS:
    if only and name not in only:
        continue
    for ch, tags in CAST.items():
        path = os.path.join(OUT, name, f'{ch}.png')
        if os.path.exists(path):
            continue
        t = time.time()
        if ckpt is None:
            wf = comfy.anima(f'{ANIMA_Q}, {tags}, {COMMON}', ANIMA_N, w=896, h=1152, steps=30, cfg=5, seed=1, loras=[(lora, 1.2)] if lora else ())
        else:
            pre = f'{trigger}, ' if trigger else ''
            wf = comfy.sdxl(f'{pre}{tags}, {COMMON}, {SDXL_Q}', SDXL_N, ckpt, lora=lora, lora_weight=0.8, seed=1)
        try:
            comfy.run(wf, path)
            print('ok', name, ch, round(time.time() - t), 's', flush=True)
        except Exception as e:
            print('FAIL', name, ch, str(e)[:200], flush=True)
