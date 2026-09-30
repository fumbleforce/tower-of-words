"""Karaoke song 「起きろ！」: stems, checks, timings and the game export, for every YuE2 take in ~/ai/island-audio/song/raw/.
Per take:
  1. Demucs htdemucs_ft, two stems (CPU): the backing track (no_vocals) and the guide vocal (vocals).
  2. Whisper large-v3-turbo on the vocal stem, free transcription with phrase timestamps: which lyric lines were sung, and whether the
     commands can be heard (lyrics.md: 光れ must read as ひかれ, 来い as こい, 忘れろ as わすれろ).
  3. The lyrics are aligned to that transcription on kana (edit distance), which gives each line a window; inside its window each line's
     kana reading is force-aligned with Whisper (teacher forcing, DTW over the cross-attention of the model's alignment heads), which
     gives a start time per kana. Starts are snapped to onsets of the vocal stem within 80 ms. Morae group into words, words into lines.
  4. The beat grid comes from the score's tempo (the take's ABC) with its phase fitted to librosa beats of the backing track.
Writes ~/ai/island-audio/song/<take>/analysis.json and legacy/proto2/island-audio/media/song/<take>-{mix,backing,vocal}.mp3; then picks the
best take and exports legacy/island/godot/assets/audio/song/okiro_{full,backing,vocal}.ogg, okiro_timing.json, okiro_song.json and
music/wake_sting.ogg. Run: DEV=cuda ~/ai/tts-bench/.venv/bin/python tools/island_audio/song_build.py [take ...]"""
import json, os, re, sys, glob, subprocess, warnings
warnings.filterwarnings('ignore')
import numpy as np, librosa, soundfile as sf, torch, pykakasi
from scipy.ndimage import median_filter

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = os.path.expanduser('~/ai/island-audio/song')
RAW = f'{W}/raw'
SEP = f'{W}/sep'
PAGE = f'{REPO}/legacy/proto2/island-audio/media/song'
GAME = f'{REPO}/legacy/island/godot/assets/audio/song'
DEV = os.environ.get('DEV', 'cuda' if torch.cuda.is_available() else 'cpu')
MODEL = 'openai/whisper-large-v3-turbo'
kks = pykakasi.kakasi()

# (section, English, words); a word: (surface, reading, dictionary key or None, catchable)
P = ('、', '', None, False)
X = ('！', '', None, False)
LYRICS = [
    ('verse', 'Wake up, wake up', [('起きろ', 'おきろ', '起きる', True), P, ('起きろ', 'おきろ', '起きる', True)]),
    ('verse', "It's morning, already eight", [('朝', 'あさ', None, False), ('だ', 'だ', None, False), P, ('もう', 'もう', None, False), ('八時', 'はちじ', None, False)]),
    ('verse', 'Do it fast (hurry up)', [('早く', 'はやく', '早い', False), ('しろ', 'しろ', 'する', True)]),
    ('verse', 'The train is coming', [('電車', 'でんしゃ', None, False), ('が', 'が', None, False), ('来る', 'くる', '来る', False)]),
    ('pre-chorus', 'Run, run', [('走れ', 'はしれ', '走る', True), P, ('走れ', 'はしれ', '走る', True)]),
    ('pre-chorus', "Look at what's ahead", [('前', 'まえ', None, False), ('を', 'を', None, False), ('見ろ', 'みろ', '見る', True)]),
    ('pre-chorus', "Don't stop, not now", [('止まるな', 'とまるな', '止まる', True), P, ('今', 'いま', None, False), ('は', 'は', None, False)]),
    ('pre-chorus', 'Go!', [('行け', 'いけ', '行く', True), X]),
    ('chorus', 'Shine, shine', [('光れ', 'ひかれ', '光る', True), P, ('光れ', 'ひかれ', '光る', True)]),
    ('chorus', 'In the morning sky', [('朝', 'あさ', None, False), ('の', 'の', None, False), ('空', 'そら', None, False), ('に', 'に', None, False)]),
    ('chorus', 'Come, tomorrow', [('来い', 'こい', '来る', True), P, ('明日', 'あした', None, False)]),
    ('chorus', 'By your voice', [('君', 'きみ', None, False), ('の', 'の', None, False), ('声', 'こえ', None, False), ('で', 'で', None, False)]),
    ('bridge', 'Stand up, one more time', [('立て', 'たて', '立つ', True), P, ('もう', 'もう', None, False), ('一回', 'いっかい', None, False)]),
    ('bridge', 'Yesterday: forget it', [('昨日', 'きのう', None, False), ('は', 'は', None, False), P, ('忘れろ', 'わすれろ', '忘れる', True)]),
    ('bridge', "Don't cry, sing", [('泣くな', 'なくな', '泣く', True), P, ('歌え', 'うたえ', '歌う', True)]),
    ('bridge', 'Let your voice out', [('声', 'こえ', None, False), ('を', 'を', None, False), ('出せ', 'だせ', '出す', True)]),
    ('chorus', 'Shine, shine', [('光れ', 'ひかれ', '光る', True), P, ('光れ', 'ひかれ', '光る', True)]),
    ('chorus', 'Morning and night', [('朝', 'あさ', None, False), ('も', 'も', None, False), P, ('夜', 'よる', None, False), ('も', 'も', None, False)]),
    ('chorus', 'Come, tomorrow', [('来い', 'こい', '来る', True), P, ('明日', 'あした', None, False)]),
    ('chorus', 'Go!', [('行け', 'いけ', '行く', True), X]),
]
MUST_HEAR = {'光れ', '来い', '忘れろ'}
LYRICS_V1, MUST_V1 = LYRICS, MUST_HEAR
V2 = os.path.expanduser('~/ai/island-audio/song/v2/versions.json')


def use_lyrics(take):
    """Takes of the new lyrics (okiro2<version>-...) are analysed against their own lines (lyrics_v2.py writes them)."""
    global LYRICS, MUST_HEAR
    LYRICS, MUST_HEAR = LYRICS_V1, MUST_V1
    if take.startswith('okiro2') and os.path.exists(V2):
        v = take[len('okiro2'):].split('-')[0]
        spec = json.load(open(V2)).get(v)
        if spec:
            LYRICS = [(sec, en, [tuple(w) for w in words]) for sec, en, words in spec['lines']]
            MUST_HEAR = set(spec.get('must_hear', []))
SMALL = set('ゃゅょぁぃぅぇぉゎ')


