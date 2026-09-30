"""npc-base-1: neutral base portraits with empty hands for Mr. Mori, Mr. Hamada (id kuroda) and the guard Ishibashi.

The game has used provisional portraits for Mori (seed 713) and Hamada (seed 721) since 2026-09-28, and the guard's is the
approved concept ishibashi-b-201 (art/approved/ishibashi/ishibashi-after.webp). All three hold something: Mori a tea cup,
Hamada a briefcase, the guard a pen and a clipboard. Jørgen, 2026-09-30: "base portraits should NEVER have props, props are
only for specific states and actions" (art/PROMPTS.md, Negative prompt base).

One change against each source: the hand phrase becomes "arms relaxed at his sides, empty hands" (the pose line that kept
Eric's hands empty, art/PROMPTS.md "Eric (mc) portrait"), with the no-prop words and the weighted red-rim negative added to
the source's negative. Everything else is the source's own prompt, model and settings (RDBT Anima, Euler A, 30 steps, CFG 5).

Jobs:
  new:<who>:<seeds>     Mori, Hamada: a fresh render of the whole portrait, 896x1152. The first seed is the provisional one.
  arm:<who>:<seeds>     Mori, Hamada, guard: keep the source's head and shoulders; repaint only the part below ARMS[who]'s
                        line (hands, prop, forearms, the torso front behind them) at denoise 1.0 (masked img2img,
                        DifferentialDiffusion), pasted back through the same mask with a soft edge.
  fig:<who>:<seeds>     as arm, but the mask is also cut to the source's figure grown by 50 px (isnet-anime cut-out of the
                        source), so the plain background stays the source's. Made after arm:guard drew wall panels and a
                        sunset into the background on 4 of 6 seeds.

Staging note (for checking only, not in the prompt): waist-up, facing the viewer at a slight angle, plain light grey
background, soft even studio light, eye level. Both arms hang straight down beside his body, hands relaxed and empty at hip
height or below the frame; nothing in either hand, nothing held against the chest. Head, hair and face as the source.

Usage: ~/ai/sd/venv/bin/python gen.py new:mori:713,741,742,743 arm:guard:1,2,3
Raw PNGs: art/production/PC/npc-base-1/ (git-ignored); webp copies and prompts.json here."""
import sys, os, json
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
from portrait_candidates import inpaint_wf
from production import RDBT

OWNER = 'npc-portraits'
RAW = os.path.join(ROOT, 'art/production/PC/npc-base-1')
LOG = os.path.join(HERE, 'prompts.json')
NEW_HANDS = 'arms relaxed at his sides, empty hands'
ADD_NEG = '(rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, briefcase, bag, clipboard'


def pc_log(rel):
    return next(e for e in json.load(open(os.path.join(ROOT, 'art/production/PC/log.json'))) if e['file'] == rel)


def manifest(name):
    d = json.load(open(os.path.join(ROOT, 'art/production/manifest.json')))
    return next(v for v in (d.values() if isinstance(d, dict) else d) if isinstance(v, dict) and v.get('name') == name)


SRC = {
    'mori': dict(entry=pc_log('art/production/PC/mori/mori-713.png'), png='art/production/PC/mori/mori-713.png',
                 old='holding a small cup of green tea in both hands'),
    'hamada': dict(entry=pc_log('art/production/PC/hamada/hamada-721.png'), png='art/production/PC/hamada/hamada-721.png',
                   old='clutching a worn black briefcase to his chest with both arms'),
    # the approved concept after tools/reframe.py's headroom outpaint (1008x1296); prompt is ishibashi-b-201's
    'guard': dict(entry=manifest('ishibashi-b-201'), png='art/production/RF/ishibashi.png',
                  old='holding a clipboard with a visitor log in his right hand'),
}
# the repaint line per source (its own pixel coordinates): everything below it is redrawn, above it is the source's
ARMS = {
    'mori': [(0, 800), (896, 800)],        # under the tie knot's lower half; hands and cup start at y ~850
    'hamada': [(0, 520), (896, 520)],      # just under the collar; the briefcase handle starts at y ~535
    'guard': [(0, 610), (1008, 610)],      # under the collar and tie knot; the pen starts at y ~620
}


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def recipe(who):
    s = SRC[who]
    p = s['entry']['prompt']
    assert s['old'] in p, who
    return p.replace(s['old'], NEW_HANDS), s['entry']['negative'] + ', ' + ADD_NEG


def mask(who, size, blur, fig=False):
    (x0, y), (x1, _) = ARMS[who]
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rectangle((0, y, size[0], size[1]), fill=255)
    if fig:
        a = Image.open(os.path.join(RAW, 'srccut', os.path.basename(SRC[who]['png']))).getchannel('A').point(lambda v: 255 if v > 128 else 0)
        m = ImageChops.multiply(m, a.filter(ImageFilter.MaxFilter(101)))
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


def run(job, who, seed):
    name = f'{who}-{job}-{seed}'
    out = os.path.join(RAW, name + '.png')
    p, neg = recipe(who)
    src = SRC[who]
    if not os.path.exists(out):
        check_lock()
        if job == 'new':
            e = src['entry']
            wf = comfy.anima(p, neg, model=RDBT, w=e['w'], h=e['h'], steps=30, cfg=5, seed=seed)
            comfy.run(wf, out)
        else:
            base = Image.open(os.path.join(ROOT, src['png'])).convert('RGB')
            fig = job == 'fig'
            mp = os.path.join(RAW, f'mask-{who}-{job}.png')
            mask(who, base.size, 12, fig).convert('RGB').save(mp)
            wf = inpaint_wf(os.path.join(ROOT, src['png']), mp, p, seed, 1.0, neg)
            tmp = out + '.raw.png'
            comfy.run(wf, tmp)
            new = Image.open(tmp).convert('RGB').resize(base.size)
            Image.composite(new, base, mask(who, base.size, 8, fig)).save(out)
            os.replace(tmp, os.path.join(RAW, name + '-raw.png'))
        json.dump(wf, open(os.path.join(RAW, f'workflow-{job}.json'), 'w'), indent=1)
    Image.open(out).convert('RGB').save(os.path.join(HERE, name + '.webp'), quality=90)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = dict(who=who, job=job, seed=seed, prompt=p, negative=neg, source=src['png'], swapped=[src['old'], NEW_HANDS],
                   settings='rdbtAnima, euler_ancestral normal, 30 steps, CFG 5',
                   method=('fresh render, ' + f"{src['entry']['w']}x{src['entry']['h']}") if job == 'new' else
                   f'masked img2img at denoise 1.0 (DifferentialDiffusion, mask blur 12) below y {ARMS[who][0][1]} of the source, '
                   'pasted back through the same line with an 8 px blur' + (', mask cut to the source figure grown by 50 px' if job == 'fig' else ''))
    json.dump(L, open(LOG, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, flush=True)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    for spec in sys.argv[1:]:
        job, who, seeds = spec.split(':')
        for s in seeds.split(','):
            run(job, who, int(s))
