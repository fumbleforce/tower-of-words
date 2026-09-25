"""Day-1 location backgrounds, round 1 (monorail interior, gate, Sales) on RDBT Anima, 1216x832 (game bg aspect ~1.46).
Usage: ~/ai/sd/venv/bin/python tools/locations1.py [name ...]   (no args = all)
Output: art/production/L1/<name>.png (gitignored; PNGs embed the workflow) plus art/production/manifest.json entries.
Waits until the shared ComfyUI queue is empty before queueing each image, so other agents' jobs go first."""
import sys, os, json, time, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
import comfy
from production import run, Q, NO_PEOPLE_N, RDBT

BASE = f'{Q}, safe, no humans, scenery, background art for a visual novel, '
NEG = NO_PEOPLE_N + (', people, silhouette, passenger, readable text, letters, logo, brand name, signage text, '
                     'duplicate objects, floating objects, impossible architecture, distorted perspective, warped lines')

MONO_PAL = 'bright morning light, dominant pale sky blue and sea blue, broad white and light grey interior, sparse teal seat and orange accents'
GATE_PAL = 'cool morning light, dominant white stone and pale grey, broad glass blue, sparse navy and teal accents'
SALES_PAL = 'crisp daylight and cool LED panel light, dominant white and graphite, broad pale wood, sparse teal and red accents'

MONO_VIEW = ('outside the windows: Tokyo Bay seen from high up, calm blue sea far below, '
             '(an elevated concrete monorail guideway beam on tall concrete pillars rising out of the sea:1.4), '
             'in the distance a large man-made island covered with glass office towers of one company city')
MONO_NEG = NEG + ', train on water, floating train, rails on water, bridge without pillars, bed, sofa, living room'

GATE_NEG = NEG + ', train station, ticket machines, railway platform, shop, bed'
COPY_PAL = 'cold flat fluorescent light, dominant pale grey-green walls, broad off-white paper and beige copier plastic, sparse green copier-panel glow and red toner-box accents'
COPY_NEG = NEG + ', large window, window view, sunlight, sky, open plan office, desk with computer, bed, sofa, green glowing floor'
ANIME_BG = '(anime background art, flat cel shading, bold clean lineart, hand-painted anime style:1.4), '
SALES_NEG = NEG + ', photo, realistic lighting, 3d render, cgi, skylight, glass roof, bed, sofa, living room, classroom, home office, cluttered junk, dirty'

