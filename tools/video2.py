"""Video round 2: the same three source images through several local image-to-video setups.
Output proto2/video2/<source>-<option>.mp4, stats in proto2/video2/stats.json, workflows in tools/workflows/video2-*.json.
Run: ~/ai/sd/venv/bin/python tools/video2.py [clip names...]   (waits for an empty ComfyUI queue before each clip)
"""
import sys, os, json, time, subprocess, random, shutil, urllib.request, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = 'proto2/video2'
WF_DIRS = ['tools/workflows', os.path.expanduser('~/ai/workflows')]
STYLE = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart. '

SOURCES = {
    'rei': 'art/production/B/rei-soft.png',       # 896x1152, approved RDBT Rei
    'mio': 'art/production/B/mio-bored.png',      # 896x1152, approved RDBT Mio
    'monorail': 'art/video/in/monorail.png',      # 1280x704, the scene from round 1
}

# Round-1 style prompts: one sentence of vague motion.
PLAIN = {
    'rei': 'a woman with a silver ponytail in a grey suit smiles at the camera, she blinks slowly, breathes gently, her ponytail sways slightly, subtle idle animation, static camera',
    'mio': 'a woman with black and green hair, glasses and headphones around her neck looks bored, she blinks slowly, breathes gently, subtle idle animation, static camera',
    'monorail': 'a white monorail train glides smoothly along the elevated viaduct across the bay, gentle ripples on the water, clouds drift slowly, the camera slowly follows the train',
}

# Option 4: timed, explicit motion, camera terms, and the physical facts the model got wrong.
TIMED = {
    'rei': ('Medium close-up, locked-off static camera, plain grey studio background. A woman with a long silver ponytail, grey eyes, gold hoop earrings, '
            'a light grey blazer over a black turtleneck. '
            'Second 0 to 1: she looks at the viewer with a small smile and blinks once. '
            'Second 1 to 2: she tilts her head to the side and her long ponytail swings behind her shoulder. '
            'Second 2 to 3: she takes a breath, her shoulders rise and fall, and she laughs softly with her eyes half closed. '
            'Second 3 to 4: she turns her head slightly away, then looks back at the viewer. '
            'Second 4 to 5: she blinks and settles into a calm confident smile, loose strands of hair moving. '
            'Her face, hair colour and clothes stay the same the whole time.'),
    'mio': ('Medium close-up, locked-off static camera, plain grey studio background. A young woman with black hair with green streaks tied in a messy bun, '
            'thin glasses, big green headphones resting around her neck, a dark green oversized hoodie and a lanyard. '
            'Second 0 to 1: she looks at the viewer with a bored, sleepy face and blinks slowly. '
            'Second 1 to 2: she yawns with her mouth wide open and her eyes squeezed shut. '
            'Second 2 to 3: she glances to the side, then rolls her eyes and sighs, her shoulders drop. '
            'Second 3 to 4: she tilts her head, loose strands of hair fall across her cheek. '
            'Second 4 to 5: she looks back at the viewer with a small sly smile. '
            'Her face, glasses, hair colour and clothes stay the same the whole time.'),
    'monorail': ('Wide shot, the camera pans slowly to the left to follow the train. A rigid white monorail train made of solid metal cars '
                 'drives toward the lower left corner of the frame along the straight concrete viaduct over a calm sea, coming closer to the camera. '
                 'The train body is rigid and keeps its shape; the cars do not bend, stretch or ripple; the windows and doors stay fixed on the cars. '
                 'Second 0 to 2: the front of the train moves forward toward the lower left at a steady speed. '
                 'Second 2 to 4: the train keeps moving and the front car starts to leave the frame at the lower left, more cars follow along the track. '
                 'Second 4 to 5: the rear cars pass by. The city skyline, mountains and sun stay fixed in the background, '
                 'small waves sparkle on the water, clouds drift slowly to the right, a few seagulls fly.'),
}

LIVE2D = 'live 2d, dynamic wallpaper style, the character sways slightly, rises and falls with breathing, blinks regularly, hair flutters in the wind, the character position remains unchanged. '
ANIME_TRIGGER = 'An1meStyl3, AnimeStyle. '

# size per source for each model family (5B wants multiples of 32; 14B around 0.5 MP)
SIZE_5B = {'rei': (672, 864), 'mio': (672, 864), 'monorail': (1280, 704)}
SIZE_14B = {'rei': (624, 800), 'mio': (624, 800), 'monorail': (960, 528)}

