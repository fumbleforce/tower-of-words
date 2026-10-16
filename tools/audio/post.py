"""The one post step every take goes through (tools/audio/make.py --post): screen, loop, level, encode.

  screen   music and songs: tools/audio/music_listen.py (key, tempo, CLAP against good and bad descriptions) and
           tools/audio/vocal_check.py (Demucs, CPU, in ~/ai/sep); ambience and sfx: tools/audio/score_sa3.py (CLAP
           against the prompt and against music, speech and footsteps; a bed's level spread, a one-shot's onset)
  loop     the preset's loop: cut where the music repeats (tools/audio/make_loop.py), or the whole take wrapped
           end into start; then the seam check (make_loop.seam_stats)
  level    to the preset's loudness (tools/audio/level.py)
  encode   the game file, art/production/audio/<round>/<take>.mp3, exactly as promote would install it; and the
           review file, art/candidates/<round>/<take>.mp3 (a loop plays once and then its first seconds again, so the
           join can be heard)
The numbers are a screen, not a verdict, and no agent picks: every take goes to Review."""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import level, make_loop

SR = make_loop.SR
PAD_S = 1.0          # a music game file: the loop body with a second of itself wrapped round each end (make_loop.py)
SEP_PY = os.path.expanduser('~/ai/sep/bin/python')


def measure_of(kind):
    return 'momentary max' if kind == 'sfx' else 'integrated'


def vocals(path, tag):
    """Demucs in its own venv; it caches stems by file name, so give it a name no other take has."""
    link = os.path.expanduser(f'~/.cache/audio-route/vocal/{tag}{os.path.splitext(path)[1]}')
    os.makedirs(os.path.dirname(link), exist_ok=True)
    if not os.path.exists(link):
        os.symlink(path, link)
    r = subprocess.run([SEP_PY, os.path.join(HERE, 'vocal_check.py'), link], capture_output=True, text=True)
    if r.returncode:
        return {'error': r.stderr.strip()[-300:]}
    v = json.loads(r.stdout.strip().splitlines()[-1])
    return {'vocal_db': v['vocal_db'], 'vocal_windows_pct': v['vocal_windows_pct']}


class Screen:
    """Loads CLAP once per --post run."""
    def __init__(self):
        self._clap = None

    @property
    def clap(self):
        if self._clap is None:
            from music_listen import Clap
            self._clap = Clap()
        return self._clap

    def music(self, path):
        import music_listen
        return music_listen.listen([path], self.clap)[os.path.basename(path)]

    def sound(self, y, prompt, bed):
        import score_sa3
        return score_sa3.screen(self.clap, y, SR, prompt, bed)


def process(rec, v, screen, root, gen_dir):
    """rec: the take's record in takes.json (kind, take, round, raw). v: its preset version. Returns the post fields."""
    kind, take, rnd = rec['kind'], rec['take'], rec['round']
    raw = rec['raw'] + '.flac'
    x = make_loop.load(raw)                       # 48 kHz stereo float
    out = {'seconds_raw': round(len(x) / SR, 2)}
    # screen
    if kind in ('music', 'song'):
        out['screen'] = screen.music(raw)
        out['vocal'] = vocals(raw, f'{rnd}-{take}')
    else:
        out['screen'] = screen.sound(x, v['prompt'], bed=kind == 'ambience')
    # loop
    loop, y = v.get('loop'), x.copy()
    if loop and loop.get('wrap'):
        y = level.fade_edges(y, SR, 0.02, 0.02)
        y = level.wrap_loop(y, SR, loop['fade'])
        out['loop'] = {'how': f'whole take, last {loop["fade"]} s crossfaded into the start', 'loop_s': round(len(y) / SR, 2)}
    elif loop:
        dur = len(x) / SR
        hi = min(loop['max'], dur - loop['fade'] - 0.5)
        if hi < loop['min']:
            raise RuntimeError(f'no loop: the take is {dur:.1f} s, too short for a {loop["min"]} s loop')
        a, b, dist = make_loop.find_points(x, loop['min'], hi, loop['fade'], loop.get('accept', 0.35))
        F = int(loop['fade'] * SR)
        y = x[a:b].copy()
        t = (np.arange(F) / F)[:, None]
        y[:F] = x[a:a + F] * np.sin(t * np.pi / 2) + x[b:b + F] * np.cos(t * np.pi / 2)
        out['loop'] = {'how': f'cut where it repeats, {loop["fade"]} s crossfade', 'from_s': round(a / SR, 2), 'to_s': round(b / SR, 2),
                       'loop_s': round(len(y) / SR, 2), 'seam_dist': round(dist, 3)}
    elif kind == 'sfx':
        y = level.fade_edges(y, SR, 0, 0.01)
        if len(y) < int(0.6 * SR):               # short files measure right
            y = np.concatenate([y, np.zeros((int(0.6 * SR) - len(y), 2))])
    # level
    m = measure_of(kind)
    y = level.set_level(y, SR, v['loudness'], m)
    # encode: the game file, then the review file
    game = os.path.join(root, gen_dir, rnd, f'{take}.mp3')
    review = os.path.join(root, 'art/candidates', rnd, f'{take}.mp3')
    if loop and not loop.get('wrap') and kind in ('music', 'song'):
        P = int(PAD_S * SR)
        level.encode(np.concatenate([y[-P:], y, y[:P]]), SR, game, ['-q:a', '0'])
        out['loop'].update({'loop_start': PAD_S, 'loop_end': round((P + len(y)) / SR, 6)})
        out['seam'] = make_loop.seam_stats(make_loop.load(game), P, P + len(y))
        again = y[:15 * SR].copy()
        again = level.fade_edges(again, SR, 0, min(3, len(again) / SR / 2))
        level.encode(np.concatenate([y, again]), SR, review, ['-q:a', '2'])
    elif loop:
        level.encode(y, SR, game, ['-b:a', '80k'])
        out['seam'] = {**make_loop.seam_stats(y, 0, len(y)), 'measured': 'on the loop before encoding'}
        again = level.fade_edges(y[:10 * SR].copy(), SR, 0, 2)
        level.encode(np.concatenate([y, again]), SR, review, ['-q:a', '2'])
    else:
        level.encode(y, SR, game, ['-b:a', '112k'] if kind == 'sfx' else ['-q:a', '0'])
        level.encode(y, SR, review, ['-q:a', '2'])
    I, M, P_ = level.ebur(game)
    out.update({'target_lufs': v['loudness'], 'measure': m, 'encoded_integrated': I, 'encoded_momentary_max': M, 'peak_dbfs': P_,
                'seconds': round(len(y) / SR, 2), 'kb': round(os.path.getsize(game) / 1024),
                'game_file': os.path.relpath(game, root), 'review_file': os.path.relpath(review, root)})
    return out


