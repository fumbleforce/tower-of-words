"""Pick the best passing take per line and write game3d/audio/<key>.mp3 (mono 24 kHz 48 kbps), loudness per speaker,
with tools/island_audio/export_voice.py's trim and normalise. Slow lines (manifest 'slow') are stretched to 0.72 of the pace.
An English line with Japanese in it (cfg.units: '<key>~<n>' parts) gets the best take of each part, joined by splice.py;
its parts are picked closest to the speaker's usual English pitch so the Japanese doesn't jump out of the line.
Only lines with no clip for their current text are touched (clips.json). A take named in force.json wins.
Lines with no passing take are printed as NOPASS and listed in <work>/report.json 'fallback' (edge.py voices them).
Rewrites game3d/audio/index.json.
Usage: ~/ai/tts-bench/.venv/bin/python tools/voice/export.py [--dry]"""
import json, os, sys
import numpy as np, librosa
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfg import RAW, AUD, WORK, CLIPS, FORCE, METRICS, REPORT, load, manifest, units, LUFS, LUFS_DEFAULT
import export_voice as X
import splice

DRY = '--dry' in sys.argv
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
        # English parts at the speaker's usual English pitch, then each Japanese part as close as it gets to those
        en = {u['key']: pick(u, SPK_F0.get((e['speaker'], 'en'))) for u in PARTS[k] if u['lang'] == 'en'}
        f_en = [p[1]['median_f0'] for p in en.values() if p[1] and p[1].get('median_f0')]
        f_line = float(np.median(f_en)) if f_en else SPK_F0.get((e['speaker'], 'en'))
        picks = [(u,) + (en[u['key']] if u['key'] in en else pick(u, f_line, 0.05)) for u in PARTS[k]]
        if not all(p[1] for p in picks):
            rep['fallback'].append({'key': k, 'speaker': e['speaker'], 'lang': e['lang'], 'text': e['said'],
                                    'heard': {u['key']: [tk[t]['asr'] for t in sorted(tk)] for u, b, m, tk in picks if not b}})
            continue
        if not DRY:
            ys = [librosa.load(f"{RAW}/{u['key']}/{b}.wav", sr=X.SR)[0] for u, b, m, tk in picks]
            y, spans = splice.join(ys, [u['said'] for u in PARTS[k]], [u['lang'] for u in PARTS[k]], X.SR)
            tmp = f'{WORK}/splice-{k}.wav'
            X.sf.write(tmp, y, X.SR)
            X.enc(X.prep(tmp, lufs), target(k), ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k'])
            os.remove(tmp)
            clips[k] = e['said']
            print('made', k, e['speaker'], 'spliced', ' + '.join(f"{u['said']} [{b}]" for u, b, m, tk in picks), flush=True)
        rep['made'][k] = {'speaker': e['speaker'], 'lang': e['lang'], 'text': e['said'], 'engine': 'qwen', 'spliced': True,
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
