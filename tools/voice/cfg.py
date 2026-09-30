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
from voices import REFS, VR, tts_text  # noqa: E402

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


def load(path, default):
    return json.load(open(path)) if os.path.exists(path) else default


def ref(name):
    """A clone reference in tools/voice-refs/ with its transcript (<name>.txt)."""
    return (f'{VR}/{name}.wav', open(f'{VR}/{name}.txt').read().strip(), name)


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
        'kuro': ref('kuro-design'),
        'reader': ref('goro-ref12'),
        # Eric: English for everything he says (eric-2, no accent)
        'eric': ref('eric-voice'),
        'emi': ref('emi-slice12'),
    }
    sp['ann'] = sp['conductor']
    sp['commuter'] = sp['sales1']
    # train passengers: borrowed voices, none of them recurring cast
    sp['bun'] = sp['sales2']; sp['youth'] = sp['sales1']; sp['music'] = sp['kuro']; sp['stander'] = sp['reader']
    # the canteen worker closing the plaza terrace after work (evening discovery): a borrowed voice, not Kuro's
    sp['canteen_worker'] = sp['sales2']
    return sp


FEMALE = {'mio', 'aoi', 'sales2', 'kuro', 'gatev', 'conductor', 'ann', 'emi', 'bun', 'music', 'canteen_worker'}
MALE = {'eric', 'guard', 'kuroda', 'sales1', 'mori', 'kenji', 'reader', 'commuter', 'youth', 'stander'}
LUFS = {'eric': -23.0, 'gatev': -20.0, 'conductor': -20.0, 'ann': -20.0}  # Eric quieter, recorded voices a little under the cast
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
    """game3d/audio/manifest.json with 'said' (the written line, what the check compares against) and 'tts' (what is read)."""
    m = json.load(open(f'{AUD}/manifest.json'))
    for e in m:
        e['said'] = e['text']
        e['lang'] = e.get('lang') or 'ja'
        t = TTS_OVERRIDE.get(e['key'], e['said'])
        e['tts'] = tts_text(t) if e['lang'] == 'ja' else spoken(t.strip())
    return m


def missing():
    """Manifest keys with no exported clip for their current text."""
    clips = load(CLIPS, {})
    return [e['key'] for e in manifest() if not (clips.get(e['key']) == e['said'] and os.path.exists(f"{AUD}/{e['key']}.mp3"))]


def lock_ok():
    try:
        return open(LOCK).read().strip() == ME
    except Exception:
        return False


if __name__ == '__main__' and sys.argv[1:] == ['missing']:
    print(','.join(missing()))
