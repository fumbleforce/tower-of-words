"""Does the Japanese in a clip sound Japanese? Whisper large-v3-turbo's language guess on the audio (P(ja) against P(en))
and its Japanese transcript, plus a rough pitch-accent check for single words.
Used by check_takes.py for Japanese segments (word clips, Eric's words, the Japanese parts of spliced English lines)
and on its own to measure clips:
  ~/ai/tts-bench/.venv/bin/python tools/voice/native.py game3d/audio/word-matte.mp3 ...   (whole clips)
  ~/ai/tts-bench/.venv/bin/python tools/voice/native.py --words word-,eric-              (every word clip, with the accent check)"""
import os, re, sys
import numpy as np, librosa, torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

DEV = os.environ.get('DEV', 'cuda' if torch.cuda.is_available() else 'cpu')
_M = {}


def use(model, processor):
    """Share an already loaded Whisper (check.py's pipeline: C.asr.model, and a WhisperProcessor) instead of loading another."""
    _M['m'], _M['p'] = model, processor
    _model()


def _model():
    if 'langs' not in _M:
        name = 'openai/whisper-large-v3-turbo'
        if 'm' not in _M:
            _M['p'] = WhisperProcessor.from_pretrained(name)
            _M['m'] = WhisperForConditionalGeneration.from_pretrained(
                name, torch_dtype=torch.float16 if DEV != 'cpu' else torch.float32).to(DEV).eval()
        tok = _M['p'].tokenizer
        _M['ja'], _M['en'] = tok.convert_tokens_to_ids('<|ja|>'), tok.convert_tokens_to_ids('<|en|>')
        from transformers.models.whisper.tokenization_whisper import LANGUAGES
        _M['langs'] = [i for i in tok.convert_tokens_to_ids([f'<|{c}|>' for c in LANGUAGES]) if i != tok.unk_token_id]
    return _M


def _feats(y):
    M = _model()
    x = M['p'](y, sampling_rate=16000, return_tensors='pt').input_features
    return x.to(M['m'].device, dtype=next(M['m'].parameters()).dtype)


def lang(y):
    """P(ja) and P(en) for 16 kHz audio y, renormalised over every language Whisper knows."""
    M = _model()
    sot = M['p'].tokenizer.convert_tokens_to_ids('<|startoftranscript|>')
    with torch.no_grad():
        lg = M['m'](input_features=_feats(y), decoder_input_ids=torch.tensor([[sot]], device=M['m'].device)).logits[0, -1].float()
    ids = torch.tensor(M['langs'], device=lg.device)
    p = torch.softmax(lg[ids], -1)
    pj = float(p[M['langs'].index(M['ja'])]); pe = float(p[M['langs'].index(M['en'])])
    return round(pj, 3), round(pe, 3)


def ja_text(y):
    M = _model()
    with torch.no_grad():
        out = M['m'].generate(_feats(y), language='ja', task='transcribe', max_length=96)
    return M['p'].batch_decode(out, skip_special_tokens=True)[0].strip()


def _norm(w):
    w = re.sub(r'[^a-z0-9]', '', w.lower())
    return 'hmm' if re.fullmatch(r'h?m+h?m*', w) else w  # "Mm" is read and heard as "Hmm"


def word_spans(y, parts, asr):
    """Where each Japanese word of an English line is in its take (16 kHz audio y), as [(word, start s, end s)], and
    what English Whisper heard outside those words (it translates or drops Japanese: おはようございます as "Good
    morning"), to check the English against. parts: cfg.parts() of the line ([('en', 'On the train you said'),
    ('ja', '待って'), ...]). asr: check.py's Whisper pipeline. English Whisper with word times; its words are matched to the
    line's English words, and a Japanese word is whatever Whisper heard between the English words around it (in the gap
    between them if it heard nothing there)."""
    import difflib
    said = []  # (kind, normalised token or the Japanese word)
    for kind, t in parts:
        if kind == 'ja':
            said.append(('ja', t))
        else:
            said += [('en', _norm(w)) for w in re.findall(r"[A-Za-z0-9'’]+", t) if _norm(w)]
    out = asr({'raw': y, 'sampling_rate': 16000}, return_timestamps='word', generate_kwargs={'language': 'en', 'task': 'transcribe'})
    chunks = out.get('chunks', [])
    chunks = [c for c in chunks if _norm(c['text'])] or chunks
    heard = [(_norm(c['text']), c['timestamp'][0], c['timestamp'][1]) for c in chunks]
    end = len(y) / 16000
    sm = difflib.SequenceMatcher(None, [s[1] if s[0] == 'en' else '\0' for s in said], [h[0] for h in heard], autojunk=False)
    match = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            match[a + k] = b + k
    spans, inside = [], set()
    for i, (kind, w) in enumerate(said):
        if kind != 'ja':
            continue
        before = max([j for j in match if j < i], default=None)
        after = min([j for j in match if j > i], default=None)
        lo = match[before] + 1 if before is not None else 0
        hi = match[after] if after is not None else len(heard)
        inside.update(range(lo, hi))
        if hi > lo:
            s0 = heard[lo][1] or 0.0
            s1 = heard[hi - 1][2] or (heard[hi][1] if hi < len(heard) else end)
        else:
            s0 = heard[lo - 1][2] if lo > 0 and heard[lo - 1][2] else 0.0
            s1 = heard[hi][1] if hi < len(heard) else end
        spans.append((w, round(float(s0), 2), round(float(max(s1, s0 + 0.3)), 2)))
    english = ' '.join(c['text'].strip() for j, c in enumerate(chunks) if j not in inside)
    return spans, english


