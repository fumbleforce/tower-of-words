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


LUMINA_SYSTEM = 'You are an assistant designed to generate anime images based on textual prompts. <Prompt Start> '


def lumina(prompt, negative, ckpt='netayumeLumina.safetensors', w=1024, h=1344, steps=30, cfg=4.5, shift=4.0, seed=None):
    """Lumina Image 2.0 family (NetaYume Lumina): all-in-one checkpoint, system-prompt prefix, AuraFlow sampling shift."""
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}},
        '2': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['1', 0], 'shift': shift}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': LUMINA_SYSTEM + prompt, 'clip': ['1', 1]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['1', 1]}},
        '6': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['2', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['6', 0],
                                                   'seed': seed if seed is not None else random.randint(0, 2**32), 'steps': steps, 'cfg': cfg,
                                                   'sampler_name': 'res_multistep', 'scheduler': 'simple', 'denoise': 1.0}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['1', 2]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'kotodama'}},
    }


def upload(path):
    """Upload a local image to ComfyUI's input folder; returns the name to use in LoadImage."""
    import uuid
    boundary = uuid.uuid4().hex
    name = os.path.basename(path)
    with open(path, 'rb') as f:
        data = f.read()
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
            f'Content-Type: image/png\r\n\r\n').encode() + data + f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(HOST + '/upload/image', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    return json.loads(urllib.request.urlopen(req).read())['name']


def sdxl_refine(image_name, prompt, negative, ckpt, denoise=0.4, steps=28, cfg=5.5, seed=None):
    """Image-to-image: repaint an existing image (e.g. an Anima composition) in an SDXL model's style."""
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}},
        '2': {'class_type': 'LoadImage', 'inputs': {'image': image_name}},
        '3': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['2', 0], 'vae': ['1', 2]}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['1', 1]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['1', 1]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['3', 0],
                                                   'seed': seed if seed is not None else random.randint(0, 2**32), 'steps': steps, 'cfg': cfg,
                                                   'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['1', 2]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'kotodama-refine'}},
    }


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


WAN_NEG = ('色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，'
           '画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走, '
           'realistic, 3d, photorealistic, style change, morphing')


def _video_out(wf, images_ref, fps, prefix):
    """Save as a video (for the ComfyUI UI) and as frames (for our own ffmpeg assembly)."""
    wf['90'] = {'class_type': 'CreateVideo', 'inputs': {'images': images_ref, 'fps': fps}}
    wf['91'] = {'class_type': 'SaveVideo', 'inputs': {'video': ['90', 0], 'filename_prefix': f'video/{prefix}', 'format': 'auto', 'codec': 'auto'}}
    wf['92'] = {'class_type': 'SaveImage', 'inputs': {'images': images_ref, 'filename_prefix': f'frames/{prefix}'}}
    return wf


def wan22_i2v(image_name, prompt, negative=WAN_NEG, w=704, h=1280, length=73, steps=20, cfg=5.0, shift=8.0, fps=24, seed=None, prefix='wan22'):
    """Wan 2.2 TI2V 5B image-to-video (native ComfyUI). length = frames (4n+1); 24 fps."""
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'wan2.2_ti2v_5B_fp16.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan2.2_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}},
        '6': {'class_type': 'LoadImage', 'inputs': {'image': image_name}},
        '7': {'class_type': 'Wan22ImageToVideoLatent', 'inputs': {'vae': ['3', 0], 'width': w, 'height': h, 'length': length, 'batch_size': 1, 'start_image': ['6', 0]}},
        '8': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['1', 0], 'shift': shift}},
        '9': {'class_type': 'KSampler', 'inputs': {'model': ['8', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['7', 0],
                                                   'seed': seed if seed is not None else random.randint(0, 2**32), 'steps': steps, 'cfg': cfg,
                                                   'sampler_name': 'uni_pc', 'scheduler': 'simple', 'denoise': 1.0}},
        '10': {'class_type': 'VAEDecode', 'inputs': {'samples': ['9', 0], 'vae': ['3', 0]}},
    }
    return _video_out(wf, ['10', 0], fps, prefix)


def causal_forcing_i2v(image_name, prompt, negative=WAN_NEG, w=480, h=832, length=49, steps=4, fps=16, seed=None, prefix='causal'):
    """Causal Forcing (Wan 2.1-based autoregressive, 4 steps, CFG 1) image-to-video. 16 fps."""
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'causal_forcing-framewise.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan_2.1_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}},
        '6': {'class_type': 'LoadImage', 'inputs': {'image': image_name}},
        '7': {'class_type': 'ARVideoI2V', 'inputs': {'model': ['1', 0], 'vae': ['3', 0], 'start_image': ['6', 0], 'width': w, 'height': h, 'length': length, 'batch_size': 1}},
        '8': {'class_type': 'RandomNoise', 'inputs': {'noise_seed': seed if seed is not None else random.randint(0, 2**32)}},
        '9': {'class_type': 'CFGGuider', 'inputs': {'model': ['7', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'cfg': 1.0}},
        '11': {'class_type': 'SamplerARVideo', 'inputs': {'num_frame_per_block': 1}},
        '12': {'class_type': 'BasicScheduler', 'inputs': {'model': ['7', 0], 'scheduler': 'simple', 'steps': steps, 'denoise': 1.0}},
        '13': {'class_type': 'SamplerCustomAdvanced', 'inputs': {'noise': ['8', 0], 'guider': ['9', 0], 'sampler': ['11', 0], 'sigmas': ['12', 0], 'latent_image': ['7', 1]}},
        '10': {'class_type': 'VAEDecode', 'inputs': {'samples': ['13', 0], 'vae': ['3', 0]}},
    }
    return _video_out(wf, ['10', 0], fps, prefix)


def run_video(workflow, out_mp4, fps, timeout=3600):
    """Queue a video workflow; assemble the saved frames into out_mp4 with ffmpeg. Returns seconds taken."""
    import subprocess, tempfile
    t0 = time.time()
    pid = _post('/prompt', {'prompt': workflow})['prompt_id']
    while time.time() - t0 < timeout:
        hist = json.loads(_get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages', []))[:1200])
            imgs = [i for node in hist[pid]['outputs'].values() for i in node.get('images', []) if i.get('subfolder', '').startswith('frames')]
            if not imgs:
                raise RuntimeError('no frames in outputs: ' + json.dumps(hist[pid]['outputs'])[:600])
            d = tempfile.mkdtemp()
            for k, im in enumerate(sorted(imgs, key=lambda x: x['filename'])):
                q = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im['subfolder'], 'type': im['type']})
                open(os.path.join(d, f'{k:05d}.png'), 'wb').write(_get('/view?' + q))
            os.makedirs(os.path.dirname(out_mp4) or '.', exist_ok=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(d, '%05d.png'),
                            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out_mp4], check=True)
            return round(time.time() - t0)
        time.sleep(3)
    raise TimeoutError(pid)
