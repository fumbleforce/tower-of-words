# char-mio-gen3d: TRELLIS (microsoft/TRELLIS-image-large, MIT) on the RTX 3080, as a shape source. Mesh output only
# (no Gaussians, so no CUDA extensions to build); the raw marching-cubes mesh with its vertex colours is kept as the
# tool returned it in claude-miogen3d/raw/<name>/model.ply, with the inputs and settings in task.json.
#   ~/ai/trellis/venv/bin/python tools/style-concepts/mio_gen3d_trellis.py <name> <picture> [<picture> ...]
#     [--seed 1] [--mode stochastic|multidiffusion]
# One picture: run(); several: run_multi_image() (front first). Pictures as in mio_gen3d_meshy.py ("clean" = the
# clean cut-out); opaque ones are keyed off their light grey background. Takes the GPU lock as claude-agent:mio-gen3d,
# frees ComfyUI's VRAM first, releases the lock at the end.
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
os.environ.setdefault('ATTN_BACKEND', 'xformers')
os.environ.setdefault('SPCONV_ALGO', 'native')
os.environ.setdefault('PYTORCH_CUDA_ALLOC_CONF', 'expandable_segments:True')
sys.path.insert(0, os.path.expanduser('~/ai/trellis/repo'))

import mio_gen3d_paths as P  # noqa: E402
from mio_gen3d_meshy import prep  # noqa: E402
import mio_i2i_gen as G  # noqa: E402

G.ME = 'claude-agent:mio-gen3d'
WEIGHTS = os.path.expanduser('~/ai/trellis/weights/TRELLIS-image-large')


def free_comfy():
    import urllib.request
    try:
        urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8188/free', data=json.dumps(
            {'unload_models': True, 'free_memory': True}).encode(), headers={'Content-Type': 'application/json'}),
            timeout=10)
        time.sleep(3)
    except Exception as e:
        print('comfy free:', e)


def main():
    a = sys.argv[1:]
    seed = int(a[a.index('--seed') + 1]) if '--seed' in a else 1
    mode = a[a.index('--mode') + 1] if '--mode' in a else 'stochastic'
    skip = {seed and str(seed), mode}
    name = a[0]
    pics = [x for x in a[1:] if not x.startswith('--') and x not in skip]
    out = os.path.join(P.RAW, name)
    os.makedirs(out, exist_ok=True)
    ins = [prep(p, os.path.join(out, f'input-{i}.png')) for i, p in enumerate(pics)]
    G.lock()
    try:
        free_comfy()
        import numpy as np
        import torch
        import trimesh
        from PIL import Image
        import types
        o3d = types.ModuleType('open3d')  # only the text pipeline uses it (type hints)
        o3d.geometry = types.SimpleNamespace(TriangleMesh=object)
        sys.modules.setdefault('open3d', o3d)
        # FlexiCubes only uses kaolin's check_tensor for an input sanity check: a stand-in that always passes
        kt = types.ModuleType('kaolin.utils.testing')
        kt.check_tensor = lambda *a, **k: True
        for n, mod in (('kaolin', types.ModuleType('kaolin')), ('kaolin.utils', types.ModuleType('kaolin.utils')),
                       ('kaolin.utils.testing', kt)):
            sys.modules.setdefault(n, mod)
        from trellis.pipelines import TrellisImageTo3DPipeline
        t0 = time.time()
        pipe = TrellisImageTo3DPipeline.from_pretrained(WEIGHTS)
        pipe.cuda()
        imgs = [Image.open(p) for p in ins]
        params = dict(seed=seed, formats=['mesh'], sparse_structure_sampler_params={'steps': 25, 'cfg_strength': 7.5},
                      slat_sampler_params={'steps': 25, 'cfg_strength': 3.0})
        if len(imgs) == 1:
            r = pipe.run(imgs[0], **params)
        else:
            r = pipe.run_multi_image(imgs, mode=mode, **params)
        m = r['mesh'][0]
        v = m.vertices.detach().float().cpu().numpy()
        f = m.faces.detach().cpu().numpy()
        col = None
        if m.vertex_attrs is not None:
            c = m.vertex_attrs[:, :3].detach().float().cpu().numpy()
            col = (np.clip(c, 0, 1) * 255).astype(np.uint8)
        trimesh.Trimesh(v, f, vertex_colors=col, process=False).export(os.path.join(out, 'model.ply'))
        peak = torch.cuda.max_memory_allocated() / 2 ** 30
        json.dump(dict(tool='TRELLIS-image-large (MIT)', inputs=[os.path.relpath(P.CLEAN_CUT if p == 'clean' else p, P.MAIN)
                                                                   for p in pics],
                       settings={k: v for k, v in params.items()}, mode=mode if len(imgs) > 1 else 'single',
                       seconds=round(time.time() - t0), peak_vram_gb=round(peak, 2), vertices=len(v), faces=len(f)),
                  open(os.path.join(out, 'task.json'), 'w'), indent=1)
        print('wrote', out, len(v), len(f), 'peak GB', round(peak, 2), flush=True)
    finally:
        G.unlock()


if __name__ == '__main__':
    main()
