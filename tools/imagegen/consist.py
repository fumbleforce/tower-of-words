"""Keep-on-model helpers for the dashboard, ported from legacy/proto2/consistency/run.py (verdict: notes/consistent-characters.md).

- ipa(): the Anima IP-Adapter (Character_Reference, SigLIP2) on the model, with the character's portrait as the reference.
- repaint(): the LLLite head repaint beside the portrait: a two-panel canvas (portrait head | render head), the right panel
  masked and repainted with anima-lllite-inpainting-v2, then pasted back with a soft oval.
- cutout(): the portrait cut out onto white (rembg ISNet anime), which avoids the portraits' mint background.
Face boxes come from imgutils (CPU) in ~/ai/consist/.venv via faces.py."""
import hashlib, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy  # noqa: E402
import store  # noqa: E402

CONSIST_PY = os.path.expanduser('~/ai/consist/.venv/bin/python')
CACHE = os.path.join(store.ROOT, 'cache')
IPA_FILE = 'ip_adapter-Character_Reference-10.safetensors'
LLLITE_INPAINT = 'anima-lllite-inpainting-v2.safetensors'
PANEL = 768


def _key(path, tag):
    st = os.stat(path)
    return hashlib.sha1(f'{path}|{st.st_mtime}|{tag}'.encode()).hexdigest()[:16]


def resolve(rel):
    """A portrait path as stored in presets (repo-relative, or island/private/imagegen/...) to an absolute file."""
    p = os.path.realpath(os.path.join(store.REPO, store.repo_rel(rel)))
    if rel.startswith('island/private/imagegen/'):
        p = os.path.realpath(os.path.join(store.ROOT, rel[len('island/private/imagegen/'):]))
    if not os.path.isfile(p):
        raise FileNotFoundError(f'reference image not found: {rel}')
    return p


def as_png(path):
    """ComfyUI's LoadImage is happiest with RGB PNG; cache a converted copy."""
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, f'png-{_key(path, "png")}.png')
    if not os.path.exists(out):
        Image.open(path).convert('RGB').save(out)
    return out


def cutout(path):
    """The portrait cut out onto white (cached)."""
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, f'cut-{_key(path, "cut")}.png')
    if os.path.exists(out):
        return out
    src = as_png(path)
    tmp = os.path.join(CACHE, 'rmbg')
    os.makedirs(tmp, exist_ok=True)
    subprocess.run(['python3', os.path.join(store.REPO, 'tools', 'rmbg_local.py'), '--method', 'isnet-anime',
                    src, '--out', tmp], check=True, capture_output=True, timeout=300)
    rgba = Image.open(os.path.join(tmp, os.path.basename(src))).convert('RGBA')
    white = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
    white.alpha_composite(rgba)
    white.convert('RGB').save(out)
    return out


def ipa(wf, ref_path, strength, cut=False):
    """Put the Anima IP-Adapter between the model loader and the sampler (m_animaipa in run.py)."""
    ref = cutout(ref_path) if cut else as_png(ref_path)
    wf['IPL'] = {'class_type': 'AnimaIPAdapterLoader', 'inputs': {'ip_adapter_name': IPA_FILE, 'auto_download': False}}
    wf['RI'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(ref)}}
    wf['IPA'] = {'class_type': 'AnimaIPAdapterApply', 'inputs': {
        'model': wf['7']['inputs']['model'], 'ip_adapter': ['IPL', 0], 'ref_image': ['RI', 0], 'strength': float(strength),
        'ref_image_size': 512, 'siglip_layer': -1, 'ip_cfg_scale': 4.0, 'ip_cfg_separate': False, 'gray_null': False, 'use_lora': True}}
    wf['7']['inputs']['model'] = ['IPA', 0]
    return wf


def faces(paths):
    out = subprocess.run([CONSIST_PY, os.path.join(HERE, 'faces.py'), *paths], capture_output=True, text=True, timeout=300)
    if out.returncode:
        raise RuntimeError('face detector failed: ' + out.stderr[-300:])
    return json.loads(out.stdout.strip().splitlines()[-1])


def head_box(face, W, H):
    x0, y0, x1, y1 = face
    side = int(2.6 * max(x1 - x0, y1 - y0))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 - 0.12 * side
    side = min(side, W, H)
    bx = int(min(max(cx - side / 2, 0), W - side))
    by = int(min(max(cy - side / 2, 0), H - side))
    return bx, by, bx + side, by + side


_REF_FACE = {}


def repaint_prepare(render_png, ref_path, tag):
    """Returns (workflow inputs dict) for the head repaint, or raises when no face is found."""
    img = Image.open(render_png).convert('RGB')
    ref_png = as_png(ref_path)
    need = [render_png] + ([] if ref_png in _REF_FACE else [ref_png])
    found = faces(need)
    for p in need[1:]:
        if not found.get(p):
            raise RuntimeError('no face found in the reference portrait')
        _REF_FACE[p] = found[p][0]
    fs = found.get(render_png) or []
    if not fs:
        raise RuntimeError('no face found in the render')
    face = sorted(fs, key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))[0]  # the biggest face
    ref = Image.open(ref_png).convert('RGB')
    rb = head_box(_REF_FACE[ref_png], ref.width, ref.height)
    hb = head_box(face, img.width, img.height)
    dip = Image.new('RGB', (PANEL * 2, PANEL))
    dip.paste(ref.crop(rb).resize((PANEL, PANEL), Image.LANCZOS), (0, 0))
    dip.paste(img.crop(hb).resize((PANEL, PANEL), Image.LANCZOS), (PANEL, 0))
    mask = Image.new('L', (PANEL * 2, PANEL), 0)
    ImageDraw.Draw(mask).rectangle((PANEL, 0, PANEL * 2, PANEL), fill=255)
    os.makedirs(CACHE, exist_ok=True)
    dp, mp = os.path.join(CACHE, f'dip-{tag}.png'), os.path.join(CACHE, f'dipmask-{tag}.png')
    dip.save(dp)
    mask.save(mp)
    return dict(dip=dp, mask=mp, box=hb)


def repaint_workflow(prep, prompt, negative, model, seed, denoise, steps=30, cfg=5.0, sampler='euler_ancestral', scheduler='normal'):
    wf = comfy.anima(prompt, negative, model=model, w=PANEL * 2, h=PANEL, seed=seed, steps=steps, cfg=cfg, sampler=sampler, scheduler=scheduler)
    wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(prep['dip'])}}
    wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
    wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(prep['mask']), 'channel': 'red'}}
    wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
    wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': LLLITE_INPAINT}}
    wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                           'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
    wf['7']['inputs'].update(model=['A', 0], latent_image=['13', 0], denoise=float(denoise))
    del wf['6']
    return wf


def repaint_paste(render_png, work_png, box, out_png):
    img = Image.open(render_png).convert('RGB')
    side = box[2] - box[0]
    head = Image.open(work_png).convert('RGB').crop((PANEL, 0, PANEL * 2, PANEL)).resize((side, side), Image.LANCZOS)
    soft = Image.new('L', (side, side), 0)
    m = int(side * 0.06)
    ImageDraw.Draw(soft).ellipse((m, m, side - m, side - m), fill=255)
    soft = soft.filter(ImageFilter.GaussianBlur(side * 0.04))
    img.paste(head, box[:2], soft)
    img.save(out_png)
