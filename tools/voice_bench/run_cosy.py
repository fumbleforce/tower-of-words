# Fun-CosyVoice3 0.5B: zero-shot clone per character, render the bench lines.
import json, time, os, sys, torch, torchaudio
R = '/home/jorgen/ai/tts-cosyvoice/CosyVoice'
os.chdir(R); sys.path.insert(0, R); sys.path.insert(0, f'{R}/third_party/Matcha-TTS')
from cosyvoice.cli.cosyvoice import AutoModel
B = '/home/jorgen/ai/tts-bench'
DEV = os.environ.get('DEV', 'cuda'); ONLY = os.environ.get('ONLY')
L = json.load(open(f'{B}/lines.json')); T = json.load(open(f'{B}/refs/texts.json'))
# CosyVoice3 garbled kanji input (its Japanese examples use kana), so feed it kana readings.
import pykakasi; _k = pykakasi.kakasi()
kana = lambda s: ''.join(x['hira'] for x in _k.convert(s))
t = time.time()
m = AutoModel(model_dir='pretrained_models/Fun-CosyVoice3-0.5B')
stats = {'model': 'fun-cosyvoice3-0.5b', 'load_s': round(time.time() - t, 1), 'lines': []}
os.makedirs(f'{B}/out/cosy', exist_ok=True)
for ch, lines in L.items():
    if ONLY and ch not in ONLY.split(','): continue
    ref = f'{B}/refs/{ch}.wav'
    for i, text in enumerate(lines):
        t = time.time()
        parts = [j['tts_speech'] for j in m.inference_zero_shot(kana(text), 'You are a helpful assistant.<|endofprompt|>' + kana(T[ch]), ref, stream=False, text_frontend=False)]
        torchaudio.save(f'{B}/out/cosy/{ch}-{i}.wav', torch.cat(parts, 1), m.sample_rate)
        s = round(time.time() - t, 2); stats['lines'].append({'ch': ch, 'i': i, 's': s}); print('ok', ch, i, s, flush=True)
stats['device'] = DEV; stats['peak_vram_gb'] = round(torch.cuda.max_memory_allocated() / 2**30, 2) if DEV == 'cuda' else None
json.dump(stats, open(f'{B}/out/cosy-{DEV}.json', 'w'), indent=1); print(stats['peak_vram_gb'])
