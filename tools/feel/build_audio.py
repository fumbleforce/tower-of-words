"""Remake game3d's effects and ambience beds from their sources, levelled and encoded as the game plays them.
What each live sound is, its loudness target and its source come from its preset: the sfx and ambience presets in
tools/audio/presets/ with a "live" name (the latest version). Its audio is the picked Stable Audio take
(tools/feel/picks.json: raw file stem, start s, end s or None; raw takes in ~/ai/feel-audio/raw/) or, for a synth
preset, the synth output (~/ai/feel-audio/synth/<name>.wav from the module the preset names).
Levelling, the beds' 3 s loop crossfade and the encoded-file measurement are tools/audio/level.py, as in
tools/audio/make.py --post. New sounds go through tools/audio/make.py and its promote; this script remakes the old set.
Writes game3d/audio/sfx/<name>.mp3, game3d/audio/amb/<name>.mp3 and game3d/audio/sfx/levels.json.
Run: ~/ai/tts-bench/.venv/bin/python tools/feel/build_audio.py [name ...]"""
import os, json, subprocess, sys
import numpy as np, soundfile as sf, librosa

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools/audio'))
import level, presets

SYN = os.path.expanduser('~/ai/feel-audio/synth')
RAW = os.path.expanduser('~/ai/feel-audio/raw')
SFX = f'{REPO}/game3d/audio/sfx'
AMB = f'{REPO}/game3d/audio/amb'
SR = 44100

# In-game loudness reference points: voices about -20 LUFS (Mio -17 at 0.75 gain), music -20.5 in the file at bus gain
# 0.2, so about -34.5 in the game (-42 under a voice). Interface sounds sit clearly under the voices, beds under the music.
LIVE = {}   # live name -> (kind, preset id, version)
for kind, pre in presets.every():
    v = pre['versions'][-1]
    if kind in ('sfx', 'ambience') and v.get('live'):
        LIVE[v['live']] = (kind, pre['id'], v)
TARGET = {name: v['loudness'] for name, (_, _, v) in LIVE.items()}
BEDS = {name for name, (kind, _, _) in LIVE.items() if kind == 'ambience'}
PICKS = json.load(open(os.path.join(os.path.dirname(__file__), 'picks.json')))


def load(name):
    kind, pid, v = LIVE[name]
    if v['generator'] == 'sa3':
        stem, a, b = PICKS[name]
        y, sr = sf.read(f'{RAW}/{stem}.flac', always_2d=True)
        y = y[int(a * sr): int(b * sr) if b else None]
        src = f'Stable Audio 3 Medium, local ({stem}, {a}-{b or "end"} s); preset {kind}/{pid}@v{v["v"]}'
    else:
        p = f'{SYN}/{name}.wav'
        if not os.path.exists(p): return None, None, None
        y, sr = sf.read(p, always_2d=True)
        src = f'synthesised ({v["settings"]["module"]}); preset {kind}/{pid}@v{v["v"]}'
    if y.shape[1] == 1: y = np.repeat(y, 2, 1)
    if sr != SR: y = librosa.resample(y.T, orig_sr=sr, target_sr=SR).T; sr = SR
    return y, sr, src


if __name__ == '__main__':
    os.makedirs(SFX, exist_ok=True); os.makedirs(AMB, exist_ok=True)
    only = set(sys.argv[1:])
    levels = json.load(open(f'{SFX}/levels.json')) if os.path.exists(f'{SFX}/levels.json') else {}
    for name, tgt in TARGET.items():
        if only and name not in only: continue
        y, sr, src = load(name)
        if y is None: print('missing', name); continue
        bed = name in BEDS
        if bed:
            y = level.wrap_loop(level.fade_edges(y, sr, 0.02, 0.02), sr)
        else:
            y = level.fade_edges(y, sr, 0, 0.01)
            if len(y) < int(0.6 * sr): y = np.concatenate([y, np.zeros((int(0.6 * sr) - len(y), 2))])   # short files measure right
        y = level.set_level(y, sr, tgt, 'integrated' if bed else 'momentary max')
        out = f'{AMB if bed else SFX}/{name}.mp3'
        level.encode(y, sr, out, ['-b:a', '80k' if bed else '112k'])
        I, M, P = level.ebur(out)
        levels[name] = {'target_lufs': tgt, 'measure': 'integrated' if bed else 'momentary max', 'encoded_integrated': I, 'encoded_momentary_max': M,
                        'peak_dbfs': P, 'seconds': round(len(y) / sr, 2), 'kb': round(os.path.getsize(out) / 1024), 'source': src}
        print(f'{name:14s} target {tgt:6.1f}  I {I}  Mmax {M}  peak {P}  {levels[name]["kb"]} KB  {src}')
    json.dump(levels, open(f'{SFX}/levels.json', 'w'), indent=1)
