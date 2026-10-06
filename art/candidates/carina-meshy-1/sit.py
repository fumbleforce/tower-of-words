"""Meshy's Chair_Sit_Idle_F (action 32) on carina-2's own Meshy auto-rig (task carina-2-tex-rig, round 1), as
crowd-pilot-2/sit.py got its sit (3 credits); logged in reviews/carina-meshy-1/credits.json. For round 2's check of
Meshy's rig against ours (meshyrig.sh).
  python3 art/candidates/carina-meshy-1/sit.py
Writes the main checkout's art/parts/carina-meshy-1/meshy/carina-2-tex-sit.glb and .json.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/characters/parts'))
sys.path.insert(0, os.path.join(ROOT, 'tools/characters'))
import meshy_part as mp, meshy

d = '/home/jorgen/repo/japanese/art/parts/carina-meshy-1/meshy'
name = 'carina-2-tex-sit'
rig = json.load(open(f'{d}/carina-2-tex-rig.json'))['id']
before = meshy.call('GET', '/v1/balance')['balance']
tid = meshy.call('POST', '/v1/animations', {'rig_task_id': rig, 'action_id': 32})['result']
r = meshy.wait('animations', tid)
after = meshy.call('GET', '/v1/balance')['balance']
json.dump(r, open(f'{d}/{name}.json', 'w'), indent=1)
mp.log(os.path.join(ROOT, 'reviews/carina-meshy-1/credits.json'),
       {'service': 'meshy', 'part': name, 'task': tid, 'status': r.get('status'), 'credits': r.get('consumed_credits', 3),
        'balance_after': after, 'settings': {'rig_task_id': rig, 'action_id': 32, 'name': 'Chair_Sit_Idle_F'}})
if r.get('status') != 'SUCCEEDED':
    sys.exit('sit failed')
meshy.fetch((r.get('result') or {})['animation_glb_url'], f'{d}/{name}.glb')
print('credits', r.get('consumed_credits'), 'balance', before, '->', after)
