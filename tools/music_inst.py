"""Instrumental background loops, round 2 (after Jørgen's verdict: YuE2 loops had vocals and sounded like theme songs).
Runs on local ComfyUI, one job at a time, waiting for the queue to be empty first (another agent shares the GPU).
Raw FLAC output goes to ~/ai/music-raw/<name>.flac; the ABC score (YuE2) to <name>.abc.txt.
Usage: python tools/music_inst.py [name ...]"""
import sys, os, time, json, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import comfy

RAW = os.path.expanduser('~/ai/music-raw')
YUE_BF16 = 'yue2_3b_bf16.safetensors'
AR_INST = 'yue2_inst_ar_v3abc_comfyui.safetensors'   # Mothersuperior/YuE2-instrumental-cot-full-loras (CLIP slot)
NAR_V9 = 'yue2_nar_joint_v9_comfyui.safetensors'     # Mothersuperior/yue2-mothersuperior-realaudio-tokenizer-v4 (MODEL slot)

BARE = '[instrumental]'
LOOPY = '[intro]\n[verse]\n[verse]\n[verse]\n[outro]'

OFFICE_TAGS = 'lo-fi hip hop, background music, instrumental, mellow Rhodes piano, soft bass, dusty drums, vinyl crackle, 75 BPM, relaxed, low energy, sparse, minimal, soft dynamics, repetitive'
NIGHT_TAGS = 'jazz, background music, instrumental, piano trio, soft piano, upright bass, brushed drums, 70 BPM, late night, calm, low energy, sparse, quiet, lounge'

YUE_JOBS = {
    # name: (tags, structure, NAR LoRA or None, seconds)
    'inst-office-a': (OFFICE_TAGS, BARE, None, 90),
    'inst-office-b': (OFFICE_TAGS, LOOPY, NAR_V9, 90),
    'inst-night-a': (NIGHT_TAGS, BARE, None, 90),
    'inst-night-b': (NIGHT_TAGS, LOOPY, NAR_V9, 90),
}

SA3_JOBS = {
    'sa3-office': ('Lo-fi hip hop background music with mellow Rhodes piano chords, soft round bass and dusty laid-back drums with vinyl crackle, '
                   'relaxed, sparse and unobtrusive, no lead melody. BPM: 75. Length: 90 seconds', 90),
    'sa3-night': ('Late-night jazz piano trio background music with soft piano chords, upright bass and brushed drums, quiet, intimate and '
                  'unobtrusive, sparse arrangement. BPM: 70. Length: 90 seconds', 90),
}

OPENING_SOFT = ('Japanese, soft female vocal, warm, anime opening theme, J-pop, 140 BPM, clean electric guitars, acoustic guitar, '
                'warm piano, round bass, soft drums, mellow, smooth production, gentle high end, catchy chorus, clear diction.')


def yue2(tags, lyrics, seconds, seed, ar_lora=AR_INST, nar_lora=None, ckpt=YUE_BF16):
    wf = {'1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}}}
    model, clip = ['1', 0], ['1', 1]
    if ar_lora:
        wf['L1'] = {'class_type': 'LoraLoader', 'inputs': {'model': model, 'clip': clip, 'lora_name': ar_lora, 'strength_model': 0.0, 'strength_clip': 1.0}}
        clip = ['L1', 1]
    if nar_lora:
        wf['L2'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': model, 'lora_name': nar_lora, 'strength_model': 1.0}}
        model = ['L2', 0]
    wf.update({
        '2': {'class_type': 'YuE2GenerateABC', 'inputs': {'clip': clip, 'style': tags, 'lyrics': lyrics, 'seed': seed, 'mode': 'full',
                                                          'max_abc_tokens': 8192, 'temperature': 0.7, 'top_p': 0.9, 'top_k': 30,
                                                          'repetition_penalty': 1.005, 'penalty_window': 100}},
        'P': {'class_type': 'PreviewAny', 'inputs': {'source': ['2', 0]}},
        '3': {'class_type': 'YuE2GenerateMusic', 'inputs': {'clip': clip, 'style': tags, 'lyrics': lyrics, 'abc': ['2', 0], 'seed': seed,
                                                            'mode': 'full', 'max_duration': float(seconds), 'temperature': 1.0, 'top_p': 0.95,
                                                            'top_k': 100, 'repetition_penalty': 1.2}},
        '4': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['3', 0]}},
        '5': {'class_type': 'EmptyYuE2LatentAudio', 'inputs': {'seconds': ['3', 1], 'batch_size': 1}},
        '6': {'class_type': 'KSampler', 'inputs': {'model': model, 'positive': ['3', 0], 'negative': ['4', 0], 'latent_image': ['5', 0],
                                                   'seed': seed, 'steps': 32, 'cfg': 1.0, 'sampler_name': 'dpm_2', 'scheduler': 'sgm_uniform', 'denoise': 1.0}},
        '7': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['6', 0], 'vae': ['1', 2]}},
        '8': {'class_type': 'SaveAudio', 'inputs': {'audio': ['7', 0], 'filename_prefix': 'music2/amakawa'}},
    })
    return wf


