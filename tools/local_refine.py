"""Anima composes, WAI-Mature repaints: image-to-image on the round-4 Anima scenes at two strengths.
Output: art/company/local4/refine/<scene>-<denoise>.png"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

SRC = os.path.join(os.path.dirname(__file__), '..', 'art', 'company', 'local4')
OUT = os.path.join(SRC, 'refine')
Q = 'masterpiece, best quality, amazing quality, very aesthetic, absurdres, short fingernails'
N = ('lowres, bad anatomy, bad hands, missing fingers, extra digits, text, signature, watermark, blurry, worst quality, '
     'low quality, long fingernails, claws, child, loli')
TAGS = {
    'island': 'no humans, scenery, city, island, skyscraper, monorail, bridge, ocean, dusk, sunset, city lights',
    'crowd': '1boy, blonde hair, stubble, white shirt, lanyard, backpack, crowd, office workers, suits, security guard, old man, mustache, peaked cap, lobby, turnstile, morning',
    'canteen': '1boy, blonde hair, holding tray, 2girls, chef, grey hair, black hair, glasses, black hoodie, waving, cafeteria, crowd, noon',
    'meeting': '1boy, blonde hair, standing, pointing, projector screen, chart, 1girl, grey hair, high ponytail, white suit, crossed arms, smirk, multiple boys, suits, meeting room, conference table, sunset',
    'magic': '1boy, blonde hair, sitting, desk, raised hand, glowing eyes, magic, floating paper, glowing kanji, light particles, 1girl, brown hair, from behind, whiteboard, office, lamp light',
    'mc': '1boy, solo, blonde hair, messy hair, stubble, blue eyes, white shirt, lanyard, backpack, holding phone, smile, upper body, grey background',
    'bar': '2boys, blonde hair, sitting, bar counter, whiskey, bartender, long hair, black hair, ponytail, black vest, polishing glass, night, rain, amber lighting',
}

os.makedirs(OUT, exist_ok=True)
for scene, tags in TAGS.items():
    src = os.path.join(SRC, f'{scene}-11.png')
    if not os.path.exists(src):
        continue
    name = comfy.upload(src)
    for d in (0.35, 0.5):
        path = os.path.join(OUT, f'{scene}-{d}.png')
        if os.path.exists(path):
            continue
        t = time.time()
        try:
            comfy.run(comfy.sdxl_refine(name, f'{tags}, {Q}', N, 'waiMature.safetensors', denoise=d, seed=11), path)
            print('ok', scene, d, round(time.time() - t), 's', flush=True)
        except Exception as e:
            print('FAIL', scene, d, str(e)[:200], flush=True)
