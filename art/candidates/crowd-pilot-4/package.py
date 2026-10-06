"""Build the review from saved actual-model captures and exact generation metadata."""
from pathlib import Path
import json
from datetime import datetime
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art/parts/crowd-pilot-4'
IDS = ['a-calm', 'a-open', 'b-calm', 'b-open']

sheets = ART / 'sheets'
sheets.mkdir(exist_ok=True)
for angle in ['front', 'left', 'right']:
    keys = ['a-calm', 'a-open', 'kenji', 'kuro', 'b-calm', 'b-open', 'aoi', 'emi']
    sheet = Image.new('RGB', (1600, 680), '#ededee')
    draw = ImageDraw.Draw(sheet)
    for n, key in enumerate(keys):
        pic = Image.open(ART / 'captures' / f'{key}-{angle}.png')
        pic.thumbnail((400, 310))
        x, y = n % 4 * 400, n // 4 * 340
        sheet.paste(pic, (x + (400 - pic.width) // 2, y + 25))
        draw.text((x + 12, y + 8), key, fill='black')
    sheet.save(sheets / f'faces-{angle}.webp', quality=95)

prefix = 'art/parts/crowd-pilot-4'
review = {
    'title': 'Crowd pilot round 4: two anime eye treatments',
    'date': '2026-10-06', 'updated': datetime.now().astimezone().isoformat(timespec='seconds'),
    'by': 'Codex', 'status': 'open', 'issue': 232, 'multi': True,
    'question': 'Which eye treatment, if any, fits the cast: calm or open?',
    'media': [
        {'image': f'{prefix}/sheets/faces-front.webp', 'caption': 'Actual textured 3D models, beside Kenji, Kuro, Aoi and Emi. Your round-3 feedback: “the meshes are okay but the eyes are super creepy, too large for normal size, not large enough for anime eyes, creepy middle ground.” Round 4 uses broad shaped lids, flat dark irises and one highlight. These are eye-only candidates; the game crowd has not changed.'},
        {'image': f'{prefix}/sheets/faces-left.webp', 'caption': 'Same models turned 0.6 radians, at the same close-up distance. R3 mouths and repaired hair seams are preserved. The calm/open distinction is deliberately modest; A still has decorative outer lash wings.'},
        {'image': f'{prefix}/sheets/faces-right.webp', 'caption': 'Opposite angle. Meshes, skin weights and all walk/run/sit/idle files are byte-identical to round 3. Every texel outside the projected eye mask is unchanged. The live viewer below lets you turn, compare, walk, run and sit.'}
    ],
    'options': [],
    'links': [
        {'label': 'Live 3D: all four, cast comparisons and sustained walking', 'href': 'reviews/crowd-pilot-4/viewer.html?s=alternatives'},
        {'label': 'Round 3 and your original feedback', 'href': 'bible/#review/crowd-pilot-3'},
    ],
    'viewer_files': []
}
for key in IDS:
    cfg = json.loads((ART / 'takes' / key / 'settings.json').read_text())
    person = 'office man' if key.startswith('a') else 'office woman'
    style = 'calmer, lower lid opening' if key.endswith('calm') else 'more open, expressive lid opening'
    review['options'].append({
        'id': key, 'label': f'{key}: {person}',
        'image': f'{prefix}/captures/{key}-front.png',
        'images': [f'{prefix}/captures/{key}-left.png', f'{prefix}/captures/{key}-right.png'],
        'note': f'{style.capitalize()}. Flat dark iris, one highlight. Same R3 body, mouth, hair and animations. Candidate only; choosing an option does not install it automatically.'
    })
    review['media'].append({
        'image': f'{prefix}/takes/{key}/generated.png',
        'caption': f"Saved eye-paint attempt {key}, before UV projection (not a separate model). Local rdbtAnima.safetensors; anima-lllite-inpainting-v2; strength 1; DifferentialDiffusion; seed {cfg['seed']}; 1280×704; 30 steps; CFG 5; Euler ancestral/normal; denoise 0.30. Prompt: {cfg['prompt']} Negative: {cfg['negative']}"
    })
    for name in ['base.webp', 'walk.glb', 'run.glb', 'sit.glb', 'idle.json']:
        review['viewer_files'].append(f'{prefix}/game/{key}/{name}')
    for name in ['workflow.json', 'settings.json', 'base.webp']:
        review['viewer_files'].append(f'{prefix}/takes/{key}/{name}')
    review['links'].append({'label': f'{key}: exact settings, source hashes and preservation results', 'href': f'{prefix}/takes/{key}/settings.json'})
(ROOT / 'reviews/crowd-pilot-4/review.json').write_text(json.dumps(review, indent=2) + '\n')
print('Review4: four options, all four saved attempts and actual front/angle renders')
