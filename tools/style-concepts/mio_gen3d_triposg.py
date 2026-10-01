# char-mio-gen3d: TripoSG (VAST-AI/TripoSG, MIT) on the RTX 3080, as a shape source (shape only, no colour). The
# picture goes in with its own alpha, so the background remover is never loaded; the dense marching-cubes decoder is
# used (no diso build). The raw mesh is kept as returned in claude-miogen3d/raw/<name>/model.ply with task.json.
#   ~/ai/triposg/venv/bin/python tools/style-concepts/mio_gen3d_triposg.py <name> <picture> [--seed 42] [--steps 50] [--cfg 7]
# Takes the GPU lock as claude-agent:mio-gen3d, frees ComfyUI's VRAM first, releases the lock at the end.
import json
import os
import sys
import time
import types

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
REPO = os.path.expanduser('~/ai/triposg/repo')
sys.path.insert(0, REPO)
sys.path.insert(0, os.path.join(REPO, 'scripts'))
sys.modules.setdefault('diso', types.SimpleNamespace(DiffDMC=None))  # only the flash decoder uses it

import mio_gen3d_paths as P  # noqa: E402
from mio_gen3d_meshy import prep  # noqa: E402
import mio_gen3d_trellis as TR  # noqa: E402
import mio_i2i_gen as G  # noqa: E402

G.ME = 'claude-agent:mio-gen3d'
WEIGHTS = os.path.expanduser('~/ai/triposg/weights/TripoSG')


def opt(a, k, d, f):
    return f(a[a.index(k) + 1]) if k in a else d


def main():
    a = sys.argv[1:]
    seed, steps, cfg = opt(a, '--seed', 42, int), opt(a, '--steps', 50, int), opt(a, '--cfg', 7.0, float)
    name, pic = a[0], a[1]
    out = os.path.join(P.RAW, name)
    os.makedirs(out, exist_ok=True)
    inp = prep(pic, os.path.join(out, 'input-0.png'))
    G.lock()
    try:
        TR.free_comfy()
        import numpy as np
        import torch
        import trimesh
        from image_process import prepare_image
        from triposg.pipelines.pipeline_triposg import TripoSGPipeline
        t0 = time.time()
        pipe = TripoSGPipeline.from_pretrained(WEIGHTS).to('cuda', torch.float16)
        img = prepare_image(inp, bg_color=np.array([1.0, 1.0, 1.0]), rmbg_net=None)
        o = pipe(image=img, generator=torch.Generator(device='cuda').manual_seed(seed), num_inference_steps=steps,
                 guidance_scale=cfg, use_flash_decoder=False).samples[0]
        m = trimesh.Trimesh(o[0].astype(np.float32), np.ascontiguousarray(o[1]), process=False)
        m.export(os.path.join(out, 'model.ply'))
        peak = torch.cuda.max_memory_allocated() / 2 ** 30
        json.dump(dict(tool='TripoSG (MIT)', inputs=[os.path.relpath(P.CLEAN_CUT if pic == 'clean' else pic, P.MAIN)],
                       seed=seed, steps=steps, guidance=cfg, decoder='dense (hierarchical marching cubes)',
                       seconds=round(time.time() - t0), peak_vram_gb=round(peak, 2), vertices=len(m.vertices),
                       faces=len(m.faces)), open(os.path.join(out, 'task.json'), 'w'), indent=1)
        print('wrote', out, len(m.faces), 'peak GB', round(peak, 2), flush=True)
    finally:
        G.unlock()


if __name__ == '__main__':
    main()
