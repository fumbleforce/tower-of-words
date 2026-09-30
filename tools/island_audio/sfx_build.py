"""Build the island slice's sound effects and ambience beds from their candidates (sfx_spec.py): Kenney's CC0 packs and local
Stable Audio 3 takes. Every candidate is trimmed, levelled, looped (loops and beds: a crossfaded seamless loop) or cut into single steps
(footsteps), scored with CLAP (laion/larger_clap_general: how well the audio matches the sound's description), and written as an MP3
for the review page. The default per sound is the best CLAP score, unless PREFER says otherwise; it goes into the game as Ogg Vorbis.
Outputs:
  legacy/island/godot/assets/audio/sfx/<name>.ogg (steps: <name>_1.ogg ...), legacy/island/godot/assets/audio/sfx/index.json (with source and licence)
  legacy/proto2/island-audio/media/sfx/<candidate>.mp3, ~/ai/island-audio/sfx/candidates.json (every candidate, for the page)
Run: ~/ai/tts-bench/.venv/bin/python tools/island_audio/sfx_build.py  (CPU)"""
import json, os, glob, subprocess, sys, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, librosa, soundfile as sf, pyloudnorm, torch
from sfx_spec import ALL, SFX, AMB

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = os.path.expanduser('~/ai/island-audio')
KEN = f'{W}/kenney'
RAW = f'{W}/sfx/raw'
TMP = f'{W}/sfx/work'
GAME = f'{REPO}/legacy/island/godot/assets/audio/sfx'
AMB_GAME = f'{REPO}/legacy/island/godot/assets/audio/amb'
PAGE = f'{REPO}/legacy/proto2/island-audio/media/sfx'
SR = 44100
KENNEY_URL = {'impact-sounds': 'https://kenney.nl/assets/impact-sounds', 'rpg-audio': 'https://kenney.nl/assets/rpg-audio',
              'interface-sounds': 'https://kenney.nl/assets/interface-sounds', 'ui-audio': 'https://kenney.nl/assets/ui-audio',
              'digital-audio': 'https://kenney.nl/assets/digital-audio', 'sci-fi-sounds': 'https://kenney.nl/assets/sci-fi-sounds',
              'casino-audio': 'https://kenney.nl/assets/casino-audio', 'music-jingles': 'https://kenney.nl/assets/music-jingles'}
PACK = {'impact-sounds': 'Impact Sounds', 'rpg-audio': 'RPG Audio', 'interface-sounds': 'Interface Sounds', 'ui-audio': 'UI Audio',
        'digital-audio': 'Digital Audio', 'sci-fi-sounds': 'Sci-fi Sounds', 'casino-audio': 'Casino Audio', 'music-jingles': 'Music Jingles'}
SA3_LICENCE = ('generated locally with Stable Audio 3 Medium (stabilityai/stable-audio-3-medium, Stability AI Community License, '
               'licence tag "stable-audio-community"); read the licence terms before any commercial release')
UI = {'ui_click', 'ui_select', 'ui_open', 'ui_close', 'ui_error', 'catch', 'say', 'command_land', 'twitch', 'stutter', 'rule'}
# Loudness targets (integrated LUFS; RMS for sounds too short to gate)
def target(name):
    if name in AMB:
        return -30.0
    k = ALL[name]['kind']
    if k == 'loop':
        return -26.0
    if k == 'steps':
        return -24.0
    if name in UI:
        return -22.0
    return -19.0
# Short sounds are cut to a length that fits what they are (a card reader beeps, it doesn't hold a tone), with a fade
MAXLEN = {'key': 0.5, 'power_down': 3.0, 'turnstile_beep': 0.35, 'twitch': 0.6, 'shutter': 0.45, 'say': 0.9, 'stutter': 1.1, 'ui_click': 0.3, 'ui_select': 0.5,
          'catch': 1.2, 'command_land': 1.8, 'tambourine': 0.6, 'thump': 0.6, 'kick': 0.8, 'coins': 1.4, 'vending_clunk': 1.2,
          'stapler': 0.6, 'lift_chime': 2.2, 'phone_buzz': 1.6}
# Hand choices where the score can't know the context (otherwise CLAP picks), with the reason shown on the review page
PREFER = {'power_down': 'power_down.sa3-3001', 'key': 'key.sa3-3000'}
PREFER_WHY = {
    'power_down': ('picked by its spectrogram: only sa3-3001 and sa3-3098 have a hum that falls in pitch (harmonics from about 300 Hz '
                   'down to 60 Hz over 1.5 s), and sa3-3001 has no click; CLAP preferred sa3-3000, which is mostly relay clicks'),
    'key': ('picked by its spectrogram: the script plays key twice 0.5 s apart (the lock sticks, then opens), so every candidate is cut '
            'to 0.5 s, and sa3-3000 is the one with the rattle and the click both inside it'),
}
meter = pyloudnorm.Meter(SR, block_size=0.2)


def load(p):
    y, _ = librosa.load(p, sr=SR, mono=False)
    return y if y.ndim == 2 else y[None, :]


