"""Rebuild the reader page for the character-voices-2 review from notes/characters/<id>/{voice,sample}.md.
Run: python3 reviews/character-voices-2/build.py
Writes index.html, and fills each option's note and the question in review.json from its questions, context and ask fields.
"""
from pathlib import Path
import hashlib, html, json, re

BASE = Path(__file__).resolve().parents[2]
OUT = BASE / 'reviews/character-voices-2'
REPO = 'https://github.com/fumbleforce/tower-of-words/blob/main/'
CAST = ['mio', 'kenji', 'kuro', 'rei']
NAMES = {'mio': 'Mio', 'kenji': 'Kenji', 'kuro': 'Kuro', 'rei': 'Rei', 'eric': 'Eric', 'mori': 'Mori'}

# Word tokens such as {yasumi} are shown in Japanese, with the romaji next to them.
WORDS = {}
for row in (BASE / 'docs/game/words.md').read_text().splitlines():
    m = re.match(r'\| `([a-z_]+)` \| ([^|]+) \| ([^|]+) \|', row)
    if m:
        WORDS[m[1]] = (m[2].strip(), m[3].strip())
for k, v in {'ojama': ('お邪魔します', 'ojama shimasu'), 'watashi': ('私', 'watashi'), 'anata': ('あなた', 'anata'),
             'ji': ('時', 'ji'), 'roku': ('六', 'roku'), 'futari': ('二人', 'futari'), 'otsukare': ('お疲れさまです', 'otsukaresama desu')}.items():
    WORDS.setdefault(k, v)

REVIEW = json.loads((OUT / 'review.json').read_text())
OPTS = {o['id']: o for o in REVIEW['options']}


def esc(t):
    return html.escape(t, quote=False)


def link(raw, ident):
    if raw.startswith('http'):
        return raw
    path, _, frag = raw.partition('#')
    parts = ('notes/characters/' + ident + '/' + path).split('/')
    out = []
    for p in parts:
        if p == '..':
            out.pop()
        elif p and p != '.':
            out.append(p)
    return REPO + '/'.join(out) + ('#' + frag if frag else '')


def inline(text, ident):
    t = esc(text)
    t = t.replace('{mc.name_jp}', 'エリック').replace('{mc.name}', 'Eric')
    t = re.sub(r'\{([a-z_]+)\}', lambda m: word(m[1]), t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="' + html.escape(link(html.unescape(m[2]), ident)) + '">' + m[1] + '</a>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', t)


def word(key):
    jp, ro = WORDS.get(key, (key, ''))
    return '<span class="w" lang="ja">' + esc(jp) + '</span>' + (' <span class="ro">(' + esc(ro) + ')</span>' if ro else '')


def markdown(text, ident, skip_title=True):
    """Headings, paragraphs, quotes, bullet and numbered lists. Enough for the voice sheets."""
    res, lines, i = [], text.splitlines(), 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.strip() == '---':
            i += 1
            continue
        if line.startswith('# '):
            i += 1
            if not skip_title:
                res.append('<h3>' + inline(line[2:], ident) + '</h3>')
            continue
        if line.startswith('## '):
            res.append('<h3>' + inline(line[3:], ident) + '</h3>')
            i += 1
            continue
        if line.startswith('> '):
            q = []
            while i < len(lines) and lines[i].startswith('> '):
                q.append(lines[i][2:])
                i += 1
            res.append('<blockquote>' + inline(' '.join(q), ident) + '</blockquote>')
            continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                row = lines[i]
                i += 1
                if re.fullmatch(r'[|\- :]+', row.strip()):
                    continue
                cells = [inline(x.strip(), ident) for x in row.strip().strip('|').split(' | ')]
                tag = 'th' if not rows else 'td'
                rows.append('<tr>' + ''.join(f'<{tag}>{c}</{tag}>' for c in cells) + '</tr>')
            res.append('<div class="table"><table>' + ''.join(rows) + '</table></div>')
            continue
        m = re.match(r'^(\d+\.|-) ', line)
        if m:
            tag = 'ol' if m[1] != '-' else 'ul'
            items = []
            while i < len(lines) and (re.match(r'^(\d+\.|-) ', lines[i]) or (items and lines[i].startswith('   '))):
                if lines[i].startswith('   '):
                    items[-1] += '<br>' + inline(lines[i].strip(), ident)
                else:
                    items.append(inline(re.sub(r'^(\d+\.|-) ', '', lines[i]), ident))
                i += 1
            res.append('<' + tag + '>' + ''.join('<li>' + x + '</li>' for x in items) + '</' + tag + '>')
            continue
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|> |\d+\. |- |---|\|)', lines[i]):
            para.append(lines[i])
            i += 1
        res.append('<p>' + inline(' '.join(para), ident) + '</p>')
    return '\n'.join(res)


