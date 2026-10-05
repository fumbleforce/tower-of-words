"""Fill reviews/crowd-pilot-1/viewer.json's variety rows from the colour variants (variety.py's regions.json) and
list every file the viewer loads from art/parts/ in review.json's "viewer_files", so tools/bible/pages.py puts them
on the public site with the review.
  python3 art/candidates/crowd-pilot-1/viewer_cfg.py
"""
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
MAIN = '/home/jorgen/repo/japanese'
P = 'art/parts/crowd-pilot-1'
cfg_p = f'{ROOT}/reviews/crowd-pilot-1/viewer.json'
c = json.load(open(cfg_p))
for m in 'ab':
    r = json.load(open(f'{MAIN}/{P}/variety/{m}/regions.json'))
    c['variety'][m] = [{'tex': f'{P}/variety/{m}/{v["tex"]}', 'height': v['height'],
                        'label': f'{m.upper()} v{i}' + (' (as made)' if i == 0 else '')}
                       for i, v in enumerate(r['variants'])]
json.dump(c, open(cfg_p, 'w'), indent=1, ensure_ascii=False)
files = []
for rig in c['rigs'].values():
    if rig['dir'].startswith(P):
        files += [rig['dir'] + f for f in ('walk.glb', 'run.glb', 'sit.glb', 'base.webp')] + [rig['idle']]
files += [v['tex'] for row in c['variety'].values() for v in row]
rv_p = f'{ROOT}/reviews/crowd-pilot-1/review.json'
if os.path.exists(rv_p):
    rv = json.load(open(rv_p))
    rv['viewer_files'] = sorted(set(files))
    json.dump(rv, open(rv_p, 'w'), indent=1, ensure_ascii=False)
missing = [f for f in files if not os.path.exists(f'{MAIN}/{f}')]
print(len(set(files)), 'viewer files', 'missing: ' + ', '.join(missing) if missing else 'all here')