JOBS = {
    # Monorail interior. A: facing the side windows. B: looking forward through a driverless front window (Yurikamome-style).
    'monorail-side': (
        BASE + 'inside a modern Japanese monorail commuter carriage, camera at seated eye level in the aisle facing the right-hand side of the car, '
        'a long cushioned bench seat running along the wall under a row of wide windows, stainless steel grab poles, hanging hand straps from a ceiling rail, '
        'blank advertising frames above the windows, a pair of sliding doors at the right edge, clean floor, '
        f'{MONO_VIEW}, the island in the right part of the window view, {MONO_PAL}', MONO_NEG, (1101, 1102, 1103)),
    'monorail-front': (
        BASE + 'inside the front car of a driverless Japanese monorail, camera standing in the aisle looking forward along the car toward a large panoramic front window, '
        'no driver cab, a few forward-facing seats by the front window, long bench seats along both side walls with windows above, grab poles, hanging hand straps, '
        'through the front window: (the straight concrete monorail beam continuing ahead of the train on tall pillars across the sea:1.5), '
        'the beam leads to a large man-made island with glass office towers of one company city in the distance, calm Tokyo Bay, '
        f'{MONO_PAL}', MONO_NEG, (1201, 1202, 1203)),
    'monorail-across': (
        BASE + 'inside a Japanese monorail commuter carriage, (flat frontal view straight across the aisle at the opposite wall:1.5), camera seated on one bench looking at the other side, '
        'one long teal cushioned bench seat along the opposite wall, above it a row of three wide windows, hand straps hanging from a ceiling rail in a straight row across the top, '
        'a closed sliding door at the right edge, clean grey floor, symmetrical composition, '
        f'{MONO_VIEW}, the island in the right window, {MONO_PAL}', MONO_NEG + ', platform, rails, tracks, second train, open air', (1401, 1402, 1403)),
    'monorail-window': (
        BASE + 'inside a Japanese monorail carriage, camera beside a large window looking out at an angle, the window frame and a seat back in the foreground, a grab pole, '
        f'{MONO_VIEW}, (the guideway beam curving ahead in a gentle arc toward the island, seen through the window:1.3), morning sun on the water, '
        f'{MONO_PAL}', MONO_NEG, (1301, 1302)),
    # Gate. A: lobby with speed gates and a guard podium. B: outdoor campus entrance plaza with gates and a guard booth.
    'gate-lobby': (
        BASE + 'the huge entrance lobby of a Japanese conglomerate headquarters tower, camera at eye level approaching a row of waist-high glass-flap security speed gates for ID cards, '
        'one card reader on top of each gate, a security guard podium desk with a small monitor beside the gates on the left, '
        'a high double-height atrium beyond the gates with a bank of elevator doors at the back wall, polished stone floor, tall glass facade on the right, '
        'a large abstract wall relief without text, a few potted trees, '
        f'{GATE_PAL}', GATE_NEG, (2101, 2102, 2103)),
    'gate-plaza': (
        BASE + 'the pedestrian security entrance to a company city on an island, camera at eye level on a wide paved walkway approaching the entrance, '
        'a long flat steel canopy over a row of waist-high glass-flap ID card security gates, a small glass guard booth with a counter window next to the gates, '
        'office towers of the company city rising behind, trimmed trees and planters, a concrete monorail beam passing overhead in the background, clear morning sky, '
        f'{GATE_PAL}', GATE_NEG, (2201, 2202)),
    'gate-hall': (
        BASE + 'indoors, the ground-floor security hall of a Japanese corporate headquarters, camera at eye level in front of the gates, '
        '(a row of six low waist-high security speed gates with short glass flaps and open walking lanes between them:1.4), a card reader on each gate, '
        'a small glass-walled security guard booth with a counter and a desk lamp at the left end of the gate row, '
        '(behind the gates a wide corridor leading to a bank of four steel elevator doors:1.3), stone-clad walls, polished stone floor, recessed ceiling lights, '
        'one wall with a large abstract relief without text, a low planter, '
        f'{GATE_PAL}', GATE_NEG + ', outdoors, sky, trees, sea, fence', (2301, 2302, 2303)),
    # Sales: busy open-plan Japanese sales floor, island desks (shima), dual monitors, target board.
    'sales-floor': (
        BASE + 'a busy modern open-plan sales department on the third floor of a Japanese corporate tower, camera at standing eye level in the main aisle looking along the floor, '
        'long rows of white desks pushed together in facing pairs (island desk layout), every desk with two monitors, a desk phone with a headset, papers, folders and a coffee cup, '
        'black mesh office chairs pushed back as if people just stood up, a manager desk at the head of each row facing the others, '
        'a big wall-mounted screen with bar charts and a red target line (no readable text), a glass-walled meeting room on the left, '
        'tall windows along the far wall showing other office towers, clean light grey carpet, ceiling with rows of flat LED panels, '
        f'{SALES_PAL}', SALES_NEG, (3101, 3102, 3103)),
    'sales-desk': (
        BASE + 'a modern sales department in a Japanese corporate tower, camera at eye level standing in front of one tidy desk at the end of a row, '
        'the desk with two monitors showing charts, a keyboard, a neat stack of folders, a desk phone and a slim laptop, a black mesh chair, '
        'behind it more desks in rows with two monitors each, a wall screen with sales graphs (no readable text), glass meeting room walls, '
        'tall windows with the company towers outside, '
        f'{SALES_PAL}', SALES_NEG, (3201, 3202)),
    'sales-island': (
        BASE + ANIME_BG + '(empty room, no people:1.5), a hard-working open-plan sales department in a Japanese company office during lunch break, everyone out, camera at standing eye level at the end of the main aisle, '
        '(Japanese island desk layout: long blocks of desks pushed together face to face, people sit on both long sides facing each other across the block:1.3), '
        'every desk with two monitors, a desk phone with a headset, stacked folders, papers and coffee cups, black mesh chairs pushed back at odd angles, '
        'a manager desk across the far end of each block, a big wall screen at the far wall with bar charts and a red target line, a whiteboard with a bar chart, '
        'a glass-walled meeting room on the left, tall windows on the right with other office towers outside, grey carpet tiles, flat LED ceiling panels, '
        f'{SALES_PAL}', SALES_NEG, (3301, 3302, 3303, 3304, 3305, 3306)),
    # Round 2 monorail: the carriage rides on the beam ~15 m above the bay, so the side windows look DOWN on the water,
    # the horizon sits low in the window, and no beam or pillars are visible sideways. Beam/pillars are not named at all.
    'monorail-high': (
        BASE + 'inside an empty Japanese monorail carriage, camera standing in the aisle at eye level looking down the length of the car, '
        'long teal bench seats along both walls under wide windows, hand straps hanging from ceiling rails, grab poles, a pair of sliding doors on the right wall, '
        'the train is high above the sea: (through the windows mostly open sky, the horizon low in the windows, the calm sea far below:1.3), '
        'through the right-hand windows a distant island city of glass office towers, small on the horizon, '
        f'{MONO_PAL}', MONO_NEG + ', bridge, pillars, columns, viaduct, elevated track outside, rails, waves at window level, water at the window sill, beach',
        (1501, 1502, 1503, 1504, 1505, 1506)),
    # One change from monorail-high: the window-view phrase names the horizon's place in the frame.
    'monorail-high2': (
        BASE + 'inside an empty Japanese monorail carriage, camera standing in the aisle at eye level looking down the length of the car, '
        'long teal bench seats along both walls under wide windows, hand straps hanging from ceiling rails, grab poles, a pair of sliding doors on the right wall, '
        'the train is high above the sea: (through the windows the horizon line sits in the lower third of each window, sky fills most of the window, the calm sea far below:1.3), '
        'through the right-hand windows a distant island city of glass office towers, small on the horizon, '
        f'{MONO_PAL}', MONO_NEG + ', bridge, pillars, columns, viaduct, elevated track outside, rails, waves at window level, water at the window sill, beach',
        (1601, 1602, 1603, 1604)),
    # One change from monorail-high2: a scale cue (a tiny boat and wake far below) so the height reads.
    'monorail-high3': (
        BASE + 'inside an empty Japanese monorail carriage, camera standing in the aisle at eye level looking down the length of the car, '
        'long teal bench seats along both walls under wide windows, hand straps hanging from ceiling rails, grab poles, a pair of sliding doors on the right wall, '
        'the train is high above the sea: (through the windows the horizon line sits in the lower third of each window, sky fills most of the window, the calm sea far below:1.3), '
        'a tiny boat far below trailing a thin white wake, '
        'through the right-hand windows a distant island city of glass office towers, small on the horizon, '
        f'{MONO_PAL}', MONO_NEG + ', bridge, pillars, columns, viaduct, elevated track outside, rails, waves at window level, water at the window sill, beach',
        (1701, 1702, 1703, 1704)),
    # One change from monorail-high2: the camera sits low on the end seat, so the horizon (at eye level) falls lower in the windows.
    'monorail-high4': (
        BASE + 'inside an empty Japanese monorail carriage, (camera low, seated on the end seat, looking down the length of the car:1.2), '
        'long teal bench seats along both walls under wide windows, hand straps hanging from ceiling rails, grab poles, a pair of sliding doors on the right wall, '
        'the train is high above the sea: (through the windows the horizon line sits in the lower third of each window, sky fills most of the window, the calm sea far below:1.3), '
        'through the right-hand windows a distant island city of glass office towers, small on the horizon, '
        f'{MONO_PAL}', MONO_NEG + ', bridge, pillars, columns, viaduct, elevated track outside, rails, waves at window level, water at the window sill, beach, boat',
        (1801, 1802, 1803, 1804)),
    # Round 2 Sales: plain house prompt (as the office and copy room), back from the garish ANIME_BG version.
    # Step A = the semi-realistic sales-floor prompt with one change: "busy" -> "empty" (keeps people out). Step B adds the island-desk sentence.
    'sales-plain': (
        BASE + 'an empty modern open-plan sales department on the third floor of a Japanese corporate tower, camera at standing eye level in the main aisle looking along the floor, '
        'long rows of white desks pushed together in facing pairs (island desk layout), every desk with two monitors, a desk phone with a headset, papers, folders and a coffee cup, '
        'black mesh office chairs pushed back as if people just stood up, a manager desk at the head of each row facing the others, '
        'a big wall-mounted screen with bar charts and a red target line (no readable text), a glass-walled meeting room on the left, '
        'tall windows along the far wall showing other office towers, clean light grey carpet, ceiling with rows of flat LED panels, '
        f'{SALES_PAL}', NEG + ', skylight, glass roof, bed, sofa, living room, classroom, home office, cluttered junk, dirty', (3401, 3402, 3403)),
    'sales-plain-b': (
        BASE + 'an empty open-plan sales department in a Japanese company office, camera at standing eye level at the end of the main aisle, '
        'long blocks of desks pushed together face to face, chairs on both long sides, '
        'every desk with two monitors, a desk phone with a headset, stacked folders, papers and coffee cups, black mesh chairs pushed back at odd angles, '
        'a whiteboard with a bar chart and a red target line at the far wall, a glass-walled meeting room on the left, tall windows on the right with other office towers outside, '
        'grey carpet tiles, flat LED ceiling panels, '
        f'{SALES_PAL}', NEG + ', skylight, glass roof, bed, sofa, living room, classroom, home office', (3501, 3502, 3503)),
    # Copy room: small, windowless, secluded, one door with a small window; bulky old copier as centrepiece.
    'copyroom-door': (
        BASE + 'a small windowless office copy room, camera at eye level in the back corner of the room looking toward the only door, '
        '(one closed grey door in the far wall with a small narrow wired-glass window in it showing the lit corridor outside:1.4), '
        'a big old bulky beige multifunction copier standing against the right wall with its paper trays and a finisher unit, a small green control panel, '
        'a waist-high counter along the left wall with stacks of copy paper reams, a heavy desk stapler and a hole punch, '
        'metal shelves with toner boxes and paper boxes, a wall clock, fluorescent tube ceiling lights, grey vinyl floor, bare walls, secluded and quiet, '
        f'{COPY_PAL}', COPY_NEG, (4101, 4102, 4103)),
    'copyroom-copier': (
        BASE + 'a cramped windowless copy room in a Japanese office building, camera at eye level just inside the door looking into the room, '
        '(a large old bulky beige multifunction office copier as the centrepiece against the back wall:1.4), its lid closed, output trays with a small stack of copies, a sorter-stapler finisher on its side, '
        'a narrow worktable beside it with paper reams, a stapler and a box of staples, metal shelving with toner cartridges in boxes on the left wall, '
        'a recycling bin full of paper, no windows at all, one fluorescent ceiling panel, scuffed grey walls, '
        f'{COPY_PAL}', COPY_NEG, (4201, 4202, 4203)),
}


