"""Karaoke song 「起きろ！」 (legacy/island/content/lyrics.md): several YuE2 takes through local ComfyUI, vocals on.
Same setup as the opening theme (tools/yue2_music.py): int8 checkpoint, mode full, dpm_2 / sgm_uniform, 32 steps.
Raw FLAC and the ABC score go to ~/ai/island-audio/song/raw/<take>.flac|.abc.txt; the log to song/raw/log.json.
Needs ComfyUI running and the GPU lock held (GUIDE). Usage: ~/ai/sd/venv/bin/python tools/island_audio/song_gen.py [take ...]"""
import sys, os, time, json, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import comfy

RAW = os.path.expanduser('~/ai/island-audio/song/raw')
INT8 = 'yue2_3b_int8_convrot.safetensors'
BF16 = 'yue2_3b_bf16.safetensors'

# Tags exactly as the content agent wrote them in lyrics.md ("For the audio agent").
TAGS_A = 'anime opening, j-pop, j-rock, female vocal, bright clear voice, energetic, uplifting, electric guitar, synthesizer, driving drums, bass, 175 bpm'
# The opening theme's phrasing: the language first and "clear diction" at the end.
TAGS_B = 'Japanese, ' + TAGS_A + ', clear diction'

LYRICS = """[intro]

[verse]
起きろ、起きろ
朝だ、もう八時
早くしろ
電車が来る

[pre-chorus]
走れ、走れ
前を見ろ
止まるな、今は
行け！

[chorus]
光れ、光れ
朝の空に
来い、明日
君の声で

[bridge]
立て、もう一回
昨日は、忘れろ
泣くな、歌え
声を出せ

[chorus]
光れ、光れ
朝も、夜も
来い、明日
行け！

[outro]"""

SECONDS = 85

TAKES = {
    # take id: (tags, checkpoint, seed)
    'okiro-a1': (TAGS_A, INT8, 175001),
    'okiro-a2': (TAGS_A, INT8, 175002),
    'okiro-a3': (TAGS_A, INT8, 175003),
    'okiro-b1': (TAGS_B, INT8, 175101),
    'okiro-b2': (TAGS_B, INT8, 175102),
    'okiro-b3': (TAGS_B, INT8, 175103),
    'okiro-c1': (TAGS_A, BF16, 175201),
    'okiro-c2': (TAGS_B, BF16, 175202),
}


def workflow(tags, lyrics, seconds, seed, ckpt):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}},
        '2': {'class_type': 'YuE2GenerateABC', 'inputs': {'clip': ['1', 1], 'style': tags, 'lyrics': lyrics, 'seed': seed, 'mode': 'full',
                                                          'max_abc_tokens': 8192, 'temperature': 0.7, 'top_p': 0.9, 'top_k': 30,
                                                          'repetition_penalty': 1.005, 'penalty_window': 100}},
        'P': {'class_type': 'PreviewAny', 'inputs': {'source': ['2', 0]}},
        '3': {'class_type': 'YuE2GenerateMusic', 'inputs': {'clip': ['1', 1], 'style': tags, 'lyrics': lyrics, 'abc': ['2', 0], 'seed': seed,
                                                            'mode': 'full', 'max_duration': float(seconds), 'temperature': 1.0, 'top_p': 0.95,
                                                            'top_k': 100, 'repetition_penalty': 1.2}},
        '4': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['3', 0]}},
        '5': {'class_type': 'EmptyYuE2LatentAudio', 'inputs': {'seconds': ['3', 1], 'batch_size': 1}},
        '6': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['4', 0], 'latent_image': ['5', 0],
                                                   'seed': seed, 'steps': 32, 'cfg': 1.0, 'sampler_name': 'dpm_2', 'scheduler': 'sgm_uniform', 'denoise': 1.0}},
        '7': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['6', 0], 'vae': ['1', 2]}},
        '8': {'class_type': 'SaveAudio', 'inputs': {'audio': ['7', 0], 'filename_prefix': 'island/okiro'}},
    }


def run(wf, name, timeout=3600):
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


def save_workflow():
    wf = workflow(TAGS_A, LYRICS, SECONDS, 175001, INT8)
    for d in (os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'workflows'), os.path.expanduser('~/ai/workflows')):
        os.makedirs(d, exist_ok=True)
        json.dump(wf, open(f'{d}/island-karaoke-yue2-api.json', 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    save_workflow()
    only = sys.argv[1:]
    log = f'{RAW}/log.json'
    stats = json.load(open(log)) if os.path.exists(log) else {}
    for name, (tags, ckpt, seed) in TAKES.items():
        if (only and name not in only) or os.path.exists(f'{RAW}/{name}.flac'):
            continue
        try:
            gen_s = run(workflow(tags, LYRICS, SECONDS, seed, ckpt), name)
            stats[name] = {'tags': tags, 'checkpoint': ckpt, 'seed': seed, 'max_duration': SECONDS, 'gen_s': gen_s,
                           'sampler': 'dpm_2 / sgm_uniform, 32 steps, cfg 1', 'abc': 'temperature 0.7, top_p 0.9, top_k 30',
                           'music': 'temperature 1.0, top_p 0.95, top_k 100, repetition_penalty 1.2'}
            print('ok', name, gen_s, 's', flush=True)
        except Exception as e:
            stats[name] = {'tags': tags, 'checkpoint': ckpt, 'seed': seed, 'error': str(e)[:1500]}
            print('FAIL', name, str(e)[:1500], flush=True)
        json.dump(stats, open(log, 'w'), ensure_ascii=False, indent=1)
    print('done')
