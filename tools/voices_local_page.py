"""Build proto2/voices-local: the same six test lines per character from the current Replicate voices and each local model.
Inputs come from ~/ai/tts-bench (lines.json, refs/, out/<system>/<ch>-<i>.wav|mp3, out/metrics-<system>.json, out/<system>.json).
Every clip is loudness-normalised to -18 LUFS (as in the game) so loudness doesn't bias the listening test."""
import json, os, subprocess, html, statistics as st

B = os.path.expanduser('~/ai/tts-bench')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'proto2/voices-local')
os.makedirs(OUT, exist_ok=True)
L = json.load(open(f'{B}/lines.json'))
SYSTEMS = [s for s in ['replicate', 'irodori', 'sarashina', 'cosy', 'qwen'] if os.path.exists(f'{B}/out/metrics-{s}.json')]
NAME = {'replicate': 'Replicate (current)', 'irodori': 'Irodori-TTS v4.1 Small', 'sarashina': 'Sarashina2.2-TTS',
        'cosy': 'Fun-CosyVoice3 0.5B', 'qwen': 'Qwen3-TTS 1.7B (local)'}
CURRENT = {'emi': 'MiniMax Speech 2.6 HD, preset Japanese_CalmLady', 'rei': 'MiniMax Speech 2.6 HD, preset Japanese_ColdQueen',
           'announcer': 'MiniMax Speech 2.6 HD, preset Japanese_KindLady', 'mio': 'Qwen3-TTS clone of voice A (tools/voice-refs/mio-a.wav)',
           'ishibashi': 'Qwen3-TTS clone of tools/voice-refs/ishibashi-ref12.wav'}
REFNOTE = {'emi': 'two of her current game lines (MiniMax preset), 10 s; Irodori got four lines, 21 s',
           'rei': 'three of her current game lines (MiniMax preset), 12 s; Irodori got five lines, 18 s',
           'announcer': 'the one announcement in the game, 5 s',
           'mio': 'voice A, tools/voice-refs/mio-a.wav, 11 s', 'ishibashi': 'tools/voice-refs/ishibashi-ref12.wav, 13 s'}
TITLE = {'emi': 'Emi', 'rei': 'Rei', 'mio': 'Mio', 'ishibashi': 'Ishibashi', 'announcer': 'Announcer'}
KIND = {0: 'short', 1: 'long', 2: 'whisper / sleepy', 3: 'question', 4: 'with a name', 5: 'short, trailing'}
FEMALE = {'emi', 'rei', 'mio', 'announcer'}

M = {s: {(r['ch'], r['i']): r for r in json.load(open(f'{B}/out/metrics-{s}.json'))} for s in SYSTEMS}
SPEED = {}
for s in SYSTEMS:
    p = next((f'{B}/out/{s}-{d}.json' for d in ('cuda', 'cpu') if os.path.exists(f'{B}/out/{s}-{d}.json')), None)
    if p:
        d = json.load(open(p)); SPEED[s] = {(x['ch'], x['i']): x['s'] for x in d['lines']}
        SPEED[s]['_vram'] = d.get('peak_vram_gb'); SPEED[s]['_dev'] = d.get('device', 'cuda')
    elif s == 'replicate':
        SPEED[s] = {}
        for line in open(f'{B}/out/replicate.log'):
            if line.startswith('{'):
                x = json.loads(line); SPEED[s][(x['ch'], x['i'])] = x['s']


def enc(src, dst):
    if not os.path.exists(dst):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', 'loudnorm=I=-18:TP=-2:LRA=11', '-ar', '44100', '-ac', '1', '-b:a', '96k', dst], check=True)


def src(s, ch, i):
    for e in ('wav', 'mp3'):
        p = f'{B}/out/{s}/{ch}-{i}.{e}'
        if os.path.exists(p): return p


def guard(ch, r):
    """GUIDE's male-drift guard: Mio fails under 190 Hz median or over 10% under 160 Hz; other women 185 Hz / 25%."""
    if ch not in FEMALE or r['median'] is None: return None
    lo, share = (190, 0.10) if ch == 'mio' else (185, 0.25)
    return r['median'] < lo or r['low160'] > share


def summary(s, chs=None):
    rows = [r for (ch, i), r in M[s].items() if chs is None or ch in chs]
    empty = sum(1 for r in rows if not r['dur'])
    sims = [r['sim'] for r in rows]; cers = [r['cer'] for r in rows]
    fails = sum(1 for r in rows if guard(r['ch'], r))
    sp = [SPEED[s].get((r['ch'], r['i'])) for r in rows]; sp = [x for x in sp if x]
    rtf = [SPEED[s][(r['ch'], r['i'])] / r['dur'] for r in rows if SPEED[s].get((r['ch'], r['i'])) and r['dur']]
    return {'sim': st.mean(sims), 'simmin': min(sims), 'cer': st.mean(cers), 'bad': sum(1 for c in cers if c > 0.15),
            'fails': fails, 'empty': empty, 'speed': st.mean(sp) if sp else None, 'rtf': st.mean(rtf) if rtf else None, 'n': len(rows)}


