"""Build proto2/music/index.html.
Top: round 2 (instrumental loops without vocals, softer opening theme, lyrics with readings).
Below: round 1 (YuE2 next to the Lyria loops in game/audio/music).
Round 2 numbers come from proto2/music/round2.json (written by tools/music_round2.py)."""
import json, os, shutil, html

REPO = '/home/jorgen/repo/japanese'
D = f'{REPO}/proto2/music'
stats = json.load(open(f'{D}/stats.json')) if os.path.exists(f'{D}/stats.json') else {}
r2 = json.load(open(f'{D}/round2.json')) if os.path.exists(f'{D}/round2.json') else {}
NAMES = {'calm': 'Calm morning (monorail)', 'office': 'Lazy lo-fi (basement office)', 'lively': 'Upbeat lunch (canteen)', 'night': 'Late-night jazz (bar)'}
for k in NAMES:
    src = f'{REPO}/game/audio/music/{k}.mp3'
    if os.path.exists(src):
        shutil.copy(src, f'{D}/lyria-{k}.mp3')


def audio(p, loop=False):
    return f'<audio controls{" loop" if loop else ""} preload="none" src="{p}"></audio>' if os.path.exists(f'{D}/{p}') else '<span class="na">not generated</span>'


def t(k):
    return f'{stats[k]["gen_s"]} s to generate' if k in stats else ''


def player(label, path, note='', loop=False):
    return f'<div class="row"><div class="lbl">{label} <span class="na">{html.escape(note)}</span></div>{audio(path, loop)}</div>'


def vocal_note(key):
    m = r2.get('vocals', {}).get(key)
    if not m:
        return ''
    return f'voice {m["vocal_db"]:.0f} dB, singing in {m["vocal_windows_pct"]:.0f}% of it'


# Opening lyrics: (Japanese with <ruby>, English)
LYRICS = [
    ('Verse 1', [
        ('<ruby>朝<rt>あさ</rt></ruby>のモノレール　<ruby>窓<rt>まど</rt></ruby>の<ruby>外<rt>そと</rt></ruby>', 'The morning monorail, outside the window'),
        ('<ruby>知<rt>し</rt></ruby>らない<ruby>街<rt>まち</rt></ruby>が　<ruby>光<rt>ひか</rt></ruby>ってる', 'a city I don\'t know is shining'),
        ('ポケットに　IDカード', 'An ID card in my pocket'),
        ('<ruby>今日<rt>きょう</rt></ruby>からここで　<ruby>働<rt>はたら</rt></ruby>くよ', 'from today I work here'),
    ]),
    ('Chorus', [
        ('はじめまして　<ruby>新<rt>あたら</rt></ruby>しい<ruby>街<rt>まち</rt></ruby>', 'Nice to meet you, new city'),
        ('<ruby>言葉<rt>ことば</rt></ruby>が<ruby>僕<rt>ぼく</rt></ruby>の　<ruby>魔法<rt>まほう</rt></ruby>になる', 'words become my magic'),
        ('<ruby>小<rt>ちい</rt></ruby>さな「<ruby>手伝<rt>てつだ</rt></ruby>って」で', 'With a small "help me"'),
        ('<ruby>世界<rt>せかい</rt></ruby>が<ruby>少<rt>すこ</rt></ruby>し　<ruby>動<rt>うご</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す', 'the world starts to move a little'),
    ]),
    ('Verse 2', [
        ('<ruby>地下<rt>ちか</rt></ruby>の<ruby>部屋<rt>へや</rt></ruby>に　ゲームの<ruby>音<rt>おと</rt></ruby>', 'In the basement room, the sound of games'),
        ('リーダーは<ruby>笑<rt>わら</rt></ruby>って「いいね」って', 'the leader laughs and says "nice"'),
        ('エレベーターの　ボタン<ruby>押<rt>お</rt></ruby>して', 'I press the elevator button'),
        ('<ruby>夢<rt>ゆめ</rt></ruby>の<ruby>階段<rt>かいだん</rt></ruby>　のぼってく', 'and climb the stairs of my dreams'),
    ]),
    ('Chorus', [
        ('はじめまして　<ruby>新<rt>あたら</rt></ruby>しい<ruby>街<rt>まち</rt></ruby>', 'Nice to meet you, new city'),
        ('<ruby>言葉<rt>ことば</rt></ruby>が<ruby>僕<rt>ぼく</rt></ruby>の　<ruby>魔法<rt>まほう</rt></ruby>になる', 'words become my magic'),
        ('<ruby>小<rt>ちい</rt></ruby>さな「<ruby>待<rt>ま</rt></ruby>って」　<ruby>小<rt>ちい</rt></ruby>さな「ありがとう」', 'A small "wait", a small "thank you"'),
        ('<ruby>明日<rt>あした</rt></ruby>もきっと　<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>', 'tomorrow will be fine too, I\'m sure'),
    ]),
]
lyrics_html = ''.join(
    f'<div class="stanza"><div class="tag">{name}</div>' + ''.join(f'<div class="line"><div class="jp" lang="ja">{jp}</div><div class="en">{en}</div></div>' for jp, en in lines) + '</div>'
    for name, lines in LYRICS)

