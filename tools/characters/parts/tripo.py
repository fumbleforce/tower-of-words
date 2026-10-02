"""Tripo API steps for the parts method (#171). Uses Jørgen's Tripo credits, so every call is one deliberate step.
The key is TRIPO_API_KEY in .env (this checkout's, else the main checkout's) and is never printed.

  tripo.py balance
  tripo.py image <id> <picture.png> [key=value ...]   image_to_model; values are JSON (texture=true face_limit=8000)
  tripo.py segment <id> <task_id>                     mesh_segmentation of a finished model
  tripo.py get <task_id>
Every task's JSON and files land in the main checkout's art/parts/<id>/tripo/ (local only).
"""
import json, os, sys, time, uuid, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
API = 'https://api.tripo3d.ai/v2/openapi'


def key():
    for env in (os.path.join(ROOT, '.env'), os.path.join(MAIN, '.env')):
        if os.path.exists(env):
            for line in open(env):
                if line.startswith('TRIPO_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('no TRIPO_API_KEY in .env')


def request(method, path, body=None, ctype='application/json'):
    data = body if isinstance(body, bytes) else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request(API + path, method=method, data=data,
                               headers={'Authorization': 'Bearer ' + key(), 'Content-Type': ctype})
    try:
        d = json.loads(urllib.request.urlopen(r, timeout=180).read())
    except urllib.error.HTTPError as e:
        sys.exit(f'{e.code} {e.read().decode()[:500]}')
    if d.get('code') != 0:
        sys.exit(f'tripo error {d}')
    return d['data']


def upload(path):
    b = uuid.uuid4().hex
    body = (f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{os.path.basename(path)}"\r\n'
            f'Content-Type: image/png\r\n\r\n').encode() + open(path, 'rb').read() + f'\r\n--{b}--\r\n'.encode()
    return request('POST', '/upload', body, 'multipart/form-data; boundary=' + b)['image_token']


def wait(tid, every=10, limit=1800):
    t0 = time.time()
    while True:
        d = request('GET', f'/task/{tid}')
        print(f'{tid} {d.get("status")} {d.get("progress")}%', flush=True)
        if d.get('status') not in ('queued', 'running') or time.time() - t0 > limit:
            return d
        time.sleep(every)


def save(cid, name, d):
    out = os.path.join(MAIN, 'art/parts', cid, 'tripo'); os.makedirs(out, exist_ok=True)
    json.dump(d, open(os.path.join(out, name + '.json'), 'w'), indent=1)
    for k, u in (d.get('output') or {}).items():
        if isinstance(u, str) and u.startswith('http'):
            ext = os.path.splitext(u.split('?')[0])[1] or '.bin'
            p = os.path.join(out, f'{name}-{k}{ext}')
            urllib.request.urlretrieve(u, p); print(p, os.path.getsize(p))
    if d.get('status') != 'success':
        sys.exit(f'{name}: {d.get("status")}')


def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == 'balance':
        print(request('GET', '/user/balance')); return
    if a[0] == 'get':
        print(json.dumps(request('GET', f'/task/{a[1]}'), indent=1)[:3000]); return
    cid = a[1]
    if a[0] == 'image':
        body = {'type': 'image_to_model', 'file': {'type': 'png', 'file_token': upload(a[2])}}
        for kv in a[3:]:
            k, v = kv.split('=', 1); body[k] = json.loads(v)
        name = 'image'
    elif a[0] == 'segment':
        body = {'type': 'mesh_segmentation', 'original_model_task_id': a[2]}; name = 'segment'
    else:
        sys.exit(__doc__)
    tid = request('POST', '/task', body)['task_id']
    print('task', tid, flush=True)
    d = wait(tid)
    d['_request'] = {k: v for k, v in body.items() if k != 'file'}
    d['_inputs'] = a[2:3]
    save(cid, name, d)


if __name__ == '__main__':
    main()
