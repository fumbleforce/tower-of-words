"""Face repaints for Rei's and Kuro's chibis (reviews/chibi-proportions-1, "Rei face" and "Kuro face").

Jørgen, 2026-10-03, on Rei: "The white haired woman also too happy naive looking instead of sly confident
saleswoman"; on Kuro: "kuro looks like a fat short baby rather than the sharp refined secretary", then "sharp as in
trim, proper, serious". Same meshes (rei-2, kuro-1); only the face on their texture changes.

The picture edited is the model's own head, rendered straight on with its texture (face_bl.py front), on white.
Two ways, one per attempt (ATTEMPTS, each one change from the one before it):
  klein  FLUX.2 Klein 4B edits the whole head picture with the prompt that made the face (rei-c-101, kuro-d-101),
         restated for a head picture: seed 101, 4 steps, cfg 1, 1024 px, as before
  rdbt   RDBT Anima repaints only the eyes, brows and mouth (face.py MASKS, latent noise mask) on the face crop scaled
         to 1024 wide: Euler A, 30 steps, cfg 5 (the house settings), seed 101, denoise as given
face.py then projects the face back onto the texture.

  ~/ai/sd/venv/bin/python gen.py <attempt> [...]
Raw PNGs go to the main checkout's art/parts/chibi-face-1/edits/ (git-ignored); prompts and settings are logged in
prompts.json here. Needs ComfyUI on 8188 and the GPU lock owned by chibi-face-1.
"""
import json, os, shutil, sys, time
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
sys.path.insert(0, os.path.join(ROOT, 'tools/characters'))
sys.path.insert(0, HERE)
from chibi_local import workflow, run, INPUT  # noqa: E402
from face import MASKS  # noqa: E402

LOCK = '/tmp/claude-1000/gpu.lock/owner'
PARTS = os.path.join(MAIN, 'art/parts/chibi-face-1')

# The face sentences of rei-c-101 and kuro-d-101, with what the head picture doesn't show (pose, hands, legs,
# shoes, image 2) left out.
REI = ("Edit image 1: change only her face, keeping everything else about image 1 exactly: the same smooth matte "
       "vinyl 3D figure, the same silver-grey hair, fringe and high ponytail hanging down on her left (image right), "
       "the same pale grey suit over a black high-neck top, the same front view, the same soft studio light and plain "
       "white background. She is {face}, looking straight at the viewer. No text, no props.")
KURO = ("Edit image 1: keeping everything else about image 1 exactly: the same smooth matte vinyl 3D figure, the same "
        "big soft rounded-square head, the same large flat painted anime eyes and small simple nose and mouth, the "
        "same front view, the same soft studio light and plain white background. She has black hair with a dark blue "
        "sheen in a high bun with two dark hair sticks, straight blunt bangs and two long side locks framing her face, "
        "black rectangular glasses with clear lenses, grey eyes, dark lipstick and pale skin. She wears a dark teal "
        "blazer over a black buttoned shirt. {face}No text, no props.")
# RDBT: the house prompt shape (quality tags, rating, style anchors, one block for her), her cast line, then the face
Q = ("masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, "
     "safe, anime screenshot, anime coloring, 2d, cel shading, clean lineart, 1girl, solo, chibi, close-up of her "
     "face, front view, looking at viewer, ")
REI_R = Q + "Rei, an adult woman, silver-grey hair, steel-grey eyes, pale skin, {face}"
KURO_R = Q + "Kuro, an adult woman, black hair, blunt bangs, glasses with clear lenses, grey eyes, dark lipstick, pale skin, {face}"
NEG = ("worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, "
       "lowres, bad anatomy, child, loli, 3d, realistic, photorealistic, chubby")
# the face crop of the 1024 px head picture (left, top, right, bottom), scaled to 1024 x 848 for RDBT
CROP = {'rei': (212, 200, 812, 697), 'kuro': (212, 400, 812, 897)}
# attempt: (who, model, template, face words, denoise, the one change from the attempt before)
ATTEMPTS = {
    'rei-f1': ('rei', 'klein', REI, 'a sly, confident saleswoman: a knowing half-smile with one corner of her mouth raised',
               None, "rei-c-101's face words, without the narrowed eyes (her eyes stay as they are)"),
    'kuro-f1': ('kuro', 'klein', KURO, 'Her expression is calm and serious. ', None,
                "kuro-d-101's prompt with one sentence added: her expression is calm and serious"),
    'rei-f2': ('rei', 'rdbt', REI_R, 'sly, confident smile', 0.6,
               'the model: RDBT repaints only her eyes, brows and mouth (FLUX redrew the whole head with soft 3D '
               'shading and grey lines, and her smile stayed)'),
    'kuro-f2': ('kuro', 'rdbt', KURO_R, 'calm, serious expression, closed mouth', 0.6,
                'the model: RDBT repaints only her eyes (inside the lenses), brows and mouth (FLUX redrew the whole '
                'head with soft 3D shading and washed-out eyes)'),
    'rei-f3': ('rei', 'rdbt', REI_R, 'sly, confident smirk', 0.6, 'one word: smirk for smile'),
    'kuro-f3': ('kuro', 'rdbt', KURO_R, 'calm, serious expression, closed mouth', 0.45,
                'denoise 0.45 for 0.6, to keep her eyes closer to how they were (f2 gave spiky lower lashes)'),
}


