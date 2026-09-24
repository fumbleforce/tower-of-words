"""Round 5: Anima variants + NetaYume Lumina on the structured round-4 prompts, plus a face close-up.
Output: art/company/local5/<model>/<scene>.png"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy
from local_round4 import SCENES as R4, Q, N, MC  # reuses the structured prompts (module only defines data at import)

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'company', 'local5')
SCENES = {k: R4[k] for k in ('meeting', 'magic', 'canteen', 'mc')}
SCENES['rei_close'] = (896, 1152, f'''{Q}, safe, 1girl, solo,
Rei: a 26-year-old woman with a narrow refined face and high cheekbones, long silver-grey hair in a sleek high ponytail, sharp eyeliner, gold hoop earrings, tailored white suit over a black shirt, a silver pen resting against her lower lip, chin slightly raised, looking down at the viewer with a thin knowing smile,
close-up portrait from the chest up, slight low angle,
soft window light from the left, cool grey office background out of focus, white, charcoal and gold''')

MODELS = [
    ('novaAM', 'anima', 'novaAnimeAM_v5.safetensors'),
    ('animaAesthetic', 'anima', 'animaAesthetic.safetensors'),
    ('animaYume', 'anima', 'animaYume.safetensors'),
    ('rdbtAnima', 'anima', 'rdbtAnima.safetensors'),
    ('miaomiaoAnima', 'anima', 'miaomiaoAnima.safetensors'),
    ('oneObsessionAnima', 'anima', 'oneObsessionAnima.safetensors'),
    ('netayumeLumina', 'lumina', 'netayumeLumina.safetensors'),
]

only = sys.argv[1:]
for name, kind, file in MODELS:
    if only and name not in only:
        continue
    for scene, (w, h, prompt) in SCENES.items():
        path = os.path.join(OUT, name, f'{scene}.png')
        if os.path.exists(path):
            continue
        t = time.time()
        if kind == 'anima':
            wf = comfy.anima(prompt, N, model=file, w=w, h=h, steps=30, cfg=5, seed=11)
        else:
            wf = comfy.lumina(prompt, N, ckpt=file, w=w, h=h, steps=30, cfg=4.5, seed=11)
        try:
            comfy.run(wf, path)
            print('ok', name, scene, round(time.time() - t), 's', flush=True)
        except Exception as e:
            print('FAIL', name, scene, str(e)[:300], flush=True)
