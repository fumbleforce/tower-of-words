"""Honsha station from outside, modelled in Blender (issue #382, Jørgen 2026-10-09: the station the train arrives at is
"MASSIVELY underworked, it is completely broken looking, missing half the building" ... "just build it properly
already"): the two-storey station block finished on every side, the platform shed with its two side platforms, the
covered walkway, and the pieces the game strings along the monorail's approach.

  python3 tools/gpu_priority.py run station --rank render -- blender -b --factory-startup -P tools/station/station.py -- game3d/assets/station/station.glb [where to save the .blend]

Units and frame: the forecourt's own (game3d/js/scenes/forecourt.js; +y up, x east, z south), exported with
export_yup off, so the game adds every node at the forecourt's origin as it is. The numbers below are the game's; keep
them in step:
  the station block   island-layout.js BUILDINGS station, through toLocal('forecourt') (scenes/station-exterior.js
                      STATION, DOOR_X, STAFF_X, H1, H2, TOPH, SIDE_WIN, FRONT)
  the platform shed   BUILDINGS platform_shed: its centre line is the train chunk's (CHUNKS.train.at, island x -28.6),
                      the car's floor is the platforms' level DECK above the ground, the beam's top BEAM_TOP = DECK - 0.16
                      (train/world.js, the car rides low on the beam, #359); the platforms' edges stand EDGE from the
                      beam's centre (the car is 2.6 wide), the other way's beam BEAM2 west of it (world.js BEAM2_Z,
                      over the chunk's scale)
  the walkway         scenes/station-shed.js coveredWalk()

Each node is one mesh with one colour per face corner (sRGB in the file), flat shaded. Nodes, by what the game does
with them (scenes/station-model.js):
  st_walls   the block's brick walls, every face, ground to parapet, with the real openings (street style: brick)
  st_stone   plinth, quoins, string course, cornice, coping, window sills and heads, door surrounds, the floor slab
  st_metal   window and door frames, the glass front's mullions and doors, the canopies, downpipes, the roof deck and
             its plant, the sign's frame
  st_glass   the window panes, one quad each (the game makes each a pane of its own)
  st_fine    small roof and wall detail: fan grilles, louvres, railings, the hatch door (not on a phone)
  sh_concrete  the track beam and the other way's beam in the shed, the portal frames, the platforms with their
             coping, edge line, tactile strip and paving, the cross deck joining them at the north end, the east
             platform's stair (waist, treads, nosings, warning rows) and its side walls with coping, its landing, the
             tactile guide path along the walkway
  sh_metal   roof columns, the back wall's panels and mullions, the east railing, the north gable's panels and
             mullions, the platform clock, the buffers, the stair handrails, the walkway's posts, the sign frames
             (the shed's steel is the world kit's pale steel, game3d/js/kit/core/palette.js STEEL)
  sh_roof    the curved roof: skin, standing seams, ribs, purlins, gutters and end fascias (fades on a phone)
  sh_glass   the back wall's and the north gable's glazing, the walkway's wind screen
  sh_fine    benches, bins, light fittings, the gable's transoms (not on a phone)
  wk_roof    the covered walkway's roofs and their down-lights (an occluder in the station garden)
  ap_beam    one metre of the approach beam along +z from z = 0, its top at y = 0
  ap_head    an approach pier's hammerhead and bearings, its top at y = 0 (under the beam)
  ap_col     an approach pier's column, one unit high from y = 0 (the game stretches it)
"""
import bpy, bmesh, math, os, random, sys

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else 'game3d/assets/station/station.glb')
random.seed(382)

# ---- the game's numbers ----
X0, X1, ZN, ZS = -6.8, 5.8, 2.65, 11.65  # the station's footprint (forecourt frame)
CX = (X0 + X1) / 2
DOOR_X, STAFF_X = CX - 1, CX + 3.95
H1, H2, TOPH = 1.9, 3.8, 4.1
O, TW = 0.02, 0.2  # the walls' outer face stands O outside the footprint; thickness
SIDE_WIN = [(ZN + 4.5 + a, ZN + 4.5 + b) for a, b in ((-3.4, -2.2), (-1.0, 0.2), (1.4, 2.6))]
FRONT = (CX - 2.4, CX + 2.4)
UP0, UP1 = 2.35, 3.4  # the upper windows
NS_UP = [X0 + 1.8 * (i + 0.5) for i in range(7)]  # north and south upper windows' centres (1.2 wide)
EW_UP = [ZN + 1.8 * (i + 0.5) for i in range(5)]  # east and west (1.1 wide), over the street style's window boxes
SIGN_X = DOOR_X + 1.6

SX, SZ, SL = -14.65, -4.55, 38.4  # the shed's centre line and length (BUILDINGS platform_shed)
DECK = 2.5
BEAM_TOP = DECK - 0.16
BEAM_H = 0.96
EDGE = 1.38  # the platforms' edge from the beam's centre
PW = 4.0  # the platforms' outer edge
BEAM2 = -6.36  # the other way's beam, west of the arrival line
V0, V1 = -SL / 2, SL / 2
CROSS = V0 + 2.4  # the cross deck at the north end, from the gable to here (v): the beams end against it (#403)
BUFFER_V = CROSS + 0.6  # the beams' buffer stops
PORTALS = [-18.6 + 4.8 * k for k in range(8)]  # -18.6 .. 15.0
END_V = 18.9  # the posts under the platforms' south ends
STAIR = (16.0, 19.36)  # v of the stair's top and foot (the east platform's)
STAIR_U = (2.05, 3.35)
EAVE_U, EAVE_Y, CROWN = 4.6, 4.75, 0.85
ROOF_V = (V0 - 0.4, V1 + 0.4)
COL_U = 3.55
BEAM_SECTION = [(0.36, 0.0), (0.42, -0.06), (0.42, -0.7), (0.48, -0.74), (0.48, -0.9), (0.42, -BEAM_H)]

WALK = [(-13.05, 0.7, 16.35, 18.15), (-1.7, 0.7, 11.65, 16.35)]  # station-shed.js coveredWalk(), x0 x1 z0 z1
WROOF_Y = (2.14, 2.24)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


C = {k: hexc(v) for k, v in dict(
    brick='#7a6553', stone='#b7b2a6', stoneDark='#9d988c', frame='#3d434c', metal='#6f7782', pale='#b9bfc6',
    deck='#7c8079', membrane='#8a8f88', louvre='#4a5059', grille='#2a2e34', door='#56606c', glass='#8c9dad',
    canopy='#4f5863', ceiling='#d9d6cf',
    concrete='#a3a6a6', concreteTop='#b0b2b1', concreteDark='#8b8f90', paving='#9a9c9b', pavingB='#a7a8a5',
    coping='#c4c4bd', line='#ecebe4', tactile='#c9a443', tactileDark='#b08f36', edge='#5b6068', joint='#555a60',
    roofTop='#7f8e9d', roofSeam='#98a6b4', roofUnder='#d4d7da', rib='#7d8792', gutter='#47525e', column='#68727e',
    panel='#b4bbc3', panelB='#a7afb8', tread='#c3c1b9', riser='#a3a49f', nosing='#4e5258', kerb='#8b8c88', rail='#5d6570', buffer='#c2463c', bufferPad='#2a2d31', wood='#8a6a4c', bin='#4f6f9a',
    lamp='#e9ecef', walkStone='#8e8a86', post='#5b636e', sign='#2c3a55',
    # the shed's and the walkway's painted steel, in the world kit's steels (game3d/js/kit/core/palette.js STEEL.pale
    # for the structure; a step and two steps darker for rails and trim), so the shed reads light, as built
    shSteel='#9aa0aa', shRail='#8c929c', shTrim='#7a818b', clockFace='#f1f0ea', clockHand='#2b2f35',
).items()}


def mix(a, b, k):
    return tuple(a[i] + (b[i] - a[i]) * k for i in range(3))


def mul(a, k):
    return tuple(max(0.0, min(1.0, c * k)) for c in a)


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _h(i, j, s):
    n = (i * 374761393 + j * 668265263 + s * 2246822519) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def vnoise(x, y, s=0):
    i, j = math.floor(x), math.floor(y)
    fx, fy = x - i, y - j
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = _h(i, j, s), _h(i + 1, j, s), _h(i, j + 1, s), _h(i + 1, j + 1, s)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def grime(col, p, k=0.12, s=0):
    """Mottling, and darker toward the ground."""
    m = 1 - k * (vnoise(p[0] * 1.3 + p[2] * 0.7, p[1] * 1.7, s) - 0.5) * 2
    low = 1 - 0.1 * max(0.0, 1 - p[1] / 0.6)
    return mul(col, m * low)


