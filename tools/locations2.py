"""Day-1 locations, round 2: the basement office (Planning Office 7, redone from scratch) and the player's dorm room.
RDBT Anima, 1216x832, no people. Staging notes (shot-staging skill) in STAGING; the page shows them under each image.
Usage: ~/ai/sd/venv/bin/python tools/locations2.py [name[:seed,seed] ...]   (no args = all)
Output: art/production/L2/<name>-<seed>.png (gitignored; PNGs embed the workflow) plus art/production/manifest.json entries.
Workflow file: tools/workflows/location-bg-rdbt.json (the same text-to-image graph as round 1)."""
import sys, os, json, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy
from production import run, Q, NO_PEOPLE_N, RDBT

BASE = f'{Q}, safe, no humans, scenery, background art for a visual novel, '
NEG = NO_PEOPLE_N + (', people, silhouette, readable text, letters, logo, brand name, signage text, '
                     'duplicate objects, floating objects, impossible architecture, distorted perspective, warped lines')

# ---------------- Basement office: Planning Office 7, basement level 2 ----------------
OFFICE_ROOM = ('a large forgotten basement office room about ten metres wide and eight metres deep on the second basement level of a corporate tower, '
               'low ceiling of bare concrete with exposed grey pipes, ducts and cable trays, long fluorescent tube lights in plain fixtures, one tube dimmer than the rest, '
               'scuffed pale grey vinyl floor tiles, painted concrete block walls in faded institutional green-grey, ')
OFFICE_STUFF = ('an old grey steel filing cabinet row along one wall with cardboard file boxes stacked on top, a dusty whiteboard with faded scribbles and no readable text, '
                'a small coffee machine and an electric kettle on a low cabinet, a dying potted plant, '
                'several (empty instant ramen cups with disposable chopsticks:1.3) left on the desks, '
                'a little shabby and neglected but used every day, ')
MIO_CORNER = ('(in the far corner a gaming setup: a desk with three monitors, a tower PC with coloured fan lights, a black gaming chair, '
              'a headset hanging on a monitor, empty energy drink cans, a stack of empty ramen cups:1.3), ')
OFFICE_PAL = 'cool flat fluorescent light, no daylight, dominant grey-green concrete, broad pale grey floor, sparse warm desk-lamp orange and small blue-magenta PC glow accents'
OFFICE_NEG = (NEG + ', window, large window, window view, sky, sunlight, sunbeam, daylight, trees, garden, carpet, cozy home office, living room, bed, sofa, '
              'cubicles, open-plan office floor, glass walls, modern office, skyscraper view, crowded, cramped, narrow room')

