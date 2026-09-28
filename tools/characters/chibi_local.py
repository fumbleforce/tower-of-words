"""Step 1 of the 3D character workflow, run locally: a chibi picture in the Mio chibi style from a portrait.
FLUX.2 Klein 4B with two reference images (image 1 = the character's approved portrait, image 2 = Jørgen's Mio
chibi picture, tools/characters/ref/mio-chibi-angled.png). Needs ComfyUI on 8188 and the GPU lock (GUIDE).

usage: python3 tools/characters/chibi_local.py <id> <portrait> "<what to keep>" [seeds...] [--steps N --cfg C]
Writes tools/characters/out/<id>/<id>-chibi-<seed>.png and the workflow JSON next to it.
"""
import json, os, random, shutil, sys, time, urllib.request, argparse

HOST = 'http://127.0.0.1:8188'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INPUT = os.path.expanduser('~/ai/ComfyUI/input')
OUTPUT = os.path.expanduser('~/ai/ComfyUI/output')
STYLE = os.path.join(ROOT, 'tools/characters/ref/mio-chibi-angled.png')
LOCK = '/tmp/claude-1000/gpu.lock/owner'

SWAP_PROMPT = ("Edit image 1: turn the girl into the man from image 2, keeping everything else about image 1 exactly: "
               "the same low-poly faceted 3D render, the same big head at almost half the body height, the same simple "
               "blocky body and proportions, the same large open anime eyes with no nose, the same pose turned at an angle "
               "looking to the left, the same flat matte colours, soft studio light and plain white background. {keep} "
               "Replace her hair buns, headphones, hoodie, cargo trousers and sneakers with his hair and clothes. Keep all "
               "features thick and sturdy, no fine strands or thin spikes. Empty hands. No text, no props, no photorealism.")

PROMPT = ("Turn the person from image 1 into a 3D chibi anime character in the exact style of image 2: a low-poly "
          "faceted 3D render with a big head about half the body height, a short simple blocky body, large simple anime "
          "eyes that are open, flat matte colours and soft even studio light on a plain white background. {keep} "
          "Simplify the character a lot to match the detail level of image 2. Full body, standing, turned at an angle, "
          "looking to the left, same orientation as the body, like image 2. Keep all features thick and sturdy, no fine "
          "strands or thin spikes. Empty hands. No text, no props, no extra subjects, no photorealism. Flat matte texture.")


def post(path, data):
    r = urllib.request.Request(HOST + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(r).read())


