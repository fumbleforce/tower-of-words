"""Measure the actual day-two Kenji exports against approved voices; never edits audio."""
from pathlib import Path
import hashlib
import json
import os
import sys
import argparse

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
WORK = Path(os.environ['GAME3D_VOICE_WORK'])
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--label', choices=['before', 'after'], default='before')
args = parser.parse_args()
sys.path.insert(0, str(HERE))
import cfg
import numpy as np
import librosa
import torch
from transformers import AutoFeatureExtractor, WavLMForXVector

torch.set_num_threads(4)
fe = AutoFeatureExtractor.from_pretrained('microsoft/wavlm-base-plus-sv', local_files_only=True)
model = WavLMForXVector.from_pretrained('microsoft/wavlm-base-plus-sv', local_files_only=True).eval()

def wave(p):
    return librosa.load(p, sr=16000, mono=True)[0]

def emb(y):
    if len(y) < 8000:
        y = np.pad(y, (0, 8000-len(y)))
    with torch.no_grad():
        e = model(**fe(y, sampling_rate=16000, return_tensors='pt')).embeddings
    return torch.nn.functional.normalize(e, dim=-1)[0].numpy()

def pitch(y):
    spans = librosa.effects.split(y, top_db=40)
    if len(spans):
        y = y[spans[0][0]:spans[-1][1]]
    f, _, _ = librosa.pyin(y, fmin=70, fmax=450, sr=16000, frame_length=1024)
    f = f[np.isfinite(f)]
    return {'median_hz': round(float(np.median(f)), 1) if len(f) >= 5 else None,
            'p10_hz': round(float(np.percentile(f, 10)), 1) if len(f) >= 5 else None,
            'p90_hz': round(float(np.percentile(f, 90)), 1) if len(f) >= 5 else None}

speakers = cfg.speakers()
refs = {}
for who in ['kenji', 'eric', 'mori', 'sales1', 'reader', 'kuroda', 'guard']:
    p = Path(speakers[who][0]); y = wave(p)
    refs[who] = {'path': str(p), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                 'embedding': emb(y), **pitch(y)}
    print('REFERENCE', who, refs[who]['median_hz'], flush=True)
anchors = {k: emb(wave(ROOT/'game3d/audio'/f'{k}.mp3')) for k in ['ln-12xtsym', 'ln-10gg2c7', 'ln-1ia884h']}
entries = {e['key']: e for es in json.loads((WORK/'day2-lines.json').read_text()).values() for e in es}
rows = []
for key, e in entries.items():
    p = ROOT/'game3d/audio'/f'{key}.mp3'; y = wave(p); embedding = emb(y)
    similarity = {k: round(float(embedding @ v['embedding']), 4) for k,v in refs.items()}
    row = {'key': key, 'text': e['text'], 'lang': e['lang'], 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
           'seconds': round(len(y)/16000, 3), **pitch(y), 'similarity': similarity,
           'anchor_similarity': {k: round(float(embedding @ v), 4) for k,v in anchors.items()}}
    rows.append(row)
    print(key, row['median_hz'], 'ref', similarity['kenji'], 'anchors', row['anchor_similarity'], flush=True)
for v in refs.values():
    v.pop('embedding')
(WORK/f'exports-{args.label}.json').write_text(json.dumps({'references': refs, 'exports': rows}, ensure_ascii=False, indent=2)+'\n')