OFFICE = {
    # A: the establishing shot, from the doorway.
    'office-door': (
        BASE + '(wide establishing shot:1.3), camera at standing eye level just inside the entrance door in one corner of the room, looking diagonally across the whole room toward the far corner, '
        + OFFICE_ROOM +
        '(open empty floor space in the foreground and walkways between the desks:1.4), '
        'in the middle of the room four old mismatched steel office desks pushed together in two facing pairs, each desk with an office chair tucked in and an old monitor and keyboard, '
        'a fifth desk alone at the far wall facing the group, the team leader\'s desk, with a desk lamp and neat stacks of folders, '
        + MIO_CORNER + OFFICE_STUFF + OFFICE_PAL, OFFICE_NEG, (5101, 5102, 5103)),
    # B: reverse angle, from Mio's corner back toward the only door.
    'office-reverse': (
        BASE + '(wide shot:1.3), camera at standing eye level in the far corner of the room, looking back across the room toward the only door, '
        + OFFICE_ROOM +
        '(one plain grey steel door with a small wired-glass window in the far wall:1.3), a light switch and a wall clock beside it, '
        '(plenty of open floor space and walkways:1.3), in the middle of the room four old mismatched steel office desks pushed together in two facing pairs, '
        'office chairs at the desks, old monitors and keyboards, one chair pulled out and turned, '
        'in the foreground on the right the edge of a gaming desk with a monitor and an empty energy drink can, '
        + OFFICE_STUFF + OFFICE_PAL, OFFICE_NEG.replace(', window,', ','), (5201, 5202)),
    # C: a high corner view, so the floor plan reads at a glance.
    'office-high': (
        BASE + '(high angle wide shot from up near the ceiling in one corner of the room, looking down across the whole room:1.4), '
        + OFFICE_ROOM +
        '(wide open floor with space to walk around the desks:1.3), four old mismatched steel office desks pushed together in two facing pairs in the middle, each with a chair and an old monitor, '
        'the team leader\'s desk alone near the far wall facing them, '
        + MIO_CORNER + OFFICE_STUFF + OFFICE_PAL, OFFICE_NEG, (5301, 5302)),
    # Round-1 check: every office render came out as a symmetric view toward the far wall with desks along the walls;
    # none kept a desk island. One change each from office-door / office-high:
    # D: camera faces the far wall (what the model does anyway) and the island is the one weighted phrase.
    'office-island': (
        BASE + '(wide establishing shot:1.3), camera at standing eye level just inside the entrance, looking straight across the room to the far wall, '
        + OFFICE_ROOM +
        '(in the middle of the floor one block of four old steel desks pushed together, two facing two, with open floor all around it:1.4), '
        'each desk with an office chair and an old monitor and keyboard, '
        'a fifth desk alone at the far wall facing the group, the team leader\'s desk, with a desk lamp and neat stacks of folders, '
        + MIO_CORNER + OFFICE_STUFF + OFFICE_PAL, OFFICE_NEG, (5401, 5402)),
    # E: the high view named as a ceiling security camera.
    'office-cctv': (
        BASE + '(bird\'s-eye view from a security camera mounted in a ceiling corner, looking down at the floor:1.4), '
        + OFFICE_ROOM +
        '(wide open floor with space to walk around the desks:1.3), four old mismatched steel office desks pushed together in two facing pairs in the middle, each with a chair and an old monitor, '
        'the team leader\'s desk alone near the far wall facing them, '
        + MIO_CORNER + OFFICE_STUFF + OFFICE_PAL, OFFICE_NEG, (5501, 5502)),
}

# ---------------- Dorm room: his new company dorm, first night ----------------
DORM_ROOM = ('a small new Japanese company dormitory studio apartment for one person, about three metres wide and six metres long, '
             'plain white walls, light wood-look flooring, a round white LED ceiling light, ')
# The dorm room is on the 6th floor (eye about 17 m up). The office towers a few hundred metres away are much taller:
# their middle floors sit level with the window and they rise past its top; a lit street runs below.
CITY = ('(through the window at night: lit office towers a few hundred metres away, their lit floors level with the window and the towers rising past the top of the window, '
        'a street with street lights further down, a dark blue night sky:1.3), ')
BED = ('(one single bed with a plain grey-blue duvet and exactly one pillow at the head end:1.4), the head of the bed against the wall, ')
BOXES = '(three unopened brown cardboard moving boxes sealed with plain tape:1.3) stacked on the floor, no writing on the boxes, '
DORM_PAL = 'night, warm white ceiling light inside, dominant soft white walls and pale wood, broad deep night blue in the window, sparse warm city-light yellow accents'
DORM_NEG = (NEG + ', two pillows, pillows at both ends of the bed, second pillow at the foot, double bed, bunk bed, two beds, futon, messy room, clothes on the floor, '
            'daytime, sunlight, blue sky, posters, decorations, plants, television, sofa, large apartment, luxury hotel room, balcony furniture')