TR2 = {
    'office': ('Lazy lo-fi (basement office)', 75),
    'night': ('Late-night jazz (bar)', 70),
}


def r2_track(k):
    name = TR2[k][0]
    rows = [player('Lyria (in the game now)', f'lyria-{k}.mp3', vocal_note(f'lyria-{k}')),
            player('YuE2 round 1 (had vocals)', f'yue2-{k}.mp3', vocal_note(f'yue2-{k}'))]
    for suffix, label in [('yue-a', 'YuE2 + instrumental add-on'),
                          ('yue-b', 'YuE2 + instrumental add-on + sound add-on, verses only'),
                          ('yue-c', 'YuE2 + instrumental add-on, lead melody taken out of the score'),
                          ('sa3', 'Stable Audio 3 Medium'),
                          ('demucs', 'YuE2 round 1 with the voice removed (Demucs)')]:
        f = f'r2-{k}-{suffix}.mp3'
        if os.path.exists(f'{D}/{f}'):
            loop = r2.get('loops', {}).get(f, {})
            note = vocal_note(f'r2-{k}-{suffix}') + (f', {loop["loop_s"]} s loop' if loop else '')
            rows.append(player(label, f, note, loop=True))
    return f'<div class="track"><h3>{name}</h3>{"".join(rows)}</div>'


opening_rows = ''.join(player(label, f, note) for label, f, note in [
    ('Original', 'yue2-opening.mp3', ''),
    ('Mastered: softer', 'yue2-opening-soft.mp3', '-3 dB around 3.5 kHz, -2 dB above 8 kHz, de-esser'),
    ('Mastered: warm', 'yue2-opening-warm.mp3', '-4.5 dB around 3 kHz, -4 dB above 6 kHz, stronger de-esser, a little more bass'),
    ('New take with softer tags', 'yue2-opening-regen.mp3', r2.get('opening_regen_note', '')),
] if os.path.exists(f'{D}/{f}'))

old_rows = ''.join(
    f'<div class="track"><h3>{v}</h3><p class="small">{html.escape(stats.get(k, {}).get("style", ""))}</p>'
    f'<div class="pair"><div><div class="lbl">Lyria (current)</div>{audio(f"lyria-{k}.mp3")}</div>'
    f'<div><div class="lbl">YuE2 (local) <span class="na">{t(k)}</span></div>{audio(f"yue2-{k}.mp3")}</div></div></div>'
    for k, v in NAMES.items())

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local music (YuE2)</title>
<style>body{{margin:0;background:#f5f6f8;color:#15171c;font:16px/1.5 system-ui,sans-serif}}main{{max-width:1100px;margin:0 auto;padding:28px 20px 60px}}h1{{margin:0 0 4px;font-size:26px}}.intro{{color:#4b5260;max-width:860px}}section{{background:#fff;border:1px solid #dadee4;border-radius:8px;padding:14px;margin:12px 0}}h2{{margin:0 0 6px;font-size:19px}}audio{{display:block;width:100%;min-width:0}}.track{{padding:12px 0;border-bottom:1px solid #eceef1}}.track:last-child{{border-bottom:0}}h3{{margin:0;font-size:17px}}.pair{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}}@media(max-width:640px){{.pair{{grid-template-columns:1fr}}}}.row{{margin-top:10px}}.lbl{{font-weight:600;font-size:14px;margin-bottom:4px}}.small{{font-size:13px;color:#4b5260}}.na{{color:#6b7280;font-size:13px;font-weight:400}}.stanza{{margin:14px 0}}.tag{{font-size:13px;color:#4b5260;font-weight:600;margin-bottom:4px}}.line{{margin:0 0 10px}}.jp{{font-size:20px;line-height:2.1}}.jp rt{{font-size:11px;color:#4b5260}}.en{{font-size:14px;color:#4b5260}}.round{{margin:28px 0 0;font-size:22px}}</style></head><body><main>
<h1>Local music with YuE2</h1>
<p class="intro">Round 2 is on top. I can't hear audio, so please judge by ear. The voice numbers come from splitting each track with Demucs and measuring the vocal part: Lyria sits around -32 dB with no singing, the first YuE2 loops around -8 dB.</p>
<h2 class="round">Round 2</h2>
<section><h2>Background loops without vocals</h2><p class="small">{html.escape(r2.get('loops_note', ''))}</p>{r2_track('office')}{r2_track('night')}</section>
<section><h2>Opening theme, softer</h2><p class="small">The original has a lot of energy between 2 and 5 kHz, where harshness lives. All versions play at the same loudness.</p>{opening_rows}</section>
<section><h2>Opening lyrics</h2>{lyrics_html}</section>
<h2 class="round">Round 1</h2>
<p class="intro">YuE2 (m-a-p, released 9 September 2026) running locally through ComfyUI on the RTX 3080, using the int8 build of the 3B model. The loops are compared with the Lyria versions currently in the game.</p>
<section><h2>Game loops</h2>{old_rows}</section>
<section><h2>Opening theme (with vocals)</h2><p class="small">{html.escape(stats.get('opening', {}).get('style', ''))} {t('opening')}</p>{audio('yue2-opening.mp3')}</section>
</main></body></html>'''
open(f'{D}/index.html', 'w').write(page)
print('written')
