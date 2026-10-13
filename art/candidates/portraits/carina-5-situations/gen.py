"""carina-situations-1: Carina option 5 (carina-3, glossy cut, light blue eyes) in ten situations of the game's world.
Identity line copied verbatim from carina-3/prompts-v4.json option 5; only scene, outfit and pose change.
Recipe: RDBT Anima, euler_ancestral, 30 steps, CFG 5 (tools/production.py run). Usage: python gen.py [ONLY=1,2] [REROLL=1]"""
import sys, os, json, time, subprocess
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
src = json.load(open(os.path.join(HERE, '..', 'carina-3', 'prompts-v4.json')))
p5 = [d for d in src.values() if d['n'] == 5][0]['prompt']
a = p5.index('a beautiful Swedish woman'); b = p5.index(', fitted black knit top')
IDENT = p5[a:b]   # verbatim identity: body, face, golden hair, cut (ends "side parting")
VER = os.environ.get('VER', 'v1')
if VER != 'v1':  # Jorgen: too glossy, not the style of the rest -> drop the gloss words from the identity line, add matte negatives
    IDENT = IDENT.replace('soft pink glossy full lips', 'soft pink full lips').replace('glossy shiny hair, same colour all over', 'same colour all over').replace('glossy straight shoulder-length hair', 'straight shoulder-length hair')
    assert 'glossy' not in IDENT
SMILE = '(confident slight smile:1.2)'
BASENEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, missing fingers, extra fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, signature, 3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli, fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4), sunglasses, tinted eyewear, red hair, orange hair, cropped head, head out of frame, from behind, dark hair, brown hair, black hair, (ash blond hair, grey hair, silver hair, white hair, platinum hair, dull hair, muted colours:1.3), cleavage, (large breasts, huge breasts, wide shoulders, broad shoulders:1.3), canary yellow hair, neon yellow hair, (dirty blonde hair, tan hair, brown-blond hair, bronze hair, dark blond hair:1.3), circle, halo, shy, sad, frown, tan skin, visible nipples, visible genitals, uncovered crotch, explicit sexual action')
MATTE = ', glossy, shiny hair, specular highlights, glossy skin, wet skin, oily skin, airbrushed, smooth gradient shading, 3d render, glossy lips, lens flare'
NOGL = ', glasses, eyewear'
L, T = (1216, 832), (832, 1216)
OUTFIT = 'small silver studs'
# n, key, size, glasses-in-negative, staging note, scene prompt (after identity)
S = [
 (1, 'b2-desk', L, True, 'Camera in the office aisle in front of her desk at chest height, looking at her; monitor beside her; no windows, ceiling fluorescents; grey partitions and desks behind.',
  'fitted black knit top, ' + OUTFIT + ', ' + SMILE + ', medium shot, she sits at a steel office desk with a computer monitor and keyboard beside her, turned toward the viewer, face toward the viewer, a grey partition wall and more desks behind her, white fluorescent ceiling lights, grey carpet, indoor office, no windows'),
 (2, 'monorail', L, True, 'Camera across the aisle on the opposite bench facing her; big window behind her shows sea; she is on the bench along the car wall.',
  'fitted black knit top, ' + OUTFIT + ', ' + SMILE + ', medium shot, she sits on a bench seat in a monorail car with a silver laptop open on her lap, face toward the viewer, a large window behind her showing blue sea and a pale sky, bright daylight, handrail, grey bench seats'),
 (3, 'gate', L, True, 'Camera inside the security room facing the gate line, she stands in front of the scanner arch; bench at the side; morning light; glass doors behind camera.',
  'fitted black knit top, ' + OUTFIT + ', ' + SMILE + ', medium shot, she stands in front of a security scanner arch with two glass flaps and a card reader, a wooden bench beside the barrier, a yellow line on the floor, bright morning light, station security room, face toward the viewer'),
 (4, 'dorm-203', L, True, 'Camera in the room facing the desk and her; evening lamp; curtains drawn at dusk; small 1K.',
  'soft grey cardigan over a white tee, ' + OUTFIT + ', ' + SMILE + ', medium shot, she sits at a small desk in a tiny dorm room with a desktop computer monitor and a beige tower PC, a warm desk lamp, evening, dark blue curtains drawn behind her, a single bed with a plain blanket in the corner, plain white walls, face toward the viewer'),
 (5, 'pool', L, True, 'Camera on the deck facing her with the pool behind; daylight; white fence; modest one-piece.',
  'modest navy one-piece swimsuit, a white towel over her shoulders, ' + OUTFIT + ', ' + SMILE + ', medium shot, she stands on a pale paved pool deck in bright daylight, behind her an outdoor swimming pool with blue and white lane ropes and a white fence, blue sky, face toward the viewer'),
 (6, 'karaoke', L, True, 'Camera in the booth looking at her sitting on the bench, TV screen on the wall behind her (no text).',
  'fitted black knit top, ' + OUTFIT + ', ' + SMILE + ', holding a microphone, medium shot, she sits in a small karaoke booth, holding a microphone near her lips and smiling at the viewer, a wall screen glowing behind her, a low table with two glasses, cushioned benches, warm pink and orange lighting'),
 (7, 'shotengai', L, True, 'Camera at eye level in the shop street, she walks toward it; lanterns overhead; shop fronts both sides; dusk.',
  'fitted black knit top under a short camel coat, ' + OUTFIT + ', ' + SMILE + ', medium shot, she walks along a narrow shopping street at dusk, holding a brown paper shopping bag with both hands, red paper lanterns hanging overhead, small shops with awnings on both sides, warm glowing shop lights, face toward the viewer'),
 (8, 'mio-corridor', L, False, 'Camera in the B2 corridor facing along it; both women standing side by side, Carina left, Mio right; steel machine-room door with card reader; no windows; fluorescent lights.',
  'fitted black knit top, ' + OUTFIT + ', ' + SMILE + ', standing on the left, 2girls, Mio: a 25-year-old woman with dark green hair, lighter green hair underneath, a blunt fringe, hair in a small loose bun, thick taupe-grey rounded glasses, oversized dark green hoodie, headphones around her neck, company lanyard, pale skin, bored deadpan expression, standing on the right, medium shot, the two women stand side by side in a narrow grey office corridor, a steel door with a card reader behind them, white fluorescent ceiling lights, grey walls, no windows, both faces toward the viewer'),
 (9, 'emi-lift', L, False, 'Camera in a corner of the lift car at chest height; steel walls, handrail, floor display panel; both turned toward each other and the viewer; no windows.',
  'fitted black knit top, ' + OUTFIT + ', ' + SMILE + ', standing on the left, 2girls, Emi: a 32-year-old curvy woman with a reddish auburn bob, clear tortoiseshell glasses, charcoal blazer over a cream blouse, company lanyard, warm friendly grin, standing on the right, medium shot, the two women stand in a small lift car with brushed steel walls, a handrail, a lit floor display panel, bright ceiling light, both faces toward the viewer'),
 (10, 'courtyard', T, True, 'Camera at eye level in the courtyard facing the dorm block; she stands in front; concrete five-storey block with lit corridors behind; dusk.',
  'oversized grey hoodie and blue jeans, ' + OUTFIT + ', ' + SMILE + ', holding a paper coffee cup in both hands, cowboy shot, she stands in a concrete courtyard at dusk, behind her a plain five-storey concrete apartment block with open corridors and lit doors, warm lights in the evening, soft blue sky, face toward the viewer'),
]
SEED0 = 9500
def jobs():
    out = {}
    for n, key, size, nogl, note, sc in S:
        seed = SEED0 + n * 17 + (0 if VER in ('v1', 'v2', 'v3') else 500)
        pr = f'{P.Q}, safe, 1girl, solo, {IDENT}, {sc}'
        if n in (8, 9): pr = pr.replace('1girl, solo', '2girls')
        out[f'cs-{n:02d}-{key}-{VER}'] = dict(n=n, key=key, w=size[0], h=size[1], seed=seed, staging=note, prompt=pr, negative=BASENEG + (MATTE if VER != 'v1' else '') + (NOGL if nogl else ''))
    return out