def morae(kana):
    out = []
    for ch in kana:
        if ch in SMALL and out:
            out[-1] += ch
        else:
            out.append(ch)
    return out


def line_jp(words):
    return ''.join(w[0] for w in words)


def line_kana(words):
    return ''.join(w[1] for w in words)


DIG = '〇一二三四五六七八九'


def kanjinum(m):
    n = int(m.group()); out = ''
    for v, u in ((1000, '千'), (100, '百'), (10, '十')):
        d, n = divmod(n, v)
        if d:
            out += (DIG[d] if d > 1 else '') + u
    return out + (DIG[n] if n else '') or '〇'


def hira(s):
    s = re.sub(r'\d+', kanjinum, s.translate(str.maketrans('０１２３４５６７８９', '0123456789')))
    s = re.sub(r'[\s、。，．・！？!?…「」『』（）()～〜\-—.,♪]', '', s)
    return ''.join(x['hira'] for x in kks.convert(s)).replace('ー', '')


KANJI = r'[\u4e00-\u9fff々]'


def lyric_readings():
    """Readings of the lyrics' kanji, taken from the lyrics themselves (君の声で + きみのこえで gives 君 = きみ, 声 = こえ)."""
    out = {}
    for _, _, words in LYRICS:
        for w in words:
            s_, rd = w[0], w[1]
            if not rd or not re.search(KANJI, s_):
                continue
            out[s_] = rd
            parts = re.findall(KANJI + r'+|[^\u4e00-\u9fff々]+', s_)
            pat = ''.join('(.+?)' if re.match(KANJI, p_) else re.escape(p_) for p_ in parts)
            mm = re.fullmatch(pat, rd)
            if mm:
                for k, r_ in zip([p_ for p_ in parts if re.match(KANJI, p_)], mm.groups()):
                    out.setdefault(k, r_)
    return out


def hira_asr(text):
    """Whisper's text in kana, reading its kanji the way the lyrics do (pykakasi turns 君 into くん and 一人 into いちにん)."""
    rd = lyric_readings()
    text = re.sub(r'\d+', kanjinum, text.translate(str.maketrans('０１２３４５６７８９', '0123456789')))
    for k in sorted(rd, key=len, reverse=True):
        text = text.replace(k, rd[k])
    return hira(text)


# ---------- stems ----------
def stems(take):
    d = f'{SEP}/htdemucs_ft/{take}'
    if not os.path.exists(f'{d}/vocals.wav'):
        subprocess.run([os.path.expanduser('~/ai/sep/bin/python'), '-m', 'demucs', '-n', 'htdemucs_ft', '--two-stems', 'vocals',
                        '-d', 'cpu', '-j', '4', '-o', SEP, f'{RAW}/{take}.flac'], check=True, capture_output=True)
    return f'{d}/vocals.wav', f'{d}/no_vocals.wav'


# ---------- whisper ----------
_M = {}


def whisper():
    if not _M:
        from transformers import WhisperForConditionalGeneration, WhisperProcessor, WhisperTokenizer, pipeline
        dt = torch.float16 if DEV != 'cpu' else torch.float32
        _M['proc'] = WhisperProcessor.from_pretrained(MODEL)
        _M['tok'] = WhisperTokenizer.from_pretrained(MODEL)
        _M['model'] = WhisperForConditionalGeneration.from_pretrained(MODEL, dtype=dt, attn_implementation='eager').to(DEV).eval()
        _M['asr'] = pipeline('automatic-speech-recognition', model=_M['model'], tokenizer=_M['proc'].tokenizer,
                             feature_extractor=_M['proc'].feature_extractor, device=DEV, dtype=dt)
        _M['dt'] = dt
    return _M


def transcribe(y):
    o = whisper()['asr']({'raw': y, 'sampling_rate': 16000}, return_timestamps='word', chunk_length_s=30, batch_size=1,
                         generate_kwargs={'language': 'ja', 'task': 'transcribe'})
    chunks = []
    for c in o['chunks']:
        a, b = c['timestamp']
        chunks.append({'text': c['text'].strip(), 'start': float(a), 'end': float(b if b is not None else a + 1.0)})
    return o['text'], chunks


def _byte_map():
    bs = list(range(ord('!'), ord('~') + 1)) + list(range(ord('¡'), ord('¬') + 1)) + list(range(ord('®'), ord('ÿ') + 1))
    cs, n = bs[:], 0
    for b in range(256):
        if b not in bs:
            bs.append(b); cs.append(256 + n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}


BYTE_DEC = _byte_map()  # GPT-2 byte-level BPE: token characters back to bytes


def dtw(x):
    N, M = x.shape
    cost = np.full((N + 1, M + 1), np.inf)
    trace = -np.ones((N + 1, M + 1), dtype=np.int8)
    cost[0, 0] = 0
    for j in range(1, M + 1):
        for i in range(1, N + 1):
            a, b, c = cost[i - 1, j - 1], cost[i - 1, j], cost[i, j - 1]
            if a < b and a < c:
                cost[i, j], trace[i, j] = x[i - 1, j - 1] + a, 0
            elif b < a and b < c:
                cost[i, j], trace[i, j] = x[i - 1, j - 1] + b, 1
            else:
                cost[i, j], trace[i, j] = x[i - 1, j - 1] + c, 2
    trace[0, :] = 2
    trace[:, 0] = 1
    i, j, path = N, M, []
    while i > 0 or j > 0:
        path.append((i - 1, j - 1))
        t = trace[i, j]
        if t == 0:
            i, j = i - 1, j - 1
        elif t == 1:
            i -= 1
        else:
            j -= 1
    path = np.array(path[::-1]).T
    return path[0], path[1]


