"""TV-size edit (~89 s) of the opening theme, by cutting and splicing only (no EQ or other processing).
Source: game/audio/music/opening.mp3 (left untouched). Output: game/audio/music/opening-tv.mp3 and art/opening/audio/tv_map.json
(segments and the edit's beat grid, mapped from the original's grid).
Structure: intro + verse 1 + chorus (orig 0-66.01) | verse 2 lines 1-2 (orig 75.63-88.42) | the chorus's last line
"世界が少し動き出す" (orig 56.42-66.01) | a 1.2 s tail faded out. Every splice is on a downbeat (bar line) and nudged to the
kick transient on both sides, with a 25 ms equal-power crossfade just before the attack.
Run: ~/ai/sd/venv/bin/python tools/opening/tv_edit.py"""
import os, json, subprocess
import numpy as np, librosa, soundfile as sf

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = os.path.join(ROOT, 'art', 'opening', 'audio')
A = json.load(open(os.path.join(D, 'analysis.json')))
SR = 44100
y, _ = librosa.load(os.path.join(D, 'opening.wav'), sr=SR, mono=False)  # (2, n)
mono = y.mean(0)
onset = librosa.onset.onset_strength(y=mono, sr=SR, hop_length=128)
ot = librosa.frames_to_time(np.arange(len(onset)), sr=SR, hop_length=128)


def snap(t, win=0.04):
    """The strongest onset within +-win of t (the kick/snare attack on the downbeat)."""
    m = (ot > t - win) & (ot < t + win)
    return float(ot[m][np.argmax(onset[m])]) if m.any() else t


SEGS = [(0.0, 66.01), (75.63, 88.42), (56.42, 66.01)]
TAIL = 1.2
XF = 0.025
PRE = 0.012  # splice this long before the attack


def build():
    # snapped boundaries: segment ends/starts at the attack of the downbeat
    segs = []
    for i, (a, b) in enumerate(SEGS):
        a2 = a if i == 0 else snap(a) - PRE
        b2 = snap(b) - PRE
        segs.append([a2, b2])
    segs[-1][1] += TAIL  # let the last bar's first beat ring, then fade
    out = np.zeros((2, 0), np.float32)
    edges = []
    for i, (a, b) in enumerate(segs):
        s0, s1 = int(a * SR), int(b * SR)
        n = int(XF * SR)
        seg = y[:, max(0, s0 - (n if i else 0)):s1].copy()
        if i == 0:
            out = seg
            continue
        # equal-power crossfade over n samples: outgoing tail (continuing past the cut) vs incoming head (starting before it)
        prev_end = int(segs[i - 1][1] * SR)
        tail = y[:, prev_end:prev_end + n]
        th = np.linspace(0, np.pi / 2, n)
        fade_out, fade_in = np.cos(th), np.sin(th)
        mixed = tail * fade_out + seg[:, :n] * fade_in
        edges.append(out.shape[1] / SR)
        out = np.concatenate([out, mixed, seg[:, n:]], axis=1)
    # final fade over the tail
    nt = int(TAIL * SR)
    out[:, -nt:] *= np.linspace(1, 0, nt) ** 1.5
    return out, segs, edges


if __name__ == '__main__':
    out, segs, edges = build()
    wav = os.path.join(D, 'opening-tv.wav')
    sf.write(wav, out.T, SR, subtype='PCM_24')
    mp3 = os.path.join(ROOT, 'game', 'audio', 'music', 'opening-tv.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '0', mp3], check=True)
    dur = out.shape[1] / SR
    # map the original beat grid into the edit
    beats, downs, off = [], [], 0.0
    for a, b in segs:
        for x in A['beats']:
            if a - 0.03 <= x < b - 0.03:
                beats.append(round(x - a + off, 3))
        for x in A['downbeats']:
            if a - 0.03 <= x < b - 0.03:
                downs.append(round(x - a + off, 3))
        off += b - a
    json.dump({'duration': round(dur, 3), 'segments': [[round(a, 4), round(b, 4)] for a, b in segs], 'splices': [round(e, 3) for e in edges],
               'beats': beats, 'downbeats': downs}, open(os.path.join(D, 'tv_map.json'), 'w'), indent=1)
    print('duration', round(dur, 2), 'segments', [[round(a, 3), round(b, 3)] for a, b in segs], 'splices at', [round(e, 3) for e in edges])
