"""kenji-noprop-1: take the screwdriver out of Kenji's picked portrait h4 (kenji3-h4-bedhead-761), faces untouched.

Jørgen, 2026-09-30: "About kenji, could you redo him without the skrewdriver. very annoying that time portraits try to put
stuff into the hands of people, base portraits should NEVER have props, props are only for specific states and actions.
If he is literally using that skrewdriver at that moment, then fine, but he works the inbox more than anything else, he is
not an electrician."

One change: his right arm (image left) is repainted, no longer raised with the screwdriver but hanging relaxed at his side,
hand empty. Only the area inside ARM is redrawn (RDBT masked img2img, DifferentialDiffusion, at the render's own 896x1152
size) and pasted back through ARM with a 3 px feather, so the face, hair, shirt, sleeve, tie, pocket and background are h4's
own pixels. The prompt is h4's own with its one hand phrase swapped; the negative is h4's plus prop words.

Staging note (for checking only, not in the prompt): h4's shot is fixed; waist-up, facing the viewer at a slight angle,
plain light grey background, soft even studio light. His right arm (image left) comes straight down out of the short
sleeve, upper arm against his side, elbow at about belly height, forearm down along his hip, hand relaxed and empty near the
bottom edge (the game crop ends just under the belt, so the hand is mostly out of frame). Nothing in either hand.

Jobs (one change each against the one before):
  a: plain repaint of ARM at denoise 1.0 (the model draws the arm from scratch into h4's surroundings).
  b: ARM pre-filled first (background grey where the raised arm was, plus a flat skin-coloured hanging arm with an
     outline), then repainted at DENOISE; gives the model the pose instead of leaving it to the seed.
  h=<attempt>: heal the seam on one finished attempt. Every attempt breaks the sleeve outline where ARM's edge crosses h4's
     sleeve; a band 16 px wide along ARM's inner edge (SEAM) is repainted lightly at DENOISE, same prompt.
Usage: ~/ai/sd/venv/bin/python gen.py a:1.0:1,2,3 b:0.8:1,2,3 h=a-d100-5:0.4:1,2
Raw PNGs: <main>/art/production/PC/kenji-noprop1/ (git-ignored); prompts.json log here."""
import sys, os, json, subprocess
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
# the main checkout (binaries live there, not in an agent worktree)
MAIN = os.path.dirname(subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                               text=True).strip())
sys.path.insert(0, os.path.join(MAIN, 'tools'))
import comfy
from portrait_candidates import inpaint_wf

OWNER = 'kenji-noprop-1'
BASE = os.path.join(MAIN, 'art/production/PC/kenji4/kenji3-h4-bedhead-761.png')
H4LOG = os.path.join(MAIN, 'art/candidates/portraits/kenji-concept3/prompts.json')
RAW = os.path.join(MAIN, 'art/production/PC/kenji-noprop1')
LOG = os.path.join(HERE, 'prompts.json')
OLD = 'holding a screwdriver up in his right hand'
NEW = 'his right arm hanging relaxed at his side, empty hand'
PROPS = 'holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book'
# repaint area, source coords of the 896x1152 render: the raised forearm, hand and screwdriver, the upper arm below the
# sleeve cuff and the air beside him down to the bottom edge. The sleeve, shoulder and torso front stay h4's.
ARM = [(0, 370), (190, 370), (185, 470), (172, 560), (168, 700), (200, 735), (250, 730), (255, 850), (250, 1000),
       (260, 1152), (0, 1152)]
BG = (221, 222, 216)          # h4's background, sampled at (30, 450)
# pre-fill for job b: the hanging arm as flat shapes (upper arm out of the cuff, forearm, hand)
FILL_ARM = [(172, 718), (248, 726), (246, 900), (240, 1060), (236, 1152), (150, 1152), (156, 1060), (164, 900)]
SKIN = (226, 160, 125)        # sampled on his forearm at (130, 820)


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def arm_mask(size, blur):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(ARM, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


# ARM's edge where it runs through the figure: across the sleeve and down his side
SEAM = [(186, 440), (185, 470), (172, 560), (168, 700), (200, 735), (250, 730), (255, 850), (250, 1000), (260, 1152)]


def seam_mask(size, blur):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).line(SEAM, fill=255, width=16, joint='curve')
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


def prefill(base):
    im = base.copy()
    ImageDraw.Draw(im).polygon(ARM, fill=BG)
    # the sleeve and torso edge inside ARM go back to h4's, so only the air and the old arm are replaced
    keep = Image.new('L', im.size, 0)
    ImageDraw.Draw(keep).polygon([(200, 735), (250, 730), (255, 850), (250, 1000), (260, 1152), (238, 1152), (240, 735)], fill=255)
    im = Image.composite(base, im, keep)
    d = ImageDraw.Draw(im)
    d.polygon(FILL_ARM, fill=SKIN, outline=(30, 25, 25), width=4)
    return im


def run(job, seed, denoise):
    heal = job.split('=')[1] if job.startswith('h=') else None
    name = f'{job.replace("=", "-")}-d{int(round(denoise * 100))}-{seed}'
    out = os.path.join(RAW, f'kenji-{name}.png')
    h4 = json.load(open(H4LOG))['kenji3-h4-bedhead-761']
    assert OLD in h4['prompt']
    p = h4['prompt'].replace(OLD, NEW)
    neg = h4['negative'] + ', ' + PROPS
    if not os.path.exists(out):
        check_lock()
        base = Image.open(BASE).convert('RGB')
        src = prefill(base) if job == 'b' else Image.open(os.path.join(RAW, f'kenji-{heal}.png')).convert('RGB') if heal else base
        sp, mp = os.path.join(RAW, f'src-{job[0]}.png'), os.path.join(RAW, f'mask-{job[0]}.png')
        src.save(sp)
        (seam_mask(base.size, 3) if heal else arm_mask(base.size, 12)).convert('RGB').save(mp)
        wf = inpaint_wf(sp, mp, p, seed, denoise, neg)
        tmp = out + '.raw.png'
        comfy.run(wf, tmp)
        new = Image.open(tmp).convert('RGB')
        if heal:   # keep the band inside ARM + 10 px, where post.py joins the cut-outs
            Image.composite(new, src, Image.composite(seam_mask(base.size, 2), Image.new('L', base.size, 0),
                                                      arm_mask(base.size, 0).filter(ImageFilter.MaxFilter(21)))).save(out)
        else:
            Image.composite(new, base, arm_mask(base.size, 3)).save(out)
        os.replace(tmp, os.path.join(RAW, f'kenji-{name}-raw.png'))
        json.dump(wf, open(os.path.join(RAW, 'workflow-anima-arm-inpaint.json'), 'w'), indent=1)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = dict(job=job, prompt=p, negative=neg, seed=seed, denoise=denoise, source='kenji3-h4-bedhead-761',
                   prefill=job == 'b', healed_from=heal, settings='euler_ancestral normal, 30 steps, CFG 5, 896x1152',
                   method='RDBT Anima masked img2img (DifferentialDiffusion, mask blur 12) over ARM on h4, pasted back through '
                          'ARM with a 3 px feather' + (' ; ARM pre-filled with background grey and a flat hanging arm' if job == 'b' else '')
                          + (f' ; then the 16 px SEAM band along ARM\'s edge repainted on {heal}' if heal else ''))
    json.dump(L, open(LOG, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, flush=True)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    for spec in sys.argv[1:]:
        job, dn, seeds = spec.split(':')
        for s in seeds.split(','):
            run(job, int(s), float(dn))
