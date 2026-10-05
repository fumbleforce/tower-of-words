"""carina-faces-1: Jørgen's own prompt (carina-9-jorgen/PROMPT.md, read from the file, not retyped) with ONLY expression words added
before ', arms relaxed at her sides'. Negative untouched. 896x1152, rdbtAnima, euler_ancestral/normal, 30 steps, CFG 5 (tools/production.run).
No post-process. Usage: python gen.py"""
import sys, os, json, re
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OWNER = 'carina-faces-1'
SRC = open(HERE + '/../carina-9-jorgen/PROMPT.md', encoding='utf-8').read()
POS = SRC.split('## Positive\n')[1].split('\n\n## Negative')[0].strip('\n')
NEG = SRC.split('## Negative\n')[1].split('\n\n## ')[0].strip('\n')
ANCHOR = ',  arms relaxed at her sides'  # his text has two spaces here
assert ANCHOR in POS
FACES = {'neutral-asis': None, 'neutral-closed': 'neutral expression, closed mouth',
         'surprised': 'surprised, eyes wide open, small open mouth',
         'tired': 'tired, half-lidded eyes, slight eye bags, slumped relaxed look'}
SEEDS = [390617760, 390617761, 390617762]
def build(face):
    w = FACES[face]
    return POS if w is None else POS.replace(ANCHOR, ', ' + w + ANCHOR)
if __name__ == '__main__':
    jobs = {}
    for face in FACES:
        for i, s in enumerate(SEEDS, 1):
            jobs[f'cf1-{face}-{i}'] = dict(face=face, seed=s, prompt=build(face), negative=NEG, added=FACES[face])
    for name, d in jobs.items():
        if not os.path.exists('/tmp/claude-1000/gpu.lock/owner') or OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read(): sys.exit('lost the GPU lock')
        if os.path.exists('/tmp/claude-1000/gpu.priority'): sys.exit('dashboard priority')
        P.run('carina-faces-1', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-faces-1', name + '.png')
        if os.path.exists(src): Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=95)
        d.update(file=f'art/candidates/portraits/carina-faces-1/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    json.dump(jobs, open(HERE + '/prompts.json', 'w'), indent=1, ensure_ascii=False)
