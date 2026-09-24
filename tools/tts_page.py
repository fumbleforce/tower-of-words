"""Build proto2/tts/index.html: local TTS models next to the Replicate voices used in the slice."""
import json, os, shutil, subprocess, sys, html
sys.path.insert(0, '/home/jorgen/ai/tts')
from lines import LINES, REFS, DESIGN, fnv

REPO = '/home/jorgen/repo/japanese'
D = f'{REPO}/proto2/tts'
RAW = f'{D}/raw'


def norm(src, dst):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', 'loudnorm=I=-18:TP=-2:LRA=11', '-ar', '44100', '-ac', '1', '-b:a', '96k', dst], check=True)


MODELS = [('qwen', 'Qwen3-TTS 1.7B (local)'), ('index', 'IndexTTS-2.5 (local)')]
stats = {}
for m, _ in MODELS:
    p = f'{RAW}/{m}-stats.json'
    stats[m] = json.load(open(p)) if os.path.exists(p) else None
    for ch, lines in LINES.items():
        for i in range(len(lines)):
            src = f'{RAW}/{m}-{ch}-{i}.wav'
            if os.path.exists(src):
                norm(src, f'{D}/{m}-{ch}-{i}.mp3')
if os.path.exists(f'{RAW}/qwen-design.wav'):
    norm(f'{RAW}/qwen-design.wav', f'{D}/qwen-design.mp3')
for ch, lines in LINES.items():
    for i, text in enumerate(lines):
        ref = f'{REPO}/game/audio/voice/{fnv(ch + "|" + text)}.mp3'
        if os.path.exists(ref):
            shutil.copy(ref, f'{D}/ref-{ch}-{i}.mp3')
    shutil.copy(REFS[ch][0], f'{D}/source-{ch}.mp3')


def audio(path):
    return f'<audio controls preload="none" src="{path}"></audio>' if os.path.exists(f'{D}/{path}') else '<span class="na">not generated</span>'


def model_stats(m):
    s = stats.get(m)
    if not s:
        return 'Did not run.'
    per = [l['s'] for l in s['lines']]
    aud = [l['audio_s'] for l in s['lines']]
    return (f'Model load {s["load_s"]} s. Average {sum(per)/len(per):.1f} s to generate a line of about {sum(aud)/len(aud):.1f} s of speech '
            f'(real-time factor {sum(per)/sum(aud):.2f}). Peak GPU memory {s.get("peak_vram_gb", "?")} GB.')


rows = ''
for ch, lines in LINES.items():
    rows += f'<h3>{ch.capitalize()}</h3><p class="src">Reference clip used for cloning: {audio(f"source-{ch}.mp3")}</p><table><tr><th>Line</th><th>Replicate (current game voice)</th>' + ''.join(f'<th>{n}</th>' for _, n in MODELS) + '</tr>'
    for i, text in enumerate(lines):
        rows += f'<tr><td class="jp">{html.escape(text)}</td><td>{audio(f"ref-{ch}-{i}.mp3")}</td>' + ''.join(f'<td>{audio(f"{m}-{ch}-{i}.mp3")}</td>' for m, _ in MODELS) + '</tr>'
    rows += '</table>'

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local voice models</title>
<style>body{{margin:0;background:#f5f6f8;color:#15171c;font:16px/1.5 system-ui,sans-serif}}main{{max-width:1200px;margin:0 auto;padding:28px 20px 60px}}h1{{margin:0 0 4px;font-size:26px}}.intro{{color:#4b5260;max-width:860px}}section{{background:#fff;border:1px solid #dadee4;border-radius:8px;padding:14px;margin:12px 0}}h2{{margin:0 0 6px;font-size:19px}}h3{{margin:14px 0 4px}}table{{width:100%;border-collapse:collapse;font-size:14px}}th,td{{text-align:left;padding:6px;border-bottom:1px solid #eceef1;vertical-align:middle}}td.jp{{font-size:16px;font-weight:600}}audio{{width:100%;max-width:260px;height:32px}}.na{{color:#9aa0ab;font-size:13px}}.src{{color:#4b5260;font-size:14px}}ul{{margin:4px 0}}</style></head><body><main>
<h1>Local voice models</h1>
<p class="intro">Each local model clones Mio and Emi from the same reference clips and reads the same five lines from day one. The left column is the voice currently in the game (Replicate: Qwen3 clone for Mio, MiniMax for Emi). I can't hear audio, so please judge these by ear: naturalness, whether it still sounds like the same person, and pronunciation of the Japanese.</p>
<section><h2>Models</h2><ul>
<li><b>Qwen3-TTS 1.7B, local</b>: {model_stats('qwen')}</li>
<li><b>IndexTTS-2.5, local</b> (Bilibili; Japanese with kana-level control; the excited line uses its emotion vector): {model_stats('index')}</li>
<li><b>Tencent AuK</b>: skipped. Needs about 17 GB of GPU memory even with CPU offload and the September memory fix, more than the 10 GB card; its docs only cover English and Chinese.</li>
<li><b>Breeze TTS 2</b>: skipped. English and Chinese only.</li>
</ul></section>
<section><h2>Cloned voices</h2>{rows}</section>
<section><h2>Voice design (no reference clip)</h2><p>Qwen3-TTS VoiceDesign, from the description: "{html.escape(DESIGN[0])}"</p><p class="jp"><b>{html.escape(DESIGN[1])}</b></p>{audio('qwen-design.mp3')}</section>
</main></body></html>'''
open(f'{D}/index.html', 'w').write(page)
print('written', f'{D}/index.html')