def v3(out):  # one change each for the shots that drifted in v2 (see review notes)
    for k, d in out.items():
        if d['n'] in (1, 9): d['negative'] += ', window, windows, glass pane, sky, windscreen, mirror, seat, vehicle interior'
        if d['n'] == 8:  # Mio first (image left), Carina second: v2 gave Mio's hoodie and glasses to Carina
            d['prompt'] = (f'{P.Q}, safe, 2girls, Mio: a 25-year-old woman with dark green hair, lighter green hair underneath, a blunt fringe, hair in a small loose bun, thick taupe-grey rounded glasses, oversized dark green hoodie, headphones around her neck, company lanyard, pale skin, bored deadpan expression, standing on the left, '
                           f'{IDENT}, fitted black knit top, {OUTFIT}, {SMILE}, standing on the right, medium shot, the two women stand side by side in a narrow grey office corridor, a steel door with a card reader behind them, white fluorescent ceiling lights, grey walls, no windows, both faces toward the viewer')
    return out
def lock():
    d = '/tmp/claude-1000/gpu.lock'
    while True:
        try:
            os.mkdir(d); open(d + '/owner', 'w').write('carina-situations-1'); return
        except FileExistsError:
            print('lock held by', open(d + '/owner').read().strip() if os.path.exists(d + '/owner') else '?', flush=True); time.sleep(120)
if __name__ == '__main__':
    J = jobs()
    if VER == 'v3': J = v3({k: v for k, v in J.items() if v['n'] in (1, 8, 9)})
    ONLY = [int(x) for x in os.environ.get('ONLY', '').split(',') if x]
    if ONLY: J = {k: v for k, v in J.items() if v['n'] in ONLY}
    lock()
    try:
        for name, d in J.items():
            if 'carina-situations-1' not in open('/tmp/claude-1000/gpu.lock/owner').read(): sys.exit('lost the lock')
            P.run('carina-5-situations', name, d['prompt'], d['negative'], d['w'], d['h'], d['seed'], P.RDBT)
            s = os.path.join(P.OUT, 'carina-5-situations', name + '.png')
            if os.path.exists(s): Image.open(s).save(os.path.join(HERE, name + '.webp'), quality=92)
    finally:
        import urllib.request
        try: urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8188/free', json.dumps({'unload_models': True, 'free_memory': True}).encode(), {'Content-Type': 'application/json'}))
        except Exception as e: print('free failed', e)
        if 'carina-situations-1' in open('/tmp/claude-1000/gpu.lock/owner').read(): subprocess.run(['rm', '-r', '/tmp/claude-1000/gpu.lock'])
    pf = os.path.join(HERE, f'prompts-{VER}.json')
    for k, d in J.items(): d.update(file=f'art/candidates/portraits/carina-5-situations/{k}.webp', model='rdbtAnima', settings=f"{d['w']}x{d['h']}, euler_ancestral normal, 30 steps, CFG 5")
    old = json.load(open(pf)) if os.path.exists(pf) else {}
    old.update(J); json.dump(old, open(pf, 'w'), indent=1, ensure_ascii=False)
