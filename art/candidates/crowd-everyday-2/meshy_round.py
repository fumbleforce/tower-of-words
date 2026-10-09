"""Meshy steps for Review crowd-everyday-2 (#328): the three approved everyday source pictures (Review
crowd-everyday-1, Jørgen 2026-10-07: "looks ok") made into rigged 3D people the way the approved office pair was
made (crowd-pilot-1/2 shape, UV and rig; crowd-pilot-5 texture settings, which gave the selected a-image and b-image).

  shape  <cand> <picture>   image-to-3D: meshy-t2 smart topology, 1,050 polygons, A-pose, no texture (5 credits)
  retex  <cand> <picture>   retexture of <cand>-uv.glb (face-first UVs, uv.sh): meshy-7, original UVs, 2k,
                            no PBR, styled from the picture (10 credits)
  rig    <cand> [height]    Meshy auto-rig on the retexture task, 1.1 m, with Meshy's free walk and run (5 credits)
  sit    <cand>             Meshy's Chair_Sit_Idle_F (action 32) on that rig (3 credits)

Every request is saved before polling, so a rerun resumes the same task instead of paying again. Files land in the
main checkout's art/parts/crowd-everyday-2/meshy/ (git-ignored); credits in reviews/crowd-everyday-2/credits.json.
"""
from pathlib import Path
import base64, hashlib, json, sys, time

ROOT = Path(__file__).resolve().parents[3]
MAIN = Path(str(ROOT).split('/.claude/worktrees/')[0])
sys.path.insert(0, str(ROOT / 'tools/characters'))
import meshy  # noqa: E402

OUT = MAIN / 'art/parts/crowd-everyday-2/meshy'
LEDGER = ROOT / 'reviews/crowd-everyday-2/credits.json'
SHAPE = {'ai_model': 'meshy-t2', 'model_type': 'smart-topology', 'target_polycount': 1050, 'should_texture': False,
         'pose_mode': 'a-pose', 'target_formats': ['glb'], 'multi_view_thumbnails': True}
TEX = {'ai_model': 'meshy-7', 'enable_original_uv': True, 'enable_pbr': False, 'texture_resolution': '2k',
       'target_formats': ['glb']}
KIND = {'shape': 'image-to-3d', 'retex': 'retexture', 'rig': 'rigging', 'sit': 'animations'}


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def rel(p):
    return str(Path(p).resolve().relative_to(MAIN))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')
    tmp.replace(path)


def ledger(row):
    rows = json.loads(LEDGER.read_text()) if LEDGER.exists() else []
    rows = [r for r in rows if r['task'] != row['task']] + [row]
    write(LEDGER, rows)


def submit(step, cand, body, settings, extra):
    req = OUT / f'{cand}-{step}-request.json'
    if req.exists():
        return json.loads(req.read_text())
    task = meshy.call('POST', f'/v1/{KIND[step]}', body)['result']
    rec = {'task': task, 'step': step, 'candidate': cand, 'settings': settings, 'submitted_at': time.time(), **extra}
    write(req, rec)
    print('submitted', step, cand, task, flush=True)
    return rec


def finish(step, cand, rec):
    r = meshy.wait(KIND[step], rec['task'])
    write(OUT / f'{cand}-{step}.json', r)
    ledger({**rec, 'status': r.get('status'), 'credits': r.get('consumed_credits'),
            'balance_after': meshy.call('GET', '/v1/balance')['balance']})
    if r.get('status') != 'SUCCEEDED':
        sys.exit(f'{step} {cand} {r.get("status")}: {r.get("task_error")}')
    return r


def get(url, path):
    if not path.exists():
        meshy.fetch(url, str(path))


def main():
    step, cand, *rest = sys.argv[1:]
    OUT.mkdir(parents=True, exist_ok=True)
    if step == 'shape':
        pic = Path(rest[0]).resolve()
        body = {**SHAPE, 'image_url': meshy.data_uri(str(pic))}
        rec = submit(step, cand, body, SHAPE, {'image': rel(pic), 'image_sha256': sha(pic)})
        r = finish(step, cand, rec)
        get(r['model_urls']['glb'], OUT / f'{cand}.glb')
        for k, u in (r.get('thumbnail_urls') or {}).items():
            if isinstance(u, str):
                get(u, OUT / f'{cand}-{k}.png')
    elif step == 'retex':
        pic = Path(rest[0]).resolve()
        model = OUT / f'{cand}-uv.glb'
        body = {**TEX, 'image_style_url': meshy.data_uri(str(pic)),
                'model_url': 'data:application/octet-stream;base64,' + base64.b64encode(model.read_bytes()).decode()}
        rec = submit(step, cand, body, TEX, {'model': rel(model), 'model_sha256': sha(model), 'image': rel(pic),
                                             'image_sha256': sha(pic)})
        r = finish(step, cand, rec)
        get(r['model_urls']['glb'], OUT / f'{cand}-tex.glb')
    elif step == 'rig':
        h = float(rest[0]) if rest else 1.1
        src = json.loads((OUT / f'{cand}-retex-request.json').read_text())['task']
        settings = {'input_task_id': src, 'height_meters': h}
        rec = submit(step, cand, settings, settings, {})
        r = finish(step, cand, rec)
        res = r['result']
        get(res['rigged_character_glb_url'], OUT / f'{cand}-rigged.glb')
        for k, v in (res.get('basic_animations') or {}).items():
            if k.endswith('glb_url') and v:
                get(v, OUT / (f'{cand}-' + k.replace('_glb_url', '') + '.glb'))
    elif step == 'sit':
        rig = json.loads((OUT / f'{cand}-rig-request.json').read_text())['task']
        settings = {'rig_task_id': rig, 'action_id': 32, 'name': 'Chair_Sit_Idle_F'}
        rec = submit(step, cand, {'rig_task_id': rig, 'action_id': 32}, settings, {})
        r = finish(step, cand, rec)
        get(r['result']['animation_glb_url'], OUT / f'{cand}-sit.glb')
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
