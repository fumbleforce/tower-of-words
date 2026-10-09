"""Round 4 music (#371), after tools/music_round4.py: screen every piece and cut the loop the game would play.

Per piece: tools/music_listen.py (key, tempo, levels, CLAP scores, also per 10 s window), tools/vocal_check.py
(Demucs, CPU), then tools/make_loop.py finds the loop: the longest stretch whose end sounds like its start (at least
half the piece, skipping the ending Lyria writes; seam score up to 0.45 accepted), crossfaded over 3 s. The body is set to -20 LUFS with one gain.
Writes, in art/candidates/music-4/: <piece>.mp3 (the loop once through and its first 15 s again, for the Review item), <piece>-loop.mp3 (the
game file: the body with 1 s of itself wrapped around each end) and results.json (all numbers, the seam check).

    [MUSIC_ROUND=5] ~/ai/sd/venv/bin/python tools/music_round4_post.py [piece ...]
"""
import io, json, os, re, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_loop, music_listen

ROUND = os.environ.get('MUSIC_ROUND', '4')  # MUSIC_ROUND=5 for round 5 (tools/music_round5.py)
RAW = os.path.expanduser(f'~/ai/music-raw/r{ROUND}')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), f'art/candidates/music-{ROUND}')
SR = make_loop.SR


def wav_bytes(y):
    buf = io.BytesIO()
    sf.write(buf, y, SR, format='WAV', subtype='FLOAT')
    return buf.getvalue()


def lufs(y):
    err = subprocess.run(['ffmpeg', '-v', 'info', '-f', 'wav', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                         input=wav_bytes(y), capture_output=True).stderr.decode()
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])


def mp3(y, path, q):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'wav', '-i', '-', '-c:a', 'libmp3lame', '-q:a', q, path],
                   input=wav_bytes(y), check=True)


def vocals(path):
    # Demucs runs in its own venv (~/ai/sep); tools/vocal_check.py prints one JSON line per file
    # vocal_check caches Demucs stems by file name, so give it a name no earlier round used
    link = os.path.expanduser(f'~/.cache/music371/r{ROUND}v/r{ROUND}-{os.path.basename(path)}')
    os.makedirs(os.path.dirname(link), exist_ok=True)
    if not os.path.exists(link):
        os.symlink(path, link)
    r = subprocess.run([os.path.expanduser('~/ai/sep/bin/python'), os.path.join(os.path.dirname(__file__), 'vocal_check.py'), link],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout.strip().splitlines()[-1])


def main():
    os.makedirs(OUT, exist_ok=True)
    rp = f'{OUT}/results.json'
    res = json.load(open(rp)) if os.path.exists(rp) else {}
    files = sorted(f for f in os.listdir(RAW) if f.endswith('.mp3'))
    want = sys.argv[1:]
    clap = music_listen.Clap()
    prompts = json.load(open(f'{RAW}/prompts.json'))
    for f in files:
        name = f[:-4]
        if (want and name not in want) or (not want and name in res):
            continue
        src = f'{RAW}/{f}'
        m = music_listen.listen([src], clap)[f]
        v = vocals(src)
        x = make_loop.load(src)
        dur = len(x) / SR
        a, b, dist = make_loop.find_points(x, min_s=dur * 0.5, max_s=dur - 6, fade_s=3.0, accept=0.45)
        F = int(3.0 * SR)
        y = x[a:b].copy()
        t = (np.arange(F) / F)[:, None]
        y[:F] = x[a:a + F] * np.sin(t * np.pi / 2) + x[b:b + F] * np.cos(t * np.pi / 2)
        level = lufs(y)
        y *= 10 ** ((-20 - level) / 20)
        pk = float(np.abs(y).max())
        if pk > 0.97:
            y *= 0.97 / pk
        # the Review file: the loop once, then its first 15 s again (fading out), so the join can be heard
        rep = y[:15 * SR].copy()
        rep[-3 * SR:] *= np.linspace(1, 0, 3 * SR)[:, None]
        mp3(np.concatenate([y, rep]), f'{OUT}/{name}.mp3', '2')
        P = SR
        mp3(np.concatenate([y[-P:], y, y[:P]]), f'{OUT}/{name}-loop.mp3', '0')
        z = make_loop.load(f'{OUT}/{name}-loop.mp3')
        seam = make_loop.seam_stats(z, P, P + len(y))
        res[name] = {**prompts.get(name, {}), 'source_s': round(dur, 1), 'listen': m,
                     'vocal_db': v['vocal_db'], 'vocal_windows_pct': v['vocal_windows_pct'],
                     'loop_from_s': round(a / SR, 2), 'loop_to_s': round(b / SR, 2), 'loop_s': round(len(y) / SR, 1),
                     'loop_start': 1.0, 'loop_end': round((P + len(y)) / SR, 6), 'seam_dist': round(dist, 3),
                     'seam': seam, 'source_lufs': level}
        json.dump(res, open(rp, 'w'), indent=1)
        print(name, json.dumps({'loop_s': res[name]['loop_s'], 'seam_dist': res[name]['seam_dist'], 'vocal_db': v['vocal_db'],
                                'key': m['key'], **{k: m[k] for k in m if k.startswith('worst_')}}), flush=True)


if __name__ == '__main__':
    main()