# ---- Sample scenes. Each file uses its own script format; all four become the same list of beats. ----
# Beats: ('head', text) ('stage', text) ('narr', text) ('say', who, emo, text, gloss) ('choice', [(text, target)]) ('end',)

def say(who, emo, text, gloss=''):
    return ('say', who.lower(), emo, text, gloss)


def parse_mio(text):
    intro, beats, body = text.split('## ', 1)[0], [], '## ' + text.split('## ', 1)[1]
    lines = body.splitlines()
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        i += 1
        if not s:
            continue
        if s.startswith('## '):
            beats.append(('head', s[3:]))
        elif s == '[choice]':
            opts = []
            while i < len(lines) and lines[i].startswith('- '):
                t, _, g = lines[i][2:].partition(' → ')
                opts.append((t, g))
                i += 1
            beats.append(('choice', opts))
        elif s.startswith('['):
            beats.append(('stage', s.strip('[]')))
        elif s.startswith('> '):
            beats.append(('narr', s[2:]))
        else:
            m = re.match(r'^(\w+) \(([^)]*)\): (.*)$', s)
            beats.append(say(m[1], m[2], m[3]) if m else ('stage', s))
    return intro, beats, ''


def js_str(s):
    return s.replace("\\'", "'")


def parse_kenji(text):
    intro, _, rest = text.partition('```js')
    code, _, after = rest.partition('```')
    beats = []
    for raw in code.splitlines():
        s = raw.strip().rstrip(',')
        if not s or s in (']', '] }', '],'):
            continue
        if m := re.match(r'^(\w+): \[$', s):
            beats.append(('head', m[1]))
        elif m := re.match(r"^\{ say: '(\w+)'(, overheard: true)?, emo: '(\w+)', text: '(.*?)'(, clear: .*)? \}$", s):
            beats.append(say(m[1], ('overheard, ' if m[2] else '') + m[3], js_str(m[4])))
        elif m := re.match(r'^"(\w+): (.*)"$', s):
            beats.append(say(m[1], '', m[2]))
        elif m := re.match(r"^'> (.*)'$", s):
            beats.append(('narr', js_str(m[1])))
        elif s.startswith('{ choice: ['):
            beats.append(('choice', []))
        elif m := re.match(r"^\{ text: '(.*?)', go: '(\w+)' \}$", s):
            beats[-1][1].append((js_str(m[1]), m[2]))
        elif m := re.match(r"^\{ if: '(\w+)', then: \[$", s):
            beats.append(('stage', 'if ' + m[1]))
        elif s.startswith('], else: ['):
            beats.append(('stage', 'otherwise'))
        elif m := re.match(r"^\{ set: '(\w+)' \}$", s):
            beats.append(('stage', 'set ' + m[1]))
        elif m := re.match(r"^\{ do: '(\w+)', (.*) \}$", s):
            args = dict(re.findall(r"(\w+): '?([\w.]+)'?", m[2]))
            act = m[1]
            if act == 'cam':
                beats.append(('stage', 'camera back' if 'back' in args else 'camera closes on ' + args.get('on', '')))
            elif act == 'walk':
                beats.append(('stage', args['who'] + ' walks to ' + args['to'].replace('_', ' ')))
            elif act == 'look':
                beats.append(('stage', args['who'] + ' looks at ' + args['at']))
            elif act == 'gesture':
                beats.append(('stage', args['who'] + ' points' + (' at ' + args['to'] if 'to' in args else '')))
            elif act == 'face':
                beats.append(('stage', args['who'] + ' turns to ' + args.get('to', '')))
            elif act == 'bow':
                beats.append(('stage', args['who'] + ' bows'))
            else:
                beats.append(('stage', act))
    return intro, beats, after


