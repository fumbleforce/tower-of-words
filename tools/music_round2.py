"""Round 2 of proto2/music: turn the raw takes from tools/music_inst.py into loops, soften the opening theme,
measure the vocals in everything, and write proto2/music/round2.json for tools/music_page.py.
Run with ~/ai/sep/bin/python tools/music_round2.py (needs demucs + librosa, CPU only)."""
import os, json, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from make_loop import make_loop
from vocal_check import measure

REPO = '/home/jorgen/repo/japanese'
D = f'{REPO}/proto2/music'
RAW = os.path.expanduser('~/ai/music-raw')
SEP = os.path.expanduser('~/ai/sep/out/htdemucs_ft')
BPM = {'office': 75, 'night': 70}

out = json.load(open(f'{D}/round2.json')) if os.path.exists(f'{D}/round2.json') else {}
out.setdefault('loops', {})
out.setdefault('vocals', {})

jobs = []
for k in BPM:
    for suffix in ('a', 'b', 'c'):
        jobs.append((f'{RAW}/inst-{k}-{suffix}.flac', f'r2-{k}-yue-{suffix}.mp3', k))
    jobs.append((f'{RAW}/sa3-{k}.flac', f'r2-{k}-sa3.mp3', k))
    if not os.path.exists(f'{SEP}/yue2-{k}/no_vocals.wav'):
        measure(f'{D}/yue2-{k}.mp3')
    jobs.append((f'{SEP}/yue2-{k}/no_vocals.wav', f'r2-{k}-demucs.mp3', k))

for src, dst, k in jobs:
    if os.path.exists(src) and (not os.path.exists(f'{D}/{dst}') or os.path.getmtime(src) > os.path.getmtime(f'{D}/{dst}')):
        out['loops'][dst] = make_loop(src, f'{D}/{dst}', 45, 75, BPM[k])
        out['vocals'].pop(dst[:-4], None)
        subprocess.run(['rm', '-rf', f'{SEP}/{dst[:-4]}'])

# Opening theme: two masters of the original, plus the new take with softer tags (same loudness, -14.3 LUFS).
MASTERS = {
    'yue2-opening-soft.mp3': 'equalizer=f=3500:t=o:w=1.2:g=-3,highshelf=f=8000:g=-2,deesser=i=0.4:m=0.5:f=0.5',
    'yue2-opening-warm.mp3': 'lowshelf=f=150:g=1.5,equalizer=f=3000:t=o:w=1.4:g=-4.5,highshelf=f=6000:g=-4,deesser=i=0.6:m=0.6:f=0.5',
}
for dst, chain in MASTERS.items():
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'{D}/yue2-opening.mp3', '-af', chain + ',loudnorm=I=-14.3:TP=-1.5:LRA=11,aresample=44100',
                    '-c:a', 'libmp3lame', '-q:a', '0', f'{D}/{dst}'], check=True)
if os.path.exists(f'{RAW}/opening-soft.flac'):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'{RAW}/opening-soft.flac', '-af', 'loudnorm=I=-14.3:TP=-1.5:LRA=11,aresample=44100',
                    '-c:a', 'libmp3lame', '-q:a', '0', f'{D}/yue2-opening-regen.mp3'], check=True)

names = [f'lyria-{k}.mp3' for k in BPM] + [f'yue2-{k}.mp3' for k in BPM] + [d for _, d, _ in jobs]
for n in names:
    if os.path.exists(f'{D}/{n}') and n[:-4] not in out['vocals']:
        m = measure(f'{D}/{n}')
        out['vocals'][n[:-4]] = {'vocal_db': m['vocal_db'], 'vocal_windows_pct': m['vocal_windows_pct']}
        print(n, out['vocals'][n[:-4]], flush=True)

json.dump(out, open(f'{D}/round2.json', 'w'), indent=1)
print('written round2.json')
