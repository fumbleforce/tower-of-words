"""Meshy API steps for the 3D character workflow (GUIDE, Art: "3D character workflow"). Uses Jørgen's credits,
so every call is one deliberate step. The key comes from MESHY_API_KEY in .env and is never printed.

  meshy.py shape <id> <chibi.png> [polycount]      image-to-3D, smart topology, A-pose, no texture
  meshy.py texture <id> <shape_task> <chibi.png>   texture pass on that shape (retexture, style from the picture)
  meshy.py rig <id> <task_id> <height_m>           auto-rig (height lowered for the big head)
  meshy.py anim <id> <rig_task> <action_id> <name> one library animation on that rig
  meshy.py get <kind> <task_id>                    poll a task (kind: image-to-3d, retexture, rigging, animations)
  meshy.py balance
Every task's JSON and files land in tools/characters/out/<id>/meshy/.
"""
import base64, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API = 'https://api.meshy.ai/openapi'


def key():
    for line in open(os.path.join(ROOT, '.env')):
        if line.startswith('MESHY_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('no MESHY_API_KEY in .env')


def call(method, path, body=None):
    r = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                               headers={'Authorization': 'Bearer ' + key(), 'Content-Type': 'application/json'})
    try:
        return json.loads(urllib.request.urlopen(r, timeout=120).read())
    except urllib.error.HTTPError as e:
        sys.exit(f'{e.code} {e.read().decode()[:500]}')


def data_uri(p):
    return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()


def outdir(cid):
    d = os.path.join(ROOT, 'tools/characters/out', cid, 'meshy'); os.makedirs(d, exist_ok=True); return d


def wait(kind, tid, every=10, limit=1800):
    t0 = time.time()
    while True:
        d = call('GET', f'/v1/{kind}/{tid}')
        st = d.get('status')
        print(f'{kind} {tid} {st} {d.get("progress")}%', flush=True)
        if st in ('SUCCEEDED', 'FAILED', 'CANCELED') or time.time() - t0 > limit:
            return d
        time.sleep(every)


def fetch(url, path):
    urllib.request.urlretrieve(url, path); print(path, os.path.getsize(path))


def main():
    a = sys.argv[1:]
    if a[0] == 'balance':
        print(call('GET', '/v1/balance')); return
    if a[0] == 'get':
        print(json.dumps(call('GET', f'/v1/{a[1]}/{a[2]}'), indent=1)[:3000]); return
    cid = a[1]; d = outdir(cid)
    if a[0] == 'shape':
        body = {'image_url': data_uri(a[2]), 'ai_model': 'meshy-t2', 'model_type': 'smart-topology',
                'target_polycount': int(a[3]) if len(a) > 3 else 1050, 'should_texture': False, 'pose_mode': 'a-pose',
                'target_formats': ['glb'], 'multi_view_thumbnails': True}
        tid = call('POST', '/v1/image-to-3d', body)['result']; kind, name = 'image-to-3d', 'shape'
    elif a[0] == 'texture':
        body = {'input_task_id': a[2], 'image_style_url': data_uri(a[3]), 'enable_pbr': False, 'remove_lighting': True,
                'target_formats': ['glb']}
        tid = call('POST', '/v1/retexture', body)['result']; kind, name = 'retexture', 'texture'
    elif a[0] == 'rig':
        tid = call('POST', '/v1/rigging', {'input_task_id': a[2], 'height_meters': float(a[3])})['result']; kind, name = 'rigging', 'rig'
    elif a[0] == 'anim':
        tid = call('POST', '/v1/animations', {'rig_task_id': a[2], 'action_id': int(a[3])})['result']; kind, name = 'animations', 'anim-' + a[4]
    else:
        sys.exit(__doc__)
    print('task', tid, flush=True)
    r = wait(kind, tid)
    json.dump(r, open(os.path.join(d, name + '.json'), 'w'), indent=1)
    if r.get('status') != 'SUCCEEDED':
        sys.exit(f'{name} failed: {r.get("task_error")}')
    res = r.get('result') or {}
    urls = r.get('model_urls') or {}
    if urls.get('glb'): fetch(urls['glb'], os.path.join(d, name + '.glb'))
    if r.get('thumbnail_url'): fetch(r['thumbnail_url'], os.path.join(d, name + '-preview.png'))
    for i, u in enumerate(r.get('multi_view_thumbnail_urls') or r.get('multi_view_thumbnails') or []):
        if isinstance(u, str): fetch(u, os.path.join(d, f'{name}-view{i}.png'))
    if res.get('rigged_character_glb_url'): fetch(res['rigged_character_glb_url'], os.path.join(d, 'rigged.glb'))
    for k, v in (res.get('basic_animations') or {}).items():
        if k.endswith('glb_url') and v: fetch(v, os.path.join(d, k.replace('_glb_url', '') + '.glb'))
    if res.get('animation_glb_url'): fetch(res['animation_glb_url'], os.path.join(d, name + '.glb'))


if __name__ == '__main__':
    main()