WAN_NEG = comfy.WAN_NEG


def wan14_i2v(image_name, prompt, w, h, length=81, high='wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors',
              low='wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors', loras_high=(), loras_low=(), steps=4, split=2,
              shift=5.0, cfg=1.0, seed=None, prefix='wan14'):
    """Wan 2.2 I2V A14B, two experts (high noise for the first `split` steps, low noise for the rest). 16 fps."""
    seed = seed if seed is not None else random.randint(0, 2**32)
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': high, 'weight_dtype': 'default'}},
        '2': {'class_type': 'UNETLoader', 'inputs': {'unet_name': low, 'weight_dtype': 'default'}},
        '3': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan'}},
        '4': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan_2.1_vae.safetensors'}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['3', 0]}},
        '6': {'class_type': 'CLIPTextEncode', 'inputs': {'text': WAN_NEG, 'clip': ['3', 0]}},
        '7': {'class_type': 'LoadImage', 'inputs': {'image': image_name}},
        '8': {'class_type': 'WanImageToVideo', 'inputs': {'positive': ['5', 0], 'negative': ['6', 0], 'vae': ['4', 0], 'width': w, 'height': h,
                                                          'length': length, 'batch_size': 1, 'start_image': ['7', 0]}},
    }
    hi, lo = ['1', 0], ['2', 0]
    for k, (name, wt) in enumerate(loras_high):
        wf[f'2{k}h'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': hi, 'lora_name': name, 'strength_model': wt}}
        hi = [f'2{k}h', 0]
    for k, (name, wt) in enumerate(loras_low):
        wf[f'2{k}l'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': lo, 'lora_name': name, 'strength_model': wt}}
        lo = [f'2{k}l', 0]
    wf['30'] = {'class_type': 'ModelSamplingSD3', 'inputs': {'model': hi, 'shift': shift}}
    wf['31'] = {'class_type': 'ModelSamplingSD3', 'inputs': {'model': lo, 'shift': shift}}
    common = {'positive': ['8', 0], 'negative': ['8', 1], 'noise_seed': seed, 'steps': steps, 'cfg': cfg,
              'sampler_name': 'euler', 'scheduler': 'simple'}
    wf['32'] = {'class_type': 'KSamplerAdvanced', 'inputs': dict(common, model=['30', 0], latent_image=['8', 2], add_noise='enable',
                                                                start_at_step=0, end_at_step=split, return_with_leftover_noise='enable')}
    wf['33'] = {'class_type': 'KSamplerAdvanced', 'inputs': dict(common, model=['31', 0], latent_image=['32', 0], add_noise='disable',
                                                                start_at_step=split, end_at_step=10000, return_with_leftover_noise='disable')}
    wf['10'] = {'class_type': 'VAEDecode', 'inputs': {'samples': ['33', 0], 'vae': ['4', 0]}}
    return comfy._video_out(wf, ['10', 0], 16, prefix)


LX_H, LX_L = 'wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors', 'wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors'
AN_H, AN_L = 'wan22_i2v_animestyle_v2_high.safetensors', 'wan22_i2v_animestyle_v2_low.safetensors'
L2D = 'wan22_live2d_wallpaper_low.safetensors'
DSW_H, DSW_L = 'dasiwa_wan22_i2v_lightspeed_v11_high_fp8.safetensors', 'dasiwa_wan22_i2v_lightspeed_v11_low_fp8.safetensors'

# option key -> (label, builder(src, image_name, prefix) -> (workflow, fps, frames, size))
def opt_5b_plain(src, img, prefix):
    w, h = SIZE_5B[src]
    return comfy.wan22_i2v(img, STYLE + PLAIN[src], w=w, h=h, length=57, steps=20, cfg=5.0, shift=8.0, seed=7, prefix=prefix), 24, 57, (w, h)


def opt_5b_timed(src, img, prefix):
    w, h = SIZE_5B[src]
    return comfy.wan22_i2v(img, STYLE + TIMED[src], w=w, h=h, length=121, steps=30, cfg=6.0, shift=8.0, seed=7, prefix=prefix), 24, 121, (w, h)


def opt_14b_lx(src, img, prefix):
    w, h = SIZE_14B[src]
    return wan14_i2v(img, STYLE + TIMED[src], w, h, loras_high=[(LX_H, 1.0)], loras_low=[(LX_L, 1.0)], seed=7, prefix=prefix), 16, 81, (w, h)


def opt_14b_anime(src, img, prefix):
    w, h = SIZE_14B[src]
    extra_low = [(L2D, 0.8)] if src != 'monorail' else []
    pre = ANIME_TRIGGER + (LIVE2D if src != 'monorail' else '')
    return wan14_i2v(img, pre + STYLE + TIMED[src], w, h, loras_high=[(LX_H, 1.0), (AN_H, 1.0)],
                     loras_low=[(LX_L, 1.0), (AN_L, 1.0)] + extra_low, seed=7, prefix=prefix), 16, 81, (w, h)


def opt_dasiwa(src, img, prefix):
    w, h = SIZE_14B[src]
    return wan14_i2v(img, STYLE + TIMED[src], w, h, high=DSW_H, low=DSW_L, seed=7, prefix=prefix), 16, 81, (w, h)


OPTIONS = {
    '5b-plain': opt_5b_plain,
    '5b-timed': opt_5b_timed,
    '14b-lx': opt_14b_lx,
    '14b-anime': opt_14b_anime,
    'dasiwa': opt_dasiwa,
}


def queue_state():
    return json.loads(urllib.request.urlopen(comfy.HOST + '/queue').read())


def run_clip(wf, out_mp4, fps, timeout=7200):
    """Queue (FIFO behind other jobs); measure GPU memory only while our prompt runs; time from ComfyUI's own
    execution_start/execution_success timestamps (so queue waiting is not counted). Returns (seconds, peak_mb)."""
    import tempfile
    pid = comfy._post('/prompt', {'prompt': wf})['prompt_id']
    peak, t0 = 0, time.time()
    while time.time() - t0 < timeout:
        q = queue_state()
        if any(x[1] == pid for x in q['queue_running']):
            out = subprocess.run(['nvidia-smi', '--query-gpu=memory.used', '--format=csv,noheader,nounits'], capture_output=True, text=True).stdout
            peak = max(peak, int(out.split()[0]))
        hist = json.loads(comfy._get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages', []))[:1500])
            ts = {m[0]: m[1].get('timestamp') for m in st.get('messages', [])}
            secs = round((ts['execution_success'] - ts['execution_start']) / 1000)
            imgs = [i for node in hist[pid]['outputs'].values() for i in node.get('images', []) if i.get('subfolder', '').startswith('frames')]
            d = tempfile.mkdtemp()
            for k, im in enumerate(sorted(imgs, key=lambda x: x['filename'])):
                qs = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im['subfolder'], 'type': im['type']})
                open(os.path.join(d, f'{k:05d}.png'), 'wb').write(comfy._get('/view?' + qs))
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(d, '%05d.png'),
                            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out_mp4], check=True)
            shutil.rmtree(d)
            return secs, peak
        time.sleep(1)
    raise TimeoutError(pid)