STAGING_ALIAS = {'monorail-high2': 'monorail-high', 'monorail-high3': 'monorail-high', 'monorail-high4': 'monorail-high'}
# Staging notes (shot-staging skill). Beat is shown under each image on proto2/locations1.
STAGING = {
    'monorail-side': dict(
        beat='He arrives on the island to live there: an empty mid-morning carriage, the island coming up on the exit side.',
        camera='inside the car, standing eye level at one end of the aisle, facing forward along the car',
        front='benches and straps in the foreground; windows on both walls; the right-hand doors; through the right windows the bay and the island ahead-right; a second beam on pillars through the left windows',
        behind='the rest of the train and the mainland: not in the prompt',
        motion='the train runs forward (away from the camera) toward the island, which shows ahead through the right-hand windows',
        light='morning sun through the windows, sunlit patches on the floor',
        sense='train on a beam high above the water, not on it; one door pair; no people; no readable text'),
    'monorail-across': dict(
        beat='Same arrival moment, framed down the empty car with the island in the right-hand windows by the exit doors.',
        camera='inside the car, seated/standing eye level in the aisle, facing forward along the car', front='as monorail-side',
        behind='mainland and the rest of the train', motion='forward, toward the island ahead-right', light='morning sun',
        sense='as monorail-side'),
    'monorail-window': dict(
        beat='The first look at his new home: the beam curves ahead across the bay to the island.',
        camera='inside the car beside a side window, eye level, facing diagonally forward along the route',
        front='window frame, a seat back and a pole in the foreground; the guideway curving ahead on pillars; the island city at the end of the curve',
        behind='the mainland and the train behind: not in the prompt',
        motion='the train runs toward the island along the curve seen ahead', light='low morning sun from the left',
        sense='beam on pillars from the sea bed, pillars joined to the beam; the carriage wall present on both sides of the window'),
    'monorail-high': dict(
        beat='He arrives to live on the island: an empty carriage high over the bay, the island city ahead on the exit (right) side.',
        camera='inside the car, standing in the aisle at eye level (about 1.6 m above the car floor), facing forward down the car',
        height='the beam top is about 15 m above the sea, so the eye is about 16 m up; side windows show mostly sky, the horizon low in each window, the water far below and seen from above; the island (several km away) is small on the horizon',
        front='benches and straps in the foreground; windows on both walls; doors on the right wall; sky, low horizon and distant water through the windows; the island city small in the right-hand windows',
        behind='the rest of the train, the mainland; the beam under the car (not visible from a side window): none of it in the prompt',
        motion='the train runs forward, toward the island ahead-right', light='morning sun, soft patches on the floor',
        sense='no beam, pillars or bridge outside the side windows; no water at the sill; no people; no readable text'),
    'sales-plain': dict(
        beat="Rei's floor: rows of desks and screens that make the basement look shabby. People come in as sprites.",
        camera='standing eye level in the main aisle, facing along the floor to the chart screen', height='third floor; other towers outside at similar and greater height',
        front='desk rows either side, monitors, phones, folders; the chart on the far wall; windows', behind='the lifts and entrance', motion='none',
        light='daylight plus LED panels', sense='chairs on the monitor side with legroom; no people; no readable text; colours as muted as the office and copy room'),
    'sales-plain-b': dict(
        beat="Rei's floor: rows of desks and screens that make the basement look shabby. People come in as sprites.",
        camera='standing eye level at the end of the main aisle, facing the whiteboard', height='third floor', front='desk blocks either side, the whiteboard, windows right',
        behind='the lifts and entrance', motion='none', light='daylight plus LED panels', sense='as sales-plain'),
    'gate-lobby': dict(
        beat='Ishibashi stops him at the gate: a row of ID card gates with a guard post beside them.',
        camera='indoors, eye level, a few metres in front of the gate row, facing the gates',
        front='open floor; the gate row with card readers; the guard podium at the left end; the atrium beyond',
        behind='the entrance doors he just came through', motion='none', light='daylight from a glass roof or facade',
        sense='gates have walk-through lanes and readers; a place for the guard to stand; no text'),
    'gate-hall': dict(
        beat='Same beat, with the elevators he is heading for visible behind the gates.',
        camera='indoors, eye level, in front of the gates, facing the lift lobby', front='gates with lanes, guard booth left, corridor to the lifts',
        behind='entrance doors', motion='none', light='recessed ceiling light and side daylight', sense='as gate-lobby'),
    'copyroom-door': dict(
        beat='He is alone with the copier, and the only door has a small window anyone passing could look through.',
        camera='inside, eye level, back corner of the room, facing the door',
        front='paper reams on the counter left; the copier on the right; the one door with its small wired-glass window in the far wall',
        behind='the back wall of the room', motion='none', light='fluorescent tubes only, no daylight',
        sense='no windows; exactly one door; one clock; copier used from the front'),
    'copyroom-copier': dict(
        beat='The copier he has to get 30 sets out of, in a small room nobody visits.',
        camera='at the doorway, eye level, facing into the room', front='shelves of toner left, the copier against the back wall, a worktable with reams right',
        behind='the corridor and the door', motion='none', light='one fluorescent panel, no daylight', sense='no windows; copier stands on the floor; no text'),
    'sales-island': dict(
        beat='Rei\'s floor: rows of busy-looking desks that make the basement look shabby. People are added as sprites.',
        camera='standing eye level at the end of the main aisle, facing along the floor to the target board',
        front='desk blocks either side of the aisle with monitors, phones, folders and cups; the chart board on the far wall; windows right',
        behind='the lifts and the entrance', motion='none', light='daylight from the windows plus LED panels',
        sense='chairs on the monitor side of each desk with legroom; no people; no readable text'),
}