def parse_kuro_block(code):
    beats = []
    for raw in code.splitlines():
        s = raw.strip()
        if not s:
            continue
        if s == 'CHOICE':
            beats.append(('choice', []))
            continue
        if m := re.match(r'^> "?(.*?)"?\s*->\s*(\w+)$', s):
            if not (beats and beats[-1][0] == 'choice'):
                beats.append(('choice', []))
            beats[-1][1].append((m[1].strip().rstrip('"'), m[2]))
            continue
        if m := re.match(r'^(\w+):$', s):
            beats.append(('head', m[1]))
            continue
        if s == 'end':
            beats.append(('stage', 'scene ends'))
            continue
        if m := re.match(r'^TYPE (\w+)\s+\(prompt: (.*)\)$', s):
            beats.append(('stage', 'Eric types ' + m[1] + '. Prompt: ' + m[2]))
            continue
        if m := re.match(r'^> "?(.*?)"?$', s):
            beats.append(('opt', m[1]))
            continue
        if s.startswith('(') and beats and beats[-1][0] == 'say':
            g = re.match(r'^\((.*?)\)(\s+\[(.*)\])?$', s)
            b = beats[-1]
            beats[-1] = (b[0], b[1], b[2], b[3], g[1])
            continue
        if s.startswith('['):
            beats.append(('stage', s.strip('[]')))
        elif s.startswith('set '):
            beats.append(('stage', s))
        elif m := re.match(r'^(\w+) \(([^)]*)\): (.*)$', s):
            beats.append(say(m[1], m[2], m[3]))
        else:
            beats.append(('stage', s))
    # Kuro's choices hold their own lines; show each option as a branch heading.
    out = []
    for b in beats:
        if b[0] == 'opt':
            out.append(('head', 'Choice: ' + b[1]))
        elif b[0] == 'choice' and not b[1]:
            out.append(('stage', 'choice'))
        else:
            out.append(b)
    # The phone call after the choice is shared by both branches.
    for k in range(len(out) - 1, -1, -1):
        if out[k] == ('stage', 'The desk phone rings. Kuro picks it up without looking away from Eric.'):
            out.insert(k, ('head', 'Both branches'))
            break
    return out


def parse_rei(text):
    head, _, rest = text.partition('\n---\n')
    script, _, after = rest.partition('\n---\n')
    beats, lines, i = [], script.splitlines(), 0
    while i < len(lines):
        s = lines[i].strip()
        i += 1
        if not s:
            continue
        if s == '**choice**':
            opts = []
            while i < len(lines) and lines[i].startswith('- '):
                m = re.match(r'^- "(.*)" → `(\w+)`$', lines[i])
                opts.append((m[1], m[2]))
                i += 1
            beats.append(('choice', opts))
        elif m := re.match(r'^\*\*(\w+(?: \w+)?)\*\*$', s):
            beats.append(('head', m[1]))
        elif m := re.match(r'^\*\*(\w+)(?::\*\*|\*\*(?: \(([^)]*)\))?:) (.*)$', s):
            who = m[1]
            emo = m[2] or ''
            line = m[3]
            gloss = ''
            if i < len(lines) and lines[i].strip().startswith('('):
                gloss = lines[i].strip()[1:-1]
                i += 1
            beats.append(say(who, emo, line, gloss))
        elif m := re.match(r'^`\[if (\w+)\]` \*\*(\w+):\*\* (.*)$', s):
            beats.append(('stage', 'if ' + m[1]))
            beats.append(say(m[2], '', m[3]))
        elif m := re.match(r'^`\[(.*)\]`(.*)$', s):
            first = 'Eric talks to ' + m[1][5:].title() if m[1].startswith('talk:') else m[1]
            beats.append(('stage', first + ('. ' if m[2].strip() else '') + m[2].strip()))
        elif s.startswith('> '):
            beats.append(('narr', s[2:]))
        else:
            beats.append(('stage', s))
    return head, beats, after


