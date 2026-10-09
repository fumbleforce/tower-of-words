"""The monorail's outside, modelled in Blender (issue #355, Jørgen's reference art/refs/monorail/jorgen-suggestion-20261009.png):
the car's stainless skin with its roof units, the navy skirt, the gangway bellows, one segment of the straddle beam,
and a pillar with its foot. Plain geometry with one colour per face corner (stainless, navy, dark frames, panel lines)
and the weathering of the skirt, beam and pillars (grime low down, rust under the beam joints and the bearings)
painted into the same colour attribute. The car skin's weathering is a baked texture instead (issue #356,
tools/train/monorail_wear.py, written next to the GLB as monorail-wear.webp), and the skin's colour alpha says which
faces are bare stainless.

  python3 tools/gpu_priority.py run monorail --rank render -- blender -b --factory-startup -P tools/train/monorail.py -- game3d/assets/train/monorail.glb [where to save the .blend]

Units are metres in the game's own frame (+y up, the car runs along +x, its platform side is +z), exported with
export_yup off so the game reads the coordinates as written. The car's numbers are the ones in game3d/js/train/car.js
(LX, LZ, T, RI, HF, WIN, DOORWAYS) and world.js (BEAM_TOP, SEA_Y); keep them in step. Nodes, each one mesh:
  car_skin    the closed car's outer skin, roof and roof units (the play camera's cut-away car never shows it)
  car_under   the navy skirt, which straddles the beam (#359), its channel and guide wheels, under every car in every framing
  bellows     the accordion gangway between two cars, centred on x = 0
  beam        one 9.5 m segment of the beam from x = 0 (its joint) to 9.5, top at y = 0
  pillar      the column, collar, hammerhead and bearings, in the world's heights (the beam's foot at BEAM_TOP - 0.96)
  foot        the pile cap where a pillar stands in the sea, centred on y = 0
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import monorail_wear as wear  # noqa: E402  the car skin's baked wear texture
wear.K = globals()  # the car's numbers below, read when the skin is unwrapped and baked

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else 'game3d/assets/train/monorail.glb')

# ---- car.js / world.js numbers ----
LX, LZ, T, RI, HF = 4.0, 1.2, 0.1, 0.34, 1.45
# windows (x, width) by the side's sign of z (#361: large, flush-glazed, slim frames; car.js WIN)
WINS = {1: [(-0.86, 1.32), (0.86, 1.32)], -1: [(-2.65, 0.96), (-0.86, 1.32), (0.86, 1.32), (2.65, 0.96)]}
WIN_Y0, WIN_Y1, WIN_R = 0.42, 1.24, 0.05
DOOR_X, DOOR_W, DOOR_SILL, DOOR_TOP, DOOR_GAP = 2.65, 0.9, 0.035, 1.22, 0.025
DOORS = [(x - DOOR_W / 2, x + DOOR_W / 2) for x in (-DOOR_X, DOOR_X)]
BEAM_TOP, SEA_Y = -0.16, -17.0  # the car rides low on the beam (#359): its skirt hangs 0.5 down either side
HX, HZ, RP = LX + T, LZ + T, RI + T  # the skin's outer half length, half width and plan corner radius
TOP = HF + 0.11  # roof top
SKIN = 0.055  # skin thickness (inner face meets the code-built inner wall at LZ + 0.045)
BEAM_H, SEG = 0.96, 9.5

random.seed(355)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


C = {
    'steel': hexc('#b3bac3'), 'roof': hexc('#a2a9b2'), 'seam': hexc('#565e69'), 'navy': hexc('#2b3b58'),
    'navyDark': hexc('#212c42'), 'gutter': hexc('#59616c'), 'frame': hexc('#1d2129'), 'inner': hexc('#bdbab5'),
    'unit': hexc('#b9c0c8'), 'louvre': hexc('#363c45'), 'slat': hexc('#8e96a1'),
    'rub': hexc('#5d6878'), 'under': hexc('#1b1f26'), 'bel': hexc('#30353d'), 'belEdge': hexc('#4a505a'),
    'concrete': hexc('#9a9d9f'), 'concreteTop': hexc('#a7a9aa'), 'rust': hexc('#7b5640'), 'joint': hexc('#3a3e44'),
    'plate': hexc('#5f656d'), 'tyre': hexc('#1a1c20'), 'hub': hexc('#4b515a'), 'pad': hexc('#2c2f34'), 'algae': hexc('#4f5a52'), 'footc': hexc('#83888b'),
}


def mix(a, b, k):
    return tuple(a[i] + (b[i] - a[i]) * k for i in range(3))


def mul(a, k):
    return tuple(min(1.0, c * k) for c in a)


# ---- small value noise for mottling ----
def _h(i, j, s):
    n = (i * 374761393 + j * 668265263 + s * 2246822519) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def vnoise(x, y, s=0):
    i, j = math.floor(x), math.floor(y)
    fx, fy = x - i, y - j
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _h(i, j, s), _h(i + 1, j, s)
    c, d = _h(i, j + 1, s), _h(i + 1, j + 1, s)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def fbm(x, y, s=0):
    return 0.6 * vnoise(x, y, s) + 0.3 * vnoise(2.1 * x, 2.1 * y, s + 7) + 0.1 * vnoise(4.3 * x, 4.3 * y, s + 13)


# ---- scene and object helpers ----
bpy.ops.wm.read_factory_settings(use_empty=True)
SCN = bpy.context.scene


def obj_from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    SCN.collection.objects.link(ob)
    return ob


def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for o in SCN.objects:
        o.select_set(o is ob)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def rrect(cx, cy, w, h, r, n=5):
    """Rounded rectangle outline (counter-clockwise) centred on cx, cy."""
    r = min(r, w / 2 - 1e-4, h / 2 - 1e-4)
    pts = []
    for qx, qy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        ox, oy = cx + qx * (w / 2 - r), cy + qy * (h / 2 - r)
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((ox + r * math.cos(a), oy + r * math.sin(a)))
    return pts


def prism(name, outline, axis, d0, d1, inner=None):
    """Extrude a 2D outline (u, v) along an axis from d0 to d1. axis 'z': (u, v) = (x, y); 'x': (u, v) = (z, y);
    'y': (u, v) = (x, z). With `inner`, a ring (outline minus inner, same point count)."""
    def P(u, v, d):
        return {'z': (u, v, d), 'x': (d, v, u), 'y': (u, d, v)}[axis]

    bm = bmesh.new()
    a = [bm.verts.new(P(u, v, d0)) for u, v in outline]
    b = [bm.verts.new(P(u, v, d1)) for u, v in outline]
    n = len(outline)
    if inner is None:
        bm.faces.new(list(reversed(a)))
        bm.faces.new(b)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new([a[i], a[j], b[j], b[i]])
    else:
        ia = [bm.verts.new(P(u, v, d0)) for u, v in inner]
        ib = [bm.verts.new(P(u, v, d1)) for u, v in inner]
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new([a[i], a[j], b[j], b[i]])  # outer wall
            bm.faces.new([ib[i], ib[j], ia[j], ia[i]])  # inner wall
            bm.faces.new([b[i], b[j], ib[j], ib[i]])  # d1 face
            bm.faces.new([ia[i], ia[j], a[j], a[i]])  # d0 face
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm)


def rounded_box(name, hx, hz, y0, y1, r_plan, r_top=0.0, r_bot=0.0, seg=6, open_top=False, open_bottom=False):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((hx if v.co.x > 0 else -hx, y1 if v.co.y > 0 else y0, hz if v.co.z > 0 else -hz))
    vert_edges = [e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) > 1e-6]
    bmesh.ops.bevel(bm, geom=vert_edges, offset=r_plan, segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    for want, r in ((y1, r_top), (y0, r_bot)):
        if r <= 0:
            continue
        ring = [e for e in bm.edges if all(abs(v.co.y - want) < 1e-6 for v in e.verts) and len(e.link_faces) == 2
                and any(abs(f.normal.y) > 0.99 for f in e.link_faces)]
        bmesh.ops.bevel(bm, geom=ring, offset=r, segments=4, profile=0.5, affect='EDGES', clamp_overlap=True)
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        if open_top and f.normal.y > 0.99 and abs(c.y - y1) < 1e-4:
            kill.append(f)
        if open_bottom and f.normal.y < -0.99 and abs(c.y - y0) < 1e-4:
            kill.append(f)
    if kill:
        bmesh.ops.delete(bm, geom=kill, context='FACES')
    return obj_from_bm(name, bm)


def solidify(ob, t):
    m = ob.modifiers.new('solid', 'SOLIDIFY')
    m.thickness = t
    m.offset = -1.0
    m.use_even_offset = True
    apply_mods(ob)


def join(objs, name):
    for o in SCN.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def boolean_cut(ob, cutters):
    cut = join(cutters, ob.name + '_cut')
    m = ob.modifiers.new('cut', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.solver = 'EXACT'
    m.object = cut
    apply_mods(ob)
    bpy.data.objects.remove(cut)


def bisect(ob, planes, pick=None):
    """Cut the mesh with planes [(co, no)], only faces passing pick(face) (all if None)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for co, no in planes:
        faces = [f for f in bm.faces if pick is None or pick(f)]
        geom = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
    bm.to_mesh(ob.data)
    bm.free()


