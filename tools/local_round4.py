"""Round 4: the round-3 scenes rewritten with the structured prompt template, Anima only.
Template: quality/rating, cast count, one block per character, relations, camera/composition, environment, palette/lighting."""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'company', 'local4')
Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic'
N = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, bad anatomy, bad hands, '
     'missing fingers, extra fingers, long fingernails, claws, merged limbs, extra person, text, watermark, child, loli')
MC = 'a 29-year-old Nordic man, messy sandy-blond hair, light stubble, blue eyes, white shirt with rolled sleeves, company lanyard'

SCENES = {
    'island': (1216, 832, f'''{Q}, safe, no humans, scenery,
Amakawa City, a corporate city on a man-made island in Tokyo Bay: glass office towers clustered around one tall central headquarters tower, low dorm blocks, a factory district with chimneys on the left, a long monorail bridge curving in from the mainland on the right with a white monorail train on it,
high aerial view from the mainland shore, wide shot, the island filling the centre third,
dusk, the sun setting behind the towers, city lights just coming on, reflections on calm water,
dominant deep violet and warm orange, teal water, sparse gold window lights'''),
    'crowd': (1216, 832, f'''{Q}, safe, 1boy focus, crowd,
main character: {MC}, black backpack, nervous half-smile, looking around;
guard: a wiry old security guard, grey pencil moustache, bushy eyebrows, glasses on a chain, navy uniform and peaked cap, arms folded;
the main character walks toward the viewer through a glass turnstile in the middle of a dense stream of office workers in dark suits, (the old guard stands at the right edge of the frame watching him suspiciously:1.4),
eye-level medium-wide shot, main character in the centre, the crowd softly blurred behind him,
the huge glass atrium lobby of a corporate headquarters, rows of turnstiles, morning,
bright cold morning light from the glass roof, crisp shadows, white and steel blue, sparse yellow accents'''),
    'canteen': (1216, 832, f'''{Q}, safe, 1boy, 2girls, crowd,
main character: {MC}, holding a lunch tray with curry, looking for a seat;
chef: a tall calm woman in her forties, short grey-streaked hair, white chef jacket with rolled sleeves, faded tattoo on her forearm, ladling curry;
Mio: a 25-year-old woman, messy black hair with green underneath in a bun, glasses, black hoodie, sitting, lazily waving him over;
the main character in the left foreground seen from the side, (the chef behind the serving counter on the left:1.3), (Mio sitting at a table on the right waving at him:1.4),
eye-level wide shot,
a huge staff canteen at lunchtime, long tables full of employees, big windows onto the bay,
noon sunlight, warm cream, light wood and green, lively'''),
    'meeting': (1216, 832, f'''{Q}, safe, 1boy focus, 1girl, multiple boys,
main character: {MC}, standing, one hand pointing at a projector screen with a rising sales chart, mid-sentence, sweat drop, nervous;
Rei: a 26-year-old woman, long silver-grey hair in a high ponytail, gold hoop earrings, sharp eyeliner, tailored white suit over a black shirt, leaning back in her chair, arms crossed, knowing smirk, looking at him;
executives: four stern older men in dark suits seated along a long table;
(Rei sits in the right foreground closest to the viewer:1.4), the main character stands at the far end of the table beside the screen, executives along both sides,
low angle over the table from Rei's side, medium-wide shot,
a glass-walled boardroom high in a tower, city skyline,
cold overhead office light, warm sunset glow through the glass behind the main character, charcoal and steel blue, gold rim light'''),
    'magic': (1216, 832, f'''{Q}, safe, 1boy, 1girl,
main character: {MC}, sitting at his desk, right hand raised with fingers slightly spread, eyes glowing faint cyan, focused and secretive;
Emi: a 32-year-old woman, wavy brown hair in a claw clip, white shirt, writing on a whiteboard, (seen from behind, back turned, unaware:1.4);
dozens of sheets of paper lift from messy stacks and fly in an arc into open folders, (glowing cyan Japanese kanji characters floating in the air around the papers:1.5), light particles,
the main character in the left foreground in three-quarter view, Emi at the whiteboard in the right background,
a cluttered basement office, mismatched desks, file stacks, plants under a high narrow window,
warm desk-lamp light, olive and brown, the cyan magic glow as the only cool colour'''),
    'mc': (896, 1152, f'''{Q}, safe, 1boy, solo,
main character: {MC}, black backpack over one shoulder, holding a smartphone, friendly slightly nervous smile, looking at viewer,
waist-up portrait, slight three-quarter angle, plain light grey background, soft studio light'''),
    'bar': (1216, 832, f'''{Q}, safe, 2boys,
main character: {MC}, tie loosened, sitting at the bar counter, chin resting on one hand, a glass of whisky in front of him, tired but amused;
Jun: a 40-year-old bartender, long black hair tied back, a scar through one eyebrow, black waistcoat over a white shirt with rolled sleeves, polishing a glass, calm knowing half-smile, looking at the main character;
the main character on the left at the counter seen from the side, Jun behind the counter on the right facing him,
eye-level medium shot across the counter,
a small quiet bar at night, dark wood counter, backlit shelves of bottles, rain streaking the window behind,
warm amber lamplight, deep brown and gold, blue rain light from the window'''),
}

if __name__ == '__main__':
    for seed in (11, 22):
        for scene, (w, h, prompt) in SCENES.items():
            path = os.path.join(OUT, f'{scene}-{seed}.png')
            if os.path.exists(path):
                continue
            t = time.time()
            try:
                comfy.run(comfy.anima(prompt, N, w=w, h=h, steps=30, cfg=5, seed=seed), path)
                print('ok', scene, seed, round(time.time() - t), 's', flush=True)
            except Exception as e:
                print('FAIL', scene, seed, str(e)[:200], flush=True)
