"""Irodori-TTS v4.1 Small, local: voice the island slice lines, cloned per character (voices.py), several takes per line.
Raw takes: ~/ai/island-audio/voice/raw/<line id>/<take>.wav with <take>.json (text, seed, reference, seconds taken).
  --design            make the designed voices' reference candidates (caption only, no reference) into ~/ai/island-audio/refs/design/
  --shard i/n         this process takes every n-th line starting at i (run several processes on the CPU)
  --tier main|variant|all, --takes iro-s1,iro-kana, --only emi,mio
Run from the Irodori folder: cd ~/ai/tts-irodori/Irodori-TTS && DEV=cpu .venv/bin/python <repo>/tools/island_audio/tts_irodori.py ..."""
import argparse, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '/home/jorgen/ai/tts-irodori/Irodori-TTS')
import torch
from voices import RAW, LINES, REFS, DESIGN, DESIGN_DIR, TAKES, FIXED_SECONDS, take_text, take_needed

ap = argparse.ArgumentParser()
ap.add_argument('--design', action='store_true')
ap.add_argument('--shard', default='0/1')
ap.add_argument('--tier', default='main')
ap.add_argument('--takes', default='iro-s1,iro-s2,iro-kana')
ap.add_argument('--only', default='')
ap.add_argument('--threads', type=int, default=0)
ap.add_argument('--retry', action='store_true', help='only lines where no take passed the checks (metrics.json)')
a = ap.parse_args()
DEV = os.environ.get('DEV', 'cuda')
if a.threads:
    torch.set_num_threads(a.threads)

from huggingface_hub import hf_hub_download
from irodori_tts.inference_runtime import InferenceRuntime, RuntimeKey, SamplingRequest, save_wav

ck = hf_hub_download('Aratako/Irodori-TTS-v4.1-Small', 'model.safetensors')
t0 = time.time()
rt = InferenceRuntime.from_key(RuntimeKey(checkpoint=ck, model_device=DEV, codec_repo='Aratako/Semantic-DACVAE-Japanese-32dim',
                                          model_precision='bf16' if DEV == 'cuda' else 'fp32', codec_device=DEV, codec_precision='fp32',
                                          codec_deterministic_encode=True, codec_deterministic_decode=True, compile_model=False, compile_dynamic=False))
print('loaded', round(time.time() - t0, 1), 's; watermark', getattr(rt.watermarker, 'ready', None), flush=True)

if a.design:
    os.makedirs(DESIGN_DIR, exist_ok=True)
    for v, (caption, text) in DESIGN.items():
        if a.only and v not in a.only.split(','):
            continue
        for c, seed in enumerate((11, 22, 33, 44)):
            out = f'{DESIGN_DIR}/{v}-c{c + 1}.wav'
            if os.path.exists(out):
                continue
            t = time.time()
            r = rt.synthesize(SamplingRequest(text=text, caption=caption, no_ref=True, seed=seed), log_fn=None)
            save_wav(out, r.audio, r.sample_rate)
            json.dump({'voice': v, 'caption': caption, 'text': text, 'seed': seed, 'engine': 'Irodori-TTS v4.1 Small, caption only',
                       'gen_s': round(time.time() - t, 2)}, open(out[:-4] + '.json', 'w'), ensure_ascii=False, indent=1)
            print('design', v, c + 1, round(time.time() - t, 1), 's', flush=True)
    sys.exit(0)

lines = json.load(open(LINES))['lines']
i, n = (int(x) for x in a.shard.split('/'))
only = set(a.only.split(',')) if a.only else None
todo = [l for k, l in enumerate(lines) if k % n == i and (a.tier == 'all' or l['tier'] == a.tier) and (not only or l['speaker'] in only)]
if a.retry:
    from voices import W
    _m = json.load(open(f'{W}/voice/metrics.json'))
    todo = [l for l in todo if _m.get(l['id']) and not any(x.get('ok') for x in _m[l['id']].values())]
    print('retrying', len(todo), 'lines with no passing take', flush=True)
takes = [t for t in a.takes.split(',') if TAKES[t][0] == 'irodori']
done = 0
for l in todo:
    ref = REFS[l['speaker']][0]
    if not os.path.exists(ref):
        print('no reference for', l['speaker'], flush=True)
        continue
    d = f'{RAW}/{l["id"]}'
    os.makedirs(d, exist_ok=True)
    for tk in takes:
        out = f'{d}/{tk}.wav'
        if os.path.exists(out) or not take_needed(l, tk):
            continue
        _, seed, which = TAKES[tk]
        text = take_text(l, which)
        t = time.time()
        try:
            fixed = FIXED_SECONDS.get(tk)
            r = rt.synthesize(SamplingRequest(text=text, ref_wav=ref, seed=seed, seconds=fixed), log_fn=None)
            save_wav(out, r.audio, r.sample_rate)
            json.dump({'take': tk, 'engine': 'Irodori-TTS v4.1 Small', 'device': DEV, 'seed': seed, 'text': text, 'reference': os.path.basename(ref),
                       'settings': f'defaults, length fixed at {fixed} s' if fixed else 'defaults (40 steps, cfg text 3.0, speaker 5.0, duration predicted)',
                       'gen_s': round(time.time() - t, 2)},
                      open(f'{d}/{tk}.json', 'w'), ensure_ascii=False, indent=1)
            done += 1
            print('ok', l['id'], tk, round(time.time() - t, 1), flush=True)
        except Exception as e:
            print('FAIL', l['id'], tk, str(e)[:300], flush=True)
print('shard done', a.shard, done, 'takes', flush=True)
