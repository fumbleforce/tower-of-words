"""carina-portrait-1: three face/hair designs x 2 seeds, neutral, RDBT Anima, Eric's anime5 prompt form."""
import sys, os, json
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
NEG = P.N + ', fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, undercut, shaved sides, two-tone hair, sunglasses, tinted eyewear'
BASE = 'a Scandinavian woman in her late twenties, fair pale skin, light blond eyebrows, blue eyes, slim average build, company lanyard'
OUTFIT = 'grey hoodie under a navy blazer'
TAIL = 'arms relaxed at her sides, slight three-quarter turn, looking at the viewer, calm neutral expression'
D = {
 'a-ponytail': 'dark-blond hair, same colour all over, tied in a short ponytail at the back, a few loose strands by her face',
 'b-bun': 'dark-blond hair, same colour all over, tied back in a low bun at the nape, light freckles across her nose',
 'c-braid': 'dark-blond hair, same colour all over, side-swept fringe and one long braid over her shoulder tied with a dark band',
}
GL = '(light grey rectangular glasses:1.2)'
log = {}
for k, hair in D.items():
    for seed in (909, 3909):
        prompt = f'{P.Q}, safe, 1girl, solo, {BASE}, {hair}, {GL}, {OUTFIT}, {TAIL}, {P.FRAME}'
        name = f'carina-{k}-{seed}'
        P.run('carina-1', name, prompt, NEG, 896, 1152, seed, P.RDBT)
        src = os.path.join(P.OUT, 'carina-1', name + '.png')
        if os.path.exists(src):
            Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
        log[name] = {'file': f'art/candidates/portraits/carina-1/{name}.webp', 'design': k, 'seed': seed, 'model': 'rdbtAnima',
                     'prompt': prompt, 'negative': NEG, 'settings': '896x1152, euler_ancestral normal, 30 steps, CFG 5'}
json.dump(log, open(os.path.join(HERE, 'prompts.json'), 'w'), indent=1, ensure_ascii=False)
