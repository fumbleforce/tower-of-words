"""Score every Stable Audio take in ~/ai/feel-audio/raw so the picks aren't made blind (nobody can listen right now):
  clap      CLAP (laion/larger_clap_general) similarity with the sound's own prompt
  music     CLAP similarity with "music, melody, instruments, singing" (beds must stay low)
  speech    CLAP similarity with "clear speech, a person talking close to the microphone" (beds must stay low)
  steps     CLAP similarity with "footsteps" (Jørgen: no footsteps)
  spread    for beds: the spread (dB, 10th to 90th percentile) of short-term loudness; a steady bed is small
  onset     for one-shots: where the loudest part starts, and how long the sound lasts above -30 dB of its peak
Writes ~/ai/feel-audio/scores.json and a spectrogram per take in ~/ai/feel-audio/spec/.
Run (CPU): ~/ai/sd/venv/bin/python tools/feel/score_sa3.py"""
import os, json, glob, warnings
warnings.filterwarnings('ignore')
import numpy as np, soundfile as sf, librosa, torch
from PIL import Image, ImageDraw

RAW = os.path.expanduser('~/ai/feel-audio/raw')
SPEC = os.path.expanduser('~/ai/feel-audio/spec')
NEG = {'music': 'music, melody, instruments, singing', 'speech': 'clear speech, a person talking close to the microphone', 'steps': 'footsteps'}

if __name__ == '__main__':
    os.makedirs(SPEC, exist_ok=True)
    from transformers import ClapModel, ClapProcessor
    m = ClapModel.from_pretrained('laion/larger_clap_general').eval()
    p = ClapProcessor.from_pretrained('laion/larger_clap_general')
    out = {}
    for f in sorted(glob.glob(f'{RAW}/*.flac')):
        stem = os.path.basename(f)[:-5]; info = json.load(open(f[:-5] + '.json'))
        y, sr = sf.read(f, always_2d=True); mono = y.mean(1)
        a = librosa.resample(mono, orig_sr=sr, target_sr=48000)[: 48000 * 10]
        texts = [info['prompt']] + list(NEG.values())
        with torch.no_grad():
            o = m(**p(text=texts, audio=[a], sampling_rate=48000, return_tensors='pt', padding=True))
            ta = torch.nn.functional.normalize(o.text_embeds, dim=-1); aa = torch.nn.functional.normalize(o.audio_embeds, dim=-1)
            s = (ta @ aa.T)[:, 0].tolist()
        r = {'name': info['name'], 'clap': round(s[0], 3), **{k: round(v, 3) for k, v in zip(NEG, s[1:])}}
        hop = int(0.1 * sr); fr = int(0.4 * sr)
        st = np.array([10 * np.log10(np.mean(mono[i:i + fr] ** 2) + 1e-12) for i in range(0, max(1, len(mono) - fr), hop)])
        if info['name'].startswith('bed_'):
            r['spread'] = round(float(np.percentile(st, 90) - np.percentile(st, 10)), 1)
        else:
            env = np.abs(mono); pk = env.max(); on = np.where(env > pk * 0.03)[0]
            r['onset'] = round(on[0] / sr, 2) if len(on) else None; r['active'] = round((on[-1] - on[0]) / sr, 2) if len(on) else 0
        r['peak_db'] = round(20 * np.log10(np.abs(y).max() + 1e-12), 1)
        out[stem] = r
        S = librosa.amplitude_to_db(np.abs(librosa.stft(mono, n_fft=2048, hop_length=512)), ref=np.max)
        top = int(12000 / (sr / 2) * S.shape[0])            # up to 12 kHz
        img = np.clip((S[:top][::-1] + 80) / 80 * 255, 0, 255).astype(np.uint8)
        im = Image.fromarray(img).resize((800, 200)).convert('RGB')
        ImageDraw.Draw(im).text((4, 2), f"{stem}  clap {r['clap']} music {r['music']} speech {r['speech']} steps {r['steps']}  (0-12 kHz, {len(mono) / sr:.0f} s)", fill=(255, 220, 0))
        im.save(f'{SPEC}/{stem}.png')
        print(stem, r, flush=True)
    json.dump(out, open(os.path.expanduser('~/ai/feel-audio/scores.json'), 'w'), indent=1)
