"""Two men humming in the dorm's sento, heard from the courtyard (the evening bath discovery, dorm_court `bath`).
Offline and sample-free: a sung voice made from harmonics under moving formants (a hum that opens a little on each
note), pitch that scoops, wobbles and drifts, a tiled bath's reverb, then muffled by the entrance curtain.
The tune is the monorail's door chime (tools/feel/synth.py s_chime: G E C, falling), two octaves down.
  bath_first:  the first man hums it twice and starts a third time, then stops before the last note.
  bath_answer: another man, lower and louder, finishes it: the last note from well under, too long, then an extra
               climb he can't reach that cracks.
Writes 48 kHz stereo WAV to ~/ai/feel-audio/synth/<name>.wav for tools/feel/build_audio.py.
Run: ~/ai/tts-bench/.venv/bin/python tools/feel/hum.py"""
import os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
OUT = os.path.expanduser('~/ai/feel-audio/synth')


def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)


def smooth(x, ms):
    """One-pole smoothing forward and back (no lag): portamento for pitch, soft edges for loudness."""
    a = np.exp(-1 / (ms / 1000 * SR))
    y = sosfilt(np.array([[1 - a, 0, 0, 1, -a, 0]]), x)
    return sosfilt(np.array([[1 - a, 0, 0, 1, -a, 0]]), y[::-1])[::-1]


def wander(r, n, ms):
    """Slow random movement with unit spread."""
    w = smooth(r.standard_normal(n), ms)
    return w / (w.std() + 1e-12)


G, E, C = 55, 52, 48  # G3 E3 C3: the chime's G5 E5 C5, two octaves down