def mute_melody(abc):
    """Keep the chord symbols (on the Vocal lines) and turn every Ins melody bar into a full-bar rest, so the
    accompaniment is all that's left: no lead line to hum along to."""
    unit, meter = 16, (4, 4)
    out, voice = [], None
    for line in abc.splitlines():
        if line.startswith('V:'):
            voice = line.split()[1] if len(line.split()) > 1 else voice
            out.append(line)
            continue
        if line.startswith('L:'):
            num, den = line[2:].strip().split('/')
            unit = int(den) // int(num)
        if line.startswith('M:') and '/' in line:
            meter = tuple(int(v) for v in line[2:].strip().split('/'))
        if voice == 'Ins' and '|' in line and not line.startswith('%'):
            out.append(f'z{unit * meter[0] // meter[1]}|' * line.count('|'))
        else:
            out.append(line)
    return '\n'.join(out)


def yue2_from_abc(tags, lyrics, abc, seconds, seed, nar_lora=None):
    wf = yue2(tags, lyrics, seconds, seed, nar_lora=nar_lora)
    del wf['2'], wf['P']
    wf['3']['inputs']['abc'] = abc
    return wf


def sa3(prompt, seconds, seed):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'stable_audio_3_medium.safetensors'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 't5gemma_b_b_ul2.safetensors', 'type': 'stable_audio'}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '4': {'class_type': 'EmptyLatentAudio', 'inputs': {'seconds': float(seconds), 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
                                                   'seed': seed, 'steps': 8, 'cfg': 1.0, 'sampler_name': 'lcm', 'scheduler': 'simple', 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['5', 0], 'vae': ['1', 2]}},
        '7': {'class_type': 'SaveAudio', 'inputs': {'audio': ['6', 0], 'filename_prefix': 'music2/amakawa-sa3'}},
    }


def wait_idle():
    while True:
        q = json.loads(comfy._get('/queue'))
        # Take the next free slot: nothing pending (another agent's job may still be running; ours queues behind it).
        if not q['queue_pending']:
            return
        time.sleep(1)


def run(wf, name, timeout=3600):
    wait_idle()
    pid = comfy._post('/prompt', {'prompt': wf})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(comfy._get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages', []))[-1500:])
            out = None
            for node in hist[pid]['outputs'].values():
                for a in node.get('audio', []):
                    q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a['subfolder'], 'type': a['type']})
                    out = f'{RAW}/{name}.flac'
                    open(out, 'wb').write(comfy._get('/view?' + q))
                if 'text' in node:
                    open(f'{RAW}/{name}.abc.txt', 'w').write(''.join(node['text']))
            if out:
                return round(time.time() - t0)
        time.sleep(3)
    raise TimeoutError(pid)


def save_workflows():
    for d in ('tools/workflows', os.path.expanduser('~/ai/workflows')):
        base = d if d.startswith('/') else os.path.join(os.path.dirname(__file__), '..', d)
        json.dump(yue2(OFFICE_TAGS, LOOPY, 90, 1, nar_lora=NAR_V9), open(f'{base}/yue2-instrumental-lora-api.json', 'w'), indent=1)
        json.dump(sa3(SA3_JOBS['sa3-office'][0], 90, 1), open(f'{base}/stable-audio-3-bgm-api.json', 'w'), indent=1)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    save_workflows()
    only = sys.argv[1:]
    log = f'{RAW}/log.json'
    stats = json.load(open(log)) if os.path.exists(log) else {}
    jobs = {k: ('yue', v) for k, v in YUE_JOBS.items()} | {k: ('sa3', v) for k, v in SA3_JOBS.items()}
    jobs['opening-soft'] = ('open', None)
    jobs['inst-office-c'] = ('chords', ('inst-office-a', OFFICE_TAGS, BARE))
    jobs['inst-night-c'] = ('chords', ('inst-night-a', NIGHT_TAGS, BARE))
    for name, (kind, v) in jobs.items():
        if (only and name not in only) or os.path.exists(f'{RAW}/{name}.flac'):
            continue
        seed = 20260925 + len(stats)
        try:
            if kind == 'yue':
                tags, lyr, nar, secs = v
                wf = yue2(tags, lyr, secs, seed, nar_lora=nar)
                info = {'tags': tags, 'lyrics': lyr, 'nar_lora': nar, 'ar_lora': AR_INST}
            elif kind == 'sa3':
                wf = sa3(v[0], v[1], seed)
                info = {'prompt': v[0]}
            elif kind == 'chords':
                src, tags, lyr = v
                abc = mute_melody(open(f'{RAW}/{src}.abc.txt').read())
                open(f'{RAW}/{name}.abc.txt', 'w').write(abc)
                seed = stats[src]['seed']
                wf = yue2_from_abc(tags, lyr, abc, 90, seed)
                info = {'tags': tags, 'lyrics': lyr, 'abc_from': src + ' with the Ins melody muted', 'ar_lora': AR_INST}
            else:
                import yue2_music
                lyr = yue2_music.TRACKS['opening'][1]
                wf = yue2(OPENING_SOFT, lyr, 100, seed, ar_lora=None, ckpt='yue2_3b_int8_convrot.safetensors')
                info = {'tags': OPENING_SOFT}
            info['gen_s'] = run(wf, name)
            info['seed'] = seed
            stats[name] = info
            print('ok', name, info['gen_s'], 's', flush=True)
        except Exception as e:
            print('FAIL', name, str(e)[:1500], flush=True)
        json.dump(stats, open(log, 'w'), ensure_ascii=False, indent=1)
