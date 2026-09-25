# Local Qwen3-TTS 1.7B Base (the existing fallback): clone per character, render the bench lines.
import json, time, os, torch, soundfile as sf
from qwen_tts import Qwen3TTSModel
B = '/home/jorgen/ai/tts-bench'
DEV = os.environ.get('DEV', 'cuda'); ONLY = os.environ.get('ONLY')
L = json.load(open(f'{B}/lines.json')); T = json.load(open(f'{B}/refs/texts.json'))
t = time.time()
m = Qwen3TTSModel.from_pretrained('/home/jorgen/ai/tts/qwen/Qwen3-TTS-12Hz-1.7B-Base', device_map='cuda:0' if DEV == 'cuda' else 'cpu', dtype=torch.bfloat16 if DEV == 'cuda' else torch.float32, attn_implementation='sdpa')
stats = {'model': 'qwen3-tts-1.7b-local', 'load_s': round(time.time() - t, 1), 'lines': [dict(ch=l.split()[1], i=int(l.split()[2]), s=float(l.split()[3])) for l in open(f'{B}/out/qwen-cpu.log0') if l.startswith('ok ')] if os.path.exists(f'{B}/out/qwen-cpu.log0') else []}
os.makedirs(f'{B}/out/qwen', exist_ok=True)
for ch, lines in L.items():
    if ONLY and ch not in ONLY.split(','): continue
    for i, text in enumerate(lines):
        if os.path.exists(f'{B}/out/qwen/{ch}-{i}.wav'): continue  # resume
        t = time.time()
        # cap the length (12 tokens per second of audio); an uncapped take ran on for minutes
        wavs, sr = m.generate_voice_clone(text=text, language='Japanese', ref_audio=f'{B}/refs/{ch}.wav', ref_text=T[ch], max_new_tokens=int(12 * (4 + len(text) * 0.25)))
        sf.write(f'{B}/out/qwen/{ch}-{i}.wav', wavs[0], sr)
        s = round(time.time() - t, 2); stats['lines'].append({'ch': ch, 'i': i, 's': s}); print('ok', ch, i, s, flush=True)
stats['device'] = DEV; stats['peak_vram_gb'] = round(torch.cuda.max_memory_allocated() / 2**30, 2) if DEV == 'cuda' else None
_p = f'{B}/out/qwen-{DEV}.json'
if ONLY and os.path.exists(_p):
    _old = json.load(open(_p)); _new = {(x['ch'], x['i']) for x in stats['lines']}
    stats['lines'] = [x for x in _old['lines'] if (x['ch'], x['i']) not in _new] + stats['lines']
json.dump(stats, open(_p, 'w'), indent=1); print(stats['peak_vram_gb'])
