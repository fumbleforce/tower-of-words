"""vace-loop: a seamless loop of a still picture by pose-driven Wan 2.2 Fun VACE (the animate-still skill, reference.md).

The control video is the picture itself as the first AND the last frame (mask 0, kept) with a skeleton driver
(tools/characters/steps/idle_driver.py) in between (mask 1, generated); the picture is also the reference image. So the
clip starts and ends on the picture and loops. Settings as reference.md: Wan 2.2 Fun VACE A14B fp8, t2v lightx2v v1.1 on
both experts, 6 steps (3 high + 3 low), shift 5, cfg 1, 16 fps.

Attempts are data, a JSON file in the round ({id: {picture, driver, prompt, seed, change, [steps, split, shift, strength,
lx, last_frame]}}); each changes one thing from the one its `change` names. Output: <round>/vace/<id>.mp4, the frames in
<round>/raw/<id>/, the log (settings, prompts, seconds, peak GPU memory, free RAM) in <round>/prompts.json under "vace".

  ~/ai/sd/venv/bin/python tools/characters/steps/vace_loop.py <attempts.json> <id> [...]
  ~/ai/sd/venv/bin/python tools/characters/steps/vace_loop.py <attempts.json> recover <id>

Shares the server: takes the GPU lock at render rank (tools/gpu_priority.py), waits for an empty ComfyUI queue, unloads
cached models before and after, removes its uploads from input/ and moves its frames out of output/. When ComfyUI is not
running once the lock is ours, it starts one with --reserve-vram 3 (the skill's setting for video) and stops it again at
the end; a ComfyUI that is already running is used as it is."""
import json, os, shutil, signal, subprocess, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy, gpu_priority  # noqa: E402

COMFY = os.path.expanduser('~/ai/ComfyUI')
TAG = 'vaceloop-'
VC_HI, VC_LO = 'wan2.2_fun_vace_high_noise_14B_fp8_scaled.safetensors', 'wan2.2_fun_vace_low_noise_14B_fp8_scaled.safetensors'
LX_HI, LX_LO = 'wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors', 'wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors'
NEG = comfy.WAN_NEG + (', realistic, photorealistic, 3d, morphing, melting, face change, different person, clothes change, '
                       'camera movement, zoom, pan, camera shake, talking, mouth moving')


