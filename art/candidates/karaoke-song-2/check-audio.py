"""CPU-only lyric evidence; transcription is not a listening or music approval."""
import argparse
import json
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
from transformers import pipeline

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('take', choices=['a2', 'a3', 'a4', 'a5', 'a6', 'a7'])
args = parser.parse_args()
folder = Path.home() / 'ai/island-audio/karaoke-song-2' / args.take
source = folder / 'full.flac'
samples, rate = sf.read(source)
seconds = len(samples) / rate
torch.set_num_threads(6)
asr = pipeline('automatic-speech-recognition', model='openai/whisper-large-v3-turbo',
               device='cpu', torch_dtype=torch.float32)
settings = {'language': 'japanese', 'task': 'transcribe'}
result = asr(str(source), chunk_length_s=30, return_timestamps=True, generate_kwargs=settings)
result['audio'] = {
    'seconds': seconds, 'sample_rate': rate,
    'peak': float(np.max(np.abs(samples))),
    'clipped_samples': int(np.sum(np.abs(samples) >= .9999)),
}
(folder / 'asr.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
offset = max(0, seconds - 24)
y, sr = librosa.load(source, sr=16000, offset=offset)
tail = asr({'raw': y, 'sampling_rate': sr}, return_timestamps=True, generate_kwargs=settings)
tail['offset_seconds'] = offset
(folder / 'asr-tail.json').write_text(json.dumps(tail, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'full': result, 'tail': tail}, ensure_ascii=False), flush=True)
