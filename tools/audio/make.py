"""Make sounds: the one route for music, songs, ambience and sound effects (art/SOUND.md, How a sound is made).

    tools/audio/make.py <kind> <preset> --round <round> --takes N --owner <session>/<agent> [--version V] [--dry-run] [--paid] [--post]
    tools/audio/make.py post --round <round> [--again]
    tools/audio/make.py promote <round>/<take> <name> [--picked "<where Jørgen picked it>"] [--dry-run]

make: takes N new takes of a preset (tools/audio/presets/<kind>/<preset>.json, its latest version unless --version).
  kind is music, song, ambience or sfx. The preset's generator must be in the table for that kind
  (tools/audio/generators.py); anything else is refused. --dry-run prints exactly what would be sent and what it costs,
  and makes nothing. A paid generator (Lyria 2) also needs --paid; tools/rep.mjs logs the cost in tools/spend.json.
  A GPU generator takes the GPU lock as --owner and starts and stops ComfyUI itself.
  Writes, per take <preset>-<n>: the raw FLAC and a sidecar JSON in ~/ai/audio-raw/<round>/, a record in
  art/candidates/<round>/takes.json (committed), and a line in art/production/audio-log.jsonl (local, in the main
  checkout). Seeds are the preset's seed + seed_step * (n - 1), so a take can be made again.
post (or --post after make): the shared post step (tools/audio/post.py) for every take not yet posted (--again: all),
  then reviews/<round>/review.json with every take, failed ones included. No agent picks: each card says
  "Not listened to by an agent".
promote: installs a take Jørgen picked as game3d/audio/<music|amb|sfx>/<name>.mp3 through
  node tools/assets/live.mjs promote --review <round> (--replace when the name exists), and writes its loop region to
  game3d/audio/music/loops.json or its levels to game3d/audio/sfx/levels.json. The pick is read from
  reviews/<round>/feedback.json; --picked records one he made elsewhere. Songs are prototypes and are not promoted.

Runs in ~/ai/tts-bench/.venv (numpy, soundfile, librosa, pyloudnorm, torch, transformers); started with another
python, it re-runs itself there. Demucs runs in ~/ai/sep."""
import argparse, datetime, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VENV = os.path.expanduser('~/ai/tts-bench/.venv/bin/python')
RAW_ROOT = os.path.expanduser('~/ai/audio-raw')
GEN_DIR = 'art/production/audio'        # game-ready files, in the generated area (notes/asset-lifecycle.md)
ROUND = re.compile(r'^[a-z0-9][a-z0-9-]*$')
LIVE_DIR = {'music': 'game3d/audio/music', 'ambience': 'game3d/audio/amb', 'sfx': 'game3d/audio/sfx'}
LOOPS = 'game3d/audio/music/loops.json'
LEVELS = 'game3d/audio/sfx/levels.json'
NOT_HEARD = 'Not listened to by an agent.'

sys.path.insert(0, HERE)
import presets
from generators import GENERATORS, seed_for


def now():
    return datetime.datetime.now().astimezone().isoformat(timespec='seconds')