def words_native(y, parts, asr):
    """([(word, start, end, P(ja))], English heard) for the Japanese words in a take of an English line (word_spans), each
    measured on its own stretch plus a little either side."""
    spans, english = word_spans(y, parts, asr)
    out = []
    for w, a, b in spans:
        seg = y[max(0, int((a - 0.05) * 16000)):int((b + 0.08) * 16000)]
        out.append((w, a, b, lang(seg)[0] if len(seg) >= 3200 else 0.0))
    return out, english


def load(path):
    return librosa.load(path, sr=16000)[0]


# Rough pitch accent for the taught words (Tokyo accent, NHK dictionary): H/L per mora. Only the first two morae are
# checked (the sanity check: a head-high word must fall after its first mora, the others must rise).
ACCENT = {
    'matte': 'HLL',          # ma'tte (待つ is atamadaka)
    'akete': 'LHH',          # 開ける heiban
    'kite': 'HL',            # ki'te
    'ugoite': 'LHLL',        # ugo'ite
    'irete': 'LHH',          # 入れる heiban
    'dashite': 'HLL',        # da'shite
    'tomatte': 'LHHH',       # 止まる heiban
    'ohayo': 'LHHHLHHHL',    # ohayoo gozaima'su
    'yoroshiku': 'LHHHLLLLLHL',  # yoroshiku onegaishima'su (2nd phrase starts low)
    'sumimasen': 'LHHHL',    # sumimase'n
    'gaijin': 'LHHH',        # gaijin heiban
}


def accent(y, word, male=False):
    """Pitch of the first two morae (splitting the voiced stretch evenly by mora count): 'HL' or 'LH', and whether it
    matches ACCENT[word]'s first two. Returns (seen, expected, ok) or None when there's too little voiced audio."""
    pat = ACCENT.get(word)
    if not pat:
        return None
    f, v, _ = librosa.pyin(y, fmin=65 if male else 120, fmax=300 if male else 500, sr=16000, frame_length=1024, hop_length=160)
    idx = np.where(~np.isnan(f))[0]
    if len(idx) < 8:
        return None
    seg = f[idx[0]:idx[-1] + 1]
    n = len(pat)
    parts = np.array_split(seg, n)
    m = [np.nanmedian(p) if np.any(~np.isnan(p)) else np.nan for p in parts[:2]]
    if np.isnan(m[0]) or np.isnan(m[1]):
        return None
    st = 12 * np.log2(m[1] / m[0])  # semitones from mora 1 to mora 2
    seen = 'LH' if st > 0.5 else ('HL' if st < -0.5 else 'flat')
    exp = pat[:2]
    return seen, exp, round(float(st), 1), seen == exp


if __name__ == '__main__':
    args = sys.argv[1:]
    here = os.path.dirname(os.path.abspath(__file__))
    aud = os.path.join(here, '..', '..', 'game3d', 'audio')
    if args and args[0] == '--words':
        pre = args[1].split(',')
        files = sorted(f for f in os.listdir(aud) if f.endswith('.mp3') and f.startswith(tuple(pre)) and '-slow' not in f)
        args = [os.path.join(aud, f) for f in files]
    for p in args:
        y = load(p)
        k = os.path.basename(p)[:-4]
        w = k.split('-', 1)[1] if '-' in k else k
        print(k, lang(y), ja_text(y), accent(y, w, male=k.startswith('eric')), flush=True)
