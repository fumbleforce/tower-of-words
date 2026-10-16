"""meshy-shape, meshy-texture, meshy-rig, meshy-anim: Meshy's API steps, with the settings of the approved rounds
(art/candidates/crowd-everyday-2/meshy_round.py; tools/characters/meshy.py is the client). Every request is saved in
meshy/<name>-request.json before polling, so a rerun resumes the same task instead of paying again, and a step whose
file is already in meshy/ (a cached round, build.py's `import`) costs nothing. Spending needs build.py --spend.

  meshy-shape    image-to-3D from the source picture: meshy-t2 smart topology, 1,050 polygons, A-pose, no texture
                 (5 credits). Settings: polycount. Writes meshy/shape.glb and its four preview pictures.
  meshy-texture  Meshy's retexture of build/uv.glb (the face-uv step), styled from the source picture: meshy-7, the
                 original UVs, 2k, no PBR (10 credits a roll). Then the texture-marks check (marks.py); a texture with
                 marks is re-rolled, at most `retries` (3) times, and if the last still has marks the step keeps it and
                 flags it for the Review. Nothing is ever painted. Settings: retries, marks ({lo, hi, half_w, dark,
                 limit}, or false for no check). Writes meshy/texture.glb, re-rolls texture-1.glb ...
  meshy-rig      Meshy's auto-rig on the kept texture task, 1.1 m (lowered for the big head; 5 credits), with Meshy's
                 free walk and run. Settings: height. Writes meshy/rigged.glb, walking.glb, running.glb.
  meshy-anim     one clip from Meshy's library on that rig (3 credits). Settings: name (the file and the game clip,
                 default sit), action (32, Chair_Sit_Idle_F). Writes meshy/anim-<name>.glb.
"""
import base64, json, os, sys, time
from common import MAIN, ROOT, rel, sha, copy_in
import meshy
import marks

SHAPE = {'ai_model': 'meshy-t2', 'model_type': 'smart-topology', 'target_polycount': 1050, 'should_texture': False,
         'pose_mode': 'a-pose', 'target_formats': ['glb'], 'multi_view_thumbnails': True}
TEX = {'ai_model': 'meshy-7', 'enable_original_uv': True, 'enable_pbr': False, 'texture_resolution': '2k',
       'target_formats': ['glb']}


