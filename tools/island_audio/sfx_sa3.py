"""Stable Audio 3 Medium (local ComfyUI, native nodes) for the effects and ambience beds that Kenney's CC0 packs don't cover.
Same sampler as tools/music_inst.py (8 steps, lcm / simple, cfg 1). Raw FLAC: ~/ai/island-audio/sfx/raw/<name>-sa3-<prompt>-<seed>.flac
with a JSON sidecar (prompt, seconds, seed, seconds taken). Needs ComfyUI and the GPU lock.
Usage: ~/ai/sd/venv/bin/python tools/island_audio/sfx_sa3.py [name ...]"""
import sys, os, time, json, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy
from sfx_spec import ALL, SA3_TAKES

RAW = os.path.expanduser('~/ai/island-audio/sfx/raw')


def sa3(prompt, seconds, seed):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'stable_audio_3_medium.safetensors'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 't5gemma_b_b_ul2.safetensors', 'type': 'stable_audio'}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '4': {'class_type': 'EmptyLatentAudio', 'inputs': {'seconds': float(seconds), 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
                                                   'seed': seed, 'steps': 8, 'cfg': 1.0, 'sampler_name': 'lcm', 'scheduler': 'simple', 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['5', 0], 'vae': ['1', 2]}},
        '7': {'class_type': 'SaveAudio', 'inputs': {'audio': ['6', 0], 'filename_prefix': 'island/sfx'}},
    }


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    for d in (os.path.join(HERE, '..', 'workflows'), os.path.expanduser('~/ai/workflows')):
        json.dump(sa3(ALL['copier_run']['sa3'][0][0], 8, 1), open(f'{d}/island-sfx-stable-audio-3-api.json', 'w'), indent=1)
    only = sys.argv[1:]
    jobs = []
    for name, e in ALL.items():
        if only and name not in only:
            continue
        for p, (prompt, secs) in enumerate(e['sa3']):
            for k in range(SA3_TAKES):
                seed = 3000 + 97 * k + p
                base = f'{RAW}/{name}-sa3-{p}-{seed}'
                if os.path.exists(base + '.flac'):
                    continue
                gen_secs = max(2.0, float(secs))
                pid = comfy._post('/prompt', {'prompt': sa3(prompt, gen_secs, seed)})['prompt_id']
                jobs.append((pid, base, {'name': name, 'prompt': prompt, 'seconds': gen_secs, 'seed': seed,
                                         'model': 'stable_audio_3_medium + t5gemma_b_b_ul2', 'sampler': 'lcm / simple, 8 steps, cfg 1'}))
    print('queued', len(jobs), flush=True)
    t0 = time.time()
    for pid, base, info in jobs:
        while True:
            hist = json.loads(comfy._get(f'/history/{pid}'))
            if pid in hist:
                st = hist[pid].get('status', {})
                if st.get('status_str') == 'error':
                    info['error'] = json.dumps(st.get('messages', []))[-800:]
                    print('FAIL', base, info['error'][:300], flush=True)
                for node in hist[pid]['outputs'].values():
                    for a in node.get('audio', []):
                        q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a['subfolder'], 'type': a['type']})
                        open(base + '.flac', 'wb').write(comfy._get('/view?' + q))
                info['done_after_s'] = round(time.time() - t0)
                json.dump(info, open(base + '.json', 'w'), ensure_ascii=False, indent=1)
                print('ok', os.path.basename(base), info['done_after_s'], flush=True)
                break
            time.sleep(2)
    print('done', flush=True)
