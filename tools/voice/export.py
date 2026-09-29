"""Pick the best passing take per line and write game3d/audio/<key>.mp3 (mono 24 kHz 48 kbps), loudness per speaker,
with tools/island_audio/export_voice.py's trim and normalise. Slow lines (manifest 'slow') are stretched to 0.72 of the pace.
Only lines with no clip for their current text are touched (clips.json). A take named in force.json wins.
Lines with no passing take are printed as NOPASS and listed in <work>/report.json 'fallback' (edge.py voices them).
Rewrites game3d/audio/index.json.
Usage: ~/ai/tts-bench/.venv/bin/python tools/voice/export.py [--dry]"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfg import RAW, AUD, CLIPS, FORCE, METRICS, REPORT, load, manifest, LUFS, LUFS_DEFAULT
import export_voice as X

DRY = '--dry' in sys.argv
M = load(METRICS, {})
clips = load(CLIPS, {})
force = load(FORCE, {})
MAN = manifest()
_f0 = {}
for e in MAN:
    for t, m in M.get(e['key'], {}).items():
        if m.get('ok') and m.get('median_f0') and m.get('text') == e['said']:
            _f0.setdefault((e['speaker'], e['lang']), []).append(m['median_f0'])
SPK_F0 = {k: float(np.median(v)) for k, v in _f0.items()}


def score(e, m):
    # fewest misread characters first, then closest to the reference voice and to the speaker's usual pitch
    f = SPK_F0.get((e['speaker'], e['lang']))
    dev = abs(12 * np.log2(m['median_f0'] / f)) if m.get('median_f0') and f else 3.0
    return (round(min(m['cer'], m['cer_written']) / 0.05), -((m['sim'] or 0) - 0.015 * dev))


rep = load(REPORT, {})
rep.setdefault('made', {}); rep['fallback'] = []; rep['cached'] = []
for e in MAN:
    k = e['key']
    if clips.get(k) == e['said'] and os.path.exists(f'{AUD}/{k}.mp3'):
        rep['cached'].append(k)
        continue
    takes = {t: m for t, m in M.get(k, {}).items() if m.get('text') == e['said'] and os.path.exists(f'{RAW}/{k}/{t}.wav') and not m.get('error')}
    ok = {t: m for t, m in takes.items() if m['ok']}
    best = force[k] if k in force and force[k] in takes else (min(ok, key=lambda t: score(e, ok[t])) if ok else None)
    if not best:
        rep['fallback'].append({'key': k, 'speaker': e['speaker'], 'lang': e['lang'], 'text': e['said'],
                                'heard': [takes[t]['asr'] for t in sorted(takes)]})
        continue
    m = takes[best]
    if not DRY:
        y = X.prep(f'{RAW}/{k}/{best}.wav', LUFS.get(e['speaker'], LUFS_DEFAULT))
        X.enc(y, f'{AUD}/{k}.mp3', (['-af', 'atempo=0.72'] if e.get('slow') else []) + ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k'])
        clips[k] = e['said']
        print('made', k, e['speaker'], best, e['said'], '| heard:', m['asr'], flush=True)
    rep['made'][k] = {'speaker': e['speaker'], 'lang': e['lang'], 'take': best, 'text': e['said'], 'asr': m['asr'], 'cer': m['cer'],
                      'cer_written': m['cer_written'], 'f0': m['median_f0'], 'sim': m['sim'], 'forced': k in force, 'engine': 'qwen'}
if not DRY:
    json.dump(dict(sorted(clips.items())), open(CLIPS, 'w'), ensure_ascii=False, indent=0)
    keys = sorted(f[:-4] for f in os.listdir(AUD) if f.endswith('.mp3'))
    json.dump(keys, open(f'{AUD}/index.json', 'w'))
os.makedirs(os.path.dirname(REPORT), exist_ok=True)
json.dump(rep, open(REPORT, 'w'), ensure_ascii=False, indent=1)
print('cached', len(rep['cached']), 'fallback', len(rep['fallback']))
for f in rep['fallback']:
    print('NOPASS', json.dumps(f, ensure_ascii=False))