def _key():
    for env in (os.path.join(ROOT, '.env'), os.path.join(MAIN, '.env')):
        if os.path.exists(env):
            for line in open(env):
                if line.startswith('MESHY_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('no MESHY_API_KEY in .env')


meshy.key = _key


def _write(path, value):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(value, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(tmp, path)


def _submit(ctx, name, kind, body, settings, extra, credits):
    req = ctx.path('meshy', f'{name}-request.json')
    if os.path.exists(req):
        return json.load(open(req))
    if not ctx.spend:
        sys.exit(f'{ctx.id}: meshy/{name} is not made yet and costs {credits} Meshy credits; rerun with --spend')
    task = meshy.call('POST', f'/v1/{kind}', body)['result']
    rec = {'task': task, 'step': name, 'settings': settings, 'submitted_at': time.time(), **extra}
    _write(req, rec)
    ctx.recipe.setdefault('meshy', {})[name] = task
    ctx.save_recipe()
    print('submitted', name, task, flush=True)
    return rec


def _finish(ctx, name, kind, rec):
    r = meshy.wait(kind, rec['task'])
    _write(ctx.path('meshy', f'{name}.json'), r)
    if ctx.recipe.get('review'):
        ledger = os.path.join(ROOT, 'reviews', ctx.recipe['review'], 'credits.json')
        rows = json.load(open(ledger)) if os.path.exists(ledger) else []
        rows = [x for x in rows if x.get('task') != rec['task']] + [
            {**rec, 'status': r.get('status'), 'credits': r.get('consumed_credits'),
             'balance_after': meshy.call('GET', '/v1/balance')['balance']}]
        os.makedirs(os.path.dirname(ledger), exist_ok=True)
        _write(ledger, rows)
    if r.get('status') != 'SUCCEEDED':
        sys.exit(f'{name} {r.get("status")}: {r.get("task_error")}')
    return r


def _get(url, path):
    if not os.path.exists(path):
        meshy.fetch(url, path)


def _task(ctx, name):
    req = ctx.path('meshy', f'{name}-request.json')
    return json.load(open(req))['task'] if os.path.exists(req) else ctx.recipe.get('meshy', {}).get(name)


def source(ctx):
    """The source picture, copied into src/ once (the round's own copy)."""
    s = os.path.join(MAIN, ctx.recipe['source'])
    dst = ctx.path('src', os.path.basename(s))
    copy_in(s, dst)
    return dst


def shape(ctx, o):
    out = ctx.path('meshy', 'shape.glb')
    if not os.path.exists(out):
        pic = source(ctx)
        settings = {**SHAPE, 'target_polycount': o.get('polycount', SHAPE['target_polycount'])}
        rec = _submit(ctx, 'shape', 'image-to-3d', {**settings, 'image_url': meshy.data_uri(pic)}, settings,
                      {'image': rel(pic), 'image_sha256': sha(pic)}, 5)
        r = _finish(ctx, 'shape', 'image-to-3d', rec)
        _get(r['model_urls']['glb'], out)
        for k, u in (r.get('thumbnail_urls') or {}).items():
            if isinstance(u, str):
                _get(u, ctx.path('meshy', f'shape-{k}.png'))
    else:
        print('shape: on disk', rel(out))
    ctx.files['shape'] = out


def _roll(ctx, name, o):
    out = ctx.path('meshy', f'{name}.glb')
    uv = ctx.files['uv']
    req = ctx.path('meshy', f'{name}-request.json')
    if os.path.exists(req):
        made_on = json.load(open(req)).get('model_sha256')
        if made_on and made_on != sha(uv):
            print(f'WARNING {name}: Meshy painted a different UV file (sha {made_on[:12]}) than build/uv.glb now '
                  f'({sha(uv)[:12]}); the face-uv settings or Blender changed', flush=True)
    if os.path.exists(out):
        print(f'{name}: on disk', rel(out))
        return out
    pic = source(ctx)
    settings = {**TEX, **{k: o[k] for k in ('ai_model', 'texture_resolution') if k in o}}
    body = {**settings, 'image_style_url': meshy.data_uri(pic),
            'model_url': 'data:application/octet-stream;base64,' + base64.b64encode(open(uv, 'rb').read()).decode()}
    rec = _submit(ctx, name, 'retexture', body, settings,
                  {'model': rel(uv), 'model_sha256': sha(uv), 'image': rel(pic), 'image_sha256': sha(pic)}, 10)
    r = _finish(ctx, name, 'retexture', rec)
    _get(r['model_urls']['glb'], out)
    return out


def texture(ctx, o):
    retries = o.get('retries', 3)
    check = o.get('marks', {})
    rolls = ctx.recipe.setdefault('meshy', {}).setdefault('texture_rolls', [])
    for k in range(retries + 1):
        name = 'texture' if k == 0 else f'texture-{k}'
        glb = _roll(ctx, name, o)
        found = None if check is False else marks.count(glb, **check)
        row = {'name': name, 'task': _task(ctx, name), 'marks': found}
        rolls[:] = [x for x in rolls if x['name'] != name] + [row]
        ctx.save_recipe()
        print(name, 'marks', found, flush=True)
        if found is None or found['ok']:
            break
        if k == retries:
            ctx.flag(f'Meshy\'s texture still has marks under the jaw after {retries} re-rolls ({found["texels"]} dark '
                     f'texels; tasks {", ".join(x["task"] or "?" for x in rolls)}). Kept as Meshy painted it, not painted '
                     'over: say whether to try again or accept it.')
    ctx.files['texture'] = glb
    ctx.files['texture_task'] = _task(ctx, name)


def rig(ctx, o):
    out = ctx.path('meshy', 'rigged.glb')
    if not os.path.exists(out):
        settings = {'input_task_id': ctx.files['texture_task'], 'height_meters': o.get('height', 1.1)}
        rec = _submit(ctx, 'rig', 'rigging', settings, settings, {}, 5)
        res = _finish(ctx, 'rig', 'rigging', rec)['result']
        _get(res['rigged_character_glb_url'], out)
        for k, v in (res.get('basic_animations') or {}).items():
            if k.endswith('glb_url') and v:
                _get(v, ctx.path('meshy', k.replace('_glb_url', '') + '.glb'))
    else:
        print('rig: on disk', rel(out))
    ctx.files['rigged'] = ctx.files['skin_from'] = out
    ctx.files['clips'].update(walk=ctx.path('meshy', 'walking.glb'), run=ctx.path('meshy', 'running.glb'))


def anim(ctx, o):
    clip = o.get('name', 'sit')
    name = f'anim-{clip}'
    out = ctx.path('meshy', f'{name}.glb')
    if not os.path.exists(out):
        settings = {'rig_task_id': _task(ctx, 'rig'), 'action_id': o.get('action', 32)}
        rec = _submit(ctx, name, 'animations', settings, settings, {}, 3)
        r = _finish(ctx, name, 'animations', rec)
        _get(r['result']['animation_glb_url'], out)
    else:
        print(f'{name}: on disk', rel(out))
    ctx.files['clips'][clip] = out
