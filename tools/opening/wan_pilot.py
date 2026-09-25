"""Version B of the opening's exterior shot: Wan 2.2 I2V 14B (fp8 + lightx2v 4-step LoRA, the GUIDE "Video" recipe) from the approved
master art/approved/monorail-bay-ref3.png. Three seeds, 81 frames at 16 fps (5 s), 960x528.
Output: art/opening/wan/bay3-wan-<seed>.mp4 (silent) and the workflow in tools/workflows/opening-wan14-lx.json.
Run: ~/ai/sd/venv/bin/python tools/opening/wan_pilot.py"""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import comfy, video2
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'art', 'opening', 'wan')
os.makedirs(OUT, exist_ok=True)
PROMPT = (video2.STYLE + 'the monorail train moves along the elevated beam toward the city, sunlight glitters on the calm sea, '
          'clouds drift slowly, static camera.')
W, H = 960, 528
src = Image.open(os.path.join(ROOT, 'art', 'approved', 'monorail-bay-ref3.png')).convert('RGB')
s = W / src.width
im = src.resize((W, round(src.height * s)), Image.LANCZOS)
top = (im.height - H) // 2
inp = os.path.join(OUT, 'bay3-960x528.png')
im.crop((0, top, W, top + H)).save(inp)
name = comfy.upload(inp)
for seed in (7, 21, 42):
    out = os.path.join(OUT, f'bay3-wan-{seed}.mp4')
    if os.path.exists(out):
        continue
    wf = video2.wan14_i2v(name, PROMPT, W, H, loras_high=[(video2.LX_H, 1.0)], loras_low=[(video2.LX_L, 1.0)], seed=seed, prefix=f'video/op-bay3-{seed}')
    for d in (os.path.join(ROOT, 'tools', 'workflows'), os.path.expanduser('~/ai/workflows')):
        json.dump(wf, open(os.path.join(d, 'opening-wan14-lx.json'), 'w'), indent=1)
    secs, peak = video2.run_clip(wf, out, 16)
    print('ok', out, secs, 's', peak, 'MB', flush=True)
