"""The generator table: which generators may make which kind of sound, what each costs, and its licence. A preset
naming anything else is refused (tools/audio/presets.py). The rules behind the table are in art/SOUND.md, How a sound
is made. Standard library at import; each generator imports its own heavy modules when it runs.

A generator's make(job) writes <job.raw>.flac and returns the fields it adds to the take's sidecar. job is a dict:
kind, preset, v (the preset version), n (take number), seed, raw (path without extension), owner. describe(job) is
what --dry-run prints: exactly what would be sent."""
import importlib.util, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SR = 48000


def seed_for(v, n):
    s = v['settings']
    return int(s.get('seed', 1000)) + int(s.get('seed_step', 1)) * (n - 1)


def flac_from(src, dst):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-c:a', 'flac', dst], check=True)


# ---------- Lyria 2 (Replicate, paid) ----------
def lyria_input(job):
    v = job['v']
    inp = {'prompt': v['prompt'], 'seed': job['seed']}
    if v['settings'].get('negative_prompt'):
        inp['negative_prompt'] = v['settings']['negative_prompt']
    return inp


def lyria_make(job):
    wav = job['raw'] + '.wav'
    r = subprocess.run(['node', os.path.join(ROOT, 'tools/rep.mjs'), 'google/lyria-2', wav, json.dumps(lyria_input(job))],
                       capture_output=True, text=True, cwd=ROOT)
    if r.returncode:
        raise RuntimeError(r.stderr.strip()[-400:])
    flac_from(wav, job['raw'] + '.flac')
    os.remove(wav)
    return {'model': 'google/lyria-2 (Replicate)', 'input': lyria_input(job), 'cost_usd': GENERATORS['lyria-2']['cost']}


# ---------- YuE2 (local ComfyUI) ----------
def yue2_graph(job):
    import graphs
    v, s = job['v'], job['v']['settings']
    nar = {'all': True, 'even': job['n'] % 2 == 0}.get(s.get('nar', 'none'), False)
    return graphs.yue2(v['prompt'], s['lyrics'], v['length'] or 150, job['seed'], ckpt=graphs.CKPT[s.get('ckpt', 'bf16')],
                       ar_lora=graphs.AR_INST if s.get('instrumental') else None, nar_lora=graphs.NAR_V9 if nar else None,
                       prefix=f'audio/{job["preset"]}')


def yue2_describe(job):
    wf = yue2_graph(job)
    out = {'tags': job['v']['prompt'], 'lyrics': job['v']['settings']['lyrics'], 'seed': job['seed'],
           'checkpoint': wf['1']['inputs']['ckpt_name'], 'loras': [wf[k]['inputs']['lora_name'] for k in ('L1', 'L2') if k in wf],
           'max_s': wf['3']['inputs']['max_duration']}
    if job['kind'] == 'song':
        out['route'] = f'score first, instrumental bars trimmed ({job["v"]["settings"].get("keep")}), refused over {job["v"]["settings"].get("max_score_s", 65)} s, then audio for that score'
    return out


def yue2_make(job):
    import graphs
    wf = yue2_graph(job)
    s = job['v']['settings']
    info = {'model': 'YuE2 3B ' + s.get('ckpt', 'bf16') + ', mode full', **{k: v for k, v in yue2_describe(job).items() if k != 'lyrics'}}
    if job['kind'] != 'song':
        secs, abc = graphs.run(wf, job['raw'] + '.flac')
        open(job['raw'] + '.abc.txt', 'w').write(abc)
        return {**info, 'render_s': secs}
    # a song: the score first, its instrumental parts trimmed (no sung bar is ever cut), then audio for exactly it
    sys.path.insert(0, os.path.join(ROOT, 'tools/island_audio'))
    import song_gen2
    secs1, abc = graphs.run(graphs.score_only(wf))
    open(job['raw'] + '.abc.txt', 'w').write(abc)
    song_gen2.KEEP = {k: tuple(x) for k, x in (s.get('keep') or {}).items()}
    trimmed, seconds, bpm, cuts = song_gen2.trim(abc)
    open(job['raw'] + '.abc.trimmed.txt', 'w').write(trimmed)
    info.update({'score_s': round(seconds, 1), 'bpm': bpm, 'trim': cuts})
    if seconds > s.get('max_score_s', 65):
        raise RuntimeError(f'score runs {seconds:.0f} s, over max_score_s; kept without audio')
    secs2, _ = graphs.run(graphs.from_score(wf, trimmed, seconds + 2), job['raw'] + '.flac')
    return {**info, 'render_s': secs1 + secs2}


# ---------- Stable Audio 3 Medium (local ComfyUI) ----------
def sa3_describe(job):
    return {'prompt': job['v']['prompt'], 'seconds': job['v']['length'], 'seed': job['seed'],
            'sampler': 'lcm / simple, 8 steps, cfg 1'}


