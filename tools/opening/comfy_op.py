"""ComfyUI helpers for the anime opening art (RDBT Anima). Two workflows:
  txt2img_hires: base render, then RealESRGAN anime x4 upscale, resize to the target and a low-denoise RDBT pass (hires fix)
  refine: an existing image (e.g. an approved sprite) upscaled the same way and repainted at low denoise, so it gets sharper at
          high resolution without changing the design.
Queue etiquette: waits until the shared queue has no pending jobs before queueing, never cancels anything, long timeouts."""
import json, os, sys, time, random, urllib.request, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import comfy

MODEL = 'rdbtAnima.safetensors'
UPSCALER = 'RealESRGAN_x4plus_anime_6B.pth'


def _loaders(wf):
    wf['1'] = {'class_type': 'UNETLoader', 'inputs': {'unet_name': MODEL, 'weight_dtype': 'default'}}
    wf['2'] = {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}}
    wf['3'] = {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}}


def _hires(wf, image_ref, pos, neg, W, H, seed, denoise, steps=24):
    wf['u1'] = {'class_type': 'UpscaleModelLoader', 'inputs': {'model_name': UPSCALER}}
    wf['u2'] = {'class_type': 'ImageUpscaleWithModel', 'inputs': {'upscale_model': ['u1', 0], 'image': image_ref}}
    wf['u3'] = {'class_type': 'ImageScale', 'inputs': {'image': ['u2', 0], 'upscale_method': 'lanczos', 'width': W, 'height': H, 'crop': 'center'}}
    wf['u4'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['u3', 0], 'vae': ['3', 0]}}
    wf['u5'] = {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': pos, 'negative': neg, 'latent_image': ['u4', 0],
                                                      'seed': seed, 'steps': steps, 'cfg': 5, 'sampler_name': 'euler_ancestral',
                                                      'scheduler': 'normal', 'denoise': denoise}}
    wf['u6'] = {'class_type': 'VAEDecode', 'inputs': {'samples': ['u5', 0], 'vae': ['3', 0]}}
    wf['9'] = {'class_type': 'SaveImage', 'inputs': {'images': ['u6', 0], 'filename_prefix': 'opening'}}


def txt2img(prompt, negative, w, h, seed, hires=None, denoise=0.35):
    """hires: None for a base render, or (W, H) for the hires-fixed output."""
    wf = {}
    _loaders(wf)
    wf['4'] = {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}}
    wf['5'] = {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}}
    wf['6'] = {'class_type': 'EmptyLatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}}
    wf['7'] = {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['6', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral',
                                                   'scheduler': 'normal', 'denoise': 1.0}}
    wf['8'] = {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}}
    if hires:
        _hires(wf, ['8', 0], ['4', 0], ['5', 0], hires[0], hires[1], seed + 7, denoise)
    else:
        wf['9'] = {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'opening'}}
    return wf


def refine(image_path, prompt, negative, W, H, seed, denoise=0.3, mask_path=None):
    wf = {}
    _loaders(wf)
    wf['4'] = {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}}
    wf['5'] = {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}}
    wf['l'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(image_path)}}
    _hires(wf, ['l', 0], ['4', 0], ['5', 0], W, H, seed, denoise)
    return wf


def wait_turn():
    t = time.time()
    while True:
        try:
            d = json.loads(urllib.request.urlopen(comfy.HOST + '/queue').read())
            if not d['queue_pending'] and not d['queue_running']:
                return
            if time.time() - t > 60 and len(d['queue_pending']) <= 2:
                return  # take a normal FIFO place, like the other agents do
        except Exception:
            pass
        time.sleep(3)


def run(wf, out, timeout=7200):
    """Queue (after the shared queue drains), wait, save. Also saves the API workflow JSON next to the image."""
    wait_turn()
    comfy.run(wf, out, timeout=timeout)
    json.dump(wf, open(out[:-4] + '.workflow.json', 'w'), indent=1)
    return out
