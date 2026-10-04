"""Saves the round's two ComfyUI API workflows (GUIDE: save every workflow we use): the plain One Obsession render and
the One Obsession render with the line sketch (pass d), to tools/workflows/ and ~/ai/workflows/.
Usage: ~/ai/sd/venv/bin/python art/candidates/photos-1/save_workflows.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen  # noqa: E402
from gen import comfy  # noqa: E402

plain = comfy.anima(gen.prompt(gen.SCENE['cherry']), gen.NEG, model=gen.MODELS['oneobs'], w=gen.W, h=gen.H, seed=11)
lines = comfy.anima(gen.prompt(gen.SCENE['monorail']), gen.NEG, model=gen.MODELS['oneobs'], w=gen.W, h=gen.H, seed=11)
lines['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-lineart-1.safetensors'}}
lines['I'] = {'class_type': 'LoadImage', 'inputs': {'image': 'monorail-lines.png'}}
lines['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['I', 0],
                                                          'strength': 1.0, 'start_percent': 0.0, 'end_percent': 0.8}}
lines['7']['inputs']['model'] = ['A', 0]
for name, wf in (('photos-1-oneobs.json', plain), ('photos-1-oneobs-lineart.json', lines)):
    for d in (os.path.join(gen.ROOT, 'tools', 'workflows'), os.path.expanduser('~/ai/workflows')):
        os.makedirs(d, exist_ok=True)
        json.dump(wf, open(os.path.join(d, name), 'w'), indent=1, ensure_ascii=False)
        print(os.path.join(d, name))
