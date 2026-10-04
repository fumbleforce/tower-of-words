"""One Meshy image-to-3D generation for a part (#171 parts method). Same settings as char-mio-gen3d-1 meshy-single
(latest model, no remesh, textured in the same task, image enhancement off, no PBR), so only the input changes;
`pose=a-pose` and `tex=4k` (same price as 2k) are the extra knobs, and `model=t2 faces=<n>` switches to Meshy's
Smart Topology model (low poly at a set face count, 15 credits). `texture=0` makes the shape only, for the 3D
character workflow's separate texture pass (`retex`). Uses Jørgen's Meshy credits: one call, one part.

  meshy_part.py <part> <picture.png> [pose=a-pose] [tex=4k] [model=t2 faces=3000] [texture=0] [round=chibi-meshy]
Writes <part>.json and .glb to the main checkout's art/parts/<round>/meshy/ (local only) and appends the credits to
reviews/<round>-1/credits.json (or reviews/<review>/credits.json with review=<id>). The round defaults to char-mio-parts.

  meshy_part.py rig <part> [height=1.0] [round=chibi-meshy] [model=<local.glb>]
Meshy auto-rig on that part's task (5 credits; height lowered for a big chibi head). Writes <part>-rigged.glb and
Meshy's free walking and running clips next to it, and logs the credits the same way.

  meshy_part.py retex <part> <picture.png> [round=chibi-meshy] [model=<local.glb>] [tex=4k] [name=<part>-tex]
Texture pass on that part's untextured shape, styled from the picture (Meshy retexture, no PBR, lighting removed,
the shape's own UVs). `model=` sends a local copy of the shape instead (e.g. with UVs of our own, which "own UVs"
then keeps; Meshy's smart-topology shapes come with none). Writes <name>.json and <name>.glb (default <part>-tex);
rig it with `rig <name>`.
"""
import base64, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import meshy

ROOT = meshy.ROOT
MAIN = ROOT.split('/.claude/worktrees/')[0]


