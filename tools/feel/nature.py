"""The outdoor places' birds and insects (game3d/js/creatures/, game3d/js/ambience.js). Offline and sample-free.
  bed_birds:   an autumn morning outside: a light wind, tree sparrows chirping round about (bursts of short chirps from
               several birds, near and far), now and then a brown-eared bulbul's loud "pii-yo" further off.
  bed_insects: an autumn evening: bell crickets (suzumushi, a clean "riiin" at about 4.5 kHz trilled 50 times a
               second), field crickets' "korokoro" trills, a faint dense chorus behind them and still night air.
  wings_flap:  a flock of pigeons taking off at once: a clatter of wing claps, fast at first, thinning out as they go.
Writes 48 kHz stereo WAV to ~/ai/feel-audio/synth/<name>.wav for tools/feel/build_audio.py.
Run: ~/ai/tts-bench/.venv/bin/python tools/feel/nature.py"""
import os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
OUT = os.path.expanduser('~/ai/feel-audio/synth')
rng = np.random.default_rng(7)


def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)


def put(buf, x, at, pan=0.0, gain=1.0):
    """Mix mono x into stereo buf at `at` seconds, equal-power pan -1..1."""
    i = int(at * SR)
    n = min(len(x), len(buf) - i)
    if n <= 0: return
    a = (pan + 1) * np.pi / 4
    buf[i:i + n, 0] += x[:n] * gain * np.cos(a)
    buf[i:i + n, 1] += x[:n] * gain * np.sin(a)


def distance(x, far):
    """Further away: quieter top end and a little smear."""
    return lp(x, 9000 - 6000 * far, 2) if far > 0 else x


def tone(freqs, env, harm=((1, 1.0), (2, 0.18))):
    """A tone following the frequency curve `freqs` (Hz per sample) with amplitude `env`."""
    ph = 2 * np.pi * np.cumsum(freqs) / SR
    return env * sum(a * np.sin(k * ph) for k, a in harm)


def chirp(dur=None):
    """One tree sparrow chirp: a quick rise and fall around 3.5 to 5 kHz."""
    dur = dur or rng.uniform(0.05, 0.11)
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    lo, hi = rng.uniform(3000, 3800), rng.uniform(4300, 5200)
    f = lo + (hi - lo) * np.sin(np.pi * np.clip(t * rng.uniform(0.9, 1.3), 0, 1)) ** 0.7
    a = int(0.008 * SR)  # a soft 8 ms start and a 6 ms tail, so there is no click
    env = np.exp(-t * rng.uniform(2.5, 5))
    env[:a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    env[-int(0.006 * SR):] *= np.linspace(1, 0, int(0.006 * SR))
    return tone(f, env, ((1, 1.0), (2, 0.25), (3, 0.05)))


def bulbul():
    """The brown-eared bulbul's loud two-part call, heard from a way off."""
    parts = []
    for lo, hi, d in ((2600, 3500, 0.32), (3400, 2300, 0.42)):
        n = int(d * SR)
        t = np.linspace(0, 1, n)
        f = lo + (hi - lo) * t ** 1.4 + 120 * np.sin(2 * np.pi * 18 * t * d)
        env = np.minimum(1, t * 12) * np.minimum(1, (1 - t) * 6)
        parts.append(tone(f, env, ((1, 1.0), (2, 0.3))))
        parts.append(np.zeros(int(0.06 * SR)))
    return np.concatenate(parts)


def wind(secs, level=0.05):
    n = int(secs * SR)
    w = lp(rng.standard_normal(n), 500, 2) + 0.3 * bp(rng.standard_normal(n), 600, 1800)
    t = np.arange(n) / SR
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * t / 11.0) * np.sin(2 * np.pi * t / 4.3 + 1)
    return level * w * swell / (np.abs(w).max() + 1e-9)


def bed_birds(secs=30):
    buf = np.zeros((int(secs * SR), 2))
    for ch in range(2): buf[:, ch] += wind(secs, 0.06)
    # five sparrows round about, each with its own place, pitch habit and distance
    for b in range(5):
        pan, far = rng.uniform(-0.9, 0.9), rng.uniform(0.0, 0.8)
        at = rng.uniform(0, 4)
        while at < secs - 1.5:
            for _ in range(rng.integers(2, 7)):
                put(buf, distance(chirp(), far), at, pan, 0.35 * (1 - 0.7 * far))
                at += rng.uniform(0.09, 0.22)
            at += rng.uniform(1.5, 6)
    for at in (5.5, 17.0, 26.0):
        put(buf, distance(bulbul(), 0.7), at + rng.uniform(-1, 1), rng.uniform(-0.8, 0.8), 0.12)
    return buf


