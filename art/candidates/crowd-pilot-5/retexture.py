"""Submit/resume the two Meshy-only crowd texture candidates. Never changes game assets.

Each request is checkpointed before polling; rerunning resumes the same task, not another paid generation.
The original rigged mesh is the geometry/UV input. Only returned compatible base-colour maps will be packaged.
"""
from pathlib import Path
import base64
import argparse
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
MAIN = Path(str(ROOT).split('/.claude/worktrees/')[0])
sys.path.insert(0, str(ROOT / 'tools/characters'))
import meshy

OUT = MAIN / 'art/parts/crowd-pilot-5/meshy'
LEDGER = ROOT / 'reviews/crowd-pilot-5/credits.json'
SOURCES = {
    'a': 'art/parts/crowd-pilot-2/pics/a-e1.png',
    'b': 'art/parts/crowd-pilot-1/pics/b-d1.png',
}
SETTINGS = {'ai_model': 'meshy-7', 'enable_original_uv': True, 'enable_pbr': False,
            'texture_resolution': '2k', 'target_formats': ['glb']}
FACE = ('Clean anime game character texture. Symmetrical expressive anime eyes with distinct white sclera, '
        'dark irises, black pupils and one small white highlight in each eye. Defined upper eyelids, natural brows, '
        'a small clearly visible closed smiling mouth. Smooth warm skin and simple clean color areas. ')
PROMPTS = {
    'a': FACE + 'Adult office man. Short black hair, continuous black color across all hair surfaces. '
         'Medium gray business suit, white collared shirt, charcoal tie and black shoes.',
    'b': FACE + 'Adult office woman. Dark brown side-parted hair in a low bun, continuous dark brown color across '
         'all hair surfaces. Navy blazer and knee-length navy skirt, ivory blouse, black low heels.',
}


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(path)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--style', choices=['image', 'text'], default='image')
    style = parser.parse_args().style
    OUT.mkdir(parents=True, exist_ok=True)
    before = meshy.call('GET', '/v1/balance')['balance']
    tasks = {}
    for cid, image in SOURCES.items():
        record = OUT / f'{cid}-{style}-request.json'
        model = MAIN / f'art/parts/crowd-pilot-2/rig/{cid}-rigged.glb'
        picture = MAIN / image
        if record.exists():
            tasks[cid] = json.loads(record.read_text())
            assert tasks[cid]['model_sha256'] == digest(model), 'Input model changed after submission'
            continue
        body = dict(SETTINGS)
        body['model_url'] = 'data:application/octet-stream;base64,' + base64.b64encode(model.read_bytes()).decode()
        if style == 'image':
            body['image_style_url'] = meshy.data_uri(str(picture))
        else:
            body['text_style_prompt'] = PROMPTS[cid]
        task = meshy.call('POST', '/v1/retexture', body)['result']
        tasks[cid] = {'task': task, 'candidate': f'{cid}-{style}', 'settings': SETTINGS,
                      'model': str(model.relative_to(MAIN)), 'model_sha256': digest(model),
                      'image': image, 'image_sha256': digest(picture), 'submitted_at': time.time()}
        if style == 'text':
            tasks[cid].pop('image')
            tasks[cid].pop('image_sha256')
            tasks[cid]['text_style_prompt'] = PROMPTS[cid]
        write(record, tasks[cid])
        print('submitted', cid, task, flush=True)
    deadline = time.time() + 1800
    pending = dict(tasks)
    while pending and time.time() < deadline:
        for cid, task in list(pending.items()):
            response = meshy.call('GET', '/v1/retexture/' + task['task'])
            write(OUT / f'{cid}-{style}-response.json', response)
            status = response.get('status')
            print(cid, status, response.get('progress'), flush=True)
            if status not in ('SUCCEEDED', 'FAILED', 'CANCELED'):
                continue
            del pending[cid]
            if status == 'SUCCEEDED':
                target = OUT / f'{cid}-{style}.glb'
                if not target.exists():
                    meshy.fetch(response['model_urls']['glb'], str(target))
            ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else []
            row = {**task, 'status': status, 'credits': response.get('consumed_credits'),
                   'balance_after': meshy.call('GET', '/v1/balance')['balance']}
            ledger = [r for r in ledger if r['task'] != task['task']] + [row]
            write(LEDGER, ledger)
        if pending:
            time.sleep(10)
    after = meshy.call('GET', '/v1/balance')['balance']
    print('balance', before, '->', after, 'pending', list(pending), flush=True)
    if pending:
        raise SystemExit('Timed out; rerun to resume saved task IDs')


if __name__ == '__main__':
    main()