def paint(ob, colour_of, smooth_angle=35):
    """One colour per face corner: colour_of(face_centre, face_normal, corner_position) -> rgb (sRGB), or rgba where
    the alpha is the car skin's metal class (1 bare stainless, 0 paint and rubber; train/models.js reads it).
    Faces are smooth with sharp edges over smooth_angle degrees."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.normal_update()
    cl = bm.loops.layers.float_color.new('Col')
    lim = math.radians(smooth_angle)
    for f in bm.faces:
        f.smooth = True
        c, n = f.calc_center_median(), f.normal
        for lp in f.loops:
            col = colour_of(c, n, lp.vert.co)
            r, g, b = col[:3]
            lp[cl] = (srgb_to_lin(r), srgb_to_lin(g), srgb_to_lin(b), col[3] if len(col) > 3 else 1.0)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
            e.smooth = False
    bm.to_mesh(ob.data)
    bm.free()


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# ---- the car's skin ----
# vertical panel lines: the middle, and either end of each door module (the doors' pockets, game3d/js/train/doors.js),
# which on the far side fall between the windows
SEAMS_X = [-3.6, -1.7, 0.0, 1.7, 3.6]
ROOF_SEAMS = [-3.2, -1.1, 1.1, 3.2]  # roof panel joints, across the roof clear of its units
SEAM_Y = 1.31  # horizontal panel line over the windows
STRIPE = (0.355, 0.4)  # thin navy line under the windows
GUTTER = (1.395, 1.415)  # the rain gutter where the roof turns down
DRIPS = sorted(random.uniform(-3.9, 3.9) for _ in range(9))
DRIP_LEN = {x: random.uniform(0.18, 0.75) for x in DRIPS}


def plan_sd(x, z):
    """Signed distance to the skin's outer outline in plan (negative inside)."""
    qx, qz = abs(x) - (HX - RP), abs(z) - (HZ - RP)
    out = math.hypot(max(qx, 0), max(qz, 0))
    return out + min(max(qx, qz), 0) - RP


