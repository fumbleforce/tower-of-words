"""Offline synthesis of game3d's interface and magic sounds (no samples, no GPU): one family of soft mallet-on-metal
tones (vibraphone-like partials 1 : 4 : 10, a felt attack, a shared small-hall reverb), so every UI sound, the learned
moments and the kotodama sound like they belong together. Nothing square-wave or 8-bit: sines with real decays,
filtered noise for touch, and reverb.
Writes 48 kHz stereo WAV to ~/ai/feel-audio/synth/<name>.wav. tools/feel/build_audio.py levels and encodes them.
Run: ~/ai/tts-bench/.venv/bin/python tools/feel/synth.py"""
import os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
OUT = os.path.expanduser('~/ai/feel-audio/synth')
rng = np.random.default_rng(7)


def t_(d): return np.arange(int(d * SR)) / SR


def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)


def place(buf, x, at):
    i = int(at * SR); n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n]
    return buf


def attack(n, ms=2.5):
    a = np.ones(n); k = min(n, int(ms / 1000 * SR))
    a[:k] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, k))
    return a


def mallet(f0, dur=1.2, t60=1.0, parts=((1, 1.0, 1.0), (4.0, 0.22, 0.35), (10.0, 0.05, 0.15)), felt=0.04, soft=2.5):
    """A struck bar: partials (ratio, level, decay factor vs the fundamental), a felt thump, a soft attack."""
    t = t_(dur); x = np.zeros_like(t)
    for r, lv, dk in parts:
        f = f0 * r
        if f > SR * 0.45: continue
        tau = t60 * dk / 6.91
        x += lv * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    n = lp(rng.standard_normal(len(t)), 1800) * np.exp(-t / 0.004) * felt
    x = (x + n) * attack(len(t), soft)
    return x


def tock(f0, dur=0.3, t60=0.18, level=1.0):
    """A muted wooden tock (marimba-like ratios, very short)."""
    return level * mallet(f0, dur, t60, parts=((1, 1.0, 1.0), (3.93, 0.3, 0.3), (9.2, 0.06, 0.12)), felt=0.12, soft=1.5)


def make_ir(dur=1.6, t60_lo=1.3, t60_hi=0.55, seed=3):
    r = np.random.default_rng(seed); t = t_(dur); ir = np.zeros((len(t), 2))
    for c in range(2):
        n = r.standard_normal(len(t))
        lo = lp(n, 1800) * np.exp(-t * 6.91 / t60_lo)
        hi = hp(n, 1800) * np.exp(-t * 6.91 / t60_hi) * 0.6
        tail = (lo + hi) * np.clip(t / 0.012, 0, 1)
        for k in range(6):   # a few early reflections
            d = r.uniform(0.007, 0.045); i = int(d * SR); tail[i] += r.uniform(0.3, 0.7) * (1 if r.random() > 0.5 else -1) * 3
        ir[:, c] = tail
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


IR = make_ir()


def verb(x, wet=0.22, width=0.12, tail=1.2):
    """Mono dry in, stereo out: a little width from a tiny delay, plus the shared hall."""
    x = np.concatenate([x, np.zeros(int(tail * SR))])
    d = int(0.0006 * SR)
    st = np.stack([x, np.concatenate([np.zeros(d), x[:-d]]) * (1 - width) + x * width], 1)
    w = np.stack([fftconvolve(x, IR[:, c])[:len(x)] for c in range(2)], 1)
    return st * (1 - wet) + w * wet * 0.35


def trim(y, floor_db=-70):
    a = np.abs(y).max(1) if y.ndim == 2 else np.abs(y)
    lim = a.max() * 10 ** (floor_db / 20)
    idx = np.where(a > lim)[0]
    y = y[: idx[-1] + int(0.02 * SR)] if len(idx) else y
    k = min(len(y), int(0.03 * SR)); y[-k:] *= np.linspace(1, 0, k)[:, None] if y.ndim == 2 else np.linspace(1, 0, k)
    return y


NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
G5, A5, B5, C6, D6, E6, G6, C5, E5, E4, C4, G3, D5 = (NOTE(m) for m in (79, 81, 83, 84, 86, 88, 91, 72, 76, 64, 60, 55, 74))


def s_tap():
    # a soft click: a short band of noise and a small woody body, like tapping a phone case with a fingernail
    t = t_(0.08)
    n = bp(rng.standard_normal(len(t)), 900, 5000) * np.exp(-t / 0.0025) * 0.5
    body = np.sin(2 * np.pi * 1750 * t) * np.exp(-t / 0.012) * 0.35 + np.sin(2 * np.pi * 3100 * t) * np.exp(-t / 0.005) * 0.1
    return verb((n + body) * attack(len(t), 0.5), wet=0.08, tail=0.25)


def s_open():   # a panel or menu coming up: two soft taps, the second a touch higher
    y = np.zeros(int(0.2 * SR)); t = t_(0.08)
    for at, f in ((0, 1500), (0.045, 1900)):
        body = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.014) * 0.3 + bp(rng.standard_normal(len(t)), 900, 4000) * np.exp(-t / 0.002) * 0.3
        place(y, body * attack(len(t), 0.5), at)
    return verb(y, wet=0.1, tail=0.3)


def s_ok():
    y = np.zeros(int(0.9 * SR))
    place(y, mallet(A5, 0.8, 0.45) * 0.8, 0); place(y, mallet(E6, 0.8, 0.5) * 0.7, 0.075)
    return verb(y, wet=0.2)


def s_no():
    # a gentle "nope": two muted wooden tocks falling, never a buzzer
    y = np.zeros(int(0.6 * SR))
    place(y, tock(E4 * 2, 0.35, 0.16), 0); place(y, tock(C4 * 2, 0.4, 0.2), 0.12)
    return verb(y, wet=0.12, tail=0.5)


def s_nope():
    # a tap that can't be reached: one soft low tock, quieter than "no"
    return verb(tock(C4 * 2, 0.35, 0.14) * 0.8, wet=0.1, tail=0.4)


def s_word():
    # a word learned: a fifth on the mallet (G5 then D6) with a faint high sparkle, a warm tail
    y = np.zeros(int(1.8 * SR))
    place(y, mallet(G5, 1.6, 1.2) * 0.8, 0); place(y, mallet(D6, 1.6, 1.3) * 0.75, 0.085)
    place(y, mallet(G6 * 2, 0.6, 0.35, parts=((1, 1, 1),)) * 0.08, 0.15)
    return verb(y, wet=0.3, tail=1.4)


def s_command():
    # a command learned: the word sound grown up. A chord blooms note by note (G5 B5 D6 G6) over the kotodama's
    # low tone (G3), with a breath of air on top, so learning a command sounds related to using one.
    y = np.zeros(int(2.6 * SR)); t = t_(2.4)
    for i, (f, lv) in enumerate(((G5, 0.7), (B5, 0.6), (D6, 0.6), (G6, 0.5))):
        place(y, mallet(f, 2.0, 1.6) * lv, i * 0.065)
    env = np.minimum(1, t / 0.25) * np.exp(-np.maximum(0, t - 0.3) / 0.6)
    low = (np.sin(2 * np.pi * G3 * t) + 0.35 * np.sin(2 * np.pi * G3 * 1.5 * t + 1) + 0.2 * np.sin(2 * np.pi * G3 * 2.003 * t)) * env * 0.3
    air = bp(rng.standard_normal(len(t)), 3000, 8000) * np.minimum(1, t / 0.15) * np.exp(-t / 0.5) * 0.05
    place(y, low + air, 0)
    return verb(y, wet=0.35, tail=1.6)


def s_chime():
    # the train's door chime: three soft bell notes falling (G5 E5 C5), cut short by the kotodama when the doors freeze
    y = np.zeros(int(2.6 * SR))
    for i, f in enumerate((G5, E5, C5)): place(y, mallet(f, 1.6, 1.4, felt=0.02) * 0.7, i * 0.36)
    return verb(y, wet=0.25, tail=1.0)


