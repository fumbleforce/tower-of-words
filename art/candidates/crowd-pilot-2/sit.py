"""Meshy's Chair_Sit_Idle_F (action 32) on a rig of this round (3 credits), as round 1 and the cast got theirs; logged in
reviews/crowd-pilot-2/credits.json.
  python3 art/candidates/crowd-pilot-2/sit.py <rigged part, e.g. a-2-tex> <out name, e.g. a-sit>
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/characters/parts'))
sys.path.insert(0, os.path.join(ROOT, 'tools/characters'))
import meshy_part as mp, meshy

part, name = sys.argv[1:3]
d = '/home/jorgen/repo/japanese/art/parts/crowd-pilot-2/meshy'
rig = json.load(open(f'{d}/{part}-rig.json'))['id']
before = meshy.call('GET', '/v1/balance')['balance']
tid = meshy.call('POST', '/v1/animations', {'rig_task_id': rig, 'action_id': 32})['result']
r = meshy.wait('animations', tid)
after = meshy.call('GET', '/v1/balance')['balance']
json.dump(r, open(f'{d}/{name}.json', 'w'), indent=1)
mp.log(os.path.join(ROOT, 'reviews/crowd-pilot-2/credits.json'),
       {'service': 'meshy', 'part': name, 'task': tid, 'status': r.get('status'), 'credits': r.get('consumed_credits', 3),
        'balance_after': after, 'settings': {'rig_task_id': rig, 'action_id': 32, 'name': 'Chair_Sit_Idle_F'}})
if r.get('status') != 'SUCCEEDED':
    sys.exit('sit failed')
meshy.fetch((r.get('result') or {})['animation_glb_url'], f'{d}/{name}.glb')
print('credits', r.get('consumed_credits'), 'balance', before, '->', after)
