"""Japanese voice clips for the game (edge-tts). Run with a Python that has edge-tts:
  <venv>/bin/python game3d/tools/voices.py
Writes game3d/audio/<key>.mp3 and skips clips that exist."""
import asyncio, os, subprocess, json
import edge_tts
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio')
F, M = 'ja-JP-NanamiNeural', 'ja-JP-KeitaNeural'
LINES = {
  # key: (voice, rate, pitch, text)
  'aoi-ohayo': (F, '+0%', '+25Hz', 'あ、おはよう！'),
  'mio-ohayo': (F, '-5%', '-35Hz', 'おはよう。'),
  'mio-ohayo-pol': (F, '-5%', '-35Hz', 'おはようございます。'),
  'ann-tsugi-minato': (F, '-12%', '+0Hz', 'つぎは、みなと。みなとです。'),
  'ann-minato': (F, '-12%', '+0Hz', 'みなと。みなとです。つぎは、ほんしゃ。'),
  'ann-tsugi-honsha': (F, '-12%', '+0Hz', 'つぎは、ほんしゃ。'),
  'ann-honsha': (F, '-12%', '+0Hz', 'ほんしゃ。ほんしゃです。'),
  'aoi-chigau': (F, '+5%', '+25Hz', 'まって！ここはみなと。ほんしゃはつぎ！'),
  'guard-ohayo': (M, '-8%', '-10Hz', 'おはようございます。'),
  'guard-card': (M, '-8%', '-10Hz', 'カード、おねがいします。'),
  'guard-card-short': (M, '+0%', '-10Hz', 'カード！'),
  'emi-ohayo': (F, '+0%', '+5Hz', 'おはよう！'),
  'emi-tsugi-seki': (F, '+0%', '+5Hz', 'よし。つぎは、せき！'),
  'kenji-ohayo': (M, '+0%', '+10Hz', 'おはよう。'),
  'yui-ohayo': (F, '+5%', '+40Hz', 'おはよー！'),
  'sota-ohayo': (M, '-5%', '-5Hz', 'おはよう。'),
  'mori-ohayo': (M, '-15%', '-25Hz', 'おはようございます。'),
  'mori-ohayo-dry': (M, '-20%', '-25Hz', '……おはよう。'),
  # commands and the lines they come from
  'aoi-matte': (F, '+10%', '+25Hz', 'ミオ、ドア！待ってって言って！'),
  'mio-matte': (F, '-5%', '-35Hz', '待って！'),
  'kuroda-akete': (M, '-10%', '+5Hz', '開けて……お願い……'),
  'mio-akete': (F, '-5%', '-35Hz', '開けて。'),
  'emi-kite': (F, '+0%', '+5Hz', 'ミオさん？エミです。来て、席を見せるね。'),
  'mio-kite': (F, '-5%', '-35Hz', '来て。'),
  'yui-ugoite': (F, '+5%', '+40Hz', '動いて！お願い！'),
  'mio-ugoite': (F, '-5%', '-35Hz', '動いて。'),
  'kuroda-wake': (M, '+10%', '+5Hz', 'はっ！本社！'),
  'guard-wait': (M, '-8%', '-10Hz', '少々お待ちください。'),
  'mori-hello': (M, '-15%', '-25Hz', 'よろしく。'),
  'kenji-hi': (M, '+0%', '+10Hz', 'あ、どうも。'),
  'sota-thanks': (M, '-5%', '-5Hz', 'おお、ありがとう！'),
  'yui-thanks': (F, '+5%', '+40Hz', 'すごい！ありがとう！'),
  'aoi-hi': (F, '+0%', '+25Hz', 'おはよう！'),
  'mio-irete': (F, '-5%', '-35Hz', '入れて。'),
  # Eric, the player (a tired Nordic engineer with careful textbook Japanese)
  'eric-matte': (M, '-12%', '-8Hz', '待って。'), 'eric-akete': (M, '-12%', '-8Hz', '開けて。'), 'eric-kite': (M, '-12%', '-8Hz', '来て。'),
  'eric-ugoite': (M, '-12%', '-8Hz', '動いて。'), 'eric-irete': (M, '-12%', '-8Hz', '入れて。'), 'eric-dashite': (M, '-12%', '-8Hz', '出して。'),
  'eric-tomatte': (M, '-12%', '-8Hz', '止まって。'), 'eric-ohayo': (M, '-14%', '-8Hz', 'おはようございます。'),
  'eric-yoroshiku': (M, '-14%', '-8Hz', 'よろしくおねがいします。'), 'eric-sumimasen': (M, '-12%', '-8Hz', 'すみません。'),
  'mio-dashite': (F, '-5%', '-35Hz', '出して。'),
  'mio-tomatte': (F, '-5%', '-35Hz', '止まって。'),
}
async def one(key, v, rate, pitch, text):
    path = os.path.join(OUT, key + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 500: return
    tmp = path + '.raw.mp3'
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, v, rate=rate, pitch=pitch).save(tmp)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-b:a', '48k', path], check=True)
            os.remove(tmp); print('ok', key); return
        except Exception as e:
            print('retry', key, e); await asyncio.sleep(1 + attempt * 2)
    print('FAILED', key)
async def main():
    os.makedirs(OUT, exist_ok=True)
    # overheard lines from the story files (tools/heard-lines.mjs)
    try:
        heard = json.loads(subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'heard-lines.mjs')], capture_output=True, text=True, check=True).stdout)
    except Exception as e:
        print('no heard lines', e); heard = []
    for h in heard:
        LINES.setdefault(h['key'], (F if h['f'] else M, '+0%', '+10Hz' if h['f'] else '-5Hz', h['text']))
    sem = asyncio.Semaphore(6)
    async def lim(k, v):
        async with sem: await one(k, *v)
    await asyncio.gather(*(lim(k, v) for k, v in LINES.items()))
    keys = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3'))
    with open(os.path.join(OUT, 'index.json'), 'w') as f: json.dump(keys, f)
asyncio.run(main())
