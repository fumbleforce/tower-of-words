"""kuro-body-1: in-game shots to webp in bible/shots/kuro-body-1/, then reviews/kuro-body-1/review.json.
Run: ~/ai/rmbg/rembg/bin/python make_review.py"""
import os, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '../../../..'))
SH = os.path.join(WT, 'game3d/shots/kuro-body-1')
B = 'bible/shots/kuro-body-1/'
OUT = os.path.join(WT, B)
LOG = {e['id']: e for e in json.load(open(os.path.join(HERE, 'prompts.json')))}
QA = {os.path.basename(r.get('image', r.get('path', ''))).replace('.webp', ''): r
      for r in json.load(open(os.path.join(HERE, 'imgqa/imgqa.json'))).get('images', [])}
IDS = [f'{j}-s{s}' for j in 'abc' for s in (11, 12, 13)]
SIZES = ['1366x860', '390x844']


def shot(tag):
    got = []
    for sz in SIZES:
        p = os.path.join(SH, f'{sz}-{tag}.png')
        if os.path.exists(p):
            Image.open(p).convert('RGB').save(os.path.join(OUT, f'game-{sz}-{tag}.webp'), 'WEBP', quality=88)
            got.append(B + f'game-{sz}-{tag}.webp')
    return got


def rim(i):
    r = QA.get(i, {})
    for k in ('red_rim', 'redrim', 'rim'):
        if k in r:
            v = r[k]
            return v.get('value', v) if isinstance(v, dict) else v
    return None


NOTES = {
    'a': 'Seam: the model drew a new picture in the strip instead of continuing her (a-s11 a knee in tights, a-s12 a second collar and jacket, a-s13 a jacket hem with a hard line across). Not usable; shown because every attempt is.',
    'b': 'Continues the blazer down to the waist with two more buttons and a pocket flap; arms at her sides, hands out of frame. The lower edge of her left side (image right) has pale pink folds, like the red line already on her chest in the anchor.',
    'c': 'Almost the same as b with the same seed: with the inpainting patch the starting fill makes little difference.',
}


def main():
    installed = shot('installed')
    opts = []
    for i in IDS:
        e = LOG[i]
        r = rim(i)
        note = (f"Job {e['job']}: {e['change']}. Seed {e['seed']}, RDBT, Euler A 30 steps, CFG 5, denoise {e['denoise']}"
                f"{', LLLite inpainting-v2 1.0' if e.get('lllite') else ''}, DifferentialDiffusion, 416 px added under the 1096x1408 render, "
                f"{e['seam_px']} px seam. Her face and upper body are the installed file unchanged (max pixel change 0 above the seam). "
                f"Red rim {f'{r * 100:.1f}%' if r is not None else 'see sheet'} (the anchor itself measures 6.0%). {NOTES[e['job']]} "
                f"Prompt: {e['prompt']} Negative: {e['negative']}")
        opts.append(dict(id=f'kuro-body-{i}', label=f'kuro-body-{i}', image=B + f'lineup-{i}.webp',
                         images=[B + f'{i}.webp'] + shot(i), note=note))
    review = {
        'title': "Kuro's portrait down to the waist",
        'date': '2026-10-01',
        'by': 'claude-agent:kuro-body',
        'status': 'open',
        'question': 'Which of these should replace Kuro in the game, or none?',
        'multi': False,
        'issue': 134,
        'media': [
            dict(image='bible/shots/showcase/cast-faces-1/lineup.webp',
                 caption='Your note on showcase cast-faces-1: "Kuro is off, her body is missing". Her portrait ended at the chest; the others go to the waist.'),
            dict(image=B + 'lineup-all.webp',
                 caption='The cast as the game places them, then Kuro as installed, then every attempt in order (a, b, c; seeds 11 to 13).'),
            dict(image=B + 'renders-imgqa.webp',
                 caption='Every render before the cut-out, beside the installed portrait, with the image check numbers.'),
        ] + [dict(image=p, caption=f"In the game now ({'desktop 1366x860' if '1366' in p else 'phone 390x844'}): her picture ends above the bottom of the screen and fades out. The line is played on the train for this check, since the fast test never walks to her desk; the option cards have the same shot with each attempt.") for p in installed],
        'options': opts,
        'links': [],
    }
    os.makedirs(os.path.join(WT, 'reviews/kuro-body-1'), exist_ok=True)
    json.dump(review, open(os.path.join(WT, 'reviews/kuro-body-1/review.json'), 'w'), indent=1, ensure_ascii=False)
    print('options', len(opts), 'installed shots', len(installed))


if __name__ == '__main__':
    main()
