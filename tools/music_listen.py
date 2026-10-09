"""Measured listening for music candidates: key, tempo, loudness range, high-band noise, and CLAP (laion/larger_clap_general,
on the CPU) scores against plain descriptions of what we want and what Jørgen has rejected, plus CLAP similarity to
the reference tracks he called full-bodied (the current Lyria loops and the YuE2 opening theme). worst_<x> gives
the highest score of each bad description over 10 s windows and where it is (seconds).

    ~/ai/sd/venv/bin/python tools/music_listen.py file.wav [...] [--json out.json]

The numbers are a screen, not a verdict: a clip that scores well still gets a look at its spectrogram and its
section-by-section numbers before it goes in front of Jørgen.
"""
import argparse, json, os, subprocess, io
import numpy as np, soundfile as sf, librosa, torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = [f'{ROOT}/art/music/calm.wav', f'{ROOT}/art/music/night.wav', f'{ROOT}/art/approved/music/opening.mp3']
GOOD = ['a beautiful melodic anime soundtrack with piano and strings', 'warm full-bodied orchestral pop music, polished studio recording',
        'a calm pleasant instrumental melody']
BAD = {'vocals': 'a person singing, vocals, voice', 'noise': 'random noises, static, glitchy sound effects',
       'cheap': "cheap toy keyboard music, a children's song, amateur", 'odd': 'strange dissonant out of tune instruments'}
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']


def load(path, sr):
    w = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-f', 'wav', '-ar', str(sr), '-ac', '1', '-'], capture_output=True, check=True).stdout
    return sf.read(io.BytesIO(w))[0]


def key_of(y, sr):
    c = librosa.feature.chroma_cqt(y=y, sr=sr).mean(1)
    best = max(((np.corrcoef(np.roll(p, k), c)[0, 1], f'{NOTES[k]} {q}') for k in range(12) for p, q in ((MAJ, 'major'), (MIN, 'minor'))))
    return best[1], round(float(best[0]), 2)


class Clap:
    def __init__(self):
        from transformers import ClapModel, ClapProcessor
        name = 'laion/larger_clap_general'
        self.m, self.p = ClapModel.from_pretrained(name).eval(), ClapProcessor.from_pretrained(name)

    @torch.no_grad()
    def audio(self, y):  # y at 48 kHz mono; CLAP embeds 10 s windows, averaged over the clip
        wins = [y[i:i + 480000] for i in range(0, max(1, len(y) - 480000 + 1), 240000)] or [y]
        x = self.p(audio=wins, sampling_rate=48000, return_tensors='pt')
        e = self.m.get_audio_features(**x)
        e = getattr(e, 'pooler_output', e)
        e = torch.nn.functional.normalize(e, dim=-1).mean(0)
        return torch.nn.functional.normalize(e, dim=0)

    @torch.no_grad()
    def text(self, t):
        x = self.p(text=t, return_tensors='pt', padding=True)
        e = self.m.get_text_features(**x)
        e = getattr(e, 'pooler_output', e)
        return torch.nn.functional.normalize(e, dim=-1)


def listen(paths, clap=None):
    clap = clap or Clap()
    good = clap.text(GOOD)
    bad = clap.text(list(BAD.values()))
    refs = torch.stack([clap.audio(load(r, 48000)) for r in REFS if os.path.exists(r)])
    out = {}
    for p in paths:
        y48 = load(p, 48000)
        y = librosa.resample(y48, orig_sr=48000, target_sr=22050)
        tempo = float(np.atleast_1d(librosa.feature.tempo(y=y, sr=22050))[0])
        key, kc = key_of(y, 22050)
        S = np.abs(librosa.stft(y, n_fft=2048))
        flat_hi = float(librosa.feature.spectral_flatness(S=S[600:]).mean())  # above ~6.5 kHz: hiss and fizz
        rms = librosa.feature.rms(y=y, frame_length=22050, hop_length=11025)[0]
        db = 20 * np.log10(rms + 1e-9)
        a = clap.audio(y48)
        # the same descriptions per 10 s window: one bad moment (a vocal line, a burst of noise) hides in the average
        wins = [clap.audio(y48[i:i + 480000]) for i in range(0, max(1, len(y48) - 240000), 480000)]
        per = (bad @ torch.stack(wins).T).numpy()  # descriptions x windows
        worst = {f'worst_{k}': [round(float(per[i].max()), 3), int(per[i].argmax()) * 10] for i, k in enumerate(BAD)}
        out[os.path.basename(p)] = {
            'key': key, 'key_fit': kc, 'tempo': round(tempo, 1), 'quiet_s': int((db < -45).sum() / 2),
            'level_spread_db': round(float(np.percentile(db, 90) - np.percentile(db, 10)), 1),
            'hiss': round(flat_hi, 4), 'peak': round(float(np.abs(y48).max()), 3),
            'good': round(float((good @ a).mean()), 3),
            **{k: round(float(v), 3) for k, v in zip(BAD, (bad @ a).tolist())},
            'like_refs': round(float((refs @ a).mean()), 3), **worst,
        }
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--json')
    a = ap.parse_args()
    res = listen(a.files)
    for k, v in res.items():
        print(k, json.dumps(v), flush=True)
    if a.json:
        old = json.load(open(a.json)) if os.path.exists(a.json) else {}
        json.dump({**old, **res}, open(a.json, 'w'), indent=1)
