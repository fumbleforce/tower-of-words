"""Round 3: complex scenes the game will need (environments, crowds, work, magic, the main character).
Output: art/company/local3/<model>/<scene>.png"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'company', 'local3')
MC_TEXT = 'a 29-year-old Nordic man with messy sandy-blond hair, light stubble and blue eyes, white shirt with rolled sleeves, company lanyard'
MC_TAGS = '1boy, blonde hair, messy hair, stubble, blue eyes, white shirt, sleeves rolled up, lanyard, adult'
SCENES = {
    'island': (
        'no humans, scenery, city, island, skyscraper, monorail, bridge, ocean, dusk, sunset, orange sky, city lights, wide shot, from above, detailed background',
        'A wide establishing shot of a giant corporate city built on a man-made island in Tokyo Bay at dusk: glass towers, dorm blocks, a factory district with chimneys, a monorail gliding in on a long bridge, city lights coming on, orange and violet sky reflected in the water. No people.',
        1216, 832),
    'crowd': (
        f'{MC_TAGS}, crowd, multiple boys, multiple girls, office workers, suits, security gate, turnstile, morning, lobby, walking, old man, security guard, mustache, peaked cap, watching, wide shot',
        f'The morning rush at the security gates of a huge corporate headquarters: hundreds of employees in suits streaming through glass turnstiles. In the middle of the crowd, {MC_TEXT}, looking around nervously on his first day. To the side, a wiry old security guard with a grey pencil moustache and peaked cap watches him suspiciously over his glasses. Bright morning light through a glass atrium.',
        1216, 832),
    'canteen': (
        f'{MC_TAGS}, holding tray, crowd, cafeteria, multiple girls, multiple boys, chef, grey hair, woman, serving food, counter, black hair, green inner hair, glasses, black hoodie, waving, sitting, lunch, noon, wide shot',
        f'A huge crowded staff canteen at lunchtime. Behind the serving counter, a tall calm woman chef with short grey hair and a tattooed forearm ladles curry. In the foreground, {MC_TEXT}, holding a lunch tray and looking for a seat. At a table in the background, a young woman with messy black hair with green underneath, glasses and a black hoodie lazily waves him over. Busy, noisy, sunlight through big windows onto the bay.',
        1216, 832),
    'meeting': (
        f'{MC_TAGS}, standing, presenting, projector screen, chart, meeting room, conference table, multiple boys, old man, suits, executives, sitting, 1girl, grey hair, high ponytail, white suit, crossed arms, smirk, glass wall, city view',
        f'A tense boardroom presentation: {MC_TEXT}, standing at the front beside a projector screen showing a sales chart, mid-sentence and a little nervous. Around a long table sit stern older executives in dark suits. At the end of the table, a sharp young woman with a silver high ponytail and a white suit leans back with her arms crossed and a knowing smirk. Glass walls, city skyline behind.',
        1216, 832),
    'magic': (
        f'{MC_TAGS}, magic, glowing, floating paper, flying papers, papers sorting themselves, glowing kanji, light particles, office, basement, desk, 1girl, brown hair, wavy hair, from behind, back turned, woman at whiteboard, secret, focused',
        f'Secret magic in a cluttered basement office: {MC_TEXT}, sitting at his desk with his hand raised slightly and a quiet focused look, while dozens of papers float up from messy stacks and file themselves neatly into folders, faint glowing Japanese characters drifting in the air around them. In the background, a woman with wavy brown hair in a claw clip writes on a whiteboard with her back turned, unaware. Warm lamp light mixed with the soft cyan glow of the magic.',
        1216, 832),
    'mc': (
        f'{MC_TAGS}, solo, backpack, holding phone, smile, nervous, upper body, looking at viewer, simple background, grey background',
        f'Portrait of {MC_TEXT}, with a backpack over one shoulder and a phone in his hand, a friendly slightly nervous smile, the kind of person who just moved to Japan. Waist-up, plain light grey background.',
        896, 1152),
    'bar': (
        f'{MC_TAGS}, sitting, bar counter, bar, night, rain, window, 1boy, bartender, long hair, black hair, ponytail, black vest, polishing glass, whiskey, amber lighting, bottles, multiple boys',
        f'Late night in a small quiet bar: {MC_TEXT}, sitting at the dark wood counter with a glass of whisky, tired after his first day. Behind the counter, a 40-year-old bartender with long black hair tied back, a scar through one eyebrow and a black waistcoat polishes a glass and listens with a calm half-smile. Backlit shelves of bottles, warm amber light, rain on the window.',
        1216, 832),
}
SDXL_Q = 'masterpiece, best quality, amazing quality, very aesthetic, absurdres, short fingernails'
SDXL_N = 'lowres, bad anatomy, bad hands, missing fingers, extra digits, extra arms, cropped, text, signature, watermark, username, blurry, worst quality, low quality, long fingernails, claws, child, loli'
ANIMA_Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe'
ANIMA_N = 'worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, bad anatomy, bad hands, missing fingers, extra fingers, long fingernails, claws, child, loli'
MODELS = [('anima', None), ('novaXL', 'novaAnime.safetensors'), ('oneObsession', 'oneObsession.safetensors'),
          ('waiMature', 'waiMature.safetensors')]

for name, ckpt in MODELS:
    for scene, (tags, text, w, h) in SCENES.items():
        path = os.path.join(OUT, name, f'{scene}.png')
        if os.path.exists(path):
            continue
        t = time.time()
        if ckpt is None:
            wf = comfy.anima(f'{ANIMA_Q}, {text}', ANIMA_N, w=w, h=h, steps=30, cfg=5, seed=11)
        else:
            wf = comfy.sdxl(f'{tags}, {SDXL_Q}', SDXL_N, ckpt, w=w, h=h, seed=11)
        try:
            comfy.run(wf, path)
            print('ok', name, scene, round(time.time() - t), 's', flush=True)
        except Exception as e:
            print('FAIL', name, scene, str(e)[:200], flush=True)
