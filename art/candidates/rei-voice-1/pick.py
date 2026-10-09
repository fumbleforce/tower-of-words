"""Rei voice round 1, step 2 (tts-bench venv): check every take gen.py made with the game's reading check
(tools/island_audio/check.py: Whisper large-v3-turbo kana CER for Japanese, the female pitch guard, WavLM similarity to
the voice's own reference; English compared letter by letter; 大丈夫です also needs P(ja) >= 0.5, tools/voice/native.py).
Per line, pick a passing take: closest to its own reference (WavLM), then the lowest CER; for the quiet line the lowest pitch. Splice 大丈夫です in front of
the English (tools/voice/splice.py) and export mp3s here at -20 LUFS. Writes results.json (every take and the picks).
Run (repo root): DEV=cuda ~/ai/tts-bench/.venv/bin/python art/candidates/rei-voice-1/pick.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, f'{REPO}/tools/voice')
sys.path.insert(0, f'{REPO}/tools/island_audio')
from cands import LINES, SEEDS, WORK, voices
import check as C
import native, splice
import export_voice as X
import jiwer, librosa, soundfile as sf
from transformers import WhisperProcessor

native.use(C.asr.model, WhisperProcessor(feature_extractor=C.asr.feature_extractor, tokenizer=C.asr.tokenizer))
LUFS = -20.0
ENC = ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k']
V = voices()
C.FEMALE.update(V)  # every voice here is a woman's: the female pitch guard (median >= 185 Hz, <= 25% under 160 Hz)


def letters(s):
    return re.sub(r'[^a-z]', '', s.lower().replace('’', "'"))


res = {'lufs': LUFS, 'voices': {}}
for vid, (ref, _, label) in V.items():
    refy = librosa.load(ref, sr=16000)[0]
    refemb = {vid: C.emb(refy)}
    med, _ = C.pitch(C.trimmed(refy))
    r = {'label': label, 'ref_f0': med, 'ref_seconds': round(len(refy) / 16000, 1), 'takes': {}, 'pick': {}, 'failed': []}
    for l in LINES:
        paths = {s: f"{WORK}/{vid}/{l['id']}-{s}.wav" for s in SEEDS if os.path.exists(f"{WORK}/{vid}/{l['id']}-{s}.wav")}
        if l['lang'] == 'Japanese':
            ms = C.measure([(s, p, vid, l['tts']) for s, p in paths.items()], refemb)
            if l['id'] == 'q-ja':
                for s, m in ms.items():
                    if not m.get('error'):
                        m['p_ja'], m['p_en'] = native.lang(C.trimmed(librosa.load(paths[s], sr=16000)[0]))
                        m['read_ok'] = bool(m['read_ok'] and m['p_ja'] >= 0.5)
                        m['ok'] = bool(m['pitch_ok'] and m['dur_ok'] and m['read_ok'])
        else:
            ms = {}
            for s, p in paths.items():
                y = librosa.load(p, sr=16000)[0]
                heard = C.asr({'raw': y, 'sampling_rate': 16000}, generate_kwargs={'language': 'en', 'task': 'transcribe'})['text'].strip()
                cer = float(jiwer.cer(letters(l['tts']), letters(heard) or '-'))
                med_, low = C.pitch(C.trimmed(y))
                m = {'dur': round(len(y) / 16000, 2), 'median_f0': med_, 'low160': low, 'pitch_ok': C.pitch_ok(vid, med_, low),
                     'asr': heard, 'cer': round(cer, 3), 'sim': round(float(C.emb(y) @ refemb[vid]), 3), 'read_ok': cer <= 0.1}
                m['ok'] = bool(m['pitch_ok'] and m['read_ok'])
                ms[s] = m
        for s, m in ms.items():
            r['takes'][f"{l['id']}-{s}"] = m
        # the quiet line takes the calmest passing take (lowest median pitch); the others the one closest to the voice
        quiet = l['id'].startswith('q-')
        ranked = sorted(ms.items(), key=lambda kv: (not kv[1].get('ok'), not kv[1].get('read_ok'),
                                                    (kv[1].get('median_f0') or 999) if quiet else -(kv[1].get('sim') or 0),
                                                    kv[1].get('cer', 9)))
        r['pick'][l['id']] = ranked[0][0]
        if not ranked[0][1].get('ok'):
            r['failed'].append(l['id'])
    mp3 = lambda y, name: X.enc(y, f'{HERE}/{name}.mp3', ENC)
    mp3(X.prep(ref, LUFS), f'{vid}-ref')
    for lid in ('ja1', 'ja2', 'en'):
        mp3(X.prep(f"{WORK}/{vid}/{lid}-{r['pick'][lid]}.wav", LUFS), f'{vid}-{lid}')
    ys = [librosa.load(f"{WORK}/{vid}/q-{p}-{r['pick']['q-' + p]}.wav", sr=X.SR)[0] for p in ('ja', 'en')]
    joined, _ = splice.join(ys, ['大丈夫です。', "We're one game from the set, so serve."], ['ja', 'en'], X.SR)
    sf.write(f'{WORK}/{vid}/quiet.wav', joined, X.SR)
    mp3(X.prep(f'{WORK}/{vid}/quiet.wav', LUFS), f'{vid}-quiet')
    res['voices'][vid] = r
    print(vid, 'ref f0', med, 'picks', r['pick'], 'FAILED' if r['failed'] else 'all pass', r['failed'], flush=True)
json.dump(res, open(f'{HERE}/results.json', 'w'), indent=1, ensure_ascii=False)
print('done')