# ---- a mesh being built: faces with one colour per corner ----
class Mesh:
    def __init__(self, name, uv=False):
        self.name = name
        self.bm = bmesh.new()
        self.cl = self.bm.loops.layers.float_color.new('Col')
        self.uv = self.bm.loops.layers.uv.new('UVMap') if uv else None  # only the glass has its panes mapped

    def face(self, pts, col, uvs=None):
        vs = [self.bm.verts.new(p) for p in pts]
        f = self.bm.faces.new(vs)
        for i, lp in enumerate(f.loops):
            c = col(lp.vert.co) if callable(col) else col
            lp[self.cl] = (lin(c[0]), lin(c[1]), lin(c[2]), 1.0)
            if uvs and self.uv:
                lp[self.uv].uv = uvs[i]
        return f

    def box(self, x0, x1, y0, y1, z0, z1, col, skip=()):
        """An axis-aligned box. col: a colour, or col(p, n) per corner (n: the face's outward axis, e.g. '+y')."""
        if x1 < x0: x0, x1 = x1, x0
        if y1 < y0: y0, y1 = y1, y0
        if z1 < z0: z0, z1 = z1, z0
        if min(x1 - x0, y1 - y0, z1 - z0) < 1e-5:
            return
        F = {
            '+x': [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)],
            '-x': [(x0, y0, z1), (x0, y1, z1), (x0, y1, z0), (x0, y0, z0)],
            '+y': [(x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)],
            '-y': [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)],
            '+z': [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
            '-z': [(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)],
        }
        for n, pts in F.items():
            if n in skip:
                continue
            self.face(pts, (lambda p, n=n: col(p, n)) if callable(col) else col)

    def fix(self, k):
        """Point the last k faces outward (a closed piece)."""
        self.bm.faces.ensure_lookup_table()
        fs = list(self.bm.faces)[-k:]
        bmesh.ops.recalc_face_normals(self.bm, faces=fs)

    def prism(self, outline, axis, d0, d1, col, caps=True):
        """Extrude a closed 2D outline (counter-clockwise) along an axis. axis 'z': (u, v) = (x, y); 'x': (u, v) = (z, y)
        reversed so faces point out; 'y': (u, v) = (x, z)."""
        def P(u, v, d):
            return {'z': (u, v, d), 'x': (d, v, u), 'y': (u, d, v)}[axis]
        n = len(outline)
        flip = axis == 'x' or axis == 'y'
        for i in range(n):
            j = (i + 1) % n
            (ua, va), (ub, vb) = outline[i], outline[j]
            q = [P(ua, va, d0), P(ub, vb, d0), P(ub, vb, d1), P(ua, va, d1)]
            self.face(q[::-1] if flip else q, col)
        if caps:
            a = [P(u, v, d0) for u, v in outline]
            b = [P(u, v, d1) for u, v in outline]
            self.face(a if flip else a[::-1], col)
            self.face(b[::-1] if flip else b, col)
        self.outward(n + 2 if caps else n)

    def outward(self, k):
        """Point the last k faces away from their middle (a convex piece). Every face has its own corners, so
        recalc_face_normals can't tell inside from outside and left some caps facing in (culled, so the stairs' side
        walls showed only their edges)."""
        self.bm.faces.ensure_lookup_table()
        fs = list(self.bm.faces)[-k:]
        cs = [f.calc_center_median() for f in fs]
        mid = sum(cs, cs[0].copy() * 0) / len(cs)
        for f, c in zip(fs, cs):
            f.normal_update()
            if f.normal.dot(c - mid) < 0:
                f.normal_flip()

    def cyl(self, cx, cz, r, y0, y1, n, col, r1=None, caps=(False, True)):
        r1 = r if r1 is None else r1
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            p = [(cx + r * math.cos(a0), y0, cz + r * math.sin(a0)), (cx + r * math.cos(a1), y0, cz + r * math.sin(a1)),
                 (cx + r1 * math.cos(a1), y1, cz + r1 * math.sin(a1)), (cx + r1 * math.cos(a0), y1, cz + r1 * math.sin(a0))]
            self.face(p[::-1], col)
        if caps[1]:
            self.face([(cx + r1 * math.cos(2 * math.pi * k / n), y1, cz + r1 * math.sin(2 * math.pi * k / n)) for k in range(n)][::-1], col)
        if caps[0]:
            self.face([(cx + r * math.cos(2 * math.pi * k / n), y0, cz + r * math.sin(2 * math.pi * k / n)) for k in range(n)], col)
        if caps[0] and caps[1]:
            self.outward(n + 2)

    def hcyl_z(self, cx, cy, r, z0, z1, n, col):
        """A cylinder lying along z."""
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            p = [(cx + r * math.cos(a0), cy + r * math.sin(a0), z0), (cx + r * math.cos(a1), cy + r * math.sin(a1), z0),
                 (cx + r * math.cos(a1), cy + r * math.sin(a1), z1), (cx + r * math.cos(a0), cy + r * math.sin(a0), z1)]
            self.face(p, col)

    def quad_x(self, x, z0, z1, y0, y1, side, col, uv=False):
        """A quad on the plane x, facing +x (side 1) or -x."""
        p = [(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)]
        uvs = [(0, 0), (0, 1), (1, 1), (1, 0)] if side > 0 else None
        if side < 0:
            p = p[::-1]
            uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
        self.face(p, col, uvs if uv else None)

    def quad_z(self, z, x0, x1, y0, y1, side, col, uv=False):
        p = [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]
        uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
        if side < 0:
            p = p[::-1]
            uvs = uvs[::-1]
            uvs = [(1, 0), (0, 0), (0, 1), (1, 1)][::-1]
        self.face(p, col, uvs if uv else None)

    def done(self):
        for f in self.bm.faces:
            f.smooth = False
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        print(self.name, len(me.polygons), 'faces')
        return ob


def wall_run(m, face, a0, a1, y0, y1, holes, col, out=None):
    """A wall along a face of the block from a0 to a1, y0..y1, with holes [a, b, h0, h1]. face 'N', 'S', 'E', 'W'.
    out: (d_out, d_in), how far its outer and inner faces stand from the footprint line (outward positive)."""
    d_out, d_in = out or (O, -(TW - O))
    cuts = [(max(a, a0), min(b, a1), max(h0, y0), min(h1, y1)) for a, b, h0, h1 in holes
            if h1 > y0 and h0 < y1 and b > a0 and a < a1]
    xs = sorted(set([a0, a1] + [c for a, b, _, _ in cuts for c in (a, b)]))

    def put(s0, s1, t0, t1):
        if s1 - s0 < 1e-3 or t1 - t0 < 1e-3:
            return
        if face == 'N':
            m.box(s0, s1, t0, t1, ZN - d_out, ZN - d_in, col)
        elif face == 'S':
            m.box(s0, s1, t0, t1, ZS + d_in, ZS + d_out, col)
        elif face == 'W':
            m.box(X0 - d_out, X0 - d_in, t0, t1, s0, s1, col)
        else:
            m.box(X1 + d_in, X1 + d_out, t0, t1, s0, s1, col)

    for i in range(len(xs) - 1):
        s0, s1 = xs[i], xs[i + 1]
        gaps = sorted([c for c in cuts if c[0] < s1 - 1e-6 and c[1] > s0 + 1e-6], key=lambda c: c[2])
        t = y0
        for _, _, h0, h1 in gaps:
            put(s0, s1, t, h0)
            t = max(t, h1)
        put(s0, s1, t, y1)


def on_face(face, a, b, y0, y1, d0, d1):
    """Box bounds for a strip a..b along a face, y0..y1, from d0 to d1 out from the footprint line."""
    if face == 'N':
        return (a, b, y0, y1, ZN - d1, ZN - d0)
    if face == 'S':
        return (a, b, y0, y1, ZS + d0, ZS + d1)
    if face == 'W':
        return (X0 - d1, X0 - d0, y0, y1, a, b)
    return (X1 + d0, X1 + d1, y0, y1, a, b)


def face_span(face):
    return (X0 - O, X1 + O) if face in 'NS' else (ZN + TW - O, ZS - TW + O)


def face_holes(face):
    if face == 'N':
        return ([(DOOR_X - 0.85, DOOR_X + 0.85, 0, 1.75), (STAFF_X - 0.45, STAFF_X + 0.45, 0, 1.35)] +
                [(c - 0.6, c + 0.6, UP0, UP1) for c in NS_UP])
    if face == 'S':
        return [(FRONT[0], FRONT[1], 0, 1.75)] + [(c - 0.6, c + 0.6, UP0, UP1) for c in NS_UP]
    return [(a, b, 0.3, 1.6) for a, b in SIDE_WIN] + [(c - 0.55, c + 0.55, UP0, UP1) for c in EW_UP]


def outward(face):
    return {'N': (0, -1), 'S': (0, 1), 'W': (-1, 0), 'E': (1, 0)}[face]


