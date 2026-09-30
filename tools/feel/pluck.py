"""The train passengers' small sounds (game3d/js/train/discoveries.js). Offline and sample-free.
  guitar_practice: a clean electric guitar played by someone still learning it, as it comes out of a phone speaker or
                   a lifted headphone (thin, no low end): a C arpeggio, an A minor one that fumbles a note and stops,
                   then the A minor again, slower and careful. Plucked strings by Karplus-Strong. The note times are
                   printed; the video in train/screen-scenes.js strums on them (NOTES there).
  zip:             a bag's zip pulled shut in one go, the teeth clicking faster as it runs.
  buzz:            a phone vibrating twice against a lap, muffled by cloth.
Writes 48 kHz stereo WAV to ~/ai/feel-audio/synth/<name>.wav for tools/feel/build_audio.py.
Run: ~/ai/tts-bench/.venv/bin/python tools/feel/pluck.py"""
import os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, lfilter, fftconvolve

SR = 48000
OUT = os.path.expanduser('~/ai/feel-audio/synth')


def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def hz(m): return 440 * 2 ** ((m - 69) / 12)


def place(buf, x, at):
    i = int(at * SR)
    n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n]


def string(f0, dur=2.2, loss=0.996, bright=0.55, pos=0.2, seed=0, dead=False):
    """A plucked string: a filtered noise burst through a tuned feedback comb (Karplus-Strong), with the pluck position
    comb on the excitation. `dead` damps it at once (a fret not pressed hard enough: a short buzz, no pitch)."""
    r = np.random.default_rng(seed)
    n0 = max(2, int(round(SR / f0 - 0.5)))  # the two-tap average in the loop adds half a sample of delay
    burst = lp(r.uniform(-1, 1, n0), 1200 + 3000 * bright, 2)
    k = max(1, int(pos * n0))
    burst[k:] -= burst[:-k] * 0.8
    x = np.zeros(int(dur * SR))
    x[:n0] = burst
    g = loss if not dead else 0.93
    a = np.zeros(n0 + 2)
    a[0] = 1
    a[n0] = a[n0 + 1] = -g * 0.5
    y = lfilter([1.0], a, x)
    env = np.exp(-np.arange(len(y)) / SR / (0.035 if dead else 1.4))
    y *= env
    if dead: y = hp(y + r.standard_normal(len(y)) * np.exp(-np.arange(len(y)) / SR / 0.02) * 0.2, 400)
    return y / (np.abs(y).max() + 1e-9)


def small_room(x, wet=0.12, seed=4):
    r = np.random.default_rng(seed)
    n = int(0.35 * SR)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR / 0.07)
    ir = lp(ir, 5000)
    ir /= np.abs(ir).sum() ** 0.5
    return x * (1 - wet) + fftconvolve(x, ir)[:len(x)] * wet


def s_guitar():
    r = np.random.default_rng(7)
    # (midi, beat gap before it, level, dead?)
    c_arp = [48, 55, 60, 64, 67, 64]
    a_arp = [45, 52, 57, 60]
    seq = []
    t = 0.15
    for i, m in enumerate(c_arp):
        seq.append((t, m, 0.9 if i else 1.0, False))
        t += 0.27 + r.uniform(-0.03, 0.04)
    t += 0.08
    for m in a_arp:
        seq.append((t, m, 0.85, False))
        t += 0.25 + r.uniform(-0.02, 0.05)
    seq.append((t, 65, 0.9, True))  # the E4 comes out dead: a buzzed fret
    t += 0.75  # she stops, finds the fret again
    for i, m in enumerate(a_arp + [64]):
        seq.append((t, m, 0.8, False))
        t += 0.34 + r.uniform(-0.02, 0.03)
    dur = t + 1.2
    y = np.zeros(int(dur * SR))
    for i, (at, m, lvl, dead) in enumerate(seq):
        place(y, string(hz(m), bright=0.45 + 0.2 * lvl, seed=10 + i, dead=dead) * lvl * (0.7 if dead else 1), at)
    # a clean amp, then the small speaker (no lows, no air) and a little of the room it was recorded in
    y = np.tanh(y * 1.4) / 1.4
    y = small_room(y)
    y = lp(hp(y, 380, 2), 3800, 2)
    y = np.stack([y, y], 1)
    print('guitar_practice notes (s):', ', '.join(f'{a:.2f}' for a, *_ in seq))
    print('dead note at', f'{[a for a, m, l, d in seq if d][0]:.2f}', 'length', f'{dur:.2f}')
    return y / np.abs(y).max() * 0.7


def s_zip():
    r = np.random.default_rng(3)
    dur = 1.0
    y = np.zeros(int(dur * SR))
    tt = np.arange(int(0.012 * SR)) / SR
    at, rate = 0.03, 38.0
    while at < 0.78:
        click = bp(r.standard_normal(len(tt)), 2200, 7000) * np.exp(-tt / 0.0022) * r.uniform(0.5, 0.9)
        place(y, click, at)
        at += 1 / rate + r.uniform(-0.002, 0.002)
        rate = min(95.0, rate * 1.035)
    # the slider's scrape under the teeth, and the tick as it reaches the end
    scrape = bp(r.standard_normal(len(y)), 1200, 4000) * 0.06
    env = np.clip(np.arange(len(y)) / SR / 0.05, 0, 1) * np.clip((0.8 - np.arange(len(y)) / SR) / 0.04, 0, 1)
    y += scrape * env
    tick = bp(r.standard_normal(len(tt) * 2), 900, 5000) * np.exp(-np.arange(len(tt) * 2) / SR / 0.004)
    place(y, tick * 1.2, 0.8)
    y = np.stack([y, y], 1)
    return y / np.abs(y).max() * 0.6


def s_buzz():
    t = np.arange(int(1.0 * SR)) / SR
    motor = sum(np.sin(2 * np.pi * 165 * k * t + k) / k ** 1.3 for k in range(1, 7))
    rattle = np.sign(np.sin(2 * np.pi * 165 * t)) * 0.25
    gate = ((t > 0.02) & (t < 0.38)) | ((t > 0.52) & (t < 0.88))
    env = lp(gate.astype(float), 40, 1)
    y = lp((motor + rattle) * env, 1300, 2)
    y = np.stack([y, y], 1)
    return y / np.abs(y).max() * 0.6


SOUNDS = {'guitar_practice': s_guitar, 'zip': s_zip, 'buzz': s_buzz}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SOUNDS.items():
        sf.write(f'{OUT}/{name}.wav', fn().astype(np.float32), SR, subtype='FLOAT')
        print('wrote', name)
