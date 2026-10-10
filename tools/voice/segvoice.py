"""Does a clip keep one voice from start to end? The clip is cut at its pauses into stretches of speech (at least about
half a second each), and each stretch gets its WavLM speaker embedding and median pitch. A stretch whose voice is far
from the speaker's reference AND far below the rest of the clip is a voice break: the line changes voice partway
(Jørgen, 2026-10-10: "kenji's first dialogue is breaking into different voices when he talks english"; in "Ah... chair"
the "Ah..." was another voice, 0.35 to Kenji's reference against 0.75 to 0.89 for the rest of the line).
check_takes.py uses breaks() on every English take, so such a take never passes; on its own it measures exported clips:
  ~/ai/tts-bench/.venv/bin/python tools/voice/segvoice.py [--speaker kenji] [--lang en] [--all] [keys...]
prints each clip's stretches and the clips with a break, and exits 1 if any has one. Default: every English line."""
import os, re, sys
import numpy as np, librosa

SR = 16000
MIN_LEN = 0.45   # a stretch shorter than this is joined to its neighbour (WavLM needs about half a second)
ABS = 0.55       # a stretch under this similarity to the reference ...
GAP = 0.25       # ... and this far under the median of the clip's other stretches is another voice


def stretches(y, sr=SR):
    """[(start, end)] sample indices of the speech stretches: split at pauses (35 dB under the peak), gaps under 0.12 s
    closed, stretches under MIN_LEN joined to the one before."""
    segs = []
    for a, b in librosa.effects.split(y, top_db=35):
        if segs and a - segs[-1][1] < 0.12 * sr:
            segs[-1][1] = b
        else:
            segs.append([a, b])
    out = []
    for s in segs:
        if out and (s[1] - s[0] < MIN_LEN * sr or out[-1][1] - out[-1][0] < MIN_LEN * sr):
            out[-1][1] = s[1]
        else:
            out.append(s)
    return [tuple(s) for s in out]


def measure(y, emb, pitch, ref):
    """Each stretch of 16 kHz audio y: {'t': [start s, end s], 'sim': similarity to ref (an embedding from emb()),
    'f0': median pitch}. emb, pitch: tools/island_audio/check.py's C.emb and C.pitch (shared, so no second model loads)."""
    ref = np.asarray(ref, dtype=np.float32)
    out = []
    for a, b in stretches(y):
        s = y[a:b]
        out.append({'t': [round(a / SR, 2), round(b / SR, 2)], 'sim': round(float(np.asarray(emb(s)) @ ref), 3), 'f0': pitch(s)[0]})
    return out


HUM = re.compile(r'^(m+|mm+h?m*|hm+|h?mm+|mhm+|n+|ん+|うん|ふん)$', re.I)


def hum(text):
    """A stretch that is only a closed-mouth hum ("Mm.", which the TTS reads as "Hmm"): WavLM can't tell whose voice a
    hum is (Mio's "Mm." stretches score 0.1 to 0.5 to her reference), so it is never counted as a break."""
    words = re.findall(r"[\w']+", text)
    return not words or all(HUM.match(w) for w in words)


def breaks(rows, y=None, transcribe=None):
    """The stretches (indices) in another voice: under ABS to the reference and GAP under the others' median, and not a
    hum. transcribe(audio) -> English text: when given, a candidate stretch is heard first (y: the clip's audio) and
    dropped if it is a hum ('heard' is added to its row)."""
    out = []
    for i, r in enumerate(rows):
        rest = [x['sim'] for j, x in enumerate(rows) if j != i]
        if rest and r['sim'] < ABS and float(np.median(rest)) - r['sim'] > GAP:
            if transcribe is not None and y is not None:
                r['heard'] = transcribe(y[int(r['t'][0] * SR):int(r['t'][1] * SR)])
                if hum(r['heard']):
                    continue
            out.append(i)
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    sys.argv = [sys.argv[0]]
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from cfg import AUD, manifest, speakers  # puts tools/island_audio on the path
    import check as C
    opt = lambda k: args[args.index(k) + 1] if k in args else None
    keys = [a for a in args if not a.startswith('--') and a not in (opt('--speaker'), opt('--lang'))]
    lang = None if '--all' in args else (opt('--lang') or 'en')
    lines = [e for e in manifest() if (not keys or e['key'] in keys) and (not opt('--speaker') or e['speaker'] == opt('--speaker'))
             and (keys or lang is None or e['lang'] == lang) and os.path.exists(f"{AUD}/{e['key']}.mp3")]
    SP = speakers()
    english = lambda a: C.asr({'raw': a, 'sampling_rate': SR}, generate_kwargs={'language': 'en', 'task': 'transcribe'})['text']
    refs = {}
    bad = []
    for e in lines:
        if e['speaker'] not in refs:
            refs[e['speaker']] = C.emb(librosa.load(SP[e['speaker']][0], sr=SR)[0])
        y = librosa.load(f"{AUD}/{e['key']}.mp3", sr=SR)[0]
        rows = measure(y, C.emb, C.pitch, refs[e['speaker']])
        br = breaks(rows, y, english)
        print('BREAK' if br else 'ok', e['key'], e['speaker'], e['said'][:60], '|',
              ' '.join(f"{'*' if i in br else ''}{r['t'][0]}-{r['t'][1]}s:{r['sim']:.2f}/{r['f0'] and round(r['f0'])}Hz{' ' + repr(r['heard']) if 'heard' in r else ''}" for i, r in enumerate(rows)), flush=True)
        if br:
            bad.append(e['key'])
    print(f'{len(bad)} of {len(lines)} clips change voice partway:', ' '.join(bad))
    sys.exit(1 if bad else 0)