def plan_grad(x, z):
    e = 1e-3
    gx = plan_sd(x + e, z) - plan_sd(x - e, z)
    gz = plan_sd(x, z + e) - plan_sd(x, z - e)
    l = math.hypot(gx, gz) or 1
    return gx / l, gz / l


def metal(c):
    return (*c, 1.0)


def paint_(c):
    return (*c, 0.0)


def skin_part(c, n):
    """Which part of the skin a face is: 'roof', 'side' (the outer walls), 'inner' or 'reveal'."""
    gx, gz = plan_grad(c.x, c.z)
    if n.y > 0.75:
        return 'roof'
    if plan_sd(c.x, c.z) < -SKIN + 0.012 or n.y < -0.75:  # inside faces, the ceiling, the bottom rim
        return 'inner'
    if n.x * gx + n.z * gz < 0.6 and c.y < TOP - 0.2:  # reveals of the window, door and gangway openings
        return 'reveal'
    return 'side'


def skin_colour(c, n, p):
    """Flat colours only; the weathering is in the baked wear texture (monorail_wear.py)."""
    part = skin_part(c, n)
    if part == 'roof':
        if any(abs(c.x - s) < 0.007 for s in ROOF_SEAMS):
            return metal(mul(C['seam'], 1.1))
        return metal(C['roof'])
    if part == 'inner':
        return paint_(C['inner'])
    if part == 'reveal':
        return paint_(C['frame'])
    y = c.y
    if GUTTER[0] < y < GUTTER[1]:
        return metal(C['gutter'])
    if y > GUTTER[1]:  # the roof's rounded shoulder
        return metal(mul(C['roof'], 1.02))
    if STRIPE[0] < y < STRIPE[1]:
        return paint_(C['navy'])
    seam = abs(y - SEAM_Y) < 0.006 or (abs(c.z) > HZ - 0.05 and any(abs(c.x - s) < 0.006 for s in SEAMS_X))
    if seam:
        return metal(C['seam'])
    return metal(C['steel'])


