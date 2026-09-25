"""Beat, downbeat, section and vocal-phrase analysis of game/audio/music/opening.mp3 for the anime opening cut sheet.
Needs the Demucs vocal stem in art/opening/audio/htdemucs_ft/opening/vocals.wav (see GUIDE). Writes art/opening/audio/analysis.json.
Run: ~/ai/sd/venv/bin/python tools/opening/analyze_song.py"""
import json, os
import numpy as np, librosa

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'opening', 'audio')
y, sr = librosa.load(os.path.join(D, 'opening.wav'), sr=22050, mono=True)
v, _ = librosa.load(os.path.join(D, 'htdemucs_ft', 'opening', 'vocals.wav'), sr=22050, mono=True)
dur = len(y) / sr
hop = 512
onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop, start_bpm=150, tightness=200)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
# downbeat phase: which of 4 phases has the most low-frequency (kick) energy
S = np.abs(librosa.stft(y, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr)
low = S[freqs < 150].sum(0)
lowb = np.array([low[max(0, b - 1):b + 2].mean() for b in beats])
phase = int(np.argmax([lowb[p::4].mean() for p in range(4)]))
downs = bt[phase::4]
# energy curves
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
vr = librosa.feature.rms(y=v, hop_length=hop)[0]
t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
vdb = 20 * np.log10(vr + 1e-6)
sing = vdb > (np.percentile(vdb, 95) - 22)
# smooth: close gaps < 0.25 s, drop blips < 0.2 s
fr = int(0.25 * sr / hop)
s = sing.copy()
i = 0
segs = []
start = None
for k, on in enumerate(s):
    if on and start is None: start = k
    if not on and start is not None:
        segs.append([start, k]); start = None
if start is not None: segs.append([start, len(s)])
merged = []
for a, b in segs:
    if merged and a - merged[-1][1] < fr: merged[-1][1] = b
    else: merged.append([a, b])
phr = [(round(float(t[a]), 2), round(float(t[min(b, len(t) - 1)]), 2)) for a, b in merged if (b - a) * hop / sr > 0.2]
# phrases grouped by gaps > 0.6 s
lines = []
for a, b in phr:
    if lines and a - lines[-1][1] < 0.6: lines[-1][1] = b
    else: lines.append([a, b])
# section novelty from chroma+mfcc self-similarity at bar level
chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
feat = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc, axis=1)])
dfr = librosa.time_to_frames(downs, sr=sr, hop_length=hop)
bars = librosa.util.sync(feat, dfr, aggregate=np.median)
bar_rms = [float(rms[a:b].mean()) if b > a else 0 for a, b in zip(dfr[:-1], dfr[1:])]
bar_voc = [float(sing[a:b].mean()) if b > a else 0 for a, b in zip(dfr[:-1], dfr[1:])]
bounds = librosa.segment.agglomerative(bars, 8)
out = {'duration': round(dur, 3), 'tempo': float(np.atleast_1d(tempo)[0]), 'beats': [round(float(x), 3) for x in bt],
       'downbeats': [round(float(x), 3) for x in downs], 'downbeat_phase': phase,
       'sections_at_bar': [int(b) for b in bounds], 'sections_t': [round(float(downs[min(b, len(downs) - 1)]), 2) for b in bounds],
       'bar_rms': [round(x, 4) for x in bar_rms], 'bar_vocal': [round(x, 2) for x in bar_voc],
       'vocal_segments': phr, 'vocal_lines': [[round(a, 2), round(b, 2)] for a, b in lines],
       'onset_peaks': [round(float(x), 3) for x in librosa.onset.onset_detect(onset_envelope=onset, sr=sr, hop_length=hop, units='time', delta=0.3)]}
json.dump(out, open(os.path.join(D, 'analysis.json'), 'w'), indent=1)
print('dur', dur, 'tempo', out['tempo'], 'beats', len(bt), 'phase', phase)
print('sections', out['sections_t'])
print('vocal lines', out['vocal_lines'])
for i, (d, r, vv) in enumerate(zip(downs, bar_rms, bar_voc)):
    print(f'bar {i:2d} {d:6.2f} rms {r:.3f} voc {vv:.2f} ' + '#' * int(r * 150))
