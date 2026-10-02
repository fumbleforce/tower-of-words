"""Input pictures for reviews/chibi-cast-meshy-1: Kuro, Eric and Mio as front-view chibis in the style of Jørgen's
chibi office woman (art/parts/chibi-meshy/inputs/dressed.png, his 2026-10-02 picture), for Meshy image-to-3D.

FLUX.2 Klein 4B with two reference images through tools/characters/chibi_local.py's workflow: image 1 = his picture
(the figure to edit: proportions, head, mitten hands, vinyl look, light), image 2 = the person's approved game
portrait. Needs ComfyUI on 8188 and the GPU lock owned by chibi-cast-meshy.

  ~/ai/sd/venv/bin/python gen.py <job> [seeds...]
Raw PNGs go to the main checkout's art/parts/chibi-cast-meshy/inputs/ (git-ignored); every render is logged with its
prompt and settings in prompts.json here.

Staging note (for checking, not in the prompt):
- Beat: a turnaround-ready front view of one cast member as a vinyl chibi figure, for Meshy.
- Camera: straight on at chest height of the figure, full body in frame with a margin, like his picture.
- In front of the lens: one figure standing straight, feet a little apart, arms hanging slightly out from the body,
  round mitten hands empty. Plain white ground with a faint soft shadow under the feet. Nothing else.
- Behind the camera: nothing that matters; no props, no desk, no lanyard or headphones (accessories stay off).
- Eyelines: looking straight at the camera.
- Light: soft even studio light from the front, a little from above her right (image left), as in his picture.
- Physical sense: two arms, two legs, mitten hands with no fingers, glasses resting on the face round the big eyes,
  the head a rounded square about as wide as the shoulders are long.
"""
import json, os, shutil, sys, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
sys.path.insert(0, os.path.join(ROOT, 'tools/characters'))
from chibi_local import workflow, run, INPUT  # noqa: E402

LOCK = '/tmp/claude-1000/gpu.lock/owner'
OUT = os.path.join(MAIN, 'art/parts/chibi-cast-meshy/inputs')
STYLE = os.path.join(MAIN, 'art/parts/chibi-meshy/inputs/dressed.png')
PORTRAIT = {w: os.path.join(MAIN, f'game3d/assets/portraits/{w}-neutral.webp') for w in ('kuro', 'eric', 'mio')}

BASE = ("Edit image 1: turn the woman into the person from image 2, keeping everything else about image 1 exactly: "
        "the same smooth matte vinyl 3D figure, the same big soft rounded-square head, the same large flat painted "
        "anime eyes and small simple nose and mouth, the same short body, round mitten hands with no fingers and "
        "stubby legs, the same front view standing pose with the arms slightly out, the same soft studio light and "
        "plain white background. {who} Empty hands. No text, no props.")

WHO = {
    'kuro': ("She has blue-black hair in a high bun with two dark hair sticks, straight blunt bangs and two long side "
             "locks framing her face, black rectangular glasses with clear lenses, grey eyes, dark lipstick and pale "
             "skin. She wears a dark teal blazer over a black buttoned shirt, a black pencil skirt and black flat shoes."),
    'eric': ("He is a man with dark-blond hair, the same colour all over, swept back and tied in a short ponytail at "
             "the back, light stubble on his jaw, blue eyes and thin silver rectangular glasses. He wears a grey hoodie "
             "under an open navy blazer, dark grey trousers and dark shoes."),
    'mio': ("She has dark green-black hair with bright green on the underside and in a few streaks, a side-swept "
            "fringe and a messy bun at the back of her head, taupe-grey glasses with rounded rectangle lenses, light "
            "tan eyes and pale skin. She wears a loose very dark green hoodie, dark cargo trousers and dark sneakers."),
}

# job: (who, prompt). One change per job against its parent; the parent is named in the log.
JOBS = {f'{w}-a': (w, BASE.format(who=WHO[w]), None) for w in WHO}
# b: a renders came out with a smaller head, small eyes and longer legs than his picture -> say the proportions.
PROP_B = BASE.replace("the same short body,", "the same proportions with the head as tall as the whole body below "
                      "it and very large anime eyes, the same short body,")
