"""Shots rendered from blockouts with composition control (RDBT Anima + Anima LLLite).
Usage: ~/ai/sd/venv/bin/python tools/blockout/shots.py <job>[:mode[:seeds]] ...
  e.g. shots.py mono-int:both:7101,7102   (mode: depth | lines | both | guide)
       shots.py mono-int:guide:7101:denoise=0.9,strength=0.8   (extra build() settings, added to the file name)
Control images: tools/blockout/shots/<shot>-{depth,lines,color}.png (rebuild with blender, see monorail.py / sales.py).
Output: art/production/B1/<job>-<mode>-<seed>.png (gitignored; PNGs embed the workflow) plus manifest entries (batch B1)."""
import os, sys, json, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import comfy
from control_render import build
from production import Q, NO_PEOPLE_N, load_manifest, MANIFEST

SHOTS = os.path.join(HERE, 'shots')
OUT = os.path.join(HERE, '..', '..', 'art', 'production', 'B1')
BASE = f'{Q}, safe, no humans, scenery, background art for a visual novel, '
NEG = NO_PEOPLE_N + (', people, silhouette, passenger, readable text, letters, logo, brand name, signage text, '
                     'duplicate objects, floating objects, impossible architecture, distorted perspective, warped lines')

MONO_PAL = 'bright morning light, dominant pale sky blue and sea blue, broad white and light grey interior, sparse teal seat and orange accents'

JOBS = {
    # Final approach, inside the front car. Script: 「まもなく、天川シティ中央駅です。お出口は右側です。」
    'mono-int': dict(shot='mono-int', prompt=(
        BASE + 'inside the empty front car of a driverless monorail, camera standing in the aisle looking forward toward the large front window, '
        'long teal bench seats along both side walls under wide windows, sliding doors on both sides, grab poles, hand straps hanging from ceiling rails, '
        'through the front window the concrete monorail guideway curves ahead over the last stretch of water into an elevated station building with a long flat roof, '
        'office towers of the company city standing on the shore behind the station, calm blue sea below the guideway, '
        'through the side windows the sea below and the city shore, ' + MONO_PAL),
        neg=NEG + ', train on water, floating train, bed, sofa, living room, driver, cockpit controls, rails, railway track, sleepers, road markings, yellow line, pier, boardwalk, highway, interchange, hill, mountain'),
    # Exterior establishing shot from beside the line, level with the guideway.
    'mono-ext': dict(shot='mono-ext', prompt=(
        BASE + 'a short white monorail train of three cars on an elevated concrete guideway beam over the sea, seen from behind and to the side, red tail lights on the last car, '
        'the train heading away from the camera toward an elevated station at the waterfront of a city on a man-made island, '
        'a second parallel guideway beam in the foreground, concrete pillars standing in the water, '
        'office towers standing on land behind a straight stone seawall, calm blue sea, clear morning sky, '
        'bright morning light, dominant sky blue and sea blue, broad white and pale concrete grey, sparse teal accents'),
        neg=NEG + ', train on water, floating train, broken beam, rails, railway track, sleepers, second train, long train, bridge without pillars, poles in the water, buildings in the water, floating buildings, hill, mountain'),
    # Sales, mid-morning ~10:30: he comes up from the basement for a folder from Rei. Island layout (島型), no people.
    'sales': dict(shot='sales', prompt=(
        BASE + 'the sales department floor of a Japanese company office, camera standing at eye level at the entrance looking across the room, '
        'plain grey steel desks pushed together in facing pairs forming three islands, the section chief\'s desk across the head of each island facing his team, '
        'low-back grey office chairs tucked in at the desks, a desk phone and a monitor at every seat, product catalogues, document piles and binders on the desks, '
        'one tidy desk at the near end with a small potted plant and a neat stack of papers, '
        'a whiteboard with a grid of illegible scribbles on the back wall, a bar chart sheet taped to the wall beside it, low grey cabinets, '
        'fluorescent ceiling panels, windows along the right wall with white blinds half down, the office building across the street outside, '
        'mid-morning, soft even daylight through the blinds and fluorescent light, dominant muted grey and off-white, broad pale grey carpet, sparse desaturated blue accents'),
        neg=NEG + ', sunbeam, god rays, light rays, strong colours, saturated, glossy, neon, cubicles, glass walls, sofa, bed, many plants, readable text, dark room'),
}

# Short prompts in Jørgen's reference style (art/PROMPTS.md "Reference prompt", 2026-09-25): the style line, then a few plain
# sentences, one idea each, and one plain "must not appear" line. The staging notes stay out of the prompt.
STYLE = ('anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, '
         'no humans, scenery, ')
