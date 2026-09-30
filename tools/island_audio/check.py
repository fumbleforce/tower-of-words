"""Check every voice take: the pitch guard (GUIDE: female voices must not drift male), a Whisper large-v3-turbo reading check
(kana CER against the storyboard's reading column), WavLM speaker similarity to the character's reference, duration and loudness.
Writes ~/ai/island-audio/voice/metrics.json: {line id: {take: {...}}}; takes already measured are skipped unless the file changed.
Run: DEV=cuda|cpu ~/ai/tts-bench/.venv/bin/python tools/island_audio/check.py [--design]"""
import json, os, re, sys, glob, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, librosa, torch, pykakasi, jiwer, pyloudnorm
from transformers import AutoFeatureExtractor, WavLMForXVector, pipeline
from voices import RAW, LINES, REFS, DESIGN, DESIGN_DIR, W, FEMALE, MALE

DEV = os.environ.get('DEV', 'cpu')
OUT = f'{W}/voice/metrics.json'
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
    s = re.sub(r'[\s、。，．・！？!?…「」『』（）()～〜\-—.,♪]', '', s)
    h = ''.join(x['hira'] for x in kks.convert(s))
    return h.replace('ー', '').replace('っ', '')  # long marks and small tsu are the least stable part of any transcription


def pitch(y):
    f, v, _ = librosa.pyin(y, fmin=70, fmax=450, sr=16000, frame_length=1024)
    f = f[~np.isnan(f)]
    return (round(float(np.median(f)), 1), round(float((f < 160).mean()), 3)) if len(f) >= 5 else (None, None)


def pitch_ok(sp, med, low):
    if med is None:
        return True
    if sp == 'mio':
        return med >= 190 and low <= 0.10
    if sp in FEMALE:
        return med >= 185 and low <= 0.25
    if sp == 'sales':
        return True  # a man shouting across a party: a high pitch is right
    return med <= 220  # male voices: only flag a drift up into a female register


meter = pyloudnorm.Meter(16000, block_size=0.2)


def lufs(y):
    try:
        v = meter.integrated_loudness(y)
        return round(float(v), 1) if np.isfinite(v) else None
    except Exception:
        return None


if '--rescore' in sys.argv:  # no audio models needed
    import types
    fe = sv = asr = None
else:
    print('loading models on', DEV, flush=True)
if '--rescore' not in sys.argv:
    fe = AutoFeatureExtractor.from_pretrained('microsoft/wavlm-base-plus-sv')
    sv = WavLMForXVector.from_pretrained('microsoft/wavlm-base-plus-sv').to(DEV).eval()
    asr = pipeline('automatic-speech-recognition', model='openai/whisper-large-v3-turbo', device=DEV,
                   torch_dtype=torch.float16 if DEV != 'cpu' else torch.float32)


def emb(y):
    if len(y) < 8000:  # WavLM's x-vector layers need about half a second; pad very short takes with silence
        y = np.pad(y, (0, 8000 - len(y)))
    x = fe(y, sampling_rate=16000, return_tensors='pt').to(DEV)
    with torch.no_grad():
        e = sv(**x).embeddings
    return torch.nn.functional.normalize(e, dim=-1)[0].cpu()


def trimmed(y):
    idx = librosa.effects.split(y, top_db=40)
    return y[idx[0][0]:idx[-1][1]] if len(idx) else y


def transcribe(ys):
    outs = asr([{'raw': y, 'sampling_rate': 16000} for y in ys], batch_size=8 if DEV != 'cpu' else 4,
               generate_kwargs={'language': 'ja', 'task': 'transcribe'})
    return [o['text'].strip() for o in outs]