JOBS.update({f'{w}-b': (w, PROP_B.format(who=WHO[w]), f'{w}-a') for w in WHO})
# c: the words in b changed nothing (same seeds, same figures) -> a's prompt, but the sampling starts from his
# picture (image 1) at denoise 0.9 instead of an empty latent, so its head size and layout carry over. 8 steps so
# the split leaves 7 to sample.
INIT = {f'{w}-c': 0.9 for w in WHO}
JOBS.update({f'{w}-c': (w, BASE.format(who=WHO[w]), f'{w}-a') for w in WHO})
# d: c pulled his picture's brown bob onto Eric and Mio -> back to a (empty latent), one colour word per person:
# Eric's "dark-blond" came out brown, Kuro's "blue-black" came out navy, Mio's "very dark green" hoodie mid green.
SWAP_D = {'eric': ('dark-blond hair', 'dark golden blond hair'), 'kuro': ('blue-black hair', 'black hair with a dark blue sheen'),
          'mio': ('very dark green hoodie', 'near-black dark teal hoodie')}
JOBS.update({f'{w}-d': (w, BASE.format(who=WHO[w].replace(*SWAP_D[w])), f'{w}-a') for w in WHO})
# e (Eric only): d's eyes are small and narrow next to his picture's, Kuro's and Mio's -> say the eye size in his block.
JOBS['eric-e'] = ('eric', BASE.format(who=WHO['eric'].replace(*SWAP_D['eric']).replace(
    'blue eyes', 'large blue anime eyes as big as the woman\'s in image 1')), 'eric-d')
# f, after Meshy round 1 (mio-1, eric-1):
# - Mio: Meshy turned the messy bun's loose curls into thin spiky strands -> "messy bun" becomes "smooth round bun".
# - Eric: Meshy built the glasses as a real frame and also painted a faint second frame on the skin -> the glasses
#   asked for as painted on, the other test the brief asks for.
JOBS['mio-f'] = ('mio', JOBS['mio-d'][1].replace('a messy bun', 'a smooth round bun'), 'mio-d')
# g (Mio): f's smooth bun hid behind her head on every seed -> say where it shows.
JOBS['mio-g'] = ('mio', JOBS['mio-f'][1].replace('a smooth round bun at the back of her head',
                 'a smooth round bun high at the back of her head on her left side, showing beside her head'), 'mio-f')
JOBS['eric-f'] =('eric', JOBS['eric-e'][1].replace(
    'thin silver rectangular glasses', 'thin silver rectangular glasses painted flat on the face like the eyes, with no 3D frame'), 'eric-e')


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
    portrait = on_white(PORTRAIT[who], f'ccm-{who}-portrait.png')
    log_path = os.path.join(HERE, 'prompts.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    for seed in seeds:
        if 'chibi-cast-meshy' not in open(LOCK).read():
            sys.exit('GPU lock is not ours; stopping')
        t = time.time()
        init = INIT.get(job)
        steps = 8 if init else 4
        wf = workflow([style, portrait], prompt, seed, 1024, 1024, steps, 1.0, f'ccm-{job}')
        if init:  # start from image 1 instead of an empty latent
            wf['90'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['11', 0], 'vae': ['3', 0]}}
            wf['98'] = {'class_type': 'SplitSigmasDenoise', 'inputs': {'sigmas': ['91', 0], 'denoise': init}}
            wf['95']['inputs']['sigmas'] = ['98', 1]
        dst = os.path.join(OUT, f'{job}-{seed}.png')
        shutil.copy(run(wf), dst)
        log.append({'name': f'{job}-{seed}', 'who': who, 'job': job, 'parent': parent, 'seed': seed, 'prompt': prompt,
                    'model': 'flux-2-klein-4b-fp8', 'steps': steps, 'init_from_image1_denoise': init, 'cfg': 1.0, 'size': [1024, 1024],
                    'refs': ['image 1: art/parts/chibi-meshy/inputs/dressed.png (Jørgen\'s picture)',
                             f'image 2: game3d/assets/portraits/{who}-neutral.webp'],
                    'seconds': round(time.time() - t, 1)})
        json.dump(log, open(log_path, 'w'), indent=1, ensure_ascii=False)
        print(dst, flush=True)


if __name__ == '__main__':
    main()
