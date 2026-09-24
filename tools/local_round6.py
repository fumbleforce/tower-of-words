"""Round 6: four Anima-family models on seven scenes of varying complexity, with the prompt lessons from round 5.
Output: art/company/local6/<model>/<scene>.png"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'company', 'local6')
Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic'
N = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
     'missing fingers, extra fingers, long fingernails, claws, merged limbs, extra limbs, floating objects, text, watermark, child, loli, gore, blood')
MC = 'a 29-year-old Nordic man, fair pale skin, messy sandy-blond hair, light blond eyebrows, blue eyes, light stubble, slim average build, no blush'

SCENES = {
    'jog': ('simple', 896, 1152, f'''{Q}, safe, 1girl, solo,
Aoi: a 22-year-old woman, shoulder-length pink-dyed hair with dark roots tied in a short ponytail, athletic, white tank top, black running shorts, running shoes, wireless earbuds, jogging toward the viewer mid-stride, cheerful determined smile,
full body, slight low angle,
a seafront promenade at sunrise, calm sea, palm trees, a distant corporate island skyline,
dominant warm peach sky, broad pale blue sea, sparse pink accents, soft golden backlight'''),
    'volleyball': ('medium', 1216, 832, f'''{Q}, safe, 1girl focus, crowd,
Rei: a 26-year-old woman, steel grey eyes, long silver-grey hair in a high ponytail, athletic, black sports top and shorts, jumping high at the net and spiking the volleyball with her right hand, fierce focused expression;
spectators: a crowd of office workers in company t-shirts behind a rope, cheering, facing the court;
Rei in mid-air in the centre, the ball just leaving her right hand, the net in the foreground,
low angle from the sand, dynamic action shot,
a company sports day on a sandy beach court, bright blue sky, flags,
harsh midday sun, dominant sand beige and sky blue, sparse red flag accents'''),
    'romance': ('medium', 1216, 832, f'''{Q}, safe, 1boy, 1girl, couple,
main character: {MC}, dark coat over his white shirt, sitting on a bench, looking out at the city with a quiet smile;
Emi: a 32-year-old curvy woman, warm honey-brown shoulder-length hair, a delicate silver necklace with a small heart pendant, cream knit sweater, sitting close beside him on his left, her head resting on his shoulder, eyes half closed, content smile;
both seen from the side, sitting on a wooden bench, her left hand resting on his arm,
medium shot from slightly behind the bench,
a rooftop garden at night, string lights overhead, the glittering city skyline and the bay below,
dominant deep navy night, broad warm amber string-light glow, sparse city-light sparkles'''),
    'swim': ('complex', 1216, 832, f'''{Q}, safe, multiple girls, crowd,
Rei: a 26-year-old woman, silver-grey hair under a white swim cap, black athletic racing swimsuit, swimming freestyle in the centre lane, one arm reaching forward, clearly in the lead;
two other women swimmers in navy racing swimsuits and swim caps in the lanes on either side, half a body length behind her;
referee: a man in a white polo shirt standing at the pool edge on the right, holding a whistle, facing the swimmers;
spectators: rows of employees in the stands in the background, cheering;
three lanes with lane ropes, splashes, the finishing wall in the foreground,
low angle from the pool edge at water level, wide shot,
an indoor company swimming pool, big windows, banners,
bright daylight through the windows, dominant turquoise water, broad white tiles, sparse red lane-rope accents'''),
    'shootout': ('complex', 1216, 832, f'''{Q}, safe, 2boys, action,
Ishibashi: a wiry security guard in his sixties, grey pencil moustache, glasses on a chain, navy uniform and peaked cap, standing on the left in a firing stance, holding a pistol in both hands aimed to the right, bright muzzle flash, stern expression;
burglar: a figure in a black hoodie and black ski mask, carrying a laptop bag in his left hand, running away to the right, looking back over his shoulder;
the two far apart across the lobby, shattered glass from a broken turnstile flying between them,
wide shot, low angle, dramatic,
the huge glass atrium lobby of a corporate headquarters at night, dark, security lights,
dominant dark blue night, broad cold white spotlight beams, sparse orange muzzle-flash accent'''),
    'copyroom': ('complex', 1216, 832, f'''{Q}, safe, 2girls, 1boy, 1other, surprised,
Mio: a 25-year-old woman, messy black hair with green underneath in a bun, glasses, black hoodie, standing by the copier on the left, jumping back, hand over her mouth, flustered;
Aoi: a 22-year-old woman, pink-dyed shoulder-length hair with dark roots, varsity jacket, standing by the copier on the right, stepping away from Mio, flustered, embarrassed laugh;
main character: {MC}, standing in the open doorway in the foreground, seen from behind and the side, frozen with one hand still on the door handle;
Yuzuki: a 31-year-old woman with glossy wavy chestnut hair, peeking over his shoulder from the corridor behind him, eyebrows raised, amused;
the two women had just been kissing and have sprung apart, standing a step away from each other, both facing the doorway,
a cramped office copy room, a large copier glowing with a green light, paper stacks,
medium-wide shot from just behind the doorway,
cold fluorescent light, dominant pale grey, broad green copier glow, sparse pink accent'''),
    'cabin': ('very complex', 1216, 832, f'''{Q}, safe, 4girls, 4boys, group,
main character: {MC}, holding a drink in his right hand, standing in the centre of the deck, laughing;
Emi: a 32-year-old curvy woman, warm honey-brown shoulder-length hair, silver heart necklace, next to him on his left, smiling;
Mio: a 25-year-old woman, black hair with green underneath, glasses, hoodie, sitting on the deck railing on the left, holding a handheld game console;
Rei: a 26-year-old woman, silver-grey ponytail, white linen shirt, leaning on the railing on the right, holding a wine glass in her left hand;
Aoi: a 22-year-old woman, pink hair with dark roots, varsity jacket, waving toward the viewer;
Yuzuki: a 31-year-old woman, glossy wavy chestnut hair, elegant sundress, sitting on a wooden chair in the foreground right;
Goro: an old man with round glasses and white stubble, beige cardigan, sitting on a bench, smiling;
Ishibashi: a wiry old man with a grey pencil moustache, apron over a polo shirt, grilling skewers at a barbecue on the far left, holding tongs in his right hand;
everyone on the wooden deck of a large log cabin, mostly facing the viewer,
wide shot, eye level,
a beautiful mountain cabin for the company retreat, pine forest and snow-capped mountains behind, a lake below,
golden hour, dominant warm gold light, broad pine green, sparse sky blue'''),
}

MODELS = [('rdbtAnima', 'rdbtAnima.safetensors'), ('animaAesthetic', 'animaAesthetic.safetensors'),
          ('oneObsessionAnima', 'oneObsessionAnima.safetensors'), ('janima', 'janima.safetensors')]

if __name__ == '__main__':
    for name, file in MODELS:
        for scene, (lvl, w, h, prompt) in SCENES.items():
            path = os.path.join(OUT, name, f'{scene}.png')
            if os.path.exists(path):
                continue
            t = time.time()
            try:
                comfy.run(comfy.anima(prompt, N, model=file, w=w, h=h, steps=30, cfg=5, seed=11), path)
                print('ok', name, scene, round(time.time() - t), 's', flush=True)
            except Exception as e:
                print('FAIL', name, scene, str(e)[:300], flush=True)
