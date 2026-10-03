"""Input pictures for reviews/chibi-crowd-1: eight generic islanders as front-view chibis for Meshy, made as the cast's
were (art/candidates/chibi-cast-meshy-2/gen.py): FLUX.2 Klein 4B, image 1 = Jørgen's chibi office woman
(art/parts/chibi-meshy/inputs/dressed.png), the same BASE prompt with one block per person. There is no portrait:
these are nobody in particular, so image 1 is the only reference.

Jørgen, 2026-10-03: "we also need to use the new Chibi character generation to make generic characters. All the
people milling about should have their own simple chibis that are unremarkable, but look all right."

  ~/ai/sd/venv/bin/python gen.py <job> [seeds...]
Raw PNGs go to the main checkout's art/parts/chibi-crowd-1/inputs/ (git-ignored); every render is logged with its
prompt and settings in prompts.json here. Needs ComfyUI on 8188 and the GPU lock owned by chibi-crowd-1.

Staging note: as the cast's rounds (one figure, straight on, full body with a margin, standing with the arms a little
out from the body, mitten hands empty, plain white ground, soft front light; no props, lanyards, badges, bags or
glasses). A plain pleasant face. Nobody looks like a named person (docs/game/cast.md): no green, pink, auburn or
silver hair, no navy suit with a navy tie, no grey suit on grey hair, no varsity jacket, no glasses.
"""
import json, os, shutil, sys, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
sys.path.insert(0, os.path.join(ROOT, 'tools/characters'))
from chibi_local import workflow, run, INPUT  # noqa: E402

LOCK = '/tmp/claude-1000/gpu.lock/owner'
OUT = os.path.join(MAIN, 'art/parts/chibi-crowd-1/inputs')
STYLE = os.path.join(MAIN, 'art/parts/chibi-meshy/inputs/dressed.png')

# the cast rounds' prompt, with "into the person from image 2" made "into the person described here"
BASE = ("Edit image 1: turn the woman into the person described here, keeping everything else about image 1 exactly: "
        "the same smooth matte vinyl 3D figure, the same big soft rounded-square head, the same large flat painted "
        "anime eyes and small simple nose and mouth, the same short body, round mitten hands with no fingers and "
        "stubby legs, the same front view standing pose with the arms slightly out, the same soft studio light and "
        "plain white background. {who} A calm, pleasant face. Empty hands. No text, no props.")

WHO = {
    'suit': ("He is a 45-year-old man with short black hair neatly parted at the side and light tan skin. He wears a "
             "medium blue-grey suit jacket over a white shirt with a plain dark red tie, matching blue-grey trousers "
             "and black shoes."),
    'shirt': ("He is a 25-year-old young man with short tousled dark brown hair and light skin. He wears a light blue "
              "long-sleeved shirt with the sleeves rolled up to the elbows and a plain dark green tie, no jacket, "
              "charcoal trousers and brown shoes."),
    'blouse': ("She is a 28-year-old woman with straight black hair to her shoulders and a straight fringe, and light "
               "skin. She wears a light grey blazer over a white blouse, a light grey knee-length skirt and black low "
               "heels."),
    'cardigan': ("She is a 62-year-old woman with short curly grey hair and light skin. She wears a beige knitted "
                 "cardigan over a pale blue blouse, a long dark brown skirt and brown flat shoes."),
    'polo': ("He is a 68-year-old man with short white hair, receding at the temples, and tanned skin. He wears a moss "
             "green polo shirt tucked into beige trousers with a brown belt, and brown shoes."),
    'hoodie': ("She is a 20-year-old young woman with long light brown hair worn loose and light skin. She wears a "
               "pale lavender hoodie, blue jeans and white sneakers."),
    'apron': ("She is a 45-year-old woman with dark brown hair pulled back from her face and tanned skin. She wears a "
              "white short-sleeved work shirt under a long dark green apron that reaches below her knees, black "
              "trousers and black shoes."),
    'dock': ("He is a 35-year-old man with short cropped black hair and tanned skin. He wears an orange work jacket "
             "with a grey reflective band around the chest and arms, dark grey work trousers and black boots."),
}

# job: (who, prompt, parent). One change per job against its parent; the reason is in the comment.
JOBS = {f'{w}-a': (w, BASE.format(who=WHO[w]), None) for w in WHO}
# polo-b: "tanned skin" came out a deep brown on all three seeds (and 101 winks) -> "lightly tanned skin".
JOBS['polo-b'] = ('polo', JOBS['polo-a'][1].replace('and tanned skin', 'and lightly tanned skin'), 'polo-a')


def on_white(path, name):
    im = Image.open(path)
    if im.mode == 'RGBA':
        bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im); im = bg
    im.convert('RGB').save(os.path.join(INPUT, name))
    return name


def main():
    jobs, seeds = sys.argv[1].split(','), [int(s) for s in sys.argv[2:]] or [101, 102, 103]
    os.makedirs(OUT, exist_ok=True)
    style = on_white(STYLE, 'ccr-style.png')
    log_path = os.path.join(HERE, 'prompts.json')
    for job in jobs:
        who, prompt, parent = JOBS[job]
        for seed in seeds:
            if 'chibi-crowd-1' not in open(LOCK).read():
                sys.exit('GPU lock is not ours; stopping')
            t = time.time()
            wf = workflow([style], prompt, seed, 1024, 1024, 4, 1.0, f'ccr-{job}')
            dst = os.path.join(OUT, f'{job}-{seed}.png')
            shutil.copy(run(wf), dst)
            log = json.load(open(log_path)) if os.path.exists(log_path) else []
            log = [e for e in log if e['name'] != f'{job}-{seed}']
            log.append({'name': f'{job}-{seed}', 'who': who, 'job': job, 'parent': parent, 'seed': seed,
                        'prompt': prompt, 'model': 'flux-2-klein-4b-fp8', 'steps': 4, 'cfg': 1.0, 'size': [1024, 1024],
                        'refs': ['image 1: art/parts/chibi-meshy/inputs/dressed.png (Jørgen\'s picture)'],
                        'seconds': round(time.time() - t, 1)})
            json.dump(log, open(log_path, 'w'), indent=1, ensure_ascii=False)
            print(dst, flush=True)


if __name__ == '__main__':
    main()
