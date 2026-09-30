"""Qwen3-TTS 1.7B Base, local (~/ai/tts/qwen): one more take per line, cloned from the same reference clips as Irodori (voices.py).
Raw takes: ~/ai/island-audio/voice/raw/<line id>/qwen-s1.wav with a JSON sidecar. Options as tts_irodori.py (--shard, --tier, --only).
Run: DEV=cuda ~/ai/tts/qwen/venv/bin/python tools/island_audio/tts_qwen.py --tier all"""
import argparse, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import torch, soundfile as sf
from voices import RAW, LINES, REFS, TAKES, take_text, take_needed

ap = argparse.ArgumentParser()
ap.add_argument('--shard', default='0/1')
ap.add_argument('--tier', default='all')
ap.add_argument('--only', default='')
ap.add_argument('--takes', default='qwen-s1')
ap.add_argument('--threads', type=int, default=0)
ap.add_argument('--retry', action='store_true', help='only lines where no take passed the checks (metrics.json)')
a = ap.parse_args()
DEV = os.environ.get('DEV', 'cuda')
if a.threads:
    torch.set_num_threads(a.threads)
from qwen_tts import Qwen3TTSModel

t0 = time.time()
m = Qwen3TTSModel.from_pretrained('/home/jorgen/ai/tts/qwen/Qwen3-TTS-12Hz-1.7B-Base', device_map='cuda:0' if DEV == 'cuda' else 'cpu',
                                  dtype=torch.bfloat16 if DEV == 'cuda' else torch.float32, attn_implementation='sdpa')
print('loaded', round(time.time() - t0, 1), flush=True)
lines = json.load(open(LINES))['lines']
i, n = (int(x) for x in a.shard.split('/'))
only = set(a.only.split(',')) if a.only else None
todo = [l for k, l in enumerate(lines) if k % n == i and (a.tier == 'all' or l['tier'] == a.tier) and (not only or l['speaker'] in only)]
if a.retry:
    from voices import W
    _m = json.load(open(f'{W}/voice/metrics.json'))
    todo = [l for l in todo if _m.get(l['id']) and not any(x.get('ok') for x in _m[l['id']].values())]
    print('retrying', len(todo), 'lines with no passing take', flush=True)
done = 0
for l in todo:
    ref, ref_text, _ = REFS[l['speaker']]
    if not os.path.exists(ref):
        continue
    d = f'{RAW}/{l["id"]}'
    os.makedirs(d, exist_ok=True)
    for tk in a.takes.split(','):
        out = f'{d}/{tk}.wav'
        if os.path.exists(out) or not take_needed(l, tk):
            continue
        _, seed, which = TAKES[tk]
        text = take_text(l, which)
        torch.manual_seed(seed)
        t = time.time()
        try:
            wavs, sr = m.generate_voice_clone(text=text, language='Japanese', ref_audio=ref, ref_text=ref_text,
                                              max_new_tokens=int(12 * (4 + len(text) * 0.25)))
            sf.write(out, wavs[0], sr)
            json.dump({'take': tk, 'engine': 'Qwen3-TTS 1.7B Base (local)', 'device': DEV, 'seed': seed, 'text': text,
                       'reference': os.path.basename(ref), 'settings': 'voice clone with the reference transcript; max_new_tokens capped by length',
                       'gen_s': round(time.time() - t, 2)}, open(f'{d}/{tk}.json', 'w'), ensure_ascii=False, indent=1)
            done += 1
            print('ok', l['id'], tk, round(time.time() - t, 1), flush=True)
        except Exception as e:
            print('FAIL', l['id'], tk, str(e)[:300], flush=True)
print('shard done', a.shard, done, flush=True)
