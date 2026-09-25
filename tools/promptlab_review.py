"""Blind review export for the prompt lab: copies a set of renders to anonymous JPGs (r01.jpg, r02.jpg ...) so the reviewer
sees only the pictures, not the model or settings. Mapping goes to <dir>/map.json; verdicts are merged back with merge().
Usage: python tools/promptlab_review.py export <out_dir> <glob relative to art/production/promptlab> [...]
       python tools/promptlab_review.py merge <out_dir> <verdicts.json>"""
import sys, os, json, glob, random
from PIL import Image
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'promptlab')
VERDICTS = os.path.join(OUT, 'verdicts.json')


def export(d, patterns):
    files = []
    for p in patterns:
        files += sorted(glob.glob(os.path.join(OUT, p)))
    random.Random(7).shuffle(files)
    os.makedirs(d, exist_ok=True)
    m = {}
    for i, f in enumerate(files, 1):
        k = f'r{i:02d}'
        im = Image.open(f).convert('RGB')
        im.thumbnail((1216, 1216))
        im.save(os.path.join(d, k + '.jpg'), quality=88)
        m[k] = os.path.relpath(f, OUT)
    json.dump(m, open(os.path.join(d, 'map.json'), 'w'), indent=1)
    print(len(m), 'images ->', d)


def merge(d, vfile):
    m = json.load(open(os.path.join(d, 'map.json')))
    v = json.load(open(vfile))
    allv = json.load(open(VERDICTS)) if os.path.exists(VERDICTS) else {}
    for k, rec in v.items():
        allv[m[k]] = rec
    json.dump(allv, open(VERDICTS, 'w'), indent=1)
    print(len(v), 'verdicts merged')


if __name__ == '__main__':
    if sys.argv[1] == 'export':
        export(sys.argv[2], sys.argv[3:])
    else:
        merge(sys.argv[2], sys.argv[3])
