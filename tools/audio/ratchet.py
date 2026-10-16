"""Sounds are made only through tools/audio/make.py (art/SOUND.md, How a sound is made). A script elsewhere that builds
an audio generation (a Stable Audio 3 or YuE2 graph, a Lyria call, a ComfyUI SaveAudio node, or an import of the old
YuE2 builders music_inst, song_gen and yue2_music) is an old one: the baseline lists each with its count as the record
of what ran, and none may grow. A new file with one fails.
Part of npm run check.

    python3 tools/audio/ratchet.py              check
    python3 tools/audio/ratchet.py --baseline   rewrite the baseline from today's tree (read the diff)

Scanned: every tracked .py, .mjs and .js file outside legacy/, island/private/ and node_modules. Not counted:
tools/audio/ (the route itself), tools/rep.mjs (the Replicate runner and its price table) and this check's own files."""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BASELINE = os.path.join(HERE, 'ratchet-baseline.json')
PATTERN = re.compile(r"stable_audio_3|YuE2Generate|google/lyria|['\"]SaveAudio(?:MP3)?['\"]"
                     r"|\bimport (?:music_inst|song_gen2?|yue2_music)\b|\bfrom (?:music_inst|song_gen2?|yue2_music) import")
EXEMPT = ('tools/audio/', 'tools/rep.mjs')
SKIP = ('legacy/', 'island/private/', 'node_modules/')
ABOUT = ('Scripts outside tools/audio that build an audio generation, with their counts, as the record of what ran; '
         'nothing new goes here (tools/audio/ratchet.py). Make sounds with tools/audio/make.py.')


def counts(root=ROOT):
    files = subprocess.run(['git', '-C', root, 'ls-files', '-z', '--', '*.py', '*.mjs', '*.js'], capture_output=True, text=True).stdout
    out = {}
    for f in filter(None, files.split('\0')):
        if f.startswith(EXEMPT) or f.startswith(SKIP) or '/node_modules/' in f:
            continue
        try:
            n = len(PATTERN.findall(open(os.path.join(root, f), encoding='utf8', errors='replace').read()))
        except OSError:
            continue
        if n:
            out[f] = n
    return out


def findings(now, base):
    bad, notes = [], []
    for f, n in sorted(now.items()):
        if f not in base:
            bad.append(f'{f}: builds audio generations ({n}) outside tools/audio; make sounds with tools/audio/make.py and a preset')
        elif n > base[f]:
            bad.append(f'{f}: {n} audio generation calls, up from {base[f]}; old scripts only shrink (tools/audio/make.py)')
    for f, n in sorted(base.items()):
        if now.get(f, 0) < n:
            notes.append(f'{f}: now {now.get(f, 0)}, baseline {n}; lower it with --baseline')
    return bad, notes


if __name__ == '__main__':
    now = counts()
    if '--baseline' in sys.argv:
        json.dump({'about': ABOUT, 'files': now}, open(BASELINE, 'w'), indent=1)
        open(BASELINE, 'a').write('\n')
        print(f'wrote {os.path.relpath(BASELINE, ROOT)}: {len(now)} files')
        sys.exit(0)
    bad, notes = findings(now, json.load(open(BASELINE))['files'])
    for n in notes:
        print('note (audio scripts):', n)
    for b in bad:
        print('FAIL (audio scripts):', b)
    if not bad:
        print('audio scripts: ok')
    sys.exit(1 if bad else 0)
