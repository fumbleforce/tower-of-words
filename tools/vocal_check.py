"""Measure how much vocal is in a track: split it with Demucs (htdemucs_ft, two stems) on the CPU and compare
the vocal stem with the full mix. Run with ~/ai/sep/bin/python tools/vocal_check.py file.mp3 [...]
Prints: vocal energy relative to the mix (dB) and the share of 0.5 s windows where the vocal stem is
within 15 dB of the mix (a rough 'someone is singing' measure). Stems land in ~/ai/sep/out/."""
import sys, os, json, subprocess
import numpy as np, soundfile as sf

OUT = os.path.expanduser('~/ai/sep/out')


def stems(path):
    name = os.path.splitext(os.path.basename(path))[0]
    d = f'{OUT}/htdemucs_ft/{name}'
    if not os.path.exists(f'{d}/vocals.wav'):
        subprocess.run([os.path.expanduser('~/ai/sep/bin/python'), '-m', 'demucs', '-n', 'htdemucs_ft', '--two-stems', 'vocals',
                        '-d', 'cpu', '-o', OUT, path], check=True, capture_output=True)
    return f'{d}/vocals.wav', f'{d}/no_vocals.wav'


def measure(path):
    v, nv = stems(path)
    voc, sr = sf.read(v)
    rest, _ = sf.read(nv)
    voc, rest = voc.mean(1), rest.mean(1)
    mix = voc + rest
    ev, em = float((voc ** 2).sum()), float((mix ** 2).sum()) + 1e-12
    w = sr // 2
    n = len(mix) // w
    active = 0
    loud = 0
    for i in range(n):
        m = mix[i * w:(i + 1) * w]
        if np.sqrt((m ** 2).mean()) < 1e-3:
            continue
        loud += 1
        if (voc[i * w:(i + 1) * w] ** 2).mean() > (m ** 2).mean() * 10 ** (-15 / 10):
            active += 1
    return {'file': os.path.basename(path), 'vocal_db': round(10 * np.log10(ev / em + 1e-12), 1),
            'vocal_windows_pct': round(100 * active / max(loud, 1), 1), 'no_vocals': nv}


if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(json.dumps(measure(p)), flush=True)