def main_checkout():
    r = subprocess.run(['git', '-C', ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir'], capture_output=True, text=True)
    return os.path.dirname(r.stdout.strip()) if r.returncode == 0 else ROOT


def log(event):
    path = os.path.join(main_checkout(), 'art/production/audio-log.jsonl')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'a') as f:
        f.write(json.dumps({'t': now(), **event}, ensure_ascii=False) + '\n')


def takes_path(rnd):
    return os.path.join(ROOT, 'art/candidates', rnd, 'takes.json')


def load_takes(rnd):
    p = takes_path(rnd)
    if os.path.exists(p):
        return json.load(open(p))
    if os.path.isdir(os.path.dirname(p)) and os.listdir(os.path.dirname(p)):
        raise SystemExit(f'art/candidates/{rnd}/ exists and was not made by make.py; pick a new round name')
    return {'round': rnd, 'about': 'Every take of this round (tools/audio/make.py). Raw files: ~/ai/audio-raw/<round>/.', 'takes': {}}


def save_takes(rnd, data):
    p = takes_path(rnd)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    data['takes'] = dict(sorted(data['takes'].items(), key=lambda kv: (kv[1]['preset'], kv[1]['n'])))
    with open(p, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')


# ---------- make ----------
def make(a):
    if not a.round or not ROUND.match(a.round):
        raise SystemExit('--round <round>: lower case, digits and hyphens (a new name per round)')
    if not a.owner or '/' not in a.owner and ':' not in a.owner:
        raise SystemExit('--owner <session>/<agent>, such as claude-main/audio-route (shown as Made by)')
    pre, v = presets.version(a.kind, a.preset, a.version)
    problems = presets.problems(a.kind, pre, f'{a.preset}.json', {k: g['kinds'] for k, g in GENERATORS.items()})
    if problems:
        raise SystemExit('refused: ' + '; '.join(problems))
    gen = GENERATORS[v['generator']]
    data = load_takes(a.round)
    have = [t['n'] for t in data['takes'].values() if t['preset'] == a.preset]
    count = a.takes
    if gen['deterministic'] and count > 1:
        print(f'{v["generator"]} is deterministic: one take is enough, making 1', flush=True)
        count = 1
    jobs = []
    for n in range(max(have, default=0) + 1, max(have, default=0) + 1 + count):
        take = f'{a.preset}-{n}'
        jobs.append({'kind': a.kind, 'preset': a.preset, 'v': v, 'n': n, 'seed': None if gen['deterministic'] else seed_for(v, n), 'take': take,
                     'raw': os.path.join(RAW_ROOT, a.round, take), 'owner': a.owner})
    cost = gen['cost'] * len(jobs)
    head = f'{a.kind}/{a.preset}@v{v["v"]} via {v["generator"]}: {len(jobs)} take(s), round {a.round}, ' + (f'about ${cost:.2f}' if cost else 'no cost')
    if a.dry_run:
        print(head)
        print('  use:', v['use'])
        if v.get('context'): print('  context:', v['context'])
        print('  loop:', json.dumps(v['loop']), '| loudness:', v['loudness'], 'LUFS', '| licence:', gen['licence'])
        for j in jobs:
            print(f'  {j["take"]} ->', os.path.join(RAW_ROOT, a.round, j['take'] + '.flac'))
            print('   ', json.dumps(gen['describe'](j), ensure_ascii=False))
        return
    if cost and not a.paid:
        raise SystemExit(f'{head}. A paid generator: run again with --paid once the cost is agreed (GUIDE, Budget).')
    print(head, flush=True)
    os.makedirs(os.path.join(RAW_ROOT, a.round), exist_ok=True)

    def one(j):
        rec = {'take': j['take'], 'round': a.round, 'kind': a.kind, 'preset': a.preset, 'version': v['v'], 'n': j['n'],
               'generator': v['generator'], 'seed': j['seed'], 'owner': a.owner, 'made': now(), 'raw': j['raw'],
               'licence': gen['licence'], 'use': v['use']}
        t0 = time.time()
        try:
            rec.update(gen['make'](j))
            rec['status'] = 'made'
        except SystemExit:
            raise
        except Exception as e:
            rec.update({'status': 'failed', 'error': str(e)[-600:]})
        rec['seconds_to_make'] = round(time.time() - t0, 1)
        with open(j['raw'] + '.json', 'w') as f:
            json.dump({**rec, 'prompt': v['prompt'], 'settings': v['settings']}, f, ensure_ascii=False, indent=1)
        data['takes'][j['take']] = rec
        save_takes(a.round, data)
        log({'event': rec['status'], **{k: rec[k] for k in ('round', 'take', 'kind', 'preset', 'version', 'generator', 'seed', 'owner')},
             'cost_usd': gen['cost'], **({'error': rec['error']} if 'error' in rec else {})})
        print(j['take'], rec['status'], rec.get('error', ''), flush=True)

    if gen['gpu']:
        import comfy, graphs
        with comfy.gpu(a.owner, 'render'):
            started = graphs.up()
            try:
                for j in jobs:
                    one(j)
            finally:
                graphs.down(started)
    else:
        for j in jobs:
            one(j)
    if a.post:
        post(a)


# ---------- post and review ----------
def post(a):
    import post as step
    data = load_takes(a.round)
    screen = step.Screen()
    for take, rec in data['takes'].items():
        if rec['status'] != 'made' and not (a.again and rec['status'] == 'posted'):
            continue
        _, v = presets.version(rec['kind'], rec['preset'], rec['version'])
        try:
            rec['post'] = step.process(rec, v, screen, ROOT, GEN_DIR)
            rec['status'] = 'posted'
            rec.pop('post_error', None)
        except Exception as e:
            rec['post_error'] = str(e)[-600:]
        save_takes(a.round, data)
        log({'event': 'posted' if 'post_error' not in rec else 'post failed', 'round': a.round, 'take': take,
             **({'error': rec['post_error']} if 'post_error' in rec else {})})
        print(take, rec['status'], rec.get('post_error', ''), flush=True)
    write_review(a.round, data, getattr(a, 'owner', None))


def write_review(rnd, data, owner):
    import post as step
    path = os.path.join(ROOT, 'reviews', rnd, 'review.json')
    old = json.load(open(path)) if os.path.exists(path) else None
    if old and old.get('status') != 'open':
        print(f'reviews/{rnd}/review.json is {old.get("status")}; not rewritten')
        return
    options, missing, kinds, owners = [], [], set(), set()
    for take, rec in data['takes'].items():
        kinds.add(rec['kind']); owners.add(rec['owner'])
        _, v = presets.version(rec['kind'], rec['preset'], rec['version'])
        head = f'{v["use"]} {rec["kind"]}/{rec["preset"]}@v{rec["version"]}, {rec["generator"]}' + (f', seed {rec["seed"]}.' if rec["seed"] is not None else '.')
        if rec['status'] != 'posted':
            missing.append(f'{take}: {head} No audio to play: {rec.get("error") or rec.get("post_error") or "not posted yet"}')
            continue
        fl = step.flags(rec, v)
        note = ' '.join([head, f'Prompt: "{v["prompt"]}".' if v['generator'] != 'synth' else f'Made by {v["settings"]["module"]} ({v["settings"]["sound"]}).',
                         f'Measured: {step.numbers(rec)}.', ('Flags: ' + '; '.join(fl) + '.') if fl else '', NOT_HEARD])
        options.append({'id': take, 'label': take, 'audio': rec['post']['review_file'], 'note': re.sub(r'\s+', ' ', note).strip()})
    kinds_s = ', '.join(sorted(kinds))
    context = [f'Every take of round {rnd} ({kinds_s}), made by tools/audio/make.py, failed ones included. Nobody has listened to them: '
               'the numbers on each card are a screen, not a verdict.',
               'A loop plays once and then its first seconds again, so you can hear the join.']
    if missing:
        context.append('Takes with nothing to play: ' + ' | '.join(missing))
    review = {'title': f'Sounds, round {rnd}', 'date': datetime.date.today().isoformat(), 'by': ', '.join(sorted(owners)) or (owner or ''),
              'status': 'open', 'context': context,
              'question': 'Which of these takes fit? Pick the ones you want, reject the others, and say what is wrong with any you reject.',
              'multi': True, 'options': options}
    if old:
        review['updated'] = now()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(review, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'wrote reviews/{rnd}/review.json: {len(options)} take(s) to play, {len(missing)} without audio')


# ---------- promote ----------
def promote(a):
    rnd, _, take = a.take.partition('/')
    if not take:
        raise SystemExit('promote <round>/<take> <name>')
    data = load_takes(rnd)
    rec = data['takes'].get(take) or sys.exit(f'{rnd}/{take}: no such take in art/candidates/{rnd}/takes.json')
    if rec['kind'] == 'song':
        raise SystemExit('songs are prototypes (YuE2, non-commercial) until the licence is settled; nothing installs them')
    if rec['status'] != 'posted':
        raise SystemExit(f'{rnd}/{take}: not posted; run make.py post --round {rnd}')
    fb = os.path.join(ROOT, 'reviews', rnd, 'feedback.json')
    picked = take in (json.load(open(fb)).get('picked', []) if os.path.exists(fb) else [])
    if not picked and not a.picked:
        raise SystemExit(f'{take} is not picked in reviews/{rnd}/feedback.json; agents never pick (pass --picked "<where he picked it>")')
    game = rec['post']['game_file']
    if not os.path.exists(os.path.join(ROOT, game)):
        raise SystemExit(f'{game} is missing in this checkout; run make.py post --round {rnd} --again here first')
    if not re.match(r'^[a-z0-9][a-z0-9_-]*$', a.name):
        raise SystemExit('name: the game name, lower case (e.g. bed_harbour, night)')
    dest = f'{LIVE_DIR[rec["kind"]]}/{a.name}.mp3'
    note = (f'{rec["kind"]}/{rec["preset"]}@v{rec["version"]} ({rec["generator"]}' + (f', seed {rec["seed"]}' if rec["seed"] is not None else '') + f'), take {rnd}/{take}'
            f'{"" if picked else ", picked " + a.picked}; licence: {rec["licence"]}')
    cmd = ['node', 'tools/assets/live.mjs', 'promote', game, dest, '--round', rnd, '--review', rnd, '--note', note]
    if os.path.exists(os.path.join(ROOT, dest)):
        cmd.append('--replace')
    if a.dry_run:
        print(' '.join(cmd), flush=True)
        subprocess.run(cmd + ['--dry-run'], cwd=ROOT, check=True)
        return
    subprocess.run(cmd, cwd=ROOT, check=True)
    p = rec['post']
    if rec['kind'] == 'music':
        loops = json.load(open(os.path.join(ROOT, LOOPS)))
        loops[a.name] = {'start': p['loop']['loop_start'], 'end': p['loop']['loop_end']}
        write_json(LOOPS, loops)
    else:
        levels = json.load(open(os.path.join(ROOT, LEVELS)))
        levels[a.name] = {'target_lufs': p['target_lufs'], 'measure': p['measure'], 'encoded_integrated': p['encoded_integrated'],
                          'encoded_momentary_max': p['encoded_momentary_max'], 'peak_dbfs': p['peak_dbfs'], 'seconds': p['seconds'],
                          'kb': p['kb'], 'source': note}
        write_json(LEVELS, levels)
    rec['promoted'] = {'as': dest, 'at': now(), **({'picked': a.picked} if not picked else {})}
    save_takes(rnd, data)
    log({'event': 'promoted', 'round': rnd, 'take': take, 'as': dest})
    print(f'next: python3 tools/assets/sync.py push, then commit tools/assets/live.json, the lock file, '
          f'{LOOPS if rec["kind"] == "music" else LEVELS} and art/candidates/{rnd}/takes.json')


def write_json(rel, value):
    with open(os.path.join(ROOT, rel), 'w') as f:
        json.dump(value, f, indent=1)
        f.write('\n')


def main(argv):
    try:
        import numpy, pyloudnorm  # noqa: F401
    except ImportError:
        if os.path.exists(VENV) and os.path.realpath(sys.executable) != os.path.realpath(VENV):
            os.execv(VENV, [VENV, os.path.abspath(__file__), *argv])
        if argv and argv[0] not in ('promote',) and '--dry-run' not in argv:
            raise SystemExit(f'needs numpy and pyloudnorm: run with {VENV}')
    cmd = argv[0] if argv else ''
    ap = argparse.ArgumentParser(prog='tools/audio/make.py', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    if cmd == 'post':
        ap.add_argument('cmd'); ap.add_argument('--round', required=True); ap.add_argument('--again', action='store_true')
        ap.add_argument('--owner')
        post(ap.parse_args(argv))
    elif cmd == 'promote':
        ap.add_argument('cmd'); ap.add_argument('take'); ap.add_argument('name')
        ap.add_argument('--picked'); ap.add_argument('--dry-run', action='store_true')
        promote(ap.parse_args(argv))
    elif cmd in presets.KINDS:
        ap.add_argument('kind', choices=presets.KINDS); ap.add_argument('preset')
        ap.add_argument('--round'); ap.add_argument('--takes', type=int, default=1); ap.add_argument('--owner')
        ap.add_argument('--version', type=int); ap.add_argument('--dry-run', action='store_true')
        ap.add_argument('--paid', action='store_true'); ap.add_argument('--post', action='store_true')
        a = ap.parse_args(argv)
        a.again = False
        make(a)
    else:
        print(__doc__)
        sys.exit(1 if cmd else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
