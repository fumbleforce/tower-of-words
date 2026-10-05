"""Settings for the game's voice clips (game3d/audio/<key>.mp3): who speaks with which clone reference, loudness per
speaker, text fixes for the TTS, the manifest with the text to speak, the work folder and the GPU lock.
Shared by gen_takes.py, check_takes.py, export.py, edge.py and spans.py; run.sh is the entry point.
Clone references are in tools/voice-refs/ (tools/island_audio/voices.py names the older ones).

Where things live:
  tools/voice/clips.json   key -> text of every exported clip (a clip is redone when its line's text changes)
  tools/voice/force.json   key -> take to export even if another take scores better (picked by ear)
  tools/voice/alt_text.json  key -> other English wording for the TTS when the written line keeps failing (gen_takes --alt)
  tools/voice/edge.json    lines voiced by the edge-tts fallback (GUIDE: edge-tts only as a fallback)
  $GAME3D_VOICE_WORK (default ~/ai/game3d-voice): raw/<key>/<take>.wav takes, metrics.json, report.json, logs. Not in git."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, f'{REPO}/tools/island_audio')
try:
    from voices import REFS, VR, tts_text  # noqa: E402
except ImportError as _e:  # untracked: a worktree needs it linked from the main checkout (voice-clips skill)
    sys.exit(f'voice setup: cannot import tools/island_audio/voices.py ({_e}); symlink it from the main checkout')

WORK = os.environ.get('GAME3D_VOICE_WORK', os.path.expanduser('~/ai/game3d-voice'))
RAW = f'{WORK}/raw'
METRICS = f'{WORK}/metrics.json'
REPORT = f'{WORK}/report.json'
AUD = f'{REPO}/game3d/audio'
CLIPS = f'{HERE}/clips.json'
FORCE = f'{HERE}/force.json'
ALT = f'{HERE}/alt_text.json'
EDGE = f'{HERE}/edge.json'
LOCK = os.environ.get('GPU_LOCK', f'/tmp/claude-{os.getuid()}/gpu.lock') + '/owner'
ME = os.environ.get('LOCK_ME', 'game3d-voices')
QWEN = os.environ.get('QWEN_MODEL', os.path.expanduser('~/ai/tts/qwen/Qwen3-TTS-12Hz-1.7B-Base'))


def load(path, default):
    return json.load(open(path)) if os.path.exists(path) else default


def ref(name):
    """A clone reference in tools/voice-refs/ with its transcript (<name>.txt; '' if missing, which setup() reports)."""
    txt = f'{VR}/{name}.txt'
    return (f'{VR}/{name}.wav', open(txt).read().strip() if os.path.exists(txt) else '', name)


AOI_TEXT = 'あ、おはよう！　今日もがんばろうね！あたし、アオイ！インターンなんだけど、毎日ちょっと失敗しちゃうの。でも、明日はきっと大丈夫！たぶん！'


def speakers():
    """speaker id in the story -> (reference wav, its transcript, label). Voices per person: docs/game/art-and-sound.md."""
    sp = {
        'mio': REFS['mio'][:2] + ('mio-a',),
        'guard': REFS['ishibashi'][:2] + ('ishibashi-ref12',),
        'kuroda': REFS['salaryman'][:2] + ('salaryman-design',),
        'sales1': ref('sales1-design'),
        'sales2': REFS['staff'][:2] + ('staff-design',),
        'aoi': (f'{VR}/aoi-ref12.wav', AOI_TEXT, 'aoi-ref12'),
        'gatev': REFS['vending'][:2] + ('vending-design',),
        'conductor': REFS['lift'][:2] + ('lift-announcer',),
        'mori': ref('mori-design'),
        'kenji': ref('kenji-design'),
        'kuro': ref('kuro-husky'),  # Review kuro-voice-2, b
        'reader': ref('goro-ref12'),
        # Eric: the English voice eric-2 (no accent); his Japanese words are still read in Japanese (gen_takes.py)
        'eric': ref('eric-voice'),
        'emi': ref('emi-slice12'),
    }
    sp['ann'] = sp['conductor']
    sp['commuter'] = sp['sales1']
    # train passengers: borrowed voices, none of them recurring cast
    sp['bun'] = sp['sales2']; sp['youth'] = sp['sales1']; sp['music'] = sp['kuro']; sp['stander'] = sp['reader']
    # the canteen worker closing the plaza terrace after work (evening discovery): a borrowed voice, not Kuro's
    sp['canteen_worker'] = sp['sales2']
    # Background people use the approved body-matched contextual Talk presets.
    sp['worker_a'] = sp['sales2']; sp['worker_b'] = sp['reader']
    sp['commuter_1'] = sp['sales1']; sp['commuter_2'] = sp['reader']; sp['commuter_3'] = sp['kenji']
    # day 3 (story/day3/): the gym's attendant and the swimming club's member, borrowed voices; Rei (Sales) borrows the
    # woman from Sales' until she has a voice of her own
    sp['attendant'] = sp['sales1']; sp['member'] = sp['aoi']; sp['rei'] = sp['sales2']
    return sp


FEMALE = {'mio', 'aoi', 'sales2', 'kuro', 'gatev', 'conductor', 'ann', 'emi', 'bun', 'music', 'canteen_worker', 'worker_a',
          'member', 'rei'}
MALE = {'eric', 'guard', 'kuroda', 'sales1', 'mori', 'kenji', 'reader', 'commuter', 'youth', 'stander', 'worker_b',
        'commuter_1', 'commuter_2', 'commuter_3', 'attendant'}
# clones whose reference speaks English: their Japanese is made from the timbre alone (gen_takes.xvec)
XVEC_JA = {'eric'}
LUFS = {'eric': -23.0, 'gatev': -20.0, 'conductor': -20.0, 'ann': -20.0,  # Eric quieter, recorded voices a little under the cast
        'kuro': -20.0}  # Kuro's husky voice: "bit loud" at -18 (Review kuro-voice-2)
LUFS_DEFAULT = -18.0

# what the TTS reads instead of the written line (numbers, letters); the check still compares against the written line
TTS_OVERRIDE = {
    'oh-yowtk': 'ノルウェーから、ですね。私、千九百九十四年にリレハンメルへ行きました。',
    'ln-2sij76': 'Nineteen ninety-six.',
}

# interjections spelled with letters get read out as letters ("Mm" -> "Em Em"); speak them as sounds instead
_FILL = [(r'\bMm+\b', 'Hmm'), (r'\bmm+\b', 'hmm'), (r'\bHm+\b', 'Hmm'), (r'\bEh\b', 'Ehh'), (r'\bNe\b', 'Neh'),
         (r'\bUm\b', 'Umm'), (r'\bHa\b', 'Hah')]

# Japanese word -> romaji, from game3d/js/lang.js: the English voice reads kana badly, so it gets the romaji
_JA2RO = {}
for _m in re.finditer(r"^\s*(\w+): \{ ja: '([^']+)'(?:, alias: \[([^\]]*)\])?, ro: '([^']+)'",
                      open(f'{REPO}/game3d/js/lang.js').read(), re.M):
    _ro = _m.group(4).replace('ō', 'o').replace('ū', 'u')
    for _ja in [_m.group(2)] + re.findall(r"'([^']+)'", _m.group(3) or ''):
        _JA2RO[_ja] = _ro


def spoken(t):
    """The text an English line's TTS reads: Japanese words as romaji, clock times as numbers, interjections as sounds."""
    for ja in sorted(_JA2RO, key=len, reverse=True):
        t = t.replace(ja, _JA2RO[ja])
    t = re.sub(r'\b(\d{1,2}):(\d{2})\b', lambda m: f'{m.group(1)} {m.group(2)}', t)
    for a, b in _FILL:
        t = re.sub(a, b, t)
    return t


