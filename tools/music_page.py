"""Build proto2/music/index.html: YuE2 (local) next to the Lyria versions in game/audio/music."""
import json, os, shutil, html

REPO = '/home/jorgen/repo/japanese'
D = f'{REPO}/proto2/music'
stats = json.load(open(f'{D}/stats.json')) if os.path.exists(f'{D}/stats.json') else {}
NAMES = {'calm': 'Calm morning (monorail)', 'office': 'Lazy lo-fi (basement office)', 'lively': 'Upbeat lunch (canteen)', 'night': 'Late-night jazz (bar)'}
for k in NAMES:
    src = f'{REPO}/game/audio/music/{k}.mp3'
    if os.path.exists(src):
        shutil.copy(src, f'{D}/lyria-{k}.mp3')


def audio(p):
    return f'<audio controls preload="none" src="{p}"></audio>' if os.path.exists(f'{D}/{p}') else '<span class="na">not generated</span>'


def t(k):
    return f'{stats[k]["gen_s"]} s to generate' if k in stats else ''


rows = ''.join(f'<tr><td><b>{v}</b><div class="small">{html.escape(stats.get(k, {}).get("style", ""))}</div></td><td>{audio(f"lyria-{k}.mp3")}</td><td>{audio(f"yue2-{k}.mp3")}<div class="small">{t(k)}</div></td></tr>' for k, v in NAMES.items())
lyrics = html.escape(stats.get('opening', {}).get('lyrics', '')).replace('\n', '<br>')
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local music (YuE2)</title>
<style>body{{margin:0;background:#f5f6f8;color:#15171c;font:16px/1.5 system-ui,sans-serif}}main{{max-width:1100px;margin:0 auto;padding:28px 20px 60px}}h1{{margin:0 0 4px;font-size:26px}}.intro{{color:#4b5260;max-width:860px}}section{{background:#fff;border:1px solid #dadee4;border-radius:8px;padding:14px;margin:12px 0}}h2{{margin:0 0 6px;font-size:19px}}table{{width:100%;border-collapse:collapse}}th,td{{text-align:left;padding:8px;border-bottom:1px solid #eceef1;vertical-align:top}}audio{{width:100%;max-width:320px}}.small{{font-size:13px;color:#4b5260}}.na{{color:#9aa0ab;font-size:13px}}.lyrics{{font-size:17px;line-height:1.9}}</style></head><body><main>
<h1>Local music with YuE2</h1>
<p class="intro">YuE2 (m-a-p, released 9 September 2026) running locally through ComfyUI on the RTX 3080, using the int8 build of the 3B model. The loops are compared with the Lyria versions currently in the game. I can't hear audio, so please judge by ear.</p>
<section><h2>Game loops</h2><table><tr><th>Track</th><th>Lyria (current)</th><th>YuE2 (local)</th></tr>{rows}</table></section>
<section><h2>Opening theme (with vocals)</h2><p class="small">{html.escape(stats.get('opening', {}).get('style', ''))} {t('opening')}</p>{audio('yue2-opening.mp3')}<p class="lyrics">{lyrics}</p></section>
</main></body></html>'''
open(f'{D}/index.html', 'w').write(page)
print('written')
