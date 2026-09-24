"""Local anime portraits with SDXL (Illustrious family) on the RTX 3080. No per-image cost, no content filter.
Usage: ~/ai/sd/venv/bin/python tools/local_sdxl.py <model.safetensors> <out_dir> [seed ...]
Optional style LoRA via env: LORA=path/to/style.safetensors LORA_WEIGHT=0.8 LORA_TRIGGER="jjk_style_v3"
"""
import sys, os, torch
from diffusers import StableDiffusionXLPipeline, EulerAncestralDiscreteScheduler

QUALITY = 'masterpiece, best quality, amazing quality, very aesthetic, absurdres, anime coloring, anime screencap'
COMMON = 'upper body, looking at viewer, simple background, grey background'
NEG = ('lowres, bad anatomy, bad hands, missing fingers, extra digits, fewer digits, cropped, text, error, '
       'signature, watermark, username, blurry, worst quality, low quality, jpeg artifacts, child, loli')
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

def main():
    ckpt, out = sys.argv[1], sys.argv[2]
    seeds = [int(s) for s in sys.argv[3:]] or [1, 2]
    os.makedirs(out, exist_ok=True)
    pipe = StableDiffusionXLPipeline.from_single_file(ckpt, torch_dtype=torch.float16)
    pipe.enable_model_cpu_offload()  # the desktop also uses this GPU, so keep only the active part on it
    pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
    pipe.vae.enable_tiling()
    trigger = ''
    if os.environ.get('LORA'):
        pipe.load_lora_weights(os.environ['LORA'], adapter_name='style')
        pipe.set_adapters(['style'], adapter_weights=[float(os.environ.get('LORA_WEIGHT', '0.8'))])
        trigger = os.environ.get('LORA_TRIGGER', '')
    for name, tags in CAST.items():
        for seed in seeds:
            path = f'{out}/{name}-{seed}.png'
            if os.path.exists(path):
                continue
            img = pipe(prompt=f'{trigger + ", " if trigger else ""}{tags}, {COMMON}, {QUALITY}', negative_prompt=NEG, width=832, height=1216,
                       num_inference_steps=28, guidance_scale=5.5,
                       generator=torch.Generator('cuda').manual_seed(seed)).images[0]
            img.save(path)
            print('ok', path, flush=True)

if __name__ == '__main__':
    main()