def render_kuro(ident, text):
    parts = text.split('```')
    html_out = []
    for n, part in enumerate(parts):
        html_out.append(render_script(ident, parse_kuro_block(part)) if n % 2 else markdown(part, ident))
    return '\n'.join(html_out)


PARSERS = {'mio': parse_mio, 'kenji': parse_kenji, 'rei': parse_rei}


def emo_tag(emo):
    parts = [p.strip() for p in emo.split(',') if p.strip()]
    heard = any(p == 'overheard' for p in parts)
    rest = [p for p in parts if p != 'overheard']
    out = ''
    if heard:
        out += '<span class="tag heard" title="Eric hears this in Japanese; unknown words are blurred in the game">overheard</span>'
    if rest:
        out += '<span class="tag">' + esc(', '.join(rest)) + '</span>'
    return out


def render_script(ident, beats):
    rows = []
    for b in beats:
        kind = b[0]
        if kind == 'head':
            rows.append('<div class="sh">' + inline(b[1], ident) + '</div>')
        elif kind == 'stage':
            rows.append('<div class="sd">' + inline(b[1], ident) + '</div>')
        elif kind == 'narr':
            rows.append('<div class="nr"><span class="who">Narration</span><span class="line">' + inline(b[1], ident) + '</span></div>')
        elif kind == 'say':
            _, who, emo, text, gloss = b
            jp = bool(re.search(r'[぀-ヿ一-鿿]', re.sub(r'\{[a-z_]+\}', '', text)))
            rows.append('<div class="ln ' + ('me' if who == ident else 'other') + '"><span class="who">' + esc(NAMES.get(who, who.title())) + emo_tag(emo) + '</span><span class="line"' + (' lang="ja"' if jp and not re.search(r'[A-Za-z]{3}', re.sub(r'\{[a-z_]+\}', '', text)) else '') + '>' + inline(text, ident) + (('<span class="gl">' + inline(gloss, ident) + '</span>') if gloss else '') + '</span></div>')
        elif kind == 'choice':
            if b[1]:
                rows.append('<div class="ch"><span class="who">Choice</span><ul>' + ''.join('<li>' + inline(t, ident) + (' <span class="go">→ ' + esc(g) + '</span>' if g else '') + '</li>' for t, g in b[1]) + '</ul></div>')
            else:
                rows.append('<div class="sd">Choice</div>')
    return '<div class="script">' + '\n'.join(rows) + '</div>'


def drift_block(ident, drift):
    if not drift:
        return ''
    return f'''<details class="part drift"><summary>Existing game lines to rewrite ({len(re.findall(r'^\| (?!-)', drift, re.M)) - drift.count('## ') - (1 if drift.startswith('|') else 0)} lines)</summary><article class="wide">{markdown(drift, ident)}
<p class="source">Source: <a href="{REPO}notes/characters/{ident}/drift.md">notes/characters/{ident}/drift.md</a></p></article></details>'''