def flags(rec, v):
    """Plain facts from the numbers that a listener should know about (never a verdict)."""
    p, out = rec.get('post') or {}, []
    s, voc = p.get('screen') or {}, p.get('vocal') or {}
    if rec['kind'] == 'music' and voc.get('vocal_db') is not None and voc['vocal_db'] > -40:
        out.append(f'Demucs hears singing: vocal stem {voc["vocal_db"]} dB of the mix in {voc["vocal_windows_pct"]}% of it')
    if rec['kind'] in ('ambience', 'sfx'):
        for k in ('music', 'speech', 'steps'):
            if s.get(k) is not None and s.get('clap') is not None and s[k] > s['clap']:
                out.append(f'CLAP scores it closer to "{k}" ({s[k]}) than to its prompt ({s["clap"]})')
    seam = p.get('seam') or {}
    if seam.get('level_jump_db') is not None and seam['level_jump_db'] > max(3.0, seam.get('level_jump_p99_elsewhere', 0)):
        out.append(f'a {seam["level_jump_db"]} dB level jump at the loop point ({seam.get("level_jump_p99_elsewhere")} dB elsewhere)')
    if (p.get('loop') or {}).get('seam_dist', 0) > 0.45:
        out.append(f'loop point match {p["loop"]["seam_dist"]} (lower is better; music repeating itself is about 0.1)')
    return out


def numbers(rec):
    """One line of the numbers for the review card."""
    p = rec.get('post') or {}
    s, voc, lp, seam = p.get('screen') or {}, p.get('vocal') or {}, p.get('loop') or {}, p.get('seam') or {}
    bits = [f'{p.get("seconds")} s', f'level {p.get("encoded_integrated") if p.get("measure") == "integrated" else p.get("encoded_momentary_max")} LUFS ({p.get("measure")}, target {p.get("target_lufs")})']
    if 'key' in s:
        bits += [f'key {s["key"]}', f'tempo {s["tempo"]} BPM', f'CLAP good {s["good"]}, vocals {s["vocals"]}, noise {s["noise"]}, cheap {s["cheap"]}']
    elif s:
        bits.append('CLAP prompt {clap}, music {music}, speech {speech}, footsteps {steps}'.format(**s))
        if 'spread' in s: bits.append(f'level spread {s["spread"]} dB')
        if s.get('onset') is not None: bits.append(f'starts at {s["onset"]} s, lasts {s["active"]} s')
    if voc.get('vocal_db') is not None:
        bits.append(f'vocal stem {voc["vocal_db"]} dB of the mix')
    if lp:
        bits.append(f'loops every {lp["loop_s"]} s' + (f', loop point match {lp["seam_dist"]}' if 'seam_dist' in lp else ''))
    if seam:
        bits.append(f'level change at the loop point {seam["level_jump_db"]} dB ({seam["level_jump_p99_elsewhere"]} dB elsewhere)')
    return '; '.join(bits)