def main():
    os.makedirs(OUT, exist_ok=True)
    stats_path = f'{OUT}/stats.json'
    stats = json.load(open(stats_path)) if os.path.exists(stats_path) else {}
    only = sys.argv[1:]
    for opt, build in OPTIONS.items():
        for src in SOURCES:
            name = f'{src}-{opt}'
            if only and name not in only and opt not in only and src not in only:
                continue
            out = f'{OUT}/{name}.mp4'
            if os.path.exists(out):
                continue
            img = comfy.upload(SOURCES[src])
            wf, fps, frames, size = build(src, img, f'v2-{name}')
            for d in WF_DIRS:
                os.makedirs(d, exist_ok=True)
                json.dump(wf, open(f'{d}/video2-{name}.json', 'w'), indent=1, ensure_ascii=False)
            t0 = time.time()
            try:
                secs, peak_mb = run_clip(wf, out, fps)
                stats[name] = {'option': opt, 'source': src, 'size': f'{size[0]}x{size[1]}', 'frames': frames, 'fps': fps,
                               'seconds_of_video': round(frames / fps, 1), 'generation_s': secs, 'peak_vram_mb_total_gpu': peak_mb,
                               'prompt': next(n['inputs']['text'] for n in wf.values() if n['class_type'] == 'CLIPTextEncode' and n['inputs']['text'] != WAN_NEG)}
                print('ok', name, secs, 's, peak', peak_mb, 'MB', flush=True)
            except Exception as e:
                print('FAIL', name, round(time.time() - t0), 's', str(e)[:800], flush=True)
            json.dump(stats, open(stats_path, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