def force_align(y, kana):
    """Start time (s, relative to y) of every character of `kana`, by teacher-forced Whisper and DTW over the alignment heads."""
    M = whisper()
    tok, model = M['tok'], M['model']
    y = y[:16000 * 30]
    feats = M['proc'].feature_extractor(y, sampling_rate=16000, return_tensors='pt').input_features.to(DEV, M['dt'])
    sot = tok.convert_tokens_to_ids(['<|startoftranscript|>', '<|ja|>', '<|transcribe|>', '<|notimestamps|>'])
    ids = tok.encode(kana, add_special_tokens=False)
    dec = torch.tensor([sot + ids + [tok.eos_token_id]], device=DEV)
    with torch.no_grad():
        out = model(input_features=feats, decoder_input_ids=dec, output_attentions=True)
    heads = model.generation_config.alignment_heads
    w = torch.stack([out.cross_attentions[l][0, h] for l, h in heads]).float()
    nf = max(2, int(len(y) / 320))
    w = w[:, :, :nf]
    w = (w - w.mean(dim=-2, keepdim=True)) / (w.std(dim=-2, keepdim=True, unbiased=False) + 1e-6)
    w = torch.tensor(median_filter(w.cpu().numpy(), size=(1, 1, 7)))
    mat = w.mean(0)[len(sot):-1].numpy()
    ti, tj = dtw(-mat.astype(np.float64))
    jumps = np.pad(np.diff(ti), (1, 0), constant_values=1).astype(bool)
    starts = tj[jumps] / 50.0
    # token starts -> character starts (byte-level BPE: a kana can span tokens)
    out_c, buf, cs = [], b'', None
    for k, t in enumerate(ids):
        bts = bytes(BYTE_DEC[c] for c in tok.convert_ids_to_tokens(t))
        for bt in bts:
            if not buf:
                cs = float(starts[min(k, len(starts) - 1)])
            buf += bytes([bt])
            try:
                out_c.append((buf.decode('utf-8'), cs))
                buf = b''
            except UnicodeDecodeError:
                pass
    return out_c


# ---------- alignment of the lyrics to the free transcription ----------
def asr_chars(chunks):
    out = []
    for c in chunks:
        h = hira_asr(c['text'])
        if not h:
            continue
        d = (c['end'] - c['start']) / len(h)
        out += [(ch, c['start'] + i * d) for i, ch in enumerate(h)]
    return out