def sing(notes, dur, *, seed, formants, tilt=1.5, vib=(5.2, 22), jitter=6, open_=0.35, glide=45, breath=0.05):
    """notes: (start s, length s, midi, cents off, scoop cents, loudness, crack s or None).
    formants: [(Hz, bandwidth Hz, gain)] of the open vowel; the closed hum keeps only a low nasal one."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    midi = np.full(n, np.nan)
    amp = np.zeros(n)
    opening = np.zeros(n)
    for (at, ln, m, cents, scoop, loud, crack) in notes:
        a, b = int(at * SR), min(n, int((at + ln) * SR))
        k = np.arange(b - a) / SR
        # the note starts under (a scoop up into it) and settles off-pitch by `cents`
        cur = m + cents / 100 - (scoop / 100) * np.exp(-k / 0.09)
        if crack is not None:  # the voice breaks: jumps up most of an octave for a moment, then falls back flat
            c0 = int(crack * SR)
            c = (k * SR >= c0) & (k * SR < c0 + int(0.16 * SR))
            cur = cur + np.where(c, 10.5, 0.0) + np.where(k * SR >= c0 + int(0.16 * SR), -0.55, 0.0)
        midi[a:b] = cur
        env = np.minimum(1, k / 0.07) * np.minimum(1, (ln - k) / 0.1)
        amp[a:b] = np.maximum(amp[a:b], np.clip(env, 0, 1) * loud)
        # "hm": closed at the onset, opening to the vowel over 150 ms, closing a little again at the end
        opening[a:b] = np.clip(k / 0.15, 0, 1) * np.clip((ln - k) / 0.2, 0.3, 1) * open_
    # hold the last pitch through the gaps so the glide between notes is a slide, not a jump from nothing
    idx = np.where(~np.isnan(midi), np.arange(n), 0)
    np.maximum.accumulate(idx, out=idx)
    midi = midi[idx]
    midi[np.isnan(midi)] = notes[0][2]
    midi = smooth(midi, glide)
    # a wobbly, uneven vibrato that comes in late in long notes, and slow drift
    vr, vd = vib
    rate = vr * (1 + 0.12 * wander(r, n, 180))
    ph = np.cumsum(2 * np.pi * rate / SR)
    depth = vd / 100 * np.clip(smooth((amp > 0.05).astype(float), 250) * 1.4 - 0.3, 0, 1)
    midi = midi + depth * np.sin(ph) + (jitter / 100) * wander(r, n, 40) + 0.08 * wander(r, n, 400)
    f0 = 440 * 2 ** ((midi - 69) / 12)
    amp = smooth(amp, 25) * (1 + 0.05 * wander(r, n, 20))
    opening = smooth(opening, 30)
    # harmonics under the formant envelope, computed on 5 ms frames and interpolated
    hop = int(0.005 * SR)
    fr = np.arange(0, n, hop)
    y = np.zeros(n)
    phase0 = np.cumsum(2 * np.pi * f0 / SR)
    nh = int(5200 / f0.min())
    for h in range(1, nh + 1):
        fh = f0[fr] * h
        o = opening[fr]
        env = np.zeros_like(fh)
        # the closed hum: one low nasal resonance, the rest damped
        env += (1 - o) * 1.0 / (1 + ((fh - 260) / 70) ** 2)
        for (F, B, g) in formants:
            env += o * g / (1 + ((fh - F) / (B / 2)) ** 2)
        env += 0.02  # a little of everything leaks
        env *= h ** -tilt * (fh < 5000)
        a = np.interp(np.arange(n), fr, env)
        y += a * np.sin(h * phase0 + r.uniform(0, 6.28))
    y *= amp
    y += bp(r.standard_normal(n), 900, 4000) * smooth(amp * opening, 20) * breath
    return y / (np.abs(y).max() + 1e-9)


def breaths(y, times, level, seed):
    """A short in-breath before a phrase: soft, airy noise swelling and cut off."""
    r = np.random.default_rng(seed)
    d = int(0.28 * SR)
    k = np.arange(d) / d
    for at in times:
        b = bp(r.standard_normal(d), 1400, 5200) * np.sin(np.pi * k) ** 2 * k * level
        i = max(0, int(at * SR) - d)
        y[i:i + d] += b[: len(y) - i]
    return y


def bath_ir(dur=2.2, t60=1.7, seed=5):
    """A small tiled room: dense early reflections, a long bright tail."""
    r = np.random.default_rng(seed)
    t = np.arange(int(dur * SR)) / SR
    ir = np.zeros((len(t), 2))
    for c in range(2):
        tail = r.standard_normal(len(t)) * np.exp(-t * 6.91 / t60)
        tail = lp(tail, 6000) * np.clip(t / 0.008, 0, 1)
        for _ in range(14):
            i = int(r.uniform(0.003, 0.03) * SR)
            tail[i] += r.uniform(1.5, 4) * (1 if r.random() > 0.5 else -1)
        ir[:, c] = tail
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def in_the_bath(x, wet=0.55):
    """Inside the bath house, heard from the courtyard through the doorway and its curtain."""
    ir = bath_ir()
    x = np.concatenate([x, np.zeros(int(2.0 * SR))])
    w = np.stack([fftconvolve(x, ir[:, c])[:len(x)] for c in range(2)], 1)
    dry = np.stack([x, x], 1)
    y = dry * (1 - wet) + w * wet * 0.3
    for c in range(2):
        y[:, c] = lp(hp(y[:, c], 140), 3200)  # through the noren: the top and the bottom go
    return y


# the first man: a light baritone, pleasantly out of tune (a little flat, lazy scoops)
MAN_A = [(520, 110, 1.0), (1150, 150, 0.45), (2450, 220, 0.12)]
# the second: lower and chestier, more vowel, more confidence than pitch
MAN_B = [(470, 120, 1.0), (980, 140, 0.55), (2250, 240, 0.1)]


def bath_first():
    notes = []
    at = 0.2
    for phrase in range(3):
        for i, m in enumerate((G, E, C)):
            if phrase == 2 and i == 2:
                break  # he stops before the last note
            ln = 0.42 if i < 2 else 0.85
            notes.append((at, ln, m, -25 - 10 * phrase, 70, 0.9 - 0.1 * i, None))
            at += ln + 0.06
        at += 0.35
    y = sing(notes, at + 0.3, seed=11, formants=MAN_A, open_=0.35, vib=(5.3, 25))
    starts = [a for (a, *_), i in zip(notes, range(len(notes))) if i % 3 == 0]
    return in_the_bath(breaths(y, starts, 0.25, 12))


def bath_answer():
    # the last note from well under (he finds it late and holds it too long), then a climb (E, G, high C) that
    # doesn't make the top: it cracks and falls flat
    notes = [
        (0.15, 1.5, C, -85, 160, 1.0, None),
        (1.8, 0.34, E, -60, 90, 0.9, None),
        (2.2, 0.34, G, -95, 120, 0.95, None),
        (2.6, 1.1, C + 12, -140, 180, 1.0, 0.22),
    ]
    y = sing(notes, 3.9, seed=23, formants=MAN_B, tilt=1.3, open_=0.6, vib=(4.4, 55), jitter=12, glide=70, breath=0.08)
    return in_the_bath(breaths(y, [0.15, 1.8], 0.35, 24))


SOUNDS = {'bath_first': bath_first, 'bath_answer': bath_answer}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SOUNDS.items():
        y = fn()
        a = np.abs(y).max(1)
        idx = np.where(a > a.max() * 10 ** (-60 / 20))[0]
        y = y[: idx[-1] + int(0.02 * SR)]
        k = int(0.03 * SR)
        y[-k:] *= np.linspace(1, 0, k)[:, None]
        y = y / np.abs(y).max() * 0.9
        sf.write(f'{OUT}/{name}.wav', y.astype(np.float32), SR, subtype='FLOAT')
        print(name, f'{len(y) / SR:.2f}s')
