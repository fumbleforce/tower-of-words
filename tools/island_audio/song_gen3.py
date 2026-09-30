"""Karaoke song, new lyrics (legacy/island/content/lyrics_v2.md, two versions): takes with the settings of the two takes Jørgen liked.
- "a1" settings: okiro-a1's tags (lyrics.md), int8 checkpoint, seed 175001, the same score and music samplers.
- "e1" settings: okiro-e1's tags ("Japanese, " ... ", clear diction"), int8 checkpoint, seed 176101, the same samplers.
Both are made the round-2 way (song_gen2.py): the score first, trimmed (4-bar intro, no interlude, 4-bar outro), then audio for exactly
that score, so the whole song is sung (okiro-a1 itself was cut off at 85 s, which was a flaw of round 1, not a setting).
Versions and their YuE2 lyric blocks come from ~/ai/island-audio/song/v2/versions.json (written by lyrics_v2.py).
Raw: ~/ai/island-audio/song/raw/<take>.flac|.abc.txt|.abc.edit.txt, log in raw/log.json. Take ids: okiro2<version>-<a1|e1>[-s<n>].
Needs ComfyUI and the GPU lock. Usage: ~/ai/sd/venv/bin/python tools/island_audio/song_gen3.py [--extra N] [take ...]"""
import sys, os, re, json, time, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy
from song_gen import RAW, INT8, TAGS_A, TAGS_B, workflow
from song_gen2 import post_wait, trim

V2 = os.path.expanduser('~/ai/island-audio/song/v2/versions.json')
SETTINGS = {'a1': (TAGS_A, INT8, 175001), 'e1': (TAGS_B, INT8, 176101)}


def abc_only(tags, lyrics, seed, ckpt):
    wf = workflow(tags, lyrics, 10, seed, ckpt)
    return {k: wf[k] for k in ('1', '2', 'P')}


def music_from(tags, lyrics, abc, seconds, seed, ckpt):
    wf = workflow(tags, lyrics, seconds, seed, ckpt)
    del wf['2'], wf['P']
    wf['3']['inputs']['abc'] = abc
    wf['8']['inputs']['filename_prefix'] = 'island/okiro2'
    return wf


TOK = re.compile(r'("[^"]*")|([_=^]*[a-gA-G][,\']*|z|Z)(\d*)(/?\d*)(-?)|(\|)')
SMALL = set('ゃゅょぁぃぅぇぉゎ')


def sung_notes(abc):
    """Sung notes in the score's Vocal voice, ties merged (as song_build.score_notes counts them)."""
    voice, tied, n = None, False, 0
    for line in abc.splitlines():
        if line.startswith('V:'):
            voice = 'V' if 'Vocal' in line else 'I'
            continue
        if voice != 'V' or line.startswith(('%', 'X:', 'T:', 'M:', 'L:', 'Q:', 'K:')):
            continue
        for m in TOK.finditer(line):
            chord, sym, num, frac, tie, bar = m.groups()
            if chord or bar or sym == 'Z':
                continue
            if sym != 'z':
                if not tied:
                    n += 1
                tied = bool(tie)
            else:
                tied = False
    return n


def morae_of(spec):
    return sum(1 for _, _, ws in spec['lines'] for w in ws for ch in w[1] if ch not in SMALL)


def takes(extra=0):
    vs = json.load(open(V2))
    out = {}
    for v, spec in vs.items():
        for name, (tags, ckpt, seed) in SETTINGS.items():
            out[f'okiro2{v}-{name}'] = (v, spec['lyrics'], tags, ckpt, seed, name)
            for k in range(1, extra + 1):  # more seeds with the same settings
                out[f'okiro2{v}-{name}-s{k + 1}'] = (v, spec['lyrics'], tags, ckpt, seed + 100 * k, name)
    return out