def manifest():
    """game3d/audio/manifest.json with 'said' (the written line, what the check compares against) and 'tts' (what is read).
    An English line with Japanese in it also gets 'parts' (see parts())."""
    m = json.load(open(os.environ.get('VOICE_MANIFEST', f'{AUD}/manifest.json')))  # VOICE_MANIFEST: another story's (a worktree's)
    for e in m:
        e['said'] = e['text']
        e['lang'] = e.get('lang') or 'ja'
        t = TTS_OVERRIDE.get(e['key'], e['said'])
        e['tts'] = tts_text(t) if e['lang'] == 'ja' else spoken(t.strip())
        if e['lang'] == 'en':
            ps = parts(t)
            if any(lang == 'ja' for lang, _ in ps):
                e['parts'] = ps
    return m


# Japanese said inside an English line: voiced natively, as its own Japanese take spliced into the line (splice.py).
# Romaji Japanese in English lines, spelled in kana for that take:
RO2JA = {'arigatō': 'ありがとう', '“tai”': 'たい'}  # quoted, so it never matches inside an English word
_JA_RUN = re.compile('(' + '|'.join(RO2JA) + r'|[぀-ヿ㐀-鿿々][぀-ヿ㐀-鿿々ー〜]*)([!?！？.。,、…]*)', re.I)
_JA_PUNCT = str.maketrans({'!': '！', '?': '？', '.': '。', ',': '、'})


