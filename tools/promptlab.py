"""Prompt lab: how to get reference-level, logically correct scenery out of the LOCAL models.
Jørgen's reference (art/approved/monorail-bay-ref.webp) came from a short plain prompt; this runs that prompt and
controlled variations of it, one factor at a time, and records the execution time of each render.

Usage: ~/ai/sd/venv/bin/python tools/promptlab.py <batch> [<batch> ...]     batches: see BATCHES at the bottom
Output: art/production/promptlab/<batch>/<name>.png (+ <name>-hr.png for hires), results in art/production/promptlab/results.json.
Every PNG embeds its workflow; the graphs we recommend are saved in tools/workflows/promptlab-*.json.
"""
import sys, os, json, time, random, urllib.request, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import comfy

ROOT = os.path.join(HERE, '..')
OUT = os.path.join(ROOT, 'art', 'production', 'promptlab')
RESULTS = os.path.join(OUT, 'results.json')

MODELS = {  # short name -> (file, family)
    'rdbt': ('rdbtAnima.safetensors', 'anima'),
    'janima': ('janima.safetensors', 'anima'),
    'oneobs': ('oneObsessionAnima.safetensors', 'anima'),
    'nova': ('novaAnimeAM_v5.safetensors', 'anima'),
    'aesthetic': ('animaAesthetic.safetensors', 'anima'),
    'yume': ('animaYume.safetensors', 'anima'),
    'miaomiao': ('miaomiaoAnima.safetensors', 'anima'),
    'lumina': ('netayumeLumina.safetensors', 'lumina'),
}

# Jørgen's reference prompt, verbatim (the opening bracket is never closed; kept as written).
REF = ('anime screenshot, anime coloring, 2d, cel shading, clean lineart, (detailed anime background art, hand-painted anime background, '
       'painted clouds, no humans, scenery, showing a monorail train riding high above a Bay on a curving elevated monorail. The monorail is '
       'crossing toward a large man-made island city with office towers and other buildings. the office towers are catching the low morning sun, '
       'the calm sea below with sunlight glittering on the water, early morning sun low on the horizon. dominant clear sky blue and sea blue, '
       'broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light. No other city in the background, only island and '
       'monorail going towards it.')

# Negatives. SHORT is what the reference style implies; HOUSE is production.py's NO_PEOPLE_N; LONG adds the logic words agents kept piling on.
NEG_MIN = '3d, realistic, photorealistic, text, watermark'
NEG_SHORT = ('worst quality, low quality, blurry, jpeg artifacts, text, watermark, signature, 3d, realistic, photorealistic, '
             'people, person, 1girl, 1boy')
NEG_HOUSE = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
             'missing fingers, extra fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, signature, '
             '3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli, people, person, 1girl, 1boy, crowd, character')
NEG_LOGIC = NEG_HOUSE + (', silhouette, readable text, letters, logo, brand name, signage text, duplicate objects, floating objects, '
                         'impossible architecture, distorted perspective, warped lines, train on water, floating train, broken track, '
                         'track ending in the sea, boat, ship')

W, H = 1216, 832          # house background size
HR = (1824, 1248)         # hires target (1.5x)


