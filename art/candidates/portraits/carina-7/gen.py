"""carina-portrait-7: the round-4 tile he liked (seed 10496) with hair 2 from round 6 (tile 3, his pick) and only the expression words changed.
(a) smile weight / wording, (b) 'both eyes visible' removed or kept. No post-process, no recolour.
Usage: python gen.py | python gen.py more 3 5"""
import sys, os, json
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OWNER = 'carina-art-round7'
O = json.load(open(HERE + '/../carina-4/prompts-extra.json'))['carina4-08-bob-behind-ear-s3']
HAIR0 = '(dark roots, dark brown roots at the crown fading into honey blonde and golden lengths, obvious root regrowth, ombre hair:1.5)'
HAIR2 = '(blonde hair with dark roots and a few dark stripes, honey blonde and golden lengths:1.5)'   # round 6 hair 2 = his pick (tile 3)
EYES = 'both eyes visible, '; SMILE0 = '(confident slight smile:1.2)'; LOOK = 'looking at the viewer, '
# n, remove 'both eyes visible', smile replacement (None = original), calm-eye phrase (None = none)
V = [(1, True, None, None), (2, False, 'slight smile', None), (3, True, 'slight smile', None), (4, True, 'slight smile', 'relaxed eyes'),
     (5, True, 'slight smile', 'half-lidded eyes'), (6, True, 'slight smile', 'gentle eyes'), (7, False, None, 'relaxed eyes'),
     (8, False, None, 'gentle eyes'), (9, False, '(confident slight smile:1.0)', None)]
def build(n, rm, sm, eyes, seed):
    pr = O['prompt'].replace(HAIR0, HAIR2); diff = [f'hair: "{HAIR0}" -> "{HAIR2}" (round 6 hair 2, his pick; same in every tile)']
    if rm: assert EYES in pr; pr = pr.replace(EYES, ''); diff.append('removed "both eyes visible"')
    if sm: pr = pr.replace(SMILE0, sm); diff.append(f'smile: "{SMILE0}" -> "{sm}"')
    if eyes: pr = pr.replace(LOOK, LOOK + eyes + ', '); diff.append(f'added "{eyes}" after "looking at the viewer"')
    return dict(n=n, seed=seed, prompt=pr, negative=O['negative'], diff=diff)
if __name__ == '__main__':
    jobs = {}
    if sys.argv[1:2] == ['more']:
        for n in map(int, sys.argv[2:]):
            _, rm, sm, ey = [v for v in V if v[0] == n][0]; jobs[f'carina7-{n:02d}-seed2'] = build(n, rm, sm, ey, O['seed'] + 1000)
        pf = HERE + '/prompts-more.json'
    else:
        for n, rm, sm, ey in V: jobs[f'carina7-{n:02d}'] = build(n, rm, sm, ey, O['seed'])
        pf = HERE + '/prompts-1.json'
    for name, d in jobs.items():
        if not os.path.exists('/tmp/claude-1000/gpu.lock/owner') or OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read(): sys.exit('lost the GPU lock')
        P.run('carina-7', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-7', name + '.png')
        if os.path.exists(src): Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
        d.update(file=f'art/candidates/portraits/carina-7/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    json.dump(jobs, open(pf, 'w'), indent=1, ensure_ascii=False)
