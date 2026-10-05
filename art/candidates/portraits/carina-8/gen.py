"""carina-portrait-8: base = round-7 tile 9 (hair 2, smile weight 1.0 only, seed 10496). One eye-description word changed per variant, then combinations.
No post-process. Usage: python gen.py singles | python gen.py combos 1,4 3,7,... | python gen.py more 4 7"""
import sys, os, json, importlib.util
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OWNER = 'carina-art-round8'
spec = importlib.util.spec_from_file_location('g7', HERE + '/../carina-7/gen.py'); g7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g7)
BASE = g7.build(9, False, '(confident slight smile:1.0)', None, 10496)
# key: (label, [(old, new)])
C = {'blue': ('blue eyes', [('pale grey eyes', 'blue eyes')]), 'green': ('green eyes', [('pale grey eyes', 'green eyes')]), 'hazel': ('hazel eyes', [('pale grey eyes', 'hazel eyes')]),
     'nolash': ('no long eyelashes', [(' long eyelashes,', '')]), 'nobrow': ('no strong defined brows', [(' strong defined brows,', '')]),
     'lowbrow': ('brows weight 0.6', [('strong defined brows', '(strong defined brows:0.6)')]),
     'wide1': ('wide-set weight 1.0', [('(wide-set eyes, wide space between the eyes:1.5)', '(wide-set eyes, wide space between the eyes:1.0)')]),
     'nowide': ('no wide-set words', [(' (wide-set eyes, wide space between the eyes:1.5),', '')]),
     'halfclosed': ('+ half-closed relaxed eyes', [('looking at the viewer,', 'looking at the viewer, half-closed relaxed eyes,')]),
     'sleepy': ('+ sleepy eyes', [('looking at the viewer,', 'looking at the viewer, sleepy eyes,')]),
     'aside': ('looking slightly to the side', [('looking at the viewer', 'looking slightly to the side')]),
     'eyesview': ('eyes looking at viewer', [('looking at the viewer', 'eyes looking at viewer')])}
SINGLES = ['blue', 'green', 'hazel', 'nolash', 'nobrow', 'lowbrow', 'wide1', 'nowide', 'halfclosed', 'sleepy', 'aside', 'eyesview']
def build(keys, seed=10496):
    pr = BASE['prompt']; diff = []
    for k in keys:
        for old, new in C[k][1]:
            assert old in pr, (k, old); pr = pr.replace(old, new); diff.append(f'"{old.strip(", ")}" -> "{new.strip(", ")}"' if new else f'removed "{old.strip(", ")}"')
    return dict(keys=keys, seed=seed, prompt=pr, negative=BASE['negative'], diff=diff)
def run(jobs, pf):
    for name, d in jobs.items():
        if not os.path.exists('/tmp/claude-1000/gpu.lock/owner') or OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read(): sys.exit('lost the GPU lock')
        P.run('carina-8', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-8', name + '.png')
        if os.path.exists(src): Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
        d.update(file=f'art/candidates/portraits/carina-8/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    old = json.load(open(pf)) if os.path.exists(pf) else {}; old.update(jobs); json.dump(old, open(pf, 'w'), indent=1, ensure_ascii=False)
if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'singles': run({f'carina8-{i+1:02d}-{k}': build([k]) for i, k in enumerate(SINGLES)}, HERE + '/prompts-singles.json')
    elif mode == 'combos':
        run({f'carina8-c{i+1}-' + '+'.join(c.split(',')): build(c.split(',')) for i, c in enumerate(sys.argv[2:])}, HERE + '/prompts-combos.json')
    elif mode == 'more':
        run({f'carina8-s2-' + '+'.join(c.split(',')): build(c.split(','), 11496) for c in sys.argv[2:]}, HERE + '/prompts-more.json')