DORM = {
    # A: from the entrance, down the length of the room to the window.
    'dorm-entry': (
        BASE + 'camera at standing eye level just inside the front door, looking down the length of the narrow room toward the window on the far wall, '
        + DORM_ROOM +
        'on the left in the foreground a compact kitchenette along the wall: a short steel counter with a sink and one electric hob, a small fridge under the counter, '
        'further along on the left a plain desk with a chair and a desk lamp, '
        'on the right a single bed along the right-hand wall, ' + BED.replace('the head of the bed against the wall', 'the head of the bed at the window end, the foot of the bed toward the camera') +
        BOXES.replace('stacked on the floor', 'stacked on the floor in the middle of the room') +
        '(one large window filling the far wall with the curtains open:1.2), ' + CITY + DORM_PAL, DORM_NEG, (6101, 6102)),
    # B: across the room, the bed under the window.
    'dorm-window': (
        BASE + 'camera at standing eye level by the inner wall, looking across the small room at the window wall, '
        + DORM_ROOM +
        '(one wide window in the far wall with thin curtains pushed to the sides:1.2), ' + CITY +
        'a single bed along the window wall under the window, its head against the left wall, ' + BED.replace('the head of the bed against the wall, ', '') +
        'a plain desk and chair on the right with a desk lamp, ' + BOXES.replace('stacked on the floor', 'stacked on the floor at the foot of the bed') +
        'bare and new, nothing unpacked yet, ' + DORM_PAL, DORM_NEG, (6201, 6202)),
    # C: lights off, just switched on nothing: the room lit only by the city outside and the hallway light behind him.
    'dorm-dark': (
        BASE + 'camera at standing eye level just inside the front door, looking into the dark room toward the window on the far wall, '
        + DORM_ROOM.replace('a round white LED ceiling light, ', 'the ceiling light switched off, ') +
        '(the room lit only by the city lights through the large window and a spill of warm light on the floor from behind the camera:1.3), '
        'a single bed along the right-hand wall, ' + BED.replace('the head of the bed against the wall', 'the head of the bed at the window end, the foot of the bed toward the camera') +
        'a plain desk with a chair on the left, ' + BOXES +
        '(one large window filling the far wall with the curtains open:1.2), ' + CITY +
        'night, dark room in cool blue shadow, dominant deep blue, broad black shadow, sparse warm yellow city light and one warm light spill on the floor',
        DORM_NEG.replace(', daytime', ', bright room, daytime'), (6301, 6302)),
}

JOBS = {**OFFICE, **DORM}