SHORT_NEG = NO_PEOPLE_N + ', readable text, logo'
JOBS.update({
    'mono-int-s': dict(shot='mono-int', prompt=(
        STYLE + 'Inside an empty driverless monorail car, looking forward through the big front window. '
        'The monorail track curves ahead over the sea into an elevated station at the edge of a man-made island city with office towers. '
        'Blue seats along both sides, hand straps and sliding doors. '
        'Morning sun, the calm sea far below. '
        'dominant clear sky blue and sea blue, broad white interior, sparse warm morning orange accents, bright hopeful light. '
        'No driver, no other train.'), neg=SHORT_NEG),
    'mono-ext-s': dict(shot='mono-ext', prompt=(
        STYLE + 'painted clouds, a short monorail train of three cars riding high above a bay on a curving elevated monorail track. '
        'The train is almost at the island: the track runs into an elevated station at the edge of a large man-made island city with office towers. '
        'The office towers are catching the morning sun, the calm sea below with sunlight glittering on the water. '
        'dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light. '
        'No other city in the background, only the island and the monorail going toward it.'), neg=SHORT_NEG),
    'sales-s': dict(shot='sales', prompt=(
        STYLE + 'The sales department of a Japanese company office, mid-morning, seen from the entrance. '
        'Grey steel desks are pushed together in facing rows to make islands, and the section chief\'s desk sits at the head of each island. '
        'Office chairs, desk phones, binders and piles of documents on the desks. '
        'A whiteboard on the back wall and a row of windows with half-lowered blinds on the right. '
        'Soft even daylight and fluorescent light, muted grey and off-white colours. '
        'No sunbeams, no strong colours.'), neg=SHORT_NEG),
    # One change from sales-s: the must-not line named sunbeams and they appeared, so describe the light we want instead.
    'sales-s2': dict(shot='sales', prompt=(
        STYLE + 'The sales department of a Japanese company office, seen from the entrance. '
        'Grey steel desks pushed together in facing pairs make three long islands, and the section chief\'s desk sits across the head of each island. '
        'Office chairs, a desk phone at every seat, binders and piles of documents. '
        'A whiteboard on the back wall. A row of windows on the right with the blinds half down, overcast sky outside. '
        'Soft even fluorescent light, grey carpet, muted grey and off-white colours.'), neg=SHORT_NEG),
    # Exterior: img2img from Jørgen's approved bay master (its look) with the blockout's lines (the layout). Only what is visible.
    'mono-ext-r': dict(shot='mono-ext', init='tools/blockout/shots/ref-bay-1216.png', prompt=(
        STYLE + 'painted clouds, a short monorail train of three cars on a curving elevated monorail track above a bay, seen from behind. '
        'The track runs into an elevated station at the edge of a man-made island city with office towers. '
        'The office towers are catching the morning sun, the calm sea below with sunlight glittering on the water. '
        'dominant clear sky blue and sea blue, broad white cloud and glass, sparse warm sunrise orange accents, bright hopeful light.'), neg=SHORT_NEG),
    # Exterior, short and visible-only, with the house quality line (the bare style line drifted to poster art with starbursts).
    'mono-ext-s3': dict(shot='mono-ext', prompt=(
        BASE + 'A short white monorail train of three cars on a concrete beam high above the sea, seen from behind with red tail lights. '
        'The beam runs on tall pillars into an elevated station at the waterfront of a city with office towers. '
        'A second beam runs alongside in the foreground. Calm blue sea, clear morning sky.'), neg=SHORT_NEG),
    'mono-door-s': dict(shot='mono-door', init='tools/blockout/shots/ref-interior-1216.png', prompt=(
        STYLE + 'Interior view inside the monorail train, straight on angle at the sliding doors. '
        'Through the door windows a station platform with platform screen doors, pillars and a roof. '
        'Blue seats on both sides of the doors, grab poles and hand straps. '
        'Morning light. dominant clear sky blue, broad white and silver, sparse warm orange accents.'), neg=SHORT_NEG),
})

