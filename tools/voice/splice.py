"""Join the parts of a spliced English line (cfg.SPLICE: Eric's and Carina's lines with Japanese in them, cfg.parts)
into one clip: each part is its own take (English parts in English, Japanese parts in Japanese, same clone), trimmed,
levelled to the English parts' speech loudness and joined with a pause that follows the punctuation between them. export.py uses it; the result is normalised like any clip.
Why: an English clone reads Japanese with an English accent (待って as "matty"; Jørgen, 2026-09-30), so their Japanese is made
natively and put into the line. Every other speaker says the Japanese in the same take as the English (cfg.RO2JA)."""
import numpy as np, librosa

# pause after a part, by how it ends: a full stop, a comma, or nothing (the line runs on)
GAP = {'stop': 0.30, 'comma': 0.16, 'none': 0.07}


def ending(text):
    t = text.rstrip('”"\' ')
    if t.endswith(('.', '!', '?', '。', '！', '？', '…')):
        return 'stop'
    if t.endswith((',', '、', ';', ':')):
        return 'comma'
    return 'none'


def trim(y, sr):
    idx = librosa.effects.split(y, top_db=40)
    if len(idx):
        y = y[max(0, idx[0][0] - int(0.02 * sr)):min(len(y), idx[-1][1] + int(0.05 * sr))].copy()
    n = min(len(y) // 4, int(0.008 * sr))
    if n:
        y[:n] *= np.linspace(0, 1, n)
        y[-n:] *= np.linspace(1, 0, n)
    return y


def speech_rms(y, sr):
    """RMS over the frames within 30 dB of the loudest: the level of the speech, not of the pauses."""
    f = librosa.feature.rms(y=y, frame_length=int(0.025 * sr), hop_length=int(0.010 * sr))[0]
    if not len(f) or f.max() <= 0:
        return 0.0
    loud = f[f >= f.max() * 10 ** (-30 / 20)]
    return float(np.sqrt(np.mean(loud ** 2)))


def join(ys, texts, langs, sr):
    """ys: one waveform per part (same sample rate). Returns (joined waveform, [(start s, end s) per part])."""
    ys = [trim(np.asarray(y, dtype=np.float32), sr) for y in ys]
    en = [speech_rms(y, sr) for y, l in zip(ys, langs) if l == 'en']
    target = float(np.median(en)) if en else None
    out, spans, t = [], [], 0
    for i, (y, text, lang) in enumerate(zip(ys, texts, langs)):
        if target and lang == 'ja':
            r = speech_rms(y, sr)
            if r > 0:
                y = y * float(np.clip(target / r, 10 ** (-6 / 20), 10 ** (6 / 20)))
        spans.append((round(t / sr, 3), round((t + len(y)) / sr, 3)))
        out.append(y)
        t += len(y)
        if i < len(ys) - 1:
            g = np.zeros(int(GAP[ending(text)] * sr), dtype=np.float32)
            out.append(g)
            t += len(g)
    return np.concatenate(out), spans
