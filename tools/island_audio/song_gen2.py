"""Karaoke song 「起きろ！」, round 2: the score first, then audio for exactly that score, trimmed.
Round 1 (song_gen.py, max_duration 85 s) showed why: YuE2's own ABC score for these sparse lyrics runs about 190 s (a 13-bar intro,
a 16-bar interlude, a 20-bar outro, 4 to 6 bars per lyric line at 170 BPM), so a fixed 85 s cut the song off after the first chorus.
Here each take: (1) YuE2GenerateABC alone writes the score; (2) the score's instrumental parts are shortened (trim(): the intro keeps
its last 4 bars, the interlude keeps only sung bars, the outro keeps everything up to its last sung bar plus 4 bars; no bar with a sung
note is cut, because the model's section names don't follow the lyrics: okiro-e1's last chorus was in its "outro", and the first
version of this trim, which cut the outro to 4 bars, lost it); (3) YuE2GenerateMusic renders the trimmed score with max_duration =
its length + 2 s. Raw: ~/ai/island-audio/song/raw/<take>.flac, <take>.abc.txt (as written) and
<take>.abc.edit.txt (as rendered). Needs ComfyUI and the GPU lock. Usage: ~/ai/sd/venv/bin/python tools/island_audio/song_gen2.py [take ...]"""
import sys, os, re, time, json, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy
from song_gen import RAW, INT8, BF16, TAGS_A, TAGS_B, LYRICS, workflow

TAKES = {
    'okiro-d1': (TAGS_A, INT8, 176001),
    'okiro-d2': (TAGS_A, INT8, 176002),
    'okiro-e1': (TAGS_B, INT8, 176101),
    'okiro-d3': (TAGS_A, INT8, 176003),
    'okiro-e2': (TAGS_B, INT8, 176102),
    'okiro-d4': (TAGS_A, INT8, 176004),
}
KEEP = {'intro': ('last', 4), 'interlude': ('drop', 0), 'outro': ('first', 4)}


def abc_only(tags, seed, ckpt):
    wf = workflow(tags, LYRICS, 10, seed, ckpt)
    return {k: wf[k] for k in ('1', '2', 'P')}


def music_from(tags, abc, seconds, seed, ckpt):
    wf = workflow(tags, LYRICS, seconds, seed, ckpt)
    del wf['2'], wf['P']
    wf['3']['inputs']['abc'] = abc
    return wf


