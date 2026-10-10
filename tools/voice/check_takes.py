"""Check every take in <work>/raw with tools/island_audio/check.py's models (Whisper large-v3-turbo, pyin pitch guard, WavLM similarity).
Japanese lines: passes on kana CER or on the written text compared character by character .
English lines (Mio's and a few others): Whisper in English; both sides turned into plain letters (Japanese words to romaji,
digits to words) and compared by character error rate.
Japanese words said on their own (word-*, eric-*, carina-*) and the Japanese parts of English lines (cfg.units) must also sound
Japanese: Whisper's language guess on the take, P(ja) >= 0.5 (native.py); exact name readings require it too.
Word clips also get a rough pitch-accent check.
An English line with Japanese in it, made in one take: each Japanese word must sound Japanese where it is said
(native.words_native: P(ja) >= 0.5 on its stretch, 0.8 if neither transcript has it; words of 2 kana or fewer are too
short to measure and only have to be heard). Every English take must keep one voice from start to end (segvoice.py, on
the take trimmed and levelled as export.py writes it: no stretch in another voice).
Results go to <work>/metrics.json; takes measured before (same file time, same text) are skipped.
Prints PASS or FAIL with every take's transcript for the lines that still need a clip.
Usage: DEV=cuda ~/ai/tts-bench/.venv/bin/python tools/voice/check_takes.py takes | reftext
  reftext: transcribe tools/voice-refs/goro-ref12.wav into goro-ref12.txt (the reader's clone reference)"""
import glob, json, os, re, sys, unicodedata
mode = sys.argv[1]
sys.argv = [sys.argv[0]]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfg import RAW, METRICS, VR, units, missing, speakers, kana_reading, spoken, LUFS, LUFS_DEFAULT, FEMALE, MALE  # puts tools/island_audio on the path
import check as C
import jiwer, librosa
from readings import reading_target, strict_reading
import native as N
import segvoice as SV
import export_voice as X
from transformers import WhisperProcessor
N.use(C.asr.model, WhisperProcessor(feature_extractor=C.asr.feature_extractor, tokenizer=C.asr.tokenizer))
P_JA = 0.5
EN_CHECK = 4  # version of the English take check (4: one voice, measured as exported, Japanese checked where it is said); older takes are measured again

C.FEMALE.update(FEMALE)
C.MALE.update(MALE)

if mode == 'reftext':
    y = librosa.load(f'{VR}/goro-ref12.wav', sr=16000)[0]
    t = C.transcribe([y])[0]
    open(f'{VR}/goro-ref12.txt', 'w').write(t)
    f0 = C.pitch(C.trimmed(y))
    print('goro-ref12:', t, 'f0', f0, 'dur', round(len(y) / 16000, 1))
    sys.exit()


def norm(s):
    return re.sub(r'[\s、。，．・！？!?…「」『』（）()～〜ー\-—.,♪っッ]', '', s)


def written_cer(t, h):
    a, b = norm(t), norm(h)
    return float(jiwer.cer(a, b or '-')) if a else 0.0


ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = '_ _ twenty thirty forty fifty sixty seventy eighty ninety'.split()


