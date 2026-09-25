"""Like-for-like face comparison for proto2/cast-fixed (Jørgen: Tsubasa's profile was being compared with three-quarter faces).
1. Tsubasa turned toward the viewer: her head and neck repainted from new-tsubasa-208 (no face-style words; hair, jacket, hands and stopwatch kept).
2. Emi, Mio and Sumi in profile, looking down to the side like Tsubasa: head region repainted, the rest kept.
Masked RDBT inpaint at full size (same graph as tools/puppet_frames.py), then pasted back through a feathered mask so only the head changes.
Prompts: the style line plus a few plain sentences (art/PROMPTS.md reference).
Output: art/production/LFL/<name>.png. Run: ~/ai/sd/venv/bin/python tools/likeforlike.py <job>:<seed>[:<denoise>] ...
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy
from production import ROOT
from puppet_frames import inpaint
from locations1 import wait_turn
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(ROOT, 'art/production/LFL')
STYLE = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart'
PROFILE = 'Her head is turned to the side so we see her face in profile, and she looks down. Her expression is calm.'
FACING = 'Her head is turned toward the viewer at a three-quarter angle and she looks at the viewer. Her expression is calm.'

# job -> (source, head ellipse in 896x1152 coords, who, pose sentence, default denoise)
JOBS = {
    'tsubasa-facing': ('art/production/D2/new-tsubasa-208.png', (270, -40, 760, 450),
                       'A 27-year-old woman runner in a royal-blue track jacket. Her short light-brown hair is tied back in a small stubby ponytail with two hairpins. '
                       'She has lightly tanned skin and small stud earrings.', FACING, 0.85),
    'emi-profile': ('art/slice/emi2/r3/rdbt/work-41.png', (140, -40, 660, 520),
                    'A woman in a dark blazer. She has an auburn bob and glasses with thin brown tortoiseshell frames.', PROFILE, 0.85),
    'mio-profile': ('art/production/B/mio-bored.png', (240, 40, 740, 520),
                    'A young woman in a dark green hoodie with headphones around her neck. She has messy black hair with green underneath, tied in a loose bun, '
                    'and thin glasses with dark brown frames.', PROFILE, 0.85),
    'sumi-profile': ('art/production/D2/new-sumi-201.png', (230, -30, 620, 420),
                     'A young woman in a red knitted vest over a cream shirt. She has dark-brown hair in two short low pigtails with straight-cut bangs.', PROFILE, 0.85),
}


def mask(size, box, blur):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).ellipse(box, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))


def run(job, seed, denoise=None):
    src, box, who, pose, d0 = JOBS[job]
    denoise = denoise or d0
    name = f'{job}-{seed}' + ('' if denoise == d0 else f'-d{int(denoise * 100)}')
    out = os.path.join(OUT, f'{name}.png')
    if os.path.exists(out):
        return out
    os.makedirs(OUT, exist_ok=True)
    base = Image.open(os.path.join(ROOT, src)).convert('RGB')
    mpng = os.path.join(OUT, f'mask-{job}.png')
    mask(base.size, box, 16).convert('RGB').save(mpng)
    prompt = f'{STYLE}. {who} {pose} Plain light grey background.'
    wf = inpaint(os.path.join(ROOT, src), mpng, prompt, seed, denoise)
    for d in (os.path.join(ROOT, 'tools/workflows'), os.path.expanduser('~/ai/workflows')):
        json.dump(wf, open(os.path.join(d, 'likeforlike-head-inpaint.json'), 'w'), indent=1)
    raw = os.path.join(OUT, f'{name}-raw.png')
    wait_turn()
    comfy.run(wf, raw)
    Image.composite(Image.open(raw).convert('RGB'), base, mask(base.size, box, 8)).save(out)
    log = os.path.join(OUT, 'log.json')
    L = json.load(open(log)) if os.path.exists(log) else {}
    L[name] = {'source': src, 'seed': seed, 'denoise': denoise, 'prompt': prompt, 'head_mask': box}
    json.dump(L, open(log, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, flush=True)
    return out


if __name__ == '__main__':
    for a in sys.argv[1:]:
        p = a.split(':')
        run(p[0], int(p[1]), float(p[2]) if len(p) > 2 else None)