def parts(text):
    """An English line cut at its Japanese: [('en', 'On the train you said'), ('ja', '待って'), ('en', 'and the doors...')].
    Punctuation after a Japanese word stays with it (in Japanese form). Just [('en', text)] when there's no Japanese."""
    out, i = [], 0
    for m in _JA_RUN.finditer(text):
        en = text[i:m.start()].strip()
        if re.search(r'[A-Za-z0-9]', en):
            out.append(('en', re.sub(r'^[,.;:!? ]+', '', en)))
        ja = RO2JA.get(m.group(1).lower(), m.group(1))
        p = m.group(2).replace('...', '…').translate(_JA_PUNCT)
        out.append(('ja', ja + ('…' if '…' in p else p[:1])))
        i = m.end()
    en = text[i:].strip()
    if re.search(r'[A-Za-z0-9]', en):
        out.append(('en', re.sub(r'^[,.;:!? ]+', '', en)))
    return out


def units(keys=None):
    """What the TTS makes and the check checks: every manifest line, except that a line with 'parts' is made part by part,
    each as '<key>~<n>' with its own lang, 'said' and 'tts' and 'line' (the key of its line). keys: only these lines."""
    out = []
    for e in manifest():
        if keys is not None and e['key'] not in keys:
            continue
        if 'parts' not in e:
            out.append(e)
            continue
        for n, (lang, t) in enumerate(e['parts']):
            out.append({'key': f"{e['key']}~{n}", 'line': e['key'], 'speaker': e['speaker'], 'lang': lang, 'said': t,
                        'tts': tts_text(t) if lang == 'ja' else spoken(t), 'overheard': False, 'part': True})
    return out


def missing():
    """Manifest keys with no exported clip for their current text."""
    clips = load(CLIPS, {})
    return [e['key'] for e in manifest() if not (clips.get(e['key']) == e['said'] and os.path.exists(f"{AUD}/{e['key']}.mp3"))]


def lock_ok():
    try:
        return open(LOCK).read().strip() == ME
    except Exception:
        return False


def setup(keys=None):
    """What would make a batch fail before any take is judged, as plain sentences (empty if none): a speaker in the lines
    with no voice in speakers(), a clone reference wav that is missing or empty (check_takes.py loads every speaker's),
    a missing or empty transcript for a speaker in the lines, no Qwen model folder. keys: the lines to voice (default all)."""
    out, sp = [], speakers()
    need = {e['speaker'] for e in units(keys)}
    for s in sorted(need - set(sp)):
        out.append(f'no voice for speaker {s!r}: add it to speakers() in tools/voice/cfg.py')
    for wav in sorted({v[0] for v in sp.values()}):
        if not os.path.isfile(wav) or os.path.getsize(wav) < 1000:
            out.append(f'clone reference {os.path.relpath(wav, REPO)} is missing or empty (copy it from the main checkout)')
    for s in sorted(need & set(sp)):
        if not sp[s][1]:
            out.append(f'no transcript for {s!r}: tools/voice-refs/{sp[s][2]}.txt is missing or empty')
    if not os.path.isdir(QWEN):
        out.append(f'Qwen model folder {QWEN} not found (set QWEN_MODEL)')
    return out


if __name__ == '__main__' and sys.argv[1:] == ['missing']:
    print(','.join(missing()))
if __name__ == '__main__' and sys.argv[1:2] == ['setup']:
    # setup [keys, comma separated]: prints every problem and exits 1; run.sh runs it before it waits for the GPU lock
    _p = setup(set(sys.argv[2].split(',')) if sys.argv[2:] and sys.argv[2] else None)
    for _x in _p:
        print('SETUP', _x)
    sys.exit(1 if _p else 0)
