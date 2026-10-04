"""Writes reviews/photos-1/review.json from prompts.json (every attempt, in order) and checks.json (what I saw in each).
Usage: python3 art/candidates/photos-1/review.py"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
REL = 'art/candidates/photos-1'
TITLES = {'monorail': ('Early train', 'photo_gate', 'security room'),
          'cherry': ('Spring garden', 'photo_forecourt', 'forecourt garden'),
          'pigeons': ('At the fountain', 'photo_plaza', 'plaza'),
          'cat': ('Office company', 'photo_office', 'B2 copy room'),
          'fireworks': ('Summer night', 'photo_dorm', 'dorm courtyard')}

log = json.load(open(os.path.join(HERE, 'prompts.json')))
checks = json.load(open(os.path.join(HERE, 'checks.json')))
options = []
for e in log:
    title, fid, place = TITLES[e['shot']]
    model = 'RDBT' if 'rdbt' in e['model'] else 'One Obsession'
    options.append({
        'id': e['id'],
        'label': f"{e['id']} · {title}",
        'image': f"{REL}/{e['id']}.webp",
        'images': [f"{REL}/current-{e['shot']}.webp"],
        'note': (f"{title} ({fid}, found in the {place}). Second picture: the current in-game drawing. "
                 f"Check: {checks.get(e['id'], 'not checked')} "
                 f"Change this pass: {e['change']}. {model}, seed {e['seed']}, {e['w']}x{e['h']}, Euler A, 30 steps, "
                 f"CFG 5. Prompt: {e['prompt']} Negative: {e['negative']}"),
    })
NOTES = ('One style block, one light line ("Soft light, gentle muted colours, a quiet everyday moment.") and one '
              'size (1152x864, the 4:3 of the print) for all five. Pass a: each photo on RDBT and One Obsession, '
              'seeds 11-13. One Obsession was softer and closer to one set on all five (RDBT came out flat and '
              'saturated, with grimy office walls and pigeons in a row), so passes b-d are One Obsession only, one '
              'change each. Closest per photo by my check: Early train monorail-d-oneobs-11 or -13 (odd disc on one '
              'pillar); Spring garden cherry-a-oneobs-11; At the fountain pigeons-a-oneobs-13 or -11; Office company '
              'cat-a-oneobs-13, cat-b-oneobs-12 or -13; Summer night fireworks-b-oneobs-11. cat-b-oneobs-14 asks a '
              'separate question: the drawing has a ginger cat, but Tama, who sleeps in B2, is a calico. Day 2 has '
              'no photo finds. Scripts: art/candidates/photos-1/ (gen.py has the staging notes).')
review = {
    'title': 'Photos finds: generated pictures, round 1',
    'date': '2026-10-04',
    'by': 'claude-agent:photos-gen',
    'status': 'open',
    'question': ('These are generated pictures to replace the in-game Photos collectibles (the five day-1 finds: Early '
                 'train, Spring garden, At the fountain, Office company, Summer night), not in the game yet. Which '
                 'picture do you want for each photo?'),
    'multi': True,
    'media': [{'image': f'{REL}/sheet.webp',
               'caption': ('Pictures, not in the game yet. One row per photo: the current in-game drawing first '
                           '(NOW), then every attempt in the order made, rejects included. Your note: "these '
                           'collectibles must be generatoed, they look like shit" (notes/feedback-game/2026-10-04_193007). ' + NOTES)},
              {'image': f'{REL}/monorail-lines.webp',
               'caption': ('The line sketch used for the Early train in passes c and d (LLLite lineart). Words alone '
                           'drew railway trains on bridges that end in the sea (passes a and b).')}],
    'options': options,
}
os.makedirs(os.path.join(ROOT, 'reviews', 'photos-1'), exist_ok=True)
json.dump(review, open(os.path.join(ROOT, 'reviews', 'photos-1', 'review.json'), 'w'), indent=1, ensure_ascii=False)
print(len(options), 'options')
