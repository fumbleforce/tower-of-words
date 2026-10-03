"""New input picture for Rei's chibi (reviews/chibi-proportions-1).

Jørgen, 2026-10-03: "The white haired woman also too happy naive looking instead of sly confident saleswoman".
FLUX.2 Klein 4B edit of round 2's input (art/parts/chibi-cast-meshy-2/inputs/rei-b-101-flip.png, our own picture, the
one that made rei-1) with her approved portrait as image 2, one change per job:
  rei-c  her face only: a sly, confident look (knowing half-smile, slightly narrowed eyes)
  rei-d  from rei-c's prompt, one change: an adult build (slimmer waist, longer legs, a smaller head), standing tall

  ~/ai/sd/venv/bin/python gen.py <job> [seeds...]
Raw PNGs go to the main checkout's art/parts/chibi-proportions-1/inputs/ (git-ignored); every render is logged with
its prompt and settings in prompts.json here. Needs ComfyUI on 8188 and the GPU lock owned by chibi-proportions-1.

Staging note: one figure, straight on, full body with a margin, the same pose as image 1 (standing, arms a little out,
mitten hands empty), plain white ground, soft front light. Only what the job names changes. Her left (image right)
keeps the ponytail, as in image 1.
"""
import json, os, shutil, sys, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
sys.path.insert(0, os.path.join(ROOT, 'tools/characters'))
from chibi_local import workflow, run, INPUT  # noqa: E402

LOCK = '/tmp/claude-1000/gpu.lock/owner'
OUT = os.path.join(MAIN, 'art/parts/chibi-proportions-1/inputs')
SRC = os.path.join(MAIN, 'art/parts/chibi-cast-meshy-2/inputs/rei-b-101-flip.png')
PORTRAIT = os.path.join(MAIN, 'art/approved/rei/rei-after.webp')

KEEP = ("keeping everything else about image 1 exactly: the same smooth matte vinyl 3D figure, the same silver-grey "
        "hair, fringe and high ponytail hanging down on her left (image right), the same pale grey suit over a black "
        "high-neck top, the same front view standing pose with the arms slightly out and empty mitten hands, the same "
        "soft studio light and plain white background.")
FACE = ("She is a sly, confident saleswoman: a knowing half-smile with one corner of her mouth raised, slightly "
        "narrowed eyes under relaxed lids looking straight at the viewer, her chin a little up.")
JOBS = {
    # rei-c: her face only (his words: "too happy naive looking instead of sly confident saleswoman")
    'rei-c': (f"Edit image 1: change only her face, {KEEP} {FACE} Her face is the woman's from image 2, made simple "
              "like image 1. No text, no props.", None),
}
# rei-d: one change from rei-c, her build: a refined adult figure in place of the toddler body
JOBS['rei-d'] = (JOBS['rei-c'][0].replace('Edit image 1: change only her face,',
                 'Edit image 1: change only her face and her body proportions,').replace(
                 ' Her face is', ' Her body is a slim adult figure about three and a half heads tall: a smaller head, '
                 'a narrow waist, long straight legs and standing tall. Her face is'), 'rei-c')


def on_white(path, name):
    im = Image.open(path)
    if im.mode == 'RGBA':
        bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im); im = bg
    im.convert('RGB').save(os.path.join(INPUT, name))
    return name


def main():
    job, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]] or [101, 102, 103]
    prompt, parent = JOBS[job]
    os.makedirs(OUT, exist_ok=True)
    src = on_white(SRC, 'cp1-rei-src.png')
    portrait = on_white(PORTRAIT, 'cp1-rei-portrait.png')
    log_path = os.path.join(HERE, 'prompts.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    for seed in seeds:
        if 'chibi-proportions-1' not in open(LOCK).read():
            sys.exit('GPU lock is not ours; stopping')
        t = time.time()
        wf = workflow([src, portrait], prompt, seed, 1024, 1024, 4, 1.0, f'cp1-{job}')
        dst = os.path.join(OUT, f'{job}-{seed}.png')
        shutil.copy(run(wf), dst)
        log = [e for e in log if e['name'] != f'{job}-{seed}']
        log.append({'name': f'{job}-{seed}', 'job': job, 'parent': parent, 'seed': seed, 'prompt': prompt,
                    'model': 'flux-2-klein-4b-fp8', 'steps': 4, 'cfg': 1.0, 'size': [1024, 1024],
                    'refs': ['image 1: art/parts/chibi-cast-meshy-2/inputs/rei-b-101-flip.png (round 2 input)',
                             'image 2: art/approved/rei/rei-after.webp'],
                    'seconds': round(time.time() - t, 1)})
        json.dump(log, open(log_path, 'w'), indent=1, ensure_ascii=False)
        print(dst, flush=True)


if __name__ == '__main__':
    main()
