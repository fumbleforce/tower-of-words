# char-mio-gen3d (#171 track B): Meshy as a shape source. Every call is kept as Meshy returns it, labelled, in
# claude-miogen3d/raw/<name>/ (input pictures, task.json, model.glb, preview.png). Nothing here is ever patched into
# a game model (GUIDE: model in Blender); the rebuild only uses these as a guide.
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_gen3d_meshy.py <name> single <picture> [--notex] [--model latest]
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_gen3d_meshy.py <name> multi <picture> <picture> ... (1 to 4, front first)
# Pictures: paths, or "clean" for the clean reference cut-out. Each is cropped to the figure with a margin.
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'characters'))
sys.path.insert(0, HERE)
import meshy  # noqa: E402

import mio_gen3d_paths as P  # noqa: E402


def prep(src, dst):
    if src == 'clean':
        src = P.CLEAN_CUT
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im)
    if a[..., 3].min() == 255:  # an opaque picture on the light grey background: key the background out
        from scipy import ndimage
        rgb = a[..., :3].astype(np.float32)
        bg = np.median(np.concatenate([rgb[:, :60], rgb[:, -60:]], axis=1), axis=1, keepdims=True)
        m = np.abs(rgb - bg).max(axis=2) > 14
        m = ndimage.binary_fill_holes(ndimage.binary_opening(m, iterations=1))
        lab, n = ndimage.label(m)
        if n > 1:  # keep the figure (the biggest part); drops stray floor marks
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            m = lab == (1 + int(np.argmax(sizes)))
        a = a.copy()
        a[..., 3] = (m * 255).astype(np.uint8)
        im = Image.fromarray(a)
    box = im.getchannel('A').getbbox()
    pad = int(0.06 * (box[3] - box[1]))
    side = max(box[2] - box[0], box[3] - box[1]) + 2 * pad
    cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im.crop((box[0], box[1], box[2], box[3])), (side // 2 - (cx - box[0]), side // 2 - (cy - box[1])))
    sq = sq.resize((1024, 1024), Image.LANCZOS)
    sq.save(dst)
    return dst


def main():
    a = sys.argv[1:]
    name, mode = a[0], a[1]
    tex = '--notex' not in a
    model = a[a.index('--model') + 1] if '--model' in a else 'latest'
    pics = [x for x in a[2:] if not x.startswith('--') and x != model]
    out = os.path.join(P.RAW, name)
    os.makedirs(out, exist_ok=True)
    ins = [prep(p, os.path.join(out, f'input-{i}.png')) for i, p in enumerate(pics)]
    body = {'ai_model': model, 'should_remesh': False, 'should_texture': tex, 'enable_pbr': False,
            'image_enhancement': False, 'target_formats': ['glb']}
    if mode == 'single':
        body['image_url'] = meshy.data_uri(ins[0])
        kind = 'image-to-3d'
    else:
        body['image_urls'] = [meshy.data_uri(p) for p in ins]
        kind = 'multi-image-to-3d'
    before = meshy.call('GET', '/v1/balance')['balance']
    tid = meshy.call('POST', '/v1/' + kind, body)['result']
    print('task', tid, flush=True)
    r = meshy.wait(kind, tid, every=15)
    after = meshy.call('GET', '/v1/balance')['balance']
    r['_settings'] = {k: v for k, v in body.items() if k not in ('image_url', 'image_urls')}
    r['_inputs'] = [os.path.relpath(p if p != 'clean' else P.CLEAN_CUT, P.MAIN) for p in pics]
    r['_balance'] = [before, after]
    json.dump(r, open(os.path.join(out, 'task.json'), 'w'), indent=1)
    if r.get('status') != 'SUCCEEDED':
        sys.exit('meshy failed: ' + str(r.get('task_error')))
    meshy.fetch(r['model_urls']['glb'], os.path.join(out, 'model.glb'))
    if r.get('thumbnail_url'):
        meshy.fetch(r['thumbnail_url'], os.path.join(out, 'preview.png'))
    print('credits', before - after, 'balance', after)


if __name__ == '__main__':
    main()
