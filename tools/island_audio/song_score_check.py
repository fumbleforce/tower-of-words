"""Cross-check the song timings against the score: YuE2 renders the (trimmed) ABC score it wrote, so the sung kana should start on the
score's vocal notes. For each take this finds the note onsets of the Vocal voice, fits one time offset, and reports how far each
Whisper-aligned kana start is from the nearest note onset. Adds `score_check` to ~/ai/island-audio/song/<take>/analysis.json.
Run: python3 tools/island_audio/song_score_check.py (CPU, instant)"""
import json, os, re, glob

W = os.path.expanduser('~/ai/island-audio/song')
NOTE = re.compile(r'(\"[^\"]*\")|([_=^]*[a-gA-G][,\']*|z|Z)(\d*)(/?\d*)(-?)|(\|)')


def vocal_onsets(abc):
    """Onsets (in 16th notes from the start) of the Vocal voice's notes, skipping tied continuations."""
    unit = 16
    m = re.search(r'L:1/(\d+)', abc)
    if m:
        unit = int(m.group(1))
    pos, onsets, voice, tie_prev = 0.0, [], None, False
    vpos = {'V': 0.0, 'I': 0.0}
    for line in abc.splitlines():
        if line.startswith('V: Vocal') or line.startswith('V:Vocal'):
            voice = 'V'; continue
        if line.startswith('V: Ins') or line.startswith('V:Ins'):
            voice = 'I'; continue
        if not voice or line.startswith(('%', 'X:', 'T:', 'M:', 'L:', 'Q:', 'K:')):
            continue
        for mm in NOTE.finditer(line):
            chord, sym, num, frac, tie, bar = mm.groups()
            if chord or bar:
                continue
            if sym == 'Z':
                vpos[voice] += 16 * (int(num) if num else 1) * (unit / 16)
                tie_prev = False
                continue
            d = float(num) if num else 1.0
            if frac:
                d = d / float(frac.strip('/') or 2)
            if voice == 'V' and sym != 'z' and not tie_prev:
                onsets.append(vpos['V'] * 16 / unit)
            if voice == 'V':
                tie_prev = bool(tie) and sym != 'z'
            vpos[voice] += d
    return onsets


def check(take):
    p = f'{W}/{take}/analysis.json'
    abcp = next((x for x in (f'{W}/raw/{take}.abc.edit.txt', f'{W}/raw/{take}.abc.txt') if os.path.exists(x)), None)
    if not abcp:
        return None
    r = json.load(open(p))
    abc = open(abcp).read()
    bpm = int(re.search(r'Q:1/4=(\d+)', abc).group(1))
    sixteenth = 60.0 / bpm / 4
    notes = [n * sixteenth for n in vocal_onsets(abc)]
    starts = [m['start'] for ln in r['lines'] if ln['found'] >= 0.5 for w in ln['words'] if not w.get('punct') for m in w['morae']]
    if not notes or not starts:
        return None
    best = None
    for k in range(-60, 61):
        off = k * 0.01
        ds = sorted(min(abs(s - (n + off)) for n in notes) for s in starts)
        med = ds[len(ds) // 2]
        if best is None or med < best[0]:
            best = (med, off, ds)
    med, off, ds = best
    # phrase level: score phrases start on a note after at least a beat of rest; compare with the aligned line starts
    on16 = vocal_onsets(abc)
    ph = [on16[0]] + [b for a, b in zip(on16, on16[1:]) if b - a >= 6]
    phr = [x * sixteenth + off for x in ph]
    lst = [ln['start'] for ln in r['lines'] if ln['found'] >= 0.5]
    dl = sorted(min(abs(s - q) for q in phr) for s in lst) if phr and lst else []
    import random
    rnd = random.Random(1)
    base = []
    for _ in range(200):
        fake = [rnd.uniform(min(lst), max(lst)) for _ in lst]
        base.append(sorted(min(abs(s - q) for q in phr) for s in fake)[len(fake) // 2])
    res = {'score': os.path.basename(abcp), 'bpm': bpm, 'vocal_notes': len(notes), 'kana_checked': len(starts), 'offset_s': round(off, 2),
           'median_ms': round(med * 1000), 'within_100ms': round(sum(d <= 0.1 for d in ds) / len(ds), 2),
           'within_200ms': round(sum(d <= 0.2 for d in ds) / len(ds), 2),
           'kana_baseline_ms': round(1000 * sorted(min(abs(x - n - off) for n in notes) for x in [min(starts) + (max(starts) - min(starts)) * i / 400 for i in range(400)])[200]),
           'score_phrases': len(phr), 'line_median_ms': round(1000 * dl[len(dl) // 2]) if dl else None,
           'line_within_250ms': round(sum(d <= 0.25 for d in dl) / len(dl), 2) if dl else None,
           'line_baseline_ms': round(1000 * sorted(base)[len(base) // 2]) if base else None}
    r['score_check'] = res
    json.dump(r, open(p, 'w'), ensure_ascii=False, indent=1)
    return res


if __name__ == '__main__':
    for p in sorted(glob.glob(f'{W}/*/analysis.json')):
        t = os.path.basename(os.path.dirname(p))
        print(t, check(t))
