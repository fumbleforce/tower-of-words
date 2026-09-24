"""Days 2-5 art: new backgrounds, Aoi / Yuzuki / secretary sprites, and the mio_gamenight reward CG. Anima via ComfyUI.
Reuses Q, N, NO_PEOPLE_N, FRAME and go() from slice_assets.py."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import comfy
from slice_assets import Q, N, NO_PEOPLE_N, FRAME, OUT, go

BG = {
    'dorm': 'no humans, scenery, a small company dormitory room, single bed with a rumpled duvet, a desk with a laptop, a window with the company towers outside, morning light through thin curtains, dominant soft white and pale blue, broad light wood, sparse warm sunlight accents',
    'copyroom': 'no humans, scenery, a cramped office copy room, a big grey multifunction copier with a blinking panel, paper reams stacked on shelves, a jammed paper tray, fluorescent ceiling light, dominant grey and beige, broad cool white, sparse red warning-light accents',
    'meeting': 'no humans, scenery, a small corporate meeting room, a white table with six chairs, a whiteboard, a wall screen, glass wall to the corridor, cool even daylight, dominant white and steel grey, broad pale blue, sparse green plant accents',
    'cafe': 'no humans, scenery, a stylish cafe inside a corporate tower, wooden counter with an espresso machine, small round tables, hanging pendant lamps, big windows onto the bay, afternoon light, dominant warm wood and cream, broad soft green, sparse brass accents',
    'storage': 'no humans, scenery, a basement storage room, tall metal shelves with labelled cardboard boxes, a flickering fluorescent tube, a locked cabinet, dusty concrete floor, dim cool light, dominant grey and concrete, broad muted blue shadow, sparse yellow label accents',
    'execfloor': 'no humans, scenery, the executive floor corridor of a corporate tower, thick carpet, dark wood panelling, a reception desk, framed paintings, panoramic windows over the city, hushed warm lighting, dominant dark wood and charcoal, broad cream, sparse gold accents',
    'pr': 'no humans, scenery, a corporate public relations office, a small interview set with two armchairs and softbox lights, a wall of framed magazine covers without text, bright clean light, dominant white and blush pink, broad light grey, sparse gold accents',
    'mio_room': 'no humans, scenery, a gamer girl\'s messy dorm room at night, a sofa facing a big TV with a game on screen, controllers, energy drink cans, a gaming PC with RGB lights, posters without text, fairy lights, dominant deep navy and purple, broad warm lamp glow, sparse neon green accents',
}
CH = {
    'aoi': (12, 'Aoi, a 22-year-old graduate intern: shoulder-length pink-dyed hair with dark roots, oversized varsity jacket over a crop top, company lanyard, cheeky energetic face',
            {'grin': 'big cheeky grin, one eye winking', 'panic': 'panicked wide eyes, hands raised, sweat drop'}),
    'yuzuki': (13, 'Yuzuki, a 31-year-old company PR spokeswoman: glossy wavy chestnut hair, elegant makeup, pearl earrings, fitted cream blouse, mature face with high cheekbones',
               {'smile': 'flawless practised smile', 'serious': 'serious focused expression', 'tired': 'tired eyes, weary faint smile, shoulders slightly slumped'}),
    'secretary': (14, 'An executive secretary in her forties: neat dark bun, thin-framed glasses, navy skirt suit, holding a tablet, composed',
                  {'neutral': 'polite neutral expression'}),
}
REWARD = (f'{Q.replace(", safe", "")}, sensitive, 1boy, 1girl, '
          'Mio: a 25-year-old woman with messy black hair with green underneath in a loose bun and glasses pushed up, loose oversized black hoodie and sweatpants, fully clothed, fast asleep with her head resting on the man\'s shoulder, still loosely holding a game controller, peaceful face; '
          'the man: a 29-year-old Nordic man with messy sandy-blond hair and light stubble, t-shirt, sitting still so as not to wake her, gentle surprised smile; '
          'both sitting close together on a sofa, medium shot from the front slightly to the side, '
          'a messy dorm room at night, a big TV glowing with a paused game, energy drink cans, fairy lights, '
          'dominant deep navy shadow, broad warm TV glow on their faces, sparse soft pink and green fairy-light accents, cosy intimate mood')
REWARD_N = N + ', nude, nsfw, cleavage, underwear'

if __name__ == '__main__' and 'mono' not in sys.argv:
    for name, text in BG.items():
        go(os.path.join(OUT, 'bg', f'{name}.png'), comfy.anima(f'{Q}, {text}', NO_PEOPLE_N, w=1216, h=832, seed=31))
    for ch, (seed, desc, exprs) in CH.items():
        for expr, e in exprs.items():
            go(os.path.join(OUT, 'ch', f'{ch}-{expr}.png'),
               comfy.anima(f'{Q}, 1girl, solo, {desc}, {e}, {FRAME}', N, w=896, h=1152, seed=seed))
    go(os.path.join(OUT, 'reward', 'mio_gamenight.png'), comfy.anima(REWARD, REWARD_N, w=1216, h=832, seed=41))

MONO = {
    'monorail-v2': 'no humans, scenery, interior of a sleek modern monorail carriage running on an elevated concrete guideway high above the sea, (through the large windows the concrete track and its tall support pillars are visible below:1.4), a corporate city of glass towers on an island straight ahead, empty seats, hand straps, bright morning sun, dominant pale blue and white, broad silver, sparse warm sunlight accents',
    'monorail-ext': 'no humans, scenery, exterior wide shot, a sleek white monorail train on a (tall concrete viaduct with support pillars rising out of the water:1.4), crossing the bay toward a corporate island city of glass towers, early morning sun, light mist on the water, dominant pale blue sky and sea, broad white and silver, sparse warm sunrise accents',
}
if __name__ == '__main__' and 'mono' in sys.argv:
    for name, text in MONO.items():
        for seed in (31, 32):
            go(os.path.join(OUT, 'bg', f'{name}-{seed}.png'), comfy.anima(f'{Q}, {text}', NO_PEOPLE_N, w=1216, h=832, seed=seed))