STAGING = {
    'office-door': dict(
        script='Day 1, 9:00: he walks into Planning Office 7 for the first time; Mio, at her game, asks 「……誰？」 and Emi greets him (both added as sprites).',
        place='a room on basement level 2 of the company tower, about 8 m under the street; one door to a lit corridor from the lifts',
        height='camera 1.6 m above the floor; ceiling about 2.6 m, so the pipes and trays hang low over the desks',
        beat='His first look at Planning Office 7: a big, forgotten basement room with space for a team, used every day and nobody\'s priority.',
        camera='standing eye level just inside the door in one corner, facing diagonally across the room to the far corner',
        front='open floor in the foreground; the four-desk island (two facing pairs) in the middle; Emi\'s desk alone at the far wall facing it; Mio\'s gaming corner in the far corner; filing cabinets, whiteboard, coffee machine along the walls',
        behind='the door and the corridor he came down (not in the prompt)',
        motion='none', light='fluorescent tubes only, no daylight (B2 has no windows)',
        sense='no windows; chairs at desks facing their monitors; floor space to walk between desks; ramen cups on desks, not floating; no text'),
    'office-reverse': dict(
        script='Same morning; for scenes where someone comes in through the door (Emi back from the meeting at 18:10).',
        place='basement level 2, as office-door', height='camera 1.6 m; ceiling about 2.6 m',
        beat='The same room seen from Mio\'s corner: the one door everyone comes through, and how far the desks are from it.',
        camera='standing eye level in the far corner by Mio\'s desk, facing back to the door',
        front='the edge of Mio\'s gaming desk in the right foreground; the desk island; the single door in the far wall with a small wired-glass window, a clock and a light switch beside it',
        behind='Mio\'s monitors and the back wall', motion='none', light='fluorescent tubes only',
        sense='exactly one door; no windows; the door leads to a lit corridor; no text'),
    'office-high': dict(
        script='Any office scene, if a readable floor plan helps.', place='basement level 2, as office-door', height='camera about 2.4 m up in the corner, just under the ceiling',
        beat='A floor-plan view: who sits where, and how much room there is.',
        camera='high up in a ceiling corner, looking down across the room', front='the whole floor: desk island, Emi\'s desk, Mio\'s corner, cabinets and the walkways',
        behind='the corner walls under the camera', motion='none', light='fluorescent tubes only',
        sense='no windows; pipes on the ceiling, not the floor; desks with chairs; no text'),
    'office-island': dict(
        script='Day 1, 9:00: he walks in; Mio at her game, Emi at her desk (sprites).', place='basement level 2, as office-door',
        height='camera 1.6 m; ceiling about 2.6 m',
        beat='As office-door, with the four desks as one block in the middle so there is floor on every side.',
        camera='standing eye level just inside the entrance, facing the far wall',
        front='open floor; the four-desk block; Emi\'s desk at the far wall facing it; Mio\'s gaming corner in a far corner; cabinets and whiteboard on the walls',
        behind='the door and corridor', motion='none', light='fluorescent tubes only', sense='as office-door'),
    'office-cctv': dict(
        script='Any office scene, if a readable floor plan helps.', place='basement level 2, as office-door',
        height='camera about 2.5 m up in a ceiling corner, looking down',
        beat='A floor-plan view: who sits where, and how much room there is.', camera='a ceiling corner, looking down across the room',
        front='the whole floor: desk island, Emi\'s desk, Mio\'s corner, walkways', behind='the corner under the camera', motion='none',
        light='fluorescent tubes only', sense='no windows; desks with chairs; no text'),
    'dorm-entry': dict(
        script='Day 1, after the evening with Emi (about 19:00): he unlocks his dorm room and sees it for the first time; the night message comes in here.',
        place='a company dorm block on the island, 6th floor; the room opens off an inside corridor; the window faces the office towers',
        height='camera 1.6 m above the floor, about 17 m above the street; the towers are much taller, so their lit floors are level with the window and they rise out of the top of it',
        beat='End of day 1: he opens the door of his new dorm room for the first time. It is small and bare; his boxes got here first.',
        camera='standing eye level just inside the front door, facing down the length of the room to the window',
        front='kitchenette on the left, then the desk; the bed along the right wall with its head at the window end; the moving boxes on the floor; the window with the company towers lit at night',
        behind='the front door, the entry step and his shoes (not in the prompt)',
        motion='none', light='the ceiling light on; night outside',
        sense='one bed, one pillow at the head (window) end only; the view is from the 6th floor, so tower floors are level with the window and the towers rise past its top (not seen from above); boxes on the floor; no text on the boxes'),
    'dorm-window': dict(
        script='Same moment, for lines spoken looking out at the city.', place='as dorm-entry', height='as dorm-entry',
        beat='The same first look, framed on the window and the city he now lives in.',
        camera='standing eye level at the inner wall, facing the window wall',
        front='the bed under the window with its head against the left wall; the desk right; the boxes at the foot of the bed; the lit towers through the window',
        behind='the kitchenette and the door', motion='none', light='ceiling light on; night outside',
        sense='one pillow, at the left (head) end; nothing hung on the walls yet; towers rise past the top of the window'),
    'dorm-dark': dict(
        script='The first second after the door opens, before the light goes on (optional first frame).', place='as dorm-entry', height='as dorm-entry',
        beat='Before he finds the light switch: the room lit by the city and the hallway behind him.',
        camera='standing eye level just inside the door, facing the window', front='bed right, desk left, boxes, the lit city filling the window',
        behind='the hallway light (it only shows as a spill of light on the floor)', motion='none',
        light='ceiling light off; city light through the window and a warm spill from behind',
        sense='one pillow at the window end; no light source visible that the note does not name; no text'),
}


def wait_turn():
    """Take a place in the shared ComfyUI queue only when at most two jobs are pending (other agents share the GPU)."""
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
    args = sys.argv[1:] or list(JOBS)
    for a in args:
        k, seeds = (a.split(':')[0], [int(x) for x in a.split(':')[1].split(',')]) if ':' in a else (a, JOBS[a][2])
        p, neg, _ = JOBS[k]
        for seed in seeds:
            if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'L2', f'{k}-{seed}.png')):
                continue
            wait_turn()
            run('L2', f'{k}-{seed}', p, neg, 1216, 832, seed, RDBT)


