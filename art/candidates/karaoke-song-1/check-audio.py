"""CPU transcription and sample checks; these never establish musical quality or listening approval."""
import argparse
import json
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
import librosa
from transformers import pipeline

parser = argparse.ArgumentParser()
parser.add_argument('take', choices=['a', 'b'])
parser.add_argument('--raw-root', type=Path, default=Path.home() / 'ai/island-audio/karaoke-song-1')
args = parser.parse_args()
folder = args.raw_root / args.take
samples, rate = sf.read(folder / 'full.flac')
torch.set_num_threads(6)
asr = pipeline('automatic-speech-recognition', model='openai/whisper-large-v3-turbo', device='cpu', torch_dtype=torch.float32)
result = asr(str(folder / 'full.flac'), chunk_length_s=30, return_timestamps=True, generate_kwargs={'language': 'japanese', 'task': 'transcribe'})
result['audio'] = {'seconds': len(samples) / rate, 'sample_rate': rate, 'peak': float(np.max(np.abs(samples))), 'clipped_samples': int(np.sum(np.abs(samples) >= .9999))}
(folder / 'asr.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
# A second pass isolates the final phrase from chunk-boundary recognition artifacts.
y, sr = librosa.load(folder / 'full.flac', sr=16000, offset=31 if args.take == 'a' else 27)
tail = asr({'raw': y, 'sampling_rate': sr}, return_timestamps=True, generate_kwargs={'language': 'japanese', 'task': 'transcribe'})
(folder / 'asr-tail.json').write_text(json.dumps(tail, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'full': result, 'tail': tail}, ensure_ascii=False))