def nw(a, b, gap=-1, match=2, mis=-1):
    """Global alignment of two strings; returns for each index of a the index in b it matched (or None)."""
    n, m = len(a), len(b)
    S = np.zeros((n + 1, m + 1)); T = np.zeros((n + 1, m + 1), dtype=np.int8)
    S[:, 0] = np.arange(n + 1) * gap; S[0, :] = 0  # free leading gaps in b (the transcription can start with noise)
    T[:, 0] = 1; T[0, :] = 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d = S[i - 1, j - 1] + (match if a[i - 1] == b[j - 1] else mis)
            u = S[i - 1, j] + gap
            l = S[i, j - 1] + (gap if i < n else 0)  # free trailing gaps in b
            S[i, j], T[i, j] = max((d, 0), (u, 1), (l, 2))
    i, j, res = n, m, [None] * n
    while i > 0 and j > 0:
        t = T[i, j]
        if t == 0:
            if a[i - 1] == b[j - 1]:
                res[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif t == 1:
            i -= 1
        else:
            j -= 1
    return res


def windows(chunks, dur):
    ac = asr_chars(chunks)
    b = ''.join(c for c, _ in ac)
    lk = [hira(line_kana(w)) for _, _, w in LYRICS]
    a = ''.join(lk)
    match = nw(a, b)
    wins, pos = [], 0
    for k in lk:
        idx = [match[pos + i] for i in range(len(k)) if match[pos + i] is not None]
        wins.append({'found': round(len(idx) / max(1, len(k)), 2), 't0': ac[idx[0]][1] if idx else None, 't1': ac[idx[-1]][1] if idx else None,
                     'heard': ''.join(b[j] for j in range(idx[0], idx[-1] + 1)) if idx else ''})
        pos += len(k)
    # lines with nothing matched: interpolate between neighbours
    for i, w in enumerate(wins):
        if w['t0'] is None:
            prev = next((wins[j]['t1'] for j in range(i - 1, -1, -1) if wins[j]['t1'] is not None), 0.0)
            nxt = next((wins[j]['t0'] for j in range(i + 1, len(wins)) if wins[j]['t0'] is not None), dur)
            w['t0'], w['t1'] = prev + 0.3, max(prev + 0.6, nxt - 0.3)
    return wins, b


HALLUCINATIONS = ('ご視聴ありがとうございました', 'ご視聴ありがとうございます', 'チャンネル登録', '最後までご視聴', '字幕')


def halluc(t):
    """Whisper's stock phrases on music it can't transcribe."""
    return any(h in t for h in HALLUCINATIONS)


def runs(wins):
    out, i = [], 0
    while i < len(wins):
        if wins[i]['found'] < 0.5:
            j = i
            while j + 1 < len(wins) and wins[j + 1]['found'] < 0.5:
                j += 1
            out.append((i, j)); i = j + 1
        else:
            i += 1
    return out


def found_end(wins, i):
    """Where the last line before i that Whisper found ends (0 at the start of the song)."""
    for j in range(i - 1, -1, -1):
        if wins[j]['found'] >= 0.5:
            return wins[j]['t1']
    return 0.0


def found_start(wins, i, dur):
    """Where the next line after i that Whisper found starts (the end of the song if none)."""
    for j in range(i + 1, len(wins)):
        if wins[j]['found'] >= 0.5:
            return wins[j]['t0']
    return dur


def phrase_groups(vdb, thr, a, b, sizes):
    """Sung stretches of the vocal stem between a and b (seconds), grouped into len(sizes) phrases at the longest silences.
    Returns [(start, end)] per line, or None if the vocal has fewer stretches than lines."""
    f0, f1 = int(a * 100), min(len(vdb), int(b * 100))
    on = vdb[f0:f1] > thr
    segs, st = [], None
    for k, x in enumerate(on):
        if x and st is None:
            st = k
        if not x and st is not None:
            segs.append([st, k]); st = None
    if st is not None:
        segs.append([st, len(on)])
    merged = []
    for s_ in segs:
        if merged and s_[0] - merged[-1][1] < 12:  # breaths under 0.12 s don't split a phrase
            merged[-1][1] = s_[1]
        else:
            merged.append(s_)
    merged = [s_ for s_ in merged if s_[1] - s_[0] >= 12]
    n = len(sizes)
    if len(merged) < n:
        return None
    gaps = sorted(range(len(merged) - 1), key=lambda k: merged[k + 1][0] - merged[k][1], reverse=True)[:n - 1]
    cuts = sorted(gaps)
    out, prev = [], 0
    for c in cuts + [len(merged) - 1]:
        out.append(((f0 + merged[prev][0]) / 100.0, (f0 + merged[c][1]) / 100.0))
        prev = c + 1
    return out


def score_notes(take):
    """Sung notes of the score YuE2 rendered: [(onset s, length s)], ties merged, from the take's (trimmed) ABC."""
    p = next((x for x in (f'{RAW}/{take}.abc.edit.txt', f'{RAW}/{take}.abc.txt') if os.path.exists(x)), None)
    if not p:
        return None, None
    abc = open(p).read()
    bpm = int(re.search(r'Q:1/4=(\d+)', abc).group(1))
    unit = int(re.search(r'L:1/(\d+)', abc).group(1)) if re.search(r'L:1/(\d+)', abc) else 16
    step = 60.0 / bpm * 4 / unit
    tok = re.compile(r'("[^"]*")|([_=^]*[a-gA-G][,\']*|z|Z)(\d*)(/?\d*)(-?)|(\|)')
    pos, notes, voice, tied = 0.0, [], None, False
    for line in abc.splitlines():
        if line.startswith('V:'):
            voice = 'V' if 'Vocal' in line else 'I'
            continue
        if voice != 'V' or line.startswith(('%', 'X:', 'T:', 'M:', 'L:', 'Q:', 'K:')):
            continue
        for m in tok.finditer(line):
            chord, sym, num, frac, tie, bar = m.groups()
            if chord or bar:
                continue
            if sym == 'Z':
                pos += unit * (int(num) if num else 1)
                tied = False
                continue
            d = float(num) if num else 1.0
            if frac:
                d /= float(frac.strip('/') or 2)
            if sym != 'z':
                if tied and notes:
                    notes[-1][1] += d * step
                else:
                    notes.append([pos * step, d * step])
                tied = bool(tie)
            else:
                tied = False
            pos += d
    return notes, os.path.basename(p)


def score_align(lines, notes, onsets):
    """Put the morae on the sung notes of the score, in order. The offset between score and audio is fitted on the morae of the lines
    Whisper heard. Each mora takes its own note; a mora can share the note before it (cheap for っ, ん and ー, which singers put on
    the previous note, costly otherwise), and notes can be left out (held or ornamental notes). The cost of a placement is how far it
    is from the Whisper time, weighted down for lines Whisper didn't hear. A shared note is split evenly between its morae."""
    flat = [(li, m) for li, ln in enumerate(lines) for w in ln['words'] if not w.get('punct') for m in w['morae']]
    K, J = len(flat), len(notes)
    if J == 0 or J < K * 0.8:
        return None
    heard = [m['start'] for li, m in flat if lines[li]['found'] >= 0.5]
    on = np.array([n[0] for n in notes])
    best = (9e9, 0.0)
    for off in np.arange(-1.5, 1.51, 0.01):
        d = np.sort([np.min(np.abs(on + off - t)) for t in heard])
        med = d[len(d) // 2] if len(d) else 0
        if med < best[0]:
            best = (med, float(off))
    off = best[1]
    t = np.array([m['start'] for _, m in flat])
    w = np.array([1.0 if lines[li]['found'] >= 0.5 else 0.15 for li, _ in flat])
    light = np.array([m['k'] in ('っ', 'ん', 'ー') for _, m in flat])
    INF = 9e9
    D = np.full((K + 1, J + 1), INF)
    D[0, :] = 0.0
    T = np.zeros((K + 1, J + 1), dtype=np.int8)  # 1 new note, 2 shares note j with the mora before, 0 note j left out
    for k in range(1, K + 1):
        for j in range(1, J + 1):
            c = w[k - 1] * min(abs(on[j - 1] + off - t[k - 1]), 1.0)
            best_c, move = D[k - 1, j - 1] + c, 1
            if k > 1 and D[k - 1, j] < INF:
                sc = D[k - 1, j] + (0.05 if light[k - 1] else 0.7) + 0.5 * c
                if sc < best_c:
                    best_c, move = sc, 2
            if D[k, j - 1] + 0.45 < best_c:
                best_c, move = D[k, j - 1] + 0.45, 0
            D[k, j], T[k, j] = best_c, move
    j = int(np.argmin(D[K, :]))
    k, pick = K, [0] * K
    while k > 0 and j > 0:
        mv = T[k, j]
        if mv == 1:
            pick[k - 1] = j - 1; k -= 1; j -= 1
        elif mv == 2:
            pick[k - 1] = j - 1; k -= 1
        else:
            j -= 1
    groups = {}
    for k2, j2 in enumerate(pick):
        groups.setdefault(j2, []).append(k2)
    moved, shared = [], 0
    for j2, ks in groups.items():
        n0, nd = notes[j2][0] + off, max(notes[j2][1], 0.08)
        shared += len(ks) - 1
        for q, k2 in enumerate(ks):
            li, m = flat[k2]
            st = n0 + nd * q / len(ks)
            if q == 0 and len(onsets):
                qq = int(np.argmin(np.abs(onsets - st)))
                if abs(onsets[qq] - st) <= 0.06:
                    st = float(onsets[qq])
            moved.append(abs(st - m['start']))
            m['start'] = round(st, 3)
            m['_end'] = n0 + nd * (q + 1) / len(ks)
    for k2, (li, m) in enumerate(flat):
        same_line_next = k2 + 1 < K and flat[k2 + 1][0] == li
        end = m.pop('_end')
        if same_line_next:
            end = min(end, flat[k2 + 1][1]['start'])
        m['end'] = round(max(m['start'] + 0.05, end), 3)
    for ln in lines:
        for w_ in ln['words']:
            if not w_.get('punct'):
                w_['start'], w_['end'] = w_['morae'][0]['start'], w_['morae'][-1]['end']
        ws = [w_ for w_ in ln['words'] if not w_.get('punct')]
        ln['start'], ln['end'] = ws[0]['start'], ws[-1]['end']
        ln['timing'] = 'score'
    return {'offset_s': round(off, 2), 'notes': J, 'morae': K, 'notes_left_out': J - len(groups), 'morae_sharing_a_note': shared,
            'median_move_ms': round(1000 * float(np.median(moved))), 'fit_median_ms': round(1000 * best[0])}


# ---------- beats ----------
def beat_grid(backing, sr, bpm_score, dur):
    tempo, bts = librosa.beat.beat_track(y=backing, sr=sr, start_bpm=bpm_score, tightness=300, units='time')
    spb = 60.0 / bpm_score
    if len(bts):
        ph = np.angle(np.mean(np.exp(2j * np.pi * (bts / spb)))) / (2 * np.pi) * spb
        beat0 = float(ph % spb)
    else:
        beat0 = 0.0
    beats = list(np.arange(beat0, dur, spb))
    return beat0, spb, [round(float(b), 3) for b in beats], float(np.atleast_1d(tempo)[0])


def score_bpm(take):
    for p in (f'{RAW}/{take}.abc.edit.txt', f'{RAW}/{take}.abc.txt'):
        if os.path.exists(p):
            m = re.search(r'Q:1/4=(\d+)', open(p).read())
            if m:
                return int(m.group(1))
    return 170


# ---------- one take ----------
def analyse(take):
    vpath, bpath = stems(take)
    mix, sr = librosa.load(f'{RAW}/{take}.flac', sr=44100, mono=False)
    dur = mix.shape[1] / sr
    v16, _ = librosa.load(vpath, sr=16000)
    back, _ = librosa.load(bpath, sr=22050)
    cache = f'{W}/{take}/analysis.json'
    if os.path.exists(cache) and json.load(open(cache)).get('asr_chunks_raw'):
        old = json.load(open(cache))
        text, raw_chunks = old['asr_text'], old['asr_chunks_raw']
    else:
        text, raw_chunks = transcribe(v16)
    chunks = [c for c in raw_chunks if not halluc(c['text'])]
    wins, heard_all = windows(chunks, dur)
    # re-listen to the gaps: a run of lines Whisper missed is transcribed again on its own (short windows hallucinate less)
    N = len(LYRICS)
    relisten = []
    for i0, i1 in runs(wins):
        a = found_end(wins, i0) + 0.15
        b = found_start(wins, i1, dur) - 0.1
        if b - a < 1.0:
            continue
        for s0 in np.arange(a, b, 28.0):
            s1 = min(b, s0 + 28.0)
            if s1 - s0 < 0.8:
                continue
            _, loc = transcribe(v16[int(s0 * 16000):int(s1 * 16000)])
            loc = [dict(c, start=c['start'] + s0, end=c['end'] + s0) for c in loc if not halluc(c['text'])]
            trial = sorted([c for c in chunks if c['end'] <= s0 or c['start'] >= s1] + loc, key=lambda c: c['start'])
            w2, _ = windows(trial, dur)
            # the window also holds parts of the lines on either side, so compare the whole song
            gain = sum(w['found'] for w in w2) - sum(w['found'] for w in wins)
            relisten.append({'from': round(float(s0), 2), 'to': round(float(s1), 2), 'heard': ''.join(c['text'] for c in loc), 'kept': gain > 0})
            if gain > 0:
                chunks, wins = trial, w2
    chunks.sort(key=lambda c: c['start'])
    onsets = librosa.onset.onset_detect(y=v16, sr=16000, units='time', backtrack=True, delta=0.07)
    vr = librosa.feature.rms(y=v16, hop_length=160)[0]
    vdb = 20 * np.log10(vr + 1e-6)
    thr = np.percentile(vdb, 95) - 24
    # alignment units: each line Whisper found, alone in its own window; each run of missed lines together, in the gap it must be in
    units, i = [], 0
    while i < N:
        if wins[i]['found'] >= 0.5:
            units.append([i]); i += 1
        else:
            j = i
            while j + 1 < N and wins[j + 1]['found'] < 0.5:
                j += 1
            units.append(list(range(i, j + 1))); i = j + 1
    unit_times = {}
    for u in units:
        i0, i1 = u[0], u[-1]
        if wins[i0]['found'] >= 0.5:
            w = wins[i0]
            a = max(found_end(wins, i0) + 0.05, w['t0'] - 0.8, 0.0)
            b = min(max(w['t1'] + 2.0, a + 1.5), found_start(wins, i0, dur) - 0.05, a + 29.0)
        else:
            a = max(0.0, found_end(wins, i0) + 0.3)
            b = min(found_start(wins, i1, dur) - 0.05, a + 29.5)
            if b - a < 0.35 * len(u):
                b = min(dur, a + 0.6 * len(u) + 0.5)
            groups = phrase_groups(vdb, thr, a, b, [len(line_kana(LYRICS[k][2])) for k in u])
            if groups:
                for k, (ga, gb) in zip(u, groups):
                    kana_k = line_kana(LYRICS[k][2])
                    wa, wb = max(a, ga - 0.3), min(b, gb + 0.3)
                    ch = force_align(v16[int(wa * 16000):int(wb * 16000)], kana_k)
                    tk = [wa + t for _, t in ch]
                    if len(tk) >= 2 and tk[0] <= wa + 0.06:
                        tk[0] = max(wa, min(ga, tk[1] - 0.05))
                    unit_times[k] = (tk, wa, wb, True)
                continue
        kana_u = ''.join(line_kana(LYRICS[k][2]) for k in u)
        chars = force_align(v16[int(a * 16000):int(b * 16000)], kana_u)
        times = [a + t for _, t in chars]
        # DTW pins the first kana to the window start: use where the vocal actually starts, within 1.5 s before the second kana
        if len(times) >= 2 and times[0] <= a + 0.06:
            t2 = times[1]
            f0, f1 = int(max(a, t2 - 1.5) * 100), int((t2 - 0.05) * 100)
            cand = [f for f in range(f0, max(f0, f1)) if f < len(vdb) and vdb[f] > thr]
            times[0] = cand[0] / 100.0 if cand else max(a, t2 - 0.2)
        pos = 0
        for k in u:
            n = len(line_kana(LYRICS[k][2]))
            unit_times[k] = (times[pos:pos + n], a, b, len(u) > 1 or wins[k]['found'] < 0.5)
            pos += n
    lines = []
    for i, ((sec, en, words), w) in enumerate(zip(LYRICS, wins)):
        times, a, b, joint = unit_times[i]
        if not times:
            times = [a]
        # snap to vocal onsets within 80 ms
        snapped = []
        for t in times:
            if len(onsets):
                j = int(np.argmin(np.abs(onsets - t)))
                t = float(onsets[j]) if abs(onsets[j] - t) <= 0.08 else t
            snapped.append(t)
        for k in range(1, len(snapped)):
            snapped[k] = max(snapped[k], snapped[k - 1] + 0.03)
        # end of the line: where the vocal falls quiet after the last kana (at most 2.5 s later)
        last = snapped[-1] if snapped else a
        fr = int(last * 100)
        end = last + 0.4
        for f in range(fr, min(len(vdb), fr + 250)):
            if vdb[f] < thr and f > fr + 15:
                end = f / 100.0
                break
        # morae and words
        ci, wout = 0, []
        for (s, rd, key, catch) in words:
            if not rd:
                wout.append({'s': s, 'punct': True})
                continue
            mor = morae(rd)
            mm = []
            for mo in mor:
                st = snapped[ci] if ci < len(snapped) else last
                ci += len(mo)
                mm.append({'k': mo, 'start': round(st, 3)})
            wout.append({'s': s, 'reading': rd, 'key': key, 'catch': catch, 'start': mm[0]['start'], 'morae': mm})
        flat = [m for w_ in wout if not w_.get('punct') for m in w_['morae']]
        for k, m in enumerate(flat):
            m['end'] = round(flat[k + 1]['start'] if k + 1 < len(flat) else end, 3)
        for w_ in wout:
            if not w_.get('punct'):
                w_['end'] = w_['morae'][-1]['end']
        lines.append({'i': i, 'section': sec, 'jp': line_jp(words), 'reading': line_kana(words), 'en': en,
                      'start': flat[0]['start'], 'end': flat[-1]['end'], 'words': wout,
                      'found': w['found'], 'heard': w['heard'], 'window': [round(a, 2), round(b, 2)], 'joint': joint})
    # the score: one sung note per mora when YuE2 wrote the melody that way; the Whisper times become the check
    notes, score_file = score_notes(take)
    sung = lines
    n_morae = sum(len(w_['morae']) for ln in lines for w_ in ln['words'] if not w_.get('punct'))
    if notes and len(notes) < n_morae - 4:
        # the score has too few notes for the lyrics (more than a few っ and ん sharing can explain): the model stopped singing the
        # lyrics before the end, so only the lines up to the last one Whisper heard were sung (okiro-e1 ends on breathing)
        last = max((i for i, ln in enumerate(lines) if ln['found'] >= 0.5), default=len(lines) - 1)
        sung = lines[:last + 1]
        for ln in lines[last + 1:]:
            ln['not_sung'] = True
    if notes and notes[-1][0] + notes[-1][1] > dur + 2.0:
        # the audio stops before the score does (round 1 cut every take at 85 s): only the lines up to the last one Whisper heard
        # were sung, and only the notes inside the audio can carry them
        last = max((i for i, ln in enumerate(sung) if ln['found'] >= 0.5), default=len(sung) - 1)
        for ln in lines[last + 1:]:
            ln['not_sung'] = True
        sung = lines[:last + 1]
        notes = [n for n in notes if n[0] < dur - 0.3]
    score_timing = score_align(sung, notes, onsets) if notes else None
    if score_timing:
        score_timing['score'] = score_file
        score_timing['lines_aligned'] = len(sung)
    for ln in lines:
        ln.setdefault('timing', 'whisper')
    # command check: the transcription around each command
    cmds = []
    for ln in lines:
        for w_ in ln['words']:
            if w_.get('catch'):
                seg_chunks = [c for c in chunks if c['end'] >= w_['start'] - 1.0 and c['start'] <= w_['end'] + 1.0]
                near = hira_asr(''.join(c['text'] for c in seg_chunks))
                target = hira(w_['reading'])
                ok = target in near  # the whole reading, ending included: the ending is what makes it a command (わすれ is not わすれろ)
                cmds.append({'s': w_['s'], 'line': ln['i'], 'start': w_['start'], 'heard_near': near[:30], 'ok': bool(ok),
                             'must': w_['s'] in MUST_HEAR})
    bpm = score_bpm(take)
    beat0, spb, beats, tempo_est = beat_grid(back, 22050, bpm, dur)
    for ln in lines:
        ln['beat'] = round((ln['start'] - beat0) / spb, 2)
        for w_ in ln['words']:
            if not w_.get('punct'):
                w_['beat'] = round((w_['start'] - beat0) / spb, 2)
    lyric_all = hira(''.join(line_kana(w) for _, _, w in LYRICS))
    import jiwer
    cer = jiwer.cer(lyric_all, hira_asr(''.join(c['text'] for c in chunks)) or '-')
    found = sum(1 for ln in lines if ln['found'] >= 0.5)
    must = [c for c in cmds if c['must']]
    res = {'take': take, 'duration': round(dur, 2), 'bpm_score': bpm, 'tempo_librosa': round(tempo_est, 1), 'beat0': round(beat0, 3),
           'spb': round(spb, 4), 'beats': beats, 'asr_text': text, 'asr_chunks': chunks, 'asr_chunks_raw': raw_chunks, 'relisten': relisten,
           'heard_text': ''.join(c['text'] for c in chunks), 'lyric_cer': round(cer, 3),
           'lines_found': found, 'commands': cmds, 'commands_heard': sum(c['ok'] for c in cmds), 'commands_total': len(cmds),
           'must_heard': sum(c['ok'] for c in must), 'must_total': len(must), 'lines': lines,
           'vocal_start': lines[0]['start'], 'vocal_end': lines[-1]['end'], 'score_timing': score_timing}
    tidy(res)
    os.makedirs(f'{W}/{take}', exist_ok=True)
    json.dump(res, open(f'{W}/{take}/analysis.json', 'w'), ensure_ascii=False, indent=1)
    os.makedirs(PAGE, exist_ok=True)
    for src, tag in ((f'{RAW}/{take}.flac', 'mix'), (bpath, 'backing'), (vpath, 'vocal')):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:a', 'libmp3lame', '-b:a', '128k' if tag == 'mix' else '96k',
                        f'{PAGE}/{take}-{tag}.mp3'], check=True)
    print(take, f'{dur:.1f}s', 'lines found', found, '/ 20; commands heard', res['commands_heard'], '/', len(cmds),
          '; must', res['must_heard'], '/', len(must), '; cer', res['lyric_cer'], flush=True)
    return res


