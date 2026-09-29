#!/usr/bin/env python3
"""Publish the bounded candidate round and every captured attempt, without integration."""
from datetime import date
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHOTS = ROOT / 'art/parts/base/shots'
version = sys.argv[1] if len(sys.argv) > 1 else 'v14'
review_id = sys.argv[2] if len(sys.argv) > 2 else 'creator-base-2'
if not re.fullmatch(r'v[1-9][0-9]*', version) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', review_id):
    raise SystemExit('Usage: build_review.py v<number> [unique-review-id]')
REV = ROOT / 'reviews' / review_id
if (REV / 'review.json').exists() or (REV / 'feedback.json').exists():
    raise SystemExit('Review already exists; use a new review id for a new round.')
current = SHOTS / f'clean-{version}-rest'
for filename in ('1-bases.png', '2-closeups.png'):
    if not (current / filename).is_file():
        raise SystemExit(f'Missing current capture: {current / filename}')
REV.mkdir(exist_ok=True)
rel = lambda p: p.relative_to(ROOT).as_posix()
esc = html.escape

def key(path):
    match = re.search(r'v(\d+)', path.name)
    return (int(match[1]) if match else 0, path.stat().st_mtime)

notes = {
  1: 'First logical-loop bodies. Face projection picks up sideburns; shoulder deformation needs work.',
  5: 'Bind topology is clear, but animated shoulders fold. Original layers cut through the bases.',
  6: 'Blended shoulder weights improve movement. Mio eyes sit above the jaw. Clothing still cuts through.',
  7: 'Source-informed skull contours improve hair fit; a neck junction needs correction.',
  8: 'Neck correction. Dense default animation samples pass; the corrected rest pose reveals hand contact.',
  9: 'Shoulder shaping trial. The back of Eric’s skull has a visible notch; this version is superseded.',
  10: 'Added hand clearance. Dense testing finds a shoulder regression.',
  11: 'Convex skull and graded arm clearance. Dense motion checks pass; critics flag shoulder shelves and the Eric nape.',
  12: 'Shoulder junction reshaped. Kept as an intermediate candidate before the nape and hip-weight review fixes.',
  13: 'Nape and hip-weight review fixes. A localized shoulder crossing remains in dense walk samples.',
  14: 'Localized shoulder clearance added after the nape/hip fixes. Both strict animation modes pass; visual and fitting limits remain.'
}
sections = []
media_count = 0
for directory in sorted([p for p in SHOTS.iterdir() if p.is_dir() and (p.name.startswith('clean-') or p.name.startswith('preview-'))], key=key):
    images = sorted(p for p in directory.iterdir() if p.suffix in ('.png', '.webp'))
    if not images:
        continue
    match = re.search(r'v(\d+)', directory.name)
    n = int(match[1]) if match else 0
    note = notes.get(n, 'Intermediate candidate retained for comparison.')
    if 'fit1' in directory.name:
        note += ' Fit1 failed: face folds and weights from unrelated limbs. Rejected for use.'
    if 'fit2' in directory.name:
        note += ' Fit2 preserves garment weights and rejects face reversals; residual intersections remain. Not ready for use.'
    capture = directory / 'capture.json'
    settings = ''
    if capture.exists():
        c = json.loads(capture.read_text())
        settings = f'<p>Capture: <code>{esc(c["url"])}</code>. <a href="/{rel(capture)}">Inputs, hashes and timing</a>.</p>'
    figures = ''.join(f'<figure><a href="/{rel(p)}"><img loading="lazy" src="/{rel(p)}" alt="{esc(directory.name + ": " + p.stem)}"></a><figcaption>{esc(p.name)}</figcaption></figure>' for p in images)
    media_count += len(images)
    sections.append(f'<details><summary>{esc(directory.name)} · {len(images)} images/loops</summary><p>{esc(note)}</p>{settings}{figures}</details>')
