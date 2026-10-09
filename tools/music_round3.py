"""Background music, round 3 (#371): longer instrumental pieces in one house style, one set of candidates per use.
ACE-Step 1.5 turbo on local ComfyUI (models in ~/ai/ComfyUI/models: acestep_v1.5_turbo, qwen_0.6b_ace15 +
qwen_1.7b_ace15, ace_1.5_vae; workflow saved as tools/workflows/ace15-music.json). Takes the GPU through the queue
(tools/gpu_priority.py, rank render), starts ComfyUI if it isn't up and stops it again if it started it.
Raw FLAC per take: ~/ai/music-raw/r3/<slot>-<n>.flac; settings per take in ~/ai/music-raw/r3/takes.json.

    ~/ai/sd/venv/bin/python tools/music_round3.py [slot ...] [--takes 4] [--seconds 165]
"""
import argparse, json, os, subprocess, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy

RAW = os.path.expanduser('~/ai/music-raw/r3')
HOUSE = ('instrumental background music for a cozy Japanese slice-of-life game, no vocals, warm acoustic ensemble, '
         'soft dynamics, gentle and unobtrusive, clean warm mix, high quality recording')
# slot: (what it is for, caption, bpm, key)
SLOTS = {
    'title': ('title menu', 'gentle hopeful theme, felt piano melody over soft string pad and nylon guitar arpeggios, '
              'light celesta, slow build, unhurried', 80, 'D major'),
    'morning': ('morning and the work day outdoors', 'bright fresh morning, pizzicato strings, nylon guitar, '
                'glockenspiel, flute melody, soft shaker, light and cheerful but calm', 96, 'G major'),
    'evening': ('evening after work', 'warm sunset mood, Rhodes electric piano, nylon guitar, soft upright bass, '
                'brushed drums, relaxed and wistful', 84, 'F major'),
    'night': ('night', 'quiet late night, soft felt piano, warm pads, upright bass, very sparse, sleepy and peaceful',
              68, 'Eb major'),
    'office': ('inside the office', 'focused and light, marimba, soft electric piano, muted plucked guitar, '
               'gentle bass, light percussion, steady and tidy', 100, 'C major'),
    'shops': ('the shop street', 'friendly bustling street, acoustic guitar strumming, ukulele, xylophone, '
              'accordion, light hand percussion, playful but soft', 104, 'A major'),
    'harbour': ('the harbour', 'breezy seaside, acoustic guitar, airy flute melody, soft strings, gentle waves of '
                'chords, open and spacious', 88, 'D major'),
}


def workflow(caption, bpm, key, seconds, seed):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'acestep_v1.5_turbo.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'DualCLIPLoader', 'inputs': {'clip_name1': 'qwen_0.6b_ace15.safetensors',
              'clip_name2': 'qwen_1.7b_ace15.safetensors', 'type': 'ace', 'device': 'default'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'ace_1.5_vae.safetensors'}},
        '4': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['1', 0], 'shift': 3}},
        '5': {'class_type': 'TextEncodeAceStepAudio1.5', 'inputs': {
            'clip': ['2', 0], 'tags': caption, 'lyrics': '[Instrumental]', 'seed': seed, 'bpm': bpm,
            'duration': float(seconds), 'timesignature': '4', 'language': 'en', 'keyscale': key,
            'generate_audio_codes': True, 'cfg_scale': 2.0, 'temperature': 0.85, 'top_p': 0.9, 'top_k': 0, 'min_p': 0.0}},
        '6': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['5', 0]}},
        '7': {'class_type': 'EmptyAceStep1.5LatentAudio', 'inputs': {'seconds': float(seconds), 'batch_size': 1}},
        '8': {'class_type': 'KSampler', 'inputs': {'model': ['4', 0], 'positive': ['5', 0], 'negative': ['6', 0],
              'latent_image': ['7', 0], 'seed': seed, 'steps': 8, 'cfg': 1.0, 'sampler_name': 'euler',
              'scheduler': 'simple', 'denoise': 1.0}},
        '9': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['8', 0], 'vae': ['3', 0]}},
        '10': {'class_type': 'SaveAudio', 'inputs': {'audio': ['9', 0], 'filename_prefix': 'music3/amakawa'}},
    }


def comfy_up():
    try:
        comfy._get('/system_stats')
        return False
    except Exception:
        pass
    subprocess.run(['sh', os.path.expanduser('~/ai/start-comfy.sh')], check=True)
    for _ in range(120):
        time.sleep(2)
        try:
            comfy._get('/system_stats')
            return True
        except Exception:
            pass
    raise RuntimeError('ComfyUI did not start')


def stop_comfy():
    # by the pid listening on the port: a pkill -f pattern also matches any shell whose command line names it
    out = subprocess.run(['ss', '-ltnpH', 'sport = :8188'], capture_output=True, text=True).stdout
    for pid in {int(x) for x in __import__('re').findall(r'pid=(\d+)', out)}:
        os.kill(pid, 15)


def run_audio(wf, out, timeout=1200):
    comfy.yield_to_dashboard()
    pid = comfy._post('/prompt', {'prompt': wf})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = json.loads(comfy._get(f'/history/{pid}'))
        if pid in h:
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages', []))[:800])
            for node in h[pid]['outputs'].values():
                for a in node.get('audio', []):
                    q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a['subfolder'], 'type': a['type']})
                    with open(out, 'wb') as f:
                        f.write(comfy._get('/view?' + q))
                    return round(time.time() - t0, 1)
        time.sleep(2)
    raise TimeoutError(pid)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slots', nargs='*')
    ap.add_argument('--takes', type=int, default=4)
    ap.add_argument('--seconds', type=float, default=165)
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    log_path = f'{RAW}/takes.json'
    log = json.load(open(log_path)) if os.path.exists(log_path) else {}
    with comfy.gpu('claude-agent:music', 'render'):
        started = comfy_up()
        try:
            for slot in a.slots or SLOTS:
                use, cap, bpm, key = SLOTS[slot]
                caption = f'{HOUSE}, {cap}'
                for n in range(1, a.takes + 1):
                    name = f'{slot}-{n}'
                    out = f'{RAW}/{name}.flac'
                    if os.path.exists(out):
                        continue
                    seed = 3710 + 100 * list(SLOTS).index(slot) + n
                    secs = run_audio(workflow(caption, bpm, key, a.seconds, seed), out)
                    log[name] = {'slot': slot, 'use': use, 'caption': caption, 'bpm': bpm, 'key': key,
                                 'seconds': a.seconds, 'seed': seed, 'model': 'ACE-Step 1.5 turbo, 8 steps, LM qwen 1.7b',
                                 'render_s': secs}
                    json.dump(log, open(log_path, 'w'), indent=1)
                    print(name, secs, 's', flush=True)
        finally:
            if started:
                stop_comfy()


if __name__ == '__main__':
    main()