def num(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + (ONES[n % 10] if n % 10 else '')
    if 1100 <= n <= 2099 and n % 100:  # years
        return num(n // 100) + num(n % 100)
    if n < 1000: return ONES[n // 100] + 'hundred' + (num(n % 100) if n % 100 else '')
    return num(n // 1000) + 'thousand' + (num(n % 1000) if n % 1000 else '')


def letters(s):
    s = re.sub(r'[぀-ヿ一-龯]+', lambda m: ' ' + ''.join(x['hepburn'] for x in C.kks.convert(m.group())) + ' ', s)
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'\d+', lambda m: num(int(m.group())), s)
    s = s.replace('ou', 'o').replace('oo', 'o').replace('uu', 'u')
    return re.sub(r'[^a-z]', '', s)


JA = re.compile(r'[぀-ヿ一-龯]+')


def has_kana(h, k):
    # the Japanese word appears in the Japanese transcript: exact for up to 4 kana, one edit allowed beyond that
    if k in h:
        return True
    if len(k) <= 4:
        return False
    return any(jiwer.cer(k, h[j:j + L]) * len(k) <= 1.01 for L in (len(k) - 1, len(k), len(k) + 1) for j in range(0, max(1, len(h) - L + 1)))


def english(y):
    return C.asr({'raw': y, 'sampling_rate': 16000}, generate_kwargs={'language': 'en', 'task': 'transcribe'})['text'].strip()


def exported(path, sp):
    """A take at 16 kHz trimmed and levelled as export.py writes it (export_voice.prep)."""
    return librosa.resample(X.prep(path, LUFS.get(sp, LUFS_DEFAULT)).astype('float32'), orig_sr=X.SR, target_sr=16000)


def measure_en(items, refemb, parts_of):
    """parts_of: line key -> cfg.parts() for the English lines with Japanese in them made in one take."""
    ys = [librosa.load(p, sr=16000)[0] for _, p, _, _ in items]
    ok_idx = [i for i, y in enumerate(ys) if len(y) >= 1600]
    outs = C.asr([{'raw': ys[i], 'sampling_rate': 16000} for i in ok_idx], batch_size=8,
                 generate_kwargs={'language': 'en', 'task': 'transcribe'}) if ok_idx else []
    hyps = {i: o['text'].strip() for i, o in zip(ok_idx, outs)}
    # mixed lines: English Whisper tends to drop the Japanese words, so a Japanese pass checks those words separately
    mix = [i for i in ok_idx if JA.search(items[i][3])]
    outs = C.asr([{'raw': ys[i], 'sampling_rate': 16000} for i in mix], batch_size=8,
                 generate_kwargs={'language': 'ja', 'task': 'transcribe'}) if mix else []
    hyp_ja = {i: o['text'].strip() for i, o in zip(mix, outs)}
    res = {}
    for i, (key, p, sp, tgt) in enumerate(items):
        y = ys[i]
        if len(y) < 1600:
            res[key] = {'dur': 0, 'error': 'empty or under 0.1 s'}
            continue
        yt = C.trimmed(y)
        med, low = C.pitch(yt)
        a, b = letters(tgt), letters(hyps[i])
        cer = float(jiwer.cer(a, b or '-')) if a else 0.0
        n = max(1, len(a))
        ja_ok, ja_miss = True, []
        if i in hyp_ja:
            a2 = letters(JA.sub(' ', tgt))
            cer = min(cer, float(jiwer.cer(a2, b or '-')),  # English part alone (English Whisper drops or translates the Japanese)
                      float(jiwer.cer(a, letters(hyp_ja[i]) or '-')))  # or the Japanese transcript, which keeps both
            hk = C.kana(hyp_ja[i])
            for seg in JA.findall(tgt):
                if not (has_kana(hk, C.kana(seg)) or letters(seg) in b or letters(seg) in letters(hyp_ja[i])):
                    ja_ok = False; ja_miss.append(seg)
        dur = len(yt) / 16000
        m = {'dur': round(len(y) / 16000, 2), 'speech': round(dur, 2), 'median_f0': med, 'low160': low,
             'pitch_ok': C.pitch_ok(sp, med, low), 'asr': hyps[i], 'cer': round(cer, 3), 'cer_written': round(cer, 3),
             'edits': round(cer * n), 'sim': round(float(C.emb(y) @ refemb[sp]), 3) if sp in refemb else None,
             'lufs': C.lufs(y), 'short': n <= 4, 'lang': 'en', 'asr_ja': hyp_ja.get(i), 'ja_missing': ja_miss}
        if sp in MALE and n <= 4:
            m['pitch_ok'] = True
        m['dur_ok'] = 0.02 * n <= dur <= 2.0 + 0.13 * n
        if key[0] in parts_of:  # one take with Japanese in it: the English against what Whisper heard around the Japanese,
            # and each Japanese word where it is said: heard (in either transcript) and Japanese-sounding
            ps = parts_of[key[0]]
            words, heard_en = N.words_native(y, ps, C.asr)
            cer = min(cer, float(jiwer.cer(letters(spoken(' '.join(t for l, t in ps if l == 'en'))), letters(heard_en) or '-')))
            m['cer'] = m['cer_written'] = round(cer, 3)
            m['edits'] = round(cer * n)
            hk = C.kana(hyp_ja.get(i, ''))
            m['ja_words'], ja_miss = [], []
            for w, s0, s1, pj in words:
                r = kana_reading(w)
                heard = has_kana(hk, C.kana(r)) or letters(r) in b or letters(r) in letters(hyp_ja.get(i, ''))
                short = len(C.kana(r)) <= 2  # too short for Whisper's language guess: only has to be heard
                ok_w = heard if short else (pj >= P_JA and (heard or pj >= 0.8))
                m['ja_words'].append([w, s0, s1, round(pj, 3), heard, ok_w])
                if not ok_w:
                    ja_miss.append(w)
            m['p_ja'] = min(pj for _, _, _, pj in words)
            m['ja_missing'], ja_ok = ja_miss, not ja_miss
        m['read_ok'] = bool((cer <= 0.1 or (n <= 8 and m['edits'] <= 1)) and ja_ok)
        if '~' not in key[0]:  # a whole line (a spliced line's parts are checked joined, in export.py)
            yx = exported(p, sp)  # as export.py trims and levels it: where the pauses fall decides the stretches
            rows = SV.measure(yx, C.emb, C.pitch, refemb[sp])
            br = SV.breaks(rows, yx, english)
            m['stretches'], m['voice_breaks'], m['voice_ok'], m['en_check'] = rows, br, not br, EN_CHECK
        m['ok'] = bool(m['pitch_ok'] and m['dur_ok'] and m['read_ok'] and m.get('voice_ok', True))
        res[key] = m
    return res


word = lambda key: key.startswith(('word-', 'eric-', 'carina-')) or '~' in key  # Japanese said on its own or inside English

OUT = METRICS
old = json.load(open(OUT)) if os.path.exists(OUT) else {}
SP = speakers()
refemb = {k: C.emb(librosa.load(v[0], sr=16000)[0]) for k, v in SP.items()}
M = units()
need = set(missing())
parts_of = {e['key']: e['parts'] for e in M if 'parts' in e and not e.get('part')}
items = {'ja': [], 'en': []}
for e in M:
    for p in sorted(glob.glob(f'{RAW}/{e["key"]}/*.wav')):
        tk = os.path.basename(p)[:-4]
        prev = old.get(e['key'], {}).get(tk)
        target = reading_target(e['said']) if e['lang'] == 'ja' else e['said']
        needs_native = e['lang'] == 'ja' and (word(e['key']) or target != e['said'])
        if (prev and prev.get('mtime') == int(os.path.getmtime(p))
                and prev.get('text') == e['said']
                and prev.get('reading', prev.get('text')) == target
                and (not needs_native or prev.get('p_ja') is not None)
                # English takes measured before the one-voice and in-line native checks: again, if the line needs a clip
                and not (e['lang'] == 'en' and e.get('line', e['key']) in need
                         and '~' not in e['key'] and prev.get('en_check') != EN_CHECK)):
            continue
        items[e['lang']].append(((e['key'], tk), p, e['speaker'], target))
print('to check', len(items['ja']), 'ja', len(items['en']), 'en', flush=True)
said = {e['key']: e['said'] for e in M}
for lang, its in items.items():
    for s in range(0, len(its), 64):
        if lang == 'en':
            res = measure_en(its[s:s + 64], refemb, parts_of)
        else:
            res = C.measure(its[s:s + 64], refemb)
            for (key, tk), m in res.items():
                if m.get('error'):
                    continue
                m['cer_written'] = round(written_cer(said[key], m['asr']), 3)
                nw = max(1, len(norm(said[key])))
                ok_w = m['cer_written'] <= 0.2 or (nw <= 6 and round(m['cer_written'] * nw) <= 1)
                m['read_ok'] = bool(m['cer'] <= 0.2 or (not m['short'] and max(1, len(C.kana(said[key]))) <= 6 and m['edits'] <= 1) or ok_w)
                exact = strict_reading(said[key], m['asr'], C.kana)
                if exact is not None:
                    m['read_ok'] = exact
                if word(key) or exact is not None:
                    y = C.trimmed(librosa.load(f'{RAW}/{key}/{tk}.wav', sr=16000)[0])
                    m['p_ja'], m['p_en'] = N.lang(y)
                    m['native_ok'] = m['p_ja'] >= P_JA
                    m['read_ok'] = bool(m['read_ok'] and m['native_ok'])
                    if word(key) and '~' not in key:
                        a = N.accent(y, key.split('-', 1)[1], male=key.startswith('eric-'))
                        m['accent'] = list(a) if a else None
                m['ok'] = bool(m['pitch_ok'] and m['dur_ok'] and m['read_ok'])
        for (key, tk), m in res.items():
            m['mtime'] = int(os.path.getmtime(f'{RAW}/{key}/{tk}.wav'))
            m['text'] = said[key]
            m['reading'] = reading_target(said[key]) if lang == 'ja' else said[key]
            old.setdefault(key, {})[tk] = m
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        json.dump(old, open(OUT, 'w'), ensure_ascii=False, indent=1)
        print('checked', lang, min(s + 64, len(its)), '/', len(its), flush=True)
for e in M:
    if e.get('line', e['key']) not in need:
        continue
    t = {k: v for k, v in old.get(e['key'], {}).items() if v.get('text') == e['said']}
    if not t:
        continue
    good = [k for k, m in t.items() if m.get('ok')]
    print('PASS' if good else 'FAIL', e['key'], e['speaker'], e['lang'], e['said'], '|',
          ' / '.join(f"{k}:{m.get('asr')}({m.get('cer')},{m.get('cer_written')},{m.get('median_f0')},{m.get('sim')},{'ok' if m.get('ok') else 'x'})" for k, m in sorted(t.items())))