def post_wait(wf, timeout=3600):
    pid = comfy._post('/prompt', {'prompt': wf})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(comfy._get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages', []))[-1500:])
            return hist[pid]['outputs'], round(time.time() - t0)
        time.sleep(3)
    raise TimeoutError(pid)


def bars_of(line):
    """Split one voice line into bars, expanding multi-bar rests (Z4 = four empty bars)."""
    out = []
    for b in [x for x in line.split('|') if x.strip()]:
        m = re.fullmatch(r'\s*Z(\d*)\s*', b)
        if m:
            out += ['z16'] * int(m.group(1) or 1)
        else:
            out.append(b)
    return out


def parse(abc):
    head, sections, cur, voice = [], [], None, None
    for line in abc.splitlines():
        if line.startswith('%'):
            cur = {'name': line[1:].strip(), 'V': [], 'I': []}
            sections.append(cur)
        elif line.startswith('V: Vocal') and cur is not None:
            voice = 'V'
        elif line.startswith('V: Ins') and cur is not None:
            voice = 'I'
        elif cur is None:
            head.append(line)
        elif voice and line.strip():
            cur[voice] += bars_of(line)
    return head, sections


def render(head, sections):
    out = list(head)
    for s in sections:
        out.append(f'% {s["name"]}')
        n = max(len(s['V']), len(s['I']))
        V = s['V'] + ['z16'] * (n - len(s['V']))
        I = s['I'] + ['z16'] * (n - len(s['I']))
        for i in range(0, n, 4):
            out.append('V: Vocal')
            out.append('|'.join(V[i:i + 4]) + '|')
            out.append('V: Ins')
            out.append(ins_line(I[i:i + 4]))
    return '\n'.join(out) + '\n'


def ins_line(bars):
    """Write leading empty bars the way the model does: Z4| for a whole line of rest, Z3|<bar>| for three and a bar."""
    k = 0
    while k < len(bars) and bars[k].strip() == 'z16':
        k += 1
    if k >= 2:
        return '|'.join([f'Z{k}'] + bars[k:]) + '|'
    return '|'.join(bars) + '|'


def has_voice(bar):
    """A bar with a sung note in it (chord symbols and rests don't count)."""
    return bool(re.search(r'[a-gA-G]', re.sub(r'"[^"]*"', '', bar)))


def trim(abc):
    """Shorten the instrumental parts only. The model's section names don't follow the lyrics (okiro-e1 sang its last chorus in
    what its score calls the outro), so no bar with a sung note is ever cut: the intro keeps its last 4 bars and any sung pickup, the
    interlude keeps only its sung bars, and the outro keeps everything up to its last sung bar plus 4 bars."""
    head, sections = parse(abc)
    kept, log = [], []
    for s in sections:
        rule = KEEP.get(s['name'])
        n = max(len(s['V']), len(s['I']))
        V = s['V'] + ['z16'] * (n - len(s['V']))
        I = s['I'] + ['z16'] * (n - len(s['I']))
        sung = [i for i in range(n) if has_voice(V[i])]
        if rule is None:
            kept.append(s)
            log.append(f'{s["name"]} {n} bars kept')
            continue
        how, k = rule
        if how == 'last':    # intro
            idx = sorted(set(range(max(0, n - k), n)) | set(sung))
        elif how == 'drop':  # interlude
            idx = sung
        else:                # outro
            last = max(sung) if sung else -1
            idx = list(range(0, min(n, last + 1 + k)))
        if not idx:
            log.append(f'{s["name"]} {n} bars dropped')
            continue
        s2 = {'name': s['name'], 'V': [V[i] for i in idx], 'I': [I[i] for i in idx]}
        if how == 'first' and s2['V'] and idx[-1] < n - 1:
            s2['V'][-1] = s2['V'][-1].rstrip('-')
        kept.append(s2)
        log.append(f'{s["name"]} {n} bars -> {len(idx)}' + (f' ({len(sung)} sung)' if sung else ''))
    bpm = int(re.search(r'Q:1/4=(\d+)', abc).group(1))
    bars = sum(max(len(s['V']), len(s['I'])) for s in kept)
    return render(head, kept), bars * 4 * 60 / bpm, bpm, log


def vocal_bars(abc):
    """Sections of the score with their bar counts, and how many bars carry sung notes."""
    head, sections = parse(abc)
    secs = [(x['name'], max(len(x['V']), len(x['I']))) for x in sections]
    sung = sum(1 for x in sections for b in x['V'] if re.search(r'[a-gA-G]', re.sub(r'"[^"]*"', '', b)))
    return secs, sung


def sample_scores(n, tags, ckpt, seed0):
    """Write n scores only (about 2 min each) and keep the ones that leave room for all 20 lines; returns [(seed, sung bars, sections)]."""
    out = []
    for k in range(n):
        seed = seed0 + k
        name = f'okiro-s{seed}'
        p = f'{RAW}/{name}.abc.txt'
        if not os.path.exists(p):
            outs, _ = post_wait(abc_only(tags, seed, ckpt))
            open(p, 'w').write(next(''.join(x['text']) for x in outs.values() if 'text' in x))
        secs, sung = vocal_bars(open(p).read())
        out.append((seed, sung, secs))
        print('score', seed, 'sung bars', sung, secs, flush=True)
    return out


if __name__ == '__main__':
    if '--sample' in sys.argv:
        # python song_gen2.py --sample 6: score-only rejection sampling; the ones with room for every line get rendered as okiro-f*
        n = int(sys.argv[sys.argv.index('--sample') + 1])
        res = sample_scores(n, TAGS_A, INT8, 177001)
        # 20 lines at about two bars each: a score with fewer than 40 sung bars runs out before the last chorus (okiro-d1 had 34)
        good = sorted([r for r in res if 40 <= r[1] <= 56], key=lambda r: abs(r[1] - 44))[:2]
        for i, (seed, sung, secs) in enumerate(good):
            TAKES[f'okiro-f{i + 1}'] = (TAGS_A, INT8, seed)
            src, dst = f'{RAW}/okiro-s{seed}.abc.txt', f'{RAW}/okiro-f{i + 1}.abc.txt'
            if not os.path.exists(dst):
                open(dst, 'w').write(open(src).read())
        sys.argv = [sys.argv[0]] + [f'okiro-f{i + 1}' for i in range(len(good))]
        if not good:
            print('no score with room for every line', flush=True)
            sys.exit(0)
    only = sys.argv[1:]
    log_p = f'{RAW}/log.json'
    stats = json.load(open(log_p)) if os.path.exists(log_p) else {}
    for name, (tags, ckpt, seed) in TAKES.items():
        if (only and name not in only) or os.path.exists(f'{RAW}/{name}.flac'):
            continue
        info = {'tags': tags, 'checkpoint': ckpt, 'seed': seed, 'method': 'score first, trimmed, then audio (song_gen2.py)',
                'sampler': 'dpm_2 / sgm_uniform, 32 steps, cfg 1', 'abc': 'temperature 0.7, top_p 0.9, top_k 30',
                'music': 'temperature 1.0, top_p 0.95, top_k 100, repetition_penalty 1.2'}
        try:
            if not os.path.exists(f'{RAW}/{name}.abc.txt'):
                outs, s1 = post_wait(abc_only(tags, seed, ckpt))
                abc = next(''.join(n['text']) for n in outs.values() if 'text' in n)
                open(f'{RAW}/{name}.abc.txt', 'w').write(abc)
                info['abc_s'] = s1
            abc = open(f'{RAW}/{name}.abc.txt').read()
            edited, secs, bpm, tlog = trim(abc)
            open(f'{RAW}/{name}.abc.edit.txt', 'w').write(edited)
            info.update({'bpm_score': bpm, 'score_seconds': round(secs, 1), 'trim': tlog, 'max_duration': round(secs + 2, 1)})
            print(name, 'score', bpm, 'bpm', round(secs, 1), 's;', '; '.join(tlog), flush=True)
            outs, s2 = post_wait(music_from(tags, edited, secs + 2, seed, ckpt))
            for n in outs.values():
                for a in n.get('audio', []):
                    q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a['subfolder'], 'type': a['type']})
                    open(f'{RAW}/{name}.flac', 'wb').write(comfy._get('/view?' + q))
            info['music_s'] = s2
            print('ok', name, s2, 's', flush=True)
        except Exception as e:
            info['error'] = str(e)[:1500]
            print('FAIL', name, str(e)[:1500], flush=True)
        stats[name] = info
        json.dump(stats, open(log_p, 'w'), ensure_ascii=False, indent=1)
    print('done', flush=True)