def tidy(r):
    """A line ends where it falls quiet or where the next line starts, whichever comes first (the same for its last mora)."""
    ls = r['lines']
    for i, ln in enumerate(ls[:-1]):
        nxt = ls[i + 1]['start']
        if ln['end'] > nxt - 0.02 and nxt > ln['start']:
            ln['end'] = round(max(ln['start'] + 0.1, nxt - 0.02), 3)
            for w in ln['words']:
                if w.get('punct'):
                    continue
                for m in w['morae']:
                    m['end'] = round(min(m['end'], ln['end']), 3)
                    m['start'] = round(min(m['start'], m['end'] - 0.03), 3)
                w['end'] = w['morae'][-1]['end']
    return r


def recheck(r):
    """Redo the command check of a stored analysis with the strict rule (the command's whole reading in the transcription within
    a second of where it's sung). Lines the take never sings count as not heard."""
    chunks = r.get('asr_chunks') or []
    cmds = []
    for ln in r['lines']:
        for w_ in ln['words']:
            if not w_.get('catch'):
                continue
            target = hira(w_['reading'])
            if ln.get('not_sung'):
                near, ok = '', False
            else:
                seg = [c for c in chunks if c['end'] >= w_['start'] - 1.0 and c['start'] <= w_['end'] + 1.0]
                near = hira_asr(''.join(c['text'] for c in seg))
                ok = target in near
            cmds.append({'s': w_['s'], 'line': ln['i'], 'start': w_['start'], 'heard_near': near[:30], 'ok': bool(ok),
                         'must': w_['s'] in MUST_HEAR, 'not_sung': bool(ln.get('not_sung'))})
    must = [c for c in cmds if c['must']]
    r.update({'commands': cmds, 'commands_heard': sum(c['ok'] for c in cmds), 'commands_total': len(cmds),
              'must_heard': sum(c['ok'] for c in must), 'must_total': len(must), 'command_check': 'strict: the whole reading'})
    return r