def key():
    for env in (os.path.join(ROOT, '.env'), os.path.join(MAIN, '.env')):
        if os.path.exists(env):
            for line in open(env):
                if line.startswith('MESHY_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('no MESHY_API_KEY')


meshy.key = key


def log(ledger, entry):
    led = json.load(open(ledger)) if os.path.exists(ledger) else []
    led.append(entry)
    os.makedirs(os.path.dirname(ledger), exist_ok=True)
    json.dump(led, open(ledger, 'w'), indent=1)


def rig(part, opts):
    rnd = opts.get('round', 'char-mio-parts')
    d = os.path.join(MAIN, f'art/parts/{rnd}/meshy')
    h = float(opts.get('height', 1.0))
    if opts.get('model'):                    # a local glb (e.g. decimated under the 320k-face rig limit)
        body = {'model_url': 'data:application/octet-stream;base64,' + base64.b64encode(open(opts['model'], 'rb').read()).decode()}
        settings = {'model': os.path.relpath(opts['model'], MAIN)}
    else:
        body = {'input_task_id': json.load(open(f'{d}/{part}.json'))['id']}
        settings = dict(body)
    body['height_meters'] = settings['height_meters'] = h
    tid = meshy.call('POST', '/v1/rigging', body)['result']
    print('task', tid, flush=True)
    r = meshy.wait('rigging', tid)
    r['_settings'] = settings
    json.dump(r, open(f'{d}/{part}-rig.json', 'w'), indent=1)
    log(os.path.join(ROOT, f'reviews/{opts.get("review", rnd + "-1")}/credits.json'),
        {'service': 'meshy', 'part': part + '-rig', 'task': tid, 'status': r.get('status'),
         'credits': r.get('consumed_credits'), 'settings': r['_settings']})
    if r.get('status') != 'SUCCEEDED':
        sys.exit(f'rig failed: {r.get("task_error")}')
    res = r['result']
    meshy.fetch(res['rigged_character_glb_url'], f'{d}/{part}-rigged.glb')
    for k, v in (res.get('basic_animations') or {}).items():
        if k.endswith('glb_url') and v: meshy.fetch(v, f'{d}/{part}-' + k.replace('_glb_url', '') + '.glb')
    print('credits', r.get('consumed_credits'))


def retex(part, pic, opts):
    rnd = opts.get('round', 'char-mio-parts')
    d = os.path.join(MAIN, f'art/parts/{rnd}/meshy')
    name = opts.get('name', part + '-tex')
    body = {'image_style_url': meshy.data_uri(pic), 'enable_pbr': False, 'remove_lighting': True,
            'enable_original_uv': True, 'target_formats': ['glb']}
    if opts.get('model'):
        body['model_url'] = 'data:application/octet-stream;base64,' + base64.b64encode(open(opts['model'], 'rb').read()).decode()
    else:
        body['input_task_id'] = json.load(open(f'{d}/{part}.json'))['id']
    if opts.get('tex'): body['texture_resolution'] = opts['tex']
    settings = {k: v for k, v in body.items() if k not in ('image_style_url', 'model_url')}
    if opts.get('model'): settings['model'] = os.path.relpath(opts['model'], MAIN)
    before = meshy.call('GET', '/v1/balance')['balance']
    tid = meshy.call('POST', '/v1/retexture', body)['result']
    print('task', tid, flush=True)
    r = meshy.wait('retexture', tid)
    after = meshy.call('GET', '/v1/balance')['balance']
    r['_settings'], r['_input'] = settings, os.path.relpath(pic, MAIN)
    json.dump(r, open(f'{d}/{name}.json', 'w'), indent=1)
    log(os.path.join(ROOT, f'reviews/{opts.get("review", rnd + "-1")}/credits.json'),
        {'service': 'meshy', 'part': name, 'task': tid, 'status': r.get('status'),
         'credits': r.get('consumed_credits', before - after), 'balance_after': after, 'settings': settings,
         'input': r['_input']})
    if r.get('status') != 'SUCCEEDED':
        sys.exit(f'texture failed: {r.get("task_error")}')
    meshy.fetch(r['model_urls']['glb'], f'{d}/{name}.glb')
    print('credits', before - after, 'balance', after)


def main():
    if sys.argv[1] == 'rig':
        return rig(sys.argv[2], dict(kv.split('=', 1) for kv in sys.argv[3:]))
    if sys.argv[1] == 'retex':
        return retex(sys.argv[2], sys.argv[3], dict(kv.split('=', 1) for kv in sys.argv[4:]))
    part, pic = sys.argv[1], sys.argv[2]
    opts = dict(kv.split('=', 1) for kv in sys.argv[3:])
    rnd = opts.pop('round', 'char-mio-parts')
    ledger = os.path.join(ROOT, f'reviews/{opts.pop("review", rnd + "-1")}/credits.json')
    body = {'image_url': meshy.data_uri(pic), 'ai_model': 'latest', 'should_remesh': False, 'should_texture': True,
            'enable_pbr': False, 'image_enhancement': False, 'target_formats': ['glb'], 'multi_view_thumbnails': True}
    if opts.get('pose'): body['pose_mode'] = opts['pose']
    if opts.get('tex'): body['texture_resolution'] = opts['tex']
    if opts.get('model') == 't2':            # Smart Topology: low poly at a set face count, parts kept separate
        body.update(model_type='smart-topology', ai_model='meshy-t2', target_polycount=int(opts.get('faces', 4000)))
        for k in ('should_remesh', 'image_enhancement'): body.pop(k)
    if opts.get('texture') == '0':
        body['should_texture'] = False
        for k in ('enable_pbr', 'texture_resolution'): body.pop(k, None)
    before = meshy.call('GET', '/v1/balance')['balance']
    tid = meshy.call('POST', '/v1/image-to-3d', body)['result']
    print('task', tid, flush=True)
    r = meshy.wait('image-to-3d', tid)
    after = meshy.call('GET', '/v1/balance')['balance']
    d = os.path.join(MAIN, f'art/parts/{rnd}/meshy'); os.makedirs(d, exist_ok=True)
    r['_settings'] = {k: v for k, v in body.items() if k != 'image_url'}
    r['_input'] = os.path.relpath(pic, MAIN)
    json.dump(r, open(f'{d}/{part}.json', 'w'), indent=1)
    log(ledger, {'service': 'meshy', 'part': part, 'task': tid, 'status': r.get('status'),
                 'credits': r.get('consumed_credits', before - after), 'balance_after': after, 'settings': r['_settings'],
                 'input': r['_input']})
    if r.get('status') != 'SUCCEEDED':
        sys.exit(f'{part} failed: {r.get("task_error")}')
    meshy.fetch(r['model_urls']['glb'], f'{d}/{part}.glb')
    for k, u in (r.get('thumbnail_urls') or {}).items():
        if isinstance(u, str): meshy.fetch(u, f'{d}/{part}-{k}.png')
    print('credits', before - after, 'balance', after)


if __name__ == '__main__':
    main()
