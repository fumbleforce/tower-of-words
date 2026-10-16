"""Loudness and encoding shared by tools/audio/make.py --post and tools/feel/build_audio.py.

Every game sound is levelled to the loudness it should have in the game, so the engine plays it at gain 1:
music, songs and beds by integrated loudness, one-shots by the loudest 400 ms window (momentary max), which is fair
to short sounds. Peaks are held under -1 dBFS. The encoded file is measured again with ffmpeg's EBU R128 meter."""
import io, os, re, subprocess
import numpy as np, soundfile as sf, pyloudnorm as pyln

PEAK_DB = -1.0


def integrated(y, sr):
    return pyln.Meter(sr).integrated_loudness(y)


def momentary_max(y, sr):
    m = pyln.Meter(sr, block_size=0.4)
    if len(y) < int(0.6 * sr):
        y = np.concatenate([y, np.zeros((int(0.6 * sr) - len(y), y.shape[1]))])
    hop = int(0.05 * sr); w = int(0.4 * sr); best = -120
    for i in range(0, len(y) - w + 1, hop):
        seg = y[i:i + w]
        if np.abs(seg).max() < 1e-6: continue
        try: best = max(best, m.integrated_loudness(seg))
        except Exception: pass
    return best


def set_level(y, sr, target, measure):
    """Scale y to target LUFS (measure 'integrated' or 'momentary max'), then hold the peak under PEAK_DB."""
    now = integrated(y, sr) if measure == 'integrated' else momentary_max(y, sr)
    y = y * 10 ** ((target - now) / 20)
    pk = 20 * np.log10(np.abs(y).max() + 1e-12)
    if pk > PEAK_DB:
        y = y * 10 ** ((PEAK_DB - pk) / 20)
    return y


def fade_edges(y, sr, head_s, tail_s):
    if head_s:
        k = int(head_s * sr); y[:k] *= np.linspace(0, 1, k)[:, None]
    if tail_s:
        k = int(tail_s * sr); y[-k:] *= np.linspace(1, 0, k)[:, None]
    return y


def wrap_loop(y, sr, fade=3.0):
    """The whole take as a loop: its last `fade` seconds crossfaded (equal power) into its start, so it loops without
    a seam even as a plain loop."""
    n = int(fade * sr)
    if len(y) <= 2 * n:
        return y
    th = np.linspace(0, np.pi / 2, n)[:, None]
    mixed = y[-n:] * np.cos(th) + y[:n] * np.sin(th)
    return np.concatenate([mixed, y[n:-n]])


def encode(y, sr, path, args):
    """Write y as MP3 with ffmpeg; args such as ['-b:a', '112k'] or ['-q:a', '0']."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    buf = io.BytesIO()
    sf.write(buf, y.astype(np.float32), sr, format='WAV', subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'wav', '-i', '-', '-c:a', 'libmp3lame', *args, path],
                   input=buf.getvalue(), check=True)


def ebur(path):
    """(integrated LUFS, momentary max LUFS, true peak dBFS) of a file, by ffmpeg's EBU R128 meter."""
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', out); P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', out)
    M = [float(v) for v in re.findall(r' M:\s*(-?[\d.]+)', out)]
    return (float(I[-1]) if I else None), (max(M) if M else None), (float(P[-1]) if P else None)