def workflow(up, a, n, W, H, prefix):
    wf = {'mh': {'class_type': 'UNETLoader', 'inputs': {'unet_name': VC_HI, 'weight_dtype': 'default'}},
          'ml': {'class_type': 'UNETLoader', 'inputs': {'unet_name': VC_LO, 'weight_dtype': 'default'}}}
    hi, lo = ['mh', 0], ['ml', 0]
    lx = a.get('lx', 1.0)
    if lx:
        wf['lh'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': hi, 'lora_name': LX_HI, 'strength_model': lx}}
        wf['ll'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': lo, 'lora_name': LX_LO, 'strength_model': lx}}
        hi, lo = ['lh', 0], ['ll', 0]
    shift = a.get('shift', 5.0)
    wf['sh'] = {'class_type': 'ModelSamplingSD3', 'inputs': {'model': hi, 'shift': shift}}
    wf['sl'] = {'class_type': 'ModelSamplingSD3', 'inputs': {'model': lo, 'shift': shift}}
    wf['c1'] = {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan'}}
    wf['c2'] = {'class_type': 'CLIPTextEncode', 'inputs': {'text': a['prompt'], 'clip': ['c1', 0]}}
    wf['c3'] = {'class_type': 'CLIPTextEncode', 'inputs': {'text': NEG, 'clip': ['c1', 0]}}
    wf['v'] = {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan_2.1_vae.safetensors'}}
    wf['ref'] = {'class_type': 'LoadImage', 'inputs': {'image': up['ref']}}
    wf['pv'] = {'class_type': 'LoadVideo', 'inputs': {'file': up['pose']}}
    wf['pvc'] = {'class_type': 'GetVideoComponents', 'inputs': {'video': ['pv', 0]}}
    last = a.get('last_frame', True)
    wf['mid'] = {'class_type': 'ImageFromBatch', 'inputs': {'image': ['pvc', 0], 'batch_index': 1, 'length': n - 2 if last else n - 1}}
    wf['ctl0'] = {'class_type': 'ImageBatch', 'inputs': {'image1': ['ref', 0], 'image2': ['mid', 0]}}
    ctl = ['ctl0', 0]
    if last:
        wf['ctl1'] = {'class_type': 'ImageBatch', 'inputs': {'image1': ['ctl0', 0], 'image2': ['ref', 0]}}
        ctl = ['ctl1', 0]
    wf['mv'] = {'class_type': 'LoadVideo', 'inputs': {'file': up['mask']}}
    wf['mvc'] = {'class_type': 'GetVideoComponents', 'inputs': {'video': ['mv', 0]}}
    wf['mk'] = {'class_type': 'ImageToMask', 'inputs': {'image': ['mvc', 0], 'channel': 'red'}}
    wf['vc'] = {'class_type': 'WanVaceToVideo', 'inputs': {
        'positive': ['c2', 0], 'negative': ['c3', 0], 'vae': ['v', 0], 'width': W, 'height': H, 'length': n, 'batch_size': 1,
        'strength': a.get('strength', 1.0), 'control_video': ctl, 'control_masks': ['mk', 0], 'reference_image': ['ref', 0]}}
    steps, split = a.get('steps', 6), a.get('split', 3)
    s = {'positive': ['vc', 0], 'negative': ['vc', 1], 'noise_seed': a['seed'], 'steps': steps, 'cfg': 1.0, 'sampler_name': 'euler',
         'scheduler': 'simple'}
    wf['k1'] = {'class_type': 'KSamplerAdvanced', 'inputs': dict(s, model=['sh', 0], latent_image=['vc', 2], add_noise='enable',
                                                                 start_at_step=0, end_at_step=split, return_with_leftover_noise='enable')}
    wf['k2'] = {'class_type': 'KSamplerAdvanced', 'inputs': dict(s, model=['sl', 0], latent_image=['k1', 0], add_noise='disable',
                                                                 start_at_step=split, end_at_step=10000, return_with_leftover_noise='disable')}
    wf['tr'] = {'class_type': 'TrimVideoLatent', 'inputs': {'samples': ['k2', 0], 'trim_amount': ['vc', 3]}}
    wf['d'] = {'class_type': 'VAEDecode', 'inputs': {'samples': ['tr', 0], 'vae': ['v', 0]}}
    wf['s'] = {'class_type': 'SaveImage', 'inputs': {'images': ['d', 0], 'filename_prefix': f'frames/{prefix}'}}
    return wf


def uploads(rnd, aid, a, n, W, H):
    up = os.path.join(rnd, 'raw', 'up')
    os.makedirs(up, exist_ok=True)
    pose = os.path.join(up, f'{TAG}{aid}-pose.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '16', '-i', os.path.join(rnd, a['driver'], 'pose', '%05d.png'),
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '8', pose], check=True)
    mask = os.path.join(up, f'{TAG}{aid}-mask.mp4')   # black = keep (the picture), white = generate
    last = a.get('last_frame', True)
    parts = ['-f', 'lavfi', '-i', f'color=black:s={W}x{H}:r=16:d=0.0625', '-f', 'lavfi', '-i',
             f'color=white:s={W}x{H}:r=16:d={(n - (2 if last else 1)) / 16}']
    fc = '[0][1]concat=n=2:v=1'
    if last:
        parts += ['-f', 'lavfi', '-i', f'color=black:s={W}x{H}:r=16:d=0.0625']
        fc = '[0][1][2]concat=n=3:v=1'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *parts, '-filter_complex', fc + f',trim=end_frame={n}', '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p', '-crf', '0', mask], check=True)
    files = {'ref': os.path.join(rnd, a['picture']), 'pose': pose, 'mask': mask}
    out = {}
    for k, p in files.items():
        name = TAG + aid + '-' + os.path.basename(p) if not os.path.basename(p).startswith(TAG) else os.path.basename(p)
        shutil.copy(p, os.path.join(COMFY, 'input', name))
        out[k] = name
    return out


def comfy_up():
    try:
        comfy._get('/queue')
        return True
    except Exception:
        return False


STARTED = []


def ensure_comfy():
    if comfy_up():
        return
    log = open(os.path.expanduser('~/ai/comfy.log'), 'ab')
    log.write(f'\n--- started by animated-portraits-vace (vace_loop.py) {time.ctime()} ---\n'.encode())
    p = subprocess.Popen([os.path.expanduser('~/ai/sd/venv/bin/python'), 'main.py', '--listen', '127.0.0.1', '--port', '8188',
                          '--disable-auto-launch', '--reserve-vram', '3'], cwd=COMFY, stdout=log, stderr=subprocess.STDOUT,
                         stdin=subprocess.DEVNULL, start_new_session=True)
    STARTED.append(p)
    t0 = time.time()
    while time.time() - t0 < 240:
        if p.poll() is not None:
            raise RuntimeError('ComfyUI exited while starting; see ~/ai/comfy.log')
        if comfy_up():
            print(f'started ComfyUI pid {p.pid} (--reserve-vram 3) in {time.time() - t0:.0f}s', flush=True)
            return
        time.sleep(2)
    raise RuntimeError('ComfyUI did not start in 240 s')


def stop_started():
    for p in STARTED:
        if p.poll() is None:
            os.killpg(p.pid, signal.SIGTERM)
            try:
                p.wait(30)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid, signal.SIGKILL)
            print(f'stopped the ComfyUI this script started (pid {p.pid})', flush=True)
    STARTED.clear()