def loud(y):
    m = y.mean(0)
    if len(m) >= int(0.45 * SR):
        try:
            v = meter.integrated_loudness(m)
            if np.isfinite(v):
                return float(v)
        except Exception:
            pass
    act = m[np.abs(m) > 1e-4]
    return float(20 * np.log10(np.sqrt((act ** 2).mean()) + 1e-9) - 0.7) if len(act) else -70.0


def level(y, lufs):
    g = 10 ** ((lufs - loud(y)) / 20)
    y = y * g
    pk = np.abs(y).max()
    if pk > 0.89:  # about -1 dBFS
        y = y * 0.89 / pk
    return y


def trim(y, top_db=45, pre=0.01, post=0.06):
    _, (a, b) = librosa.effects.trim(y.mean(0), top_db=top_db)
    a = max(0, a - int(pre * SR)); b = min(y.shape[1], b + int(post * SR))
    y = y[:, a:b].copy()
    n = min(int(0.003 * SR), y.shape[1] // 4); m = min(int(0.04 * SR), y.shape[1] // 3)
    if n: y[:, :n] *= np.linspace(0, 1, n)
    if m: y[:, -m:] *= np.linspace(1, 0, m)
    return y


def make_loop(y, length_s, xf_s):
    st = int(0.3 * SR)
    L, X = int(length_s * SR), int(xf_s * SR)
    if y.shape[1] < st + L + X:
        L = y.shape[1] - st - X
    body = y[:, st:st + L].copy()
    tail = y[:, st + L:st + L + X]
    t = np.linspace(0, 1, X)
    body[:, :X] = body[:, :X] * np.sqrt(t) + tail * np.sqrt(1 - t)
    return body


def split_steps(y, n=4):
    m = y.mean(0)
    on = librosa.onset.onset_detect(y=m, sr=SR, units='samples', backtrack=True, delta=0.2)
    segs = []
    for i, o in enumerate(on):
        end = on[i + 1] - int(0.01 * SR) if i + 1 < len(on) else len(m)
        end = min(end, o + int(0.45 * SR))
        if end - o > int(0.08 * SR):
            segs.append(y[:, max(0, o - int(0.005 * SR)):end])
    segs.sort(key=lambda s: -np.abs(s).max())
    return [trim(s, top_db=40, pre=0.005, post=0.03) for s in segs[:n]]


def write_mp3(y, path, kbps=96):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    wav = path[:-4] + '.tmp.wav'
    sf.write(wav, y.T, SR)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', path], check=True)
    os.remove(wav)


def write_ogg(y, path, q=5):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    wav = path[:-4] + '.tmp.wav'
    sf.write(wav, y.T, SR)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', str(q), path], check=True)
    os.remove(wav)


def candidates(name, e):
    out = []
    for i, k in enumerate(e['kenney']):
        pack = k.split('/')[0]
        p = next(iter(glob.glob(f'{KEN}/{pack}/**/{k.split("/")[1]}', recursive=True)), None)
        if not p:
            print('missing kenney file', k, flush=True)
            continue
        extra = ''
        if name == 'step_tile':
            extra = 'brightened (high shelf +5 dB at 2.5 kHz) as a stand-in for tile'
        out.append({'id': f'{name}.k{i + 1}', 'path': p, 'source': f'Kenney, {PACK[pack]} pack: {os.path.basename(p)}',
                    'url': KENNEY_URL[pack], 'licence': 'CC0 1.0 (Kenney License.txt in the pack)', 'processing': extra, 'origin': 'kenney'})
    for p in sorted(glob.glob(f'{RAW}/{name}-sa3-*.flac')):
        info = json.load(open(p[:-5] + '.json'))
        seed = info['seed']
        out.append({'id': f'{name}.sa3-{seed}', 'path': p, 'source': f'Stable Audio 3 Medium, local ComfyUI, seed {seed}',
                    'prompt': info['prompt'], 'settings': f'{info["seconds"]} s, {info["sampler"]}', 'licence': SA3_LICENCE, 'origin': 'sa3'})
    return out


def process(name, e, c):
    y = load(c['path'])
    kind = e['kind']
    if name == 'step_tile' and c['origin'] == 'kenney':
        tmp = f'{TMP}/tile_{os.path.basename(c["path"])}.wav'
        os.makedirs(TMP, exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', c['path'], '-af', 'highshelf=f=2500:g=5', '-ar', str(SR), tmp], check=True)
        y = load(tmp)
    if kind == 'loop':
        secs = y.shape[1] / SR
        if name in AMB:
            y = make_loop(y, min(24.0, secs - 3), 1.5)
        elif secs >= 4:
            y = make_loop(y, min(6.0, secs - 1.2), 0.5)
        else:
            y = trim(y)  # a short Kenney loop: used as is
        c['loop'] = True
    elif kind == 'steps':
        steps = [trim(y, top_db=40)] if c['origin'] == 'kenney' else split_steps(y)
        c['steps'] = [level(s.mean(0, keepdims=True), target(name)) for s in steps]
        return None
    else:
        y = trim(y)
        if name not in AMB:
            y = y.mean(0, keepdims=True)
        mx = MAXLEN.get(name)
        if mx and y.shape[1] > int(mx * SR):
            y = y[:, :int(mx * SR)].copy()
            f = min(int(0.06 * SR), y.shape[1] // 3)
            y[:, -f:] *= np.linspace(1, 0, f)
            c['processing'] = ((c.get('processing') or '') + f' cut to {mx} s').strip()
    return level(y, target(name))


def clap_scores(texts_audios):
    from transformers import ClapModel, ClapProcessor
    m = ClapModel.from_pretrained('laion/larger_clap_general').eval()
    p = ClapProcessor.from_pretrained('laion/larger_clap_general')
    out = []
    for text, y in texts_audios:
        a = librosa.resample(y.mean(0), orig_sr=SR, target_sr=48000)[: 48000 * 10]
        with torch.no_grad():
            inp = p(text=[text], audio=[a], sampling_rate=48000, return_tensors='pt', padding=True)
            o = m(**inp)
            ta = torch.nn.functional.normalize(o.text_embeds, dim=-1)
            aa = torch.nn.functional.normalize(o.audio_embeds, dim=-1)
            out.append(round(float((ta @ aa.T)[0, 0]), 3))
    return out


def main():
    # --only a,b builds just those sounds and merges them into the existing index, hooks and candidate list
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    allc = {}
    jobs = []
    for name, e in ALL.items():
        if only and name not in only:
            continue
        cs = candidates(name, e)
        for c in cs:
            y = process(name, e, c)
            if y is None:  # steps
                demo = np.concatenate([np.concatenate([s, np.zeros((1, int(0.38 * SR)))], 1) for s in c['steps']] * 2, 1)
                c['_audio'] = demo
            else:
                c['_audio'] = y
            c['seconds'] = round(c['_audio'].shape[1] / SR, 2)
            jobs.append((f'the sound of {e["desc"][0].lower() + e["desc"][1:]}'.split(' (')[0], c['_audio']))
        allc[name] = cs
    print('scoring', len(jobs), 'candidates with CLAP', flush=True)
    scores = iter(clap_scores(jobs))
    for name, cs in allc.items():
        for c in cs:
            c['clap'] = next(scores)
    index, sources = {}, []
    for name, cs in allc.items():
        e = ALL[name]
        if not cs:
            continue
        pick = PREFER.get(name) or max(cs, key=lambda c: c['clap'])['id']
        for c in cs:
            c['picked'] = c['id'] == pick
            if c['picked'] and name in PREFER_WHY:
                c['note'] = PREFER_WHY[name]
            write_mp3(c['_audio'], f'{PAGE}/{c["id"]}.mp3', 128 if name in AMB else 96)
        c = next(c for c in cs if c['picked'])
        dest = AMB_GAME if name in AMB else GAME
        files = []
        if 'steps' in c:
            for i, s in enumerate(c['steps']):
                write_ogg(s, f'{dest}/{name}_{i + 1}.ogg')
                files.append(f'res://assets/audio/{"amb" if name in AMB else "sfx"}/{name}_{i + 1}.ogg')
        else:
            write_ogg(c['_audio'], f'{dest}/{name}.ogg', q=4 if name in AMB else 5)
            files.append(f'res://assets/audio/{"amb" if name in AMB else "sfx"}/{name}.ogg')
        index[name] = {'files': files, 'desc': e['desc'], 'kind': e['kind'], 'loop': e['kind'] == 'loop', 'replaces_hooks': e['hooks'],
                       'candidate': c['id'], 'source': c['source'], 'licence': c['licence'], 'placeholder': True}
        if c.get('url'): index[name]['url'] = c['url']
        if c.get('prompt'): index[name]['prompt'] = c['prompt']
        if c.get('note'): index[name]['why_this_one'] = c['note']
        print(name, '->', c['id'], c['clap'], flush=True)
    if only:  # keep every sound that wasn't rebuilt
        for d in (GAME, AMB_GAME):
            if os.path.exists(f'{d}/index.json'):
                for k, v in json.load(open(f'{d}/index.json')).get('sounds', {}).items():
                    index.setdefault(k, v)
    hooks = {h: v['files'][0] for k, v in index.items() for h in v['replaces_hooks']}
    for d, part in ((GAME, SFX), (AMB_GAME, AMB)):
        out = {'note': 'Placeholder sounds for the island slice, waiting for Jørgen. Source and licence per file. Built by tools/island_audio/sfx_build.py.',
               'sounds': {k: v for k, v in index.items() if k in part}}
        if part is SFX:
            out['hooks'] = hooks  # scripts/audio.gd's synthesised placeholder names -> a file
        json.dump(out, open(f'{d}/index.json', 'w'), ensure_ascii=False, indent=1)
    for cs in allc.values():
        for c in cs:
            c.pop('_audio', None); c.pop('steps', None); c.pop('path', None)
    if only and os.path.exists(f'{W}/sfx/candidates.json'):
        old = json.load(open(f'{W}/sfx/candidates.json'))
        old.update(allc)
        allc = old
    json.dump(allc, open(f'{W}/sfx/candidates.json', 'w'), ensure_ascii=False, indent=1)
    print('done', len(index), 'sounds', flush=True)


if __name__ == '__main__':
    main()
