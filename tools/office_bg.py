"""Planning Office 7 basement background, 4 seeds on RDBT (batch O in the production manifest)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from production import run, Q, NO_PEOPLE_N, RDBT
P = (f'{Q}, safe, no humans, scenery, '
     'a cramped basement office for a small misfit team, camera at eye level in the doorway looking into the room, '
     'no windows except one high narrow frosted window right under the ceiling showing only a grey light well, no view outside, '
     'exposed pipes and cable trays running along the low concrete ceiling, fluorescent tube lights, one tube flickering, '
     'bare concrete walls with old faded posters without readable text, mismatched second-hand desks pushed together, '
     'stacks of files and cardboard boxes, old bulky monitors, a whiteboard covered in scribbles, a humming coffee machine on a cabinet, '
     'a little shabby but lived-in, a small potted plant, cool greenish fluorescent light, one warm desk lamp glowing on a desk, '
     'dominant cool grey-green, broad concrete grey, sparse warm lamp-orange accents')
N = NO_PEOPLE_N + ', trees, sky, garden, sunlight, large window, window view, sunny, cozy home office'
for seed in (501, 502, 503, 504):
    run('O', f'office-basement-{seed}', P, N, 1216, 832, seed, RDBT)
