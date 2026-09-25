# Sarashina2.2-TTS: zero-shot clone per character, render the bench lines (watermark off).
import json, time, os, sys, torch, soundfile as sf
os.chdir('/home/jorgen/ai/tts-sarashina/sarashina2.2-tts')
from sarashina_tts.generate.generate import SarashinaTTSGenerator
from sarashina_tts.flow_matching.decoder import FlowDecoder
B = '/home/jorgen/ai/tts-bench'
DEV = os.environ.get('DEV', 'cuda'); ONLY = os.environ.get('ONLY')
L = json.load(open(f'{B}/lines.json')); T = json.load(open(f'{B}/refs/texts.json'))
t = time.time()
g = SarashinaTTSGenerator(watermark=False, device=DEV, decoder_fp16=DEV == 'cuda')
stats = {'model': 'sarashina2.2-tts', 'load_s': round(time.time() - t, 1), 'lines': []}
os.makedirs(f'{B}/out/sarashina', exist_ok=True)
for ch, lines in L.items():
    if ONLY and ch not in ONLY.split(','): continue
    ref = f'{B}/refs/{ch}.wav'
    emb = g._extract_zero_shot_embedding(ref); tok = g._extract_audio_prompt_tokens(ref); feat = g._extract_audio_prompt_feat(ref)
    for i, text in enumerate(lines):
        t = time.time()
        w = g.generate(texts=[text], flow_embedding=emb, audio_prompt_text=T[ch], audio_prompt_tokens=tok, audio_prompt_feat=feat, audio_prompt_path=ref)[0]
        sf.write(f'{B}/out/sarashina/{ch}-{i}.wav', w.detach().float().cpu().numpy().T, FlowDecoder.sample_rate)
        s = round(time.time() - t, 2); stats['lines'].append({'ch': ch, 'i': i, 's': s}); print('ok', ch, i, s, flush=True)
stats['device'] = DEV; stats['peak_vram_gb'] = round(torch.cuda.max_memory_allocated() / 2**30, 2) if DEV == 'cuda' else None
_p = f'{B}/out/sarashina-{DEV}.json'
if ONLY and os.path.exists(_p):
    _old = json.load(open(_p)); _new = {(x['ch'], x['i']) for x in stats['lines']}
    stats['lines'] = [x for x in _old['lines'] if (x['ch'], x['i']) not in _new] + stats['lines']
json.dump(stats, open(_p, 'w'), indent=1); print(stats['peak_vram_gb'])
