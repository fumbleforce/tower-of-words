"""Cut a seamless loop out of a music track, and check a loop's seam.

    ~/ai/sep/bin/python tools/make_loop.py cut in.mp3 out.mp3 [--min 20] [--max 75] [--fade 1.5] [--pad 1] [--accept 0.35]
    ~/ai/sep/bin/python tools/make_loop.py check out.mp3 --start S --end E [--wav seam.wav]

cut: finds the pair of points a < b, (b - a) between --min and --max seconds, where the few seconds after a sound most
like the few seconds after b (chroma, MFCC and onset strength, compared frame by frame along the whole window), then
moves b by up to one analysis hop to the sample where the waveforms line up best. The loop body is x[a:b] with its
first --fade seconds crossfaded from x[b:...] into x[a:...], so playing the body over and over is continuous.

The file written is the body with --pad seconds of itself wrapped around each side: [end of body][body][start of body].
The game plays it with one AudioBufferSourceNode, loop = true, loopStart = pad, loopEnd = pad + body. Because the
audio is continuous across both loop points, a decoder that keeps or drops the MP3 encoder delay (up to --pad seconds
of shift) still loops without a gap or a click. No loudness processing: the gain stays exactly as the source, so the
padding and the body match. Prints JSON with loop_start and loop_end in seconds of the output file.

check: decodes the file, plays the loop region twice as the game does, and compares the seam with the rest of the
loop: the level change (dB, 50 ms windows) and the spectral flux (half-wave rectified, 2048-point frames) at the seam
against the 99th percentile everywhere else. --shift N also checks with the first N samples dropped, as a decoder
that trims differently would. --wav writes the last 2 s and first 2 s around the seam."""
import argparse, io, json, subprocess
import numpy as np, soundfile as sf, librosa

SR = 48000
HOP = 512


def load(path, sr=SR):
    wav = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-f', 'wav', '-ar', str(sr), '-ac', '2', '-'],
                         capture_output=True, check=True).stdout
    x, _ = sf.read(io.BytesIO(wav))
    return x


def features(mono):
    chroma = librosa.feature.chroma_cqt(y=mono, sr=SR, hop_length=HOP)
    mfcc = librosa.feature.mfcc(y=mono, sr=SR, hop_length=HOP, n_mfcc=13)[1:]
    onset = librosa.onset.onset_strength(y=mono, sr=SR, hop_length=HOP)[None]
    n = min(chroma.shape[1], mfcc.shape[1], onset.shape[1])
    blocks = [chroma[:, :n] / (np.linalg.norm(chroma[:, :n], axis=0) + 1e-9),
              (mfcc[:, :n] - mfcc.mean(1, keepdims=True)) / (mfcc.std() * 4 + 1e-9),
              onset[:, :n] / (onset.max() + 1e-9) * 2]
    return np.vstack(blocks).T  # frames x dims


def find_points(x, min_s, max_s, fade_s, accept=0.35, win_s=3.0):
    mono = x.mean(1)
    f = features(mono)
    n = len(f)
    fps = SR / HOP
    W = int(win_s * fps)
    tail = int((fade_s + 0.2) * fps)  # b needs fade_s of audio after it
    sq = (f ** 2).sum(1)
    best = []
    for L in range(int(min_s * fps), int(max_s * fps) + 1):
        m = n - L - max(W, tail)
        if m <= 0:
            break
        # distance between frame i and frame i + L, for every i, then summed over the window
        d = np.sqrt(np.maximum(sq[:m + W] + sq[L:L + m + W] - 2 * (f[:m + W] * f[L:L + m + W]).sum(1), 0))
        c = np.concatenate([[0], np.cumsum(d)])
        win = (c[W:W + m] - c[:m]) / W
        i = int(np.argmin(win))
        best.append((float(win[i]), i, L))
    if not best:
        raise RuntimeError('track too short for --min')
    top = min(b[0] for b in best)
    # the longest loop whose seam is good enough: within 1.5 times the best, or under --accept. About 0.1 is the
    # music repeating itself; two unrelated passages of one track score 0.8 to 1.1.
    L0 = max((b for b in best if b[0] <= max(top * 1.5, accept)), key=lambda b: b[2])[2]
    dist, i, L = min(b for b in best if abs(b[2] - L0) <= fps / 2)  # the best seam around that length
    a, b = i * HOP, (i + L) * HOP
    # sample-accurate: shift b so the low band of x[b:...] lines up with x[a:...]
    F = int(fade_s * SR)
    lo = librosa.effects.preemphasis(mono, coef=-0.97)  # de-emphasis: weights the low end, where phase is audible
    ref = lo[a:a + F]
    seg = lo[b - HOP:b + F + HOP]
    corr = np.correlate(seg, ref, mode='valid')
    b = b - HOP + int(np.argmax(corr))
    return a, b, dist


