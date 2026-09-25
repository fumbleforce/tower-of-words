"""Cut a clean loop out of a generated track.
Beat-tracks the audio, skips the intro and the outro, then picks a start and end on beats, a whole number of bars apart,
where the music sounds most alike (chroma + MFCC over one bar). The end is crossfaded into the start so the file
repeats without a click. Output: MP3 (V0), loudness-matched to -20 LUFS like the game's Lyria loops.
Run with ~/ai/sep/bin/python tools/make_loop.py in.flac out.mp3 [min_s max_s bpm]"""
import sys, subprocess, io, json
import numpy as np, soundfile as sf, librosa


def load(path, sr=44100):
    wav = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-f', 'wav', '-ar', str(sr), '-ac', '2', '-'], capture_output=True).stdout
    x, sr = sf.read(io.BytesIO(wav))
    return x, sr


def make_loop(src, dst, min_s=45, max_s=75, bpm=None, fade_s=1.5):
    x, sr = load(src)
    mono = x.mean(1)
    tempo, beats = librosa.beat.beat_track(y=mono, sr=sr, units='samples')
    tempo = float(np.atleast_1d(tempo)[0])
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=mono, sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=mono, sr=sr, hop_length=hop, n_mfcc=13)
    feat = np.vstack([chroma / (np.linalg.norm(chroma, axis=0) + 1e-9), mfcc / 50])
    rms = librosa.feature.rms(y=mono, hop_length=hop)[0]
    dur = len(mono) / sr
    beat_len = np.median(np.diff(beats)) if len(beats) > 2 else sr / 2
    bar = 4 * max(1, round(tempo / bpm)) if bpm else 4  # beat tracker often doubles slow tempos

    def window(s):
        f0 = s // hop
        f1 = int((s + bar * beat_len) // hop)
        return feat[:, f0:f1]

    best = None
    for i, a in enumerate(beats):
        if a / sr < 4 or a / sr > dur * 0.4:
            continue
        for j in range(i + bar, len(beats), bar):
            b = beats[j]
            L = (b - a) / sr
            if L < min_s:
                continue
            if L > max_s or b / sr + bar * beat_len / sr > dur - 6:
                break
            wa, wb = window(a), window(b)
            n = min(wa.shape[1], wb.shape[1])
            if n < 4:
                continue
            dist = float(np.mean(np.linalg.norm(wa[:, :n] - wb[:, :n], axis=0)))
            # similar loudness at the seam too
            la, lb = rms[a // hop:a // hop + n].mean(), rms[b // hop:b // hop + n].mean()
            dist += abs(np.log((la + 1e-6) / (lb + 1e-6)))
            if best is None or dist < best[0]:
                best = (dist, int(a), int(b))
    if best is None:
        raise RuntimeError('no loop found')
    dist, a, b = best
    F = int(fade_s * sr)
    y = x[a:b].copy()
    t = np.linspace(0, 1, F)[:, None]
    fin, fout = np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)
    y[:F] = x[a:a + F] * fin + x[b:b + F] * fout
    buf = io.BytesIO()
    sf.write(buf, y, sr, format='WAV', subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'wav', '-i', '-', '-af', 'loudnorm=I=-20:TP=-2:LRA=11,aresample=44100',
                    '-c:a', 'libmp3lame', '-q:a', '0', dst], input=buf.getvalue(), check=True)
    info = {'src': src, 'start_s': round(a / sr, 2), 'end_s': round(b / sr, 2), 'loop_s': round((b - a) / sr, 1), 'bpm': round(tempo), 'seam_dist': round(float(dist), 3)}
    print(json.dumps(info), flush=True)
    return info


if __name__ == '__main__':
    args = sys.argv[1:]
    make_loop(args[0], args[1], *(float(v) for v in args[2:5]))
