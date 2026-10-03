"""Input pictures for reviews/chibi-cast-meshy-2: the rest of the named cast (Mori, Kenji, Emi, the guard, Hamada,
Aoi, Rei) as front-view chibis for Meshy, made exactly as in round 1 (art/candidates/chibi-cast-meshy/gen.py):
FLUX.2 Klein 4B, image 1 = Jørgen's chibi office woman (art/parts/chibi-meshy/inputs/dressed.png), image 2 = the
person's approved portrait, the same BASE prompt with one block per person.

Jørgen, 2026-10-03: "I think the current chibi models are decent to be expanded and used for everyone ... So let's
just create each character by hand, as you've done currently with meshy, not the self-made one. The meshy ones are
much better. So just build on that and add them to the game."

  ~/ai/sd/venv/bin/python gen.py <job> [seeds...]
Raw PNGs go to the main checkout's art/parts/chibi-cast-meshy-2/inputs/ (git-ignored); every render is logged with
its prompt and settings in prompts.json here. Needs ComfyUI on 8188 and the GPU lock owned by chibi-cast-meshy-2.

Staging note: as round 1 (one figure, straight on, full body with a margin, standing with the arms a little out from
the body, mitten hands empty, plain white ground, soft front light; no props, lanyards, badges or earrings).
"""
import json, os, shutil, sys, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
sys.path.insert(0, os.path.join(ROOT, 'tools/characters'))
sys.path.insert(0, os.path.join(ROOT, 'art/candidates/chibi-cast-meshy'))
from chibi_local import workflow, run, INPUT  # noqa: E402

LOCK = '/tmp/claude-1000/gpu.lock/owner'
OUT = os.path.join(MAIN, 'art/parts/chibi-cast-meshy-2/inputs')
STYLE = os.path.join(MAIN, 'art/parts/chibi-meshy/inputs/dressed.png')
PORTRAIT = {w: os.path.join(MAIN, f'game3d/assets/portraits/{w}-neutral.webp')
            for w in ('mori', 'kenji', 'emi', 'guard', 'kuroda', 'aoi')}
PORTRAIT['rei'] = os.path.join(MAIN, 'art/approved/rei/rei-after.webp')
PORTRAIT_REL = {w: p.replace(MAIN + '/', '') for w, p in PORTRAIT.items()}

# round 1's prompt, word for word
BASE = ("Edit image 1: turn the woman into the person from image 2, keeping everything else about image 1 exactly: "
        "the same smooth matte vinyl 3D figure, the same big soft rounded-square head, the same large flat painted "
        "anime eyes and small simple nose and mouth, the same short body, round mitten hands with no fingers and "
        "stubby legs, the same front view standing pose with the arms slightly out, the same soft studio light and "
        "plain white background. {who} Empty hands. No text, no props.")

# From docs/game/cast.md and each portrait. Where the portrait stops at the waist, the lower body is my choice
# (said so in the review), matched to the person's code-built figure in game3d/js/cast.js.
WHO = {
    'mori': ("He is a kind 58-year-old man with neatly combed grey hair, grey eyebrows, a few soft lines at his eyes, "
             "dark brown eyes and tanned skin. He wears a dark grey suit jacket over a white shirt with a navy tie, "
             "dark grey trousers and black shoes."),
    'kenji': ("He is a 21-year-old young man with a soft round chubby build, short messy black hair sticking up on "
              "top, big dark brown eyes, rosy cheeks and tanned skin. He wears a white short-sleeved shirt with a dark "
              "navy tie, dark navy trousers and dark shoes."),
    'emi': ("She is a 32-year-old woman with a curvy figure, a reddish auburn bob to her chin with a side-swept "
            "fringe, round brown tortoiseshell glasses, brown eyes, a warm smile and light skin. She wears a charcoal "
            "blazer over a cream blouse, a charcoal skirt and black flat shoes."),
    'guard': ("He is a stern 64-year-old bald man with a thin white moustache, bushy white eyebrows, thin silver "
              "glasses and tanned skin. He wears a plain navy blue security uniform jacket with a black belt, navy "
              "trousers and black shoes."),
    'kuroda': ("He is a thin, tired 54-year-old man with black hair combed back, going grey at the temples, sleepy "
               "half-closed eyes and light tanned skin. He wears a navy suit jacket over a white shirt with a navy "
               "tie, navy trousers and dark brown shoes."),
    'aoi': ("She is a young woman with a bright pink bob, dark roots at the top and a little teal underneath, purple "
            "eyes, both eyes open, a cheerful grin and light skin. She wears an open dark green varsity jacket with "
            "pink and white striped cuffs and a pink star patch on the chest, over a white T-shirt, a dark navy "
            "skirt and dark sneakers."),
    'rei': ("She is a woman with long silver-grey hair in a high ponytail and a side-swept fringe, steel-grey eyes, a "
            "slight smile and light skin. She wears a pale grey suit jacket over a black high-neck top, pale grey "
            "trousers and dark shoes."),
}

