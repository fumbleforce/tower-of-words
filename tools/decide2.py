"""Cast decision round 2 (RDBT, 2 seeds per option). Output: art/production/D2/<name>.png, logged in the production manifest.
Kiyoko outfits and the office revision use Anima img2img with a latent noise mask (face kept) / plain img2img."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy
from production import run, portrait, Q, N, NO_PEOPLE_N, RDBT, OUT, load_manifest, MANIFEST
from office_bg import P as OFFICE_P, N as OFFICE_N
from PIL import Image, ImageDraw, ImageFilter

B = 'D2'
SEEDS = (201, 202)

OPTIONS = {
    # Yuzuki: clearly unlike Emi (auburn bob, glasses, curvy, warm). Orthogonal takes on "the company's public face, secretly tired".
    'yuzuki-a': ('1girl', 'Yuzuki, a 31-year-old company PR spokeswoman: very long straight jet-black hair with blunt bangs, tall and slender, sharp almond eyes with a precise wing of eyeliner, no glasses, pale ice-blue tailored skirt suit, a small silver company pin, a wireless earpiece in one ear, holding a tablet with her talking points in her left hand', 'a flawless camera-ready smile that stops short of her tired eyes'),
    'yuzuki-b': ('1girl', 'Yuzuki, a 31-year-old company PR spokeswoman: platinum-ash hair pulled into a sleek low chignon, a narrow face with a sharp chin, thin arched brows, no glasses, lilac silk blouse with a pussy-bow tie under a white cropped jacket, pearl stud earrings, a lanyard with a PRESS-style pass, a phone held against her chest', 'polite professional smile, faint dark circles under her eyes'),
    'yuzuki-c': ('1girl', 'Yuzuki, a 31-year-old company PR spokeswoman: short choppy dark-teal-black hair tucked behind one ear, athletic lean build, a long neck, a small mole on her chin, no glasses, a structured mustard-yellow blazer over a white turtleneck, silver hoop earrings, holding a paper cup of coffee in her right hand', 'dry, weary half-smile of someone who has given the same speech forty times'),
    'goro-a': ('1boy', 'Goro, a 61-year-old gentle retired engineer who keeps the rooftop garden: thick round glasses with clear lenses, short white hair, white stubble, beige cardigan over a checked shirt, gardening gloves, holding a small potted tomato plant with both hands', 'warm crinkly-eyed smile'),
    'goro-b': ('1boy', 'Goro, a 61-year-old gentle retired engineer who keeps the rooftop garden: thick round glasses with clear lenses, balding with white hair at the sides, white stubble, olive work apron over a faded blue button-up shirt, a pencil behind his ear, gardening gloves, holding a trowel in his right hand', 'patient, amused smile'),
    # Jun: not the scarred mysterious barman. The bar is a side job for someone with his own life.
    'jun-a': ('1boy', 'Jun, a 38-year-old man who runs the company bar in the evenings and works in payroll by day: neat short black hair, rectangular glasses with clear lenses, clean-shaven, white shirt with the sleeves rolled up, a dark-green apron, a ballpoint pen in his shirt pocket, drying a glass with a towel', 'mild, attentive expression, the look of someone who remembers everyone\'s order'),
    'jun-b': ('1boy', 'Jun, a 45-year-old former jazz drummer who now runs the company bar: stocky build, grey-flecked beard, flat cap, brown knit vest over a white shirt, drumsticks sticking out of his back pocket, polishing a whisky glass', 'easy warm grin'),
    'jun-c': ('1girl', 'Jun, a 34-year-old woman who runs the company bar: cropped silver-dyed undercut, several ear piercings, a black shirt with the sleeves rolled up and a waistcoat, strong forearms, mixing a drink in a shaker held in both hands', 'calm, knowing look, one eyebrow slightly raised'),
    # Ishibashi: stern old guard who becomes an ally. Varied takes.
    'ishibashi-a': ('1boy', 'Ishibashi, a 63-year-old company gate guard: tall and heavy-set, thick grey eyebrows, a flat-top grey haircut, deep lines around his mouth, navy security uniform with a neat tie and a radio on his shoulder, a thermos flask in his left hand', 'unimpressed, heavy-lidded stare'),
    'ishibashi-b': ('1boy', 'Ishibashi, a 64-year-old company gate guard and retired police officer: small and wiry, completely bald head, a thin white moustache, reading glasses with clear lenses pushed up on his forehead, navy security uniform and white gloves, holding a clipboard with a visitor log in his right hand', 'suspicious narrowed eyes'),
    'ishibashi-c': ('1boy', 'Ishibashi, a 60-year-old company gate guard: broad-shouldered, salt-and-pepper crew cut, a strong square jaw, a faded scar on his chin, navy security uniform with rolled sleeves showing strong forearms, a peaked cap tucked under his arm, arms folded', 'stern, but with a glint of humour in his eyes'),
    # Saki: keep the s102 attitude, not Rei (silver ponytail, white suit, grey eyes).
    'saki-a': ('1girl', 'Saki, a 28-year-old woman who heads the company legal department: glossy chin-length jet-black bob with a severe straight fringe, a beauty mark under her left eye, dark red eyes, narrow face, a deep burgundy three-piece trouser suit with a waistcoat, gold cufflinks, holding a leather folder in her left hand', 'a dangerous, amused smile'),
    'saki-b': ('1girl', 'Saki, a 28-year-old woman who heads the company legal department: long dark-chestnut hair in a loose side braid over one shoulder, a beauty mark under her left eye, amber eyes, rimless glasses with clear lenses, a forest-green fitted sheath dress with a thin belt, a gold wristwatch, arms crossed with a folder tucked under one arm', 'a dangerous, amused smile'),
    'nanami-a': ('1girl', 'Nanami, a 29-year-old company security officer: tall and athletic, long dark-brown hair in a practical braid, a strong jaw, navy company security uniform with a radio clipped to her chest, a flashlight on her belt, holding a paper cup of coffee in her left hand', 'serious, focused, a faint blush'),
    'nanami-b': ('1girl', 'Nanami, a 29-year-old company security officer: short fluffy auburn-brown hair, freckles, a sturdy build, navy company security jacket over a grey hoodie, a lanyard with keycards, hands on her hips', 'earnest, eager smile'),
    'nanami-c': ('1girl', 'Nanami, a 29-year-old company security officer: dark-blue-black hair in a high tight ponytail, sharp eyes, a lean runner\'s build, navy security uniform with rolled sleeves, a black smartwatch, holding a radio to her mouth with her right hand', 'calm, professional, one eyebrow raised'),
}

KIYOKO = {
    'kiyoko-plum': 'a deep-plum structured coat with a high kimono-style crossed collar, an obi-style wide belt, jade drop earrings',
    'kiyoko-camel': 'a camel-coloured structured trouser suit with a patterned silk scarf at her throat, gold earrings',
    'kiyoko-green': 'a dark-green tailored sheath dress with a jade brooch and jade earrings, a cream wool wrap over her shoulders',
}
KIYOKO_DESC = 'Kiyoko Madarame, a 56-year-old woman who leads an internal political faction: long elegant face with age lines, razor-sharp silver bob, dark red lipstick, holding a closed folding fan in her right hand, mature older woman, wearing'


def img2img(batch, name, src, prompt, negative, seed, denoise, mask=None):
    path = os.path.join(OUT, batch, f'{name}.png')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        return
    img = comfy.upload(src)
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': RDBT, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': img}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['11', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'decide2'}},
    }
    if mask:
        wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mask), 'channel': 'red'}}
        wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
        wf['7']['inputs']['latent_image'] = ['13', 0]
    t = time.time()
    try:
        comfy.run(wf, path)
        m = [e for e in load_manifest() if not (e['batch'] == batch and e['name'] == name)]
        m.append({'batch': batch, 'name': name, 'model': 'rdbtAnima (img2img)', 'prompt': prompt, 'negative': negative, 'seed': seed,
                  'denoise': denoise, 'source': os.path.relpath(src, os.path.join(OUT, '..', '..', '..')), 'file': f'{batch}/{name}.png', 't': round(time.time() - t)})
        json.dump(m, open(MANIFEST, 'w'), ensure_ascii=False, indent=1)
        os.makedirs(os.path.join(os.path.dirname(__file__), 'workflows'), exist_ok=True)
        json.dump(wf, open(os.path.join(os.path.dirname(__file__), 'workflows', 'anima-img2img-masked.json' if mask else 'anima-img2img.json'), 'w'), indent=1)
        print('ok', batch, name, round(time.time() - t), 's', flush=True)
    except Exception as e:
        print('FAIL', batch, name, str(e)[:300], flush=True)


def kiyoko_mask():
    # White = repaint (outfit), black = keep (head and face). Feathered edge.
    p = os.path.join(OUT, B, 'kiyoko-mask.png')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    m = Image.new('L', (896, 1152), 255)
    d = ImageDraw.Draw(m)
    d.ellipse((270, -60, 660, 350), fill=0)
    m = m.filter(ImageFilter.GaussianBlur(18)).convert('RGB')
    m.save(p)
    return p


if __name__ == '__main__':
    only = sys.argv[1:]
    for name, (tags, desc, expr) in OPTIONS.items():
        if only and not any(name.startswith(o) for o in only):
            continue
        for s in SEEDS:
            run(B, f'{name}-{s}', portrait(tags, desc, expr), N, 896, 1152, s, RDBT)
    if not only or 'kiyoko' in only:
        src = os.path.join(OUT, 'A', 'kiyoko-s101.png'); mask = kiyoko_mask()
        for name, outfit in KIYOKO.items():
            for s in SEEDS:
                img2img(B, f'{name}-{s}', src, portrait('1girl', f'{KIYOKO_DESC} {outfit}', 'calculating half-lidded eyes and a faint smile'),
                        N + ', black dress, black clothes, fur stole', s, 0.75, mask)
    if not only or 'office' in only:
        src = os.path.join(OUT, 'O', 'office-basement-502.png')
        extra = (', a slightly more spacious room with some floor space, office chairs pulled up at every desk, '
                 'empty instant-ramen cups with chopsticks left on the desks')
        for s in (211, 212, 213):
            img2img(B, f'office-{s}', src, OFFICE_P + extra, OFFICE_N, s, 0.5)
