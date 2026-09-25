"""Still art for the anime opening (proto2/opening), RDBT Anima through ComfyUI.
Usage: ~/ai/sd/venv/bin/python tools/opening/art.py base [name ...]     # base renders, all seeds (review these)
       ~/ai/sd/venv/bin/python tools/opening/art.py hires name:seed ...  # hires fix of the picked seed
       ~/ai/sd/venv/bin/python tools/opening/art.py sprites              # approved sprites refined at 2x (design kept)
Output: art/opening/base/<name>-<seed>.png, art/opening/hires/<name>.png, art/opening/sprites/<name>.png (gitignored; PNGs embed
their workflow and a .workflow.json sits next to each)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy_op

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'art', 'opening')
Q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
     'anime screenshot, anime coloring, 2d, cel shading, clean lineart')
N = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
     'missing fingers, extra fingers, fused fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, signature, '
     '3d, realistic, photorealistic, render, cgi, chubby, nude, nsfw, child, loli')
NOPPL = N + (', people, person, 1girl, 1boy, crowd, character, silhouette, readable text, letters, logo, brand name, signage text, '
             'duplicate objects, floating objects, impossible architecture, distorted perspective, warped lines')
BG = f'{Q}, (detailed anime background art, hand-painted anime background, painted clouds:1.3), safe, no humans, scenery, '
MORNING = 'early morning sun low on the horizon, dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light'
SEA_NEG = NOPPL + ', helicopter, aircraft, airplane, train on water, floating train, rails on water, train in the sea, bridge without pillars, boat, ship, pier'
MC = ('the main character: a tired 34-year-old Scandinavian man, short dark-blond hair and a short dark-blond beard, (fair pale skin:1.4), '
      'light eyebrows, no blush, glasses with clear lenses, grey hoodie under a navy blazer, company lanyard')

JOBS = {
    # name: (prompt, negative, w, h, seeds, hires size)
    'sky-tall': (BG + 'vertical composition, a vast morning sky over Tokyo Bay, towering white cumulus clouds lit gold from below, '
                 'deep blue sky at the top fading to pale warm light near the horizon, (a thin calm sea horizon at the very bottom edge:1.3), '
                 'a few birds far away, ' + MORNING, NOPPL + ', buildings, city, land', 832, 1216, (11, 12), (1248, 1824)),
    'bay-exterior': (BG + '(wide establishing shot:1.2), high viewpoint, a sleek white monorail train with a teal stripe riding on top of '
                     '(a long elevated concrete monorail beam supported by tall concrete pillars standing in the sea:1.5), '
                     'the beam crosses calm Tokyo Bay from the left toward a large man-made island covered with glass office towers of one company city in the distance on the right, '
                     'sunlight glittering on the water, long shadows, ' + MORNING, SEA_NEG, 1216, 832, (23, 24, 25), (1824, 1248)),
    'low-angle': (BG + '(extreme low angle looking straight up from below:1.4) at the underside of an elevated concrete monorail beam crossing the sky diagonally, '
                  'a white monorail train with a teal stripe passing overhead on top of the beam, one tall concrete pillar rising from the bottom corner, '
                  'deep blue morning sky with white clouds, sun glare peeking around the edge of the beam, dynamic perspective, ' + MORNING,
                  SEA_NEG + ', ground, road, cars', 1216, 832, (31, 32, 33), (1824, 1248)),
    'interior': (BG + 'inside an empty modern Japanese monorail carriage in the morning, camera seated in the aisle looking across at the side of the car, '
                 'a long teal cushioned bench seat along the wall under (a row of wide windows:1.3), stainless steel grab poles, hand straps hanging from a ceiling rail, '
                 'bright sky and sea outside the windows, warm low sunlight streaming in through the windows and falling across the seats and floor in long bright shapes, '
                 + MORNING, NOPPL + ', bed, sofa, living room', 1216, 832, (41, 42), (1824, 1248)),
    'window-pano': (BG + '(very wide panoramic view:1.3) across calm Tokyo Bay seen from a moving train high above the water, '
                    'a large man-made island city of glass office towers of one company on the horizon, towers catching the morning sun, '
                    '(a concrete monorail beam on pillars running parallel along the bottom of the view:1.2), sea glitter, ' + MORNING,
                    SEA_NEG + ', window frame, interior, train', 1536, 640, (51, 52), (2304, 960)),
    'skyline': (BG + 'epic reveal of a giant company city on a man-made island in Tokyo Bay, dozens of gleaming glass skyscrapers of different heights, '
                'one tall central tower, (the sun rising behind the towers with light rays:1.3), '
                '(an elevated monorail beam on pillars curving across the sea into the city:1.3), calm sea in the foreground sparkling, '
                'seen from low over the water, grand and hopeful, ' + MORNING, SEA_NEG, 1216, 832, (61, 62, 63), (1824, 1248)),
    'station': (BG + 'an elevated monorail station platform high above the city in the morning, camera at eye level on the platform looking along it, '
                '(glass platform screen doors along the platform edge:1.3), the white monorail train stopped behind the glass doors, '
                'a curved glass and white steel roof, clean tiled floor with a yellow tactile strip, office towers visible beyond the platform, '
                'bright morning light and long shadows, ' + MORNING, NOPPL + ', ticket machines, crowd', 1216, 832, (71, 72), (1824, 1248)),
    'mc-window': (f'{Q}, safe, 1boy, solo, adult, {MC}, '
                  'sitting on a train seat by a large window, (side profile view facing the window on the right:1.3), looking out at the city with a quiet hopeful look, '
                  'warm morning sunlight falling across his face and shoulders through the window, window reflections, '
                  'inside a monorail carriage, blurred sea and towers outside, upper body, cinematic lighting, ' + MORNING,
                  N + ', 1girl, tan skin, dark skin, blush, beard stubble on neck, hat', 1216, 832, (81, 82, 83, 84), (1824, 1248)),
    'id-card': (f'{Q}, safe, close-up of a man\'s right hand pulling a (plain white employee ID card with a blank photo square and no writing:1.4) '
                'on a blue lanyard out of the pocket of a navy blazer, (five fingers, thumb on the front of the card:1.2), '
                'morning sunlight, shallow depth of field, grey hoodie fabric in the background, detailed hand, ' + MORNING,
                N + ', readable text, letters, logo, face, head, woman, ring, nail polish', 1216, 832, (91, 92, 93, 94), (1824, 1248)),
    'mio-gaming': (f'{Q}, safe, 1girl, solo, Mio, a 25-year-old woman seen from behind, messy black hair with green underneath in a loose bun, '
                   'oversized black hoodie, big headphones on her head, sitting in an office chair at a desk, '
                   '(view from behind her chair:1.3), two old monitors glowing with a colourful video game, a game controller in both hands, '
                   'in a dim cramped basement office with exposed pipes on the low concrete ceiling, cool fluorescent light, empty ramen cups on the desk, '
                   'dominant cool grey-green, broad monitor blue glow, sparse magenta and orange game-light accents',
                   N + ', readable text, letters, logo, face, window, sunlight', 1216, 832, (101, 102, 103), (1824, 1248)),
    'elevator-button': (f'{Q}, safe, close-up of an index finger pressing (a round glowing elevator call button with an up arrow:1.3) '
                        'on a brushed steel wall panel, a man\'s hand in a navy blazer sleeve, soft warm light ring around the button, '
                        'shallow depth of field, modern office lobby, detailed hand, five fingers',
                        N + ', readable text, letters, numbers, logo, face, keypad, many buttons', 1216, 832, (111, 112, 113), (1824, 1248)),
    'elevator-doors': (BG + 'a modern office lobby, camera at eye level facing a pair of polished steel elevator doors sliding open, '
                       'warm bright light spilling out of the elevator car onto the polished stone floor, a small lit up-arrow lamp above the doors, '
                       'stone-clad walls, a potted plant, morning, symmetric composition',
                       NOPPL + ', many doors', 1216, 832, (121, 122), (1824, 1248)),
    'tower-up': (BG + '(worm\'s-eye view looking straight up:1.4) along a gleaming glass skyscraper rising into a deep blue morning sky, '
                 'strong converging perspective, reflections of clouds in the glass, the sun flaring at the top edge of the tower, white clouds, '
                 + MORNING, NOPPL, 832, 1216, (131, 132), (1248, 1824)),
    'stairs': (f'{Q}, safe, 1boy, solo, adult, {MC}, (seen from behind:1.4), '
               'climbing a long white outdoor staircase between glass office towers toward the bright morning sky, one foot on the next step, '
               'his blazer lit by the sun, wind, low angle from a few steps below him, clouds, hopeful, ' + MORNING,
               N + ', face, 1girl, backpack, hat', 832, 1216, (141, 142, 143), (1248, 1824)),
    'copyroom': (BG + 'a cramped windowless copy room in a Japanese office building, camera at eye level just inside the door looking into the room, '
                 '(a large old bulky beige multifunction office copier as the centrepiece against the back wall:1.4), its green control panel glowing, output trays, '
                 'a narrow worktable beside it with paper reams and a stapler, metal shelving with toner boxes on the left wall, a recycling bin full of paper, '
                 'no windows, one fluorescent ceiling panel, scuffed grey walls, quiet and secluded, '
                 'cold flat fluorescent light, dominant pale grey-green walls, broad off-white paper and beige copier plastic, sparse green copier-panel glow',
                 NOPPL + ', window, sunlight, sky, open plan office, bed, sofa', 1216, 832, (161, 162, 163), (1824, 1248)),
    'gate': (BG + 'the pedestrian security entrance of a company city on an island, camera at eye level close to (a row of waist-high glass-flap ID card security gates:1.3), '
             'a card reader glowing teal on top of the nearest gate, a steel canopy above, glass office towers rising behind in the morning sun, trimmed trees, '
             + MORNING, NOPPL + ', train station, ticket machines', 1216, 832, (151, 152), (1824, 1248)),
}

# ---- Staged jobs (shot-staging skill, 2026-09-25). The monorail carries the main character to the island he is moving to,
# so it always travels toward the island. The island is east: the low morning sun sits over it, so shots facing the island
# are backlit and shots facing back toward the mainland are front-lit. Each note: camera / in front / behind (never prompted) /
# motion / light / physical checks.
TOWER_NEG = ', tokyo skytree, tokyo tower, broadcast tower, lattice tower, spire, antenna tower, landmark'
TRAIN = ('a short white three-car straddle monorail train with a teal stripe sitting on top of the concrete beam, '
         '(exactly three cars, the rounded nose and the flat last car both visible:1.4)')
STAGING = {
    'bay-side': 'Camera: over the water at a distance, square-on to the side of the beam, slightly high, wide. In front: sea, the beam '
                'crossing left to right on pillars, the three-car train on it, the island city small on the right horizon under the low sun. '
                'Behind: open bay. Motion: train left to right, toward the island (nose on the right). Light: low sun right, backlit rims. '
                'Check: train on top of the beam, both ends visible, pillars reach the water, no aircraft.',
    'oncoming': 'Camera: at the foot of a pillar, looking up and back along the beam toward the mainland. In front: underside of the beam '
                'running away diagonally, the train\'s nose coming over the camera, three cars, last car visible, hazy mainland shore low on '
                'the horizon. Behind: the island (not prompted). Motion: nose toward and over the camera. Light: sun behind the camera, '
                'warm front light on the nose. Check: train on the beam, not floating; finite train.',
    'window-pano': 'Camera: inside the carriage, facing out of a side window (frame not in the plate: this is the view layer). In front: the '
                   'bay far below, sea glitter, the island city on the horizon toward the right (ahead). Behind: the carriage and our own '
                   'train and beam (never in the view). Light: low sun right/ahead. Check: no train, no beam, no tower.',
    'forward': 'Camera: inside the driverless front car at eye level, looking forward through the front window (window frame out of '
               'the plate). In front: the concrete beam running straight ahead across the sea into the island city of glass towers, the '
               'sun just risen behind the towers. Behind: the train and the mainland. Motion: we move forward along the beam. Check: no '
               'train in view, no tower/spire, the beam is single and continuous.',
    'skyline': 'Camera: low over the water beside the route, facing the island. In front: sparkling sea, the beam on pillars curving from '
               'the left foreground into the city, glass towers, sun rising behind them. Behind: the mainland. No train. Check: no '
               'Skytree/Tokyo Tower lookalike, towers stand on the island not in the sea.',
    'station': 'Camera: eye level on the island station platform, looking along the platform. In front: glass platform screen doors on '
               'the right with the stopped three-car monorail behind them straddling its concrete beam (no rails), doors open, yellow '
               'tactile strip, glass roof, towers beyond the platform end. Behind: stairs down (not prompted). Motion: none (he has just '
               'arrived). Check: no rails, no second train, one beam.',
    'mc-window': 'Camera: in the aisle beside him at seated eye level, three-quarter view from behind-left. In front: his left profile, '
                 'the side window he looks out of, the bay far below and the island city on the horizon. Behind: the rest of the car. '
                 'Eyeline: out of the window at the city. Light: low sun from ahead through the window on his face. Check: fair skin, '
                 'beard, glasses, navy blazer over grey hoodie, lanyard; no tower; sea not a city below.',
    'luggage': 'Camera: low, at knee height in the carriage aisle, facing the seat. In front: a packed suitcase and a backpack on the floor '
               'by the seat, sunlight bands across them, a window above with sky. Behind: the aisle. Beat: he is moving here, not '
               'commuting. Check: no people, no text or tags with writing.',
}
JOBS.update({
    'bay-side': (BG + '(side view square-on to an elevated concrete monorail beam:1.4), camera over the sea at a distance, slightly high, wide shot, '
                 '(the beam runs horizontally across the frame from left to right on tall concrete pillars standing in the calm sea:1.3), '
                 + TRAIN + ', (the train travels to the right, its rounded nose on the right:1.3), '
                 'on the far right horizon a small man-made island with glass office towers under the low rising sun, sunlight glittering on the water, ' + MORNING,
                 SEA_NEG + ', second train, infinitely long train, train on water' + TOWER_NEG, 1216, 832, (201, 202, 203, 204), (1824, 1248)),
    'oncoming': (BG + '(extreme low angle looking up from the foot of a concrete pillar:1.4), the underside of an elevated monorail beam running away diagonally into the sky, '
                 + TRAIN + ', (the rounded nose of the train coming toward the camera, passing overhead:1.3), warm sunlight on the front of the train, '
                 'a hazy low shore on the horizon, deep blue morning sky, white clouds, dynamic perspective, ' + MORNING,
                 SEA_NEG + ', city, skyscrapers, island, second train, infinitely long train' + TOWER_NEG, 1216, 832, (211, 212, 213), (1824, 1248)),
    'window-pano': (BG + '(very wide panoramic view:1.3) from high above calm Tokyo Bay, the sea far below with sunlight glittering on the water, '
                    'on the horizon toward the right a man-made island covered with glass office towers catching the low morning sun, '
                    'a few small clouds, ' + MORNING,
                    SEA_NEG + ', train, monorail, beam, bridge, rails, window frame, interior' + TOWER_NEG, 1536, 640, (221, 222), (2304, 960)),
    'forward': (BG + '(first-person view looking straight ahead along an elevated monorail beam:1.4), the single concrete beam runs straight ahead on pillars '
                'across the calm sparkling sea and leads into a man-made island city of gleaming glass office towers of different heights, '
                '(the sun just risen behind the towers with light rays:1.3), symmetrical one-point perspective, grand and hopeful, ' + MORNING,
                SEA_NEG + ', train, window frame, interior, two beams, rails' + TOWER_NEG, 1216, 832, (231, 232, 233), (1824, 1248)),
    'skyline': (BG + 'camera low over the water beside the route, facing a man-made island in Tokyo Bay covered with dozens of gleaming glass office towers '
                'of different heights, (the sun rising behind the towers with light rays:1.3), '
                '(an elevated monorail beam on pillars curving from the left foreground across the sea into the city:1.3), calm sea sparkling in the foreground, '
                'grand and hopeful, ' + MORNING, SEA_NEG + ', train' + TOWER_NEG, 1216, 832, (241, 242, 243), (1824, 1248)),
    'station': (BG + 'camera at eye level on an elevated monorail station platform, looking along the platform, '
                '(a row of glass platform screen doors along the right side:1.3), behind them a stopped white three-car straddle monorail train sitting on a concrete beam, '
                'its doors open, (no rails:1.3), a yellow tactile strip on the tiled floor, a curved glass and white steel roof, '
                'glass office towers beyond the end of the platform in bright morning light, long shadows, ' + MORNING,
                NOPPL + ', rails, railway tracks, second train, approaching train, ticket machines, crowd' + TOWER_NEG, 1216, 832, (251, 252, 253), (1824, 1248)),
    'mc-window': (f'{Q}, safe, 1boy, solo, adult, {MC}, '
                  'three-quarter view from behind-left, camera in the aisle beside him at seated eye level, he sits by the window and looks out of it, '
                  '(his left profile:1.2), quiet hopeful look, warm low morning sun through the window on his face, faint window reflection, '
                  '(outside the window: the calm sea far below and a distant island city on the horizon:1.3), inside a monorail carriage, upper body, cinematic lighting, '
                  + MORNING, N + ', 1girl, tan skin, dark skin, blush, hat, city below, streets' + TOWER_NEG, 1216, 832, (261, 262, 263, 264), (1824, 1248)),
    'luggage': (BG + 'camera low at knee height in the aisle of a monorail carriage, facing a teal bench seat, '
                '(a packed grey hard-shell suitcase standing upright and a dark backpack leaning on it on the floor beside the seat:1.4), '
                'bright bands of morning sunlight falling across them and the floor, a window above the seat with blue sky, ' + MORNING,
                NOPPL + ', tag, label, sticker', 1216, 832, (271, 272), (1824, 1248)),
})

STAGING['bay-side2'] = STAGING['bay-side'] + ' Round 2: camera further back so the whole short train fits, empty beam on both sides of it; the island is a big city.'
STAGING['oncoming2'] = STAGING['oncoming'] + ' Round 2: the sun is behind the camera, so no sun in the sky; the train front is lit.'
JOBS.update({
    'bay-side2': (BG + '(side view square-on to an elevated concrete monorail beam, seen from far away:1.4), camera over the sea, wide shot, '
                  '(the beam runs horizontally across the whole frame on tall concrete pillars standing in the calm sea:1.3), '
                  '(one short white three-car monorail train with a teal stripe in the middle of the beam, the whole train visible with empty beam to its left and right:1.6), '
                  '(the train travels to the right, rounded nose on the right:1.3), '
                  '(on the right a large man-made island city with dozens of glass office towers filling the right third of the horizon:1.3), '
                  'the low rising sun above the island city, sunlight glittering on the water, ' + MORNING,
                  SEA_NEG + ', second train, long train, train cut off by the frame, train on water, small islet' + TOWER_NEG, 1216, 832, (205, 206, 207, 208), (1824, 1248)),
    'oncoming2': (BG + '(extreme low angle looking up from the foot of a concrete pillar:1.4), the underside of an elevated monorail beam running away diagonally into the sky, '
                  + TRAIN + ', (the rounded nose of the train coming toward the camera:1.3), (bright warm sunlight on the front of the train from behind the camera:1.3), '
                  'a hazy low green shore far away on the horizon, deep blue morning sky, white clouds, (no sun in the sky:1.3), dynamic perspective, '
                  'dominant clear sky blue, broad white cloud and concrete, sparse warm orange light on the train',
                  SEA_NEG + ', sun, sunset, city, skyscrapers, island, second train, long train' + TOWER_NEG, 1216, 832, (214, 215, 216), (1824, 1248)),
})

STAGING['mc-window2'] = STAGING['mc-window'] + (' Height: the carriage rides on the beam about 15 m above the bay, so he looks down at the water; '
                                                'the horizon sits at his eye level with a wide band of sea below it, no waves near the sill. One change from round 1: the view.')
JOBS['mc-window2'] = (JOBS['mc-window'][0].replace(
    '(outside the window: the calm sea far below and a distant island city on the horizon:1.3)',
    '(outside the window: looking down from high above at the calm sea far below, the island city small on the horizon:1.3)'),
    JOBS['mc-window'][1] + ', waves, camera, red lanyard', 1216, 832, (265, 266, 267, 268), (1824, 1248))

STAGING['station2'] = ('Camera: eye level on the island station platform, square-on to the platform edge. In front: a row of glass platform screen '
                       'doors, open, and right behind them the open doors of the stopped white monorail car, its bright interior; the platform floor '
                       'with a yellow tactile strip in the foreground. Behind: the station stairs (not prompted). Height: the platform is up at the '
                       'beam, so there is only sky above the car roof. Motion: none, he has just arrived. Check: no rails or track visible, one train.')
JOBS['station2'] = (BG + '(flat frontal view square-on to the platform edge:1.3), camera at eye level on an elevated monorail station platform, '
                    'a row of glass platform screen doors standing open, right behind them the open sliding doors of a stopped white monorail car with a teal stripe, '
                    'its bright empty interior with teal seats visible through the doors, a yellow tactile strip on the tiled platform floor in the foreground, '
                    'a white steel canopy above, blue morning sky above the car roof, ' + MORNING,
                    NOPPL + ', rails, railway tracks, sea, water, second train, ticket machines, crowd' + TOWER_NEG, 1216, 832, (255, 256, 257), (1824, 1248))

STAGING['elevator-doors2'] = ('Camera: eye level in the office lobby, square-on to one elevator. In front: two brushed steel sliding doors parting, '
                              'the bright lit elevator car behind them, light spilling onto the stone floor. Behind: the lobby (not prompted). '
                              'One change from round 1: the doors are named and weighted (round 1 drew wooden double doors).')
JOBS['elevator-doors2'] = (JOBS['elevator-doors'][0].replace('a pair of polished steel elevator doors sliding open',
                           '(two brushed stainless steel elevator doors sliding apart, a bright empty elevator car behind them:1.4)'),
                           JOBS['elevator-doors'][1] + ', wooden door, double door, window', 1216, 832, (123, 124, 125), (1824, 1248))

# ---- Test segment (intro + verse 1 lines 1-2), staged with the full shot-staging note (2026-09-25 revision).
JOBS['cabin-forward'] = (BG + 'inside the front car of a driverless monorail, camera standing in the aisle at eye level looking forward along the car toward the large front window, '
    'long teal bench seats along both walls under side windows, hand straps, grab poles, '
    '(through the front window the concrete guideway beam runs ahead of the train and curves gently to the right across the sea toward a distant island city on the horizon:1.3), '
    'the train is high above the sea: through the side windows the horizon sits in the lower third, sky fills most of each window, the calm sea far below, '
    'low morning sun ahead through the front window, long light shapes on the floor, ' + MORNING,
    NOPPL + ', rails, railway tracks, waves at the window, boat, bed, sofa' + TOWER_NEG, 1216, 832, (301, 302, 303), (1824, 1248))
JOBS['mc-window3'] = (JOBS['mc-window2'][0].replace(
    '(outside the window: looking down from high above at the calm sea far below, the island city small on the horizon:1.3)',
    '(outside the window: looking down from high above at the calm sea far below, the concrete guideway beam curving ahead toward the island city small on the horizon:1.3)'),
    JOBS['mc-window2'][1], 1216, 832, (311, 312, 313), (1824, 1248))
JOBS['pano-curve'] = (BG + 'view from the side window of a train riding high above Tokyo Bay on a curving elevated guideway, window frame not visible, '
    '(the concrete guideway beam on tall pillars curves ahead across the sea toward a man-made island city of glass office towers on the horizon:1.3), '
    'the towers catching the low morning sun, the calm sea far below with sunlight glittering on the water, ' + MORNING,
    SEA_NEG + ', train, second beam, rails, window frame, interior' + TOWER_NEG, 1216, 832, (321, 322, 323), (1824, 1248))

# one change each: a two-car train (round 2 kept running off the frame edge or grew extra cars)
JOBS['bay-side3'] = (JOBS['bay-side2'][0].replace('(one short white three-car monorail train with a teal stripe', '(one short white two-car monorail train with a teal stripe'),
                     JOBS['bay-side2'][1], 1216, 832, (331, 332, 333, 334), (1824, 1248))
JOBS['oncoming3'] = (JOBS['oncoming2'][0].replace(TRAIN, TRAIN.replace('three-car', 'two-car').replace('exactly three cars', 'exactly two cars')),
                     JOBS['oncoming2'][1], 1216, 832, (341, 342, 343), (1824, 1248))

# Approved sprites (design fixed): refined at 2x with their original prompt at low denoise.
SPRITES = {
    'mc': 'art/production/M/02-it-guy-601.png',
    'emi': 'art/slice/emi2/r3/rdbt/work-41.png',
    'emi-laugh': 'art/slice/ch/emi-laughing.png',
    'mio': 'art/production/B/mio-bored.png',
    'mio-smirk': 'art/production/B/mio-smirk.png',
    'rei': 'art/production/B/rei-smirk.png',
    'aoi': 'art/production/B/aoi-grin.png',
    'kaori': 'art/production/B/kaori-smile.png',
    'kuro': 'art/production/A/luna-s101.png',
}


def sprite_prompt(src):
    """Original prompt from the embedded workflow or the manifest."""
    import json
    from PIL import Image
    info = Image.open(os.path.join(ROOT, src)).info
    if 'prompt' in info:
        wf = json.loads(info['prompt'])
        texts = [n['inputs']['text'] for n in wf.values() if n.get('class_type') == 'CLIPTextEncode']
        return texts[0], texts[1]
    raise RuntimeError('no prompt in ' + src)


if __name__ == '__main__':
    mode, args = sys.argv[1], sys.argv[2:]
    if mode == 'base':
        for k in args or list(JOBS):
            p, neg, w, h, seeds, _ = JOBS[k]
            for s in seeds:
                out = os.path.join(OUT, 'base', f'{k}-{s}.png')
                if not os.path.exists(out):
                    comfy_op.run(comfy_op.txt2img(p, neg, w, h, s), out)
                    print('ok', out, flush=True)
    elif mode == 'hires':
        for a in args:
            k, s = a.split(':')
            p, neg, w, h, _, hr = JOBS[k]
            dn = 0.35
            out = os.path.join(OUT, 'hires', f'{k}.png')
            comfy_op.run(comfy_op.txt2img(p, neg, w, h, int(s), hires=hr, denoise=dn), out)
            print('ok', out, flush=True)
    elif mode == 'sprites':
        for k in args or list(SPRITES):
            src = SPRITES[k]
            out = os.path.join(OUT, 'sprites', f'{k}.png')
            if os.path.exists(out):
                continue
            p, neg = sprite_prompt(src)
            comfy_op.run(comfy_op.refine(os.path.join(ROOT, src), p, neg, 1792, 2304, 5, denoise=0.28), out)
            print('ok', out, flush=True)
