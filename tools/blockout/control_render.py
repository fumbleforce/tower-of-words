"""Composition control for RDBT Anima: render a scene from a Blender blockout (tools/blockout/*.py).

The blockout gives three control images at 1216x832: <shot>-depth.png, <shot>-lines.png, <shot>-color.png.
The Anima LLLite patches (kohya-ss/Anima-LLLite, in ComfyUI/models/model_patches, loaded by the core ModelPatchLoader +
AnimaLLLiteApply nodes) steer RDBT's layout; the prompt only describes what is in the picture and the house style.

Modes (recipe in GUIDE.md, Art):
  plain       no control, prompt only (the baseline to beat)
  depth       txt2img, depth LLLite
  lines       txt2img, lineart LLLite
  both        txt2img, depth + lineart LLLite chained
  guide       img2img from the flat colour guide (denoise ~0.8) + lineart LLLite: keeps the layout and the colour blocks
  ref         img2img from an approved master image (init=path, 1216x832) + lineart LLLite: the master's look, the blockout's layout
  refplain    img2img from an approved master image, no control (Jørgen's derived-shot method, art/PROMPTS.md)
Usage from Python: build(mode, shot_dir, shot, prompt, negative, seed, ...) -> workflow dict; comfy.run(wf, out).
"""
import os, sys, json, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy

LLLITE = {'depth': 'anima-lllite-depth-1.safetensors', 'lines': 'anima-lllite-lineart-1.safetensors',
          'any': 'anima-lllite-any-test-like-v2.safetensors'}


def build(mode, shot_dir, shot, prompt, negative, seed=None, model='rdbtAnima.safetensors', w=1216, h=832,
          strength=1.0, end=0.8, denoise=0.8, steps=30, cfg=5.0, lines_model='lines', init=None):
    wf = comfy.anima(prompt, negative, model=model, w=w, h=h, steps=steps, cfg=cfg, seed=seed if seed is not None else random.randint(0, 2**31))
    wf['9']['inputs']['filename_prefix'] = f'blockout/{shot}-{mode}'
    model_ref = ['1', 0]
    uses = {'plain': [], 'depth': ['depth'], 'lines': [lines_model], 'both': ['depth', lines_model], 'guide': [lines_model],
            'ref': [lines_model], 'refplain': []}[mode]
    for k, kind in enumerate(uses):
        img = comfy.upload(os.path.join(shot_dir, f"{shot}-{'depth' if kind == 'depth' else 'lines'}.png"))
        wf[f'P{k}'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': LLLITE[kind]}}
        wf[f'I{k}'] = {'class_type': 'LoadImage', 'inputs': {'image': img}}
        wf[f'A{k}'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': model_ref, 'model_patch': [f'P{k}', 0], 'image': [f'I{k}', 0],
                                                                   'strength': strength, 'start_percent': 0.0, 'end_percent': end}}
        model_ref = [f'A{k}', 0]
    wf['7']['inputs']['model'] = model_ref
    if mode in ('guide', 'ref', 'refplain'):
        img = comfy.upload(init if mode != 'guide' else os.path.join(shot_dir, f'{shot}-color.png'))
        wf['G'] = {'class_type': 'LoadImage', 'inputs': {'image': img}}
        wf['GE'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['G', 0], 'vae': ['3', 0]}}
        wf['7']['inputs']['latent_image'] = ['GE', 0]
        wf['7']['inputs']['denoise'] = denoise
        del wf['6']
    return wf


def save_workflow(wf, *paths):
    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(wf, open(p, 'w'), indent=1)