def measure(items, refemb):
    """items: list of (key, path, speaker, target kana text). Returns {key: metrics}."""
    ys = []
    for key, p, sp, tgt in items:
        try:
            y, _ = librosa.load(p, sr=16000)
        except Exception:
            y = np.zeros(0, dtype=np.float32)
        ys.append(y)
    ok_idx = [i for i, y in enumerate(ys) if len(y) >= 1600]
    hyps = dict(zip(ok_idx, transcribe([ys[i] for i in ok_idx]))) if ok_idx else {}
    res = {}
    for i, (key, p, sp, tgt) in enumerate(items):
        y = ys[i]
        if len(y) < 1600:
            res[key] = {'dur': 0, 'error': 'empty or under 0.1 s'}
            continue
        yt = trimmed(y)
        med, low = pitch(yt)
        k_t, k_h = kana(tgt), kana(hyps[i])
        cer = jiwer.cer(k_t, k_h or '-') if k_t else 0.0
        dist = round(cer * len(k_t))
        nk = max(1, len(k_t))
        dur = len(yt) / 16000
        m = {'dur': round(len(y) / 16000, 2), 'speech': round(dur, 2), 'median_f0': med, 'low160': low,
             'pitch_ok': pitch_ok(sp, med, low), 'asr': hyps[i], 'cer': round(float(cer), 3), 'edits': dist,
             'sim': round(float(emb(y) @ refemb[sp]), 3) if sp in refemb else None, 'lufs': lufs(y),
             'short': nk <= 2}
        if sp in MALE and nk <= 2:
            m['pitch_ok'] = True  # a rising 「ん？」 goes high in any voice; the male bound is only for real lines
        m['dur_ok'] = 0.05 * nk <= dur <= 1.4 + 0.33 * nk
        m['read_ok'] = m['short'] or cer <= 0.2 or (nk <= 6 and dist <= 1)
        m['ok'] = bool(m['pitch_ok'] and m['dur_ok'] and m['read_ok'])
        res[key] = m
    return res


def rescore():
    """Recompute the reading check from the stored transcripts: a take also passes when Whisper's text matches the line as written,
    both read by the same pykakasi (it reads 人, 今日 and 君 differently from the script's kana, which failed takes that were right)."""
    m = json.load(open(OUT))
    lines = {l['id']: l for l in json.load(open(LINES))['lines']}
    changed = 0
    for lid, takes in m.items():
        l = lines.get(lid)
        if not l:
            continue
        for t, x in takes.items():
            if x.get('error') or x.get('asr') is None:
                continue
            kj = kana(l.get('tts') or l['jp'])
            kh = kana(x['asr'])
            cer_jp = jiwer.cer(kj, kh or '-') if kj else 0.0
            x['cer_written'] = round(float(cer_jp), 3)
            nk = max(1, len(kana(l['reading'])))
            ok_w = cer_jp <= 0.2 or (nk <= 6 and round(cer_jp * len(kj)) <= 1)
            read_ok = bool(x.get('short') or x['cer'] <= 0.2 or (nk <= 6 and x.get('edits', 9) <= 1) or ok_w)
            if read_ok != x.get('read_ok'):
                changed += 1
            x['read_ok'] = read_ok
            if l['speaker'] in MALE and x.get('short'):
                x['pitch_ok'] = True
            x['ok'] = bool(x.get('pitch_ok') and x.get('dur_ok') and read_ok)
    json.dump(m, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print('rescored; reading check changed on', changed, 'takes')


def main():
    if '--rescore' in sys.argv:
        return rescore()
    design = '--design' in sys.argv
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    refemb = {}
    for sp, (ref, _, _) in REFS.items():
        if os.path.exists(ref):
            refemb[sp] = emb(librosa.load(ref, sr=16000)[0])
    if design:
        # the designed voices' candidates: reading check and pitch only (there is no reference yet)
        items = []
        for p in sorted(glob.glob(f'{DESIGN_DIR}/*.wav')):
            v = os.path.basename(p).split('-')[0]
            items.append((os.path.basename(p)[:-4], p, v, DESIGN[v][1]))
        res = measure(items, {})
        json.dump(res, open(f'{DESIGN_DIR}/metrics.json', 'w'), ensure_ascii=False, indent=1)
        for k, m in res.items():
            print(k, m.get('median_f0'), m.get('cer'), m.get('dur'), m.get('asr'))
        return
    lines = json.load(open(LINES))['lines']
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    if only:
        lines = [l for l in lines if l['speaker'] in only]
    items = []
    for l in lines:
        for p in sorted(glob.glob(f'{RAW}/{l["id"]}/*.wav')):
            take = os.path.basename(p)[:-4]
            prev = old.get(l['id'], {}).get(take)
            if prev and prev.get('mtime') == int(os.path.getmtime(p)):
                continue
            items.append(((l['id'], take), p, l['speaker'], l['reading']))
    if limit:
        items = items[:limit]
    print('to check', len(items), flush=True)
    for s in range(0, len(items), 64):
        chunk = items[s:s + 64]
        res = measure(chunk, refemb)
        for (lid, take), m in res.items():
            p = f'{RAW}/{lid}/{take}.wav'
            m['mtime'] = int(os.path.getmtime(p))
            old.setdefault(lid, {})[take] = m
        json.dump(old, open(OUT, 'w'), ensure_ascii=False, indent=1)
        print('checked', min(s + 64, len(items)), '/', len(items), flush=True)


if __name__ == '__main__':
    main()