# ---- the station block ----
def station():
    walls, stone, metal, glass, fine = Mesh('st_walls'), Mesh('st_stone'), Mesh('st_metal'), Mesh('st_glass', uv=True), Mesh('st_fine')
    sc = lambda p, n: grime(C['stone'] if n != '-y' else C['stoneDark'], p, 0.08, 3)
    bc = lambda p, n: grime(C['brick'], p, 0.1, 1)
    for face in 'NSEW':
        a0, a1 = face_span(face)
        holes = face_holes(face)
        wall_run(walls, face, a0, a1, 0, TOPH, holes, bc)
        # the plinth, broken at the doors; the string course at the first floor; the cornice under the parapet
        doors = [h for h in holes if h[2] == 0]
        # the plinth and bands wrap round the corners
        ext = (X0 - 0.09, X1 + 0.09) if face in 'NS' else (ZN - 0.09, ZS + 0.09)
        wall_run(stone, face, ext[0], ext[1], 0, 0.32, [(a, b, 0, 9) for a, b, _, _ in doors], sc, out=(O + 0.05, O - 0.01))
        wall_run(stone, face, ext[0], ext[1], 1.86, 2.04, [], sc, out=(O + 0.06, O - 0.01))
        wall_run(stone, face, ext[0], ext[1], 3.62, 3.78, [], sc, out=(O + 0.08, O - 0.01))
        # the coping over the parapet, overhanging both faces
        wall_run(stone, face, ext[0] - 0.02, ext[1] + 0.02,
                 TOPH, TOPH + 0.07, [], sc, out=(O + 0.05, -(TW - O) - 0.04))
        # quoins at the corners: stone blocks alternating long and short, proud of the brick
        if face in 'NS':
            for corner, sgn in ((X0 - O, 1), (X1 + O, -1)):
                y = 0.32
                k = 0
                while y < 3.6:
                    y1 = min(3.62, y + 0.26)
                    if y1 > 1.86 and y < 2.04:
                        y = 2.04
                        continue
                    w = 0.42 if k % 2 == 0 else 0.26
                    a, b = (corner, corner + w) if sgn > 0 else (corner - w, corner)
                    stone.box(*on_face(face, a, b, y + 0.01, y1 - 0.01, O - 0.01, O + 0.03), sc)
                    y = y1
                    k += 1
        else:
            for corner, sgn in ((ZN - O, 1), (ZS + O, -1)):
                y = 0.32
                k = 0
                while y < 3.6:
                    y1 = min(3.62, y + 0.26)
                    if y1 > 1.86 and y < 2.04:
                        y = 2.04
                        continue
                    w = 0.26 if k % 2 == 0 else 0.42
                    a, b = (corner, corner + w) if sgn > 0 else (corner - w, corner)
                    stone.box(*on_face(face, a, b, y + 0.01, y1 - 0.01, O - 0.01, O + 0.03), sc)
                    y = y1
                    k += 1
        # windows: sill and head in stone, a dark metal frame in the reveal, a mullion (and a transom upstairs),
        # the panes between
        for a, b, h0, h1 in holes:
            if h0 == 0:
                continue
            stone.box(*on_face(face, a - 0.08, b + 0.08, h0 - 0.08, h0, -0.02, O + 0.1), sc)
            stone.box(*on_face(face, a - 0.1, b + 0.1, h1, h1 + 0.14, O - 0.01, O + 0.04), sc)
            window(metal, glass, face, a, b, h0, h1, transom=h0 >= UP0 - 1e-6)
    # the north face: the exit's stone surround, its canopy on two tie rods; the staff door, its leaf and hood
    for face, (a, b) in (('N', (DOOR_X - 0.85, DOOR_X + 0.85)),):
        stone.box(*on_face(face, a - 0.18, a, 0.32, 1.93, O - 0.01, O + 0.05), sc)
        stone.box(*on_face(face, b, b + 0.18, 0.32, 1.93, O - 0.01, O + 0.05), sc)
        stone.box(*on_face(face, a - 0.18, b + 0.18, 1.75, 1.86, O - 0.01, O + 0.05), sc)
        for s in (a, b - 0.05):  # the steel liner round the opening
            metal.box(*on_face(face, s, s + 0.05, 0, 1.75, -(TW - O) - 0.005, O + 0.005), C['frame'])
        metal.box(*on_face(face, a, b, 1.7, 1.75, -(TW - O) - 0.005, O + 0.005), C['frame'])
    canopy(metal, fine, 'N', DOOR_X - 1.45, DOOR_X + 1.45, 1.94, 1.35, rods=False)
    a, b = STAFF_X - 0.45, STAFF_X + 0.45
    metal.box(*on_face('N', a, b, 0, 1.35, -0.08, -0.04), C['door'])
    for s in (a, b - 0.05):
        metal.box(*on_face('N', s, s + 0.05, 0, 1.35, -0.1, O + 0.01), C['frame'])
    metal.box(*on_face('N', a, b, 1.3, 1.35, -0.1, O + 0.01), C['frame'])
    fine.box(*on_face('N', b - 0.2, b - 0.08, 0.66, 0.7, -0.04, 0.02), C['pale'])  # the handle
    fine.box(*on_face('N', a + 0.1, a + 0.4, 1.02, 1.2, -0.04, -0.03), C['pale'])  # STAFF ONLY plate
    metal.box(*on_face('N', a - 0.2, b + 0.2, 1.46, 1.54, O, O + 0.6), C['canopy'])  # the hood
    # the south front: a stone frame, the curtain wall with its doors, and the canopy the walkway arrives under
    a, b = FRONT
    stone.box(*on_face('S', a - 0.2, a, 0.32, 1.93, O - 0.01, O + 0.05), sc)
    stone.box(*on_face('S', b, b + 0.2, 0.32, 1.93, O - 0.01, O + 0.05), sc)
    curtain(metal, glass, fine, a, b)
    canopy(metal, fine, 'S', a - 0.5, b + 0.5, 2.1, 1.7)
    # downpipes down the north, south and west corners (the street style has the east ones, diorama/details.js)
    for face, s in (('N', X0 + 0.3), ('N', X1 - 0.3), ('S', X0 + 0.3), ('S', X1 - 0.3), ('W', ZN + 0.35), ('W', ZS - 0.35)):
        dx, dz = outward(face)
        px, pz = (s, ZN - O - 0.08) if face == 'N' else (s, ZS + O + 0.08) if face == 'S' else (X0 - O - 0.08, s)
        metal.cyl(px, pz, 0.04, 0.05, 3.65, 6, C['metal'])
        metal.box(px - 0.06, px + 0.06, 3.62, 3.78, pz - 0.06, pz + 0.06, C['metal'])  # the hopper
        for y in (0.5, 1.5, 2.6, 3.3):
            fine.box(px - 0.06, px + 0.06, y, y + 0.03, pz - 0.06, pz + 0.06, C['frame'])
        metal.box(px - 0.06, px + 0.06, 0.0, 0.05, pz - 0.06, pz + 0.06, C['frame'])
    # the floor between the storeys (seen through the exit) and the roof
    stone.box(X0 + TW - O, X1 - TW + O, H1, H1 + 0.1, ZN + TW - O, ZS - TW + O, C['ceiling'])
    roof(metal, fine)
    return [walls.done(), stone.done(), metal.done(), glass.done(), fine.done()]


def window(metal, glass, face, a, b, h0, h1, transom=False):
    """A window in an opening: the frame round it a third of the way into the reveal, a mullion in the middle, a
    transom near the top upstairs, and one pane in each light."""
    d = -0.07  # the glass's plane, in from the footprint line
    fc = C['frame']
    ring = 0.045
    metal.box(*on_face(face, a, a + ring, h0, h1, d - 0.03, d + 0.03), fc)
    metal.box(*on_face(face, b - ring, b, h0, h1, d - 0.03, d + 0.03), fc)
    metal.box(*on_face(face, a, b, h0, h0 + ring, d - 0.03, d + 0.03), fc)
    metal.box(*on_face(face, a, b, h1 - ring, h1, d - 0.03, d + 0.03), fc)
    mid = (a + b) / 2
    metal.box(*on_face(face, mid - 0.025, mid + 0.025, h0, h1, d - 0.03, d + 0.03), fc)
    rows = [(h0 + ring, h1 - ring)]
    if transom:
        t = h1 - 0.3
        metal.box(*on_face(face, a, b, t - 0.02, t + 0.02, d - 0.03, d + 0.03), fc)
        rows = [(h0 + ring, t - 0.02), (t + 0.02, h1 - ring)]
    for s0, s1 in ((a + ring, mid - 0.025), (mid + 0.025, b - ring)):
        for t0, t1 in rows:
            pane(glass, face, s0, s1, t0, t1, d)


def pane(glass, face, s0, s1, t0, t1, d):
    dx, dz = outward(face)
    if face == 'N':
        glass.quad_z(ZN - d, s0, s1, t0, t1, -1, C['glass'], uv=True)
    elif face == 'S':
        glass.quad_z(ZS + d, s0, s1, t0, t1, 1, C['glass'], uv=True)
    elif face == 'W':
        glass.quad_x(X0 - d, s0, s1, t0, t1, -1, C['glass'], uv=True)
    else:
        glass.quad_x(X1 + d, s0, s1, t0, t1, 1, C['glass'], uv=True)


def curtain(metal, glass, fine, a, b):
    """The glass front: mullions every 0.8, a pair of sliding doors in the middle bay pair, a transom at door head."""
    d = -0.04
    fc = C['frame']
    n = 6
    w = (b - a) / n
    for i in range(n + 1):
        x = a + i * w
        metal.box(*on_face('S', x - 0.035, x + 0.035, 0, 1.75, d - 0.04, d + 0.06), fc)
    metal.box(*on_face('S', a, b, 0, 0.08, d - 0.04, d + 0.06), fc)
    metal.box(*on_face('S', a, b, 1.69, 1.75, d - 0.04, d + 0.06), fc)
    metal.box(*on_face('S', a, b, 1.42, 1.46, d - 0.04, d + 0.05), fc)
    for i in range(n):
        x0, x1 = a + i * w + 0.035, a + (i + 1) * w - 0.035
        pane(glass, 'S', x0, x1, 0.08, 1.42, d)
        pane(glass, 'S', x0, x1, 1.46, 1.69, d)
    # the doors: the middle two bays, a frame inside each leaf and a long pull handle
    for i in (2, 3):
        x0, x1 = a + i * w + 0.035, a + (i + 1) * w - 0.035
        for s in (x0, x1 - 0.04):
            fine.box(*on_face('S', s, s + 0.04, 0.08, 1.42, d + 0.0, d + 0.03), fc)
        fine.box(*on_face('S', x0, x1, 0.08, 0.16, d, d + 0.03), fc)
        hx = x1 - 0.1 if i == 2 else x0 + 0.06
        fine.box(*on_face('S', hx, hx + 0.04, 0.45, 1.05, d + 0.03, d + 0.08), C['pale'])
    fine.box(*on_face('S', a + 2 * w - 0.3, a + 4 * w + 0.3, 0.0, 0.012, 0.0, 0.9), C['grille'])  # the mat


