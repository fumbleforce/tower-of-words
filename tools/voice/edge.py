"""edge-tts fallback for lines no local take passed (<work>/report.json 'fallback', written by export.py).
Writes game3d/audio/<key>.mp3 (mono 24 kHz 48 kbps, loudness per speaker), records the line in edge.json and clips.json,
and rewrites game3d/audio/index.json. GUIDE: edge-tts only as a fallback; say which lines it voiced.
Run with a venv that has edge-tts (run.sh uses $EDGE_PY, default ~/ai/voice-pipeline/edge-venv/bin/python)."""
import asyncio, json, os, subprocess, sys, tempfile
import edge_tts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfg import AUD, CLIPS, EDGE, REPORT, FEMALE, LUFS, LUFS_DEFAULT, load

VOICE = {('ja', True): ('ja-JP-NanamiNeural', '-5%', '-35Hz'), ('ja', False): ('ja-JP-KeitaNeural', '-8%', '-8Hz'),
         ('en', True): ('en-US-AvaNeural', '-5%', '-20Hz'), ('en', False): ('en-US-AndrewNeural', '-5%', '-5Hz')}
rep = load(REPORT, {'fallback': []})
done = load(EDGE, {})
clips = load(CLIPS, {})


async def main():
    with tempfile.TemporaryDirectory() as tmpd:
        for f in rep['fallback']:
            v, rate, pitch = VOICE[(f['lang'], f['speaker'] in FEMALE)]
            tmp = f'{tmpd}/{f["key"]}.mp3'
            await edge_tts.Communicate(f['text'], v, rate=rate, pitch=pitch).save(tmp)
            lu = LUFS.get(f['speaker'], LUFS_DEFAULT)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I={lu}:TP=-1.5',
                            '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', f'{AUD}/{f["key"]}.mp3'], check=True)
            done[f['key']] = {'text': f['text'], 'voice': v}
            clips[f['key']] = f['text']
            print('edge', f['key'], v, f['text'], flush=True)

asyncio.run(main())
json.dump(dict(sorted(done.items())), open(EDGE, 'w'), ensure_ascii=False, indent=1)
json.dump(dict(sorted(clips.items())), open(CLIPS, 'w'), ensure_ascii=False, indent=0)
keys = sorted(x[:-4] for x in os.listdir(AUD) if x.endswith('.mp3'))
json.dump(keys, open(f'{AUD}/index.json', 'w'))
print('edge clips', len(rep['fallback']), 'index', len(keys))
