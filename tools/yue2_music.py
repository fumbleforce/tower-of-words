"""Local music with YuE2 through ComfyUI: four instrumental loops and one Japanese opening theme.
Output: proto2/music/<name>.mp3 plus proto2/music/stats.json. Run only when the GPU is free."""
import sys, os, time, json, random, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'proto2', 'music')
CKPT = 'yue2_3b_int8_convrot.safetensors'
INSTRUMENTAL = '[Intro]\n\n[Instrumental]\n\n[Outro]'

TRACKS = {
    'calm': ('Instrumental, no vocals. Calm morning city pop, 84 BPM, soft electric piano, clean guitar, gentle drums, warm synth pads, hopeful and bright, smooth loop.', INSTRUMENTAL, 80),
    'office': ('Instrumental, no vocals. Lazy lo-fi hip hop, 75 BPM, dusty drums, mellow Rhodes piano, soft bass, vinyl crackle, relaxed afternoon mood, smooth loop.', INSTRUMENTAL, 80),
    'lively': ('Instrumental, no vocals. Upbeat cheerful Japanese pop instrumental, 120 BPM, bouncy bass, brass stabs, acoustic guitar, handclaps, busy lunchtime energy, smooth loop.', INSTRUMENTAL, 80),
    'night': ('Instrumental, no vocals. Late-night jazz bar, 70 BPM, brushed drums, upright bass, smoky piano, soft tenor saxophone, rain outside, intimate, smooth loop.', INSTRUMENTAL, 80),
    'opening': ('Japanese, bright female vocal, anime opening theme, J-pop rock, 150 BPM, driving electric guitars, punchy drums, melodic bass, sparkling synths, energetic, catchy chorus, clear diction.',
                '[Verse]\n朝のモノレール 窓の外\n知らない街が 光ってる\nポケットに IDカード\n今日からここで 働くよ\n\n'
                '[Chorus]\nはじめまして 新しい街\n言葉が僕の 魔法になる\n小さな「手伝って」で\n世界が少し 動き出す\n\n'
                '[Verse]\n地下の部屋に ゲームの音\nリーダーは笑って「いいね」って\nエレベーターの ボタン押して\n夢の階段 のぼってく\n\n'
                '[Chorus]\nはじめまして 新しい街\n言葉が僕の 魔法になる\n小さな「待って」 小さな「ありがとう」\n明日もきっと 大丈夫',
                100),
}


def workflow(style, lyrics, seconds, seed):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': CKPT}},
        '2': {'class_type': 'YuE2GenerateABC', 'inputs': {'clip': ['1', 1], 'style': style, 'lyrics': lyrics, 'seed': seed, 'mode': 'full',
                                                          'max_abc_tokens': 8192, 'temperature': 0.7, 'top_p': 0.9, 'top_k': 30,
                                                          'repetition_penalty': 1.005, 'penalty_window': 100}},
        '3': {'class_type': 'YuE2GenerateMusic', 'inputs': {'clip': ['1', 1], 'style': style, 'lyrics': lyrics, 'abc': ['2', 0], 'seed': seed,
                                                            'mode': 'full', 'max_duration': float(seconds), 'temperature': 1.0, 'top_p': 0.95,
                                                            'top_k': 100, 'repetition_penalty': 1.2}},
        '4': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['3', 0]}},
        '5': {'class_type': 'EmptyYuE2LatentAudio', 'inputs': {'seconds': ['3', 1], 'batch_size': 1}},
        '6': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['4', 0], 'latent_image': ['5', 0],
                                                   'seed': seed, 'steps': 32, 'cfg': 1.0, 'sampler_name': 'dpm_2', 'scheduler': 'sgm_uniform', 'denoise': 1.0}},
        '7': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['6', 0], 'vae': ['1', 2]}},
        '8': {'class_type': 'SaveAudioMP3', 'inputs': {'audio': ['7', 0], 'filename_prefix': 'yue2/amakawa', 'quality': 'V0'}},
    }


def run_audio(wf, out_path, timeout=3600):
    pid = comfy._post('/prompt', {'prompt': wf})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(comfy._get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages', []))[:800])
            for node in hist[pid]['outputs'].values():
                for a in node.get('audio', []):
                    q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a['subfolder'], 'type': a['type']})
                    with open(out_path, 'wb') as f:
                        f.write(comfy._get('/view?' + q))
                    return out_path
        time.sleep(2)
    raise TimeoutError(pid)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]
    stats_path = os.path.join(OUT, 'stats.json')
    stats = json.load(open(stats_path)) if os.path.exists(stats_path) else {}
    for name, (style, lyrics, seconds) in TRACKS.items():
        if only and name not in only:
            continue
        path = os.path.join(OUT, f'yue2-{name}.mp3')
        if os.path.exists(path):
            continue
        t = time.time()
        try:
            run_audio(workflow(style, lyrics, seconds, random.randint(0, 2**31)), path)
            stats[name] = {'gen_s': round(time.time() - t), 'style': style, 'lyrics': lyrics}
            print('ok', name, stats[name]['gen_s'], 's', flush=True)
        except Exception as e:
            print('FAIL', name, str(e)[:400], flush=True)
        json.dump(stats, open(stats_path, 'w'), ensure_ascii=False, indent=1)
