"""Minimal client for the local ComfyUI server (http://127.0.0.1:8188).
Builds workflows for Anima-family models and SDXL (optionally with a style LoRA), queues them and saves the output.
"""
import json, time, urllib.request, urllib.parse, os, random

HOST = 'http://127.0.0.1:8188'


def _post(path, data):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


def _get(path):
    return urllib.request.urlopen(HOST + path).read()


def anima(prompt, negative, model='novaAnimeAM_v5.safetensors', w=1024, h=1344, steps=30, cfg=5.0,
          sampler='euler_ancestral', scheduler='normal', seed=None, loras=()):
    """loras: list of (filename, weight) applied to the diffusion model."""
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': model, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}},
        '6': {'class_type': 'EmptyLatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['6', 0],
                                                   'seed': seed if seed is not None else random.randint(0, 2**32), 'steps': steps, 'cfg': cfg,
                                                   'sampler_name': sampler, 'scheduler': scheduler, 'denoise': 1.0}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'kotodama'}},
    }
    model = ['1', 0]
    for i, (name, weight) in enumerate(loras):
        nid = f'L{i}'
        wf[nid] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': model, 'lora_name': name, 'strength_model': weight}}
        model = [nid, 0]
    wf['7']['inputs']['model'] = model
    return wf


def sdxl(prompt, negative, ckpt, lora=None, lora_weight=0.8, w=832, h=1216, steps=28, cfg=5.5,
         sampler='euler_ancestral', scheduler='normal', seed=None):
    wf = {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['1', 1]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['1', 1]}},
        '6': {'class_type': 'EmptyLatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['6', 0],
                                                   'seed': seed if seed is not None else random.randint(0, 2**32), 'steps': steps, 'cfg': cfg,
                                                   'sampler_name': sampler, 'scheduler': scheduler, 'denoise': 1.0}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['1', 2]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'kotodama'}},
    }
    if lora:
        wf['2'] = {'class_type': 'LoraLoader', 'inputs': {'model': ['1', 0], 'clip': ['1', 1], 'lora_name': lora,
                                                         'strength_model': lora_weight, 'strength_clip': lora_weight}}
        wf['4']['inputs']['clip'] = wf['5']['inputs']['clip'] = ['2', 1]
        wf['7']['inputs']['model'] = ['2', 0]
    return wf


def run(workflow, out_path, timeout=900):
    """Queue a workflow, wait for it, save the first output image to out_path."""
    pid = _post('/prompt', {'prompt': workflow})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(_get(f'/history/{pid}'))
        if pid in hist:
            status = hist[pid].get('status', {})
            if status.get('status_str') == 'error':
                raise RuntimeError(json.dumps(status.get('messages', []))[:800])
            for node in hist[pid]['outputs'].values():
                for img in node.get('images', []):
                    q = urllib.parse.urlencode({'filename': img['filename'], 'subfolder': img['subfolder'], 'type': img['type']})
                    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
                    with open(out_path, 'wb') as f:
                        f.write(_get('/view?' + q))
                    return out_path
        time.sleep(1.5)
    raise TimeoutError(pid)