def gpu_used():
    out = subprocess.run(['nvidia-smi', '--query-gpu=memory.used', '--format=csv,noheader,nounits'], capture_output=True, text=True).stdout
    return int(out.split()[0])


def mem_avail_gb():
    for line in open('/proc/meminfo'):
        if line.startswith('MemAvailable'):
            return int(line.split()[1]) / 1e6


def size_of(rnd, a):
    from PIL import Image
    return Image.open(os.path.join(rnd, a['picture'])).size


def run(rnd, aid, a):
    W, H = size_of(rnd, a)
    n = a.get('frames', 81)
    with comfy.gpu('animated-portraits-vace', 'render'):
        ensure_comfy()
        while True:  # also wait for anything already in ComfyUI's queue (other agents' jobs)
            q = json.loads(comfy._get('/queue'))
            if not q['queue_running'] and not q['queue_pending']:
                break
            time.sleep(5)
        gpu_priority.free_comfy_models()
        time.sleep(3)
        up = uploads(rnd, aid, a, n, W, H)
        wf = workflow(up, a, n, W, H, TAG + aid)
        base, ram0 = gpu_used(), mem_avail_gb()
        pid = comfy._post('/prompt', {'prompt': wf})['prompt_id']
        peak, ram_min = 0, ram0
        while True:
            time.sleep(2)
            peak = max(peak, gpu_used())
            ram_min = min(ram_min, mem_avail_gb())
            hist = json.loads(comfy._get(f'/history/{pid}'))
            if pid in hist:
                break
        gpu_priority.free_comfy_models()
        if aid == LAST[0]:
            stop_started()  # ours, and nothing else of ours follows: leave the GPU as we found it
    collect(rnd, aid, a, hist[pid], W, H, base, peak, ram_min)


