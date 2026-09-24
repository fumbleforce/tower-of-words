"""Generate neural-voice clips for every line in the app (needs: pip install edge-tts).
Usage: node tools/audio-list.js | python3 tools/gen_audio.py
Skips clips that already exist, then writes audio/index.js listing available keys."""
import asyncio, json, os, sys
import edge_tts

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'audio')
VOICES = {  # voice code -> (voice, rate, pitch)
    'f': ('ja-JP-NanamiNeural', '-10%', '+0Hz'),
    'm': ('ja-JP-KeitaNeural', '-10%', '+0Hz'),
    'g': ('ja-JP-KeitaNeural', '-18%', '-12Hz'),
}
KATA = {chr(c): chr(c - 0x60) for c in range(0x30A1, 0x30F7)}

def spoken(text):
    # A lone kana is often clipped or spelled out by TTS; say its hiragana form as a short utterance.
    if text == 'ヴ':
        return 'ヴ。'
    if len(text) <= 2 and all(0x3040 <= ord(c) <= 0x30FF for c in text):
        return ''.join(KATA.get(c, c) for c in text) + '。'
    return text

async def one(item, sem):
    path = os.path.join(OUT, item['key'] + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return
    voice, rate, pitch = VOICES[item['voice']]
    async with sem:
        for attempt in range(4):
            try:
                tmp = path + '.raw.mp3'
                await edge_tts.Communicate(spoken(item['text']), voice, rate=rate, pitch=pitch).save(tmp)
                proc = await asyncio.create_subprocess_exec('ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-b:a', '32k', path)
                await proc.wait()
                os.remove(tmp)
                return
            except Exception as e:
                await asyncio.sleep(1 + attempt * 2)
        print('FAILED', item, file=sys.stderr)

async def main():
    items = json.load(sys.stdin)
    os.makedirs(OUT, exist_ok=True)
    sem = asyncio.Semaphore(8)
    await asyncio.gather(*(one(i, sem) for i in items))
    keys = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and os.path.getsize(os.path.join(OUT, f)) > 500)
    with open(os.path.join(OUT, 'index.js'), 'w') as fh:
        fh.write('window.AUDIO=' + json.dumps({k: 1 for k in keys}, separators=(',', ':')) + ';\n')
    print(f'{len(keys)} clips of {len(items)}')

asyncio.run(main())