def workflow(refs, prompt, seed, w, h, steps, cfg, prefix):
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'flux-2-klein-4b-fp8.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_4b.safetensors', 'type': 'flux2'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'flux2-vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['4', 0]}},
    }
    pos, neg = ['4', 0], ['5', 0]
    for i, ref in enumerate(refs):
        n = 10 + i * 10
        wf[str(n)] = {'class_type': 'LoadImage', 'inputs': {'image': ref}}
        wf[str(n + 1)] = {'class_type': 'ImageScaleToTotalPixels', 'inputs': {'image': [str(n), 0], 'upscale_method': 'lanczos', 'megapixels': 1.0, 'resolution_steps': 16}}
        wf[str(n + 2)] = {'class_type': 'VAEEncode', 'inputs': {'pixels': [str(n + 1), 0], 'vae': ['3', 0]}}
        wf[str(n + 3)] = {'class_type': 'ReferenceLatent', 'inputs': {'conditioning': pos, 'latent': [str(n + 2), 0]}}
        wf[str(n + 4)] = {'class_type': 'ReferenceLatent', 'inputs': {'conditioning': neg, 'latent': [str(n + 2), 0]}}
        pos, neg = [str(n + 3), 0], [str(n + 4), 0]
    wf.update({
        '90': {'class_type': 'EmptyFlux2LatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        '91': {'class_type': 'Flux2Scheduler', 'inputs': {'steps': steps, 'width': w, 'height': h}},
        '92': {'class_type': 'KSamplerSelect', 'inputs': {'sampler_name': 'euler'}},
        '93': {'class_type': 'RandomNoise', 'inputs': {'noise_seed': seed}},
        '94': {'class_type': 'CFGGuider', 'inputs': {'model': ['1', 0], 'positive': pos, 'negative': neg, 'cfg': cfg}},
        '95': {'class_type': 'SamplerCustomAdvanced', 'inputs': {'noise': ['93', 0], 'guider': ['94', 0], 'sampler': ['92', 0], 'sigmas': ['91', 0], 'latent_image': ['90', 0]}},
        '96': {'class_type': 'VAEDecode', 'inputs': {'samples': ['95', 0], 'vae': ['3', 0]}},
        '97': {'class_type': 'SaveImage', 'inputs': {'images': ['96', 0], 'filename_prefix': prefix}},
    })
    return wf


def run(wf):
    pid = post('/prompt', {'prompt': wf})['prompt_id']
    while True:
        h = json.loads(urllib.request.urlopen(f'{HOST}/history/{pid}').read())
        if pid in h:
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st)[:2000])
            for out in h[pid]['outputs'].values():
                for im in out.get('images', []):
                    return os.path.join(OUTPUT, im.get('subfolder', ''), im['filename'])
        time.sleep(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('id'); ap.add_argument('portrait'); ap.add_argument('keep')
    ap.add_argument('seeds', nargs='*', type=int)
    ap.add_argument('--steps', type=int, default=4); ap.add_argument('--cfg', type=float, default=1.0)
    ap.add_argument('--w', type=int, default=896); ap.add_argument('--h', type=int, default=1184)
    ap.add_argument('--style', default=STYLE); ap.add_argument('--tag', default='')
    ap.add_argument('--prompt', default=None, help='full prompt override ({keep} is filled in)')
    ap.add_argument('--extra', action='append', default=[], help='more style pictures (image 3, 4)')
    ap.add_argument('--swap', action='store_true', help='style picture as image 1 (the base to edit), portrait as image 2')
    a = ap.parse_args()
    out_dir = os.path.join(ROOT, 'tools/characters/out', a.id)
    os.makedirs(out_dir, exist_ok=True)
    r1, r2 = f'chr-{a.id}-portrait.png', 'chr-style-' + os.path.basename(a.style)
    from PIL import Image
    im = Image.open(a.portrait)
    if im.mode == 'RGBA':  # cut-outs go on white, like the style picture
        bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im); im = bg
    im.convert('RGB').save(os.path.join(INPUT, r1))
    shutil.copy(a.style, os.path.join(INPUT, r2))
    extra = []
    for k, e in enumerate(a.extra):
        im2 = Image.open(e)
        if im2.mode == 'RGBA':
            bg = Image.new('RGB', im2.size, 'white'); bg.paste(im2, (0, 0), im2); im2 = bg
        nm = f'chr-extra{k}-' + os.path.basename(e).rsplit('.', 1)[0] + '.png'; im2.convert('RGB').save(os.path.join(INPUT, nm)); extra.append(nm)
    prompt = (a.prompt or (SWAP_PROMPT if a.swap else PROMPT)).format(keep=a.keep)
    for seed in a.seeds or [random.randint(1, 99999)]:
        if 'characters-agent' not in open(LOCK).read():
            sys.exit('GPU lock is not ours any more; stopping')
        wf = workflow([*((r2, r1) if a.swap else (r1, r2)), *extra], prompt, seed, a.w, a.h, a.steps, a.cfg, f'chr-{a.id}')
        src = run(wf)
        name = f'{a.id}-chibi{a.tag}-{seed}'
        shutil.copy(src, os.path.join(out_dir, name + '.png'))
        json.dump({'prompt': prompt, 'seed': seed, 'swap': a.swap, 'extra': a.extra, 'steps': a.steps, 'cfg': a.cfg, 'portrait': a.portrait, 'style': a.style,
                   'model': 'flux-2-klein-4b-fp8', 'workflow': wf}, open(os.path.join(out_dir, name + '.json'), 'w'), indent=1)
        print(os.path.join(out_dir, name + '.png'))


if __name__ == '__main__':
    main()