def render(name, v, lyrics, tags, ckpt, seed, setting, note=''):
    log_p = f'{RAW}/log.json'
    info = {'lyrics_version': v, 'settings_of': 'okiro-' + setting, 'tags': tags, 'checkpoint': ckpt, 'seed': seed,
            'method': 'score first, trimmed, then audio (song_gen3.py, new lyrics)' + note, 'lyrics': lyrics,
            'sampler': 'dpm_2 / sgm_uniform, 32 steps, cfg 1', 'abc': 'temperature 0.7, top_p 0.9, top_k 30',
            'music': 'temperature 1.0, top_p 0.95, top_k 100, repetition_penalty 1.2'}
    try:
        abc = open(f'{RAW}/{name}.abc.txt').read()
        edited, secs, bpm, tlog = trim(abc)
        open(f'{RAW}/{name}.abc.edit.txt', 'w').write(edited)
        info.update({'bpm_score': bpm, 'score_seconds': round(secs, 1), 'trim': tlog, 'max_duration': round(secs + 2, 1),
                     'sung_notes': sung_notes(edited)})
        print(name, 'score', bpm, 'bpm', round(secs, 1), 's;', '; '.join(tlog), flush=True)
        outs, s2 = post_wait(music_from(tags, lyrics, edited, secs + 2, seed, ckpt))
        for n in outs.values():
            for a in n.get('audio', []):
                q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a['subfolder'], 'type': a['type']})
                open(f'{RAW}/{name}.flac', 'wb').write(comfy._get('/view?' + q))
        info['music_s'] = s2
        print('ok', name, s2, 's', flush=True)
    except Exception as e:
        info['error'] = str(e)[:1500]
        print('FAIL', name, str(e)[:600], flush=True)
    stats = json.load(open(log_p)) if os.path.exists(log_p) else {}
    stats[name] = info
    json.dump(stats, open(log_p, 'w'), ensure_ascii=False, indent=1)


def score(name, lyrics, tags, ckpt, seed):
    if not os.path.exists(f'{RAW}/{name}.abc.txt'):
        outs, _ = post_wait(abc_only(tags, lyrics, seed, ckpt))
        open(f'{RAW}/{name}.abc.txt', 'w').write(next(''.join(n['text']) for n in outs.values() if 'text' in n))
    return sung_notes(trim(open(f'{RAW}/{name}.abc.txt').read())[0])


if __name__ == '__main__':
    tries = int(sys.argv[sys.argv.index('--tries') + 1]) if '--tries' in sys.argv else 3
    vs = json.load(open(V2))
    sampled = {}
    for v, spec in vs.items():
        need = morae_of(spec) - 3  # っ, ん and a held note or two may share; fewer notes than this can't carry every line
        for setting, (tags, ckpt, seed) in SETTINGS.items():
            name = f'okiro2{v}-{setting}'
            n = score(name, spec['lyrics'], tags, ckpt, seed)
            print(name, 'score has', n, 'sung notes for', need + 3, 'morae', flush=True)
            if not os.path.exists(f'{RAW}/{name}.flac'):
                render(name, v, spec['lyrics'], tags, ckpt, seed, setting)
            if n >= need:
                continue
            # the exact seed's score is too short for the last chorus: try the next seeds, same tags and settings
            for k in range(1, tries + 1):
                s2 = seed + 1000 * k
                name2 = f'okiro2{v}-{setting}-s{s2}'
                n2 = score(name2, spec['lyrics'], tags, ckpt, s2)
                sampled[name2] = n2
                print(name2, 'score has', n2, 'sung notes', flush=True)
                if n2 >= need:
                    if not os.path.exists(f'{RAW}/{name2}.flac'):
                        render(name2, v, spec['lyrics'], tags, ckpt, s2, setting,
                               f'; seed {s2}: seed {seed} wrote a score too short for the last chorus')
                    break
    json.dump(sampled, open(os.path.expanduser('~/ai/island-audio/song/v2/sampled_scores.json'), 'w'), indent=1)
    print('done', flush=True)