def take_score(r):
    return (r['lines_found'] >= 18, r['must_heard'], r['commands_heard'] + r['lines_found'], -r['lyric_cer'])


def export(r, prefix='okiro', main=True, why=''):
    """Write the take's audio and timings with file names starting with `prefix`. The main pick also makes the wake sting, the N03
    memories and the song's entry in voices.json. Lines the audio never reaches (a take cut off early) are left out."""
    take = r['take']
    os.makedirs(GAME, exist_ok=True)
    vpath, bpath = stems(take)
    r = dict(r)
    r['lines'] = [ln for ln in r['lines'] if not ln.get('not_sung') and ln['start'] < r['duration'] - 0.5]
    fade_s = 3.0 if len(r['lines']) < len(LYRICS) else 1.5  # a take that was cut off gets a longer fade
    fade = ['-af', f'afade=t=out:st={max(0, r["duration"] - fade_s):.2f}:d={fade_s}']
    for src, name in ((f'{RAW}/{take}.flac', f'{prefix}_full'), (bpath, f'{prefix}_backing'), (vpath, f'{prefix}_vocal')):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src] + fade + ['-c:a', 'libvorbis', '-q:a', '5', f'{GAME}/{name}.ogg'], check=True)
    if main:
        export_extras(r, take, vpath)
    export_timing(r, take, prefix, why)


