"""The CLAP screen for ambience and sound effects (laion/larger_clap_general, on the CPU), so a take is never judged
blind. Numbers, per take:
  clap      similarity with the take's own prompt (what should be heard)
  music     similarity with "music, melody, instruments, singing" (beds and effects must stay low)
  speech    similarity with "clear speech, a person talking close to the microphone" (must stay low)
  steps     similarity with "footsteps" (Jørgen: no footsteps)
  spread    for beds: the spread (dB, 10th to 90th percentile) of short-term loudness; a steady bed is small
  onset     for one-shots: where the sound starts, and how long it lasts above -30 dB of its peak (active)
tools/audio/make.py --post calls screen() for every ambience and sfx take. Run on its own, it scores the old Stable
Audio takes in ~/ai/feel-audio/raw (tools/feel/sa3_gen.py) and draws a spectrogram per take:

    ~/ai/tts-bench/.venv/bin/python tools/audio/score_sa3.py"""
import os, sys, json, glob, warnings
warnings.filterwarnings('ignore')
import numpy as np, soundfile as sf, librosa, torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from music_listen import Clap

RAW = os.path.expanduser('~/ai/feel-audio/raw')
SPEC = os.path.expanduser('~/ai/feel-audio/spec')
NEG = {'music': 'music, melody, instruments, singing', 'speech': 'clear speech, a person talking close to the microphone', 'steps': 'footsteps'}


def screen(clap, y, sr, prompt, bed):
    """y: (samples, channels) or mono at sr. Returns the numbers above, rounded."""
    mono = y.mean(1) if y.ndim == 2 else y
    a48 = librosa.resample(mono, orig_sr=sr, target_sr=48000) if sr != 48000 else mono
    with torch.no_grad():
        s = (clap.text([prompt] + list(NEG.values())) @ clap.audio(a48)).tolist()
    r = {'clap': round(s[0], 3), **{k: round(v, 3) for k, v in zip(NEG, s[1:])}}
    if bed:
        hop, fr = int(0.1 * sr), int(0.4 * sr)
        st = np.array([10 * np.log10(np.mean(mono[i:i + fr] ** 2) + 1e-12) for i in range(0, max(1, len(mono) - fr), hop)])
        r['spread'] = round(float(np.percentile(st, 90) - np.percentile(st, 10)), 1)
    else:
        env = np.abs(mono); on = np.where(env > env.max() * 0.03)[0]
        r['onset'] = round(on[0] / sr, 2) if len(on) else None
        r['active'] = round((on[-1] - on[0]) / sr, 2) if len(on) else 0
    r['peak_db'] = round(20 * np.log10(np.abs(y).max() + 1e-12), 1)
    return r


def spectrogram(mono, sr, path, title):
    from PIL import Image, ImageDraw
    S = librosa.amplitude_to_db(np.abs(librosa.stft(mono, n_fft=2048, hop_length=512)), ref=np.max)
    top = int(12000 / (sr / 2) * S.shape[0])            # up to 12 kHz
    img = np.clip((S[:top][::-1] + 80) / 80 * 255, 0, 255).astype(np.uint8)
    im = Image.fromarray(img).resize((800, 200)).convert('RGB')
    ImageDraw.Draw(im).text((4, 2), f'{title}  (0-12 kHz, {len(mono) / sr:.0f} s)', fill=(255, 220, 0))
    im.save(path)


if __name__ == '__main__':
    os.makedirs(SPEC, exist_ok=True)
    clap = Clap()
    out = {}
    for f in sorted(glob.glob(f'{RAW}/*.flac')):
        stem = os.path.basename(f)[:-5]; info = json.load(open(f[:-5] + '.json'))
        y, sr = sf.read(f, always_2d=True)
        r = {'name': info['name'], **screen(clap, y, sr, info['prompt'], info['name'].startswith('bed_'))}
        out[stem] = r
        try:
            spectrogram(y.mean(1), sr, f'{SPEC}/{stem}.png', f"{stem}  clap {r['clap']} music {r['music']} speech {r['speech']} steps {r['steps']}")
        except ImportError:
            pass
        print(stem, r, flush=True)
    json.dump(out, open(os.path.expanduser('~/ai/feel-audio/scores.json'), 'w'), indent=1)
