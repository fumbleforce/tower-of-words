"""Eric (bible id mc) dialogue portrait, round eric-portrait-anime-5.
Jørgen picked eric-p3h2-909, eric-p6h2-3909 and eric-p3m75-5909 from round 4 ("nice but remove coffee" on the last), and:
"very close but need to fix poses, no awkward pose, no holding props, just 3 new options to pick from."
Everything stays as in round 4 h2 (face, hair words, glasses, stubble, outfit, style, model, settings, negative); only the pose
words change (round 4 had "holding a paper coffee cup in one hand" or "rubbing the back of his neck with one hand"):
  r1: standing relaxed with his arms at his sides, slight three-quarter turn, looking at the viewer
  r2: standing relaxed with one hand in his trouser pocket, slight three-quarter turn, looking at the viewer
  r3, r4: r1 and r2 without "standing" and "trouser", which drew him from the thighs up with a smaller head than the picks
Seeds: the picks' seeds (909, 3909, 5909) plus new ones, until three clean ones turn up.

Staging: dialogue portrait, waist-up, camera at eye level a couple of metres in front, plain light grey backdrop, soft even
front light; body turned slightly, face to the viewer; hands empty and relaxed, nothing held.

Usage: ~/ai/sd/venv/bin/python tools/eric_anime5.py [ids]   (needs the GPU lock with owner eric-anime5 and ComfyUI on :8188)
       ~/ai/sd/venv/bin/python tools/eric_anime5.py sheet
Raw PNGs: art/production/PC/eric-anime5/ (gitignored); webp copies for review: game3d/assets/portrait-candidates/eric-anime5/"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont
from production import OUT, ROOT, RDBT
from redrim import red_rim
from eric_anime3 import A09, prompt
from eric_anime4 import HAIR, NEG2

OWNER = 'eric-anime5'
RAW = os.path.join(OUT, 'PC', 'eric-anime5')
WEB = os.path.join(ROOT, 'game3d', 'assets', 'portrait-candidates', 'eric-anime5')
LOG = os.path.join(WEB, 'log.json')
POSES = {
    'r1': 'standing relaxed with his arms at his sides, slight three-quarter turn, looking at the viewer',
    'r2': 'standing relaxed with one hand in his trouser pocket, slight three-quarter turn, looking at the viewer',
    # r1/r2 drew him from the thighs up (head smaller than in the picks); "standing" and "trouser" pull the camera back
    'r3': 'arms relaxed at his sides, slight three-quarter turn, looking at the viewer',
    'r4': 'one hand in his pocket, slight three-quarter turn, looking at the viewer',
}
SEEDS = (909, 3909, 5909, 6909, 7909, 8909)


def jobs():
    return [(pid, seed, prompt(HAIR, *A09[1:], f'{pose}, faint smile'), NEG2, f'round 4 h2 with the pose words "{pose}"')
            for pid, pose in POSES.items() for seed in SEEDS]


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def main(only=None):
    import comfy
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(WEB, exist_ok=True)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for sid, seed, p, neg, what in jobs():
        if only and sid not in only and f'{sid}-{seed}' not in only:
            continue
        raw = os.path.join(RAW, f'eric-{sid}-{seed}.png')
        web = os.path.join(WEB, f'eric-{sid}-{seed}.webp')
        if not os.path.exists(raw):
            check_lock()
            comfy.run(comfy.anima(p, neg, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), raw)
        Image.open(raw).convert('RGB').save(web, quality=92)
        log[f'{sid}-{seed}'] = dict(file=os.path.relpath(web, ROOT), what=what, model='rdbtAnima', seed=seed, prompt=p, negative=neg,
                                    settings='896x1152, euler_ancestral normal, 30 steps, CFG 5',
                                    red_rim_pct=round(red_rim(raw) * 100, 2))
        json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', sid, seed, log[f'{sid}-{seed}']['red_rim_pct'], flush=True)


def sheet():
    """Every attempt, one row per pose; labels give id and red-rim %."""
    log = json.load(open(LOG))
    rows = [[(k, os.path.join(ROOT, v['file']), v['red_rim_pct']) for k, v in log.items() if k.startswith(pid + '-')] for pid in POSES]
    tw, th = 448, 576
    cols = max(len(r) for r in rows)
    S = Image.new('RGB', (tw * cols, (th + 40) * len(rows)), (245, 245, 245))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    for r, row in enumerate(rows):
        for c, (name, path, pct) in enumerate(row):
            x, y = c * tw, r * (th + 40)
            S.paste(Image.open(path).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y))
            d.text((x + 8, y + th + 8), f'{name}  red {pct:.2f}%', fill=(20, 20, 20), font=font)
    S.save(os.path.join(ROOT, 'game3d', 'assets', 'portrait-candidates', 'eric-anime5-sheet.png'))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a == ['sheet']:
        sheet()
    else:
        main(a or None)
