"""One deliberate, resumable Meshy request. No automatic next stage or paid retries.

python meshy_steps.py shape kuro
python meshy_steps.py collect kuro shape
"""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'art/parts/pool-swimwear-1'
spec = importlib.util.spec_from_file_location('meshy', ROOT / 'tools/characters/meshy.py')
meshy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(meshy)


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')


def submit_shape(person):
    source = OUT / f'pics/{person.split("-")[0]}-a.png'
    checkpoint = OUT / f'meshy/{person}/shape-request.json'
    settings = dict(ai_model='meshy-t2', model_type='smart-topology', target_polycount=1050,
                    should_texture=False, pose_mode='a-pose', target_formats=['glb'],
                    multi_view_thumbnails=True)
    identity = {'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'settings': settings}
    if checkpoint.exists():
        previous = json.loads(checkpoint.read_text())
        if any(previous[k] != v for k, v in identity.items()):
            raise SystemExit('Source/settings changed: use a new candidate id, never replace a paid checkpoint.')
        print(person, 'existing shape', previous['task_id'])
        return
    balance = meshy.call('GET', '/v1/balance')
    task = meshy.call('POST', '/v1/image-to-3d', dict(settings, image_url=meshy.data_uri(source)))['result']
    save(checkpoint, dict(identity, task_id=task, estimated_credits=5, balance_before=balance))
    print(person, 'shape submitted', task)


def collect(person, stage):
    folder = OUT / f'meshy/{person}'
    checkpoint = json.loads((folder / f'{stage}-request.json').read_text())
    kind = {'shape': 'image-to-3d', 'texture': 'retexture', 'rig': 'rigging'}[stage]
    result = meshy.call('GET', f'/v1/{kind}/{checkpoint["task_id"]}')
    save(folder / f'{stage}-response.json', result)
    print(person, stage, result.get('status'), result.get('progress'))
    if result.get('status') != 'SUCCEEDED':
        return
    urls = result.get('model_urls') or {}
    if urls.get('glb'):
        meshy.fetch(urls['glb'], str(folder / f'{stage}.glb'))
    if result.get('thumbnail_url'):
        meshy.fetch(result['thumbnail_url'], str(folder / f'{stage}-preview.png'))
    payload = result.get('result') or {}
    if payload.get('rigged_character_glb_url'):
        meshy.fetch(payload['rigged_character_glb_url'], str(folder / 'rigged.glb'))
    for name, url in (payload.get('basic_animations') or {}).items():
        if name.endswith('_glb_url') and url:
            meshy.fetch(url, str(folder / (name.removesuffix('_glb_url') + '.glb')))
    thumbnails = result.get('thumbnail_urls') or {}
    if isinstance(thumbnails, dict):
        for name, url in thumbnails.items():
            if isinstance(url, str) and url.startswith('https://'):
                meshy.fetch(url, str(folder / f'{stage}-{name}.png'))
    save(folder / f'{stage}-receipt.json', dict(task_id=checkpoint['task_id'], status=result['status'],
                                              balance_after=meshy.call('GET', '/v1/balance')))


def submit_texture(person):
    source = OUT / f'meshy/{person}/shape-uv.glb'
    guide = OUT / f'pics/{person.split("-")[0]}-a.png'
    checkpoint = OUT / f'meshy/{person}/texture-request.json'
    settings = dict(ai_model='meshy-7', enable_original_uv=True, enable_pbr=False,
                    texture_resolution='2k', target_formats=['glb'])
    identity = dict(source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                    guide_sha256=hashlib.sha256(guide.read_bytes()).hexdigest(), settings=settings)
    if checkpoint.exists():
        previous = json.loads(checkpoint.read_text())
        if any(previous[k] != v for k, v in identity.items()):
            raise SystemExit('Source/settings changed: use a new candidate id.')
        print(person, 'existing texture', previous['task_id'])
        return
    balance = meshy.call('GET', '/v1/balance')
    model = 'data:application/octet-stream;base64,' + base64.b64encode(source.read_bytes()).decode()
    task = meshy.call('POST', '/v1/retexture', dict(settings, model_url=model,
                                                  image_style_url=meshy.data_uri(guide)))['result']
    save(checkpoint, dict(identity, task_id=task, estimated_credits=10, balance_before=balance))
    print(person, 'texture submitted', task)


def submit_rig(person):
    folder = OUT / f'meshy/{person}'
    source = json.loads((folder / 'texture-request.json').read_text())
    identity = person.split('-')[0]
    if identity in ('eric', 'carina'):
        height = json.loads((ROOT / f'game3d/data/mc/{identity}.json').read_text())['model']['height']
    else:
        height = {'kuro': 1.12, 'emi': 1.09}[identity]
    settings = dict(input_task_id=source['task_id'], height_meters=height)
    checkpoint = folder / 'rig-request.json'
    if checkpoint.exists():
        previous = json.loads(checkpoint.read_text())
        if previous['settings'] != settings:
            raise SystemExit('Rig source/settings changed: use a new candidate id.')
        print(person, 'existing rig', previous['task_id'])
        return
    balance = meshy.call('GET', '/v1/balance')
    task = meshy.call('POST', '/v1/rigging', settings)['result']
    save(checkpoint, dict(settings=settings, task_id=task, estimated_credits=5, balance_before=balance))
    print(person, 'rig submitted', task)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=['shape', 'texture', 'rig', 'collect'])
    p.add_argument('person', choices=['kuro', 'kuro-b', 'emi', 'eric', 'carina'])
    p.add_argument('stage', nargs='?', default='shape', choices=['shape', 'texture', 'rig'])
    a = p.parse_args()
    if a.action == 'shape':
        submit_shape(a.person)
    elif a.action == 'texture':
        submit_texture(a.person)
    elif a.action == 'rig':
        submit_rig(a.person)
    else:
        collect(a.person, a.stage)
