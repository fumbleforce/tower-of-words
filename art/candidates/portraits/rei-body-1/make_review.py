"""rei-body-1: write reviews/rei-body-1/review.json from prompts.json, imgqa and the lineups. Run: python3 make_review.py"""
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
S = 'bible/shots/rei-body-1'
log = {e['id']: e for e in json.load(open(os.path.join(HERE, 'prompts.json')))}


def qa(path):
    d = json.load(open(path))
    d = d if isinstance(d, list) else d.get('images', d)
    return {os.path.basename(x['path']).split('.')[0].replace('-cut', ''): x for x in d}


R, CQ = qa(os.path.join(HERE, 'imgqa.json')), qa(os.path.join(HERE, 'qa-cut/imgqa.json'))
SEEN = {
    'a': 'Seam: ghost lines across the 32 px blend band, worst at her right side (image left): the model redrew those '
         'rows (mean change 12 to 33 per channel against the original) and the cross-fade showed both drawings at once.',
    'b': 'The ghost lines are mostly gone; a faint trace of the old cuff shape stays at her right side (image left) on '
         's12 and s13.',
}
LOOK = {
    11: 'Single-breasted: two buttons and a pocket flap, arms at her sides, ponytail down behind her left arm (image right).',
    12: 'Two buttons side by side at the waist, like a double-breasted jacket that the chest above does not show.',
    13: 'Two buttons, a belt buckle at the bottom edge, and a small white diamond with a pale pink edge between her left '
        'sleeve and the ponytail (image right); the cut-out makes that a see-through gap (matte warn: 1 hole).',
}
HOLES = {'b-s11': ' Matte warn, 1 hole: the gap between her body and her left arm (image right) with hair strands in it; '
                  'it is background in the render, so the cut-out is right to leave it open.'}
opts = []
for i, e in log.items():
    j, s = e['job'], e['seed']
    note = (f"Job {j}: {e['change']}. Seed {s}, RDBT Anima, Euler A 30 steps, CFG 5, denoise 1.0, LLLite inpainting-v2 1.0, "
            f"DifferentialDiffusion, 256 px added under the 896x1152 render (canvas 896x1408), blend rows {e['blend'][0]} to "
            f"{e['blend'][0] + e['blend'][1]}. Her face and upper body are rei-i65-2102 unchanged (max pixel change "
            f"{e['max_change_above_blend']} above the blend). Red rim {R[i]['redrim']['value'] * 100:.1f}% render, "
            f"{CQ[i]['redrim']['value'] * 100:.1f}% cut-out; matte holes {CQ[i]['matte']['holes']}. {SEEN[j]} {LOOK[s]}"
            f"{HOLES.get(i, '')}{' Installed in the game now.' if i == 'b-s11' else ''} Prompt (rei-i65-2102's own): {e['prompt']} "
            f"Negative: {e['negative']}")
    opts.append({'id': f'rei-body-{i}', 'label': f'rei-body-{i}' + (' (installed)' if i == 'b-s11' else ''),
                 'image': f'{S}/lineup-{i}.webp', 'images': [f'{S}/{i}.webp', f'{S}/{i}-render.webp'], 'note': note})
rv = {
    'title': "Rei's portrait down to the waist",
    'date': '2026-10-03',
    'by': 'claude-agent:rei-body-1',
    'status': 'open',
    'question': 'Is b-s11 right for Rei in the game, or should another of these replace it?',
    'multi': False,
    'media': [
        {'image': f'{S}/lineup-all.webp', 'caption': 'The cast as the game places them (same face height, chins on one '
         'line, cut where the desktop cuts), then Rei before (your pick rei-i65-2102, ending at the chest), Rei as installed '
         '(b-s11), then every attempt in order (a, b; seeds 11 to 13). Her shoulders and chest fill her column more than '
         "the others' do, as Kuro's did before size 0.85; her size is left at 1."},
        {'image': f'{S}/game-1366x860-day1.webp', 'caption': 'In the game now (desktop 1366x860). Rei has no line on day 1 '
         'or day 2 (she is hidden all day), so this check has her say a test line on the train.'},
        {'image': f'{S}/game-390x844-day1.webp', 'caption': 'In the game now (phone 390x844), day 1.'},
        {'image': f'{S}/game-390x844-day2.webp', 'caption': 'In the game now (phone 390x844), day 2.'},
        {'image': f'{S}/imgqa-renders.webp', 'caption': 'Every render before the cut-out, with the image check numbers '
         '(framing warns only because the canvas is taller than the 768 px crop the check expects).'},
        {'image': f'{S}/imgqa-cutouts.webp', 'caption': 'Every cut-out with the image check numbers; cyan marks see-through holes.'},
    ],
    'options': opts,
    'links': [],
}
os.makedirs(os.path.join(ROOT, 'reviews/rei-body-1'), exist_ok=True)
json.dump(rv, open(os.path.join(ROOT, 'reviews/rei-body-1/review.json'), 'w'), ensure_ascii=False, indent=1)
print(len(opts), 'options')