def export_extras(r, take, vpath):
    # wake sting (N07): the first chorus, 8 s from its first line, faded
    ch = next(ln for ln in r['lines'] if ln['section'] == 'chorus')
    st = max(0.0, ch['start'] - 0.2)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{st:.2f}', '-t', '8', '-i', f'{RAW}/{take}.flac', '-af',
                    'afade=t=in:d=0.05,afade=t=out:st=5.5:d=2.5', '-c:a', 'libvorbis', '-q:a', '5',
                    f'{REPO}/legacy/island/godot/assets/audio/music/wake_sting.ogg'], check=True)
    # N03: the chorus remembered "as she sang it" (voice_lines.json n03_*_hikare_memory): the first 「光れ、光れ」 from the guide vocal
    hk = next(ln for ln in r['lines'] if ln['jp'] == '光れ、光れ')
    a, b = max(0.0, hk['start'] - 0.1), hk['end'] + 0.35
    vdir = f'{REPO}/legacy/island/godot/assets/audio/voice'
    os.makedirs(vdir, exist_ok=True)
    for fid in ('n03_mio_hikare_memory', 'n03_emi_hikare_memory'):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.2f}', '-t', f'{b - a:.2f}', '-i', vpath, '-af',
                        f'afade=t=in:d=0.03,afade=t=out:st={max(0.0, b - a - 0.3):.2f}:d=0.3,loudnorm=I=-18:TP=-1.5:LRA=11',
                        '-ac', '1', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '4', f'{vdir}/{fid}.ogg'], check=True)
    vj = f'{REPO}/legacy/island/godot/assets/audio/voice/voices.json'
    if os.path.exists(vj):
        v = json.load(open(vj))
        v.setdefault('voices', {})['song:okiro'] = 'res://assets/audio/song/okiro_full.ogg'
        json.dump(v, open(vj, 'w'), ensure_ascii=False, indent=1)