def canopy(metal, fine, face, a, b, y, depth, rods=True):
    """A flat steel canopy cantilevered off a face at height y: deck, upstand fascia, two tie rods to the wall."""
    cc = C['canopy']
    metal.box(*on_face(face, a, b, y, y + 0.1, O, O + depth), cc)
    metal.box(*on_face(face, a, b, y - 0.06, y + 0.16, O + depth - 0.06, O + depth), cc)
    metal.box(*on_face(face, a, a + 0.06, y - 0.06, y + 0.16, O, O + depth), cc)
    metal.box(*on_face(face, b - 0.06, b, y - 0.06, y + 0.16, O, O + depth), cc)
    fine.box(*on_face(face, a + 0.3, b - 0.3, y - 0.012, y, O + 0.2, O + depth - 0.25), C['lamp'])  # light panel
    for s in (a + 0.25, b - 0.29) if rods else ():  # tie rods from the canopy's front up to the wall
        n = 6
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            d0, d1 = O + depth * (1 - t0) - 0.08, O + depth * (1 - t1) - 0.08
            h0, h1 = y + 0.12 + 0.55 * t0, y + 0.12 + 0.55 * t1
            fine.box(*on_face(face, s, s + 0.03, min(h0, h1), max(h0, h1) + 0.03, min(d0, d1), max(d0, d1) + 0.03), C['frame'])


def roof(metal, fine):
    y = H2
    x0, x1, z0, z1 = X0 + TW - O, X1 - TW + O, ZN + TW - O, ZS - TW + O
    metal.box(x0, x1, y - 0.1, y, z0, z1, lambda p, n: grime(C['membrane'], p, 0.12, 9))
    # walkway pavers on the roof, from the hatch to the plant
    for (a, b, c, d) in ((x0 + 1.2, x1 - 2.6, ZN + 2.9, ZN + 3.5), (X1 - 2.6, X1 - 2.0, z0 + 0.4, z1 - 0.4)):
        metal.box(a, b, y, y + 0.025, c, d, C['deck'])
    # air handling units: louvred boxes on plinths
    for w, h, d, cx, cz in ((2.6, 0.9, 1.8, CX + 2.0, ZN + 5.6), (1.4, 0.8, 1.2, CX - 3.9, ZN + 6.6)):
        metal.box(cx - w / 2 - 0.05, cx + w / 2 + 0.05, y, y + 0.1, cz - d / 2 - 0.05, cz + d / 2 + 0.05, C['concreteDark'])
        metal.box(cx - w / 2, cx + w / 2, y + 0.1, y + h, cz - d / 2, cz + d / 2, lambda p, n: mul(C['pale'], 0.92 if n in ('-x', '+z') else 1))
        metal.box(cx - w / 2 - 0.04, cx + w / 2 + 0.04, y + h, y + h + 0.05, cz - d / 2 - 0.04, cz + d / 2 + 0.04, C['pale'])
        for yy in [y + 0.22 + 0.12 * i for i in range(int((h - 0.3) / 0.12))]:
            fine.box(cx - w / 2 + 0.15, cx + w / 2 - 0.15, yy, yy + 0.05, cz + d / 2, cz + d / 2 + 0.03, C['louvre'])
            fine.box(cx - w / 2 + 0.15, cx + w / 2 - 0.15, yy, yy + 0.05, cz - d / 2 - 0.03, cz - d / 2, C['louvre'])
        fine.cyl(cx + w / 4, cz, 0.28, y + h + 0.05, y + h + 0.15, 10, C['louvre'])
        # a duct from the big unit down into the roof
    metal.box(CX + 0.4, CX + 0.7, y, y + 0.55, ZN + 5.2, ZN + 5.6, C['metal'])
    metal.box(CX + 0.4, CX + 0.75, y + 0.45, y + 0.55, ZN + 5.2, ZN + 5.6, C['metal'])
    # condensers along the east side: casing, fan grille and hub
    z = ZN + 1.2
    while z < ZS - 1.0:
        cx = X1 - 1.0
        metal.box(cx - 0.42, cx + 0.42, y, y + 0.06, z - 0.47, z + 0.47, C['concreteDark'])
        metal.box(cx - 0.4, cx + 0.4, y + 0.06, y + 0.56, z - 0.45, z + 0.45, lambda p, n: mul(C['pale'], 0.9 if n == '-y' else 1))
        fine.cyl(cx, z, 0.32, y + 0.56, y + 0.575, 12, C['grille'])
        fine.cyl(cx, z, 0.07, y + 0.575, y + 0.6, 6, C['metal'])
        for k in (-1, 1):
            fine.box(cx - 0.32, cx + 0.32, y + 0.58, y + 0.59, z + k * 0.12 - 0.01, z + k * 0.12 + 0.01, C['metal'])
        z += 1.25
    # the cable tray from the condensers to the big unit
    metal.box(X1 - 1.6, X1 - 1.45, y + 0.15, y + 0.22, ZN + 1.0, ZS - 1.2, C['metal'])
    # the stair hatch: a small housing with a door and a guard rail round its roof
    hx0, hx1, hz0, hz1 = X0 + 0.8, X0 + 2.2, ZN + 0.8, ZN + 1.9
    metal.box(hx0, hx1, y, y + 0.95, hz0, hz1, lambda p, n: mul(C['pale'], 0.9 if n in ('-x', '+z') else 1))
    metal.box(hx0 - 0.05, hx1 + 0.05, y + 0.95, y + 1.0, hz0 - 0.05, hz1 + 0.05, C['frame'])
    fine.box(hx0 + 0.4, hx0 + 1.0, y + 0.02, y + 0.85, hz1, hz1 + 0.02, C['door'])
    # safety rail along the roof's edges where the plant is serviced (the parapet is low)
    for (a, b, c, d) in ((x0 + 0.2, x1 - 0.2, z0 + 0.2, z0 + 0.24), (x0 + 0.2, x1 - 0.2, z1 - 0.24, z1 - 0.2)):
        fine.box(a, b, y + 0.86, y + 0.9, c, d, C['rail'])
        xx = a
        while xx <= b + 1e-6:
            fine.box(xx - 0.02, xx + 0.02, y, y + 0.9, c - 0.0, d, C['rail'])
            xx += 1.5
    # the sign's frame on the south edge: two posts and a backing board, the name on both faces (the game's texture)
    sx = SIGN_X
    for s in (-2.05, 2.05):
        metal.box(sx + s - 0.05, sx + s + 0.05, TOPH, 4.9, ZS - 0.47, ZS - 0.37, C['frame'])
    metal.box(sx - 2.3, sx + 2.3, 4.2, 4.9, ZS - 0.45, ZS - 0.39, C['sign'])
    metal.box(sx - 2.3, sx + 2.3, 4.88, 4.92, ZS - 0.47, ZS - 0.37, C['frame'])
    metal.box(sx - 2.3, sx + 2.3, 4.18, 4.22, ZS - 0.47, ZS - 0.37, C['frame'])


# ---- the platform shed ----
def U(u):
    return SX + u


def Vz(v):
    return SZ + v


def arch_y(u):
    """The roof's top surface over the shed's cross line u."""
    return EAVE_Y + CROWN * (1 - (u / EAVE_U) ** 2)


def beam_profile(m, u, va, vb, col):
    prof = [(U(u + z), y + BEAM_TOP) for z, y in BEAM_SECTION] + [(U(u - z), y + BEAM_TOP) for z, y in reversed(BEAM_SECTION)]
    m.prism(prof, 'z', Vz(va), Vz(vb), lambda p: C['concreteTop'] if p[1] > BEAM_TOP - 0.01 else grime(C['concrete'], p, 0.08, 5))


