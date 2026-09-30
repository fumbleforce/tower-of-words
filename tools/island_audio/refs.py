"""Clone references for the island slice voices.
Emi, Rei and the player: 8 to 15 s clips assembled from the old game's lines in legacy/game/audio/voice/ (MiniMax Japanese_CalmLady,
Japanese_ColdQueen, and the player's Qwen3-TTS design clone). Lines are picked for typical delivery: statements of 1.2 to 4.5 s whose
median pitch sits near the character's own median, none from tools/voice-flags.txt. Writes tools/voice-refs/<ch>-slice12.wav and
<ch>-slice12.txt (the transcript, for Qwen3-TTS), plus refs.json with the lines used.
Run: ~/ai/sd/venv/bin/python tools/island_audio/refs.py (CPU only)."""
import json, os, subprocess, sys
import numpy as np, librosa, soundfile as sf

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VOICE = f'{REPO}/legacy/game/audio/voice'
OUT = f'{REPO}/tools/voice-refs'
MAP = os.path.expanduser('~/ai/island-audio/refs/voice_map.json')
SR = 24000
TARGET = 12.0
GAP = 0.35


def load(p):
    y, _ = librosa.load(p, sr=SR, mono=True)
    idx = librosa.effects.split(y, top_db=38)
    return y[idx[0][0]:idx[-1][1]] if len(idx) else y


def med_pitch(y):
    f, _, _ = librosa.pyin(librosa.resample(y, orig_sr=SR, target_sr=16000), fmin=70, fmax=450, sr=16000, frame_length=1024)
    f = f[~np.isnan(f)]
    return float(np.median(f)) if len(f) else None


def build(ch, m, flagged):
    cands = []
    for k, (c, text) in m.items():
        if c != ch or k in flagged:
            continue
        if not text.endswith('。') or '（' in text or len(text) < 6:
            continue
        y = load(f'{VOICE}/{k}.mp3')
        d = len(y) / SR
        if 1.2 <= d <= 4.5:
            cands.append({'key': k, 'text': text, 'dur': round(d, 2), 'y': y})
    for c in cands:
        c['f0'] = med_pitch(c['y'])
    cands = [c for c in cands if c['f0']]
    med = float(np.median([c['f0'] for c in cands]))
    cands.sort(key=lambda c: abs(c['f0'] - med))
    pick, total = [], 0.0
    for c in cands:
        if total + c['dur'] > TARGET + 1.5:
            continue
        pick.append(c)
        total += c['dur'] + GAP
        if total >= TARGET:
            break
    pick.sort(key=lambda c: c['key'])  # stable order
    gap = np.zeros(int(GAP * SR), dtype=np.float32)
    y = np.concatenate([np.concatenate([c['y'], gap]) for c in pick])[:-len(gap)]
    sf.write(f'{OUT}/{ch}-slice12.wav', y, SR)
    text = ''.join(c['text'] for c in pick)
    open(f'{OUT}/{ch}-slice12.txt', 'w').write(text + '\n')
    return {'file': f'tools/voice-refs/{ch}-slice12.wav', 'seconds': round(len(y) / SR, 2), 'median_f0_all': round(med, 1),
            'text': text, 'lines': [{'key': c['key'], 'text': c['text'], 'dur': c['dur'], 'f0': round(c['f0'], 1)} for c in pick],
            'candidates': len(cands)}


if __name__ == '__main__':
    m = json.load(open(MAP))
    flagged = {l.split('\t')[0] for l in open(f'{REPO}/tools/voice-flags.txt') if l.strip()}
    res = {}
    for ch in sys.argv[1:] or ['emi', 'rei', 'player']:
        res[ch] = build(ch, m, flagged)
        print(ch, res[ch]['seconds'], 's', res[ch]['text'], flush=True)
    p = os.path.expanduser('~/ai/island-audio/refs/refs.json')
    old = json.load(open(p)) if os.path.exists(p) else {}
    old.update(res)
    json.dump(old, open(p, 'w'), ensure_ascii=False, indent=1)