def export_timing(r, take, prefix, why):
    timing = {
        'note': ('Placeholder karaoke timing for 「起きろ！」 (legacy/island/content/lyrics.md), waiting for Jørgen. Times are seconds from the start '
                 'of okiro_full.ogg (the backing and vocal stems share the timeline). Format: legacy/island/godot/assets/audio/README.md.'),
        'song': 'okiro', 'title': '起きろ！', 'take': take, 'placeholder': True, 'why_this_take': why,
        'lines_sung': len(r['lines']), 'lines_in_lyrics': len(LYRICS),
        'files': {'full': f'res://assets/audio/song/{prefix}_full.ogg', 'backing': f'res://assets/audio/song/{prefix}_backing.ogg',
                  'vocal': f'res://assets/audio/song/{prefix}_vocal.ogg'},
        'duration': r['duration'], 'bpm': r['bpm_score'], 'beat0': r['beat0'], 'spb': r['spb'], 'beats': r['beats'],
        'timing_source': ('each mora on a sung note of the score YuE2 rendered (offset fitted on the lines Whisper heard, starts snapped to '
                          'vocal onsets within 60 ms); Whisper large-v3-turbo on the Demucs vocal stem gives the rough times and the checks'),
        'lines': [{k: ln.get(k) for k in ('i', 'section', 'jp', 'reading', 'en', 'start', 'end', 'beat', 'words', 'found', 'timing')} for ln in r['lines']],
        'score_timing': r.get('score_timing'),
        'catch': [{'s': w['s'], 'key': w['key'], 'line': ln['i'], 'start': w['start'], 'end': w['end'], 'beat': w['beat'],
                   'owned_before': w['s'] == '出せ'} for ln in r['lines'] for w in ln['words'] if w.get('catch')],
        'check': {'lines_found': r['lines_found'], 'commands_heard': r['commands_heard'], 'commands_total': r['commands_total'],
                  'must_heard': r['must_heard'], 'must_total': r['must_total'], 'lyric_cer': r['lyric_cer']},
    }
    json.dump(timing, open(f'{GAME}/{prefix}_timing.json', 'w'), ensure_ascii=False, indent=1)
    # the same in the builder's `songs` format (FORMAT.md section 11), times in beats from beat0
    def markup(words):
        out = ''
        for s, rd, key, _ in words:
            if not rd:
                out += s
            elif re.search(r'[一-鿿]', s):
                out += '{' + s + '|' + rd + ('|' + key if key and key != s else '') + '}'
            else:
                out += s
        return out
    # the builder's player (scripts/ui/screens.gd _play_song) counts beats from the start of the stream (beat = seconds / spb), and a lane
    # note is a catch when its offset equals a catch's beat exactly, so both use the same rounded numbers
    spb, b0 = r['spb'], r['beat0']
    # the writer's own entry (legacy/island/content/script, songs.okiro): keep its markup, title and catches; replace only the timing
    wsong = {}
    for f in glob.glob(f'{REPO}/legacy/island/content/script/*.json'):
        d = json.load(open(f))
        if isinstance(d, dict) and 'okiro' in d.get('songs', {}):
            wsong = d['songs']['okiro']
    wlines = wsong.get('lines', []) if len(wsong.get('lines', [])) == len(LYRICS) else []
    plain_md = lambda x: re.sub(r'\{([^}|]+)(?:\|[^}]*)?\}', r'\1', x)
    if wlines and any(plain_md(wl['jp']) != line_jp(LYRICS[i][2]) for i, wl in enumerate(wlines)):
        wlines = []  # the script's song has other words (new lyrics): use our own markup
    song_lines = []
    for ln in r['lines']:
        li = ln['i']
        sec, en, words = LYRICS[li]
        at = round(ln['start'] / spb, 3)
        end_b = ln['end'] / spb
        grid = [round((b0 + k * spb) / spb - at, 3) for k in range(int(np.ceil((ln['start'] - b0) / spb)), int(np.floor((ln['end'] - b0) / spb)) + 1)]
        mine = [w for w in ln['words'] if w.get('catch')]
        notes = [n for n in grid if n >= -0.001]
        def on_note(t):
            # a catch sits on the first beat at or after where the command is sung (0.15 beat of slack), so it's always a lane note
            k = int(np.ceil((t - b0) / spb - 0.15))
            n = round((b0 + k * spb) / spb - at, 3)
            if n not in notes:
                notes.append(n)
            return n
        if wlines:
            catches, used = [], {}
            for c in wlines[li].get('catch', []):
                # the n-th catch of a word goes on the n-th time it's sung in the line (起きろ、起きろ)
                cand = [x for x in mine if x['s'] == c['s']] or [x for x in ln['words'] if not x.get('punct') and c['s'] in x['s']]
                n = used.get(c['s'], 0)
                used[c['s']] = n + 1
                w = cand[min(n, len(cand) - 1)] if cand else None
                catches.append({'s': c['s'], 'beat': on_note(w['start'] if w else ln['start']), 'key': c.get('key')})
        else:
            catches = [{'s': w['s'], 'beat': on_note(w['start']), 'key': w['key']} for w in mine]
        notes = sorted(set(notes))
        song_lines.append({'at': at, 'jp': wlines[li]['jp'] if wlines else markup(words), 'en': wlines[li].get('en', en) if wlines else en,
                           'notes': notes, 'catch': catches})
    json.dump({'songs': {'okiro': {'title': wsong.get('title', '起きろ！'), 'bpm': r['bpm_score'], 'audio': f'res://assets/audio/song/{prefix}_full.ogg',
                                   'backing': f'res://assets/audio/song/{prefix}_backing.ogg', 'timing': f'res://assets/audio/song/{prefix}_timing.json',
                                   'lines': song_lines, 'unlock': 'imperative',
                                   'note': ('Beats count from the start of the audio (seconds / (60 / bpm)), as scripts/ui/screens.gd plays them. '
                                            'Notes are the beats of the track while each line is sung, plus each catch. Placeholder take ' + take + '.')}}},
              open(f'{GAME}/{prefix}_song.json', 'w'), ensure_ascii=False, indent=1)
    print('exported', take, flush=True)


if __name__ == '__main__':
    redo = '--redo' in sys.argv
    args, skip = [], False
    for x in sys.argv[1:]:
        if skip:
            skip = False
        elif x in ('--pick', '--alt'):
            skip = True
        elif not x.startswith('--'):
            args.append(x)
    takes = args or sorted(os.path.basename(p)[:-5] for p in glob.glob(f'{RAW}/*.flac'))
    results = {}
    for t in takes:
        use_lyrics(t)
        p = f'{W}/{t}/analysis.json'
        if os.path.exists(p):  # keep the free transcription of an older analysis, so a redo doesn't transcribe again
            old = json.load(open(p))
            if 'asr_chunks_raw' not in old and old.get('asr_chunks'):
                old['asr_chunks_raw'] = old['asr_chunks']
                json.dump(old, open(p, 'w'), ensure_ascii=False, indent=1)
        if not redo and os.path.exists(p) and os.path.getmtime(p) > os.path.getmtime(f'{RAW}/{t}.flac'):
            results[t] = json.load(open(p))
            continue
        try:
            results[t] = analyse(t)
        except Exception as e:
            import traceback; traceback.print_exc()
            print('FAIL', t, e, flush=True)
    allr = []
    for p in glob.glob(f'{W}/*/analysis.json'):
        r = tidy(json.load(open(p)))
        use_lyrics(r['take'])
        recheck(r)
        json.dump(r, open(p, 'w'), ensure_ascii=False, indent=1)
        allr.append(r)
    ranking = [r['take'] for r in sorted(allr, key=take_score, reverse=True) if not r['take'].startswith('okiro2')]
    by = {r['take']: r for r in allr}
    opt = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
    pick, alt = opt('--pick'), opt('--alt')
    why = 'picked by Jørgen on the review page' if pick else 'best by the Whisper checks'
    pick = pick or ranking[0]
    json.dump({'picked': pick, 'why': why, 'alternative': alt, 'ranking_by_checks': ranking}, open(f'{W}/pick.json', 'w'), indent=1)
    use_lyrics(pick)
    export(by[pick], 'okiro', True, why)
    if alt:
        use_lyrics(alt)
        export(by[alt], 'okiro_' + alt.split('-')[-1], False, 'the alternative Jørgen picked')
    print('exported', pick, 'alt', alt, flush=True)