def fix(src, out, boxes, prompt, negative, seed=7, denoise=0.9, blur=10, keep=(), prefill=False):
    """Repaint rectangles (x0, y0, x1, y1) of an L2 render with the masked img2img workflow
    (tools/workflows/anima-img2img-masked.json), to paint out a logic error such as light from a window that doesn't exist."""
    from PIL import Image, ImageDraw, ImageFilter
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'L2')
    im = Image.open(os.path.join(d, src + '.png'))
    srcp = os.path.join(d, src + '.png')
    if prefill:
        # Paint the boxes over first by carrying the wall just above each box down through it (vertical stains continue),
        # so the model repaints plain wall instead of redrawing the old shape it can still see in the latent.
        import numpy as np
        a = np.asarray(im.convert('RGB')).astype(float)
        for x0, y0, x1, y1 in boxes:
            a[y0:y1, x0:x1] = a[y0 - 8:y0 - 2, x0:x1].mean(0)[None]
        srcp = os.path.join(d, out + '-prefill.png')
        Image.fromarray(a.clip(0, 255).astype('uint8')).save(srcp)
    m = Image.new('L', im.size, 0)
    for b in boxes:
        ImageDraw.Draw(m).rectangle(b, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(blur)).convert('RGB')
    mp = os.path.join(d, out + '-mask.png'); m.save(mp)
    wf = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'workflows', 'anima-img2img-masked.json')))
    wf['4']['inputs']['text'], wf['5']['inputs']['text'] = prompt, negative
    wf['10']['inputs']['image'], wf['12']['inputs']['image'] = comfy.upload(srcp), comfy.upload(mp)
    wf['7']['inputs'].update(seed=seed, denoise=denoise)
    wf['9']['inputs']['filename_prefix'] = 'locations2-fix'
    wait_turn()
    comfy.run(wf, os.path.join(d, out + '.png'))
    # Everything outside the mask stays pixel-identical to the source (the VAE round trip shifts it slightly otherwise).
    res = Image.open(srcp if prefill else os.path.join(d, src + '.png')).convert('RGB')
    res.paste(Image.open(os.path.join(d, out + '.png')).convert('RGB'), (0, 0), Image.open(mp).convert('L'))
    res.save(os.path.join(d, out + '.png'))
    if keep:  # paste original strips back (window mullions) so the frame stays exactly as it was
        res = Image.open(os.path.join(d, out + '.png')).convert('RGB')
        for b in keep:
            res.paste(im.convert('RGB').crop(b), b[:2])
        res.save(os.path.join(d, out + '.png'))
    print('ok fix', out, flush=True)


# ---------------- Round 2 fixes (Jørgen, 2026-09-25) ----------------
# Office pick: office-reverse-5202. Flaw: a window beside the exit door would look into a basement corridor.
OFFICE_FIX_BOX = (714, 322, 824, 401)  # the window-like frame to the right of the door (x0, y0, x1, y1)
# Prompt style (GUIDE, art/PROMPTS.md reference): style line, a few plain sentences, one idea each, one "must not appear" line.
STYLE_LINE = ('anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, '
              'hand-painted anime background, no humans, scenery. ')
OFFICE_FIX = {  # one change each: what replaces the window on the wall
    'a': 'Water stains run down the bare wall.',
    'b': 'A small cork notice board with a few curling faded papers hangs on the wall.',
    'c': 'An old faded poster with one corner peeling hangs on the wall.',
}
OFFICE_FIX_P = (STYLE_LINE + 'A stained concrete wall painted faded green-grey. {what} '
                'Cool flat fluorescent light. No window and no screen on the wall.')
OFFICE_FIX_N = NEG + ', window, glass, screen, monitor'

# Dorm: keep the interiors of dorm-window-6201/6202, repaint only the glass. Staging for the new view:
DORM_VIEW_STAGING = dict(
    beat='He has been given the worst room on the island: the company city is all towers, and his window looks at a wall.',
    script='Day 1, about 19:00: he opens the door of his dorm room for the first time.',
    place='an old company dorm block squeezed between taller buildings; his room is on the 2nd floor; the window faces the side wall of the next block across a gap of about 2 m',
    height='the window sill is about 4.5 m above the alley; the neighbouring wall rises far above the window, so no sky shows except perhaps a thin dark sliver at the top; the wall is seen straight on, not from above',
    camera='unchanged: inside the room at standing eye level, facing the window wall',
    front='through the glass: stained grey concrete wall filling the window, a vertical drainpipe, air-conditioner outdoor units on brackets, one small frosted window of a neighbour lit dim yellow',
    behind='the kitchenette and the door; no city, no towers, no street',
    light='night; dim yellow from the neighbour\'s window and a caged corridor lamp on the wall outside; the ceiling light and desk lamp inside unchanged',
    sense='the wall is close, so it is large and flat with no perspective to a street; nothing at a distance; no sunset colours')
