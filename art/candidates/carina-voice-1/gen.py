"""Carina voice round 1, step 1 (GPU, Qwen venv): design one reference per candidate with Qwen3-TTS VoiceDesign (English,
the same reference text for all), then clone each with Qwen3-TTS Base as the game does (tools/voice/gen_takes.py):
English lines from the reference, Japanese from the timbre only (x-vector, as Eric's Japanese, cfg.XVEC_JA).
Writes $WORK/<cand>/ref.wav and $WORK/<cand>/<line>-<seed>.wav. Rerun-safe (skips what exists); exit 75 on gpu.yield.
Run from this folder: python3 ../../../tools/gpu_priority.py run carina-voice-1 --rank carina-voice -- ~/ai/tts/qwen/venv/bin/python gen.py"""
import os, sys, torch, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tools'))
import gc
import gpu_priority
from cands import CANDS, REF_TEXT, LINES, SEEDS, WORK
from qwen_tts import Qwen3TTSModel

Q = os.path.expanduser('~/ai/tts/qwen')


LOADED = {}  # the TTS models in memory: model() loads on first use and again after a turn given to a browser test


def model(kind):
    if kind not in LOADED:
        LOADED[kind] = Qwen3TTSModel.from_pretrained(f'{Q}/Qwen3-TTS-12Hz-1.7B-' + kind, device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa')
    return LOADED[kind]


def drop():
    LOADED.clear()
    gc.collect()
    torch.cuda.empty_cache()


def stop():
    if gpu_priority.should_stop('carina-voice-1'):
        print('yield for the dashboard', flush=True)
        sys.exit(75)
    gpu_priority.let_browsers_in('carina-voice-1', 'carina-voice', free=drop)  # a waiting day test gets a turn


def free_comfy():
    """ComfyUI keeps its last models in VRAM (6 GB) after a job; ask it to unload them when its queue is empty."""
    import json, urllib.request
    try:
        q = json.load(urllib.request.urlopen('http://127.0.0.1:8188/queue', timeout=5))
        if not q['queue_running'] and not q['queue_pending']:
            urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8188/free', data=json.dumps(
                {'unload_models': True, 'free_memory': True}).encode(), headers={'Content-Type': 'application/json'}), timeout=10)
            import time
            time.sleep(3)
            print('asked ComfyUI to unload its models', flush=True)
    except Exception as e:
        print('ComfyUI free skipped:', e, flush=True)


free_comfy()
need = [c for c in CANDS if not os.path.exists(f"{WORK}/{c['id']}/ref.wav")]
if need:
    for c in need:
        stop()
        os.makedirs(f"{WORK}/{c['id']}", exist_ok=True)
        torch.manual_seed(c.get('seed', 7))
        w, sr = model('VoiceDesign').generate_voice_design(text=REF_TEXT, language='English', instruct=c['instruct'])
        sf.write(f"{WORK}/{c['id']}/ref.wav", w[0], sr)
        print('designed', c['id'], flush=True)
    drop()

for c in CANDS:
    ref = f"{WORK}/{c['id']}/ref.wav"
    for lang in ('English', 'Japanese'):
        ls = [l for l in LINES if l['lang'] == lang]
        for seed in SEEDS:
            todo = [l for l in ls if not os.path.exists(f"{WORK}/{c['id']}/{l['id']}-{seed}.wav")]
            if not todo:
                continue
            stop()
            torch.manual_seed(seed)
            texts = [l['tts'] for l in todo]
            wavs, sr = model('Base').generate_voice_clone(text=texts, language=[lang] * len(todo), ref_audio=[ref] * len(todo), ref_text=[REF_TEXT] * len(todo),
                                              x_vector_only_mode=(lang == 'Japanese'),
                                              max_new_tokens=int(12 * (4 + max(len(x) for x in texts) * (0.25 if lang == 'Japanese' else 0.1))))
            for l, w in zip(todo, wavs):
                sf.write(f"{WORK}/{c['id']}/{l['id']}-{seed}.wav", w, sr)
            print('cloned', c['id'], lang, seed, flush=True)
print('done', flush=True)