def collect(rnd, aid, a, h, W, H, base=None, peak=None, ram_min=None):
    st = h.get('status', {})
    if st.get('status_str') == 'error':
        msg = [m for m in st.get('messages', []) if m[0] == 'execution_error']
        raise RuntimeError(json.dumps(msg)[:600])
    ts = {m[0]: m[1].get('timestamp') for m in st.get('messages', [])}
    secs = round((ts['execution_success'] - ts['execution_start']) / 1000)
    rawd = os.path.join(rnd, 'raw', aid)
    shutil.rmtree(rawd, ignore_errors=True)
    os.makedirs(rawd)
    imgs = [i for i in h['outputs'].get('s', {}).get('images', []) if i.get('type') == 'output']
    for k, im in enumerate(sorted(imgs, key=lambda x: x['filename'])):
        shutil.move(os.path.join(COMFY, 'output', im['subfolder'], im['filename']), os.path.join(rawd, f'{k:05d}.png'))
    os.makedirs(os.path.join(rnd, 'vace'), exist_ok=True)
    mp4 = os.path.join(rnd, 'vace', aid + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '16', '-i', os.path.join(rawd, '%05d.png'), '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', mp4], check=True)
    log_entry(rnd, aid, a, W, H, file=os.path.relpath(mp4, rnd), frames=len(imgs), generation_s=secs, gpu_mb_before=base,
              gpu_mb_peak=peak, ram_gb_free_min=None if ram_min is None else round(ram_min, 1))
    print(aid, '->', mp4, f'{secs}s', f'peak {peak} MB', flush=True)


def log_entry(rnd, aid, a, W, H, **kw):
    p = os.path.join(rnd, 'prompts.json')
    log = json.load(open(p)) if os.path.exists(p) else {}
    v = log.setdefault('vace', {})
    v[aid] = {**{k: a[k] for k in a}, 'size': f'{W}x{H}', 'fps': 16, 'negative': NEG,
              'model': 'Wan 2.2 Fun VACE A14B fp8 + t2v lightx2v v1.1', 'steps': a.get('steps', 6), 'split': a.get('split', 3),
              'shift': a.get('shift', 5.0), 'cfg': 1.0, 'strength': a.get('strength', 1.0), 'last_frame': a.get('last_frame', True),
              **kw, 'time': time.strftime('%Y-%m-%d %H:%M')}
    json.dump(log, open(p, 'w'), indent=1, ensure_ascii=False)


def recover(rnd, aid, a):
    W, H = size_of(rnd, a)
    hist = json.loads(comfy._get('/history'))
    for pid, h in hist.items():
        if json.dumps(h.get('prompt', [None, None, {}])[2]).find(f'frames/{TAG}{aid}') >= 0:
            collect(rnd, aid, a, h, W, H)
            return
    raise RuntimeError('not in history: ' + aid)


LAST = [None]


def cleanup_inputs():
    for f in os.listdir(os.path.join(COMFY, 'input')):
        if f.startswith(TAG):
            os.remove(os.path.join(COMFY, 'input', f))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    afile = os.path.abspath(sys.argv[1])
    rnd = os.path.dirname(os.path.dirname(afile)) if os.path.basename(os.path.dirname(afile)) == 'vace' else os.path.dirname(afile)
    attempts = json.load(open(afile))
    args = sys.argv[2:]
    fn = run
    if args[0] == 'recover':
        fn, args = recover, args[1:]
    LAST[0] = args[-1]
    try:
        for aid in args:
            try:
                fn(rnd, aid, attempts[aid])
            except Exception as e:  # the next attempt still runs; the error goes in the log
                print(aid, 'FAILED', str(e)[:3000], flush=True)
                a = attempts[aid]
                log_entry(rnd, aid, a, *size_of(rnd, a), file=None,
                          failed='out of GPU memory' if 'out of memory' in str(e).lower() else str(e)[:300])
    finally:
        cleanup_inputs()
        stop_started()