css = """
:root { --bg:#f5f6f8; --card:#fff; --ink:#15171c; --mute:#4b5260; --line:#dadee4; --acc:#0f7c80; --warn:#b3261e; }
* { box-sizing:border-box } body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 "Outfit",sans-serif }
main { max-width:980px; margin:0 auto; padding:32px 16px 80px } h1 { margin:0 0 6px; font-size:28px }
h2 { margin:40px 0 6px; font-size:24px } h3 { margin:24px 0 8px; font:700 19px "M PLUS 1",sans-serif }
p, li { color:var(--mute) } .jp { font-family:"M PLUS 1",sans-serif }
table { border-collapse:collapse; width:100%; background:var(--card); border:1px solid var(--line); font-size:14px; margin:10px 0 }
th, td { padding:6px 8px; border-bottom:1px solid var(--line); text-align:left; white-space:nowrap } th { background:#eef1f4 }
.wrap { overflow-x:auto }
.card { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:10px 14px; margin:0 0 8px }
.card h4 { margin:0 0 4px; font-size:17px; color:var(--acc) } .card h4 span { color:var(--mute); font-weight:400; font-size:14px }
.card audio { width:100%; display:block } .m { font-size:13.5px; color:var(--mute); margin:4px 0 0 }
.m b.bad { color:var(--warn) } .asr { font-family:"M PLUS 1",sans-serif }
.ref { border-left:4px solid var(--acc) }
nav a { margin-right:14px; color:var(--acc) }
"""


def f(x, d=2):
    return '–' if x is None else f'{x:.{d}f}'


parts = [f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
         '<title>Local voices test</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&family=M+PLUS+1:wght@500;700&display=swap">'
         f'<style>{css}</style></head><body><main>']
parts.append('<h1>Local voices test</h1>')
parts.append('<p>Can local voice cloning replace Replicate for the new day 1? Each character reads the same six lines: once with the voice the game uses now (Replicate), '
             'and once with each local model cloning that voice from a reference clip. For Emi, Rei and the announcer the game uses MiniMax preset voices, '
             'so the local models clone them from their existing game lines. Every clip is one take (no retries, no cherry-picking) and loudness-normalised the same way.</p>')
parts.append('<p><b>I can\'t hear these.</b> The numbers below come from measurement tools, not listening. They catch wrong words, wrong speaker and male drift, '
             'but they say nothing about whether a line sounds natural or in character. That part is your call.</p>')
parts.append('<nav>' + ''.join(f'<a href="#{ch}">{TITLE[ch]}</a>' for ch in L) + '</nav>')
parts.append('<h2>What the numbers mean</h2><ul>'
             '<li><b>sim</b>: speaker similarity to the reference clip (WavLM speaker-verification cosine, 1.0 = identical). Around 0.86 and up usually means "same speaker" for this model.</li>'
             '<li><b>CER</b>: character error rate of what Whisper large-v3-turbo heard, compared in kana. 0 = every sound right. Whisper sometimes mishears too, so read the transcript before blaming the voice.</li>'
             '<li><b>pitch</b>: median F0 and the share of the line under 160 Hz. Flagged when it trips the GUIDE male-drift guard (Mio: under 190 Hz or over 10% under 160 Hz; the other women: under 185 Hz or over 25%).</li>'
             '<li><b>time</b>: seconds to make the line (Replicate: wall clock including queueing, 30 lines in parallel; local: one line at a time on the CPU, a Ryzen 9 9950X3D, because the image jobs held the GPU the whole time. On the 3080 these models would be several times faster; the earlier local Qwen3-TTS test ran at about half real time on the GPU).</li></ul>')
parts.append('<h2>Summary</h2><div class="wrap"><table><tr><th>Model</th><th>mean sim</th><th>lowest sim</th><th>mean CER</th><th>lines CER &gt; 0.15</th><th>empty files</th><th>pitch flags</th><th>s / line</th><th>time ÷ audio length</th><th>ran on</th></tr>')
for s in SYSTEMS:
    x = summary(s)
    v = SPEED[s].get('_vram')
    parts.append(f'<tr><td>{NAME[s]}</td><td>{f(x["sim"],3)}</td><td>{f(x["simmin"],3)}</td><td>{f(x["cer"],3)}</td><td>{x["bad"]} / {x["n"]}</td><td>{x["empty"]}</td><td>{x["fails"]}</td>'
                 f'<td>{f(x["speed"],1)}</td><td>{f(x["rtf"],2)}</td><td>{"Replicate" if s == "replicate" else ("GPU, " + f(v,1) + " GB" if v else "CPU")}</td></tr>')
