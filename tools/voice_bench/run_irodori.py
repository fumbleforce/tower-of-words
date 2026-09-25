# Irodori-TTS v4.1 Small: clone each character from its reference, render the bench lines.
import json, time, sys, os, torch
sys.path.insert(0, '/home/jorgen/ai/tts-irodori/Irodori-TTS')
from huggingface_hub import hf_hub_download
from irodori_tts.inference_runtime import InferenceRuntime, RuntimeKey, SamplingRequest, save_wav
B = '/home/jorgen/ai/tts-bench'
DEV = os.environ.get('DEV', 'cuda'); ONLY = os.environ.get('ONLY')
L = json.load(open(f'{B}/lines.json'))
ck = hf_hub_download('Aratako/Irodori-TTS-v4.1-Small', 'model.safetensors')
t = time.time()
rt = InferenceRuntime.from_key(RuntimeKey(checkpoint=ck, model_device=DEV, codec_repo='Aratako/Semantic-DACVAE-Japanese-32dim',
    model_precision='bf16' if DEV == 'cuda' else 'fp32', codec_device=DEV, codec_precision='fp32', codec_deterministic_encode=True, codec_deterministic_decode=True,
    compile_model=False, compile_dynamic=False))
class _NoMark:
    ready = False
rt.watermarker = _NoMark()  # skip SilentCipher (it resamples to 44.1 kHz); keeps the comparison clean
stats = {'model': 'irodori-v4.1-small', 'load_s': round(time.time() - t, 1), 'lines': []}
import os; os.makedirs(f'{B}/out/irodori', exist_ok=True)
for ch, lines in L.items():
    ref = f'{B}/refs/{ch}-long.wav' if os.path.exists(f'{B}/refs/{ch}-long.wav') else f'{B}/refs/{ch}.wav'
    if ONLY and ch not in ONLY.split(','): continue
    for i, text in enumerate(lines):
        t = time.time()
        r = rt.synthesize(SamplingRequest(text=text, ref_wav=ref, seed=1234 + i), log_fn=None)
        save_wav(f'{B}/out/irodori/{ch}-{i}.wav', r.audio, r.sample_rate)
        s = round(time.time() - t, 2)
        stats['lines'].append({'ch': ch, 'i': i, 's': s})
        print('ok', ch, i, s, flush=True)
stats['device'] = DEV; stats['peak_vram_gb'] = round(torch.cuda.max_memory_allocated() / 2**30, 2) if DEV == 'cuda' else None
_p = f'{B}/out/irodori-{DEV}.json'
if ONLY and os.path.exists(_p):
    _old = json.load(open(_p)); _new = {(x['ch'], x['i']) for x in stats['lines']}
    stats['lines'] = [x for x in _old['lines'] if (x['ch'], x['i']) not in _new] + stats['lines']
json.dump(stats, open(_p, 'w'), indent=1)
print(stats['peak_vram_gb'])