def front(who):
    """the head picture on white"""
    im = Image.open(os.path.join(PARTS, 'work', who + '-front.png')).convert('RGBA')
    bg = Image.new('RGB', im.size, 'white')
    bg.paste(im, (0, 0), im)
    bg.save(os.path.join(PARTS, 'work', who + '-front-white.png'))
    return bg


def klein(name, who, prompt):
    up = f'chibi-face-1-{who}-front.png'
    front(who).save(os.path.join(INPUT, up))
    out = run(workflow([up], prompt, 101, 1024, 1024, 4, 1.0, 'chibi-face-1-' + name))
    shutil.copy(out, os.path.join(PARTS, 'edits', name + '.png'))
    return {'model': 'flux-2-klein-4b-fp8', 'steps': 4, 'cfg': 1.0, 'size': [1024, 1024],
            'refs': [f'image 1: art/parts/chibi-face-1/work/{who}-front-white.png (the model head, straight on)']}


def rdbt(name, who, prompt, denoise):
    head = front(who)
    box = CROP[who]
    size = (1024, 848)
    m = Image.new('L', head.size, 0)
    dr = ImageDraw.Draw(m)
    for kind, b in MASKS[who]:
        (dr.ellipse if kind == 'ellipse' else dr.rectangle)(b, fill=255)
    img_n, mask_n = f'chibi-face-1-{name}-crop.png', f'chibi-face-1-{name}-mask.png'
    head.crop(box).resize(size, Image.LANCZOS).save(os.path.join(INPUT, img_n))
    m.crop(box).resize(size).save(os.path.join(INPUT, mask_n))
    wf = json.load(open(os.path.join(ROOT, 'tools/workflows/puppet-face-inpaint.json')))
    wf['4']['inputs']['text'] = prompt
    wf['5']['inputs']['text'] = NEG
    wf['10']['inputs']['image'] = img_n
    wf['12']['inputs']['image'] = mask_n
    wf['7']['inputs'].update(seed=101, denoise=denoise)
    wf['9']['inputs']['filename_prefix'] = 'chibi-face-1-' + name
    out = Image.open(run(wf)).convert('RGB').resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
    head.paste(out, box[:2])
    head.save(os.path.join(PARTS, 'edits', name + '.png'))
    json.dump(wf, open(os.path.join(PARTS, 'edits', name + '-workflow.json'), 'w'), indent=1)
    return {'model': 'rdbtAnima', 'sampler': 'euler_ancestral', 'steps': 30, 'cfg': 5, 'denoise': denoise,
            'negative': NEG, 'size': list(size), 'workflow': 'tools/workflows/puppet-face-inpaint.json',
            'refs': [f'art/parts/chibi-face-1/work/{who}-front-white.png, crop {list(box)}, mask face.py MASKS']}


def main():
    if 'chibi-face-1' not in open(LOCK).read():
        sys.exit('GPU lock not ours')
    os.makedirs(os.path.join(PARTS, 'edits'), exist_ok=True)
    log_path = os.path.join(HERE, 'prompts.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    for name in sys.argv[1:]:
        who, model, tpl, face, denoise, change = ATTEMPTS[name]
        prompt = tpl.format(face=face)
        t = time.time()
        info = klein(name, who, prompt) if model == 'klein' else rdbt(name, who, prompt, denoise)
        log = [e for e in log if e['name'] != name] + [
            {'name': name, 'who': who, 'change': change, 'seed': 101, 'prompt': prompt, **info,
             'seconds': round(time.time() - t, 1)}]
        json.dump(log, open(log_path, 'w'), indent=1, ensure_ascii=False)
        print(name, os.path.join(PARTS, 'edits', name + '.png'))


if __name__ == '__main__':
    main()
