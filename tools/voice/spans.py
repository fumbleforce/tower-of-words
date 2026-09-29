"""Time the known words in overheard clips: Whisper large-v3-turbo word timestamps on the final game3d/audio/<key>.mp3,
the surface matched across Whisper's tokens (exact written text, then kana, then a fuzzy kana window), times inside a token
interpolated by character. Each span padded 40 ms. Writes game3d/audio/spans.json and <work>/spans_report.json.
Run: DEV=cuda ~/ai/tts-bench/.venv/bin/python tools/voice/spans.py"""
import json, os, re, sys, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfg import WORK, AUD, manifest  # puts tools/island_audio on the path
_argv = sys.argv; sys.argv = [sys.argv[0], '--rescore']  # import check.py's helpers without loading its models
import check as C
sys.argv = _argv
import jiwer, librosa, torch
from transformers import pipeline

DEV = os.environ.get('DEV', 'cuda')
PAD = 0.04
asr = pipeline('automatic-speech-recognition', model='openai/whisper-large-v3-turbo', device=DEV,
               torch_dtype=torch.float16 if DEV != 'cpu' else torch.float32)
PUNCT = r'[\s、。，．・！？!?…「」『』（）()～〜\-—.,♪]'


def chars(chunks, conv):
    """[(char, t0, t1)] over the converted chunk texts, times spread evenly across each chunk."""
    out = []
    for txt, a, b in chunks:
        s = conv(txt)
        for j, c in enumerate(s):
            out.append((c, a + (b - a) * j / len(s), a + (b - a) * (j + 1) / len(s)))
    return out


def find(seq, target):
    s = ''.join(c for c, _, _ in seq)
    hits, i = [], s.find(target)
    while target and i >= 0:
        hits.append((seq[i][1], seq[i + len(target) - 1][2]))
        i = s.find(target, i + len(target))
    return hits


def fuzzy(seq, target):
    s = ''.join(c for c, _, _ in seq)
    best = None
    for L in range(max(1, len(target) - 1), len(target) + 2):
        for i in range(0, len(s) - L + 1):
            d = jiwer.cer(target, s[i:i + L])
            if d <= 0.25 and (best is None or d < best[0]):
                best = (d, seq[i][1], seq[i + L - 1][2])
    return [(best[1], best[2])] if best else []


def locate(chunks, surface):
    w = lambda t: re.sub(PUNCT, '', t)
    for conv, how in ((w, 'text'), (C.kana, 'kana')):
        h = find(chars(chunks, conv), conv(surface))
        if h:
            return h, how
    h = fuzzy(chars(chunks, C.kana), C.kana(surface))
    return h, 'fuzzy' if h else None


spans, rep = {}, {'found': [], 'missing': []}
for e in manifest():
    if not e['overheard'] or not (e['words'] or e['clear']):
        continue
    p = f'{AUD}/{e["key"]}.mp3'
    if not os.path.exists(p):
        rep['missing'].append({'key': e['key'], 'surface': '*', 'why': 'no mp3'})
        continue
    y = librosa.load(p, sr=16000)[0]
    dur = len(y) / 16000
    o = asr({'raw': y, 'sampling_rate': 16000}, return_timestamps='word', generate_kwargs={'language': 'ja', 'task': 'transcribe'})
    chunks = [(c['text'], c['timestamp'][0] or 0.0, c['timestamp'][1] if c['timestamp'][1] is not None else dur) for c in o['chunks']]
    out = []
    for wid, surf in [(a, b) for a, b in e['words']] + [('clear', c) for c in e['clear']]:
        hits, how = locate(chunks, surf)
        if not hits:
            rep['missing'].append({'key': e['key'], 'surface': surf, 'id': wid, 'heard': o['text']})
            continue
        for a, b in hits:
            out.append([round(max(0.0, a - PAD), 3), round(min(dur, b + PAD), 3), wid])
        rep['found'].append({'key': e['key'], 'surface': surf, 'id': wid, 'how': how, 'n': len(hits)})
    out.sort()
    spans[e['key']] = out
    print(e['key'], e['text'], '|', o['text'], '|', out, flush=True)
json.dump(spans, open(f'{AUD}/spans.json', 'w'), ensure_ascii=False, indent=1, sort_keys=True)
json.dump(rep, open(f'{WORK}/spans_report.json', 'w'), ensure_ascii=False, indent=1)
print('found', len(rep['found']), 'missing', len(rep['missing']))
for m in rep['missing']:
    print('MISSING', json.dumps(m, ensure_ascii=False))
