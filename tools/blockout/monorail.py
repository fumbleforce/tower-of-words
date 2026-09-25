"""Monorail blockout: the final approach to Amakawa City Central Station (day 1, the announcement
「まもなく、天川シティ中央駅です。お出口は右側です。」).

World (metres, +Y = forward along the route toward the island, +X = right, +Z = up, water at z=0):
- Double-track straddle-beam guideway, beam top at z=15. Our beam at x=0 over the bay; the opposite-direction beam 5 m to the
  right (Japanese left-hand running). About 15 m ahead the line starts a gentle S-bend to the left and the two beams spread to
  12 m apart, so they enter the station with an island platform between them: the platform is on the RIGHT of our train.
- The island's seawall is ~80 m ahead of the front window; the elevated station starts ~118 m ahead (platform top at z=16,
  roof at z=23-24), office towers around and behind it. Mainland is behind the camera and not modelled.
- Car floor at z=16 (1 m above the beam top). Standing eye height 1.6 m, so the camera is at z=17.6.

Views:
  mono-int   inside the empty front car, standing in the aisle 5.5 m behind the front window, looking forward.
  mono-door  inside the front car as it pulls in alongside the island platform: facing the right-hand doors straight on.
  mono-ext   outside, level with the guideway, off the right side over the water, looking forward along the line:
             the three-car train on its beam from behind-right (last car near, nose far), the station and island ahead.
Run: blender -b --factory-startup -P tools/blockout/monorail.py -- <out_dir> [int|ext ...]
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blk

CONC = (0.74, 0.74, 0.71)
CONC_D = (0.58, 0.58, 0.56)
WATER = (0.22, 0.47, 0.66)
GROUND = (0.66, 0.67, 0.65)
WALL = (0.90, 0.90, 0.87)
CEIL = (0.95, 0.95, 0.94)
FLOOR = (0.52, 0.53, 0.55)
SEAT = (0.18, 0.52, 0.55)
STEEL = (0.68, 0.70, 0.74)
DOOR = (0.78, 0.79, 0.80)
TOWER = [(0.70, 0.78, 0.85), (0.80, 0.83, 0.86), (0.62, 0.70, 0.78), (0.86, 0.86, 0.84)]

BEAM_TOP, BEAM_H, BEAM_W = 15.0, 1.5, 0.85
SHORE_Y, GROUND_Z = 80.0, 3.0
ST_Y0, ST_Y1 = 118.0, 228.0


def smooth(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def our_x(y):
    return -10.0 * smooth((y - 15) / 103)


def gap(y):
    return 5.0 + 7.0 * smooth((y - 60) / 58)


def beam(name, fx, y0, y1, step=4.0):
    y = y0
    k = 0
    while y < y1:
        y2 = min(y + step, y1)
        blk.obox(f'{name}{k}', (fx(y), y), (fx(y2), y2 + 0.05), BEAM_W, BEAM_TOP - BEAM_H, BEAM_TOP, CONC)
        y, k = y2, k + 1


def pillars(name, fx, y0, y1, every=25.0):
    y = y0
    while y < y1:
        x = fx(y)
        z0 = 0.0 if y < SHORE_Y + 0.05 * x - 2 else GROUND_Z
        blk.box(f'{name}{int(y)}', x - 0.7, x + 0.7, y - 0.7, y + 0.7, z0, BEAM_TOP - BEAM_H, CONC_D)
        blk.box(f'{name}cap{int(y)}', x - 1.1, x + 1.1, y - 0.9, y + 0.9, BEAM_TOP - BEAM_H - 0.8, BEAM_TOP - BEAM_H, CONC)
        y += every


def world():
    blk.box('water', -6000, 6000, -3000, 6000, -1, 0, WATER)
    # island: seawall and ground (slightly angled shore line)
    blk.obox('seawall', (-1600, SHORE_Y - 80), (1600, SHORE_Y + 80), 4, 0, GROUND_Z + 0.8, CONC)
    blk.obox('island', (-1600, SHORE_Y + 1500 - 80), (1600, SHORE_Y + 1500 + 80), 3000, -1, GROUND_Z, GROUND)
    # shoreline promenade trees as low blocks
    rnd = random.Random(7)
    for i in range(0):  # (trees removed: they read as green boxes at the window sill)
        x = -600 + i * 20 + rnd.uniform(-4, 4)
        if -30 < x < 25:
            continue
        y = SHORE_Y + 0.05 * x + 12 + rnd.uniform(0, 8)
        blk.box(f'tree{i}', x - 3, x + 3, y - 3, y + 3, GROUND_Z, GROUND_Z + rnd.uniform(5, 8), (0.36, 0.52, 0.38))
    # far bay shore on the left, low and hazy
    blk.box('farshore', -9000, -4200, -3000, 6000, 0, 10, (0.60, 0.66, 0.68))
    # guideways
    beam('ourbeam', our_x, -400, ST_Y1)
    beam('oppbeam', lambda y: our_x(y) + gap(y), -400, ST_Y1)
    pillars('ourpil', our_x, -390, ST_Y0 - 5)
    pillars('opppil', lambda y: our_x(y) + gap(y), -390, ST_Y0 - 5)
    station()
    towers()


def station():
    x0 = our_x(ST_Y0)  # our track centre inside the station (x = -10)
    g = 12.0
    L, R = x0 - 6.0, x0 + g + 6.0
    # structure under the tracks, down to the ground
    blk.box('st_under', L, R, ST_Y0, ST_Y1, GROUND_Z, BEAM_TOP - BEAM_H, CONC_D)
    # island platform between the tracks (top at car-floor height)
    blk.box('platform', x0 + 1.55, x0 + g - 1.55, ST_Y0, ST_Y1, BEAM_TOP - BEAM_H, 16.0, CONC)
    # platform screen doors along both platform edges (low walls with gaps)
    for side, xe in (('l', x0 + 1.6), ('r', x0 + g - 1.7)):
        y = ST_Y0 + 3
        k = 0
        while y < ST_Y1 - 4:
            blk.box(f'psd{side}{k}', xe, xe + 0.1, y, y + 2.4, 16.0, 17.3, (0.82, 0.84, 0.86))
            y += 4.0
            k += 1
    # outer side walls (parapet up to a band of windows) and roof on columns
    blk.box('st_wall_l', L, L + 0.4, ST_Y0, ST_Y1, BEAM_TOP - BEAM_H, 17.2, (0.85, 0.86, 0.87))
    blk.box('st_wall_r', R - 0.4, R, ST_Y0, ST_Y1, BEAM_TOP - BEAM_H, 17.2, (0.85, 0.86, 0.87))
    blk.box('st_roof', L - 1, R + 1, ST_Y0 - 4, ST_Y1, 23.0, 24.8, (0.88, 0.89, 0.90))
    blk.box('st_fascia', L - 1, R + 1, ST_Y0 - 4.2, ST_Y0 - 3.8, 21.6, 24.8, (0.80, 0.82, 0.85))
    # glass curtain walls above the parapets: mullions every 3 m
    for xw in (L + 0.1, R - 0.1):
        blk.box(f'st_glass_band{int(xw)}', xw - 0.1, xw + 0.1, ST_Y0, ST_Y1, 22.2, 23.0, (0.80, 0.82, 0.85))
        for y in range(int(ST_Y0), int(ST_Y1), 3):
            blk.box(f'st_mull{int(xw)}_{y}', xw - 0.08, xw + 0.08, y, y + 0.15, 17.2, 22.2, STEEL)
    for y in range(int(ST_Y0), int(ST_Y1) + 1, 12):
        for xc in (L + 0.2, x0 + g / 2, R - 0.2):
            blk.box(f'st_col{y}_{int(xc)}', xc - 0.25, xc + 0.25, y - 0.25, y + 0.25, 16.0, 23.0, STEEL)
    # a station building block on the right beyond the platform (concourse, exits)
    blk.box('st_hall', R, R + 30, ST_Y0 + 10, ST_Y1 - 10, GROUND_Z, 26, (0.83, 0.85, 0.88))


def towers():
    rnd = random.Random(11)
    k = 0
    bands = []
    for gy in range(0, 30):
        y = 100 + gy * 45
        for gx in range(-20, 21):
            x = gx * 45 + rnd.uniform(-8, 8)
            yy = y + rnd.uniform(-8, 8)
            if yy < SHORE_Y + 0.05 * x + 25:
                continue
            # keep the station and its approach clear
            if -40 < x < 45 and yy < ST_Y1 + 20:
                continue
            if rnd.random() < 0.3:
                continue
            dist = math.hypot(x, yy)
            if dist < 250:
                h = rnd.uniform(30, 70)
            elif dist < 600:
                h = rnd.uniform(60, 160)
            else:
                h = rnd.uniform(90, 230)
            w, d = rnd.uniform(18, 34), rnd.uniform(18, 34)
            blk.box(f'tower{k}', x - w / 2, x + w / 2, yy - d / 2, yy + d / 2, GROUND_Z, GROUND_Z + h, TOWER[k % 4])
            # dark window bands every 4 m (one per floor), so the blocks read as office buildings and not as glass panes
            bands += [(x - w / 2 - 0.2, x + w / 2 + 0.2, yy - d / 2 - 0.2, yy + d / 2 + 0.2, GROUND_Z + z, GROUND_Z + z + 1.6)
                      for z in range(4, int(h) - 3, 4)]
            k += 1
    blk.boxes('tower_bands', bands, (0.36, 0.44, 0.52))


# ---------------- the carriage interior (front car, nose at y = 0) ----------------
HW = 1.35      # inner half width
FZ, CZ = 16.0, 18.3
SILL, HEAD = 16.72, 17.9


def side_wall(sx):
    """One side wall at x = sx*HW. Windows and doors as gaps; door leaves drawn as frames."""
    xa, xb = sorted((sx * HW, sx * (HW + 0.1)))
    doors = [(-11.0, -9.7), (-3.6, -2.3)]
    # windows between these y ranges (pillars 0.18 m between panes)
    wins = [(-15.6, -13.8), (-13.6, -11.2), (-9.5, -7.6), (-7.4, -5.6), (-5.4, -3.8), (-2.1, -0.35)]
    n = 'L' if sx < 0 else 'R'
    solid_low = [(-16, -11.0), (-9.7, -3.6), (-2.3, 0.1)]
    for k, (a, b) in enumerate(solid_low):
        blk.box(f'wall{n}low{k}', xa, xb, a, b, FZ, SILL, WALL)
        blk.box(f'wall{n}up{k}', xa, xb, a, b, HEAD, CZ, WALL)
    # pillars: everything in the solid spans that is not a window
    for (a, b) in solid_low:
        cuts = [a] + [y for w in wins for y in w if a < y < b] + [b]
        cuts.sort()
        for i in range(0, len(cuts) - 1):
            ya, yb = cuts[i], cuts[i + 1]
            inside_win = any(w[0] <= ya and yb <= w[1] for w in wins)
            if not inside_win and yb - ya > 0.01:
                blk.box(f'wall{n}pil{ya:.1f}', xa, xb, ya, yb, SILL, HEAD, WALL)
    for k, (a, b) in enumerate(doors):
        m = (a + b) / 2
        # door leaves: frame around a tall window, a centre seam
        blk.box(f'door{n}{k}bot', xa, xb, a, b, FZ, 16.95, DOOR)
        blk.box(f'door{n}{k}top', xa, xb, a, b, 17.85, CZ, DOOR)
        blk.box(f'door{n}{k}e1', xa, xb, a, a + 0.12, 16.95, 17.85, DOOR)
        blk.box(f'door{n}{k}e2', xa, xb, b - 0.12, b, 16.95, 17.85, DOOR)
        blk.box(f'door{n}{k}mid', xa, xb, m - 0.07, m + 0.07, 16.95, 17.85, DOOR)
        # grab poles either side of the door
        for yy in (a - 0.12, b + 0.12):
            blk.cyl(f'pole{n}{k}{yy:.1f}', sx * (HW - 0.12), yy, 0.02, FZ, CZ, STEEL, 8)
    # longitudinal bench seats under the windows
    for k, (a, b) in enumerate([(-15.8, -11.3), (-9.4, -3.8), (-2.1, -0.5)]):
        xi, xo = sorted((sx * (HW - 0.52), sx * HW))
        blk.box(f'seat{n}{k}', xi, xo, a, b, 16.40, 16.50, SEAT)
        blk.box(f'seatbase{n}{k}', sorted((sx * (HW - 0.45), sx * HW))[0], sorted((sx * (HW - 0.45), sx * HW))[1], a, b, FZ, 16.40, (0.40, 0.42, 0.45))
        xi2, xo2 = sorted((sx * (HW - 0.10), sx * HW))
        blk.box(f'seatback{n}{k}', xi2, xo2, a, b, 16.50, 16.70, SEAT)
        # hand straps above the seats
        y = a + 0.2
        i = 0
        while y < b - 0.1:
            xs = sx * 0.95
            blk.box(f'strap{n}{k}_{i}', xs - 0.012, xs + 0.012, y - 0.012, y + 0.012, 17.78, 18.12, (0.86, 0.86, 0.86))
            blk.box(f'ring{n}{k}_{i}', xs - 0.015, xs + 0.015, y - 0.07, y + 0.07, 17.62, 17.78, (0.92, 0.92, 0.92))
            y += 0.42
            i += 1
    return


def interior():
    blk.box('floor', -HW - 0.1, HW + 0.1, -16, 0.1, FZ - 0.1, FZ, FLOOR)
    blk.box('ceiling', -HW - 0.1, HW + 0.1, -16, 0.1, CZ, CZ + 0.1, CEIL)
    for sx in (-1, 1):
        blk.box(f'light{sx}', sorted((sx * 0.45, sx * 0.75))[0], sorted((sx * 0.45, sx * 0.75))[1], -15.5, -0.5, CZ - 0.04, CZ, (1, 1, 1))
        blk.obox(f'rail{sx}', (sx * 0.95, -15.8), (sx * 0.95, -0.4), 0.04, 18.10, 18.14, STEEL)
        side_wall(sx)
    # front wall around the big front window
    blk.box('front_bot', -HW - 0.1, HW + 0.1, 0.0, 0.12, FZ, 16.3, WALL)
    blk.box('front_top', -HW - 0.1, HW + 0.1, 0.0, 0.12, 18.15, CZ, WALL)
    blk.box('front_l', -HW - 0.1, -1.2, 0.0, 0.12, 16.3, 18.15, WALL)
    blk.box('front_r', 1.2, HW + 0.1, 0.0, 0.12, 16.3, 18.15, WALL)
    blk.box('front_bar', -1.2, 1.2, -0.25, -0.2, 16.95, 17.0, STEEL)  # a handrail across the window
    blk.box('rear_wall', -HW - 0.1, HW + 0.1, -16.1, -16.0, FZ, CZ, WALL)


def exterior_train(nose_y=12.0):
    """Three cars on our beam (straight part of the line, y < 20)."""
    car, g = 15.2, 0.7
    for i in range(3):
        y1 = nose_y - i * (car + g)
        y0 = y1 - car
        body = (0.93, 0.94, 0.95)
        blk.box(f'car{i}', -1.45, 1.45, y0, y1, 15.35, 18.7, body)
        # separate side windows (with doors in dark grey), so each car reads as one car
        # per car: window, door, two wide windows, door, window (doors are tall dark panels)
        parts = [(0.7, 2.6, 'w'), (3.0, 4.3, 'd'), (4.7, 7.4, 'w'), (7.8, 10.5, 'w'), (10.9, 12.2, 'd'), (12.6, 14.5, 'w')]
        for k, (a, b, kind) in enumerate(parts):
            z0 = 15.7 if kind == 'd' else 16.75
            blk.box(f'car{i}{kind}{k}', -1.47, 1.47, y0 + a, y0 + b, z0, 17.95, (0.25, 0.32, 0.40) if kind == 'w' else (0.45, 0.50, 0.55))
        if i < 2:  # gangway between this car and the next one behind
            blk.box(f'gang{i}', -1.2, 1.2, y0 - g - 0.05, y0 + 0.05, 15.4, 18.5, (0.12, 0.12, 0.13))
        blk.box(f'car{i}stripe', -1.48, 1.48, y0, y1, 16.25, 16.45, (0.10, 0.55, 0.58))
        blk.box(f'car{i}skirt', -1.3, 1.3, y0 + 0.5, y1 - 0.5, 14.1, 15.35, (0.55, 0.57, 0.60))
    # nose (front) and tail (rear) caps, slightly lower and rounded by steps
    t = nose_y - 3 * car - 2 * g
    for k, (a, b, z0, z1, w) in enumerate([(nose_y, nose_y + 0.8, 15.4, 18.4, 1.40), (nose_y + 0.8, nose_y + 1.4, 15.5, 17.6, 1.25)]):
        blk.box(f'nose{k}', -w, w, a, b, z0, z1, (0.93, 0.94, 0.95))
    blk.box('nosewin', -1.2, 1.2, nose_y + 0.78, nose_y + 0.84, 16.6, 18.2, (0.25, 0.32, 0.40))
    blk.box('tail', -1.40, 1.40, t - 0.6, t, 15.4, 18.4, (0.93, 0.94, 0.95))
    blk.box('tailwin', -1.1, 1.1, t - 0.66, t - 0.6, 16.7, 18.0, (0.25, 0.32, 0.40))
    for xl in (-1.0, 0.8):  # red tail lights on the last car
        blk.box(f'taillight{xl}', xl, xl + 0.2, t - 0.68, t - 0.6, 15.8, 16.0, (0.85, 0.15, 0.12))


if __name__ == '__main__':
    out = blk.out_dir()
    which = [a for a in sys.argv[sys.argv.index('--') + 2:]] if '--' in sys.argv else []
    which = which or ['int', 'door', 'ext']
    if 'int' in which:
        blk.reset()
        world()
        interior()
        blk.camera((0, -4.8, 17.6), (0, 60, 17.6), lens=22)
        blk.render(out, 'mono-int')
    if 'door' in which:
        # Pulling into the station: the front car alongside the island platform (right side). Camera across the aisle,
        # standing by the left-hand seats, facing the right-hand doors straight on.
        blk.reset()
        world()
        shift = (10.0, -(ST_Y0 + 40.0), 0.0)
        for ob, _ in blk._objs:
            ob.location = (ob.location[0] + shift[0], ob.location[1] + shift[1], ob.location[2])
        interior()
        blk.camera((-0.9, -2.95, 17.55), (5, -2.95, 17.35), lens=18)
        blk.render(out, 'mono-door')
    if 'ext' in which:
        blk.reset()
        world()
        exterior_train()
        blk.camera((30, -75, 24), (-3, 10, 15), lens=36)
        blk.render(out, 'mono-ext')