def shed():
    con, met, rf, gl, fine = Mesh('sh_concrete'), Mesh('sh_metal'), Mesh('sh_roof'), Mesh('sh_glass', uv=True), Mesh('sh_fine')
    cc = lambda p, n: grime(C['concrete'] if n != '+y' else C['concreteTop'], p, 0.1, 7)
    # the track beam (its south end runs on into the approach, which the game strings from ap_beam) and the other
    # way's beam outside the back wall, each with its joints and a buffer at the north end, short of the cross deck
    for u in (0.0, BEAM2):
        beam_profile(con, u, CROSS, V1, None)
        for v in PORTALS + [END_V]:
            if v > CROSS:
                con.box(U(u) - 0.43, U(u) + 0.43, BEAM_TOP - 0.006, BEAM_TOP + 0.006, Vz(v) - 0.04, Vz(v) + 0.04, C['joint'])
        buffer(met, fine, u, BUFFER_V)
    # portal frames: two columns, a crosshead under the beam, short walls carrying the platforms
    for v in PORTALS:
        for s in (-1, 1):
            oct_col(con, U(s * COL_U), Vz(v), 0.26, 0.0, 0.98)
            con.box(U(s * 2.7) - 0.2, U(s * 2.7) + 0.2, 1.38, DECK - 0.45, Vz(v) - 0.3, Vz(v) + 0.3, cc)
        prof = [(-4.05, 1.38), (4.05, 1.38), (4.05, 1.08), (3.7, 0.92), (-3.7, 0.92), (-4.05, 1.08)]
        con.prism([(U(a), b) for a, b in prof][::-1], 'z', Vz(v) - 0.35, Vz(v) + 0.35, lambda p: grime(C['concrete'], p, 0.08, 11))
        con.box(U(-0.5), U(0.5), 1.38, 1.4, Vz(v) - 0.3, Vz(v) + 0.3, C['joint'])
        # the other way's beam on its own column and hammerhead
        if v > CROSS:
            pier(con, U(BEAM2), Vz(v))
    for s in (-1, 1):  # posts under the platforms' south ends (beside the east one's stair)
        for u in (1.65, 3.75):
            oct_col(con, U(s * u), Vz(END_V), 0.17, 0.0, DECK - 0.45)
    pier(con, U(0), Vz(END_V))
    pier(con, U(BEAM2), Vz(END_V))
    pier(con, U(BEAM2), Vz(CROSS + 0.4))  # under the other way's beam's north end
    # the platforms, joined at the north end by the cross deck over the beam's end
    for s in (-1, 1):
        platform(con, met, fine, s)
    cross_deck(con, met)
    # the stair down from the east platform's south end, its side walls and handrails, and the paved landing
    stairs(con, met, 1)
    # the roof's columns, the back wall on the sea side, the railing on the town side, the north gable
    for s in (-1, 1):
        for v in PORTALS + [END_V]:
            u = COL_U if v != END_V else 3.75
            col_top = arch_y(u) - 0.32
            met.cyl(U(s * u), Vz(v), 0.1, DECK, col_top, 8, C['shSteel'], r1=0.085)
            met.box(U(s * u) - 0.17, U(s * u) + 0.17, DECK, DECK + 0.03, Vz(v) - 0.17, Vz(v) + 0.17, C['shTrim'])
            # a splayed bracket up to the rib
            met.box(U(s * u) - 0.05, U(s * u) + 0.05, col_top - 0.25, col_top + 0.02, Vz(v) - 0.05, Vz(v) + 0.05, C['shSteel'])
    back_wall(met, gl, fine)
    railing(met, fine)
    gable(met, gl, fine)
    shed_roof(rf)
    furniture(met, fine)
    walkway(met, gl)
    guide_line(con)
    return [con.done(), met.done(), rf.done(), gl.done(), fine.done()]


