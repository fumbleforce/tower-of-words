"""Carina voice round 1, step 2 (tts-bench venv): check every take gen.py made with Whisper large-v3-turbo (English
text match; for Japanese P(ja) and the Japanese transcript, tools/voice/native.py), pick the best seed per line (the text heard, for Japanese P(ja) of at least 0.9, then the pitch closest to the
reference's, so a take doesn't drift away from the voice), splice
ここ into "Right by the fountain." (tools/voice/splice.py) and export mp3s here at -20 LUFS, with Eric's clips of the
same lines at the same loudness for comparison. Writes results.json (every take's numbers and the picks).
Run: DEV=cuda ~/ai/tts-bench/.venv/bin/python pick.py"""
import difflib, json, os, re, shutil, sys
import numpy as np, librosa
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, f'{REPO}/tools/voice')
sys.path.insert(0, f'{REPO}/tools/island_audio')
from cands import CANDS, LINES, SEEDS, WORK
import native, splice
import export_voice as X
import torch

LUFS = -20.0
ENC = ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k']
MAIN_AUDIO = '/home/jorgen/repo/japanese/game3d/audio'  # Eric's exported clips (not in git)
MAIN_REFS = '/home/jorgen/repo/japanese/tools/voice-refs'


def en_text(y):
    M = native._model()
    with torch.no_grad():
        out = M['m'].generate(native._feats(y), language='en', task='transcribe', max_length=96)
    return M['p'].batch_decode(out, skip_special_tokens=True)[0].strip()


def norm(t):
    return re.sub(r"[^a-z0-9ぁ-んァ-ン一-龯]", '', t.lower().replace('’', "'"))


def sim(a, b):
    return round(difflib.SequenceMatcher(None, norm(a), norm(b)).ratio(), 3)


def f0(y):
    f, _, _ = librosa.pyin(y, fmin=100, fmax=500, sr=16000, frame_length=1024, hop_length=160)
    f = f[~np.isnan(f)]
    return round(float(np.median(f)), 1) if len(f) else None


def mp3(y, name):
    X.enc(y, f'{HERE}/{name}.mp3', ENC)


res = {'lufs': LUFS, 'cands': {}}
for c in CANDS:
    d = f"{WORK}/{c['id']}"
    r = {'label': c['label'], 'instruct': c['instruct'], 'takes': {}, 'pick': {}}
    ref = native.load(f'{d}/ref.wav')
    r['ref_f0'] = f0(ref)
    r['ref_seconds'] = round(len(ref) / 16000, 1)
    mp3(X.prep(f'{d}/ref.wav', LUFS), f"{c['id']}-ref")
    for l in LINES:
        best = None
        for s in SEEDS:
            p = f"{d}/{l['id']}-{s}.wav"
            y = native.load(p)
            m = {'seconds': round(len(y) / 16000, 2), 'f0': f0(y)}
            if l['lang'] == 'English':
                m['heard'] = en_text(y)
                m['sim'] = sim(m['heard'], l['tts'])
                score = (m['sim'], 0, -abs((m['f0'] or 0) - r['ref_f0']))
            else:
                m['p_ja'], m['p_en'] = native.lang(y)
                m['heard'] = native.ja_text(y)
                m['sim'] = sim(m['heard'], l['tts'])
                score = (m['sim'], m['p_ja'] >= 0.9, -abs((m['f0'] or 0) - r['ref_f0']))
            r['takes'][f"{l['id']}-{s}"] = m
            if best is None or score > best[0]:
                best = (score, s)
        r['pick'][l['id']] = best[1]
    for lid in ('en1', 'en2', 'word'):
        mp3(X.prep(f"{d}/{lid}-{r['pick'][lid]}.wav", LUFS), f"{c['id']}-{lid}")
    ys = [librosa.load(f"{d}/mix-ja-{r['pick']['mix-ja']}.wav", sr=X.SR)[0], librosa.load(f"{d}/mix-en-{r['pick']['mix-en']}.wav", sr=X.SR)[0]]
    joined, _ = splice.join(ys, ['ここ。', 'Right by the fountain.'], ['ja', 'en'], X.SR)
    tmp = f'{d}/mix.wav'
    import soundfile as sf
    sf.write(tmp, joined, X.SR)
    mp3(X.prep(tmp, LUFS), f"{c['id']}-mix")
    res['cands'][c['id']] = r
    print(c['id'], 'ref f0', r['ref_f0'], 'picks', r['pick'], flush=True)

# Eric, for comparison: his reference and his game clips of the same lines, brought to the same loudness
mp3(X.prep(f'{MAIN_REFS}/eric-voice.wav', LUFS), 'eric-ref')
for lid, key in (('en1', 'ln-nv21v1'), ('en2', 'ln-uf8chl'), ('mix', 'ln-1jt4934'), ('word', 'eric-ohayo')):
    mp3(X.prep(f'{MAIN_AUDIO}/{key}.mp3', LUFS), f'eric-{lid}')
json.dump(res, open(f'{HERE}/results.json', 'w'), indent=1, ensure_ascii=False)
print('done')