# job: (who, prompt, parent). One change per job against its parent; the reason is in the comment.
JOBS = {f'{w}-a': (w, BASE.format(who=WHO[w]), None) for w in WHO}
# kenji-b: a's Kenji has the reference figure's slim body; his portrait is soft and pudgy -> say the body's width.
JOBS['kenji-b'] = ('kenji', JOBS['kenji-a'][1].replace('a soft round chubby build',
                   'a soft round chubby body, wider than the woman\'s in image 1, with a round belly'), 'kenji-a')
# kuroda-b: "sleepy half-closed eyes" came out shut on two of three seeds -> his eyes asked for as open but tired.
JOBS['kuroda-b'] = ('kuroda', JOBS['kuroda-a'][1].replace('sleepy half-closed eyes',
                    'tired heavy-lidded eyes that are open'), 'kuroda-a')
# rei-b: the ponytail hid behind her head on every seed (as Eric's and Mio's bun did in round 1) -> say where it shows.
JOBS['rei-b'] = ('rei', JOBS['rei-a'][1].replace('in a high ponytail',
                 'in a high ponytail that hangs down beside her head on her left side'), 'rei-a')


def on_white(path, name):
    im = Image.open(path)
    if im.mode == 'RGBA':
        bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im); im = bg
    im.convert('RGB').save(os.path.join(INPUT, name))
    return name


def main():
    job, seeds = sys.argv[1], [int(s) for s in sys.argv[2:]] or [101, 102, 103]
    who, prompt, parent = JOBS[job]
    os.makedirs(OUT, exist_ok=True)
    style = on_white(STYLE, 'ccm-style.png')
    portrait = on_white(PORTRAIT[who], f'ccm2-{who}-portrait.png')
    log_path = os.path.join(HERE, 'prompts.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    for seed in seeds:
        if 'chibi-cast-meshy-2' not in open(LOCK).read():
            sys.exit('GPU lock is not ours; stopping')
        t = time.time()
        wf = workflow([style, portrait], prompt, seed, 1024, 1024, 4, 1.0, f'ccm2-{job}')
        dst = os.path.join(OUT, f'{job}-{seed}.png')
        shutil.copy(run(wf), dst)
        log = [e for e in log if e['name'] != f'{job}-{seed}']
        log.append({'name': f'{job}-{seed}', 'who': who, 'job': job, 'parent': parent, 'seed': seed, 'prompt': prompt,
                    'model': 'flux-2-klein-4b-fp8', 'steps': 4, 'cfg': 1.0, 'size': [1024, 1024],
                    'refs': ['image 1: art/parts/chibi-meshy/inputs/dressed.png (Jørgen\'s picture)',
                             f'image 2: {PORTRAIT_REL[who]}'],
                    'seconds': round(time.time() - t, 1)})
        json.dump(log, open(log_path, 'w'), indent=1, ensure_ascii=False)
        print(dst, flush=True)


if __name__ == '__main__':
    main()