def s_lift():
    # the lift's arrival tone: one clear bell note with a long tail
    y = mallet(A5, 2.2, 2.0, parts=((1, 1, 1), (2.0, 0.12, 0.5), (4.0, 0.15, 0.3), (10.0, 0.03, 0.1)), felt=0.02)
    return verb(y * 0.8, wet=0.28, tail=1.2)


def s_beep():
    # a card reader: a short piezo tone (slightly rich, like a real reader), soft edges
    t = t_(0.11); f = 2730
    x = (np.sin(2 * np.pi * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)) * attack(len(t), 3)
    k = int(0.006 * SR); x[-k:] *= np.linspace(1, 0, k)
    return verb(x * 0.5, wet=0.1, tail=0.3)


def s_kotodama():
    # a word taking hold (about 3 s): a soft low impact as the lights dip, a low tone that swells and sinks (G2/D3
    # with slow beating), glassy partials that shimmer and fade, a faint air rush, and the lights' hum under it.
    D = 3.4; t = t_(D); y = np.zeros(int((D + 0.2) * SR))
    # impact
    imp = lp(rng.standard_normal(int(0.3 * SR)), 180) * np.exp(-t_(0.3) / 0.05) * 0.9
    tt = t_(0.3); imp += np.sin(2 * np.pi * (70 * np.exp(-tt * 3)) * tt) * np.exp(-tt / 0.12) * 0.6
    place(y, imp, 0)
    # low tone
    glide = np.exp(-t * np.log(98 / 82) / 2.4 * (t < 2.4) - np.log(98 / 82) * (t >= 2.4))
    ph = lambda f0, det=1.0: 2 * np.pi * np.cumsum(f0 * det * glide) / SR
    env = np.clip(t / 0.35, 0, 1) ** 1.5 * np.where(t < 1.2, 1, np.exp(-(t - 1.2) / 0.55))
    low = (np.sin(ph(98)) + 0.8 * np.sin(ph(98, 1.005)) + 0.55 * np.sin(ph(147)) + 0.3 * np.sin(ph(196, 0.998))) * env
    low = np.tanh(low * 0.9) * 0.45
    # glass shimmer: inharmonic partials with their own tremolo
    sh = np.zeros_like(t)
    for f in (1210, 1637, 2291, 2903, 3517, 4402):
        tr = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(4, 9) * t + rng.uniform(0, 6))
        sh += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * tr * rng.uniform(0.5, 1)
    sh *= np.clip(t / 0.08, 0, 1) * np.exp(-t / 0.7) * 0.035
    air = bp(rng.standard_normal(len(t)), 2500, 7000) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.45) * 0.06
    # the lights' hum: 50 Hz rich tone, low-passed, wobbling
    hum = sum(np.sin(2 * np.pi * 50 * k * t) / k for k in range(1, 8))
    hum = lp(hum, 260) * (1 + 0.4 * np.sin(2 * np.pi * 7 * t)) * np.clip(t / 0.15, 0, 1) * np.where(t < 1.6, 1, np.clip(1 - (t - 1.6) / 0.6, 0, 1)) * 0.06
    place(y, low + sh + air + hum, 0)
    return verb(y, wet=0.4, width=0.25, tail=1.8)


def s_clack(v):
    # a monorail over a beam joint: the front tyre, then the back one, two dull knocks with a faint tick
    r = np.random.default_rng(40 + v)
    def knock(level, hz):
        tt = t_(0.25)
        n = lp(r.standard_normal(len(tt)), 320) * np.exp(-tt / 0.03) * level
        o = np.sin(2 * np.pi * np.cumsum(hz * (1 + 0.6 * np.exp(-tt / 0.02))) / SR) * np.exp(-tt / 0.06) * level * 1.1
        tick = bp(r.standard_normal(len(tt)), 1200, 2400) * np.exp(-tt / 0.004) * level * 0.08
        return n + o + tick
    y = np.zeros(int(0.7 * SR))
    place(y, knock(1.0, 58 + v * 3), 0); place(y, knock(0.75, 52 + v * 2), 0.12 + v * 0.01)
    return verb(y, wet=0.06, tail=0.3)


