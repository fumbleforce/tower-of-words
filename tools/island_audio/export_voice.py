"""Pick one take per line and export the island slice voices.
Pick: takes that pass every check (pitch guard, reading check, duration) first, then the fewest misread kana, then the closest
speaker similarity. Lines with no passing take still get their least bad take, flagged in the index.
Export: silence trimmed (40 ms head, 120 ms tail), loudness normalised per character (voices.LUFS: -18 LUFS, the player -23,
recorded building voices -20), peak under -1.5 dBFS, 44.1 kHz mono Ogg Vorbis.
  legacy/island/godot/assets/audio/voice/<line id>.ogg, voice/index.json (every line with its checks), voice/voices.json (the FORMAT `voices`
  section: line id -> file, plus "speaker|text" -> file for lines without an id in the script)
  legacy/proto2/island-audio/media/voice/<line id>/<take>.mp3 (every take, all at the same loudness, for the review page)
Run: ~/ai/tts-bench/.venv/bin/python tools/island_audio/export_voice.py"""
import json, os, subprocess, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, librosa, soundfile as sf, pyloudnorm
from voices import RAW, LINES, W, REPO, LUFS, LUFS_DEFAULT, TAKES, REFS

GAME = f'{REPO}/legacy/island/godot/assets/audio/voice'
PAGE = f'{REPO}/legacy/proto2/island-audio/media/voice'
SR = 44100
meter = pyloudnorm.Meter(SR, block_size=0.2)


def loudness(y):
    if len(y) >= int(0.45 * SR):
        try:
            v = meter.integrated_loudness(y)
            if np.isfinite(v):
                return float(v)
        except Exception:
            pass
    act = y[np.abs(y) > 1e-4]
    return float(20 * np.log10(np.sqrt((act ** 2).mean()) + 1e-9) - 0.7) if len(act) else -70.0


def prep(path, lufs):
    y, _ = librosa.load(path, sr=SR, mono=True)
    idx = librosa.effects.split(y, top_db=40)
    if len(idx):
        a = max(0, idx[0][0] - int(0.04 * SR)); b = min(len(y), idx[-1][1] + int(0.12 * SR))
        y = y[a:b].copy()
    n, m = int(0.005 * SR), int(0.03 * SR)
    if len(y) > n + m:
        y[:n] *= np.linspace(0, 1, n); y[-m:] *= np.linspace(1, 0, m)
    y = y * 10 ** ((lufs - loudness(y)) / 20)
    pk = np.abs(y).max() if len(y) else 0
    if pk > 0.84:  # -1.5 dBFS
        y = y * 0.84 / pk
    return y


def enc(y, path, args):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp.wav'
    sf.write(tmp, y, SR)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp] + args + [path], check=True)
    os.remove(tmp)


def rank(m):
    if m.get('error'):
        return (3, 9, 0)
    return (0 if m['ok'] else 1 if m['pitch_ok'] else 2, round(m['cer'] / 0.05), -(m['sim'] or 0))


def pick(raw, metrics):
    takes = {t: m for t, m in metrics.get(raw, {}).items() if os.path.exists(f'{RAW}/{raw}/{t}.wav')}
    if not takes:
        return None, None, {}
    best = min(takes, key=lambda t: rank(takes[t]))
    return best, takes[best], takes


def flag_of(m):
    if m.get('ok'):
        return None
    why = []
    if not m.get('pitch_ok'): why.append(f'pitch guard (median {m.get("median_f0")} Hz, {m.get("low160")} under 160 Hz)')
    if not m.get('read_ok'): why.append(f'reading check (heard 「{m.get("asr")}」, kana CER {m.get("cer")})')
    if not m.get('dur_ok'): why.append(f'length ({m.get("speech")} s of speech)')
    return 'no take passed: ' + '; '.join(why)