def queue_empty():
    try:
        d = json.loads(urllib.request.urlopen(comfy.HOST + '/queue').read())
        return not d['queue_running'] and not d['queue_pending']
    except Exception:
        return False


def wait_turn():
    """Wait for the shared queue to drain; after 60 s take a normal FIFO place once nothing is pending
    (the other agents also queue one job at a time, so the queue is rarely fully empty)."""
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


if __name__ == '__main__':
    names = sys.argv[1:] or list(JOBS)
    extra = {}  # name -> list of seeds, e.g. monorail-front:1210,1211
    for n in list(names):
        if ':' in n:
            k, s = n.split(':'); extra[k] = [int(x) for x in s.split(',')]; names.remove(n); names.append(k)
    for k in dict.fromkeys(names):
        p, neg, seeds = JOBS[k]
        for seed in extra.get(k, seeds):
            if os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'art', 'production', 'L1', f'{k}-{seed}.png')):
                continue
            wait_turn()
            run('L1', f'{k}-{seed}', p, neg, 1216, 832, seed, RDBT)


def fix(src, out, box, prompt, negative, seed=7, denoise=0.95):
    """Repaint one rectangle (x0, y0, x1, y1 in image pixels) of an L1 render with the masked img2img workflow
    (tools/workflows/anima-img2img-masked.json); used to paint out a logic error such as a window in a windowless room."""
    from PIL import Image, ImageDraw, ImageFilter
    d = os.path.join(os.path.dirname(__file__), '..', 'art', 'production', 'L1')
    im = Image.open(os.path.join(d, src + '.png'))
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rectangle(box, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(8)).convert('RGB')
    mp = os.path.join(d, out + '-mask.png'); m.save(mp)
    img, mask = comfy.upload(os.path.join(d, src + '.png')), comfy.upload(mp)
    wf = json.load(open(os.path.join(os.path.dirname(__file__), 'workflows', 'anima-img2img-masked.json')))
    wf['4']['inputs']['text'], wf['5']['inputs']['text'] = prompt, negative
    wf['10']['inputs']['image'], wf['12']['inputs']['image'] = img, mask
    wf['7']['inputs'].update(seed=seed, denoise=denoise)
    wf['9']['inputs']['filename_prefix'] = 'locations1-fix'
    wait_turn()
    comfy.run(wf, os.path.join(d, out + '.png'))
    print('ok fix', out, flush=True)
