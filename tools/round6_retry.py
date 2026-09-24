"""Round 6 retries: the five weak scenes rewritten (explicit camera, per-character emotions, style anchors) on RDBT, One Obsession and JANIMA, 2 seeds.
Writes into the production manifest as batch R: art/production/R/<scene>-<model>-<seed>.png"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from production import run, Q, N

MC = 'a 29-year-old Nordic man, fair pale skin, messy sandy-blond hair, light blond eyebrows, blue eyes, slim average build, white shirt with rolled sleeves, company lanyard'
MIO = 'Mio: a 25-year-old woman, messy black hair with green underneath in a loose bun, glasses with clear lenses, oversized black hoodie'
AOI = 'Aoi: a 22-year-old woman, shoulder-length pink-dyed hair with dark roots, oversized varsity jacket over a crop top'
N_BASE = N + ', floating objects, gore, blood'

SCENES = {
    'copyroom': ('1boy, 3girls', N_BASE, f'''camera inside a small copy room, looking toward its open doorway;
in the foreground left, {MIO}, and {AOI}, standing close together beside a large grey copier, having just stopped kissing, now springing apart from each other, Mio flustered with a faint blush and a hand over her mouth, Aoi flustered with a faint blush and an embarrassed laugh;
in the doorway at the back, main character: {MC}, standing frozen with his right hand still on the door handle, mouth open, no blush;
over his shoulder in the corridor behind him, Yuzuki: a 31-year-old woman with glossy wavy chestnut hair, peeking in with wide eyes;
medium-wide shot, a cramped office copy room with paper stacks, the copier glowing with a green light, cold fluorescent light, dominant pale grey, broad green copier glow, sparse pink accents'''),
    'shootout': ('2boys, action', N_BASE + ', glass floating in the air, gun pointing left, gun pointing at the viewer', '''wide shot of a dark corporate lobby at night, camera at the left side of the lobby at waist height, looking right;
on the left, Ishibashi: a wiry security guard in his sixties, grey pencil moustache, glasses on a chain, navy uniform and peaked cap, firing a pistol held in both hands, arms extended to the right, bright muzzle flash at the gun, the gun points at the burglar, stern;
on the right, a masked burglar in a black hoodie and black ski mask runs away to the right toward a shattered glass entrance door, carrying a laptop bag in his left hand;
glass shards lying on the floor near the broken door, not floating in the air;
moonlight through the glass walls, red emergency lights, dominant dark blue night, broad cold moonlight, sparse orange muzzle-flash and red emergency-light accents'''),
    'swim': ('multiple girls, crowd', N_BASE + ', standing, walking on water, floating above water, standing on water', '''indoor swimming pool, camera on the pool deck at water level, looking along the lanes;
three women swim freestyle in the water, bodies partly submerged, arms stroking, splashing, lane ropes between them;
Rei: a 26-year-old woman, silver-grey hair under a white swim cap, black athletic racing swimsuit, swimming in the centre lane, half a body length ahead of the others;
the other two swimmers in navy swim caps and navy racing swimsuits in the lanes on either side;
spectators in the stands in the background, cheering;
bright daylight through big windows, dominant turquoise water, broad white tiles, sparse red lane-rope accents'''),
    'volleyball': ('1girl focus, crowd', N_BASE + ', kicking, foot touching the ball', '''company sports day on a sandy beach volleyball court, camera low on the sand beside the net, looking up;
Rei: a 26-year-old woman, steel-grey eyes, long silver-grey hair in a high ponytail, athletic, black sports top and shorts, jumping high at the net, her right arm swinging down to spike the ball, the ball just leaving her right hand toward the other side of the net, fierce focused expression;
spectators: a crowd of office workers in company t-shirts behind a rope, cheering, facing the court;
bright blue sky, harsh midday sun, dominant sand beige and sky blue, sparse red flag accents'''),
    'romance': ('1boy, 1girl, couple', N_BASE + ', tokyo tower, skytree, landmark', f'''camera slightly behind and to the side of a wooden bench on a rooftop at night, looking over their shoulders at the city;
main character: {MC}, dark coat over his white shirt, sitting on the bench, looking out at the city with a quiet smile, no blush;
Emi: a 32-year-old curvy woman, auburn shoulder-length bob with side-swept bangs, brown tortoiseshell glasses with clear lenses, cream knit sweater, sitting close beside him on his left, her head resting on his shoulder, eyes half closed, content smile, her left hand resting on his arm;
an anonymous Japanese city skyline of office towers at night, no famous landmarks, the dark bay beyond, string lights overhead,
dominant deep navy night, broad warm amber string-light glow, sparse city-light sparkles'''),
}
MODELS = [('rdbt', 'rdbtAnima.safetensors'), ('oneObsession', 'oneObsessionAnima.safetensors'), ('janima', 'janima.safetensors')]

if __name__ == '__main__':
    for scene, (tags, neg, text) in SCENES.items():
        for tag, file in MODELS:
            for seed in (11, 12):
                run('R', f'{scene}-{tag}-{seed}', f'{Q}, safe, {tags}, {text}', neg, 1216, 832, seed, file)
