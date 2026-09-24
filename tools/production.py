"""Art production run: new characters, cast expression sets, environments, story scenes. Anima family via ComfyUI.
Usage: ~/ai/sd/venv/bin/python tools/production.py <batch> [picks]
  batches: A-seeds, A-expr, B, C, D
Output: art/production/<batch>/<name>.png (gitignored) and art/production/manifest.json (name, model, prompt, ...)."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'art', 'production')
MANIFEST = os.path.join(OUT, 'manifest.json')
RDBT, JANIMA = 'rdbtAnima.safetensors', 'janima.safetensors'

STYLE = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart'
Q = f'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, {STYLE}'
N = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
     'missing fingers, extra fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, signature, '
     '3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli')
NO_PEOPLE_N = N + ', people, person, 1girl, 1boy, crowd, character'
FRAME = 'waist-up portrait facing the viewer at a slight angle, plain light grey background, soft even studio light'
MC = ('a 29-year-old Nordic man, messy sandy-blond hair, light blond eyebrows, fair pale skin, blue eyes, slim average build, no blush, '
      'white shirt with rolled sleeves, company lanyard')

# ---------------- A: new characters ----------------
NEW = {
    'saki': ('1girl', 'Saki, a 28-year-old woman who heads the company legal department: sleek platinum-blonde bob, a beauty mark under her left eye, sharp grey eyes, narrow refined face, black turtleneck dress, thin gold necklace, holding a leather folder in her left hand, arms loosely crossed',
             {'base': 'a dangerous, amused smile', 'smile': 'a dangerous, amused smile', 'cold': 'cold appraising stare', 'laugh': 'quiet laugh behind her hand', 'annoyed': 'annoyed narrowed eyes, lips pressed together'}),
    'luna': ('1girl', 'Luna, a 27-year-old night-shift receptionist: sleek black hair in a high bun held with two chopsticks, heavy black goth eyeliner, black cat-eye glasses with clear lenses, dark lipstick, company receptionist blazer over a black blouse, narrow face',
             {'base': 'bored sly half-smile', 'smile': 'bored sly half-smile', 'bored': 'bored, chin resting on her hand, half-lidded eyes', 'intrigued': 'intrigued raised eyebrow, leaning forward', 'surprised': 'surprised, glasses slipping down her nose'}),
    'ren': ('1girl', 'Dr. Ren Kagami, a 35-year-old woman who runs the robotics lab: wild untamed dark curls held back with welding goggles on her forehead, a smudge of oil on one cheek, stained white lab coat over a black tank top, a sleek metal prosthetic right arm she built herself',
            {'base': 'wide manic grin showing teeth', 'grin': 'wide manic grin showing teeth', 'focused': 'intensely focused, tongue poking out, squinting', 'excited': 'excited, sparkling eyes, both hands raised', 'deadpan': 'flat deadpan stare, unimpressed'}),
    'kiyoko': ('1girl', 'Kiyoko Madarame, a 56-year-old woman who leads an internal political faction: long elegant face, razor-sharp silver bob, dark red lipstick, black dress with a fur stole over her shoulders, holding a closed black folding fan in her right hand, mature older woman',
               {'base': 'calculating half-lidded eyes and a faint smile', 'smile': 'calculating half-lidded eyes and a faint smile', 'stern': 'stern, disapproving', 'amused': 'amused, fan held to her lips', 'cold': 'icy stare'}),
    'oguri': ('1boy', 'Oguri, a 33-year-old man, an ex-boxer who runs the company gym: broad square face, crooked broken nose, short buzzed hair, tattooed forearms, grey tank top under an open black track jacket, holding knitting needles with a half-finished pink scarf in both hands',
              {'base': 'soft kind eyes, gentle concentration', 'gentle': 'soft kind eyes, gentle smile', 'focused': 'concentrating hard on his knitting', 'laugh': 'big hearty laugh', 'embarrassed': 'embarrassed, scratching the back of his head'}),
    'nanami': ('1girl', 'Nanami, a 29-year-old company security officer: tall and athletic, neat side-swept short black hair, navy company security uniform with a radio clipped to her chest, a clipboard held in her left hand, round face with a strong brow',
               {'base': 'serious expression with a faint blush', 'serious': 'serious, professional', 'blush': 'flustered, cheeks turning red, looking away', 'smile': 'small shy smile', 'stern': 'stern, one hand raised to stop you'}),
    'mc': ('1boy', f'the main character: {MC}, black backpack over one shoulder',
           {'base': 'friendly, slightly nervous smile', 'neutral': 'calm neutral expression', 'smile': 'friendly open smile', 'nervous': 'nervous, sweat drop, awkward smile', 'magic': 'focused and secretive, eyes glowing faint cyan, one hand slightly raised, faint cyan light around his fingers'}),
}

# ---------------- B: existing cast expression sets (designs from slice_assets / days25_assets) ----------------
CAST = {
    'mio': ('1girl', 'Mio, a 25-year-old woman: messy black hair with green underneath in a loose bun, glasses with clear lenses, oversized black hoodie, headphones around her neck, company lanyard',
            {'bored': 'bored deadpan expression, half-lidded eyes', 'smirk': 'small teasing smirk', 'suspicious': 'narrowed eyes, suspicious look', 'surprised': 'surprised, eyes wide behind her glasses', 'soft': 'soft, rare genuine smile, faint blush'}),
    'rei': ('1girl', 'Rei, a 26-year-old woman: long silver-grey hair in a sleek high ponytail, steel-grey eyes, sharp eyeliner, gold hoop earrings, tailored white suit over a black shirt, gold pin on the lapel, narrow refined face, high cheekbones',
            {'cold': 'cold unimpressed stare, chin raised', 'smirk': 'thin knowing smile, looking down at the viewer', 'confused': 'confused, blinking', 'angry': 'sharp angry glare', 'soft': 'caught off guard, a small real smile'}),
    'aoi': ('1girl', 'Aoi, a 22-year-old graduate intern: shoulder-length pink-dyed hair with dark roots, oversized varsity jacket over a crop top, company lanyard, cheeky energetic face',
            {'grin': 'big cheeky grin, one eye winking', 'panic': 'panicked wide eyes, hands raised, sweat drop', 'crying': 'teary eyes, trembling lip', 'pout': 'pouting, arms crossed', 'excited': 'excited, fists pumped'}),
    'yuzuki': ('1girl', 'Yuzuki, a 31-year-old company PR spokeswoman: glossy wavy chestnut hair, elegant makeup, pearl earrings, fitted cream blouse, mature face with high cheekbones',
               {'smile': 'flawless practised smile', 'serious': 'serious focused expression', 'tired': 'tired eyes, weary faint smile', 'laugh': 'real unguarded laugh', 'surprised': 'surprised, hand to her chest'}),
    'kaori': ('1girl', 'Kaori, a 44-year-old canteen head chef: tall, short grey-streaked hair, white chef jacket with rolled sleeves, faded tattoo on her forearm, towel over her shoulder',
              {'smile': 'calm amused smile', 'stern': 'stern, arms crossed', 'laugh': 'dry laugh', 'wink': 'knowing wink', 'tired': 'tired after the lunch rush'}),
    'goro': ('1boy', 'Goro, a 61-year-old gentle retired engineer: thick round glasses with clear lenses, white stubble, beige cardigan over a checked shirt, gardening gloves',
             {'smile': 'warm crinkly-eyed smile', 'thinking': 'thoughtful, hand on chin', 'sad': 'quiet sad look', 'laugh': 'delighted laugh', 'surprised': 'surprised, eyebrows up'}),
    'jun': ('1boy', 'Jun, a 40-year-old bartender: long black hair tied back, a scar through one eyebrow, black waistcoat over a white shirt with rolled sleeves',
            {'neutral': 'calm knowing half-smile', 'smile': 'warm smile', 'serious': 'serious, quiet', 'amused': 'amused, one eyebrow raised', 'listening': 'listening, head slightly tilted'}),
    'ishibashi': ('1boy', 'The gate guard Ishibashi, a wiry Japanese man in his sixties: neat grey pencil moustache, bushy eyebrows, glasses with clear lenses on a chain, navy security uniform and peaked cap, arms folded',
                  {'neutral': 'flat unimpressed expression', 'suspicious': 'squinting suspiciously over his glasses', 'angry': 'angry shout', 'surprised': 'startled, eyes wide', 'approving': 'grudging approving nod'}),
}

# ---------------- C: environments ----------------
ENV = {
    'mc_dorm': 'the main character\'s small company dorm room, a single bed, a desk with a laptop and a Japanese textbook, a suitcase not yet unpacked, a window with the company towers outside, morning light, dominant soft white, broad light wood, sparse blue accents',
    'gym': 'a company gym, rows of treadmills and weight racks, a boxing ring in the corner with a heavy bag, big windows, bright afternoon light, dominant grey and black, broad steel, sparse red accents',
    'robotics_lab': 'a cluttered robotics lab, half-built robot arms on workbenches, tangled cables, soldering stations, glowing monitors with schematics, dominant dark teal, broad cool monitor glow, sparse orange warning-light accents',
    'lecture_hall': 'a modern university lecture hall inside the company campus, tiered wooden seats, a big projection screen, afternoon light through tall windows, dominant warm wood, broad white, sparse green accents',
    'library': 'a quiet company library, tall wooden shelves, reading desks with green lamps, a spiral staircase, soft evening light, dominant dark wood and green, broad warm lamplight, sparse gold accents',
    'promenade': 'a seaside promenade on the company island, a railing along the water, palm trees and benches, the bay and the mainland skyline across the water, sunrise, dominant pale gold and pink, broad soft blue, sparse white accents',
    'station': 'an elevated monorail station platform, a sleek white monorail train waiting at the platform with open doors, platform screen doors, signs without readable text, morning commuter light, dominant white and silver, broad sky blue, sparse orange accents',
    'konbini': 'a Japanese convenience store at night seen from the street, bright fluorescent interior, shelves of snacks, a magazine rack by the window, an umbrella stand, wet pavement outside reflecting the lights, dominant white and green, broad dark blue night, sparse warm accents',
    'izakaya': 'a cosy izakaya interior, a wooden counter with stools, hanging red paper lanterns, handwritten menu strips on the wall without readable text, steam from the kitchen, dominant warm wood and red, broad amber light, sparse white accents',
    'festival': 'a summer festival street at night, rows of food stalls, strings of glowing paper lanterns overhead, a torii in the distance, fireworks starting in the sky, dominant deep navy, broad warm lantern orange, sparse pink and gold accents',
    'onsen': 'an outdoor onsen at dusk, a steaming rock-lined hot spring, a wooden fence, stone lanterns, maple trees with red leaves, mountains in the distance, dominant warm dusk orange, broad deep blue shadow, sparse lantern gold accents',
    'exec_office': 'a huge executive office on the top floor of a corporate tower, a dark wood desk, leather chairs, a panoramic window over the whole company city at night, a bonsai, dominant charcoal and dark wood, broad city-light blue, sparse gold accents',
    'rooftop_night': 'a rooftop vegetable garden on a corporate tower at night, raised beds, a small shed with a lamp, a bench, the city lights and the dark bay behind, dominant deep navy, broad warm lamp glow, sparse red tomato accents',
    'server_room': 'a dark server room, rows of server racks with blinking blue and green lights, cable trays overhead, a cold aisle, dominant black and cold blue, broad cyan glow, sparse green status-light accents',
    'pr_studio': 'a corporate PR studio, a small stage with a branded backdrop without text, softbox lights, a camera on a tripod, two armchairs, bright clean light, dominant white and blush pink, broad light grey, sparse gold accents',
}
TOD = {
    'office': 'a cluttered basement office for a small misfit team, mismatched desks, stacks of files, monitors, a whiteboard with scribbles, a coffee machine, plants under a high narrow window',
    'canteen': 'a huge staff canteen, long tables, a serving counter with steaming pots, a blank menu board on the wall, big windows onto the bay',
    'rooftop': 'a rooftop vegetable garden on a corporate tower, raised beds with tomato plants, a small shed, a bench, the city skyline and the bay behind',
}
LIGHT = {
    'day': 'bright daylight, crisp shadows, dominant fresh natural colours, broad white, sparse green accents',
    'evening': 'golden evening light, long warm shadows, dominant amber and orange, broad soft purple, sparse gold accents',
    'night': 'night, lamplight and city lights, dominant deep navy, broad warm lamp glow, sparse cool blue accents',
}

# ---------------- D: story scenes ----------------
MIO = 'Mio: a 25-year-old woman, messy black hair with green underneath in a loose bun, glasses with clear lenses, oversized black hoodie'
EMI = 'Emi: a 32-year-old woman, auburn shoulder-length bob with side-swept bangs, brown tortoiseshell glasses with clear lenses, cream blouse and charcoal pencil skirt, curvy'
REI = 'Rei: a 26-year-old woman, long silver-grey hair in a high ponytail, steel-grey eyes, gold hoop earrings, tailored white suit over a black shirt'
AOI = 'Aoi: a 22-year-old woman, shoulder-length pink-dyed hair with dark roots, oversized varsity jacket over a crop top'
YUZ = 'Yuzuki: a 31-year-old woman, glossy wavy chestnut hair, pearl earrings, fitted cream blouse'
ISH = 'Ishibashi: a wiry old security guard, grey pencil moustache, glasses on a chain, navy uniform and peaked cap'
SCENES = {
    'copier_crisis': ('1boy, 1girl', f'main character: {MC}, one hand raised toward the copier, lips moving as he whispers, faint cyan light around his fingers; {AOI}, standing beside him holding a stack of jammed paper in both hands, staring at the copier in disbelief; a big grey office copier suddenly printing at full speed, pages flying out; medium shot, the copier in the centre, the main character on the left, Aoi on the right, a cramped copy room, fluorescent light, dominant grey, broad cool white, sparse cyan magic accents'),
    'meeting_late': ('1boy, 1girl, multiple boys', f'main character: {MC}, standing in the open doorway holding a stack of papers, frozen; {EMI}, sitting at the table, turning to look at him; five office workers seated around a white table, all turning their heads toward the door; wide shot from inside the room toward the door, a small meeting room with a whiteboard, cool daylight, dominant white and steel grey, sparse green accents'),
    'rooftop_goro': ('1boy, 1boy', f'main character: {MC}, crouching, holding a watering can in his right hand; Goro: a 61-year-old man, thick round glasses with clear lenses, white stubble, beige cardigan, gardening gloves, kneeling beside a drooping tomato plant, talking to it gently; both facing the plant, rooftop vegetable garden at golden hour, city skyline behind, dominant warm gold and green, sparse red tomato accents'),
    'elevator_rei': ('1boy, 1girl', f'main character: {MC}, running toward the closing elevator doors, one arm reaching out; {REI}, inside the elevator, holding a business card between two fingers of her right hand, a cool knowing smile, looking at him through the narrowing gap; eye-level shot from the corridor, polished steel elevator doors, cool office light, dominant steel grey, sparse gold accents'),
    'coffee_rei': ('1boy, 1girl', f'main character: {MC}, sitting across a small round café table, holding a coffee cup in both hands, nervous; {REI}, sitting opposite, legs crossed, stirring her espresso with a small spoon in her right hand, looking straight at him with a thin smile; medium shot across the table from the side, a stylish café in a tower with big windows onto the bay, afternoon light, dominant warm wood and cream, broad soft green, sparse brass accents'),
    'storage_spell': ('1boy', f'main character: {MC}, crouching at a locked storage room door, his right palm pressed to the lock, eyes glowing faint cyan, glancing nervously down the corridor; at the far end of the dim corridor, the silhouette of a security guard with a peaked cap walking this way with a flashlight; low angle from the floor, dim basement corridor, flickering fluorescent tube, dominant cold grey, sparse cyan magic and yellow flashlight accents'),
    'aoi_relief': ('1boy, 1girl', f'{AOI}, sitting on the office floor with her back against a desk, crying with relief, hugging a laptop to her chest; main character: {MC}, crouching beside her, handing her a tissue with his right hand, gentle smile; late afternoon sun through a high window, a cluttered basement office, dominant warm amber, broad olive, sparse soft pink accents'),
    'memo_glimpse': ('1boy, 1girl', f'{EMI}, alone at her desk late at night, turning a single sheet of paper face down with her right hand, startled, looking up; main character: {MC}, standing in the doorway holding a folded umbrella, surprised; the dark basement office lit only by her desk lamp, dominant deep shadow, broad warm lamp glow, sparse cool monitor-blue accents'),
    'interview': ('1boy, 2girls', f'{YUZ}, sitting in an armchair on a small interview set, holding a microphone in her right hand toward {AOI}, who sits in the other armchair, pale and nervous, gripping her knees; main character: {MC}, standing behind the camera at the side, watching with concern; bright softbox lighting, a PR studio, dominant white and blush pink, sparse gold accents'),
    'review': ('1boy, 1girl', f'{EMI}, sitting at a desk with an open notebook, pen in her right hand, reading glasses on, a warm but serious look; main character: {MC}, sitting across from her, back straight, nervous; medium shot from the side, a small meeting room, soft afternoon light, dominant warm cream, broad light wood, sparse red accents'),
    'friday_drinks': ('1boy, 3girls', f'main character: {MC}, raising a beer glass in his right hand; {MIO}, raising a can of cola, deadpan; {AOI}, holding a huge sweet parfait, delighted; {EMI}, laughing, raising a highball glass; all four around a small izakaya table in a toast, seen from the table\'s end, warm red paper lanterns, dominant warm wood and red, broad amber light'),
    'mio_gamenight': ('1boy, 1girl', f'{MIO}, fully clothed, fast asleep with her head resting on the main character\'s shoulder, loosely holding a game controller in her lap; main character: {MC} in a t-shirt, sitting very still so as not to wake her, gentle smile; both on a sofa facing a TV glowing with a paused game, energy drink cans on the table, fairy lights, dominant deep navy, broad warm TV glow, sparse pink and green accents, cosy'),
    'gate_stop': ('1boy, 1boy', f'{ISH}, stepping in front of a glass turnstile with one hand raised, stern; main character: {MC}, holding out his ID card in his right hand, awkward smile; morning rush of office workers in suits flowing past in the background, facing forward, glass atrium lobby, bright cold morning light, dominant white and steel blue, sparse yellow accents'),
    'festival': ('1boy, 3girls', f'main character: {MC} in a dark blue yukata; {MIO} in a black yukata with green obi, eating takoyaki from a small tray held in her left hand; {AOI} in a pink yukata, pointing up at the sky; {EMI} in a navy yukata with white flowers, looking up and smiling; all four standing together on a festival street at night, turned toward the fireworks, seen from behind at a three-quarter angle, rows of lantern-lit stalls, fireworks bursting overhead, dominant deep navy, broad warm lantern orange, sparse pink and gold accents'),
    'rooftop_confession': ('1boy, 1girl', f'{MIO}, standing by the rooftop railing at night, hands buried in her hoodie pocket, looking away, cheeks faintly red; main character: {MC}, standing a step away, facing her, earnest; the city lights and dark bay behind them, medium shot from the side, a small shed lamp glowing, dominant deep navy, broad warm lamp glow, sparse city-light gold accents, quiet and tense'),
    'retreat_cabin': ('1boy, 4girls, 2boys', f'a company retreat at a wooden mountain cabin at golden hour: on the wooden deck, {ISH} grilling skewers at a barbecue, wearing an apron over his uniform shirt; {EMI} and {AOI} sitting at a picnic table laughing; {MIO} lying in a hammock with a handheld console; {REI} leaning on the railing with a glass of wine, looking at the view; Goro, an old man in a cardigan, carrying a basket of vegetables; main character: {MC}, standing at the grill next to Ishibashi holding a plate; wide shot, pine forest and mountain peaks behind, dominant warm golden light, broad pine green, sparse red and white accents'),
    'sports_day': ('1boy, 2girls, crowd', f'company sports day relay race on a sports field: main character: {MC} in a white t-shirt and red headband, sprinting, reaching back with his right hand to take a baton from {AOI} in a gym t-shirt and shorts, running hard; {REI} in a sports jacket watching from the finish line with arms crossed; a crowd of employees cheering behind a rope, colourful flags, dynamic low angle, bright summer sun, dominant green and white, sparse red and yellow accents'),
    'luna_night': ('1boy, 1girl', f'Luna: a 27-year-old night receptionist, black hair in a bun with chopsticks, goth eyeliner, black cat-eye glasses with clear lenses, leaning on the reception desk painting her nails black, looking up at the main character with a sly smile; main character: {MC}, standing at the desk late at night holding a forgotten umbrella; empty dark lobby, one desk lamp, dominant deep blue, broad warm lamp glow, sparse purple accents'),
    'lab_visit': ('1boy, 1girl', f'Dr. Ren Kagami: a 35-year-old woman with wild dark curls, welding goggles on her forehead, stained lab coat, a metal prosthetic right arm, holding up a small glowing robot in her prosthetic hand, manic grin; main character: {MC}, stepping back in alarm, sparks flying from a workbench; cluttered robotics lab, dominant dark teal, broad monitor glow, sparse orange spark accents'),
    'rain_umbrella': ('1boy, 1girl', f'{EMI} and main character: {MC}, walking side by side under one shared umbrella held by him in his right hand, rain pouring, Emi laughing and holding her bag over her head for extra cover; a seaside promenade at night with street lights reflecting on the wet ground, medium shot from the front, dominant deep blue, broad warm street-light amber, sparse white rain highlights'),
}


def load_manifest():
    try:
        return json.load(open(MANIFEST))
    except Exception:
        return []


def run(batch, name, prompt, negative, w, h, seed, model):
    path = os.path.join(OUT, batch, f'{name}.png')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        return
    t = time.time()
    try:
        comfy.run(comfy.anima(prompt, negative, model=model, w=w, h=h, steps=30, cfg=5, seed=seed), path)
        m = [e for e in load_manifest() if not (e['batch'] == batch and e['name'] == name)]
        m.append({'batch': batch, 'name': name, 'model': model.replace('.safetensors', ''), 'prompt': prompt, 'negative': negative,
                  'seed': seed, 'w': w, 'h': h, 'file': f'{batch}/{name}.png', 't': round(time.time() - t)})
        json.dump(m, open(MANIFEST, 'w'), ensure_ascii=False, indent=1)
        print('ok', batch, name, round(time.time() - t), 's', flush=True)
    except Exception as e:
        print('FAIL', batch, name, str(e)[:200], flush=True)


def portrait(tags, desc, expr):
    return f'{Q}, safe, {tags}, solo, {desc}, {expr}, {FRAME}'


if __name__ == '__main__':
    batch = sys.argv[1]
    if batch == 'A-seeds':
        for k, (tags, desc, ex) in NEW.items():
            for seed in (101, 102):
                run('A', f'{k}-s{seed}', portrait(tags, desc, ex['base']), N, 896, 1152, seed, RDBT)
    elif batch == 'A-expr':
        picks = json.loads(sys.argv[2])
        for k, (tags, desc, ex) in NEW.items():
            for e, text in ex.items():
                if e != 'base':
                    run('A', f'{k}-{e}', portrait(tags, desc, text), N, 896, 1152, picks.get(k, 101), RDBT)
    elif batch == 'B':
        for i, (k, (tags, desc, ex)) in enumerate(CAST.items()):
            for e, text in ex.items():
                run('B', f'{k}-{e}', portrait(tags, desc, text), N, 896, 1152, 201 + i, RDBT)
    elif batch == 'C':
        for k, text in ENV.items():
            run('C', k, f'{Q}, safe, no humans, scenery, {text}', NO_PEOPLE_N, 1216, 832, 301, RDBT)
        for k, text in TOD.items():
            for t, light in LIGHT.items():
                run('C', f'{k}-{t}', f'{Q}, safe, no humans, scenery, {text}, {light}', NO_PEOPLE_N, 1216, 832, 302, RDBT)
    elif batch == 'D':
        for k, (tags, text) in SCENES.items():
            for model, tag in ((RDBT, 'rdbt'), (JANIMA, 'janima')):
                run('D', f'{k}-{tag}', f'{Q}, safe, {tags}, {text}', N, 1216, 832, 401, model)
