"""Pick the best passing take per line and write game3d/audio/<key>.mp3 (mono 24 kHz 48 kbps), loudness per speaker,
with tools/island_audio/export_voice.py's trim and normalise. Slow lines (manifest 'slow') are stretched to 0.72 of the pace.
A spliced line (cfg.SPLICE: Eric's and Carina's English lines with Japanese in them, '<key>~<n>' parts) gets the best take
of each English part, at the speaker's usual English pitch; each Japanese part's takes are tried closest in voice (WavLM)
to those English takes first, and the first joined clip (splice.py) that keeps one voice (segvoice.py) is exported.
Only lines with no clip for their current text are touched (clips.json). A take named in force.json wins.
Lines with no passing take are printed as NOPASS and listed in <work>/report.json 'fallback' (edge.py voices them).
Rewrites game3d/audio/index.json.
Usage: ~/ai/tts-bench/.venv/bin/python tools/voice/export.py [--dry]"""
import json, os, sys
import numpy as np, librosa
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfg import RAW, AUD, WORK, CLIPS, FORCE, METRICS, REPORT, load, manifest, units, speakers, LUFS, LUFS_DEFAULT
import export_voice as X
import splice
import segvoice as SV

_C = []


def voice_models():
    """check.py's WavLM, pitch and Whisper (loaded only when a spliced line is exported)."""
    if not _C:
        import check
        _C.append(check)
    return _C[0]


def english(y):
    return voice_models().asr({'raw': y, 'sampling_rate': 16000}, generate_kwargs={'language': 'en', 'task': 'transcribe'})['text']


def splice_pick(e, en, ja):
    """en: {part key: (take, metrics)} picked; ja: {part key: [passing takes]}. The takes per part in the order to join
    (or None) and the joined 16 kHz voice check: Japanese takes closest in voice to the English takes first, the first
    combination of up to the 4 closest per part whose joined clip keeps one voice."""
    import itertools
    C = voice_models()
    k = e['key']
    load16 = lambda u, t: librosa.load(f"{RAW}/{u}/{t}.wav", sr=16000)[0]
    host = [C.emb(load16(u, t)) for u, (t, m) in en.items()]
    ref = C.emb(librosa.load(SPEAKERS[e['speaker']][0], sr=16000)[0])
    target = sum(host) / len(host) if host else ref
    ranked = {u: sorted(ts, key=lambda t: -float(C.emb(load16(u, t)) @ target))[:4] for u, ts in ja.items()}
    order = [u['key'] for u in PARTS[k]]
    for combo in sorted(itertools.product(*[range(len(ranked[u])) for u in ja]), key=sum):
        pick_ = dict(zip(ja, [ranked[u][i] for u, i in zip(ja, combo)]))
        takes = [en[u][0] if u in en else pick_[u] for u in order]
        ys = [librosa.load(f"{RAW}/{u}/{t}.wav", sr=X.SR)[0] for u, t in zip(order, takes)]
        y, _ = splice.join(ys, [u['said'] for u in PARTS[k]], [u['lang'] for u in PARTS[k]], X.SR)
        y16 = librosa.resample(y, orig_sr=X.SR, target_sr=16000)
        rows = SV.measure(y16, C.emb, C.pitch, ref)
        if not SV.breaks(rows, y16, english):
            return takes, rows
    return None, None

DRY = '--dry' in sys.argv
SPEAKERS = speakers()
M = load(METRICS, {})
clips = load(CLIPS, {})
force = load(FORCE, {})
MAN = manifest()
PARTS = {}
for u in units():
    if u.get('part'):
        PARTS.setdefault(u['line'], []).append(u)
_f0 = {}
for e in MAN + [u for us in PARTS.values() for u in us]:
    for t, m in M.get(e['key'], {}).items():
        if m.get('ok') and m.get('median_f0') and m.get('text') == e['said']:
            _f0.setdefault((e['speaker'], e['lang']), []).append(m['median_f0'])
SPK_F0 = {k: float(np.median(v)) for k, v in _f0.items()}


def score(e, m, f=None, w=0.015):
    # fewest misread characters first, then closest to the reference voice and to pitch f (default: the speaker's usual
    # pitch in the line's language), w per semitone away
    f = f or SPK_F0.get((e['speaker'], e['lang']))
    dev = abs(12 * np.log2(m['median_f0'] / f)) if m.get('median_f0') and f else 3.0
    acc = 1 if (m.get('accent') and not m['accent'][-1]) else 0  # word clips: a take with the right pitch accent first
    native = 0.5 * (1 - m['p_ja']) if m.get('p_ja') is not None else 0  # Japanese words: the more Japanese it sounds the better
    return (round(min(m['cer'], m['cer_written']) / 0.05), acc, -((m['sim'] or 0) - w * dev - native))


def target(k):
    """game3d/audio/<k>.mp3, unlinked first if it's a worktree's link to the main checkout's file (never write through it)."""
    p = f'{AUD}/{k}.mp3'
    if os.path.islink(p):
        os.remove(p)
    return p


