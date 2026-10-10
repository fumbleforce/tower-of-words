"""Rei voice round 1, step 1 (GPU, Qwen venv): design one reference per candidate with Qwen3-TTS VoiceDesign (Japanese,
the same reference text for all), then clone every voice (the candidates and the two comparison voices) with Qwen3-TTS
Base for the sample lines. Writes $WORK/<id>/ref.wav and $WORK/<id>/<line>-<seed>.wav. Rerun-safe (skips what exists);
exit 75 on gpu.yield. One model loaded at a time; each is freed before the next.
Run (repo root): python3 tools/gpu_priority.py run rei-voice-1 --rank voice -- ~/ai/tts/qwen/venv/bin/python art/candidates/rei-voice-1/gen.py"""
import json, os, sys, time, urllib.request
import torch, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tools'))
import gc
import gpu_priority
from cands import CANDS, REF_TEXT, LINES, SEEDS, WORK, voices
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
    if gpu_priority.should_stop('rei-voice-1'):
        print('yield for the dashboard', flush=True)
        sys.exit(75)
    gpu_priority.let_browsers_in('rei-voice-1', 'voice', free=drop)  # a waiting day test gets a turn


def free_comfy():
    """ComfyUI keeps its last models in VRAM after a job; ask it to unload them when its queue is empty."""
    try:
        q = json.load(urllib.request.urlopen('http://127.0.0.1:8188/queue', timeout=5))
        if not q['queue_running'] and not q['queue_pending']:
            urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8188/free', data=json.dumps(
                {'unload_models': True, 'free_memory': True}).encode(), headers={'Content-Type': 'application/json'}), timeout=10)
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
        w, sr = model('VoiceDesign').generate_voice_design(text=REF_TEXT, language='Japanese', instruct=c['instruct'])
        sf.write(f"{WORK}/{c['id']}/ref.wav", w[0], sr)
        print('designed', c['id'], flush=True)
    drop()

for vid, (ref, ref_text, _) in voices().items():
    os.makedirs(f'{WORK}/{vid}', exist_ok=True)
    for lang in ('English', 'Japanese'):
        ls = [l for l in LINES if l['lang'] == lang]
        for seed in SEEDS:
            todo = [l for l in ls if not os.path.exists(f"{WORK}/{vid}/{l['id']}-{seed}.wav")]
            if not todo:
                continue
            stop()
            torch.manual_seed(seed)
            texts = [l['tts'] for l in todo]
            wavs, sr = model('Base').generate_voice_clone(text=texts, language=[lang] * len(todo), ref_audio=[ref] * len(todo), ref_text=[ref_text] * len(todo),
                                              max_new_tokens=int(12 * (4 + max(len(x) for x in texts) * (0.25 if lang == 'Japanese' else 0.1))))
            for l, w in zip(todo, wavs):
                sf.write(f"{WORK}/{vid}/{l['id']}-{seed}.wav", w, sr)
            print('cloned', vid, lang, seed, flush=True)
drop()
print('done', flush=True)
