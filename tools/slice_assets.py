"""Day-1 slice art: empty backgrounds and character sprites (expressions share a seed per character), Anima via ComfyUI.
Output: art/slice/bg/<name>.png, art/slice/ch/<char>-<expr>.png"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'slice')
Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe'
N = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
     'missing fingers, extra fingers, long fingernails, claws, extra limbs, text, watermark, signature, child, loli')
NO_PEOPLE_N = N + ', people, person, 1girl, 1boy, crowd'

BG = {
    'monorail': 'no humans, scenery, interior of a sleek modern monorail carriage, empty seats, hand straps, large windows showing a corporate city of glass towers on an island across the sea, bright morning sun, dominant pale blue and white, broad silver, sparse warm sunlight accents, soft light',
    'gate': 'no humans, scenery, the huge glass atrium lobby of a corporate headquarters, rows of glass security turnstiles, a small guard booth with a coffee mug and a folded newspaper, empty, bright cold morning light from the glass roof, crisp shadows, white and steel blue, sparse yellow accents',
    'elevator': 'no humans, scenery, an elevator hall in a corporate tower, two brushed-steel elevator doors, a large blank wall panel between them, polished floor, potted plant, cool even office light, grey and steel blue, sparse warm wood accents',
    'office': 'no humans, scenery, a cluttered basement office for a small misfit team, mismatched desks, stacks of files, monitors, a whiteboard with scribbles, a coffee machine, plants under a high narrow window, warm desk-lamp light, olive and brown, sparse green accents',
    'sales': 'no humans, scenery, a bright open-plan sales floor high in a corporate tower, rows of tidy white desks, glass walls, a city skyline, award plaques, crisp daylight, white and silver, sparse gold accents',
    'canteen': 'no humans, scenery, a huge staff canteen at lunchtime, long tables, a serving counter with steaming pots, a blank menu board on the wall, big windows onto the bay, noon sunlight, warm cream and light wood, sparse green accents',
    'rooftop': 'no humans, scenery, a rooftop vegetable garden on a corporate tower, raised beds with tomato plants, a small shed, a bench, the city skyline and the bay behind, golden hour, green and warm gold, sparse red tomato accents',
    'bar': 'no humans, scenery, a small quiet bar at night, dark wood counter, a few stools, backlit shelves of bottles, rain on the window, warm amber lamplight, deep brown and gold, sparse blue rain light',
}

FRAME = 'waist-up portrait facing the viewer at a slight angle, plain light grey background, soft even studio light'
CH = {
    'ishibashi': (5, 'The gate guard, a wiry Japanese man in his sixties: neat grey pencil moustache, bushy eyebrows, glasses on a chain, navy security uniform and peaked cap, arms folded',
                  {'neutral': 'flat unimpressed expression', 'suspicious': 'squinting suspiciously over his glasses'}),
    'mio': (6, 'Mio, a 25-year-old woman: messy black hair with green underneath in a loose bun, glasses, oversized black hoodie, headphones around her neck, company lanyard',
            {'bored': 'bored deadpan expression, half-lidded eyes', 'smirk': 'small teasing smirk', 'suspicious': 'narrowed eyes, suspicious look'}),
    'emi': (7, 'Emi, a 32-year-old woman: wavy dark-brown hair in a claw clip, red-framed glasses, white shirt with rolled sleeves, company lanyard, mature face with high cheekbones',
            {'smile': 'warm easy smile', 'surprised': 'surprised, eyebrows raised, mouth slightly open', 'smirk': 'lazy knowing smirk, arms crossed'}),
    'rei': (8, 'Rei, a 26-year-old woman: long silver-grey hair in a sleek high ponytail, sharp eyeliner, gold hoop earrings, tailored white suit over a black shirt, gold pin on the lapel, narrow refined face, high cheekbones',
            {'cold': 'cold unimpressed stare, chin raised', 'confused': 'confused, blinking, faint blush', 'smirk': 'thin knowing smile, looking down at the viewer'}),
    'kaori': (9, 'Kaori, a 44-year-old canteen head chef: tall, short grey-streaked hair, white chef jacket with rolled sleeves, faded tattoo on her forearm, towel over her shoulder',
              {'smile': 'calm amused smile'}),
    'goro': (10, 'Goro, a 61-year-old gentle retired engineer: thick round glasses, white stubble, beige cardigan over a checked shirt, gardening gloves',
             {'smile': 'warm crinkly-eyed smile'}),
    'jun': (11, 'Jun, a 40-year-old bartender: long black hair tied back, a scar through one eyebrow, black waistcoat over a white shirt with rolled sleeves',
            {'neutral': 'calm knowing half-smile'}),
}


def go(path, wf):
    if os.path.exists(path):
        return
    t = time.time()
    try:
        comfy.run(wf, path)
        print('ok', os.path.basename(path), round(time.time() - t), 's', flush=True)
    except Exception as e:
        print('FAIL', path, str(e)[:200], flush=True)


if __name__ == '__main__':
    for name, text in BG.items():
        go(os.path.join(OUT, 'bg', f'{name}.png'), comfy.anima(f'{Q}, {text}', NO_PEOPLE_N, w=1216, h=832, seed=31))
    for ch, (seed, desc, exprs) in CH.items():
        for expr, e in exprs.items():
            go(os.path.join(OUT, 'ch', f'{ch}-{expr}.png'),
               comfy.anima(f'{Q}, 1{"boy" if ch in ("ishibashi", "goro", "jun") else "girl"}, solo, {desc}, {e}, {FRAME}', N, w=896, h=1152, seed=seed))