def oct_col(m, x, z, r, y0, y1):
    pts = [(x + r * math.cos(math.pi / 8 + k * math.pi / 4), z + r * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]
    m.prism(pts, 'y', y0, y1, lambda p: grime(C['concrete'], p, 0.1, 13))


def pier(m, x, z):
    """The other way's beam's support (and the approach's): a round column and a hammerhead under the beam."""
    top = BEAM_TOP - BEAM_H
    m.cyl(x, z, 0.36, 0.0, top - 0.5, 12, lambda p: grime(C['concrete'], p, 0.1, 17), r1=0.3)
    prof = [(-0.75, top), (0.75, top), (0.75, top - 0.2), (0.38, top - 0.55), (-0.38, top - 0.55), (-0.75, top - 0.2)]
    m.prism([(x + a, b) for a, b in prof][::-1], 'z', z - 0.4, z + 0.4, lambda p: grime(C['concrete'], p, 0.08, 19))


def buffer(met, fine, u, v0):
    """A buffer stop on the beam's north end: a steel frame with a red and white face and a dark pad."""
    x = U(u)
    met.box(x - 0.45, x + 0.45, BEAM_TOP, BEAM_TOP + 0.65, Vz(v0) - 0.15, Vz(v0) + 0.25, C['shTrim'])
    met.box(x - 0.5, x + 0.5, BEAM_TOP + 0.15, BEAM_TOP + 0.55, Vz(v0) + 0.25, Vz(v0) + 0.31,
            lambda p, n: C['buffer'] if int((p[0] - x + 0.5) / 0.2) % 2 == 0 else C['line'])
    fine.box(x - 0.2, x + 0.2, BEAM_TOP + 0.25, BEAM_TOP + 0.45, Vz(v0) + 0.31, Vz(v0) + 0.45, C['bufferPad'])
    for s in (-1, 1):  # the struts back down to the beam
        met.box(x + s * 0.35 - 0.04, x + s * 0.35 + 0.04, BEAM_TOP, BEAM_TOP + 0.5, Vz(v0) - 0.6, Vz(v0) - 0.15, C['shTrim'])


def platform(con, met, fine, s):
    """One side platform, its top at DECK: slab, the edge face toward the track, the coping, the white line, the
    yellow tactile strip and the paving."""
    ua, ub = s * EDGE, s * PW
    lo, hi = min(ua, ub), max(ua, ub)
    # the stairwell (u), between the stair's side walls; only the east platform has a stair
    sw0, sw1 = sorted((s * (STAIR_U[0] - 0.12), s * (STAIR_U[1] + 0.12))) if s > 0 else (lo, lo)
    # slab body: under the paving, the full length; split round the stairwell
    for a, b in ((lo, sw0), (sw1, hi)):
        if b - a > 1e-3:
            con.box(U(a), U(b), DECK - 0.45, DECK - 0.002, Vz(V0), Vz(V1), lambda p, n: grime(C['concreteDark'] if n == '-y' else C['concrete'], p, 0.1, 21))
    if sw1 - sw0 > 1e-3:
        con.box(U(sw0), U(sw1), DECK - 0.45, DECK - 0.002, Vz(V0), Vz(STAIR[0]), lambda p, n: grime(C['concrete'], p, 0.1, 21))
    # the dark edge face toward the track and the pale coping lip over it, from the cross deck south
    e = s * EDGE
    con.box(U(e) - 0.01 * s, U(e) + 0.0, DECK - 0.45, DECK - 0.04, Vz(CROSS), Vz(V1), C['edge'])
    # the top: bands across the platform's width (coping, line, a gap, the tactile strip, then paving)
    bands = [(0.0, 0.16, 'coping'), (0.16, 0.24, 'line'), (0.24, 0.41, 'paving'), (0.41, 0.69, 'tactile'), (0.69, PW - EDGE, 'paving')]
    for a, b, kind in bands:
        u0, u1 = sorted((s * (EDGE + a), s * (EDGE + b)))
        segs = [(lo_, hi_) for lo_, hi_ in ((u0, min(u1, sw0)), (max(u0, sw1), u1), (max(u0, sw0), min(u1, sw1)))]
        for k, (x0, x1) in enumerate(segs):
            if x1 - x0 < 1e-3:
                continue
            vend = STAIR[0] if k == 2 else V1
            step = 0.3 if kind == 'tactile' else 1.2
            v = CROSS if b <= 0.41 else V0  # the edge bands stop at the cross deck, which paves the rest
            i = 0
            while v < vend - 1e-6:
                v1 = min(vend, v + step)
                if kind == 'coping':
                    col = C['coping']
                elif kind == 'line':
                    col = C['line']
                elif kind == 'tactile':
                    col = C['tactile'] if i % 2 == 0 else C['tactileDark']
                else:
                    col = mul(C['paving'] if i % 2 == 0 else C['pavingB'], 0.96 + 0.08 * _h(i, int(x0 * 10), 3))
                if kind == 'tactile':  # raised a little: its own top and sides
                    con.box(U(x0), U(x1), DECK - 0.04, DECK + 0.012, Vz(v), Vz(v1), col, skip=('-y', '-z', '+z'))
                else:  # the paving's top only, over the slab
                    con.face([(U(x0), DECK, Vz(v)), (U(x0), DECK, Vz(v1)), (U(x1), DECK, Vz(v1)), (U(x1), DECK, Vz(v))], col)
                v = v1
                i += 1
    # the coping's lip over the edge face
    con.box(U(e) - 0.03 * s, U(e) + 0.02 * s, DECK - 0.07, DECK, Vz(CROSS), Vz(V1), C['coping'])
    # the slab's north and south end faces
    con.box(U(lo), U(hi), DECK - 0.45, DECK, Vz(V0) - 0.02, Vz(V0), C['concreteDark'])


def stairs(con, met, s):
    """A flight from a platform's south end down to the walkway: a concrete waist with a straight soffit under it, pale
    stone treads with a dark anti-slip nosing and plain risers, a tactile warning row at the head and at the foot,
    and a side wall either side with a stone coping and a steel handrail on short posts."""
    u0, u1 = sorted((s * STAIR_U[0], s * STAIR_U[1]))
    va, vb = STAIR
    n = 10
    rise, run = DECK / n, (vb - va) / n
    slope = rise / run
    # the waist: a slab under the steps, its soffit parallel to the pitch, down to the ground
    toe = va + (DECK - 0.45) / slope
    waist = [(Vz(va), DECK - 0.45), (Vz(va), DECK - rise), (Vz(vb - run), 0.0), (Vz(toe), 0.0)]
    con.prism(waist[::-1], 'x', U(u0), U(u1), lambda p: grime(C['concrete'], p, 0.08, 31))
    # the steps on it: tread, riser and the nosing strip along the tread's front edge
    for i in range(n - 1):
        top = DECK - (i + 1) * rise
        v0, v1 = va + i * run, va + (i + 1) * run
        con.box(U(u0), U(u1), top - rise, top, Vz(v0), Vz(v1),
                lambda p, nn: C['tread'] if nn == '+y' else C['riser'] if nn == '+z' else C['concrete'],
                skip=('-y', '-x', '+x', '-z'))  # the sides are in the side walls, the back under the step above
        con.box(U(u0), U(u1), top, top + 0.006, Vz(v1) - 0.06, Vz(v1), C['nosing'], skip=('-y', '-x', '+x', '-z'))  # the edge you step down over
    # tactile warning rows: on the platform before the top step, and on the landing past the foot
    for v0, v1, y in ((va - 0.36, va - 0.06, DECK), (vb + 0.1, vb + 0.4, 0.014)):
        con.box(U(u0) + 0.05, U(u1) - 0.05, y, y + 0.012, Vz(v0), Vz(v1), C['tactile'], skip=('-y',))
    # side walls: a sloped upstand on either side, from the platform's level down to the landing, a stone coping on
    # its top and the handrail over it
    for w0, w1 in ((u0 - 0.12, u0), (u1, u1 + 0.12)):
        prof = [(Vz(va), DECK - 0.45), (Vz(vb), 0.0), (Vz(vb), 0.95), (Vz(va), DECK + 0.95)]
        con.prism([(z, y) for z, y in prof], 'x', U(w0), U(w1), lambda p: grime(C['concrete'], p, 0.1, 23))
        cap = [(Vz(va) - 0.03, DECK + 0.94), (Vz(vb) + 0.03, 0.94), (Vz(vb) + 0.03, 1.0), (Vz(va) - 0.03, DECK + 1.0)]
        con.prism(cap, 'x', U(w0) - 0.025, U(w1) + 0.025, C['coping'])
        hx = U((w0 + w1) / 2)
        rail = [(Vz(va), DECK + 1.12), (Vz(vb), 1.12), (Vz(vb), 1.17), (Vz(va), DECK + 1.17)]  # one straight bar
        met.prism(rail, 'x', hx - 0.03, hx + 0.03, C['shRail'])
        for k in range(1, 4):  # the rail's posts on the coping
            t = k / 4
            zz, yy = Vz(va + (vb - va) * t), DECK + 1.0 - DECK * t
            met.box(hx - 0.018, hx + 0.018, yy, yy + 0.13, zz - 0.018, zz + 0.018, C['shRail'])
    # the landing at the foot, paved like the walkway, joining it
    con.box(U(min(u0, u1) - 0.25), U(max(u0, u1) + 0.25), 0.0, 0.014, Vz(vb), WALK[0][2], C['walkStone'])


def cross_deck(con, met):
    """The north end's cross deck: a slab between the platforms over the end of the track beam, from the gable to CROSS,
    paved as they are, so people get from one platform to the other at platform level (the west platform has no stair
    of its own: one down to the walkway would pass under the beam, #403). A steel railing along its south edge, over
    the buffers."""
    w = EDGE + 0.41  # it paves the platforms' edge bands too, which stop at CROSS
    con.box(U(-EDGE), U(EDGE), DECK - 0.45, DECK - 0.002, Vz(V0), Vz(CROSS), lambda p, n: grime(C['concreteDark'] if n == '-y' else C['concrete'], p, 0.1, 21))
    v, i = V0, 0
    while v < CROSS - 1e-6:
        v1 = min(CROSS, v + 1.2)
        for k, (a, b) in enumerate(((-w, -0.6), (-0.6, 0.6), (0.6, w))):
            col = mul(C['paving'] if (i + k) % 2 == 0 else C['pavingB'], 0.96 + 0.08 * _h(i, k, 5))
            con.face([(U(a), DECK, Vz(v)), (U(a), DECK, Vz(v1)), (U(b), DECK, Vz(v1)), (U(b), DECK, Vz(v))], col)
        v, i = v1, i + 1
    # its south face and a pale coping along the edge, then the railing on it
    z = Vz(CROSS)
    con.box(U(-EDGE), U(EDGE), DECK - 0.45, DECK - 0.04, z, z + 0.01, C['edge'])
    con.box(U(-EDGE) - 0.02, U(EDGE) + 0.02, DECK - 0.07, DECK, z - 0.03, z + 0.02, C['coping'])
    met.box(U(-EDGE), U(EDGE), DECK + 1.02, DECK + 1.08, z - 0.08, z - 0.02, C['shRail'])
    met.box(U(-EDGE), U(EDGE), DECK + 0.5, DECK + 0.53, z - 0.07, z - 0.03, C['shRail'])
    met.box(U(-EDGE), U(EDGE), DECK, DECK + 0.12, z - 0.07, z - 0.03, C['shRail'])
    for k in range(4):
        x = U(-EDGE + 0.05 + (2 * EDGE - 0.1) * k / 3)
        met.box(x - 0.03, x + 0.03, DECK, DECK + 1.05, z - 0.08, z - 0.02, C['shRail'])


def back_wall(met, gl, fine):
    """On the sea side, behind the west platform: a panelled dado and a band of glazing up to the roof."""
    u = -PW
    top = arch_y(PW) - 0.12
    v = V0
    i = 0
    while v < V1 - 1e-6:
        v1 = min(V1, v + 1.2)
        met.box(U(u) - 0.08, U(u), DECK, 3.3, Vz(v), Vz(v1), lambda p, n, i=i: mul(C['panel'], 0.97 if i % 2 else 1.03))
        met.box(U(u) - 0.1, U(u) + 0.02, 3.3, 3.36, Vz(v), Vz(v1), C['shTrim'])
        gl.quad_x(U(u) - 0.05, Vz(v) + 0.03, Vz(v1) - 0.03, 3.36, top, -1, C['glass'], uv=True)
        gl.quad_x(U(u) - 0.03, Vz(v) + 0.03, Vz(v1) - 0.03, 3.36, top, 1, mul(C['glass'], 0.8), uv=True)
        met.box(U(u) - 0.09, U(u) + 0.01, 3.36, top, Vz(v1) - 0.03, Vz(v1) + 0.03, C['shTrim'])
        fine.box(U(u) - 0.09, U(u) + 0.01, 4.1, 4.14, Vz(v), Vz(v1), C['shTrim'])
        v = v1
        i += 1
    met.box(U(u) - 0.1, U(u) + 0.02, top, top + 0.08, Vz(V0), Vz(V1), C['shTrim'])
    # the slab's outer face below, a dark drip line
    met.box(U(u) - 0.1, U(u) - 0.08, DECK - 0.45, DECK, Vz(V0), Vz(V1), C['panel'])


def railing(met, fine):
    """On the town side, along the east platform's outer edge: posts, a top rail, two mid rails and a kick plate."""
    x = U(PW)
    v = V0
    while v <= V1 + 1e-6:
        met.box(x - 0.08, x - 0.02, DECK, DECK + 1.05, Vz(v) - 0.03, Vz(v) + 0.03, C['shRail'])
        v += 1.2
    met.box(x - 0.1, x, DECK + 1.02, DECK + 1.08, Vz(V0), Vz(V1), C['shRail'])
    for y in (DECK + 0.4, DECK + 0.72):
        fine.box(x - 0.07, x - 0.03, y, y + 0.03, Vz(V0), Vz(V1), C['shRail'])
    met.box(x - 0.07, x - 0.02, DECK, DECK + 0.12, Vz(V0), Vz(V1), C['shRail'])
    met.box(x - 0.02, x + 0.0, DECK - 0.45, DECK, Vz(V0), Vz(V1), C['panel'])
    # across the platforms' south ends: the west one's whole width, the east one's either side of the stairwell
    for s in (-1, 1):
        for a, b in ((EDGE + 0.3, STAIR_U[0] - 0.12), (STAIR_U[1] + 0.12, PW)) if s > 0 else ((EDGE + 0.3, PW),):
            u0, u1 = sorted((s * a, s * b))
            met.box(U(u0), U(u1), DECK + 1.02, DECK + 1.08, Vz(V1) - 0.06, Vz(V1), C['shRail'])
            met.box(U(u0), U(u1), DECK + 0.5, DECK + 0.53, Vz(V1) - 0.05, Vz(V1) - 0.01, C['shRail'])
            for uu in (u0, u1):
                met.box(U(uu) - 0.03, U(uu) + 0.03, DECK, DECK + 1.05, Vz(V1) - 0.06, Vz(V1), C['shRail'])


def gable(met, gl, fine):
    """The north end: a dado of pale panels across the platforms and the track, one panel to each bay of the glazing
    above it, steel cover strips carrying the mullions down to the foot, glazing up under the roof's arch, and the
    platform clock hung from the first rib over the track, a face to each side."""
    z = Vz(V0)
    us = [-PW + 0.8 * k for k in range(11)]  # -4 .. 4
    foot = DECK - 0.45 - 0.6
    for k, (a, b) in enumerate(zip(us, us[1:])):
        met.box(U(a), U(b), foot + 0.1, 3.1, z - 0.1, z, C['panel'] if k % 2 == 0 else C['panelB'], skip=('-x', '+x', '-y', '+y'))
    met.box(U(-PW), U(PW), foot, foot + 0.1, z - 0.13, z + 0.03, C['shTrim'])  # the foot rail
    met.box(U(-PW), U(PW), 3.1, 3.16, z - 0.13, z + 0.03, C['shTrim'])  # the sill under the glazing
    for a, b in zip(us, us[1:]):
        top = arch_y(max(abs(a), abs(b))) - 0.14
        gl.quad_z(z - 0.06, U(a) + 0.03, U(b) - 0.03, 3.16, top, -1, C['glass'], uv=True)
        gl.quad_z(z - 0.04, U(a) + 0.03, U(b) - 0.03, 3.16, top, 1, mul(C['glass'], 0.8), uv=True)
        fine.box(U(a), U(b), 4.05, 4.09, z - 0.11, z + 0.01, C['shSteel'])
    for a in us:  # the mullions, proud of the glass on both faces, run down the dado as cover strips
        top = arch_y(abs(a)) - 0.1
        met.box(U(a) - 0.035, U(a) + 0.035, foot, top, z - 0.14, z + 0.04, C['shSteel'])
    clock(met, U(0), Vz(PORTALS[0]), 4.55)


def clock(met, x, z, y, r=0.3):
    """A round platform clock, a face to the north and one to the south, hung on two rods from the rib above, its
    hands at ten past ten."""
    n = 16
    met.hcyl_z(x, y, r, z - 0.07, z + 0.07, n, C['shTrim'])  # the case's rim
    for zz, d in ((z - 0.07, -1), (z + 0.07, 1)):
        ring = [(x + r * math.cos(2 * math.pi * k / n), y + r * math.sin(2 * math.pi * k / n), zz) for k in range(n)]
        face = [(px, py, zz + 0.002 * d) for px, py, _ in ring]
        inner = [(x + (px - x) * 0.86, y + (py - y) * 0.86, zz + 0.003 * d) for px, py, _ in ring]
        met.face(ring[::-1] if d < 0 else ring, C['shTrim'])
        met.face(inner[::-1] if d < 0 else inner, C['clockFace'])
        # twelve marks, and the hands: the hour hand toward ten, the minute hand toward two
        for k in range(12):
            a = 2 * math.pi * k / 12
            c, s_ = math.cos(a), math.sin(a)
            l0, l1, w = (0.66, 0.8, 0.022) if k % 3 else (0.6, 0.8, 0.03)
            pts = [(x + r * (c * l0 - s_ * w), y + r * (s_ * l0 + c * w)), (x + r * (c * l1 - s_ * w), y + r * (s_ * l1 + c * w)),
                   (x + r * (c * l1 + s_ * w), y + r * (s_ * l1 - c * w)), (x + r * (c * l0 + s_ * w), y + r * (s_ * l0 - c * w))]
            q = [(px, py, zz + 0.005 * d) for px, py in pts]
            met.face(q if d < 0 else q[::-1], C['clockHand'])
        # seen from the north, east is on the viewer's left, so the angles mirror
        for ang, ln, w in ((math.radians(30 if d < 0 else 150), 0.5, 0.035),
                           (math.radians(150 if d < 0 else 30), 0.74, 0.024)):
            c, s_ = math.cos(ang), math.sin(ang)
            pts = [(x - r * 0.1 * c - r * w * s_, y - r * 0.1 * s_ + r * w * c), (x + r * ln * c - r * w * s_, y + r * ln * s_ + r * w * c),
                   (x + r * ln * c + r * w * s_, y + r * ln * s_ - r * w * c), (x - r * 0.1 * c + r * w * s_, y - r * 0.1 * s_ - r * w * c)]
            q = [(px, py, zz + 0.007 * d) for px, py in pts]
            met.face(q if d < 0 else q[::-1], C['clockHand'])
    top = arch_y(0) - 0.1 - 0.2
    for dx in (-0.12, 0.12):
        met.box(x + dx - 0.015, x + dx + 0.015, y + r - 0.02, top, z - 0.015, z + 0.015, C['shTrim'])


def shed_roof(rf):
    """The curved roof: the skin (blue-grey standing seam on top, pale soffit underneath), ribs on every column line,
    purlins, gutters along both eaves and a fascia across both ends."""
    N = 16
    us = [-EAVE_U + 2 * EAVE_U * k / N for k in range(N + 1)]
    za, zb = Vz(ROOF_V[0]), Vz(ROOF_V[1])
    th = 0.1
    for k in range(N):
        a, b = us[k], us[k + 1]
        ya, yb = arch_y(a), arch_y(b)
        rf.face([(U(a), ya, zb), (U(b), yb, zb), (U(b), yb, za), (U(a), ya, za)], C['roofTop'])
        rf.face([(U(a), ya - th, za), (U(b), yb - th, za), (U(b), yb - th, zb), (U(a), ya - th, zb)], C['roofUnder'])
        for z, sgn in ((za, -1), (zb, 1)):  # the ends of the skin
            q = [(U(a), ya - th, z), (U(a), ya, z), (U(b), yb, z), (U(b), yb - th, z)]
            rf.face(q if sgn < 0 else q[::-1], C['shTrim'])
        # standing seams on the top at every other line
        if k % 2 == 1:
            rf.box(U(b) - 0.02, U(b) + 0.02, yb - 0.01, yb + 0.05, za, zb, C['roofSeam'])
    # end fascias: an arched band below the skin's ends
    for z, d in ((za, 1), (zb, -1)):
        for k in range(N):
            a, b = us[k], us[k + 1]
            ya, yb = arch_y(a) - th, arch_y(b) - th
            q = [(U(a), ya - 0.3, z), (U(b), yb - 0.3, z), (U(b), yb, z), (U(a), ya, z)]
            rf.face(q if d < 0 else q[::-1], C['shTrim'])
            q2 = [(U(a), ya - 0.3, z + 0.12 * d), (U(a), ya, z + 0.12 * d), (U(b), yb, z + 0.12 * d), (U(b), yb - 0.3, z + 0.12 * d)]
            rf.face(q2 if d < 0 else q2[::-1], C['shSteel'])
            rf.face([(U(a), ya - 0.3, z), (U(a), ya - 0.3, z + 0.12 * d), (U(b), yb - 0.3, z + 0.12 * d), (U(b), yb - 0.3, z)][::(-1 if d > 0 else 1)], C['shSteel'])
    # ribs over every column line: a curved steel section under the skin
    for v in PORTALS + [END_V]:
        z = Vz(v)
        for k in range(N):
            a, b = us[k], us[k + 1]
            ya, yb = arch_y(a) - th, arch_y(b) - th
            for zz, sgn in ((z - 0.05, -1), (z + 0.05, 1)):
                q = [(U(a), ya - 0.2, zz), (U(b), yb - 0.2, zz), (U(b), yb, zz), (U(a), ya, zz)]
                rf.face(q[::-1] if sgn < 0 else q, C['shSteel'])
            rf.face([(U(a), ya - 0.2, z - 0.05), (U(a), ya - 0.2, z + 0.05), (U(b), yb - 0.2, z + 0.05), (U(b), yb - 0.2, z - 0.05)][::-1], C['shSteel'])
    # purlins along the roof
    for u in (-3.2, -1.7, 0.0, 1.7, 3.2):
        y = arch_y(u) - th
        rf.box(U(u) - 0.05, U(u) + 0.05, y - 0.13, y, za + 0.15, zb - 0.15, C['shSteel'])
    # the gutters along both eaves, with a downpipe at every other column
    for s in (-1, 1):
        x = U(s * EAVE_U)
        y = arch_y(EAVE_U)
        rf.box(x - 0.09, x + 0.09, y - 0.22, y - 0.04, za, zb, C['shTrim'])
        for v in PORTALS[::2]:
            rf.cyl(x, Vz(v) + 0.25, 0.04, 0.0, y - 0.2, 6, C['shTrim'])


def furniture(met, fine):
    """On the platforms: benches facing the track, bins, light fittings under the roof, and the frames of the name
    boards (the game puts the name on them)."""
    for s in (-1, 1):
        for v in (-11.4, -2.0, 7.4):
            bench(fine, s * 3.25, v, s)
        for v in (-6.6, 12.6):
            for k, c in ((-0.14, C['bin']), (0.14, mix(C['bin'], (0.4, 0.6, 0.35), 0.8))):
                fine.box(U(s * 3.4) - 0.12, U(s * 3.4) + 0.12, DECK, DECK + 0.5, Vz(v + k) - 0.12, Vz(v + k) + 0.12, c)
        # light fittings: long boxes under the roof over each platform
        for v in PORTALS[:-1]:
            y = arch_y(2.6) - 0.1 - 0.35
            fine.box(U(s * 2.6) - 0.08, U(s * 2.6) + 0.08, y, y + 0.08, Vz(v + 1.2), Vz(v + 3.6), C['shTrim'])
            fine.box(U(s * 2.6) - 0.06, U(s * 2.6) + 0.06, y - 0.01, y, Vz(v + 1.25), Vz(v + 3.55), C['lamp'])
            for vv in (v + 1.4, v + 3.4):
                fine.box(U(s * 2.6) - 0.01, U(s * 2.6) + 0.01, y + 0.08, arch_y(2.6) - 0.1, Vz(vv) - 0.01, Vz(vv) + 0.01, C['shTrim'])
        # the name board's frame: two posts and a board facing the track (the name is the game's texture)
        x = U(s * 3.0)
        for dv in (-1.1, 1.1):
            met.box(x - 0.04, x + 0.04, DECK, DECK + 1.75, Vz(2.0 + dv) - 0.04, Vz(2.0 + dv) + 0.04, C['shSteel'])
        met.box(x - 0.03, x + 0.03, DECK + 1.25, DECK + 1.57, Vz(2.0) - 1.12, Vz(2.0) + 1.12, C['sign'])


def bench(fine, u, v, s):
    """A platform bench along the shed, its back to the outer wall, facing the track."""
    x = U(u)
    for dv in (-0.45, 0.45):
        fine.box(x - 0.18, x + 0.18, DECK, DECK + 0.32, Vz(v + dv) - 0.025, Vz(v + dv) + 0.025, C['shRail'])
    fine.box(x - 0.2, x + 0.2, DECK + 0.32, DECK + 0.37, Vz(v) - 0.55, Vz(v) + 0.55, C['wood'])
    bx = x + s * 0.2
    fine.box(bx - 0.03, bx + 0.03, DECK + 0.4, DECK + 0.72, Vz(v) - 0.55, Vz(v) + 0.55, C['wood'])
    for dv in (-0.45, 0.45):
        fine.box(bx - 0.02, bx + 0.02, DECK + 0.3, DECK + 0.72, Vz(v + dv) - 0.02, Vz(v + dv) + 0.02, C['shRail'])


def walkway(met, gl):
    """The covered walkway's posts, wind screen and roofs (wk_roof): east of the beam along the shed's south end, a
    roof over the stair's foot, and north to the station's glass front, where its canopy takes over."""
    rf = Mesh('wk_roof')
    y0, y1 = WROOF_Y
    ex0, ex1, ez0, ez1 = WALK[0]
    nx0, nx1, nz0, nz1 = WALK[1]
    pieces = [
        (ex0 - 0.15, ex1 + 0.2, ez0 - 0.2, ez1 + 0.2),  # the east run, from its glazed west end east of the beam
        (nx0 - 0.2, nx1 + 0.2, ZS + 1.7, ez0 - 0.2),  # the north leg, up to the station's south canopy
        (U(STAIR_U[0] - 0.4), U(STAIR_U[1] + 0.4), Vz(STAIR[1]) - 0.5, ez0 - 0.2),  # over the stair's foot
    ]
    for a, b, c, d in pieces:
        rf.box(a, b, y0, y1, c, d, lambda p, n: C['roofTop'] if n == '+y' else C['roofUnder'] if n == '-y' else C['shTrim'])
        # a fascia round the edges
        for (p0, p1, q0, q1) in ((a, b, c, c + 0.04), (a, b, d - 0.04, d), (a, a + 0.04, c, d), (b - 0.04, b, c, d)):
            rf.box(p0, p1, y0 - 0.1, y1 + 0.02, q0, q1, C['shTrim'])
        # down-lights along the middle of the soffit, every 2.5 or so, lengthwise along the run: a lit face in a trim
        lit = lambda p, n: C['lamp'] if n == '-y' else C['shTrim']
        along_x = b - a > d - c
        L = (b - a) if along_x else (d - c)
        k = max(1, round(L / 2.5))
        for i in range(k):
            t = (i + 0.5) / k
            if along_x:
                x, zc = a + (b - a) * t, (c + d) / 2
                rf.box(x - 0.3, x + 0.3, y0 - 0.03, y0, zc - 0.07, zc + 0.07, lit, skip=('+y',))
            else:
                xc, z = (a + b) / 2, c + (d - c) * t
                rf.box(xc - 0.07, xc + 0.07, y0 - 0.03, y0, z - 0.3, z + 0.3, lit, skip=('+y',))
    # posts: along both sides of each run, every 2.5
    def posts(xa, xb, z, step=2.5):
        n = max(1, round((xb - xa) / step))
        for k in range(n + 1):
            x = xa + (xb - xa) * k / n
            met.cyl(x, z, 0.05, 0.0, y0 - 0.1, 6, C['shSteel'])
            met.box(x - 0.08, x + 0.08, 0.0, 0.02, z - 0.08, z + 0.08, C['shTrim'], skip=('-y',))
    posts(U(STAIR_U[1] + 0.5), nx0 - 0.3, ez0 - 0.05)
    met.cyl(ex1 + 0.05, ez0 - 0.05, 0.05, 0.0, y0 - 0.1, 6, C['shSteel'])
    posts(ex0 - 0.05, ex1 - 0.05, ez1 + 0.05)
    for x in (nx0 - 0.05, nx1 + 0.05):
        n = max(1, round((ez0 - 0.3 - (ZS + 1.9)) / 2.5))
        for k in range(n + 1):
            z = ZS + 1.9 + (ez0 - 0.3 - ZS - 1.9) * k / n
            met.cyl(x, z, 0.05, 0.0, y0 - 0.1, 6, C['shSteel'])
    for x, z in ((ex0 - 0.05, ez0 - 0.05), (U(STAIR_U[1] + 0.3), Vz(STAIR[1]) - 0.3)):
        met.cyl(x, z, 0.05, 0.0, y0 - 0.1, 6, C['shSteel'])
    # the wind screen along the east run's south side and across its west end, the beam a step beyond it: glass in a
    # frame, below a rail
    xa = ex0 - 0.05
    for z0, z1 in ((ez0 - 0.05, (ez0 + ez1) / 2), ((ez0 + ez1) / 2, ez1 + 0.05)):
        gl.quad_x(xa, z0 + 0.04, z1 - 0.04, 0.12, 1.0, -1, C['glass'], uv=True)
        gl.quad_x(xa + 0.01, z0 + 0.04, z1 - 0.04, 0.12, 1.0, 1, mul(C['glass'], 0.85), uv=True)
        met.box(xa - 0.03, xa + 0.03, 1.0, 1.04, z0, z1, C['shTrim'])
        met.box(xa - 0.03, xa + 0.03, 0.08, 0.12, z0, z1, C['shTrim'])
        met.box(xa - 0.02, xa + 0.02, 0.08, 1.04, z1 - 0.02, z1 + 0.02, C['shTrim'])
    za = ez1 + 0.05
    x = xa
    while x < ex1 - 0.6:
        xb = min(ex1 - 0.05, x + 1.25)
        gl.quad_z(za, x + 0.04, xb - 0.04, 0.12, 1.0, 1, C['glass'], uv=True)
        gl.quad_z(za - 0.01, x + 0.04, xb - 0.04, 0.12, 1.0, -1, mul(C['glass'], 0.85), uv=True)
        met.box(x, xb, 1.0, 1.04, za - 0.03, za + 0.03, C['shTrim'])
        met.box(x, xb, 0.08, 0.12, za - 0.03, za + 0.03, C['shTrim'])
        x = xb
    return rf.done()


def guide_line(con):
    """The yellow tactile guide path (ribbed blocks 0.3 wide, as the security room's own line inside) from the warning
    row at the east stair's foot (the arrival platform's) along the middle of the walkway to the station's glass doors."""
    ex0, ex1, ez0, ez1 = WALK[0]
    nx0, nx1, nz0, nz1 = WALK[1]
    zc, xc = (ez0 + ez1) / 2, (nx0 + nx1) / 2
    y, w = 0.0, 0.15
    runs = [
        (U(2.7) - w, U(2.7) + w, Vz(STAIR[1]) + 0.4, zc - w),  # from the east stair's foot down to the line
        (U(2.7) - w, xc + w, zc - w, zc + w),  # along the walkway
        (xc - w, xc + w, ZS + 0.25, zc - w),  # north to the doors
    ]
    for x0, x1, z0, z1 in runs:
        con.box(x0, x1, y, y + 0.016, z0, z1, C['tactileDark'], skip=('-y',))
        # the raised bars along the direction of travel
        along_x = x1 - x0 > z1 - z0
        for k in range(4):
            t = (k + 0.5) / 4
            if along_x:
                zz = z0 + (z1 - z0) * t
                con.box(x0 + 0.02, x1 - 0.02, y + 0.016, y + 0.024, zz - 0.016, zz + 0.016, C['tactile'], skip=('-y',))
            else:
                xx = x0 + (x1 - x0) * t
                con.box(xx - 0.016, xx + 0.016, y + 0.016, y + 0.024, z0 + 0.02, z1 - 0.02, C['tactile'], skip=('-y',))


# ---- the approach pieces ----
def approach_pieces():
    b = Mesh('ap_beam')
    prof = [(z, y) for z, y in BEAM_SECTION] + [(-z, y) for z, y in reversed(BEAM_SECTION)]
    b.prism(prof[::-1], 'z', 0.0, 1.0, lambda p: C['concreteTop'] if p[1] > -0.01 else grime(C['concrete'], p, 0.06, 27))
    h = Mesh('ap_head')
    prof = [(-0.75, 0.0), (0.75, 0.0), (0.75, -0.2), (0.38, -0.55), (-0.38, -0.55), (-0.75, -0.2)]
    h.prism(prof[::-1], 'z', -0.4, 0.4, lambda p: grime(C['concrete'], p, 0.08, 29))
    for s in (-0.25, 0.25):
        h.box(s - 0.15, s + 0.15, 0.0, 0.03, -0.18, 0.18, C['bufferPad'])
    c = Mesh('ap_col')
    c.cyl(0, 0, 0.36, 0.0, 1.0, 12, C['concrete'], r1=0.3, caps=(True, True))
    return [b.done(), h.done(), c.done()]


# ---- material and export (as tools/train/monorail.py) ----
def material():
    m = bpy.data.materials.new('station')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    nodes = station() + shed() + approach_pieces()
    nodes.append(bpy.data.objects['wk_roof'])
    m = material()
    for ob in nodes:
        ob.data.materials.clear()
        ob.data.materials.append(m)
        ca = ob.data.color_attributes.get('Col')
        if ca:
            ob.data.color_attributes.active_color = ca
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=False, export_apply=True,
                              export_vertex_color='MATERIAL', export_normals=False, export_texcoords=True,
                              export_materials='EXPORT', use_selection=False)
    byte_colours(OUT)
    if len(argv) > 1:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(argv[1]))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


def byte_colours(path):
    """Every float COLOR_0 as normalised unsigned bytes (tools/train/monorail.py does the same): a third of the size."""
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


main()
