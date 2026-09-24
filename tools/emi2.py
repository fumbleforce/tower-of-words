"""Emi redesign from a text brief (no photo input). Anima-family models via ComfyUI. Output: art/slice/emi2/<model>/
Usage: emi2.py test   -> two seeds of the work portrait per model (style check)
       emi2.py full   -> portraits and expressions"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'slice', 'emi2', os.environ.get('EMI_ROUND', ''))
CFG = float(os.environ.get('EMI_CFG', '5'))
EXTRA = os.environ.get('EMI_EXTRA', '')  # e.g. "(anime style:1.3), "
Q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe, '
     f'anime screenshot, anime coloring, 2d, cel shading, clean lineart, {EXTRA}')
N = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
     'missing fingers, extra fingers, long fingernails, claws, extra limbs, text, watermark, nsfw, red glasses, child, loli, '
     '3d, realistic, photorealistic, photo, render, cgi, semi-realistic, fat, chubby, plump, overweight, thick arms, round face, '
     'double chin, wide face, belly, older woman, middle-aged, tinted glasses, sunglasses')
BASE = ('Emi, 32, an anime woman from Britain, fair skin, auburn hair, shoulder-length bob, side-swept bangs parted on the left, '
        'warm brown eyes, gentle kind eyes, eyeliner, brown tortoiseshell glasses with clear lenses, soft rounded oval face, gentle full cheeks, soft jawline, '
        'warm, caring, young motherly aura, adult woman, '
        'slim waist, very large breasts, wide hips, hourglass figure, toned, slender arms')
WORK = 'fitted charcoal blazer over a cream silk blouse with the top button open, charcoal pencil skirt, thin gold chain bracelet, company lanyard'
DRESS = 'teal wrap dress with a small white polka-dot pattern, delicate gold pendant shaped like a small star'
FRAME = 'waist-up portrait facing the viewer at a slight angle, plain light grey background, soft even studio light'
SMILE = 'a slightly wide smile, reassuring smile, cheeks lifting, small dimples, cute small overbite visible when she smiles, smiling eyes'
EXPR = {
    'smile': f'big open warm smile, {SMILE}',
    'laughing': f'laughing, eyes squeezed shut with joy, hand near her mouth, {SMILE}',
    'surprised': 'surprised, eyebrows raised, mouth slightly open',
    'teasing': 'teasing playful smirk, one eyebrow raised, arms crossed',
    'neutral': 'calm neutral expression, relaxed mouth',
}
MODELS = {'rdbt': 'rdbtAnima.safetensors', 'nova': 'novaAnimeAM_v5.safetensors'}


def go(path, prompt, seed, model):
    if os.path.exists(path):
        return
    t = time.time()
    try:
        comfy.run(comfy.anima(prompt, N, model=model, w=896, h=1152, steps=30, cfg=CFG, seed=seed), path)
        print('ok', path.split('emi2/')[-1], round(time.time() - t), 's', flush=True)
    except Exception as e:
        print('FAIL', path, str(e)[:200], flush=True)


mode = sys.argv[1] if len(sys.argv) > 1 else 'full'
ONLY = sys.argv[2:]
for tag, model in MODELS.items():
    if ONLY and tag not in ONLY:
        continue
    d = os.path.join(OUT, tag); os.makedirs(d, exist_ok=True)
    looks = (('work', WORK),) if mode in ('test', 'expr') else (('work', WORK), ('dress', DRESS))
    for look, outfit in looks:
        for seed in (41, 42):
            go(os.path.join(d, f'{look}-{seed}.png'), f'{Q}, 1girl, solo, {BASE}, {outfit}, {EXPR["smile"]}, {FRAME}', seed, model)
    if mode in ('full', 'expr'):
        for e, ed in EXPR.items():
            go(os.path.join(d, f'work-{e}.png'), f'{Q}, 1girl, solo, {BASE}, {WORK}, {ed}, {FRAME}', 41, model)
