"""Publish the saved #171 track B attempts; no generation, rendering or API calls."""
import hashlib
import json
from pathlib import Path

import mio_gen3d_paths as P

MAIN = Path(P.MAIN)
HERE = Path(__file__).resolve().parents[2]
BASE = 'art/parts/style-concepts/claude-miogen3d'
SHOT = 'game3d/shots/codex-gen3d-takeover'
review = HERE / 'reviews/char-mio-gen3d-1'
review.mkdir(parents=True, exist_ok=True)

options = []
jobs = []
for name, label in [('meshy-single', 'Meshy from one picture'), ('meshy-multi-t3', 'Meshy from four pictures')]:
    d = MAIN / BASE / 'raw' / name
    raw = json.loads((d / 'task.json').read_text())
    jobs.append({'attempt': name, **{k: raw[k] for k in ('id', 'type', 'status', 'consumed_credits', '_settings', '_inputs')}})
    pictures = [f'{BASE}/raw/{name}/renders/{kind}-{angle}.png'
                for kind in ['tex', 'clay'] for angle in ['front', 'l40', 'l90', 'back']]
    faces = (d / 'faces.txt').read_text().strip()
    options.append({'id': name, 'label': name + ' · ' + label, 'image': pictures[0],
                    'images': pictures[1:] + [f'{BASE}/raw/{name}/preview.png'] +
                    ([f'{BASE}/views/src-meshy-single/front.png'] if name == 'meshy-single' else []) +
                    [str(p.relative_to(MAIN)) for p in sorted(d.glob('input-*.png'))],
                    'note': f'Raw generated guide, {faces} faces, no rig. 30 credits; latest model, texture on, '
                            'remesh off, image enhancement off, PBR off. The first four views show its paint; '
                            'the next four show the same shape in clay. No hand-placed facet rebuild is finished.'})
options.append({'id': 'triposg-single', 'label': 'triposg-single · Local TripoSG shape',
                'image': f'{SHOT}/triposg-single-1366.png',
                'images': [f'{SHOT}/triposg-single-1366-90.png', f'{SHOT}/triposg-single-1366-180.png',
                           f'{BASE}/raw/triposg-single/input-0.png'],
                'note': 'Raw shape only, 580,866 triangles, 290,435 vertices; no texture or rig. '
                        'Seed 42, 50 steps, guidance 7, dense decoder; completed in 37 seconds at 5.21 GB peak VRAM. '
                        'Claude left the PLY without renders. Codex packaged it unchanged as GLB and captured these live viewer views. '
                        'Every vertex and face index matches the PLY after reload.'})
views = json.loads((MAIN / BASE / 'views/u1/prompts.json').read_text())
for tag in ['l40', 'l90', 'back', 'r90', 'r40']:
    data = views[tag]
    options.append({'id': 'u1-' + tag, 'label': 'u1-' + tag + ' · Turnaround input',
                    'image': f'{BASE}/views/u1/{tag}.png',
                    'images': [f'{BASE}/views/u1/{tag}-canvas.png', f'{BASE}/views/src-meshy-single/{tag}.png'],
                    'note': 'Generated picture for a future guide, not a 3D rebuild. Full canvas and original source render follow. '
                            + json.dumps(data, ensure_ascii=False)})
options.append({'id': 'trellis-single', 'label': 'trellis-single · Input only',
                'image': f'{BASE}/raw/trellis-single/input-0.png',
                'note': 'Prepared input only. No model, completion receipt or error log was saved in the attempt folder. '
                        'Completion is unconfirmed; no retry was started during takeover.'})
record = {'title': 'Mio: saved generated volume guides', 'date': '2026-10-01',
          'by': 'Claude generation; Codex recovery and comparison', 'status': 'open', 'issue': 171,
          'question': 'Does any saved guide have useful shape for the hand-built model?', 'multi': True,
          'media': [{'image': 'art/parts/style-concepts/mio-ref-clean/final.png',
                     'caption': 'Target picture. Generated meshes remain hidden volume guides for hand-placed facets; none is a finished character.'}],
          'options': options,
          'links': [{'label': 'Rotate the three saved raw meshes beside the target',
                     'href': 'tools/style-concepts/mio-gen3d-viewer.html'},
                    {'label': 'Job status, settings and retained-file hashes',
                     'href': 'reviews/char-mio-gen3d-1/inventory.json'}]}
for option in options:
    for p in [option['image'], *option.get('images', [])]:
        if not (MAIN / p).is_file():
            raise FileNotFoundError(p)
(review / 'review.json').write_text(json.dumps(record, indent=1, ensure_ascii=False) + '\n')
files = []
for path in sorted((MAIN / BASE).rglob('*')):
    if path.is_file():
        files.append({'path': str(path.relative_to(MAIN)), 'bytes': path.stat().st_size,
                      'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
# Retain the recorded read-only API check; rebuilding this page never contacts Meshy.
inventory_file = review / 'inventory.json'
status = json.loads(inventory_file.read_text()).get('meshy_status_check', {}) if inventory_file.exists() else {}
inventory = {'issue': 171, 'track': 'B', 'paid_jobs': jobs, 'credits_spent_by_this_track': 60,
             'meshy_status_check': status,
             'unfinished': ['No hand-placed rebuild, rig or animation', 'TRELLIS has input only; outcome unconfirmed'],
             'hunyuan': {'outputs_found': False, 'used_during_takeover': False,
                         'license': 'https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE',
                         'note': 'Official 2.0 and 2.1 licences exclude EU, UK and South Korea. Norway is not an EU member; '
                                 'no conclusion about a particular deployment is implied. No new Hunyuan use is needed.'},
             'files': files}
(review / 'inventory.json').write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + '\n')
print(review)