def card(ident, hashes):
    voice = (BASE / 'notes/characters' / ident / 'voice.md').read_text()
    sample = (BASE / 'notes/characters' / ident / 'sample.md').read_text()
    hashes[ident] = hashlib.sha256((voice + sample).encode()).hexdigest()
    drift_path = BASE / 'notes/characters' / ident / 'drift.md'
    drift = drift_path.read_text() if drift_path.exists() else ''
    hashes[ident + '-drift'] = hashlib.sha256(drift.encode()).hexdigest()
    if ident == 'kuro':
        sample_html = render_kuro(ident, sample)
    else:
        intro, beats, after = PARSERS[ident](sample)
        sample_html = markdown(intro, ident) + render_script(ident, beats) + markdown(after, ident, skip_title=False)
    title = sample.splitlines()[0][2:]
    opt = OPTS[ident]
    qs = opt['questions']
    return f'''<section class="card" id="{ident}">
<div class="top"><img src="../../{opt['image']}" alt="{NAMES[ident]}, neutral portrait" width="597" height="768">
<div class="qbox"><h2>{ident}</h2><div class="changed"><h3>What changed since round 1</h3><p>{inline(opt['changed'], ident)}</p></div>
<h3>{'Questions' if len(qs) > 1 else 'Question'} for you</h3><ol class="qs">{''.join('<li>' + inline(q, ident) + '</li>' for q in qs)}</ol>
{('<p class="info">' + inline(opt['info'], ident) + '</p>') if opt.get('info') else ''}
<p class="how">Answer on the <a href="../../bible/#review/character-voices-2">Review page</a>: pick <b>{ident}</b> to approve as is, pick it and comment to approve with your comments, or reject it to have it redone.</p></div></div>
<details class="part" open><summary>Voice sheet</summary><article>{markdown(voice, ident)}
<p class="source">Source: <a href="{REPO}notes/characters/{ident}/voice.md">notes/characters/{ident}/voice.md</a></p></article></details>
<details class="part" open><summary>Sample scene{(': ' + esc(title.split(':', 1)[-1].strip())) if title.split(':', 1)[-1].strip().lower() != 'sample scene' else ''}</summary><article>{sample_html}
<p class="source">Source: <a href="{REPO}notes/characters/{ident}/sample.md">notes/characters/{ident}/sample.md</a></p></article></details>
{drift_block(ident, drift)}
</section>'''


