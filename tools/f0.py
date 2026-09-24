"""Median F0 and share of low frames. Usage: f0.py file [file ...] -> JSON lines {file, median, low160, voiced}"""
import sys, json, warnings
warnings.filterwarnings('ignore')
import librosa, numpy as np
for p in sys.argv[1:]:
    try:
        y, sr = librosa.load(p, sr=16000)
        f, v, _ = librosa.pyin(y, fmin=70, fmax=450, sr=sr, frame_length=1024)
        f = f[~np.isnan(f)]
        st = 12 * np.log2(f / np.median(f)) if len(f) else f
        print(json.dumps({'file': p, 'median': round(float(np.median(f)), 1) if len(f) else None,
                          'low160': round(float((f < 160).mean()), 3) if len(f) else None,
                          'range_st': round(float(np.percentile(st, 95) - np.percentile(st, 5)), 1) if len(f) > 5 else None,
                          'voiced': int(len(f))}), flush=True)
    except Exception as e:
        print(json.dumps({'file': p, 'error': str(e)}), flush=True)
