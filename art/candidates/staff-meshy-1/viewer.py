"""reviews/<id>-meshy-1/viewer.json: the rigged model in the live viewer (tools/characters/parts/viewer.html) beside
the in-game Eric, Mio, Kuro, Aoi and Emi, and the sit clip's credits in the round's ledger (once).

  python3 art/candidates/staff-meshy-1/viewer.py <id> <Name> <attempt>=<rigged glb under art/parts> ... [--sit <task> <credits> <balance>]
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
cid, name, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
sit = None
if '--sit' in rest:
    i = rest.index('--sit'); sit = rest[i + 1:i + 4]; rest = rest[:i]
attempts = dict(a.split('=', 1) for a in rest)
G = '/game3d/assets'
cast = [{'glb': f'{G}/eric/walk.glb', 'tex': f'{G}/eric/base.webp'},
        {'glb': f'{G}/mio/walk.glb', 'tex': f'{G}/mio/base-clean.webp'}] + \
       [{'glb': f'{G}/characters/{c}/walk.glb', 'tex': f'{G}/characters/{c}/base.webp'} for c in ('kuro', 'aoi', 'emi')]
cfg = {'title': f'{name} ({cid}-meshy-1)',
       'blurb': f'A real rigged 3D model, made the way Kuro, Aoi and Emi were: Meshy smart topology (1,050 polygons, '
                f'A-pose) from the ChatGPT picture, textured in a second pass on a UV layout with the face as one piece, '
                f'Meshy auto-rig at 1.1 m. Idle and walk are the game\'s. Beside him or her: the in-game Eric, Mio, Kuro, '
                f'Aoi and Emi. Drag to turn, wheel to zoom.',
       'attempts': {k: '/' + v.lstrip('/') for k, v in attempts.items()},
       'compare': {'Eric, Mio, Kuro, Aoi and Emi': cast, 'Kuro, Aoi and Emi': cast[2:], 'Eric and Mio (in game)': cast[:2]},
       'refs': []}
d = f'{ROOT}/reviews/{cid}-meshy-1'
os.makedirs(d, exist_ok=True)
json.dump(cfg, open(f'{d}/viewer.json', 'w'), indent=1, ensure_ascii=False)
if sit:
    led = json.load(open(f'{d}/credits.json'))
    if not any(e['part'].endswith('-sit') for e in led):
        led.append({'service': 'meshy', 'part': f'{cid}-sit', 'task': sit[0], 'status': 'SUCCEEDED', 'credits': int(sit[1]),
                    'balance_after': int(sit[2]), 'settings': {'action_id': 32, 'name': 'Chair_Sit_Idle_F'},
                    'note': f'for the game: tools/characters/meshy.py anim {cid} <rig task> 32 sit'})
        json.dump(led, open(f'{d}/credits.json', 'w'), indent=1)
print('wrote', f'{d}/viewer.json')