def s_bond():
    # someone likes him a little more: a low warm third (C5 then E5), softer and rounder than the word sound
    y = np.zeros(int(1.4 * SR))
    place(y, mallet(C5, 1.3, 1.0, felt=0.02, soft=6) * 0.7, 0); place(y, mallet(E5, 1.3, 1.1, felt=0.02, soft=6) * 0.6, 0.11)
    return verb(y, wet=0.3, tail=1.0)


def slide(d, f0, f1, rumble=True, thud=True, seed=11):
    # a sliding door: a band of noise that sweeps (the leaf on its runner), a slow rolling rumble, and a soft stop
    r = np.random.default_rng(seed); t = t_(d)
    n = r.standard_normal(len(t))
    fc = f0 * (f1 / f0) ** (t / d)
    # sweep by blending a few fixed band-passes along the path
    bands = np.geomspace(min(f0, f1), max(f0, f1), 6); x = np.zeros_like(t)
    for fb in bands:
        w = np.exp(-(np.log(fc / fb) ** 2) / 0.08)
        x += bp(n, fb / 1.4, fb * 1.4) * w
    env = np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.12, 0, 1)
    x *= env * 0.5
    if rumble:
        rm = lp(r.standard_normal(len(t)), 120) * (1 + 0.5 * np.sin(2 * np.pi * 9 * t)) * env * 0.9
        x += rm
    y = np.zeros(int((d + 0.4) * SR)); place(y, x, 0)
    if thud:
        tt = t_(0.3); th = lp(r.standard_normal(len(tt)), 250) * np.exp(-tt / 0.04) + np.sin(2 * np.pi * 75 * tt) * np.exp(-tt / 0.07) * 0.8
        place(y, th * 0.8, d - 0.05)
    return y


def s_door(): return verb(slide(0.6, 900, 300), wet=0.12, tail=0.5)
def s_doorslow(): return verb(slide(3.1, 500, 380, thud=False, seed=12) * 0.8, wet=0.12, tail=0.5)


def pink(n, r):
    # pink-ish noise (Voss-McCartney-like by filtering white noise with a few first-order sections)
    w = r.standard_normal(n)
    return lp(w, 80, 1) * 6 + lp(w, 400, 1) * 2.2 + lp(w, 2000, 1) * 1.0 + w * 0.3


def stereo(fn, d, seed):
    return np.stack([fn(d, np.random.default_rng(seed)), fn(d, np.random.default_rng(seed + 1))], 1)