CSS = '''
:root{--bg:#f6f8f8;--panel:#fff;--ink:#203237;--ink2:#5b6e74;--line:#d6e0e1;--accent:#146c73;--soft:#e6f1f1;--me:#eef6f6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,"Noto Sans JP",sans-serif}
main{max-width:1180px;margin:auto;padding:32px 28px 80px}a{color:var(--accent);text-underline-offset:3px}
h1{font-size:clamp(28px,4.5vw,40px);line-height:1.15;margin:14px 0 12px}.lede{max-width:75ch;font-size:18px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 28px}nav a{padding:6px 14px;border:1px solid var(--line);border-radius:99px;background:var(--panel);text-decoration:none;font-weight:600}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;margin:0 0 36px;scroll-margin-top:12px;overflow:hidden}
.top{display:grid;grid-template-columns:300px 1fr;gap:28px;padding:22px;border-bottom:1px solid var(--line)}
.top img{width:100%;height:auto;border-radius:8px;background:var(--soft)}
.qbox h2{font:700 30px/1.1 ui-monospace,Menlo,monospace;margin:4px 0 6px}.who-line{color:var(--ink2);margin:0 0 14px}
.qbox h3{font-size:16px;text-transform:none;margin:18px 0 6px}.qs{padding-left:24px;margin:0}.qs li{margin:10px 0}
.info{background:var(--soft);border-radius:8px;padding:10px 14px;font-size:15.5px}.how{font-size:15px;color:var(--ink2)}
details.part{border-top:1px solid var(--line)}details.part:first-of-type{border-top:0}
summary{cursor:pointer;padding:16px 22px;font-size:20px;font-weight:650}
article{padding:0 22px 22px;max-width:86ch}article h3{margin:26px 0 6px;font-size:18px}article p{margin:12px 0}
blockquote{margin:6px 0 16px;padding:8px 14px;border-left:3px solid var(--accent);background:var(--me);border-radius:0 6px 6px 0}
li{margin:6px 0}code{font-size:.88em;background:#edf2f2;padding:1px 4px;border-radius:3px;overflow-wrap:anywhere}
.source{font-size:14px;color:var(--ink2);border-top:1px solid var(--line);padding-top:12px;margin-top:22px}
.script{margin:18px 0;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.script>div{padding:8px 14px;border-top:1px solid #eef2f2}.script>div:first-child{border-top:0}
.ln,.nr,.ch{display:grid;grid-template-columns:150px 1fr;gap:14px}.ln.me{background:var(--me)}
.who{font-weight:700;display:flex;flex-direction:column;align-items:flex-start;gap:3px}
.tag{font-weight:500;font-size:12.5px;color:var(--ink2)}.tag.heard{color:#7a4d00;background:#fff3d6;border-radius:4px;padding:0 5px}
.line{display:block}.line[lang=ja],.w{font-size:1.08em}.gl{display:block;color:var(--ink2);font-size:15px;margin-top:2px}
.w{background:#e3f0ef;border-radius:4px;padding:0 4px}.ro{color:var(--ink2);font-size:.85em}
.sd{color:var(--ink2);font-style:italic;font-size:15.5px;background:#fafbfb}.nr .line{font-style:italic}
.sh{font:700 14px/1.4 ui-monospace,Menlo,monospace;background:var(--soft);color:var(--accent);padding:10px 14px!important}
.ch ul{margin:0;padding-left:20px}.go{color:var(--ink2);font-size:14px}
footer{font-size:14px;color:var(--ink2)}
article.wide{max-width:none}.table{overflow-x:auto;margin:14px 0;border:1px solid var(--line);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:15px}th,td{padding:8px 10px;text-align:left;vertical-align:top;border-top:1px solid var(--line)}
th{background:var(--soft);border-top:0}td:first-child code{white-space:nowrap}
.changed{background:var(--me);border-radius:8px;padding:10px 14px;margin:12px 0}.changed h3{margin:0 0 4px;font-size:16px}.changed p{margin:4px 0}
@media(max-width:760px){.drift table{min-width:640px}}
@media(max-width:760px){main{padding:18px 14px 50px}.top{grid-template-columns:1fr;gap:12px;padding:16px}.top img{max-width:220px}
article{padding:0 16px 18px}summary{padding:14px 16px;font-size:18px}.ln,.nr,.ch{grid-template-columns:1fr;gap:2px}
.who{flex-direction:row;flex-wrap:wrap;gap:8px;align-items:baseline}.script>div{padding:8px 12px}}
'''


def main():
    hashes = {}
    cards = ''.join(card(c, hashes) for c in CAST)
    lede = ''.join('<p class="lede">' + inline(p, 'mio') + '</p>' for p in REVIEW['context'])
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Character voices, round 2</title><style>{CSS}</style></head>
<body><main><a href="../../bible/#review/character-voices-2">Back to Review</a><h1>How Mio, Kenji, Kuro and Rei talk, round 2</h1>
{lede}
<nav aria-label="Characters">{''.join(f'<a href="#{c}">{c}</a>' for c in CAST)}</nav>
{cards}
<footer>Built by reviews/character-voices-2/build.py from notes/characters/&lt;id&gt;/voice.md and sample.md. Issue #368.</footer></main>
<script>function reveal(){{const t=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(t)requestAnimationFrame(()=>t.scrollIntoView({{block:'start'}}));}}addEventListener('hashchange',reveal);reveal();</script>
</body></html>
<!-- Source SHA-256: {json.dumps(hashes, sort_keys=True)} -->
'''
    (OUT / 'index.html').write_text(page)
    for o in REVIEW['options']:
        o['note'] = (('What changed: ' + o['changed'] + ' Questions: ') if o.get('changed') else '') + ' '.join(f'{n}) {q}' for n, q in enumerate(o['questions'], 1)) + (' ' + o['info'] if o.get('info') else '')
    REVIEW['question'] = ' '.join(REVIEW['context']) + ' ' + REVIEW['ask']
    (OUT / 'review.json').write_text(json.dumps(REVIEW, ensure_ascii=False, indent=1) + '\n')
    print('wrote', OUT / 'index.html')


if __name__ == '__main__':
    main()