def main():
    L = json.load(open(LINES))
    items = {l['id']: l for l in L['lines']}
    # the writer's lines (voice_lines.json) point at a voice item; without them every item is its own line
    script = L.get('map') or [dict(l, raw=l['id'], voice=l['speaker'], file_id=l['id']) for l in L['lines']]
    metrics = json.load(open(f'{W}/voice/metrics.json'))
    index, voices, missing, done = {}, {}, [], {}
    for s in script:
        if s.get('source') == 'song':
            continue  # made by song_build.py from the guide vocal
        raw, v, fid = s['raw'], s['voice'], s['file_id']
        best, m, takes = pick(raw, metrics)
        if not best:
            missing.append(fid)
            continue
        lufs = LUFS.get(v, LUFS_DEFAULT)
        if raw not in done:
            done[raw] = prep(f'{RAW}/{raw}/{best}.wav', lufs)
            for t in takes:
                dst, src = f'{PAGE}/{raw}/{t}.mp3', f'{RAW}/{raw}/{t}.wav'
                if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                    enc(prep(src, -18.0), dst, ['-c:a', 'libmp3lame', '-b:a', '64k'])
        y = done[raw]
        enc(y, f'{GAME}/{fid}.ogg', ['-c:a', 'libvorbis', '-q:a', '4'])
        info = json.load(open(f'{RAW}/{raw}/{best}.json'))
        path = f'res://assets/audio/voice/{fid}.ogg'
        index[fid] = {'file': path, 'id': s['id'], 'speaker': s['speaker'], 'voice': v, 'jp': s['jp'], 'reading': s['reading'], 'en': s['en'],
                      'kind': s.get('kind', 'line'), 'variant': s.get('variant'), 'scene': s.get('scene') or s.get('uses', [{}])[0].get('where'),
                      'delivery': s.get('delivery'), 'seconds': round(len(y) / SR, 2), 'lufs': lufs, 'voice_item': raw, 'take': best,
                      'engine': info['engine'], 'seed': info['seed'], 'tts_text': info['text'],
                      'reference': REFS[v][0].replace(REPO + '/', '').replace(os.path.expanduser('~'), '~'),
                      'checks': {k: m.get(k) for k in ('median_f0', 'low160', 'pitch_ok', 'asr', 'cer', 'read_ok', 'sim', 'dur_ok')},
                      'flag': flag_of(m), 'placeholder': True}
        voices[fid] = path
        voices.setdefault(f'{v}|{s["jp"]}', path)
    # song memories (N03), exported by song_build.py
    for s in script:
        if s.get('source') == 'song' and os.path.exists(f'{GAME}/{s["id"]}.ogg'):
            voices[s['id']] = f'res://assets/audio/voice/{s["id"]}.ogg'
            index[s['id']] = {'file': voices[s['id']], 'id': s['id'], 'speaker': s['speaker'], 'jp': s['jp'], 'reading': s['reading'],
                              'en': s['en'], 'kind': 'line', 'scene': s.get('scene'), 'delivery': s.get('delivery'),
                              'source': 'cut from the karaoke song\'s guide vocal (song/okiro_vocal.ogg), first 「光れ、光れ」', 'placeholder': True}
    keep = {f'{k}.ogg' for k in index}
    stale = [f for f in os.listdir(GAME) if f.endswith('.ogg') and f not in keep]
    for f in stale:
        os.remove(f'{GAME}/{f}')
        if os.path.exists(f'{GAME}/{f}.import'):  # Godot's import record for the removed file
            os.remove(f'{GAME}/{f}.import')
    json.dump({'note': ('Placeholder voices for the island slice (local Irodori-TTS v4.1 and Qwen3-TTS clones), waiting for Jørgen. '
                        'One Ogg Vorbis file per script line id (voice_lines.json); $target and $witness reactions have one file per listener, '
                        '<id>_<speaker>.ogg. Loudness is normalised per character and the player is quieter. Built by tools/island_audio/export_voice.py.'),
               'count': len(index), 'missing': missing, 'lines': index}, open(f'{GAME}/index.json', 'w'), ensure_ascii=False, indent=1)
    if os.path.exists(f'{GAME}/voices.json'):  # keep the song's entry (song:okiro, written by song_build.py)
        voices.update({k: v for k, v in json.load(open(f'{GAME}/voices.json')).get('voices', {}).items() if k.startswith('song:')})
    json.dump({'voices': voices}, open(f'{GAME}/voices.json', 'w'), ensure_ascii=False, indent=1)
    flagged = [k for k, v in index.items() if v.get('flag')]
    print('exported', len(index), 'files from', len(done), 'voice items;', len(flagged), 'flagged;', len(missing), 'missing;', len(stale), 'stale removed', flush=True)
    for k in flagged:
        print('  flag', k, index[k]['flag'][:160])


if __name__ == '__main__':
    main()