def bed_train(d, r):
    # a running monorail: low rumble, a motor whine that drifts, air rushing past
    t = t_(d); n = len(t)
    rum = lp(r.standard_normal(n), 160, 2) * 3 * (1 + 0.15 * np.sin(2 * np.pi * 0.23 * t))
    whine_f = 310 * (1 + 0.01 * np.sin(2 * np.pi * 0.07 * t))
    whine = (np.sin(2 * np.pi * np.cumsum(whine_f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(whine_f * 2.01) / SR)) * 0.012
    air = bp(r.standard_normal(n), 350, 1800) * 0.25 * (1 + 0.25 * lp(r.standard_normal(n), 0.5, 1) * 40)
    return rum + whine + air


def bed_office(d, r):
    # air conditioning: a broad soft hiss, a low duct hum, a faint fan tone
    t = t_(d); n = len(t)
    hiss = lp(pink(n, r), 1400, 2) * 0.12
    hum = (np.sin(2 * np.pi * 100 * t) * 0.02 + np.sin(2 * np.pi * 200 * t) * 0.006) * (1 + 0.1 * np.sin(2 * np.pi * 0.11 * t))
    fan = np.sin(2 * np.pi * 243 * t + 2 * np.sin(2 * np.pi * 0.3 * t)) * 0.003
    return hiss + hum + fan


def bed_lift(d, r):
    t = t_(d); n = len(t)
    hum = sum(np.sin(2 * np.pi * 90 * k * t) / k ** 1.5 for k in range(1, 5)) * 0.05
    air = bp(r.standard_normal(n), 150, 900) * 0.2 * (1 + 0.3 * np.sin(2 * np.pi * 0.4 * t))
    return hum + air + lp(r.standard_normal(n), 60) * 1.2


def bed_station(d, r):
    # open air: wind in slow gusts, a distant city hum
    t = t_(d); n = len(t)
    gust = 0.6 + 0.4 * np.clip(lp(r.standard_normal(n), 0.3, 1) * 60, -1, 1)
    wind = bp(r.standard_normal(n), 200, 1200) * 0.18 * gust
    city = lp(pink(n, r), 300, 2) * 0.1
    return wind + city


def bed_lobby(d, r):
    # placeholder until a Stable Audio murmur is picked: air handling in a big stone hall, with a long reverb
    t = t_(d); n = len(t)
    return lp(pink(n, r), 900, 2) * 0.1 + np.sin(2 * np.pi * 60 * t) * 0.004


def s_phone_far():
    # a desk phone ringing twice across the room: an electronic trill, muffled and far
    y = np.zeros(int(4.4 * SR)); t = t_(1.0)
    ring = np.sin(2 * np.pi * np.where(np.sin(2 * np.pi * 16 * t) > 0, 1320, 1580) * t)
    ring = lp(ring, 2400, 2) * np.clip(t / 0.02, 0, 1) * np.clip((1.0 - t) / 0.03, 0, 1) * 0.3
    place(y, ring, 0); place(y, ring, 2.0)
    return verb(lp(y, 1800), wet=0.7, width=0.3, tail=1.2)


def s_typing():
    # a few seconds of typing at a desk nearby: soft plastic key clicks in bursts
    r = np.random.default_rng(21); y = np.zeros(int(4.5 * SR)); tt = t_(0.05); at = 0.05
    while at < 4.0:
        k = bp(r.standard_normal(len(tt)), 1500, 5000) * np.exp(-tt / 0.006) * r.uniform(0.3, 0.6)
        k += np.sin(2 * np.pi * r.uniform(600, 900) * tt) * np.exp(-tt / 0.01) * 0.1
        place(y, k, at)
        at += r.uniform(0.08, 0.2) if r.random() > 0.12 else r.uniform(0.35, 0.8)
    return verb(y, wet=0.3, width=0.3, tail=0.6)


def bedfile(fn, d=30, seed=5):
    def f():
        y = stereo(fn, d, seed)
        return y / np.abs(y).max() * 0.5
    return f


SOUNDS = {'bond': s_bond, 'phone_far': s_phone_far, 'typing': s_typing,
          'bed_train': bedfile(bed_train), 'bed_office': bedfile(bed_office), 'bed_lift': bedfile(bed_lift, 12),
          'bed_station': bedfile(bed_station), 'bed_lobby': bedfile(bed_lobby), 'door': s_door, 'doorslow': s_doorslow,'tap': s_tap, 'open': s_open, 'ok': s_ok, 'no': s_no, 'nope': s_nope, 'word': s_word, 'command': s_command,
          'chime': s_chime, 'lift': s_lift, 'beep': s_beep, 'kotodama': s_kotodama,
          'clack-1': lambda: s_clack(0), 'clack-2': lambda: s_clack(1), 'clack-3': lambda: s_clack(2)}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SOUNDS.items():
        y = trim(fn()); y = y / max(1e-9, np.abs(y).max()) * 0.9
        sf.write(f'{OUT}/{name}.wav', y.astype(np.float32), SR, subtype='FLOAT')
        print(name, f'{len(y) / SR:.2f}s')