def suzumushi(f0, secs):
    """A bell cricket's "riiin": a pure tone trilled ~50 times a second, half a second at a time."""
    n = int(secs * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    at = rng.uniform(0, 1.5)
    while at < secs - 1:
        d = rng.uniform(0.35, 0.7)
        i, m = int(at * SR), int(d * SR)
        tt = np.arange(m) / SR
        trill = (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(45, 55) * tt)) ** 2
        env = np.minimum(1, tt * 40) * np.minimum(1, (d - tt) * 25)
        f = f0 * (1 + 0.004 * np.sin(2 * np.pi * 3 * tt))
        out[i:i + m] += lp(tone(f, env * trill, ((1, 1.0), (2, 0.08))), 7000, 2)
        at += d + rng.uniform(0.6, 1.8)
    return out


def korogi(f0, secs):
    """A field cricket's "korokoro": runs of 3 to 6 soft pulses, then a pause."""
    n = int(secs * SR)
    out = np.zeros(n)
    at = rng.uniform(0, 1)
    pulse = int(0.018 * SR)
    pt = np.arange(pulse) / SR
    p = np.sin(2 * np.pi * f0 * pt) * np.sin(np.pi * pt / (pulse / SR)) ** 2
    while at < secs - 1:
        for _ in range(rng.integers(3, 7)):
            i = int(at * SR)
            if i + pulse < n: out[i:i + pulse] += p
            at += 0.034
        at += rng.uniform(0.25, 0.9)
    return out


def bed_insects(secs=30):
    buf = np.zeros((int(secs * SR), 2))
    air = lp(rng.standard_normal((int(secs * SR), 2)), 300, 2)
    buf += 0.015 * air / np.abs(air).max()
    # a faint far chorus: many crickets blurred together
    for k in range(10):
        put(buf, distance(korogi(rng.uniform(3900, 4700), secs), 0.85), 0, rng.uniform(-1, 1), 0.03)
    for k in range(3):
        put(buf, distance(suzumushi(rng.uniform(4300, 4800), secs), rng.uniform(0.1, 0.5)), 0, rng.uniform(-0.8, 0.8), 0.22)
    for k in range(3):
        put(buf, distance(korogi(rng.uniform(4000, 4500), secs), rng.uniform(0.2, 0.6)), 0, rng.uniform(-0.9, 0.9), 0.16)
    return buf


def wings_flap(secs=1.3):
    """Pigeons taking off: each bird a run of wing claps (about 9 a second, slowing), the flock overlapping."""
    buf = np.zeros((int(secs * SR), 2))
    for b in range(5):
        at, rate, g = rng.uniform(0, 0.25), rng.uniform(8.5, 11), rng.uniform(0.6, 1.0)
        pan = rng.uniform(-0.6, 0.6)
        k = 0
        while at < secs - 0.08:
            n = int(rng.uniform(0.02, 0.035) * SR)
            t = np.arange(n) / SR
            clap = bp(rng.standard_normal(n), 500, 4000) * np.exp(-t * 90)
            whoosh = bp(rng.standard_normal(int(0.07 * SR)), 300, 1500) * np.hanning(int(0.07 * SR)) * 0.25
            put(buf, clap, at, pan, g * 0.8 * np.exp(-k * 0.18))
            put(buf, whoosh, at + 0.02, pan, g * np.exp(-k * 0.2))
            k += 1
            at += 1 / rate * (1 + 0.06 * k)
    return buf


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in (('bed_birds', bed_birds), ('bed_insects', bed_insects), ('wings_flap', wings_flap)):
        y = fn()
        y /= np.abs(y).max() + 1e-9
        sf.write(f'{OUT}/{name}.wav', (0.9 * y).astype(np.float32), SR)
        print('wrote', f'{OUT}/{name}.wav', f'{len(y) / SR:.1f} s')