DORM_VIEW_P = (STYLE_LINE + 'A view through a window at night. '
               'The grimy concrete wall of the next building is only two metres away and fills the whole view. '
               'A drainpipe runs down the wall, and two air conditioner units sit on brackets. '
               'A small frosted window in that wall glows dim yellow. '
               'Gloomy dark grey-blue, sparse dim yellow light. No sky, no city and no street.')
DORM_VIEW_N = NEG + ', city, skyline, skyscraper, street, sky, sunset'
DORM_VIEW = {  # name: (source, glass box, mullion strips to keep, seed)
    'dorm-window-6201-wall-a': ('dorm-window-6201', (396, 196, 867, 487), [(624, 190, 636, 490)], 21),
    'dorm-window-6202-wall-a': ('dorm-window-6202', (382, 204, 912, 493), [(478, 196, 494, 496), (776, 196, 794, 496)], 21),
    'dorm-window-6202-wall-b': ('dorm-window-6202', (382, 204, 912, 493), [(478, 196, 494, 496), (776, 196, 794, 496)], 22),
}

# Masked repaint of the small glass area gave only black glass (the model can't draw a wall in a strip that size).
# So the view is rendered on its own at full size, then fitted into the glass behind the original window frame.
# Round-1 views 41, 43, 44 looked down an alley (ground and perspective); one change: the wall fills the picture.
WALL_VIEW_P = (STYLE_LINE + 'A grimy concrete wall at night, seen straight on from close up. The wall fills the whole picture. '
               'A drainpipe runs down the wall. '
               'Dim yellow light from a small lamp on the wall. '
               'Dark grey-blue, sparse dim yellow light. No sky, no buildings in the distance and no street.')
WALL_VIEW_N = NEG + ', sky, city, skyline, street, road'


def wall_view(seed):
    """Render the view out of the dorm window (art/production/L2/wallview-<seed>.png)."""
    if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'L2', f'wallview-{seed}.png')):
        wait_turn()
        run('L2', f'wallview-{seed}', WALL_VIEW_P, WALL_VIEW_N, 1216, 704, seed, RDBT)