def pick(e, f=None, w=0.015):
    """(best take, its metrics, every take's metrics) for a line or a part, or (None, None, takes). f, w: see score()."""
    k = e['key']
    takes = {t: m for t, m in M.get(k, {}).items() if m.get('text') == e['said'] and os.path.exists(f'{RAW}/{k}/{t}.wav') and not m.get('error')}
    ok = {t: m for t, m in takes.items() if m['ok']}
    best = force[k] if k in force and force[k] in takes else (min(ok, key=lambda t: score(e, ok[t], f, w)) if ok else None)
    return best, takes.get(best), takes


rep = load(REPORT, {})
rep.setdefault('made', {}); rep['fallback'] = []; rep['cached'] = []
for e in MAN:
    k = e['key']
    if clips.get(k) == e['said'] and os.path.exists(f'{AUD}/{k}.mp3'):
        rep['cached'].append(k)
        continue
    lufs = LUFS.get(e['speaker'], LUFS_DEFAULT)
    if k in PARTS:
        # English parts at the speaker's usual English pitch, then the Japanese takes closest in voice to those
        en = {u['key']: pick(u, SPK_F0.get((e['speaker'], 'en'))) for u in PARTS[k] if u['lang'] == 'en'}
        picks = [(u,) + (en[u['key']] if u['key'] in en else pick(u)) for u in PARTS[k]]
        if not all(p[1] for p in picks):
            rep['fallback'].append({'key': k, 'speaker': e['speaker'], 'lang': e['lang'], 'text': e['said'],
                                    'heard': {u['key']: [tk[t]['asr'] for t in sorted(tk)] for u, b, m, tk in picks if not b}})
            continue
        ja = {u['key']: [force[u['key']]] if u['key'] in force else [t for t, m in tk.items() if m['ok']]
              for u, b, m, tk in picks if u['lang'] == 'ja'}
        takes, rows = splice_pick(e, {u: (b, m) for u, (b, m, tk) in en.items()}, ja)
        if not takes:
            rep['fallback'].append({'key': k, 'speaker': e['speaker'], 'lang': e['lang'], 'text': e['said'],
                                    'heard': 'every joined clip changes voice partway (segvoice.py)'})
            continue
        picks = [(u, t, tk[t], tk) for (u, b, m, tk), t in zip(picks, takes)]
        if not DRY:
            ys = [librosa.load(f"{RAW}/{u['key']}/{b}.wav", sr=X.SR)[0] for u, b, m, tk in picks]
            y, spans = splice.join(ys, [u['said'] for u in PARTS[k]], [u['lang'] for u in PARTS[k]], X.SR)
            tmp = f'{WORK}/splice-{k}.wav'
            X.sf.write(tmp, y, X.SR)
            X.enc(X.prep(tmp, lufs), target(k), ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k'])
            os.remove(tmp)
            clips[k] = e['said']
            print('made', k, e['speaker'], 'spliced', ' + '.join(f"{u['said']} [{b}]" for u, b, m, tk in picks), flush=True)
        rep['made'][k] = {'speaker': e['speaker'], 'lang': e['lang'], 'text': e['said'], 'engine': 'qwen', 'spliced': True, 'stretches': rows,
                          'parts': [{'text': u['said'], 'lang': u['lang'], 'take': b, 'asr': m['asr'], 'cer': m['cer'],
                                     'f0': m['median_f0'], 'p_ja': m.get('p_ja')} for u, b, m, tk in picks]}
        continue
    best, m, takes = pick(e)
    if not best:
        rep['fallback'].append({'key': k, 'speaker': e['speaker'], 'lang': e['lang'], 'text': e['said'],
                                'heard': [takes[t]['asr'] for t in sorted(takes)]})
        continue
    if not DRY:
        y = X.prep(f'{RAW}/{k}/{best}.wav', lufs)
        X.enc(y, target(k), (['-af', 'atempo=0.72'] if e.get('slow') else []) + ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k'])
        clips[k] = e['said']
        print('made', k, e['speaker'], best, e['said'], '| heard:', m['asr'], flush=True)
    rep['made'][k] = {'speaker': e['speaker'], 'lang': e['lang'], 'take': best, 'text': e['said'], 'asr': m['asr'], 'cer': m['cer'],
                      'cer_written': m['cer_written'], 'f0': m['median_f0'], 'sim': m['sim'], 'p_ja': m.get('p_ja'),
                      'accent': m.get('accent'), 'forced': k in force, 'engine': 'qwen'}
if not DRY:
    json.dump(dict(sorted(clips.items())), open(CLIPS, 'w'), ensure_ascii=False, indent=0)
    keys = sorted(f[:-4] for f in os.listdir(AUD) if f.endswith('.mp3'))
    json.dump(keys, open(f'{AUD}/index.json', 'w'))
os.makedirs(os.path.dirname(REPORT), exist_ok=True)
json.dump(rep, open(REPORT, 'w'), ensure_ascii=False, indent=1)
print('cached', len(rep['cached']), 'fallback', len(rep['fallback']))
for f in rep['fallback']:
    print('NOPASS', json.dumps(f, ensure_ascii=False))
