"""Level and encode game3d's effects and ambience beds.
Sources: tools/feel/synth.py output (~/ai/feel-audio/synth/*.wav) and picked Stable Audio takes (~/ai/feel-audio/raw/, PICKS below).
Every file is levelled to the loudness it should have in the game (TARGET, LUFS), so the engine plays them at gain 1:
  beds: integrated loudness; one-shots: the loudest 400 ms window (momentary max), which is fair to short sounds.
Beds get a 3 s equal-power crossfade from their end into their start, so they loop without a seam even as a plain loop.
Writes game3d/audio/sfx/<name>.mp3, game3d/audio/amb/<name>.mp3 and game3d/audio/sfx/levels.json (targets, measured
loudness of the encoded MP3 by ffmpeg's EBU R128 meter, peak).
Run: ~/ai/tts-bench/.venv/bin/python tools/feel/build_audio.py"""
import os, json, subprocess, re, sys
import numpy as np, soundfile as sf, pyloudnorm as pyln, librosa

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SYN = os.path.expanduser('~/ai/feel-audio/synth')
RAW = os.path.expanduser('~/ai/feel-audio/raw')
SFX = f'{REPO}/game3d/audio/sfx'
AMB = f'{REPO}/game3d/audio/amb'
SR = 44100

# In-game loudness (LUFS). Reference points: voices about -20 (Mio -17 at 0.75 gain), music -20.5 in the file at
# bus gain 0.2, so about -34.5 in the game (-42 under a voice).
TARGET = {
    # interface: quiet, clearly under the voices
    'tap': -33, 'open': -33, 'nope': -33, 'ok': -29, 'no': -29,
    # moments
    'word': -25, 'command': -23, 'bond': -27, 'kotodama': -22,
    # world events
    'chime': -27, 'lift': -28, 'beep': -30, 'clack-1': -31, 'clack-2': -31, 'clack-3': -31,
    'door': -29, 'doorslow': -30, 'train_doors': -28, 'glass_doors': -29, 'lift_doors': -29, 'brake': -29,
    'flap_open': -30, 'copier_run': -30, 'kettle_pour': -31, 'vending': -29,
    # distant one-shots scattered over the beds
    'printer': -39, 'phone_far': -40, 'typing': -40,
    # beds (under the music: -34.5)
    'bed_train': -35, 'bed_station': -38, 'bed_lobby': -36, 'bed_office': -39, 'bed_lift': -36,
}
BEDS = {k for k in TARGET if k.startswith('bed_')}
# picked Stable Audio takes: name -> (raw file stem, start s, end s or None). Filled in after listening to the
# spectrograms and scores; anything not here comes from synth.py.
PICKS = json.load(open(os.path.join(os.path.dirname(__file__), 'picks.json'))) if os.path.exists(os.path.join(os.path.dirname(__file__), 'picks.json')) else {}


def momentary_max(y, sr):
    m = pyln.Meter(sr, block_size=0.4)
    if len(y) < int(0.6 * sr): y = np.concatenate([y, np.zeros((int(0.6 * sr) - len(y), y.shape[1]))])
    hop = int(0.05 * sr); w = int(0.4 * sr); best = -120
    for i in range(0, len(y) - w + 1, hop):
        seg = y[i:i + w]
        if np.abs(seg).max() < 1e-6: continue
        try: best = max(best, m.integrated_loudness(seg))
        except Exception: pass
    return best


def loop_it(y, sr, x=3.0):
    n = int(x * sr); a = y[:-n] if len(y) > 2 * n else y
    if len(y) <= 2 * n: return y
    head, tail = y[:n], y[-n:]
    th = np.linspace(0, np.pi / 2, n)[:, None]
    mixed = tail * np.cos(th) + head * np.sin(th)
    return np.concatenate([mixed, y[n:-n]])


def ebur(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', out); P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', out)
    M = [float(v) for v in re.findall(r' M:\s*(-?[\d.]+)', out)]
    return (float(I[-1]) if I else None), (max(M) if M else None), (float(P[-1]) if P else None)


def load(name):
    if name in PICKS:
        stem, a, b = PICKS[name]
        y, sr = sf.read(f'{RAW}/{stem}.flac', always_2d=True)
        y = y[int(a * sr): int(b * sr) if b else None]
        src = f'Stable Audio 3 Medium, local ({stem}, {a}-{b or "end"} s)'
    else:
        p = f'{SYN}/{name}.wav'
        if not os.path.exists(p): return None, None, None
        y, sr = sf.read(p, always_2d=True); src = 'synthesised (tools/feel/synth.py)'
    if y.shape[1] == 1: y = np.repeat(y, 2, 1)
    if sr != SR: y = librosa.resample(y.T, orig_sr=sr, target_sr=SR).T; sr = SR
    return y, sr, src


if __name__ == '__main__':
    os.makedirs(SFX, exist_ok=True); os.makedirs(AMB, exist_ok=True)
    only = set(sys.argv[1:])
    levels = json.load(open(f'{SFX}/levels.json')) if os.path.exists(f'{SFX}/levels.json') else {}
    for name, tgt in TARGET.items():
        if only and name not in only: continue
        y, sr, src = load(name)
        if y is None: print('missing', name); continue
        bed = name in BEDS
        if bed:
            k = int(0.02 * sr); y[:k] *= np.linspace(0, 1, k)[:, None]; y[-k:] *= np.linspace(1, 0, k)[:, None]
            y = loop_it(y, sr)
            now = pyln.Meter(sr).integrated_loudness(y)
        else:
            k = int(0.01 * sr); y[-k:] *= np.linspace(1, 0, k)[:, None]
            if len(y) < int(0.6 * sr): y = np.concatenate([y, np.zeros((int(0.6 * sr) - len(y), 2))])   # short files measure right
            now = momentary_max(y, sr)
        y = y * 10 ** ((tgt - now) / 20)
        pk = 20 * np.log10(np.abs(y).max() + 1e-12)
        if pk > -1: y *= 10 ** ((-1 - pk) / 20)
        out = f'{AMB if bed else SFX}/{name}.mp3'
        tmp = out + '.wav'; sf.write(tmp, y.astype(np.float32), sr, subtype='FLOAT')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '80k' if bed else '112k', out], check=True)
        os.remove(tmp)
        I, M, P = ebur(out)
        levels[name] = {'target_lufs': tgt, 'measure': 'integrated' if bed else 'momentary max', 'encoded_integrated': I, 'encoded_momentary_max': M,
                        'peak_dbfs': P, 'seconds': round(len(y) / sr, 2), 'kb': round(os.path.getsize(out) / 1024), 'source': src}
        print(f'{name:14s} target {tgt:6.1f}  I {I}  Mmax {M}  peak {P}  {levels[name]["kb"]} KB  {src}')
    json.dump(levels, open(f'{SFX}/levels.json', 'w'), indent=1)
