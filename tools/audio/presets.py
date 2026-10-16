"""Audio presets: tools/audio/presets/<kind>/<id>.json, one file per preset, its versions in order. A version is never
rewritten: a change is a new version appended to the list (art/SOUND.md, How a sound is made). Standard library only,
so the check runs in npm run check.

A preset file:
  {"id": "<id>", "kind": "music|song|ambience|sfx", "versions": [{...}, ...]}
A version:
  v          1, 2, ... in order
  date, by   when and who wrote it (<session>/<agent>)
  note       where the words came from, or what changed and why (the take or review that showed the need)
  generator  a name from tools/audio/generators.py for this kind; anything else is refused
  prompt     what is heard, in plain words (the generator's text; for synth and cc0 the description CLAP checks against)
  settings   the generator's own fields (seed, seed_step, tags, lyrics, model files, module and sound, ...)
  length     seconds asked for, or null when the generator decides
  loop       null, {"min", "max", "fade"} (cut where the music repeats; "accept" optional) or {"wrap": true, "fade"}
             (the whole take, its end crossfaded into its start)
  loudness   target LUFS in the game: integrated for music, songs and ambience, the loudest 400 ms for sfx
  use        where it plays and what for
  live       the game file it was made for (sfx/<live>.mp3, amb/<live>.mp3, music/<live>.mp3), or absent
  context    songs only: who sings it, where and when

    python3 tools/audio/presets.py            check every preset, and that no committed version was rewritten
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DIR = os.path.join(HERE, 'presets')
KINDS = ('music', 'song', 'ambience', 'sfx')
ID = re.compile(r'^[a-z0-9][a-z0-9_-]*$')
FIELDS = {'v', 'date', 'by', 'note', 'generator', 'prompt', 'settings', 'length', 'loop', 'loudness', 'use', 'live', 'context'}
NEEDED = ('v', 'date', 'by', 'generator', 'prompt', 'settings', 'length', 'loop', 'loudness', 'use')


def path_of(kind, pid):
    return os.path.join(DIR, kind, f'{pid}.json')


def load(kind, pid):
    p = path_of(kind, pid)
    if not os.path.exists(p):
        raise SystemExit(f'no preset {kind}/{pid} ({os.path.relpath(p, ROOT)})')
    return json.load(open(p))


def version(kind, pid, v=None):
    """The preset's version v, or its latest. Returns (preset, version dict)."""
    pre = load(kind, pid)
    vs = pre['versions']
    if v is None:
        return pre, vs[-1]
    for x in vs:
        if x['v'] == int(v):
            return pre, x
    raise SystemExit(f'{kind}/{pid} has no version {v}')


def every():
    """(kind, preset) for every preset file."""
    for kind in KINDS:
        d = os.path.join(DIR, kind)
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if f.endswith('.json'):
                yield kind, json.load(open(os.path.join(d, f)))


def problems(kind, pre, fname, kinds_of):
    out = []
    where = f'presets/{kind}/{fname}'
    if pre.get('id') != fname[:-5] or not ID.match(pre.get('id', '')):
        out.append(f'{where}: "id" must be the file name, lower case')
    if pre.get('kind') != kind:
        out.append(f'{where}: "kind" must be {kind}, the folder it is in')
    vs = pre.get('versions') or []
    if not vs:
        out.append(f'{where}: no versions')
    for i, v in enumerate(vs):
        at = f'{where} v{v.get("v", "?")}'
        if v.get('v') != i + 1:
            out.append(f'{at}: versions are numbered 1, 2, ... in order')
        out += [f'{at}: missing "{k}"' for k in NEEDED if k not in v]
        out += [f'{at}: unknown field "{k}"' for k in v if k not in FIELDS]
        gen = v.get('generator')
        if gen not in kinds_of:
            out.append(f'{at}: generator "{gen}" is not in the table (tools/audio/generators.py)')
        elif kind not in kinds_of[gen]:
            out.append(f'{at}: generator "{gen}" is not allowed for {kind} (allowed: {", ".join(kinds_of[gen])})')
        if kind == 'song' and not (v.get('context') or '').strip():
            out.append(f'{at}: a song needs "context": who sings it, where and when')
        loop = v.get('loop')
        if loop is not None and not (isinstance(loop, dict) and 'fade' in loop and (loop.get('wrap') or {'min', 'max'} <= set(loop))):
            out.append(f'{at}: "loop" is null, {{"min", "max", "fade"}} or {{"wrap": true, "fade"}}')
        if not isinstance(v.get('loudness'), (int, float)):
            out.append(f'{at}: "loudness" is a number (LUFS)')
    return out


def committed(rel, ref):
    r = subprocess.run(['git', '-C', ROOT, 'show', f'{ref}:{rel}'], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None


def rewritten(ref):
    """Versions that differ from the same version at ref (main by default): never rewrite one, append a new one."""
    out = []
    for kind, pre in every():
        rel = f'tools/audio/presets/{kind}/{pre["id"]}.json'
        old = committed(rel, ref)
        if not old:
            continue
        new = {v['v']: v for v in pre.get('versions', [])}
        for v in old.get('versions', []):
            if new.get(v['v']) != v:
                out.append(f'{rel} v{v["v"]}: changed or removed since {ref}; add a new version instead')
    return out


def check(ref=None):
    from generators import KINDS_OF
    out, seen, lives = [], {}, {}
    for kind in KINDS:
        d = os.path.join(DIR, kind)
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if not f.endswith('.json'):
                continue
            pre = json.load(open(os.path.join(d, f)))
            out += problems(kind, pre, f, KINDS_OF)
            pid = pre.get('id')
            if pid in seen:
                out.append(f'presets/{kind}/{f}: id "{pid}" is also presets/{seen[pid]}/ (take ids are <preset>-<n>, so ids are unique)')
            seen[pid] = kind
            live = (pre.get('versions') or [{}])[-1].get('live')
            if live:
                key = ('music' if kind in ('music', 'song') else kind, live)
                if key in lives:
                    out.append(f'presets/{kind}/{f}: live "{live}" is also {lives[key]}')
                lives[key] = f'presets/{kind}/{f}'
    if ref is None:
        r = subprocess.run(['git', '-C', ROOT, 'merge-base', 'HEAD', 'main'], capture_output=True, text=True)
        ref = r.stdout.strip() or 'HEAD'
    return out + rewritten(ref)


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    bad = check(sys.argv[1] if len(sys.argv) > 1 else None)
    for b in bad:
        print('FAIL (audio presets):', b)
    if not bad:
        print('audio presets: ok')
    sys.exit(1 if bad else 0)