def build_skin():
    body = rounded_box('car_skin', HX, HZ, 0.0, TOP, RP, r_top=0.15, seg=8, open_bottom=True)
    solidify(body, SKIN)
    cutters = []
    for side in (-1, 1):
        for x, w in WINS[side]:
            cutters.append(prism('w', rrect(x, (WIN_Y0 + WIN_Y1) / 2, w, WIN_Y1 - WIN_Y0, WIN_R),
                                 'z', side * (HZ - 0.3), side * (HZ + 0.3)))
    for x0, x1 in DOORS:
        x0, x1 = x0 - DOOR_GAP, x1 + DOOR_GAP
        y0, y1 = DOOR_SILL - 0.02, DOOR_TOP + DOOR_GAP
        cutters.append(prism('d', rrect((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0.01), 'z', HZ - 0.3, HZ + 0.3))
    for side in (-1, 1):  # the gangway door openings at the ends
        cutters.append(prism('g', rrect(0, (0.035 + 1.24) / 2, 0.8, 1.24 - 0.035, 0.07), 'x',
                             side * (HX - 0.3), side * (HX + 0.3)))
    boolean_cut(body, cutters)
    # cut lines for the colours' crisp bands (stripe, seams, gutter), on the outer faces only; the
    # weathering is in the wear texture, so no grid for it
    xs = set()
    for s in SEAMS_X:
        xs |= {s - 0.006, s + 0.006}
    for s in ROOF_SEAMS:
        xs |= {s - 0.007, s + 0.007}
    ys = {STRIPE[0], STRIPE[1], GUTTER[0], GUTTER[1], SEAM_Y - 0.006, SEAM_Y + 0.006}

    def outer(f):
        c = f.calc_center_median()
        return plan_sd(c.x, c.z) > -0.02 and abs(f.normal.y) < 0.75 and c.y < GUTTER[1] + 0.01

    def outer_or_roof(f):
        return outer(f) or f.normal.y > 0.75

    def end(f):  # the ends' outer faces, split at z = 0 where the wear texture's two side strips meet
        c = f.calc_center_median()
        return plan_sd(c.x, c.z) > -0.02 and abs(c.x) > HX - RP and f.normal.y < 0.75

    bisect(body, [((x, 0, 0), (1, 0, 0)) for x in sorted(xs) if abs(x) < HX - 1e-3], outer_or_roof)
    bisect(body, [((0, y, 0), (0, 1, 0)) for y in sorted(ys)], outer)
    bisect(body, [((0, 0, 0), (0, 0, 1))], end)
    paint(body, skin_colour)
    wear.unwrap(body, lambda c, n: skin_part(c, n))
    parts = [body]

    # window frames: flush glazing (#361), a slim dark gasket round the glass, level with the skin (the glass, car.js
    # buildGlass, sits just inside it)
    for side in (-1, 1):
        for x, w in WINS[side]:
            cy, h = (WIN_Y0 + WIN_Y1) / 2, WIN_Y1 - WIN_Y0
            o = rrect(x, cy, w + 0.016, h + 0.016, WIN_R + 0.008, 3)
            i = rrect(x, cy, w - 0.036, h - 0.036, WIN_R - 0.018, 3)
            d0, d1 = (HZ - 0.03, HZ + 0.002) if side > 0 else (-HZ - 0.002, -HZ + 0.03)
            fr = prism('frame', o, 'z', d0, d1, inner=i)
            paint(fr, lambda c, n, p: paint_(C['frame']))
            wear.patch(fr, 'matte')
            parts.append(fr)
    # roof units: two air-conditioning housings with louvred tops and grilles on their sides
    for x in (-2.15, 2.15):
        u = rounded_box('unit', 0.72, 0.5, TOP - 0.02, TOP + 0.15, 0.08, r_top=0.035, seg=3)
        bisect(u, [((0, TOP + 0.04, 0), (0, 1, 0)), ((0, TOP + 0.1, 0), (0, 1, 0))])

        def unit_col(c, n, p, x=x):
            if abs(n.y) < 0.5 and TOP + 0.04 < c.y < TOP + 0.1 and abs(c.x - x) < 0.6:
                return paint_(C['louvre'])  # side grille band
            return metal(mul(C['unit'], 1 - 0.05 * (fbm(p.x * 2, p.z * 2, 21) - 0.5)))

        u.location.x = x
        apply_loc(u)
        paint(u, unit_col)
        wear.patch(u, 'metal')
        parts.append(u)
        lv = prism('louvre', rrect(x, 0, 1.06, 0.66, 0.04), 'y', TOP + 0.13, TOP + 0.155)
        paint(lv, lambda c, n, p: paint_(C['louvre']))
        wear.patch(lv, 'matte')
        parts.append(lv)
        for k in range(8):
            sx = x - 0.45 + k * (0.9 / 7)
            sl = prism('slat', rrect(sx, 0, 0.045, 0.6, 0.01), 'y', TOP + 0.13, TOP + 0.17)
            paint(sl, lambda c, n, p: metal(C['slat']))
            wear.patch(sl, 'metal')
            parts.append(sl)
    # small vents fore and aft on the roof's centre line
    for x in (-3.55, 0.0, 3.55):
        v = rounded_box('vent', 0.22, 0.16, TOP - 0.02, TOP + 0.06, 0.04, r_top=0.02, seg=2)
        v.location.x = x
        apply_loc(v)
        paint(v, lambda c, n, p: paint_(C['louvre']) if abs(n.y) < 0.5 else metal(C['unit']))
        wear.patch(v, 'metal')
        parts.append(v)
    return join(parts, 'car_skin')


def apply_loc(ob):
    me = ob.data
    for v in me.vertices:
        v.co += ob.location
    ob.location = (0, 0, 0)


# ---- the skirt ----
# A straddle car (#359, Jørgen: "monorail carts also hug the side of the rail a bit, not just float on top of it"): the
# skirt comes down past the beam's top on both sides, with a channel along its underside that the beam runs in, and a
# guide-wheel housing either side of the beam at each bogie, its wheel against the beam's side.
SKIRT_Y0, SKIRT_Y1 = -0.66, 0.03  # the skirt's bottom edge (BEAM_TOP - 0.5) and its top, just over the floor
SLOT, SLOT_TOP = 0.47, -0.13  # the channel's half width (the beam's 0.42 and a gap) and its roof, over the beam's top
BOGIES = (-2.75, 2.75)  # where the bogies run, each with a guide wheel either side of the beam, fore and aft


def build_under():
    Y0, Y1 = SKIRT_Y0, SKIRT_Y1
    sk = rounded_box('car_under', HX + 0.008, HZ + 0.008, Y0, Y1, RP + 0.008, r_bot=0.1, seg=5)
    slot = prism('slot', [(-SLOT, Y0 - 0.5), (SLOT, Y0 - 0.5), (SLOT, SLOT_TOP), (-SLOT, SLOT_TOP)], 'x',
                 -HX - 1, HX + 1)
    boolean_cut(sk, [slot])
    bm = bmesh.new()
    bm.from_mesh(sk.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.y > 0.99 and f.calc_center_median().y > Y1 - 1e-4],
                     context='FACES')
    bm.to_mesh(sk.data)
    bm.free()
    solidify(sk, 0.035)
    seams = [-3.0, -1.5, 0.0, 1.5, 3.0]
    xs = set(round(-HX + 1.0 * i, 4) for i in range(int(2 * HX / 1.0) + 1))
    for s in seams:
        xs |= {s - 0.006, s + 0.006}
    def outside(f):
        c = f.calc_center_median()
        return plan_sd(c.x, c.z) > -0.02 and abs(f.normal.y) < 0.6

    bisect(sk, [((x, 0, 0), (1, 0, 0)) for x in sorted(xs) if abs(x) < HX - 1e-3], outside)
    bisect(sk, [((0, y, 0), (0, 1, 0)) for y in (-0.13, -0.095, -0.3)], outside)

    def col(c, n, p):
        sd = plan_sd(c.x, c.z)
        if sd < -0.03 or n.y > 0.75:
            return C['under']
        if -0.13 < c.y < -0.095:
            return C['rub']
        if abs(n.y) < 0.6 and any(abs(c.x - s) < 0.006 for s in seams) and abs(c.z) > HZ - 0.1:
            return C['navyDark']
        k = 1 - 0.18 * max(0.0, (-0.3 - p.y) / 0.36) - 0.05 * (fbm(p.x * 1.2, p.y * 3, 31) - 0.5)
        if n.y < -0.3:
            k *= 0.8
        return mul(C['navy'], k)

    paint(sk, col)
    parts = [sk]
    # the guide wheels: a housing hung from the skirt's underside either side of the beam, and under it two rubber
    # wheels on upright axles that run on the beam's side, clear of its foot (the flange from BEAM_TOP - 0.7)
    WR, WY0, WY1 = 0.13, Y0 - 0.17, Y0 - 0.1
    for bx in BOGIES:
        for sz in (-1, 1):
            h = rounded_box('housing', 0.5, 0.15, Y0 - 0.1, Y0 + 0.02, 0.04, seg=2, open_top=True)
            h.location = (bx, 0, sz * (SLOT + 0.15))
            apply_loc(h)
            paint(h, lambda c, n, p: mul(C['under'], 1.25) if n.y < 0.75 else C['under'])
            parts.append(h)
            for dx in (-0.3, 0.3):
                N = 8
                zc = sz * (0.42 + WR + 0.004)
                w = prism('wheel', [(bx + dx + WR * math.cos(2 * math.pi * k / N), zc + WR * math.sin(2 * math.pi * k / N))
                                    for k in range(N)], 'y', WY0, WY1)
                paint(w, lambda c, n, p: C['tyre'] if abs(n.y) < 0.5 else C['hub'])
                parts.append(w)
    return join(parts, 'car_under')


