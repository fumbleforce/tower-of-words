"""Round 2 on the shortlisted local models: reward, implied-nudity reward, new character, two-character dialogue, action.
Output: art/company/local2/<model>/<scene>.png. Adults only; implied nudity at most (nothing explicit)."""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'company', 'local2')
NAILS_P = 'short fingernails'
NAILS_N = 'long fingernails, sharp fingernails, claws'
EXPLICIT_N = 'nipples, pussy, penis, sex, explicit'

# Each scene: (tags for SDXL, natural-language prompt for Anima, width, height, rating)
SCENES = {
    'reward': (
        '1girl, solo, adult, black hair, green inner hair, messy hair, hair bun, glasses, oversized t-shirt, off shoulder, short shorts, bare legs, lying on bed, on stomach, holding handheld game console, looking at viewer, embarrassed, blush, night, dark bedroom, screen glow',
        'Mio, a 25-year-old woman with messy black hair with green underneath in a bun and glasses, lying on her stomach on her dorm bed late at night in an oversized t-shirt slipping off one shoulder and short shorts, holding a handheld game console, caught by the viewer, embarrassed blush, glow from the screen, dark cosy bedroom.',
        896, 1152, 'sensitive'),
    'spicy': (
        '1girl, solo, mature female, grey hair, long hair, hair up, towel on head, onsen, completely nude, from behind, bare back, bare shoulders, looking back, looking at viewer, steam, water, partially submerged, blush, seductive smile, night, lanterns',
        'Rei, a 26-year-old woman with long silver-grey hair pinned up under a small towel, bathing alone in an outdoor hot spring at night, seen from behind with her bare back and shoulders above the water, looking back over her shoulder at the viewer with a slow teasing smile and a faint blush, thick steam, stone lanterns, nothing explicit visible.',
        896, 1152, 'nsfw'),
    'newchar': (
        '1girl, solo, mature female, platinum blonde hair, bob cut, mole under eye, sharp eyes, black turtleneck dress, gold necklace, crossed arms, holding folder, smirk, office, upper body, looking at viewer',
        'Saki, a 28-year-old woman who heads the company legal department: platinum blonde bob, beauty mark under one eye, sharp amused eyes, black turtleneck dress, thin gold necklace, arms crossed holding a folder of contracts, a dangerous smile, standing in a glass-walled office at dusk.',
        896, 1152, 'safe'),
    'dialogue': (
        '2girls, adult, arguing, office, desk, computer monitor, woman with brown wavy hair and red-framed eyewear and white shirt pointing at monitor, annoyed, woman with messy black hair with green inner hair and glasses and black hoodie slumped in office chair, holding can, bored, cluttered basement office, lamp light',
        'Two women arguing in a cluttered basement office. On the left, Emi, 32, wavy brown hair in a claw clip, red glasses, white shirt with rolled sleeves, leaning over the desk and jabbing a finger at a computer monitor, exasperated. On the right, Mio, 25, messy black hair with green underneath, glasses, black hoodie, slumped in her office chair holding an energy drink, completely unbothered. Warm lamp light, stacks of files.',
        1216, 832, 'safe'),
    'action': (
        '1girl, solo, adult, pink hair, two-tone hair, black roots, varsity jacket, crop top, riding kick scooter, motion blur, speed lines, flying papers, lobby, glass, corporate building, dynamic angle, from below, grin, dutch angle',
        'Aoi, a 22-year-old intern with pink hair and dark roots in a varsity jacket and crop top, racing a kick scooter at full speed through a huge glass corporate lobby, papers flying everywhere behind her, shocked office workers blurred in the background, low dynamic dutch angle, motion blur, big reckless grin.',
        1216, 832, 'safe'),
}
SDXL_Q = 'masterpiece, best quality, amazing quality, very aesthetic, absurdres'
SDXL_N = 'lowres, bad anatomy, bad hands, missing fingers, extra digits, extra arms, cropped, text, signature, watermark, username, blurry, worst quality, low quality, child, loli'
ANIMA_Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic'
ANIMA_N = 'worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, bad anatomy, bad hands, missing fingers, extra fingers, child, loli'
MODELS = [('anima', None), ('novaXL', 'novaAnime.safetensors'), ('oneObsession', 'oneObsession.safetensors'),
          ('waiMature', 'waiMature.safetensors')]

for name, ckpt in MODELS:
    for scene, (tags, text, w, h, rating) in SCENES.items():
        path = os.path.join(OUT, name, f'{scene}.png')
        if os.path.exists(path):
            continue
        t = time.time()
        neg_extra = f'{NAILS_N}, {EXPLICIT_N}'
        if ckpt is None:
            wf = comfy.anima(f'{ANIMA_Q}, {rating}, {text} {NAILS_P}.', f'{ANIMA_N}, {neg_extra}', w=w, h=h, steps=30, cfg=5, seed=7)
        else:
            wf = comfy.sdxl(f'{tags}, {NAILS_P}, {SDXL_Q}', f'{SDXL_N}, {neg_extra}', ckpt, w=w, h=h, seed=7)
        try:
            comfy.run(wf, path)
            print('ok', name, scene, round(time.time() - t), 's', flush=True)
        except Exception as e:
            print('FAIL', name, scene, str(e)[:200], flush=True)
