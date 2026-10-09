"""Round 3 music (#371), after tools/music_round3.py: for every take, measure vocals (tools/vocal_check.py, Demucs on
the CPU), cut the loop the game would play (tools/make_loop.py), set it to -20 LUFS with one linear gain, and write
the loop body once through as art/candidates/music-3/<take>.mp3 for the Review item. Results: results.json there.

    ~/ai/sep/bin/python tools/music_round3_post.py
"""
import io, json, os, re, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_loop, vocal_check

RAW = os.path.expanduser('~/ai/music-raw/r3')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'art/candidates/music-3')


def lufs(y, sr):
    buf = io.BytesIO()
    sf.write(buf, y, sr, format='WAV', subtype='FLOAT')
    err = subprocess.run(['ffmpeg', '-v', 'info', '-f', 'wav', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                         input=buf.getvalue(), capture_output=True).stderr.decode()
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])


def main():
    os.makedirs(OUT, exist_ok=True)
    takes = json.load(open(f'{RAW}/takes.json'))
    res_path = f'{OUT}/results.json'
    res = json.load(open(res_path)) if os.path.exists(res_path) else {}
    for name, t in takes.items():
        if name in res:
            continue
        src = f'{RAW}/{name}.flac'
        voc = vocal_check.measure(src)
        x = make_loop.load(src)
        dur = len(x) / make_loop.SR
        a, b, dist = make_loop.find_points(x, min_s=dur * 0.6, max_s=dur - 8, fade_s=2.0)
        F = int(2.0 * make_loop.SR)
        y = x[a:b].copy()
        w = (np.arange(F) / F)[:, None]
        y[:F] = x[a:a + F] * np.sin(w * np.pi / 2) + x[b:b + F] * np.cos(w * np.pi / 2)
        level = lufs(y, make_loop.SR)
        y = y * 10 ** ((-20 - level) / 20)
        peak = float(np.abs(y).max())
        if peak > 0.98:
            y *= 0.98 / peak
        buf = io.BytesIO()
        sf.write(buf, y, make_loop.SR, format='WAV', subtype='FLOAT')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'wav', '-i', '-', '-c:a', 'libmp3lame', '-q:a', '2',
                        f'{OUT}/{name}.mp3'], input=buf.getvalue(), check=True)
        res[name] = {**t, 'vocal_db': voc['vocal_db'], 'vocal_windows_pct': voc['vocal_windows_pct'],
                     'loop_from_s': round(a / make_loop.SR, 2), 'loop_to_s': round(b / make_loop.SR, 2),
                     'loop_s': round(len(y) / make_loop.SR, 1), 'seam_dist': round(dist, 3), 'source_lufs': level}
        json.dump(res, open(res_path, 'w'), indent=1)
        print(name, json.dumps({k: res[name][k] for k in ('vocal_db', 'loop_s', 'seam_dist')}), flush=True)


if __name__ == '__main__':
    main()