exports = []
for path in sorted((ROOT / 'art/parts/base').glob('clean-eric-v*.json'), key=key):
    if not re.fullmatch(r'clean-eric-v\d+\.json', path.name):
        continue
    v = re.search(r'v\d+', path.name)[0]
    exports.append(f'<li>{esc(v)}: <a href="/tools/creator/base/preview.html?v={v}">inspect both bodies</a> · <a href="/{rel(path)}">Eric mesh</a> · <a href="/art/parts/base/clean-mio-{v}.json">Mio mesh</a></li>')
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chibi bases — all attempts</title><style>
body{{max-width:1200px;margin:0 auto;padding:24px;background:#f6f7f9;color:#253045;font:16px/1.5 system-ui,sans-serif}}a{{color:#235868}}h1{{font-size:28px}}summary{{cursor:pointer;padding:16px;font-weight:650;background:#e8edf1}}details{{margin:16px 0;border:1px solid #c9d1db;border-radius:6px;overflow:hidden}}details p{{padding:0 16px}}figure{{margin:20px 12px}}img{{display:block;width:100%;height:auto}}figcaption{{padding:8px;font-size:14px}}code{{overflow-wrap:anywhere}}a:focus-visible,summary:focus-visible{{outline:3px solid #235868}}.hero{{margin:24px 0}}.hero img{{border-radius:6px}}li{{padding:6px}}
</style></head><body><a href="/bible/#review/{esc(review_id)}">← Review and comments</a><h1>Chibi bases: the full round</h1>
<p>Closed skin bodies built from connected rings, with hair and clothes as separate layers. Every captured attempt is below, including the failures. This is candidate work; nothing here has replaced the game models.</p>
<p><a href="/tools/creator/base/preview.html?v={esc(version)}">Rotate the latest bases and toggle layers</a> · <a href="/notes/clean-base-deformation.md">Animation measurements and limits</a> · <a href="/tools/creator/base/build_clean_base.py">Model construction and version parameters</a></p>
<figure class="hero"><img src="/{rel(current / '1-bases.png')}" alt="Latest bare Mio and Eric turnarounds"><figcaption>{esc(version)} bare bodies. Original clothing and hair still need fitting; walk floor contact remains unresolved.</figcaption></figure>
<h2>Captured attempts, in order</h2><p>{media_count} sheets, viewer captures and animated loops. Open any attempt to see every captured view at full resolution. Older loops before fit1 used the old fixed frame duration; later loops match the source clip duration.</p>{''.join(sections)}
<h2>All exported mesh versions</h2><p>Some intermediate mesh revisions were checked numerically before a render was needed. They remain inspectable here, through the current review viewer.</p><ul>{''.join(exports)}</ul>
<p>Method: authored ring positions on each source skeleton, welded smooth normals, projected original eyes, deterministic skinning. No generative image prompt or paid rendering was used. Camera/light settings live in <a href="/tools/creator/base/shots.html">the capture source</a>; each captured set records its input hashes.</p></body></html>'''
(REV / 'attempts.html').write_text(page)
review = {
  'title': 'Smooth chibi bases — work in progress', 'date': date.today().isoformat(), 'by': 'Codex', 'status': 'open',
  'question': 'Are these base-body proportions a direction you want to keep?', 'multi': False,
  'media': [{'image': rel(current / '1-bases.png'), 'caption': f'{version}: closed skin bodies, 398 vertices / 792 triangles each. Shape feedback only; layers and floor contact remain unfinished.'},
            {'image': rel(current / '2-closeups.png'), 'caption': 'Head, face, shoulder and hand close-ups.'}],
  'options': [
    {'id': 'keep-direction', 'label': 'Keep developing these proportions', 'image': rel(current / '1-bases.png'), 'note': 'Keep the base direction while fixing the remaining layer fit and animation contact. This is not approval to replace the game assets.'},
    {'id': 'adjust-shape', 'label': 'Change the base shape', 'image': rel(current / '2-closeups.png'), 'note': 'Comment on the head, torso, shoulders or limbs to change. All earlier attempts are linked below.'},
    {'id': 'reject-direction', 'label': 'Try a different base direction', 'image': rel(current / '1-bases.png'), 'note': 'The original models remain in the game.'}
  ],
  'links': [
    {'label': 'Rotate, zoom, and toggle layers', 'href': f'tools/creator/base/preview.html?v={version}'},
    {'label': 'Every captured attempt and walk loop', 'href': f'reviews/{review_id}/attempts.html'},
    {'label': 'Animation checks and known limits', 'href': 'notes/clean-base-deformation.md'}
  ]
}
(REV / 'review.json').write_text(json.dumps(review, indent=2, ensure_ascii=False) + '\n')
print(f'{REV}: {media_count} captured images/loops, {len(exports)} mesh versions')
