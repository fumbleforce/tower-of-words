# Objective metrics for the bench: pitch (GUIDE male-drift guard), speaker similarity (WavLM-SV cosine to the reference clip),
# kana CER from Whisper large-v3-turbo, duration. Usage: metrics.py system [system ...]  -> out/metrics-<system>.json
import sys, json, os, re, warnings
warnings.filterwarnings('ignore')
import numpy as np, librosa, torch, pykakasi, jiwer
from transformers import AutoFeatureExtractor, WavLMForXVector, pipeline
B = '/home/jorgen/ai/tts-bench'
L = json.load(open(f'{B}/lines.json'))
dev = os.environ.get('DEV', 'cpu')
fe = AutoFeatureExtractor.from_pretrained('microsoft/wavlm-base-plus-sv'); sv = WavLMForXVector.from_pretrained('microsoft/wavlm-base-plus-sv').to(dev).eval()
asr = pipeline('automatic-speech-recognition', model='openai/whisper-large-v3-turbo', device=dev, torch_dtype=torch.float16 if dev != 'cpu' else torch.float32)
kks = pykakasi.kakasi()
DIG = '〇一二三四五六七八九'
def kanjinum(m):
    n = int(m.group()); out = ''
    for v, u in ((1000, '千'), (100, '百'), (10, '十')):
        d, n = divmod(n, v)
        if d: out += (DIG[d] if d > 1 else '') + u
    return out + (DIG[n] if n else '') or '〇'
def kana(s):
    s = re.sub(r'\d+', kanjinum, s.translate(str.maketrans('０１２３４５６７８９', '0123456789')))
    s = re.sub(r'[\s、。，．・！？!?…「」『』（）()～ー〜\-—.,]', '', s)
    return ''.join(x['hira'] for x in kks.convert(s))
def emb(y):
    x = fe(y, sampling_rate=16000, return_tensors='pt').to(dev)
    with torch.no_grad(): e = sv(**x).embeddings
    return torch.nn.functional.normalize(e, dim=-1)[0].cpu()
def pitch(y):
    f, v, _ = librosa.pyin(y, fmin=70, fmax=450, sr=16000, frame_length=1024); f = f[~np.isnan(f)]
    return (round(float(np.median(f)), 1), round(float((f < 160).mean()), 3)) if len(f) else (None, None)
REF = {ch: emb(librosa.load(f'{B}/refs/{ch}.wav', sr=16000)[0]) for ch in L}
for sysname in sys.argv[1:]:
    rows = []
    for ch, lines in L.items():
        for i, text in enumerate(lines):
            p = next((f'{B}/out/{sysname}/{ch}-{i}.{e}' for e in ('wav', 'mp3') if os.path.exists(f'{B}/out/{sysname}/{ch}-{i}.{e}')), None)
            if not p: continue
            try: y, _ = librosa.load(p, sr=16000)
            except Exception: y = np.zeros(0)
            if len(y) < 1600:
                rows.append({'ch': ch, 'i': i, 'dur': 0, 'median': None, 'low160': None, 'sim': 0.0, 'cer': 1.0, 'asr': '(no audio: the model returned an empty file)'})
                print(sysname, rows[-1], flush=True); continue
            hyp = asr({'raw': y, 'sampling_rate': 16000}, generate_kwargs={'language': 'ja', 'task': 'transcribe'})['text']
            med, low = pitch(y)
            cer = jiwer.cer(kana(text), kana(hyp) or '-')
            rows.append({'ch': ch, 'i': i, 'dur': round(len(y) / 16000, 2), 'median': med, 'low160': low,
                         'sim': round(float(emb(y) @ REF[ch]), 3), 'cer': round(cer, 3), 'asr': hyp.strip()})
            print(sysname, rows[-1], flush=True)
    json.dump(rows, open(f'{B}/out/metrics-{sysname}.json', 'w'), ensure_ascii=False, indent=1)