parts.append('</table></div>')
parts.append('<div class="wrap"><table><tr><th>Mean sim per character</th>' + ''.join(f'<th>{TITLE[ch]}</th>' for ch in L) + '</tr>')
for s in SYSTEMS:
    parts.append(f'<tr><td>{NAME[s]}</td>' + ''.join(f'<td>{f(summary(s, {ch})["sim"],3)} · CER {f(summary(s, {ch})["cer"],2)}</td>' for ch in L) + '</tr>')
parts.append('</table></div>')

parts.append("""<h2>Setup notes</h2><ul>
<li><b>Irodori-TTS v4.1 Small</b> (Aratako, 2026, MIT licence, Japanese only). Clones from the reference audio alone, no transcript. It wants about 30 s of reference, so Emi and Rei got longer clips. Its built-in watermark was switched off.</li>
<li><b>Sarashina2.2-TTS</b> (SB Intuitions, 2026, non-commercial licence). Watermark off. It returned empty files for two announcer lines, and several of its lines are much longer than the text needs.</li>
<li><b>Fun-CosyVoice3 0.5B</b> (Alibaba, Apache 2.0). With kanji input it produced mostly garbled Japanese, so it got kana readings instead (auto-converted, so a few readings may be off). It still mangles more words than the others.</li>
<li><b>Qwen3-TTS 1.7B, local</b>: the fallback that was already installed. Output length is capped; one uncapped take ran on for minutes.</li>
<li>Not tried: Fish Audio S2 Pro (4B, about 10 GB of VRAM in bf16, so it doesn't fit next to the image jobs; research licence only), GPT-SoVITS and Style-Bert-VITS2 (these need training per voice, not a short clip), and MioTTS (Aratako, 2026; left for a second round).</li>
</ul>""")
parts.append("""<h2>Cost if we stay on Replicate</h2><p>game/notes/day1-draft.md has 92 spoken lines, and 33 of them already have voice files. That leaves about 41 new Emi lines, 11 Rei, 18 Mio, 1 Ishibashi, 0 announcer, plus roughly 30 player lines (choices and spell words). At the ledger's rates (MiniMax $0.0001 per character, at least $0.002 a line; Qwen3-TTS clone about $0.01 a call) that is about $0.10 for Emi and Rei, $0.20 to $0.30 for Mio with pitch-guard retries, and about $0.30 for the player: <b>roughly $0.60 to $0.80 for one full pass</b>. Two or three passes as the script changes stay under $2.50, inside the $5 left. The Qwen price is the ledger's estimate. Replicate doesn't report cost per call.</p>""")
for ch, lines in L.items():
    parts.append(f'<h2 id="{ch}">{TITLE[ch]}</h2><p>Game voice now: {CURRENT[ch]}. Clone reference: {REFNOTE[ch]}.</p>')
    enc(f'{B}/refs/{ch}.wav', f'{OUT}/{ch}-ref.mp3')
    parts.append(f'<div class="card ref"><h4>{ch}-ref <span>the reference clip the local models cloned</span></h4><audio controls preload="none" src="{ch}-ref.mp3"></audio></div>')
    for i, text in enumerate(lines):
        parts.append(f'<h3>{i + 1}. <span class="jp">{html.escape(text)}</span> <span style="font:400 14px Outfit;color:#4b5260">({KIND[i]})</span></h3>')
        for s in SYSTEMS:
            p = src(s, ch, i)
            r = M[s].get((ch, i))
            if not p or not r: continue
            fid = f'{ch}-{s}-{i + 1}'
            if not r['dur']:
                parts.append(f'<div class="card"><h4>{fid} <span>{NAME[s]}</span></h4><p class="m"><b class="bad">No audio: the model returned an empty file for this line.</b></p></div>')
                continue
            enc(p, f'{OUT}/{fid}.mp3')
            g = guard(ch, r)
            pitch = f'pitch {f(r["median"],0)} Hz, {round(100 * (r["low160"] or 0))}% under 160' if r['median'] else 'pitch –'
            pitch = f'<b class="bad">{pitch} (drift)</b>' if g else pitch
            cer = f'CER {f(r["cer"],2)}'
            cer = f'<b class="bad">{cer}</b>' if r['cer'] > 0.15 else cer
            sim = f'sim {f(r["sim"],3)}'
            sim = f'<b class="bad">{sim}</b>' if r['sim'] < 0.8 else sim
            t = SPEED[s].get((ch, i))
            parts.append(f'<div class="card"><h4>{fid} <span>{NAME[s]}</span></h4><audio controls preload="none" src="{fid}.mp3"></audio>'
                         f'<p class="m">{sim} · {cer} · {pitch} · {f(r["dur"],1)} s audio · made in {f(t,1)} s</p>'
                         f'<p class="m">Whisper heard: <span class="asr">{html.escape(r["asr"])}</span></p></div>')
parts.append('</main></body></html>')
open(f'{OUT}/index.html', 'w').write('\n'.join(parts))
print('wrote', OUT, SYSTEMS)
