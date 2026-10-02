"""One Meshy image-to-3D generation for a part (#171 parts method). Same settings as char-mio-gen3d-1 meshy-single
(latest model, no remesh, textured in the same task, image enhancement off, no PBR), so only the input changes;
`pose=a-pose` and `tex=4k` (same price as 2k) are the extra knobs, and `model=t2 faces=<n>` switches to Meshy's
Smart Topology model (low poly at a set face count, 15 credits). Uses Jørgen's Meshy credits: one call, one part.

  meshy_part.py <part> <picture.png> [pose=a-pose] [tex=4k] [model=t2 faces=3000]
Writes <part>.json and .glb to the main checkout's art/parts/char-mio-parts/meshy/ (local only) and appends the credits to
reviews/char-mio-parts-1/credits.json.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import meshy

ROOT = meshy.ROOT
MAIN = ROOT.split('/.claude/worktrees/')[0]
LEDGER = os.path.join(ROOT, 'reviews/char-mio-parts-1/credits.json')


def key():
    for env in (os.path.join(ROOT, '.env'), os.path.join(MAIN, '.env')):
        if os.path.exists(env):
            for line in open(env):
                if line.startswith('MESHY_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('no MESHY_API_KEY')


meshy.key = key


def main():
    part, pic = sys.argv[1], sys.argv[2]
    opts = dict(kv.split('=', 1) for kv in sys.argv[3:])
    body = {'image_url': meshy.data_uri(pic), 'ai_model': 'latest', 'should_remesh': False, 'should_texture': True,
            'enable_pbr': False, 'image_enhancement': False, 'target_formats': ['glb'], 'multi_view_thumbnails': True}
    if opts.get('pose'): body['pose_mode'] = opts['pose']
    if opts.get('tex'): body['texture_resolution'] = opts['tex']
    if opts.get('model') == 't2':            # Smart Topology: low poly at a set face count, parts kept separate
        body.update(model_type='smart-topology', ai_model='meshy-t2', target_polycount=int(opts.get('faces', 4000)))
        for k in ('should_remesh', 'image_enhancement'): body.pop(k)
    before = meshy.call('GET', '/v1/balance')['balance']
    tid = meshy.call('POST', '/v1/image-to-3d', body)['result']
    print('task', tid, flush=True)
    r = meshy.wait('image-to-3d', tid)
    after = meshy.call('GET', '/v1/balance')['balance']
    d = os.path.join(MAIN, 'art/parts/char-mio-parts/meshy'); os.makedirs(d, exist_ok=True)
    r['_settings'] = {k: v for k, v in body.items() if k != 'image_url'}
    r['_input'] = os.path.relpath(pic, MAIN)
    json.dump(r, open(f'{d}/{part}.json', 'w'), indent=1)
    led = json.load(open(LEDGER)) if os.path.exists(LEDGER) else []
    led.append({'service': 'meshy', 'part': part, 'task': tid, 'status': r.get('status'), 'credits': before - after,
                'balance_after': after, 'settings': r['_settings'], 'input': r['_input']})
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    json.dump(led, open(LEDGER, 'w'), indent=1)
    if r.get('status') != 'SUCCEEDED':
        sys.exit(f'{part} failed: {r.get("task_error")}')
    meshy.fetch(r['model_urls']['glb'], f'{d}/{part}.glb')
    for k, u in (r.get('thumbnail_urls') or {}).items():
        if isinstance(u, str): meshy.fetch(u, f'{d}/{part}-{k}.png')
    print('credits', before - after, 'balance', after)


if __name__ == '__main__':
    main()
