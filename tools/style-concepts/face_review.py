# Write reviews/char-face-1/review.json from tools/style-concepts/face_attempts.json: claude-facet attempt-04 as the
# before, every claude-facetface attempt in order (faces beside the portrait first, then the game shots and the
# full sheet), and every image-generation job of the round as its own option.
#   python3 tools/style-concepts/face_review.py [--date YYYY-MM-DD]
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))
ID = 'char-face-1'
FF = 'art/parts/style-concepts/claude-facetface/'
GEN = [
    ('gen-front', 'gen-front · texture source faces',
     [FF + 'gen/front2/sheet.webp', FF + 'gen/front/sheet.webp'],
     'Front-facing faces from the local anime model (RDBT Anima, Euler A, 30 steps, CFG 5, 1024 square), the source '
     'of the face textures. Try 1 (seeds 101-104, plain prompt): skin came out tanned, hair strands crossed the face, '
     'and Eric went photographic on three seeds of four. Try 2 (seeds 111-114): the anime style anchors, "pale skin" '
     'and "forehead and whole face clear of hair" added; picked mio 113 and eric 112. Prompts and negatives per image: '
     + FF + 'gen/front2/prompts.json.'),
    ('gen-expr', 'gen-expr · expressions',
     [FF + 'gen/expr/sheet.webp'],
     'The expressions: eyes, brows and mouth of the picked faces repainted (masked img2img with DifferentialDiffusion, '
     'denoise 0.6 and 0.72, seeds 401 and 402), the rest kept. Mio "small soft smile", Eric "surprised, eyes wide '
     'open, eyebrows raised, mouth slightly open". Picked mio 401-d60 and eric 401-d72.'),
    ('gen-ref', 'gen-ref · faceted-style references',
     [FF + 'gen/ref/sheet.webp'],
     'Full-body anime references asked for in a faceted low-poly look ("low poly 3d game character, faceted '
     'flat-shaded polygons, simple shapes, anime face painted on the head"), seeds 201-203. Off-model: Mio has bare '
     'legs, Eric loses his ponytail on one seed. Shown for what the model thinks the style looks like.'),
    ('gen-i2i', 'gen-i2i · img2img over our renders',
     [FF + 'gen/i2i-cf04/sheet.webp', FF + 'gen/i2i-facet04/sheet.webp'],
     'img2img over our own renders (denoise 0.45 and 0.6, seed 301), to see how the faces could look: first over '
     'cf-04, then over the before (claude-facet attempt-04). At 0.6 the model draws anime eyes into the faceted '
     'head and keeps the body; at 0.45 it mostly keeps our faces.'),
]


def rel(p):
    return p.lstrip('/')


def main():
    d = sys.argv[sys.argv.index('--date') + 1] if '--date' in sys.argv else date.today().isoformat()
    spec = json.load(open(os.path.join(HERE, 'face_attempts.json')))
    opts = []
    for a in spec['attempts']:
        base = rel(a['dir'])
        if a['faces']:
            image, images = base + 'sheet-faces.webp', [base + 'sheet-game.webp', base + 'sheet.webp']
        else:
            image, images = base + 'sheet-mio.webp', [base + 'sheet-eric.webp', base + 'sheet-game.webp']
        opts.append({'id': a['id'], 'label': a['label'], 'image': image, 'images': images,
                     'note': a['note'] + (' ' + a['read'] if a.get('read') else '')})
    for oid, label, ims, note in GEN:
        opts.append({'id': oid, 'label': label, 'image': ims[0], 'images': ims[1:], 'note': note})
    item = {
        'title': 'Character faces: faceted bodies with anime face textures',
        'date': d,
        'by': 'Claude (char-face agent)',
        'status': 'open',
        'question': "Is this the direction for the game's characters, and which attempt?",
        'multi': True,
        'media': [
            {'image': FF + 'faces-all.webp', 'caption': 'Every attempt\'s face, in order, under the portraits and the before'},
            {'image': FF + 'series-face.webp', 'caption': 'The face steps at the game camera: before, cf-01 to cf-04, cf-09'},
            {'image': FF + 'series-simp.webp', 'caption': 'Simplification levels 1 (cf-04), 2 (cf-05), 3 (cf-06) at the game camera'},
            {'image': FF + 'series-chibi.webp', 'caption': 'Stylization levels 1 (cf-04), 2 (cf-07), 3 (cf-08), and level 3 with the bolder face (cf-10)'},
            {'image': FF + 'textures/t3/sheet.webp', 'caption': 'The face textures cf-01 to cf-08 use, beside the portrait and their source'},
            {'image': FF + 'textures/t4/sheet.webp', 'caption': 'The bolder textures of cf-09 and cf-10'},
            {'image': FF + 'textures/t1/sheet.webp', 'caption': 'First texture try (from the try-1 faces), not used on a model'},
        ],
        'options': opts,
        'links': [{'label': 'Turn them, play idle and walk, swap the expressions (live 3D)',
                   'href': 'tools/style-concepts/face-viewer.html'}],
    }
    out = os.path.join(ROOT, 'reviews', ID)
    os.makedirs(out, exist_ok=True)
    json.dump(item, open(os.path.join(out, 'review.json'), 'w'), indent=1, ensure_ascii=False)
    print('wrote', os.path.join(out, 'review.json'), len(opts), 'options')


if __name__ == '__main__':
    main()