def fit_view(room, view_seed, out, box, keep, anchor=0.5):
    """Put a rendered wall view into the window glass of a dorm render. The original frame and mullions stay;
    the view is darkened a little and gets a faint cool reflection so it reads as seen through glass."""
    from PIL import Image, ImageEnhance
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'L2')
    im = Image.open(os.path.join(d, room + '.png')).convert('RGB')
    v = Image.open(os.path.join(d, f'wallview-{view_seed}.png')).convert('RGB')
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    s = max(w / v.width, h / v.height)
    v = v.resize((round(v.width * s), round(v.height * s)), Image.LANCZOS)
    oy = int((v.height - h) * anchor)  # anchor 1 = keep the bottom of the view (less sky)
    v = v.crop(((v.width - w) // 2, oy, (v.width - w) // 2 + w, oy + h))
    v = ImageEnhance.Brightness(v).enhance(0.85)
    v = Image.blend(v, Image.new('RGB', v.size, (40, 50, 80)), 0.08)
    im.paste(v, (x0, y0))
    orig = Image.open(os.path.join(d, room + '.png')).convert('RGB')
    for b in keep:
        im.paste(orig.crop(b), b[:2])
    im.save(os.path.join(d, out + '.png'))
    print('ok view', out, flush=True)


def clone_wall(src, out, box, patch, feather=6):
    """Cover box with a patch of real wall from the same image (resized to fit), feathered at the edges. No model.
    Used for office-reverse-5202: the masked repaints of the window beside the door came out as a blurred square."""
    from PIL import Image, ImageDraw, ImageFilter
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'L2')
    im = Image.open(os.path.join(d, src + '.png')).convert('RGB')
    x0, y0, x1, y1 = box
    p = im.crop(patch).resize((x1 - x0 + 2 * feather, y1 - y0 + 2 * feather), Image.LANCZOS)
    # Match the wall's light: per row, shift the patch toward the wall just left and right of the box. Samples that
    # aren't wall (the intercom, a cardboard box) are dropped and filled from the neighbouring rows.
    import numpy as np
    A = np.asarray(im).astype(float)
    P = np.asarray(p).astype(float)
    ys = slice(y0 - feather, y1 + feather)
    left = np.median(A[ys, x0 - feather - 5:x0 - feather - 1], 1)
    right = np.median(A[ys, x1 + feather + 1:x1 + feather + 5], 1)
    wall = np.median(np.concatenate([left, right]), 0)
    def clean(v):
        ok = np.abs(v - wall).sum(1) < 45
        idx = np.arange(len(v))
        return np.stack([np.interp(idx, idx[ok], v[ok, c]) for c in range(3)], -1) if ok.sum() > 2 else np.repeat(wall[None], len(v), 0)
    left, right = clean(left), clean(right)
    k = 21
    sm = lambda v: np.stack([np.convolve(np.pad(v[:, c], k // 2, mode='edge'), np.ones(k) / k, mode='valid') for c in range(3)], -1)
    dl, dr = sm(left - P[:, :3].mean(1)), sm(right - P[:, -3:].mean(1))
    t = np.linspace(0, 1, P.shape[1])[None, :, None]
    P = P + dl[:, None] * (1 - t) + dr[:, None] * t
    p = Image.fromarray(P.clip(0, 255).astype('uint8'))
    a = Image.new('L', p.size, 0)
    ImageDraw.Draw(a).rectangle((feather, feather, p.width - feather, p.height - feather), fill=255)
    a = a.filter(ImageFilter.GaussianBlur(feather / 2))
    im.paste(p, (x0 - feather, y0 - feather), a)
    im.save(os.path.join(d, out + '.png'))
    print('ok clone', out, flush=True)


# Dorm options = room + wall view (+ the orange evening-looking beam on the left wall painted out: one change, second pass).
DORM_OPTIONS = {  # name: (room, view seed, anchor)
    'dorm-worst-a': ('dorm-window-6201', 53, 0.5),
    'dorm-worst-b': ('dorm-window-6202', 42, 1.0),
    'dorm-worst-c': ('dorm-window-6202', 54, 0.5),
}
BEAM_BOX = {'dorm-window-6201': (0, 290, 200, 470), 'dorm-window-6202': (0, 305, 180, 522)}


def unbeam(src, out, box):
    """Paint out the warm light patch on the left wall without the model (two masked repaints redrew it and clipped the
    headboard): inside the box, pixels warmer than the bluish wall (red above blue) take the wall colour of their row."""
    import numpy as np
    from PIL import Image, ImageFilter
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'L2')
    A = np.asarray(Image.open(os.path.join(d, src + '.png')).convert('RGB')).astype(float)
    x0, y0, x1, y1 = box
    R = A[y0:y1, x0:x1]
    warm = (R[..., 0] - R[..., 2]) > 3
    # Wall colour as a straight-line fit down the rows, from the non-warm wall pixels in the box.
    ys, xs = np.nonzero(~warm)
    coef = [np.polyfit(ys, R[ys, xs, c], 1) for c in range(3)]
    rows = np.arange(R.shape[0])
    wall = np.stack([np.polyval(coef[c], rows) for c in range(3)], -1)[:, None, :].repeat(R.shape[1], 1)
    m = Image.fromarray((warm * 255).astype('uint8')).filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(3))
    m = np.asarray(m).astype(float)[..., None] / 255
    A[y0:y1, x0:x1] = R * (1 - m) + wall * m
    Image.fromarray(A.clip(0, 255).astype('uint8')).save(os.path.join(d, out + '.png'))
    print('ok unbeam', out, flush=True)


def dorm_options():
    boxes = {k: (v[1], v[2]) for k, v in DORM_VIEW.items()}
    for name, (room, seed, anchor) in DORM_OPTIONS.items():
        box, keep = next(b for k, b in boxes.items() if k.startswith(room))
        fit_view(room, seed, name + '-view', box, keep, anchor)
        unbeam(name + '-view', name, BEAM_BOX[room])