def workflow(j):
    """j: dict(model, prompt, neg, seed, w, h, steps, cfg, sampler, scheduler, hires=None|denoise, control=None|dict)."""
    fn, fam = MODELS[j['model']]
    if fam == 'lumina':
        wf = comfy.lumina(j['prompt'], j['neg'], ckpt=fn, w=j['w'], h=j['h'], steps=j['steps'], cfg=j['cfg'], shift=j.get('lshift', 4.0), seed=j['seed'])
        wf['7']['inputs']['sampler_name'], wf['7']['inputs']['scheduler'] = j['sampler'], j['scheduler']
        vae = ['1', 2]
        model_ref = ['2', 0]
    else:
        wf = comfy.anima(j['prompt'], j['neg'], model=fn, w=j['w'], h=j['h'], steps=j['steps'], cfg=j['cfg'],
                         sampler=j['sampler'], scheduler=j['scheduler'], seed=j['seed'])
        vae = ['3', 0]
        model_ref = ['1', 0]
    if j.get('shift'):
        wf['S'] = {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': model_ref, 'shift': j['shift']}}
        model_ref = ['S', 0]
        wf['7']['inputs']['model'] = model_ref
    c = j.get('control')
    if c:  # Anima LLLite composition control (depth / lineart / scribble)
        for k, (kind, img, strength, end) in enumerate(c):
            name = comfy.upload(img)
            wf[f'P{k}'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': f'anima-lllite-{kind}-1.safetensors'}}
            wf[f'I{k}'] = {'class_type': 'LoadImage', 'inputs': {'image': name}}
            wf[f'A{k}'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': model_ref, 'model_patch': [f'P{k}', 0], 'image': [f'I{k}', 0],
                                                                       'strength': strength, 'start_percent': 0.0, 'end_percent': end}}
            model_ref = [f'A{k}', 0]
        wf['7']['inputs']['model'] = model_ref
    if j.get('init'):  # img2img from a master image
        name = comfy.upload(j['init'])
        wf['G'] = {'class_type': 'LoadImage', 'inputs': {'image': name}}
        wf['GS'] = {'class_type': 'ImageScale', 'inputs': {'image': ['G', 0], 'upscale_method': 'lanczos', 'width': j['w'], 'height': j['h'], 'crop': 'center'}}
        wf['GE'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['GS', 0], 'vae': vae}}
        wf['7']['inputs']['latent_image'] = ['GE', 0]
        wf['7']['inputs']['denoise'] = j['denoise']
        del wf['6']
    wf['9']['inputs']['filename_prefix'] = 'promptlab/base'
    if j.get('hires'):
        base_model = ['2', 0] if fam == 'lumina' else ['1', 0]
        if j.get('shift'):
            base_model = ['S', 0]
        wf['u1'] = {'class_type': 'UpscaleModelLoader', 'inputs': {'model_name': 'RealESRGAN_x4plus_anime_6B.pth'}}
        wf['u2'] = {'class_type': 'ImageUpscaleWithModel', 'inputs': {'upscale_model': ['u1', 0], 'image': ['8', 0]}}
        wf['u3'] = {'class_type': 'ImageScale', 'inputs': {'image': ['u2', 0], 'upscale_method': 'lanczos',
                                                            'width': int(j['w'] * 1.5) // 16 * 16, 'height': int(j['h'] * 1.5) // 16 * 16, 'crop': 'center'}}
        wf['u4'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['u3', 0], 'vae': vae}}
        wf['u5'] = {'class_type': 'KSampler', 'inputs': {'model': base_model, 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['u4', 0],
                                                         'seed': j['seed'] + 1, 'steps': 20, 'cfg': j['cfg'],
                                                         'sampler_name': j['sampler'], 'scheduler': j['scheduler'], 'denoise': j['hires']}}
        wf['u6'] = {'class_type': 'VAEDecode', 'inputs': {'samples': ['u5', 0], 'vae': vae}}
        wf['u9'] = {'class_type': 'SaveImage', 'inputs': {'images': ['u6', 0], 'filename_prefix': 'promptlab/hires'}}
    return wf


def _post(path, data):
    req = urllib.request.Request(comfy.HOST + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


def _get(path):
    return urllib.request.urlopen(comfy.HOST + path).read()


def execute(wf, timeout=1800):
    """Queue, wait, return ({save-node-id: bytes}, execution seconds measured by ComfyUI, excluding queue wait)."""
    pid = _post('/prompt', {'prompt': wf})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(_get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages', []))[-1200:])
            ts = {m[0]: m[1].get('timestamp') for m in st.get('messages', [])}
            secs = None
            if ts.get('execution_start') and ts.get('execution_success'):
                secs = round((ts['execution_success'] - ts['execution_start']) / 1000, 1)
            out = {}
            for nid, node in hist[pid]['outputs'].items():
                for img in node.get('images', []):
                    q = urllib.parse.urlencode({'filename': img['filename'], 'subfolder': img['subfolder'], 'type': img['type']})
                    out[nid] = _get('/view?' + q)
            return out, secs
        time.sleep(2)
    raise TimeoutError(pid)


def load_results():
    return json.load(open(RESULTS)) if os.path.exists(RESULTS) else {}


def job(batch, name, **kw):
    j = dict(batch=batch, name=name, model='rdbt', prompt=REF, neg=NEG_HOUSE, seed=101, w=W, h=H, steps=30, cfg=5.0,
             sampler='euler_ancestral', scheduler='normal', hires=None, control=None)
    if MODELS[kw.get('model', 'rdbt')][1] == 'lumina':  # Lumina defaults (NetaYume): CFG 4.5, res_multistep / simple
        j.update(cfg=4.5, sampler='res_multistep', scheduler='simple')
    j.update(kw)
    return j


def run_jobs(jobs):
    res = load_results()
    for j in jobs:
        key = f"{j['batch']}/{j['name']}"
        path = os.path.join(OUT, j['batch'], j['name'] + '.png')
        if os.path.exists(path) and key in res:
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            out, secs = execute(workflow(j))
        except Exception as e:
            print('FAIL', key, str(e)[:400], flush=True)
            continue
        open(path, 'wb').write(out['9'])
        if 'u9' in out:
            open(path.replace('.png', '-hr.png'), 'wb').write(out['u9'])
        rec = {k: v for k, v in j.items()}
        rec['secs'] = secs
        rec['file'] = os.path.relpath(path, OUT)
        res = load_results()
        res[key] = rec
        json.dump(res, open(RESULTS, 'w'), indent=1)
        print(key, secs, 's', flush=True)


# ---------------- batches ----------------
SEEDS = [101, 202, 303, 404]


def baseline():
    return [job('baseline', f'{m}-{s}', model=m, seed=s, hires=0.35) for m in MODELS for s in SEEDS]


STYLE = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart'
Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic'
REF_BODY = REF[len(STYLE) + 2:]
REF_NOPAREN = REF.replace('(detailed', 'detailed')
PROMPTS = {
    'ref': REF,
    # the staging-heavy style agents had been writing: quality tags, camera jargon, weights, long lists
    'long': (Q + ', ' + STYLE + ', safe, no humans, scenery, background art for a visual novel, (wide establishing shot:1.3), '
             'camera high above the bay level with the guideway about forty metres to the side, looking forward along the route, '
             '(a short white monorail train of four cars on a curving elevated concrete guideway beam on tall pillars standing in the water:1.4), '
             'the front of the train pointing toward the island, the last car visible, the guideway continuing ahead unbroken to an elevated station on the island shore, '
             '(a large man-made island city with glass office towers:1.3) on the horizon to the right, calm sea far below with sunlight glittering, '
             'early morning sun low on the horizon on the left, towering cumulus clouds following perspective, dominant clear sky blue and sea blue, '
             'broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light'),
    'short': (STYLE + ', detailed anime background art, no humans, scenery. A monorail train on a curving elevated track high above a bay, '
              'crossing to an island city of office towers. Early morning sun, calm glittering sea.'),
    'order': ('Showing a monorail train riding high above a Bay on a curving elevated monorail. The monorail is crossing toward a large man-made island city '
              'with office towers and other buildings. the office towers are catching the low morning sun, the calm sea below with sunlight glittering on the water, '
              'early morning sun low on the horizon. dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, '
              'bright hopeful light. No other city in the background, only island and monorail going towards it. ' + STYLE +
              ', detailed anime background art, hand-painted anime background, painted clouds, no humans, scenery'),
    'noparen': REF_NOPAREN,
    'weights': REF_NOPAREN.replace('riding high above a Bay on a curving elevated monorail', 'riding (high above a Bay:1.3) on a (curving elevated monorail on tall concrete pillars:1.5)')
                          .replace('large man-made island city', '(large man-made island city:1.3)'),
    'quality': Q + ', ' + REF,
    # Jørgen's rule: leave out what the picture can't show (direction of travel, destination, story)
    'visible': (STYLE + ', (detailed anime background art, hand-painted anime background, painted clouds, no humans, scenery, showing a monorail train '
                'high above a Bay on a curving elevated monorail track. A large man-made island city with office towers and other buildings on the right. '
                'the office towers are catching the low morning sun, the calm sea below with sunlight glittering on the water, early morning sun low on the horizon. '
                'dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light.'),
    'story': REF + (' A young engineer is moving to the company island today; the train is carrying him to his new job and his new home in the city, '
                    'where the giant company owns everything.'),
    'plus1': REF + ' The track stands on tall concrete pillars in the water and runs all the way to the island.',
}
NEGS = {'min': NEG_MIN, 'short': NEG_SHORT, 'house': NEG_HOUSE, 'logic': NEG_LOGIC}
GUIDES = os.path.join(HERE, 'promptlab_guides')


def ablate_for(m):
    b, J = f'ablate-{m}', []
    for k, pr in PROMPTS.items():
        if k != 'ref':
            J += [job(b, f'prompt-{k}-{s}', model=m, seed=s, prompt=pr) for s in SEEDS]
    for k, ng in NEGS.items():
        if k != 'house':
            J += [job(b, f'neg-{k}-{s}', model=m, seed=s, neg=ng) for s in SEEDS]
    lum = MODELS[m][1] == 'lumina'
    for c in ([3.0, 6.0] if lum else [3.0, 4.0, 7.0]):
        J += [job(b, f'cfg-{c:g}-{s}', model=m, seed=s, cfg=c) for s in SEEDS]
    for st in (20, 45):
        J += [job(b, f'steps-{st}-{s}', model=m, seed=s, steps=st) for s in SEEDS]
    samplers = [('euler', 'simple'), ('dpmpp_2m', 'sgm_uniform')] if lum else [('er_sde', 'simple'), ('dpmpp_2m_sde', 'karras'), ('euler', 'normal')]
    for sa, sc in samplers:
        J += [job(b, f'sampler-{sa}-{sc}-{s}', model=m, seed=s, sampler=sa, scheduler=sc) for s in SEEDS]
    for w, h in ((1344, 768), (1024, 1024), (1536, 1024)):
        J += [job(b, f'res-{w}x{h}-{s}', model=m, seed=s, w=w, h=h) for s in SEEDS]
    if not lum:
        for kind, st, end in (('depth', 0.8, 0.6), ('depth', 1.0, 0.8), ('lineart', 0.8, 0.6)):
            img = os.path.join(GUIDES, 'bay-depth.png' if kind == 'depth' else 'bay-lines.png')
            J += [job(b, f'guide-{kind}-{st:g}-{end:g}-{s}', model=m, seed=s, control=[(kind, img, st, end)]) for s in SEEDS]
    return J


def hires_for(m):
    return [job(f'hires-{m}', f'hr-{d:g}-{s}', model=m, seed=s, hires=d) for d in (0.25, 0.5, 0.6) for s in SEEDS]


# ---- test shots from day 1, written the reference way: style line, a few plain sentences, one "no" line ----
LEAD = STYLE + ', detailed anime background art, hand-painted anime background, no humans, scenery, '
SHOTS = {
    'a-approach': (LEAD + 'showing the inside of the empty front car of a monorail train, looking forward through the large front window. '
                   'Ahead, the elevated monorail track curves over the last stretch of sea into a station on an island city of office towers. '
                   'The station platform is on the right side of the track ahead. Long bench seats along both sides, grab poles and hanging straps. '
                   'Bright morning light, dominant sky blue and white, sparse teal seat accents. No driver, no other train.'),
    'b-sales': (LEAD + 'showing a Japanese company sales office floor. Grey steel desks pushed together in facing pairs form long islands, '
                'with the section chief\'s desk across the end of each island. Monitors, desk phones, binders and paper piles on the desks. '
                'Fluorescent ceiling panels, windows with half-lowered white blinds along one wall. Soft morning daylight, muted colours, '
                'dominant grey and off-white, sparse muted blue accents. No cubicles, no people.'),
    'c-dorm': (LEAD + 'showing a tiny cheap company dormitory room at night, seen from the doorway. One single bed against the wall with one pillow, '
               'a small desk and chair, a few unopened cardboard moving boxes on the floor. One window, and just outside it the bare grey concrete wall '
               'of the next building a couple of metres away, lit by a dim outdoor lamp. Only the ceiling light is on, cold white light, '
               'dominant grey and off-white, sparse dull blue accents. No city view, no sky in the window.'),
    'd-tower': (LEAD + 'showing a wide station plaza on a man-made island, seen from the station exit at street level. Across the plaza stands one giant '
                'glass office tower, the company headquarters, so tall it rises past the top of the picture. Paved plaza with trees, benches and a bus stop, '
                'smaller office buildings on both sides. Morning, clear blue sky with white clouds, dominant sky blue and glass, broad pale stone, '
                'sparse green accents. No people, no readable signs.'),
}
# story-context versions of two shots (the rule says this should hurt)
SHOTS['a-approach+story'] = SHOTS['a-approach'] + (' The new employee is arriving on the island for his first day; '
                                                  'the train is about to stop at Amakawa City Central Station, exit on the right.')
SHOTS['d-tower+story'] = SHOTS['d-tower'] + (' He has just stepped off the monorail on his first morning and looks up at the tower '
                                            'of the giant company that owns the whole island, where he will work from today.')
SHOT_SEEDS = [501, 502, 503, 504, 505]


def shots_for(m, **kw):
    return [job(f'shots-{m}', f'{k}-{s}', model=m, seed=s, prompt=pr, **kw) for k, pr in SHOTS.items() for s in SHOT_SEEDS]


# ---- derived shots: img2img from OUR approved-candidate masters with a short prompt about the new framing only ----
# Jørgen's images in art/approved/*-ref.webp are references for quality and prompting ONLY. Never use them as img2img sources.
MASTER_BAY = os.path.join(ROOT, 'art', 'approved', 'monorail-bay-ref.webp')
MASTER_SIDE = os.path.join(ROOT, 'art', 'approved', 'monorail-side-ref.webp')
MASTER_INT = os.path.join(ROOT, 'art', 'approved', 'monorail-interior-ref.webp')
OUR_EXT = os.path.join(OUT, 'masters', 'ext-ref-oneobs-906.png')
OUR_INT = os.path.join(OUT, 'masters', 'int-oneobs-901.png')
DERIVE = {  # name -> (master, framing sentence)
    'interior': (OUR_EXT, 'showing the view from inside the front car of the monorail, looking forward through the large front window, '
                 'the elevated track curving ahead over the sea into a station on the island city.'),
    'closer': (OUR_EXT, 'showing a closer view of the island city ahead, office towers catching the low morning sun, '
               'the elevated monorail track running over the sea into the city.'),
    'station': (OUR_EXT, 'showing the monorail train arriving at an elevated station with a long roof on the island shore, '
                'office towers behind the station, the sea in front.'),
    # from the interior master (straight-on side window): the same window later in the ride, and the aisle view that usually fails
    'window-city': (OUR_INT, 'interior view inside the monorail train, window showing the office towers of the island city close by across the water. '
                    '2 seats visible, window is fully visible, straight on angle. No people.'),
    'aisle': (OUR_INT, 'interior view inside the empty monorail train, looking down the aisle toward the front window, '
              'the elevated track ahead curving over the sea into a station on the island city. No people.'),
    # layout words: character-relative vs image-frame terms, and the one plain "keep out" line
    'ots-relative': (OUR_INT, 'interior view inside the monorail train, over the shoulder view of a man looking out the window, '
                     'seen over his left shoulder.'),
    'ots-frame': (OUR_INT, 'interior view inside the monorail train, the window fills the left half of the image, '
                  'the back of a man\'s head and shoulder in the lower right corner.'),
    'ots-frame-keep': (OUR_INT, 'interior view inside the monorail train, the window fills the left half of the image, '
                       'the back of a man\'s head and shoulder in the lower right corner. Only sea and sky in the window.'),
}


def derive_for(m, denoises=(0.55, 0.7, 0.8, 0.9), seeds=(601, 602), variant='plain'):
    J = []
    for k, (master, frame) in DERIVE.items():
        pr = {'plain': frame, 'style': STYLE + ', ' + frame, 'full': STYLE + ', detailed anime background art, hand-painted anime background, '
              'no humans, scenery, ' + frame + ' Early morning sun low on the horizon, calm sea with sunlight glittering, dominant clear sky blue and sea blue, '
              'broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light.'}[variant]
        J += [job(f'derive-{m}', f'{k}-{variant}-{d:g}-{s}', model=m, seed=s, prompt=pr, init=master, denoise=d)
              for d in denoises for s in seeds]
    return J


# ---- style match (RETIRED 2026-09-25): repainting Jørgen's references was rejected ("very minor alterations to my images which I
# told you not to use"). Kept only so the recorded results stay reproducible; do not run for new work. ----
SIDE_EMPTY = os.path.join(ROOT, 'proto2', 'monorail', 'monorail-side-empty.webp')
BG = STYLE + ', detailed anime background art, no humans, scenery, '
STYLEMATCH = {  # name -> (source, w, h, prompt describing only what is visible)
    'bay': (MASTER_BAY, 1344, 768, BG + 'a white monorail train on a curving elevated concrete track on tall pillars high above a calm bay, '
            'an island city of glass office towers on the right, low morning sun on the left glittering on the sea, blue sky with white clouds.'),
    'side': (MASTER_SIDE, 1344, 768, BG + 'side view of one white monorail carriage filling the image end to end, a blue stripe along it, '
             'its windows reflecting only sea and sky, blue sky with small clouds above, low morning sun.'),
    'interior': (MASTER_INT, 1344, 768, STYLE + ', detailed anime background art, interior of a monorail train, a large side window seen straight on, '
                 'only sea and sky in the window, low sun over the sea, blue seats, a man with brown hair and black glasses in a checked shirt '
                 'sitting on the left looking out of the window.'),
    'side-empty': (SIDE_EMPTY, 1216, 832, BG + 'interior of a monorail train, a large side window seen straight on, only sea and sky in the window, '
                   'low sun over the sea, empty blue seats.'),
}
PROGRESS = {  # outside shots from the bay master, the island at three distances (visible content only)
    'far': BG + 'a white monorail train on a long elevated concrete track on pillars high above a wide calm bay, a small island city far away on the horizon, '
                'low morning sun glittering on the sea, blue sky with white clouds.',
    'mid': BG + 'a white monorail train on a curving elevated concrete track on pillars high above a calm bay, an island city of glass office towers '
                'in the middle distance, low morning sun glittering on the sea, blue sky with white clouds.',
    'near': BG + 'a white monorail train on an elevated concrete track on pillars over the sea, close to an island city, glass office towers filling the right half '
                 'of the image, the track running into an elevated station on the shore, low morning sun, blue sky with white clouds.',
}


def stylematch(models=('rdbt', 'oneobs')):
    J = []
    for m in models:
        for k, (src, w, h, pr) in STYLEMATCH.items():
            J += [job('stylematch', f'{k}-{m}-{d:g}', model=m, seed=701, prompt=pr, init=src, denoise=d, w=w, h=h) for d in (0.35, 0.45, 0.55, 0.65)]
    for m in models:
        for k, pr in PROGRESS.items():
            J += [job('stylematch', f'progress-{k}-{m}-{d:g}-{s}', model=m, seed=s, prompt=pr, init=MASTER_BAY, denoise=d, w=1344, h=768)
                  for d in (0.75, 0.85) for s in (711, 712)]
    return J


# ---- Sales (Jørgen's short prompt, 2026-09-25), plain and with the blockout lineart at low strength ----
SALES = (STYLE + ', detailed anime background art, hand-painted anime background, no humans, scenery. A Japanese sales office seen from the doorway. '
         'Grey desks pushed together in rows facing each other, each desk with a computer monitor and a desk phone. Office chairs tucked in at the desks. '
         'Whiteboards on the far wall, windows with half-closed blinds on the right. Soft daylight, muted grey and pale blue colours.')
SALES_LINES = os.path.join(HERE, 'blockout', 'shots', 'sales-lines.png')


def sales():
    J = [job('sales', f'sales-rdbt-{s}', model='rdbt', seed=s, prompt=SALES) for s in range(8401, 8409)]
    J += [job('sales', f'sales-oneobs-{s}', model='oneobs', seed=s, prompt=SALES) for s in range(8401, 8405)]
    for st in (0.3, 0.4, 0.5):
        J += [job('sales', f'sales-rdbt-lines{st:g}-{s}', model='rdbt', seed=s, prompt=SALES, control=[('lineart', SALES_LINES, st, 0.6)])
              for s in range(8401, 8405)]
    return J


CALM = ' The sea far below is calm and flat, no waves.'
PROGRESS2 = {k: v.replace('a white monorail train', 'a short white monorail train of four cars').replace('island city', 'city on a flat man-made island')
             for k, v in PROGRESS.items()}


def stylematch2():
    """Fixes after review: RDBT draws surf under the window sill (reads as sea level) -> one calm-sea sentence;
    progress shots grew 8-12 car trains and mountain mainland cities -> name the car count and a flat man-made island."""
    J = []
    for k in ('interior', 'side-empty'):
        src, w, h, pr = STYLEMATCH[k]
        J += [job('stylematch', f'{k}-calm-rdbt-{d:g}-{s}', model='rdbt', seed=s, prompt=pr + CALM, init=src, denoise=d, w=w, h=h)
              for d in (0.35, 0.45) for s in (701, 702)]
    for k, pr in PROGRESS2.items():
        J += [job('stylematch', f'progress2-{k}-rdbt-{d:g}-{s}', model='rdbt', seed=s, prompt=pr, init=MASTER_BAY, denoise=d, w=1344, h=768)
              for d in (0.75, 0.85) for s in (711, 712, 713)]
    return J


SALES_DEPTH = os.path.join(HERE, 'blockout', 'shots', 'sales-depth.png')
# round 2: the lines only bite at ~0.7, and the prompt must not contradict the guide (the blockout has the whiteboard on the left wall
# and the windows along the far wall)
SALES_G = SALES.replace('Whiteboards on the far wall, windows with half-closed blinds on the right.',
                        'A whiteboard on the left wall, windows with half-closed blinds along the far wall.')
SALES_G2 = SALES_G.replace('each desk with a computer monitor and a desk phone.', 'each desk with a computer monitor and a desk phone with a handset.') \
                  .replace('Soft daylight,', 'Grey carpet floor. Soft daylight,')


SALES_H = SALES.replace('each desk with a computer monitor and a desk phone.', 'each desk with a computer monitor and a desk phone with a handset.') \
               .replace('Soft daylight,', 'Grey carpet floor. Soft daylight,')


def sales3():
    """s1 (Jørgen's prompt + lines 0.7) kept the island layout; the wall words in s2-s4 broke it. One change from s1: handset + carpet."""
    return [job('sales', f'sales-rdbt-s5-handset-carpet-lines0.7-{s}', model='rdbt', seed=s, prompt=SALES_H,
                control=[('lineart', SALES_LINES, 0.7, 0.6)]) for s in range(8401, 8407)]


SALES_COLOR = os.path.join(HERE, 'blockout', 'shots', 'sales-color.png')


def sales4():
    """Lines at 0.7 until 60% of the steps did not hold the island layout. One change each: longer control (end 0.8, strength 0.8);
    then the same control plus img2img from the blockout's flat colour guide (denoise 0.8)."""
    ctl = [('lineart', SALES_LINES, 0.8, 0.8)]
    J = [job('sales', f'sales-rdbt-s6-lines0.8end0.8-{s}', model='rdbt', seed=s, prompt=SALES_H, control=ctl) for s in range(8401, 8405)]
    J += [job('sales', f'sales-rdbt-s7-colorguide0.8-lines0.8end0.8-{s}', model='rdbt', seed=s, prompt=SALES_H, control=ctl,
              init=SALES_COLOR, denoise=0.8) for s in range(8401, 8411)]
    return J


SALES_P = SALES_H.replace('a desk phone with a handset.', 'a beige desk phone with a corded handset resting on the cradle.')


def sales5():
    """s7 gave the island layout; phones stayed handset-less blobs. One change: the phone words."""
    ctl = [('lineart', SALES_LINES, 0.8, 0.8)]
    return [job('sales', f'sales-rdbt-s8-phonewords-colorguide0.8-{s}', model='rdbt', seed=s, prompt=SALES_P, control=ctl,
                init=SALES_COLOR, denoise=0.8) for s in range(8401, 8407)]


def sales2():
    J = []
    for tag, pr, ctl in (('s1-lines0.7', SALES, [('lineart', SALES_LINES, 0.7, 0.6)]),
                         ('s2-guidewords-lines0.7', SALES_G, [('lineart', SALES_LINES, 0.7, 0.6)]),
                         ('s3-handset-carpet-lines0.7', SALES_G2, [('lineart', SALES_LINES, 0.7, 0.6)]),
                         ('s4-guidewords-depth0.6-lines0.5', SALES_G, [('depth', SALES_DEPTH, 0.6, 0.6), ('lineart', SALES_LINES, 0.5, 0.6)])):
        J += [job('sales', f'sales-rdbt-{tag}-{s}', model='rdbt', seed=s, prompt=pr, control=ctl) for s in range(8401, 8405)]
    return J


BAY_RDBT = os.path.join(OUT, 'stylematch', 'bay-rdbt-0.45.png')
NEAR_CROP = os.path.join(GUIDES, 'bayrdbt-crop-near.png')   # right-hand island part of bay-rdbt-0.45, cropped and scaled 2x
BEAM = BG + ('a short white monorail train of four cars on a single smooth concrete monorail beam without rails, the beam on tall pillars high above a calm bay, '
             'an island city of glass office towers, low morning sun glittering on the sea, blue sky with white clouds.')


def stylematch3():
    """Round 3. Progress: (a) crop + repaint the style-matched master (a closer view that keeps the same world),
    (b) moderate denoise from the style-matched master with the beam and car count named. Interior: lower denoise."""
    J = [job('stylematch', f'progress3-near-crop-rdbt-{d:g}-{s}', model='rdbt', seed=s, init=NEAR_CROP, denoise=d, w=1344, h=768,
             prompt=BG + 'an island city of glass office towers close across the water, the elevated monorail track on pillars curving into the city, '
                         'calm sea, blue sky with white clouds, morning sun.') for d in (0.45, 0.55) for s in (721, 722)]
    J += [job('stylematch', f'progress3-beam-rdbt-{d:g}-{s}', model='rdbt', seed=s, init=BAY_RDBT, denoise=d, w=1344, h=768, prompt=BEAM)
          for d in (0.6, 0.7) for s in (721, 722)]
    src, w, h, pr = STYLEMATCH['interior']
    J += [job('stylematch', f'interior-calm-rdbt-0.25-{s}', model='rdbt', seed=s, prompt=pr + CALM, init=src, denoise=0.25, w=w, h=h) for s in (701, 702)]
    return J


# ---- our own monorail masters, from scratch (Jørgen: his images are references for quality and prompting only, never img2img sources) ----
MASTER_EXT = {
    'ref': REF,
    'visible': PROMPTS['visible'],
}
MASTER_INT_PROMPT = (STYLE + ', detailed anime background art, hand-painted anime background, no humans, scenery, interior view inside the monorail train, '
                     'window showing sea and sky. 2 seats visible, window is fully visible, straight on angle. The sea far below is calm and flat, no waves. '
                     'Early morning sun low over the sea, dominant sky blue and sea blue, sparse warm sunrise orange accents.')


def masters():
    J = []
    for m in ('rdbt', 'oneobs'):
        for k, pr in MASTER_EXT.items():
            J += [job('masters', f'ext-{k}-{m}-{s}', model=m, seed=s, prompt=pr) for s in range(901, 907)]
        J += [job('masters', f'int-{m}-{s}', model=m, seed=s, prompt=MASTER_INT_PROMPT) for s in range(901, 909)]
    return J


SALES_NP = SALES.replace(', each desk with a computer monitor and a desk phone.', ', each desk with a computer monitor.').replace('Soft daylight,', 'Grey carpet floor. Soft daylight,')


def sales6():
    """Coordinator decision: no phones in the prompt; keep the colour guide + lineart recipe (s7) that gives islands."""
    ctl = [('lineart', SALES_LINES, 0.8, 0.8)]
    return [job('sales', f'sales-rdbt-s9-nophones-colorguide0.8-{s}', model='rdbt', seed=s, prompt=SALES_NP, control=ctl,
                init=SALES_COLOR, denoise=0.8) for s in range(8401, 8417)]


# progress shots derived only from OUR master (ext-ref-oneobs-906): crop toward the island and repaint at low strength,
# so the train, beam and island keep their shape
OUR_MASTER = os.path.join(OUT, 'masters', 'ext-ref-oneobs-906.png')
PROG_OURS = {
    'mid': (os.path.join(GUIDES, 'm906-crop-mid.png'), BG + 'a white monorail train on a curving elevated monorail beam on pillars high above a calm bay, '
            'heading to an island city of office towers, low morning sun glittering on the sea, blue sky with white clouds.'),
    'near': (os.path.join(GUIDES, 'm906-crop-near.png'), BG + 'a white monorail train on an elevated monorail beam on pillars, close to an island city of office towers, '
             'calm sea, low morning sun, blue sky with white clouds.'),
}


def progress_ours():
    return [job('masters', f'progress-{k}-oneobs-{d:g}-{s}', model='oneobs', seed=s, prompt=pr, init=src, denoise=d)
            for k, (src, pr) in PROG_OURS.items() for d in (0.35, 0.5) for s in (931, 932, 933)]


# round 2 of the test shots: one change each, aimed at the reviewer's main failure, layout said in image-frame terms
SHOTS2 = {
    # front-window aisle view is unreliable (rails, oncoming trains); use the straight-on side window, which models handle
    'a-arrival-side': (LEAD + 'interior view inside a monorail train, window showing a station platform with a long roof right outside, '
                       'office towers of a city behind the platform. 2 seats visible, window is fully visible, straight on angle. '
                       'Bright morning light, dominant sky blue and white, sparse teal seat accents. No people.'),
    # two windows and a sky view: say what fills the window, in frame terms
    'c-dorm-wall': SHOTS['c-dorm'].replace('One window, and just outside it the bare grey concrete wall of the next building a couple of metres away, lit by a dim outdoor lamp.',
                                          'One window on the far wall; a bare grey concrete wall fills the whole window, lit by a dim outdoor lamp.'),
    # the tower top kept showing: say where it meets the frame edge
    'd-tower-crop': SHOTS['d-tower'].replace('so tall it rises past the top of the picture.', 'seen from low down looking up, its top cut off by the top edge of the image.'),
}


def shots2():
    return [job('shots2', f'{k}-{m}-{s}', model=m, seed=s, prompt=pr) for k, pr in SHOTS2.items() for m in ('oneobs', 'rdbt') for s in (511, 512, 513, 514)]


def sketch_confirm():
    """The line sketch was the best One Obsession ablation on 4 seeds; 8 more seeds to check it."""
    img = os.path.join(GUIDES, 'bay-lines.png')
    return [job('ablate-oneobs', f'guide-lineart-0.8-0.6-{s}', model='oneobs', seed=s, control=[('lineart', img, 0.8, 0.6)]) for s in range(505, 513)] + \
           [job('ablate-oneobs', f'baseline8-{s}', model='oneobs', seed=s) for s in range(505, 513)]


def argbatch(name):
    """'ablate:rdbt' -> ablate_for('rdbt') etc."""
    fn, _, arg = name.partition(':')
    fn, _, extra = fn.partition('+')
    if fn == 'derivev':  # derivev+style:rdbt  -> prompt variant at 0.8 and 0.9
        return derive_for(arg, denoises=(0.8, 0.9), variant=extra)
    return {'ablate': ablate_for, 'hires': hires_for, 'shots': shots_for, 'derive': derive_for}[fn](arg)


BATCHES = {'baseline': baseline, 'stylematch': stylematch, 'sales': sales, 'stylematch2': stylematch2, 'sales2': sales2, 'sales3': sales3, 'sales4': sales4, 'sales5': sales5, 'masters': masters, 'sketch_confirm': sketch_confirm, 'shots2': shots2, 'progress_ours': progress_ours, 'sales6': sales6, 'stylematch3': stylematch3}

if __name__ == '__main__':
    for b in sys.argv[1:]:
        run_jobs(BATCHES[b]() if b in BATCHES else argbatch(b))
