"""Publish every actual Meshy attempt with its known defects and exact request settings."""
from pathlib import Path
from datetime import datetime
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art/parts/crowd-pilot-5'
IDS = ['a-image', 'a-text', 'b-image', 'b-text']
PREFIX = 'art/parts/crowd-pilot-5'
ledger = {row['candidate']: row for row in json.loads((ROOT / 'reviews/crowd-pilot-5/credits.json').read_text())}
notes = {
    'a-image': 'First image-guided attempt: rejected in QA. Plain tall icon eyes and no visible mouth.',
    'b-image': 'First image-guided attempt: rejected in QA. No mouth and a conspicuous pale patch in the hair.',
    'a-text': 'Text-guided retry: clearer anime eyes and a mouth. Still below the finish bar: the mouth sits very low across the chin facet.',
    'b-text': 'Text-guided retry: mouth added. Still rejected in QA: pale hair patch and duplicated-looking eye highlights at an angle.',
}
(ART / 'sheets').mkdir(exist_ok=True)
for angle in ['front', 'left', 'right']:
    keys = ['a-image', 'a-text', 'kenji', 'kuro', 'b-image', 'b-text', 'aoi', 'emi']
    sheet = Image.new('RGB', (1600, 680), '#ededee')
    draw = ImageDraw.Draw(sheet)
    for n, key in enumerate(keys):
        pic = Image.open(ART / f'captures/{key}-{angle}.png')
        pic.thumbnail((400, 310))
        x, y = n % 4 * 400, n // 4 * 340
        sheet.paste(pic, (x + (400 - pic.width) // 2, y + 25))
        draw.text((x + 12, y + 8), key, fill='black')
    sheet.save(ART / f'sheets/faces-{angle}.webp', quality=95)

review = {
    'title': 'Crowd pilot 5: actual Meshy texture attempts',
    'date': '2026-10-06', 'updated': datetime.now().astimezone().isoformat(timespec='seconds'),
    'by': 'Codex', 'status': 'open', 'issue': 232, 'multi': True,
    'question': 'Does either Meshy direction fit the look you want, despite the remaining defects?',
    'media': [
        {'image': f'{PREFIX}/sheets/faces-front.webp',
         'caption': 'Renders of actual Meshy-textured 3D models beside the current cast. Open the live viewer above to rotate, walk, run and sit. All four attempts are shown; none has passed the final quality bar or been installed.'},
        {'image': f'{PREFIX}/sheets/faces-left.webp',
         'caption': 'Same camera distance, turned 0.6 radians. Image-guided attempts reproduce the original simple chibi faces; text-guided retries add anime eye structure and mouths. The woman’s pale hair patch remains.'},
        {'image': f'{PREFIX}/sheets/faces-right.webp',
         'caption': 'Opposite angle. Original geometry, skin weights, rigs and walk/run/sit/idle files are unchanged. These are untouched Meshy base-colour textures, with no projected or hand-painted eye repair.'},
    ],
    'options': [],
    'links': [
        {'label': 'Live 3D: Meshy retries, every attempt, cast and sustained motion', 'href': 'reviews/crowd-pilot-5/viewer.html?s=pair'},
        {'label': 'Exact Meshy requests, source hashes and charged credits', 'href': 'reviews/crowd-pilot-5/credits.json'},
        {'label': 'Your round-4 feedback', 'href': 'bible/#review/crowd-pilot-4'},
    ],
    'viewer_files': [],
}
for key in IDS:
    row = ledger[key]
    prompt = row.get('text_style_prompt', f"Image-guided; no text prompt. Source: {row.get('image')}")
    review['options'].append({'id': key, 'label': key,
        'image': f'{PREFIX}/captures/{key}-front.png',
        'images': [f'{PREFIX}/captures/{key}-{angle}.png' for angle in ['left', 'right']],
        'note': notes[key] + ' Meshy 7; original UVs; 2048×2048 base colour; no PBR; 10 credits. ' + prompt})
    for name in ['base.webp', 'walk.glb', 'run.glb', 'sit.glb', 'idle.json', 'preservation.json']:
        review['viewer_files'].append(f'{PREFIX}/game/{key}/{name}')
    review['viewer_files'].append(f'{PREFIX}/meshy/{key}.glb')
(ROOT / 'reviews/crowd-pilot-5/review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n')
print('Four actual Meshy attempts; defects explicit; no installation or approval claim')