def sa3_make(job):
    import graphs
    secs, _ = graphs.run(graphs.sa3(job['v']['prompt'], job['v']['length'], job['seed'], prefix=f'audio/{job["preset"]}'), job['raw'] + '.flac')
    return {'model': 'stable_audio_3_medium + t5gemma_b_b_ul2', **sa3_describe(job), 'render_s': secs}


# ---------- offline synthesis (our own code) ----------
def synth_module(rel):
    spec = importlib.util.spec_from_file_location('synth_' + os.path.basename(rel)[:-3], os.path.join(ROOT, rel))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def synth_describe(job):
    s = job['v']['settings']
    return {'module': s['module'], 'sound': s['sound'], 'about': 'deterministic: every take of one version is the same'}


def synth_make(job):
    import numpy as np, soundfile as sf
    s = job['v']['settings']
    mod = synth_module(s['module'])
    y = np.asarray(mod.SOUNDS[s['sound']](), dtype=np.float64)
    if y.ndim == 1:
        y = np.stack([y, y], 1)
    if job['kind'] == 'sfx':   # trailing silence off (below -70 dB of the peak), as the synth scripts did
        a = np.abs(y).max(1)
        idx = np.where(a > a.max() * 10 ** (-70 / 20))[0]
        y = y[: idx[-1] + int(0.02 * mod.SR)]
    y = y / max(1e-9, np.abs(y).max()) * 0.9
    sf.write(job['raw'] + '.flac', y.astype(np.float32), mod.SR, subtype='PCM_24')
    return {'model': f'offline synthesis ({s["module"]}, {s["sound"]})', **synth_describe(job)}


# ---------- a CC0 sound pack ----------
def cc0_describe(job):
    s = job['v']['settings']
    return {'file': s['file'], 'pack': s['pack'], 'url': s['url'], 'licence': s['licence']}


def cc0_make(job):
    s = job['v']['settings']
    if 'CC0' not in s.get('licence', ''):
        raise RuntimeError('a pack sound needs settings.licence naming CC0, with its pack and url')
    flac_from(os.path.expanduser(s['file']), job['raw'] + '.flac')
    return {'model': 'CC0 pack', **cc0_describe(job)}


# ---------- a track Jørgen made himself and supplied (Suno) ----------
SUPPLIED = ('file', 'made_by', 'made_with', 'title', 'licence')


def supplied_describe(job):
    s = job['v']['settings']
    return {k: s.get(k) for k in SUPPLIED}


def supplied_make(job):
    s = job['v']['settings']
    missing = [k for k in SUPPLIED if not s.get(k)]
    if missing:
        raise RuntimeError('a supplied track needs settings ' + ', '.join(missing))
    src = os.path.join(ROOT, s['file'])
    if not s['file'].startswith('art/approved/') or not os.path.exists(src):
        raise RuntimeError(f'{s["file"]}: the original goes in art/approved/ (synced with tools/assets/sync.py)')
    flac_from(src, job['raw'] + '.flac')
    return {'model': f'supplied by {s["made_by"]} ({s["made_with"]})', **supplied_describe(job), 'licence': s['licence']}


GENERATORS = {
    'lyria-2': {'kinds': ('music',), 'gpu': False, 'cost': 0.12, 'deterministic': False, 'make': lyria_make,
                'describe': lambda job: {'model': 'google/lyria-2', 'input': lyria_input(job), 'length': 'about 33 s, fixed'},
                'licence': 'Google Lyria 2 through Replicate: output terms not settled (notes/licenses.md, item 6); SynthID watermark'},
    'yue2': {'kinds': ('music', 'song'), 'gpu': True, 'cost': 0, 'deterministic': False, 'make': yue2_make, 'describe': yue2_describe,
             'licence': 'YuE2, CC BY-NC 4.0: non-commercial, so a paid release cannot ship it (notes/licenses.md)'},
    'sa3': {'kinds': ('ambience', 'sfx'), 'gpu': True, 'cost': 0, 'deterministic': False, 'make': sa3_make, 'describe': sa3_describe,
            'licence': 'Stable Audio 3 Medium, Stability AI Community License (notes/licenses.md)'},
    'synth': {'kinds': ('ambience', 'sfx'), 'gpu': False, 'cost': 0, 'deterministic': True, 'make': synth_make, 'describe': synth_describe,
              'licence': 'our own code (offline synthesis), no third-party licence'},
    'cc0': {'kinds': ('sfx',), 'gpu': False, 'cost': 0, 'deterministic': True, 'make': cc0_make, 'describe': cc0_describe,
            'licence': 'CC0 1.0, pack and url in the preset'},
    'supplied': {'kinds': ('music',), 'gpu': False, 'cost': 0, 'deterministic': True, 'make': supplied_make, 'describe': supplied_describe,
                 'licence': 'a track Jørgen made and supplied; its tool and terms in the preset (settings.licence)'},
}
KINDS_OF = {k: g['kinds'] for k, g in GENERATORS.items()}