# ---- the bellows ----
def build_bellows():
    bm = bmesh.new()
    N, L = 13, 0.6
    loops = []
    for i in range(N):
        x = -L / 2 + L * i / (N - 1)
        big = i % 2 == 0
        hw, hh = (0.8, 0.76) if big else (0.72, 0.69)
        pts = rrect(0, 0.69, 2 * hw, 2 * hh, 0.16 if big else 0.12, 4)
        loops.append([bm.verts.new((x, v, u)) for u, v in pts])
    for a, b in zip(loops, loops[1:]):
        n = len(a)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new([a[i], b[i], b[j], a[j]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm('bellows', bm)

    def col(c, n, p):
        k = 1 - 0.08 * (fbm(p.y * 3, p.z * 3, 41) - 0.5)
        return mul(C['belEdge'] if abs(n.x) < 0.5 else C['bel'], k)

    paint(ob, col, smooth_angle=20)
    return ob


# ---- the beam ----
BEAM_SECTION = [  # (z, y) half section, top at 0, from the top centre round to the bottom centre
    (0.0, 0.0), (0.36, 0.0), (0.42, -0.06), (0.42, -0.7), (0.48, -0.74), (0.48, -0.9), (0.42, -BEAM_H), (0.0, -BEAM_H)]


def build_beam():
    half = BEAM_SECTION
    prof = [(z, y) for z, y in half[1:-1]] + [(-z, y) for z, y in reversed(half[1:-1])]
    ob = prism('beam', prof, 'x', 0.0, SEG)
    xs = [0.04, 0.08] + [1.9 * i for i in range(1, 5)] + [SEG - 0.04]
    rust_x = [0.14, SEG - 0.2] + [random.uniform(1, SEG - 1) for _ in range(2)]
    for r in rust_x:
        xs += [r - 0.05, r, r + 0.05]
    xs = sorted(set(round(x, 4) for x in xs if 0.01 < x < SEG - 0.01))
    bisect(ob, [((x, 0, 0), (1, 0, 0)) for x in xs])
    bisect(ob, [((0, y, 0), (0, 1, 0)) for y in (-0.35,)], lambda f: abs(f.normal.z) > 0.9)
    bisect(ob, [((0, 0, z), (0, 0, 1)) for z in (-0.2, 0.2)], lambda f: abs(f.normal.y) > 0.9)

    def col(c, n, p):
        if c.x < 0.04 or c.x > SEG - 0.04 + 1e-4:
            return C['joint']  # the expansion gap's faces round the section
        base = C['concreteTop'] if n.y > 0.75 else C['concrete']
        k = 1 - 0.09 * (fbm(p.x * 0.7, p.y * 4 + p.z, 51) - 0.5)
        k -= 0.1 * max(0.0, (-0.6 - p.y) / 0.36)  # grime on the flange
        if n.y < -0.5:
            k *= 0.78
        rust = 0.0
        for r in rust_x:
            rust += math.exp(-((p.x - r) / 0.045) ** 2) * max(0.0, 1 - (-p.y) / 0.85) * (0.5 if r > 0.5 and r < SEG - 0.5 else 0.8)
        out = mul(base, max(0.6, k))
        return mix(out, C['rust'], min(0.6, rust * 0.55)) if n.y < 0.75 else out

    paint(ob, col, smooth_angle=30)
    # the joint's steel finger plate on top
    pl = prism('plate', [(-0.36, 0.0), (0.36, 0.0), (0.36, 0.012), (-0.36, 0.012)], 'x', -0.07, 0.07)
    paint(pl, lambda c, n, p: C['plate'])
    return join([ob, pl], 'beam')


# ---- the pillar and its foot ----
def build_pillar():
    beam_foot = BEAM_TOP - BEAM_H
    cap_top = beam_foot - 0.04
    cap_bot = cap_top - 0.62
    col_top = cap_bot + 0.1
    col_bot = SEA_Y - 1.0
    N = 12
    bm = bmesh.new()
    rings = []
    ys = [col_bot + (col_top - col_bot) * i / 11 for i in range(12)]
    for y in ys:
        t = (y - col_bot) / (col_top - col_bot)
        r = 0.48 + (0.38 - 0.48) * t
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / N), y, r * math.sin(2 * math.pi * k / N))) for k in range(N)])
    for a, b in zip(rings, rings[1:]):
        for k in range(N):
            j = (k + 1) % N
            bm.faces.new([a[k], a[j], b[j], b[k]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    colm = obj_from_bm('column', bm)
    streak_a = [random.uniform(0, 2 * math.pi) for _ in range(3)] + [math.pi / 2 - 0.5, math.pi / 2 + 0.6, 2.6]

    def concrete_col(c, n, p):
        a = math.atan2(p.z, p.x)
        k = 1 - 0.08 * (fbm(a * 2, p.y * 0.8, 61) - 0.5)
        rust = 0.0
        for sa in streak_a:
            da = math.atan2(math.sin(a - sa), math.cos(a - sa))
            rust += math.exp(-(da / 0.16) ** 2) * max(0.0, 1 - (cap_bot - p.y) / 6.5)
        tide = max(0.0, min(1.0, (SEA_Y + 1.6 - p.y) / 1.2))
        out = mix(mul(C['concrete'], k), C['algae'], tide * 0.7)
        return mix(out, C['rust'], min(0.5, rust * 0.5))

    paint(colm, concrete_col)
    collar = prism('collar', [(0.47 * math.cos(2 * math.pi * k / N), 0.47 * math.sin(2 * math.pi * k / N)) for k in range(N)],
                   'y', cap_bot - 0.24, cap_bot + 0.02)
    paint(collar, lambda c, n, p: mul(C['concrete'], 0.93))
    # hammerhead: wide under the beam, tapering down to the column
    hb = bmesh.new()
    pts = [(sx * 0.48, cap_top, sz * 0.92) for sx in (-1, 1) for sz in (-1, 1)]
    pts += [(sx * 0.48, cap_top - 0.24, sz * 0.92) for sx in (-1, 1) for sz in (-1, 1)]
    pts += [(sx * 0.44, cap_bot, sz * 0.46) for sx in (-1, 1) for sz in (-1, 1)]
    for q in pts:
        hb.verts.new(q)
    bmesh.ops.convex_hull(hb, input=hb.verts)
    bmesh.ops.bevel(hb, geom=list(hb.edges), offset=0.025, segments=1, affect='EDGES', clamp_overlap=True)
    cap = obj_from_bm('cap', hb)
    bisect(cap, [((0, 0, z), (0, 0, 1)) for z in (-0.6, -0.3, -0.12, 0.12, 0.3, 0.6)] +
           [((0, y, 0), (0, 1, 0)) for y in (cap_top - 0.12, cap_top - 0.36, cap_top - 0.48)])

    def cap_col(c, n, p):
        k = 1 - 0.08 * (fbm(p.x * 3, p.z * 3 + p.y, 71) - 0.5)
        rust = sum(math.exp(-((p.z - sz) / 0.09) ** 2) for sz in (-0.3, 0.3)) * max(0.0, 1 - (cap_top - p.y) / 0.7)
        base = C['concreteTop'] if n.y > 0.75 else C['concrete']
        if n.y < -0.3:
            k *= 0.85
        return mix(mul(base, k), C['rust'], min(0.6, rust * 0.6))

    paint(cap, cap_col)
    parts = [colm, collar, cap]
    for sz in (-0.3, 0.3):  # bearings under the beam
        b = prism('pad', rrect(0, sz, 0.36, 0.3, 0.02), 'y', cap_top - 0.005, beam_foot + 0.002)
        paint(b, lambda c, n, p: C['pad'])
        parts.append(b)
    return join(parts, 'pillar')


def build_foot():
    N = 8
    o = [(0.86 * math.cos(2 * math.pi * (k + 0.5) / N), 0.86 * math.sin(2 * math.pi * (k + 0.5) / N)) for k in range(N)]
    ob = prism('foot', o, 'y', -0.4, 0.4)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    top = [e for e in bm.edges if all(v.co.y > 0.39 for v in e.verts)]
    bmesh.ops.bevel(bm, geom=top, offset=0.08, segments=1, affect='EDGES', clamp_overlap=True)
    bm.to_mesh(ob.data)
    bm.free()
    bisect(ob, [((0, y, 0), (0, 1, 0)) for y in (-0.1, 0.1)])

    def col(c, n, p):
        k = 1 - 0.1 * (fbm(math.atan2(p.z, p.x) * 2, p.y * 3, 81) - 0.5)
        return mix(mul(C['footc'], k), C['algae'], max(0.0, min(1.0, (0.15 - p.y) / 0.4)) * 0.8)

    paint(ob, col, smooth_angle=30)
    return ob


# ---- material and export ----
def byte_colours(path):
    """Rewrite every float COLOR_0 as normalised unsigned bytes (RGBA), which glTF allows for vertex colours: a
    third of the file's size for the same look."""
    import json, struct
    b = open(path, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    bin0 = 20 + jl + 8
    blob = b[bin0:bin0 + struct.unpack('<I', b[20 + jl:24 + jl])[0]]
    colours = {p['attributes']['COLOR_0'] for m in j['meshes'] for p in m['primitives'] if 'COLOR_0' in p['attributes']}
    data = {}
    for i, v in enumerate(j['bufferViews']):
        data[i] = blob[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    for ai in colours:
        a = j['accessors'][ai]
        if a['componentType'] != 5126:
            continue
        n, k = a['count'], {'VEC3': 3, 'VEC4': 4}[a['type']]
        fl = struct.unpack('<%df' % (n * k), data[a['bufferView']][a.get('byteOffset', 0):a.get('byteOffset', 0) + n * k * 4])
        out = bytearray()
        for i in range(n):
            px = fl[i * k:i * k + k]
            out += bytes(max(0, min(255, round(c * 255))) for c in px[:3]) + bytes([255 if k == 3 else round(px[3] * 255)])
        data[a['bufferView']] = bytes(out)
        j['bufferViews'][a['bufferView']].pop('byteStride', None)
        a.update(componentType=5121, normalized=True, type='VEC4', byteOffset=0)
        a.pop('min', None), a.pop('max', None)
    out = bytearray()
    for i, v in enumerate(j['bufferViews']):
        while len(out) % 4:
            out.append(0)
        v['byteOffset'] = len(out)
        v['byteLength'] = len(data[i])
        out += data[i]
    while len(out) % 4:
        out.append(0)
    j['buffers'][0]['byteLength'] = len(out)
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out))
    glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
    open(path, 'wb').write(glb)



def material():
    m = bpy.data.materials.new('monorail')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.6
    return m


def main():
    nodes = [build_skin(), build_under(), build_bellows(), build_beam(), build_pillar(), build_foot()]
    wear.bake(nodes[0], nodes[1:2], nodes[2:], os.path.join(os.path.dirname(OUT), 'monorail-wear.webp'))
    m = material()
    for ob in nodes:
        ob.data.materials.clear()
        ob.data.materials.append(m)
        ca = ob.data.color_attributes.get('Col')
        if ca:
            ob.data.color_attributes.active_color = ca
        print(ob.name, len(ob.data.vertices), 'verts', len(ob.data.polygons), 'faces')
    for o in list(SCN.objects):
        if o not in nodes:
            bpy.data.objects.remove(o)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=False, export_apply=True,
                              export_vertex_color='MATERIAL', export_normals=True, export_texcoords=True,
                              export_materials='EXPORT', use_selection=False)
    byte_colours(OUT)
    if len(argv) > 1:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(argv[1]))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


main()