def cut(src, dst, min_s, max_s, fade_s, pad_s, accept=0.35):
    x = load(src)
    a, b, dist = find_points(x, min_s, max_s, fade_s, accept)
    F = int(fade_s * SR)
    y = x[a:b].copy()
    t = (np.arange(F) / F)[:, None]
    fin, fout = np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)
    y[:F] = x[a:a + F] * fin + x[b:b + F] * fout
    P = int(pad_s * SR)
    z = np.concatenate([y[-P:], y, y[:P]])
    buf = io.BytesIO()
    sf.write(buf, z, SR, format='WAV', subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'wav', '-i', '-', '-c:a', 'libmp3lame', '-q:a', '0', dst],
                   input=buf.getvalue(), check=True)
    info = {'src': src, 'from_s': round(a / SR, 3), 'to_s': round(b / SR, 3),
            'loop_start': round(P / SR, 6), 'loop_end': round((P + len(y)) / SR, 6),
            'loop_s': round(len(y) / SR, 2), 'seam_dist': round(dist, 3)}
    print(json.dumps(info), flush=True)
    return info


def seam_stats(z, s0, s1, wav=None):
    """z: decoded file; plays [s0, s1) twice in a row and measures the joins against the rest."""
    body = z[s0:s1]
    two = np.concatenate([body, body])
    seam = len(body)
    mono = two.mean(1)
    w = int(0.05 * SR)
    lev = 20 * np.log10(np.sqrt(np.array([np.mean(mono[i:i + w] ** 2) for i in range(0, len(mono) - w, w)])) + 1e-9)
    jumps = np.abs(np.diff(lev))
    k = seam // w
    level_jump = float(jumps[max(0, k - 1):k + 1].max())
    S = np.abs(librosa.stft(mono, n_fft=2048, hop_length=512))
    flux = np.maximum(np.diff(np.log1p(S * 10), axis=1), 0).sum(0)
    ks = seam // 512
    seam_flux = float(flux[ks - 2:ks + 2].max())
    rest = np.delete(flux, np.arange(ks - 4, ks + 4))
    rest_l = np.delete(jumps, np.arange(k - 2, k + 2))
    if wav:
        sf.write(wav, two[seam - 2 * SR:seam + 2 * SR], SR)
    return {'level_jump_db': round(level_jump, 2), 'level_jump_p99_elsewhere': round(float(np.percentile(rest_l, 99)), 2),
            'flux_at_seam': round(seam_flux, 1), 'flux_p99_elsewhere': round(float(np.percentile(rest, 99)), 1),
            'flux_median': round(float(np.median(rest)), 1),
            'sample_step_at_seam': round(float(np.abs(two[seam] - two[seam - 1]).max()), 4),
            'sample_step_p999_elsewhere': round(float(np.percentile(np.abs(np.diff(two, axis=0)).max(1), 99.9)), 4)}


def check(path, start, end, shift=0, wav=None):
    z = load(path)[shift:]
    s0, s1 = round(start * SR), round(end * SR)
    out = {'file': path, 'shift': shift, **seam_stats(z, s0, s1, wav)}
    print(json.dumps(out), flush=True)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('cut')
    c.add_argument('src'); c.add_argument('dst')
    c.add_argument('--min', type=float, default=20); c.add_argument('--max', type=float, default=75)
    c.add_argument('--fade', type=float, default=1.5); c.add_argument('--pad', type=float, default=1.0)
    c.add_argument('--accept', type=float, default=0.35)
    k = sub.add_parser('check')
    k.add_argument('file'); k.add_argument('--start', type=float, required=True); k.add_argument('--end', type=float, required=True)
    k.add_argument('--shift', type=int, default=0); k.add_argument('--wav')
    a = ap.parse_args()
    if a.cmd == 'cut':
        cut(a.src, a.dst, a.min, a.max, a.fade, a.pad, a.accept)
    else:
        check(a.file, a.start, a.end, a.shift, a.wav)