# Staging notes (shot-staging skill). For thinking and checking only; they never go into the prompt. Shown under each image.
STAGING = {
    'mono-int': dict(
        title='Final approach: the station ahead, platform on the right',
        beat='The announcement plays: 「まもなく、天川シティ中央駅です。お出口は右側です。」 The train is on the last stretch of guideway over the water, and the station is just ahead.',
        camera='Inside the empty front car, standing in the aisle about 5 m behind the big front window, eye level, looking forward.',
        height='The car rides on a beam about 15 m above the water, so from the windows you look down on the sea and the horizon sits at eye level.',
        front='The front window: the concrete guideway curving gently left over the last of the water into an elevated station with a long flat roof, towers behind it. '
              'Side windows: the sea below and the island shore ahead. Seats, straps, poles and doors on both sides.',
        behind='The mainland and the rest of the bay. Not in the picture.',
        sense='The train is on its beam (you only see the beam ahead, through the front window). The island is only ahead. No water at the window sill. No people.'),
    'mono-ext': dict(
        title='Final approach from outside: the train heading into the island station',
        beat='Establishing shot for the arrival: the train on its last stretch of guideway, the island city and its station right ahead of it.',
        camera='Outside, level with the guideway and off its right side over the water, looking forward along the line.',
        height='Camera about 20 m above the water, a little above the beam. The pillars stand in the water; the towers stand on land behind the seawall.',
        front='The train of three cars on its beam from behind and to the side, the last car nearest (red tail lights), the nose further on. '
              'The beam curves into the elevated station at the waterfront; the city behind it.',
        behind='The mainland. Not in the picture.',
        sense='A finite train (three cars, both ends visible) on its own beam, heading toward the island. No buildings in the water.'),
    'sales': dict(
        title='Sales, mid-morning: the island layout seen from the entrance',
        beat='About 10:30. He comes up from the basement to get a folder from Rei at her desk; a second salesperson could be a witness.',
        camera='Standing eye height just inside the department entrance, looking diagonally across the desk islands.',
        height='A normal office floor with a 2.7 m ceiling; the windows on the right look across at the next building.',
        front='Three islands of plain grey steel desks in facing pairs, the section chief\'s desk across the head of each island, chairs tucked in, '
              'a phone and a monitor at every seat, a whiteboard (行先ボード) and a sales chart on the back wall, blinds half down on the right. '
              'The nearest island has a tidier desk that can be Rei\'s.',
        behind='The entrance and the corridor. Not in the picture.',
        sense='Chairs face their desks, desks have legroom, one room only, no sunbeams, muted colours like the copy room, no readable text.'),
}
STAGING['mono-window'] = dict(
    title='Final approach: the right-hand window (the exit side)',
    beat='The announcement plays: 「まもなく、天川シティ中央駅です。お出口は右側です。」 Out of the right-hand window he sees the city close by, then the platform.',
    camera='Inside the empty car, facing the right-hand windows straight on, from across the aisle at seat height (Jørgen\'s angle from the interior master).',
    height='The car rides on its beam about 15 m up. The second guideway runs alongside at the same height, on pillars standing in the water.',
    front='The window, two empty seats below it. Through it: the sea below, the parallel guideway, the city close on the right; or, pulling in, the platform right outside.',
    behind='The left-hand windows and the aisle. Not in the picture.',
    sense='No water at the window sill; the city only on the side the train is heading to; no people; one window (no window inside the window).')
STAGING['mono-ext-r'] = STAGING['mono-ext-s3'] = STAGING['mono-ext']
STAGING['mono-int-s'], STAGING['mono-ext-s'], STAGING['sales-s'], STAGING['sales-s2'] = STAGING['mono-int'], STAGING['mono-ext'], STAGING['sales'], STAGING['sales']


def wait_turn():
    """Queue only when the shared ComfyUI queue is idle, or has at most two pending jobs after a minute (other agents share the GPU)."""
    t = time.time()
    while True:
        try:
            d = json.loads(urllib.request.urlopen(comfy.HOST + '/queue').read())
            if not d['queue_running'] and not d['queue_pending']:
                return
            if time.time() - t > 60 and len(d['queue_pending']) <= 2:
                return
        except Exception:
            pass
        time.sleep(3)


def render(job, mode, seed, **kw):
    j = JOBS[job]
    name = f'{job}-{mode}-{seed}' + (kw.pop('tag', '') or '')
    path = os.path.join(OUT, name + '.png')
    if os.path.exists(path):
        return path
    if 'init' in j and 'init' not in kw:
        kw['init'] = os.path.join(HERE, '..', '..', j['init'])
    wf = build(mode, SHOTS, j['shot'], j['prompt'], j['neg'], seed=seed, **kw)
    wait_turn()
    t = time.time()
    comfy.run(wf, path)
    m = [e for e in load_manifest() if not (e['batch'] == 'B1' and e['name'] == name)]
    m.append({'batch': 'B1', 'name': name, 'model': 'rdbtAnima', 'prompt': j['prompt'], 'negative': j['neg'], 'seed': seed, 'w': 1216, 'h': 832,
              'file': f'B1/{name}.png', 'mode': mode, 'control': kw, 't': round(time.time() - t)})
    json.dump(m, open(MANIFEST, 'w'), ensure_ascii=False, indent=1)
    print('ok', name, round(time.time() - t), 's', flush=True)
    return path


if __name__ == '__main__':
    for a in sys.argv[1:]:
        parts = a.split(':')
        job = parts[0]
        mode = parts[1] if len(parts) > 1 else 'both'
        seeds = [int(s) for s in parts[2].split(',')] if len(parts) > 2 else [7101]
        kw = {}
        if len(parts) > 3:  # e.g. denoise=0.9,strength=0.8 -> also tagged into the file name
            for kv in parts[3].split(','):
                k, v = kv.split('=')
                kw[k] = v if k == 'lines_model' else float(v)
            kw['tag'] = '-' + parts[3].replace('=', '').replace(',', '-')
        for s in seeds:
            render(job, mode, s, **dict(kw))
