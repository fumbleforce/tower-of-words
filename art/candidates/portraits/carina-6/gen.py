"""carina-portrait-6: the round-4 tile Jørgen liked (carina4-08-bob-behind-ear-s3, seed 10496) with ONE or TWO phrases changed, nothing else.
No post-process, no recolour. Prompt, negative, size and settings are the original's, read from carina-4/prompts-extra.json.
Usage: python gen.py            -> the 10 variants at the original seed
       python gen.py more 2 7 9 -> a second seed for the named variants"""
import sys, os, json
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OWNER = 'carina-art-round5'
O = json.load(open(HERE + '/../carina-4/prompts-extra.json'))['carina4-08-bob-behind-ear-s3']
HAIR0 = '(dark roots, dark brown roots at the crown fading into honey blonde and golden lengths, obvious root regrowth, ombre hair:1.5)'
EXPR0 = '(confident slight smile:1.2)'
H = {'h1': '(blonde hair with dark roots, honey blonde and golden lengths, obvious root regrowth:1.5)',
     'h2': '(blonde hair with dark roots and a few dark stripes, honey blonde and golden lengths:1.5)',
     'h3': '(honey blonde hair, brown roots:1.5)'}
E = {'e1': '(soft smile:1.2)', 'e2': '(relaxed expression, slightly amused:1.2)'}
# n, hair key, expression key
V = [(1, None, None), (2, 'h1', None), (3, 'h2', None), (4, 'h3', None), (5, None, 'e1'), (6, None, 'e2'),
     (7, 'h1', 'e1'), (8, 'h1', 'e2'), (9, 'h2', 'e1'), (10, 'h3', 'e2')]
def build(n, h, e, seed):
    pr = O['prompt']; diff = []
    if h: pr = pr.replace(HAIR0, H[h]); diff.append(f'hair: "{HAIR0}" -> "{H[h]}"')
    if e: pr = pr.replace(EXPR0, E[e]); diff.append(f'expression: "{EXPR0}" -> "{E[e]}"')
    assert (pr != O['prompt']) == bool(h or e)
    return dict(n=n, hair=h, expr=e, seed=seed, prompt=pr, negative=O['negative'], diff=diff or ['none (the original, re-rendered to check it reproduces)'])
if __name__ == '__main__':
    jobs = {}
    if sys.argv[1:2] == ['more']:
        for n in map(int, sys.argv[2:]):
            _, h, e = [v for v in V if v[0] == n][0]; jobs[f'carina6-{n:02d}-seed2'] = build(n, h, e, O['seed'] + 1000)
        pf = HERE + '/prompts-more.json'
    else:
        for n, h, e in V: jobs[f'carina6-{n:02d}'] = build(n, h, e, O['seed'])
        pf = HERE + '/prompts-1.json'
    for name, d in jobs.items():
        if not os.path.exists('/tmp/claude-1000/gpu.lock/owner') or OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read(): sys.exit('lost the GPU lock')
        P.run('carina-6', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-6', name + '.png')
        if os.path.exists(src): Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
        d.update(file=f'art/candidates/portraits/carina-6/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    json.dump(jobs, open(pf, 'w'), indent=1, ensure_ascii=False)
