"""The outdoor planting and park bench, modelled in Blender (issue #362, Jørgen 2026-10-09: "the bush is getting some
ugly patterning, doesnt look natural, the tree trunk is basic and ugly still ... the bench is very basic too").

  python3 tools/gpu_priority.py run planting --rank render -- blender -b --factory-startup -P tools/grounds/planting.py -- game3d/assets/outdoor/planting.glb [where to save the .blend]

Units are metres in the game's own frame (+y up), exported with export_yup off so the game reads the coordinates as
written. Every node is one mesh at size 1 (the game scales it), flat-shaded, with one colour per face corner. The
colours are shading multipliers, not colours: 0.5 is "as given", so the game keeps choosing the greens, the bark and the
timber per place and per mode (game3d/js/scenes/outdoor/plant-models.js multiplies them by 2).

  trunk_<species>[_b]   a tree's trunk and limbs from the ground up, at s = 1: root flare, taper, smooth branch
                        junctions (a skin over a branching skeleton) and bark furrows along its length. Its glTF extras
                        hold `tips`, [x, y, z, k] where the crown masses sit (k: their relative size), so the crowns
                        always grow from the ends of the limbs. Species as in outdoor/planting.js: keyaki, sakura, pine,
                        ginkgo, maple.
  bush_a, bush_b, bush_c
                        a shrub or a crown mass: overlapping clumps of leaves joined into one soft lumpy surface,
                        about a unit sphere, lighter where the sun reaches and darker underneath and between clumps.
  hedge_a, hedge_b, hedge_c
                        one plant of a clipped hedge, 1.0 long (x), 0.6 high and 0.5 deep, standing on y = 0: a box
                        that has grown out in irregular clumps, so a run of them (overlapping a little) reads as one
                        hedge with no repeating pattern.
  bench_end, bench_end_low
                        a park bench's cast-iron end frame (legs with feet, the seat bearer, the curved back standard
                        and the armrest with its scroll; _low: a backless frame), 0.05 thick about x = 0, the sitter
                        looking along +z, with the bolt heads that hold the slats.
  bench_seat, bench_seat_low
                        the timber: shaped seat slats (and back slats) 1.0 long about x = 0, with darker end grain.
                        The game stretches them to the bench's length and stands the frames 0.12 in from each end.
                        Seat top 0.34, as the old bench (crowd/still.js sits people at that height).
  <trunk>_lo, hedge_<x>_lo
                        the phone's lighter copies, about half the triangles (outdoor/plant-models.js picks them when
                        perf/phone.js says the phone's lighter build is on).
"""
import bpy, bmesh, math, os, random, sys, json
from mathutils import Matrix, Vector, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else 'game3d/assets/outdoor/planting.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
SCN = bpy.context.scene
random.seed(362)


# ---------------------------------------------------------------- helpers
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


def decimate(ob, faces):
    """Triangulate (what the game draws), then collapse to about `faces` triangles."""
    ob.modifiers.new('tri', 'TRIANGULATE')
    apply_mods(ob)
    n = len(ob.data.polygons)
    if n > faces:
        m = ob.modifiers.new('dec', 'DECIMATE')
        m.ratio = faces / n
        m.use_collapse_triangulate = True
        apply_mods(ob)


def paint(ob, shade, corners=False):
    """Colour: shade(position, normal, index) -> (r, g, b) multiplier (1 = as given), stored halved so 0.5 is neutral
    and the range covers up to twice as bright. Per vertex (shared vertices keep the file small; the game splits the
    faces and shades them flat), or per face corner where a face needs its own colour (the bench's end grain)."""
    me = ob.data
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER' if corners else 'POINT')
    half = lambda c: (max(0, min(1, c[0] / 2)), max(0, min(1, c[1] / 2)), max(0, min(1, c[2] / 2)), 1.0)
    if corners:
        for poly in me.polygons:
            c = half(shade(Vector(poly.center), Vector(poly.normal), poly.index))
            for li in poly.loop_indices:
                ca.data[li].color = c
    else:
        for v in me.vertices:
            ca.data[v.index].color = half(shade(Vector(v.co), Vector(v.normal), v.index))
    me.color_attributes.active_color = ca


def fbm(p, octaves=3):
    v, a, f = 0.0, 0.5, 1.0
    for _ in range(octaves):
        v += a * noise.noise(p * f)
        a *= 0.5
        f *= 2.03
    return v


LIGHT = []  # the phone's lighter copies (<name>_lo), exported with the rest


def lighter(ob, faces):
    """A lighter copy of a finished node for phones, collapsed to `faces` (its colours and extras come along)."""
    lo = ob.copy()
    lo.data = ob.data.copy()
    lo.name = ob.name + '_lo'
    SCN.collection.objects.link(lo)
    decimate(lo, faces)
    LIGHT.append(lo)
    return lo


# ---------------------------------------------------------------- trunks
class Skeleton:
    """A branching skeleton: points with a radius, joined by edges; skinned into one closed surface."""

    def __init__(self):
        self.pts, self.rad, self.edges, self.tips = [], [], [], []

    def add(self, p, r, parent=None):
        self.pts.append(Vector(p))
        self.rad.append(r)
        i = len(self.pts) - 1
        if parent is not None:
            self.edges.append((parent, i))
        return i

    def limb(self, parent, pts, r0, r1, tip=None):
        """A chain from `parent` through pts, its radius tapering from r0 to r1; tip: a crown at its end (k)."""
        i, n = parent, len(pts)
        for j, p in enumerate(pts):
            i = self.add(p, r0 + (r1 - r0) * (j + 1) / n, i)
        if tip is not None:
            self.tips.append([*self.pts[i], tip])
        return i


def bend(a, b, n, sway=0.0, seed=0):
    """n points from a (excluded) to b (included), bowed a little sideways so no limb is a straight stick."""
    a, b = Vector(a), Vector(b)
    side = (b - a).cross(Vector((0, 1, 0)))
    if side.length < 1e-6:
        side = Vector((1, 0, 0))
    side.normalize()
    out = []
    for k in range(1, n + 1):
        t = k / n
        p = a.lerp(b, t) + side * math.sin(t * math.pi) * sway + Vector((0, math.sin(t * math.pi) * abs(sway) * 0.4, 0))
        p += Vector((noise.noise(Vector((seed, t * 3, 0.5))), 0, noise.noise(Vector((t * 3, seed, 1.5))))) * 0.012
        out.append(tuple(p))
    return out


def roots(sk, base, n, reach, r, seed):
    """Buttress roots: short tapering spurs from the foot of the trunk, out and down into the ground."""
    for k in range(n):
        a = seed * 1.7 + k * (2 * math.pi / n) + (random.random() - 0.5) * 0.5
        d = reach * (0.8 + random.random() * 0.4)
        mid = (math.cos(a) * d * 0.45, 0.06, math.sin(a) * d * 0.45)
        end = (math.cos(a) * d, -0.03, math.sin(a) * d)
        sk.limb(base, [mid, end], r * 0.7, r * 0.18)


def skin(name, sk, faces):
    bm = bmesh.new()
    for p in sk.pts:
        bm.verts.new(p)
    bm.verts.ensure_lookup_table()
    for a, b in sk.edges:
        bm.edges.new((bm.verts[a], bm.verts[b]))
    ob = obj_from_bm(name, bm)
    m = ob.modifiers.new('skin', 'SKIN')
    m.use_smooth_shade = False
    m.branch_smoothing = 0.6
    for i, v in enumerate(ob.data.skin_vertices[0].data):
        v.radius = (sk.rad[i], sk.rad[i])
        v.use_root = i == 0
    s = ob.modifiers.new('sub', 'SUBSURF')
    s.levels = 2
    apply_mods(ob)
    # bark: furrows running along the trunk (noise stretched along y), deeper low down where the bark is old
    me = ob.data
    me.calc_loop_triangles()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    for v in bm.verts:
        p = v.co
        fur = noise.noise(Vector((p.x * 26, p.y * 2.2, p.z * 26))) + 0.5 * noise.noise(Vector((p.x * 55, p.y * 5, p.z * 55)))
        depth = 0.011 * max(0.25, 1.0 - p.y * 0.45)
        v.co = p + v.normal * fur * depth
    bm.to_mesh(me)
    bm.free()
    decimate(ob, faces)
    top = max(p.y for p in sk.pts)

    def shade(c, n, i):
        fur = noise.noise(Vector((c.x * 26, c.y * 2.2, c.z * 26)))
        k = 0.92 + fur * 0.22 + (fbm(c * 4) * 0.12)
        k *= 0.78 + 0.22 * min(1, c.y / 0.5 + 0.2)  # darker at the foot
        k *= 1.0 + 0.1 * max(0, n.y)  # tops of limbs catch the light
        moss = max(0, 0.35 - c.y) / 0.35 * max(0, -n.x * 0.6 - n.z * 0.4 + 0.3)  # green on the shaded north-west foot
        k *= 1.0 - 0.05 * (c.y / top)
        return (k * (1 - 0.18 * moss), k * (1 + 0.06 * moss), k * (1 - 0.2 * moss))

    paint(ob, shade)
    ob['tips'] = json.dumps([[round(x, 3) for x in t] for t in sk.tips])
    lighter(ob, faces * 45 // 100)
    return ob


def keyaki(name, seed, n_limbs, lean):
    """Zelkova: a clear trunk that opens into a vase of limbs, each forking once near its end."""
    random.seed(seed)
    sk = Skeleton()
    base = sk.add((0, 0.0, 0), 0.13)
    roots(sk, base, 5, 0.34, 0.1, seed)
    i = sk.limb(base, [(0, 0.35, 0), (lean * 0.4, 0.75, 0.01)], 0.105, 0.088)
    fork = sk.limb(i, [(lean, 1.12, 0.0)], 0.08, 0.08)
    for k in range(n_limbs):
        a = seed + k * (2 * math.pi / n_limbs) + (random.random() - 0.5) * 0.5
        reach = 0.5 + random.random() * 0.12
        mid = (lean + math.cos(a) * reach * 0.45, 1.47 + random.random() * 0.08, math.sin(a) * reach * 0.45)
        j = sk.limb(fork, bend((lean, 1.12, 0), mid, 2, 0.03, seed + k), 0.056, 0.042)
        end = (lean + math.cos(a) * reach, 1.86 + random.random() * 0.12, math.sin(a) * reach)
        sk.limb(j, bend(mid, end, 2, 0.02, seed + k + 9), 0.036, 0.016, tip=1.0)
        b = a + (0.55 if k % 2 else -0.55)
        twig = (lean + math.cos(b) * reach * 0.75, 1.72, math.sin(b) * reach * 0.75)
        sk.limb(j, [twig], 0.022, 0.01)  # inside the limb's crown
    sk.limb(fork, bend((lean, 1.12, 0), (lean * 1.5, 2.1, 0.02), 3, 0.02, seed), 0.05, 0.016, tip=1.05)
    return skin(name, sk, 230)


def sakura(name, seed, lean):
    """Cherry: a short trunk leaning one way and wide, low, spreading limbs."""
    random.seed(seed)
    sk = Skeleton()
    base = sk.add((0, 0, 0), 0.13)
    roots(sk, base, 4, 0.3, 0.1, seed)
    top = (lean, 0.8, 0.02)
    i = sk.limb(base, bend((0, 0, 0), top, 3, 0.04, seed), 0.105, 0.085)
    for k in range(5):
        a = seed * 0.7 + k * (2 * math.pi / 5) + (random.random() - 0.5) * 0.4
        d = 0.72 + random.random() * 0.18
        mid = (lean + math.cos(a) * d * 0.45, 1.05, math.sin(a) * d * 0.4)
        j = sk.limb(i, bend(top, mid, 2, 0.04, seed + k), 0.055, 0.04)
        end = (lean + math.cos(a) * d, 1.22 + random.random() * 0.1, math.sin(a) * d * 0.85)
        sk.limb(j, bend(mid, end, 2, 0.03, seed + k + 3), 0.034, 0.014, tip=1.0)
    sk.limb(i, [(lean + 0.03, 1.2, 0.0), (lean + 0.05, 1.4, 0.03)], 0.04, 0.015, tip=0.9)
    return skin(name, sk, 210)


def pine(name, seed):
    """Black pine, clipped: a trunk that bends twice, short side branches out to the cloud pads."""
    random.seed(seed)
    sk = Skeleton()
    base = sk.add((0, 0, 0), 0.12)
    roots(sk, base, 4, 0.28, 0.09, seed)
    spine = [(0.12, 0.6, 0.04), (-0.06, 1.2, -0.05), (0.05, 1.75, 0.0), (0.05, 2.0, 0.0)]
    ids, i = [], base
    for j, p in enumerate(spine):
        i = sk.limb(i, bend(sk.pts[i], p, 2, 0.02, seed + j), [0.09, 0.075, 0.055, 0.035][j], [0.08, 0.06, 0.04, 0.025][j])
        ids.append(i)
    sk.tips.append([*sk.pts[i], 0.6])
    pads = [(0.55, 0.85, 0.0, 1.0), (-0.5, 1.15, 0.15, 0.95), (0.35, 1.5, -0.2, 0.85), (-0.2, 1.85, 0.1, 0.7)]
    for j, (dx, y, dz, k) in enumerate(pads):
        src = ids[min(len(ids) - 1, int(y / 0.6))]
        sk.limb(src, bend(sk.pts[src], (dx, y, dz), 2, 0.03, seed + j), 0.034, 0.016, tip=k)
    return skin(name, sk, 190)


def ginkgo(name, seed):
    """Ginkgo: a straight trunk with short limbs rising off it all the way up, for a tall narrow crown."""
    random.seed(seed)
    sk = Skeleton()
    base = sk.add((0, 0, 0), 0.11)
    roots(sk, base, 4, 0.26, 0.085, seed)
    i, prev = base, (0, 0, 0)
    for j, (y, r0, r1) in enumerate([(0.7, 0.085, 0.075), (1.3, 0.07, 0.06), (1.85, 0.055, 0.04), (2.3, 0.035, 0.015)]):
        p = (0.01 * math.sin(j * 2), y, 0.01 * math.cos(j * 2))
        i = sk.limb(i, [p], r0, r1)
        if j < 3:
            for k in range(2):
                a = seed + j * 2.1 + k * math.pi
                sk.limb(i, [(math.cos(a) * 0.22, y + 0.25, math.sin(a) * 0.22)], 0.025, 0.01)
        prev = p
    for y, k in ((0.95, 1.0), (1.45, 0.9), (1.9, 0.7), (2.25, 0.45)):
        sk.tips.append([0.0, y, 0.0, k])
    return skin(name, sk, 170)


def maple(name, seed):
    """Japanese maple: three thin stems from one foot, spreading and forking into a small crown."""
    random.seed(seed)
    sk = Skeleton()
    base = sk.add((0, 0, 0), 0.075)
    roots(sk, base, 3, 0.2, 0.06, seed)
    for k in range(3):
        a = seed + k * (2 * math.pi / 3)
        mid = (math.cos(a) * 0.14, 0.5, math.sin(a) * 0.12)
        j = sk.limb(base, bend((0, 0, 0), mid, 2, 0.03, seed + k), 0.045, 0.035)
        end = (math.cos(a) * 0.33, 1.0, math.sin(a) * 0.28)
        j2 = sk.limb(j, bend(mid, end, 2, 0.04, seed + k + 5), 0.03, 0.012, tip=1.0)
        b = a + 1.0
        sk.limb(j, [(math.cos(b) * 0.3, 0.95, math.sin(b) * 0.26)], 0.02, 0.009, tip=0.8)
    return skin(name, sk, 170)


# ---------------------------------------------------------------- foliage masses
def clumps(name, spheres, voxel, faces, light_dir=Vector((0.35, 1.0, 0.25)), floor=None, core=None, cuts=3):
    """Overlapping leaf clumps (spheres [centre, radius, tone]) joined into one soft surface: by a voxel remesh
    collapsed to `faces`, or with voxel None (small masses with few triangles) an even geodesic shell pushed out to
    the clumps' outer surface, which keeps its triangles regular instead of collapsing them into shards. Each face
    takes the tone of the clump it belongs to, lighter facing the sky and darker underneath and in the folds."""
    if voxel is None:
        return shell(name, spheres, light_dir)
    if voxel == 'box':
        return box_shell(name, spheres, light_dir, core, faces, cuts)
    bm = bmesh.new()
    if core:  # a clipped block under the clumps: (min corner, max corner)
        lo_, hi_ = core
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']:
            v.co = Vector((lo_[i] + (v.co[i] + 0.5) * (hi_[i] - lo_[i]) for i in range(3)))
    for c, r, _ in spheres:
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r, matrix=Matrix.Translation(c))
    ob = obj_from_bm(name, bm)
    m = ob.modifiers.new('remesh', 'REMESH')
    m.mode = 'VOXEL'
    m.voxel_size = voxel
    apply_mods(ob)
    if floor is not None:  # cut the underside flat where the plant meets the ground
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        for v in bm.verts:
            v.co.y = max(v.co.y, floor)
        bm.to_mesh(ob.data)
        bm.free()
    decimate(ob, faces)
    return paint_clumps(ob, spheres, light_dir, core)


def paint_clumps(ob, spheres, light_dir, core):
    light_dir = light_dir.normalized()

    def shade(c, n, i):
        # the nearest clump owns this face; its own tone, and how deep in the fold between clumps the face sits
        best, tone, fold = 1e9, 0.9, 0
        for sc, sr, st in spheres:
            d = (c - sc).length - sr
            if d < best:
                best, tone = d, st
        if core and best > 0.015:  # on the clipped block between clumps: its own, slightly darker tone
            tone, best = 0.88, 0.0
        fold = max(0.0, min(1.0, -best / 0.08))
        sun = max(0.0, n.dot(light_dir))
        k = tone * (0.74 + 0.36 * sun) * (1 - 0.18 * fold)
        k *= 0.82 + 0.18 * min(1.0, max(0.0, (c.y - lo) / (hi - lo)))  # the underside in its own shade
        fleck = (noise.noise(c * 13.0)) * 0.08
        warm = 0.04 * sun  # sunlit leaves a touch yellower, shaded ones a touch bluer
        return (k * (1 + fleck + warm), k * (1 + fleck * 0.7 + warm * 0.4), k * (1 + fleck * 0.5 - warm * 0.8))

    ys = [v.co.y for v in ob.data.vertices]
    lo, hi = min(ys), max(ys)
    paint(ob, shade)
    return ob


def shell(name, spheres, light_dir):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    for v in bm.verts:  # out along its direction to the farthest clump surface
        d = v.co.normalized()
        t = 0.0
        for c, r, _ in spheres:
            b = d.dot(c)
            disc_ = b * b - c.length_squared + r * r
            if disc_ >= 0:
                t = max(t, b + math.sqrt(disc_))
        v.co = d * t
    ob = obj_from_bm(name, bm)
    decimate(ob, 60)
    return paint_clumps(ob, spheres, light_dir, None)


def box_shell(name, spheres, light_dir, core, faces, cuts):
    """A hedge plant: an evenly divided block pushed out from its spine to the outer surface of the clipped block
    and its clumps, so the clumps read as soft bulges on a regular mesh, with no shards."""
    lo_, hi_ = Vector(core[0]), Vector(core[1])
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    mid = (lo_ + hi_) / 2
    for v in bm.verts:
        v.co = Vector((v.co.x * 1.06, (v.co.y + 0.5) * (hi_.y + 0.02), v.co.z * (hi_.z - lo_.z) * 1.1))
    for v in bm.verts:
        o = Vector((max(-0.36, min(0.36, v.co.x)), min(v.co.y, mid.y * 0.8), 0.0))  # the spine under it
        if (v.co - o).length < 1e-6:  # on the spine itself (the middle of the base, which is deleted below)
            continue
        d = (v.co - o).normalized()
        t = 0.0
        # the clipped block: where the ray leaves it
        tb = []
        for i in range(3):
            if abs(d[i]) > 1e-6:
                tb.append(((hi_[i] if d[i] > 0 else lo_[i]) - o[i]) / d[i])
        t = max(t, min(tb))
        for c, r, _ in spheres:
            cc = c - o
            b = d.dot(cc)
            disc_ = b * b - cc.length_squared + r * r
            if disc_ >= 0:
                t = max(t, b + math.sqrt(disc_))
        v.co = o + d * t
        v.co.y = max(0.0, v.co.y)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v.co.y < 1e-3 for v in f.verts)], context='FACES')
    ob = obj_from_bm(name, bm)
    decimate(ob, faces)
    return paint_clumps(ob, spheres, light_dir, core)


def bush(name, seed, n):
    random.seed(seed)
    spheres = [(Vector((0, 0, 0)), 0.72, 1.0)]
    for k in range(n):
        a = seed + k * 2.39996 + (random.random() - 0.5) * 0.4
        y = -0.25 + random.random() * 0.75
        d = 0.48 * math.sqrt(max(0.15, 1 - y * y))
        r = 0.3 + random.random() * 0.16
        spheres.append((Vector((math.cos(a) * d, y, math.sin(a) * d)), r, 0.86 + random.random() * 0.3))
    return clumps(name, spheres, None, 120)


def hedge(name, seed):
    """One plant of a clipped hedge: a clipped block (a little narrower at the top, as hedges are cut) grown out in
    many small irregular clumps over its top and sides, so its silhouette stays a hedge's and its surface is leafy."""
    random.seed(seed)
    L, H, D = 1.0, 0.6, 0.5
    spheres = []
    top, half = H - 0.06, D / 2 - 0.06  # the clipped block's top and half depth; clumps stand a few cm proud of it
    for k in range(64):
        r = 0.08 + random.random() * 0.07
        proud = 0.025 + random.random() * 0.035
        side = random.random()
        if side < 0.34:  # the top, a little domed
            x, z = -0.5 + random.random(), (random.random() - 0.5) * (D - 0.14)
            p = Vector((x, top + proud - r - 0.2 * z * z, z))
        elif side < 0.88:  # the long sides, narrowing a little upward
            sgn = 1 if side < 0.61 else -1
            x, y = -0.5 + random.random(), 0.07 + random.random() * (top - 0.12)
            p = Vector((x, y, sgn * (half + proud - r - y * 0.04)))
        else:  # the ends, so the last plant of a run is rounded, not cut
            sgn = 1 if side < 0.94 else -1
            y, z = 0.07 + random.random() * (top - 0.12), (random.random() - 0.5) * (D - 0.16)
            p = Vector((sgn * (0.44 + proud - r), y, z))
        spheres.append((p, r, 0.8 + random.random() * 0.36))
    core = ((-0.44, 0.0, -half), (0.44, top, half))
    LIGHT.append(clumps(name + '_lo', spheres, 'box', 10 ** 6, core=core, cuts=2))  # the phone's, 90 triangles
    return clumps(name, spheres, 'box', 10 ** 6, core=core)


# ---------------------------------------------------------------- the bench
def bar(bm, pts, w, x0, x1):
    """A flat iron bar along a polyline in the (z, y) plane, w wide, from x0 to x1 (a prism per segment)."""
    for (z0, y0), (z1, y1) in zip(pts, pts[1:]):
        dz, dy = z1 - z0, y1 - y0
        L = math.hypot(dz, dy)
        nz, ny = -dy / L * w / 2, dz / L * w / 2
        quad = [(z0 + nz, y0 + ny), (z1 + nz, y1 + ny), (z1 - nz, y1 - ny), (z0 - nz, y0 - ny)]
        a = [bm.verts.new((x0, y, z)) for z, y in quad]
        b = [bm.verts.new((x1, y, z)) for z, y in quad]
        bm.faces.new(list(reversed(a)))
        bm.faces.new(b)
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((a[i], a[j], b[j], b[i]))


def disc(bm, centre, r, x0, x1, n=8):
    z, y = centre
    a = [bm.verts.new((x0, y + r * math.sin(2 * math.pi * k / n), z + r * math.cos(2 * math.pi * k / n))) for k in range(n)]
    b = [bm.verts.new((x1, y + r * math.sin(2 * math.pi * k / n), z + r * math.cos(2 * math.pi * k / n))) for k in range(n)]
    bm.faces.new(list(reversed(a)))
    bm.faces.new(b)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))


def box(bm, x0, x1, y0, y1, z0, z1):
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r['verts']:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))


# seat: slat top at 0.34, front edge at z 0.2; the back leans back from z -0.2
SEAT_Z = [0.155, 0.06, -0.035, -0.13]  # slat centres, front to back
BACK = [(-0.215, 0.43), (-0.255, 0.58), (-0.29, 0.72)]  # back slat centres (z, y)


def bench_end(name, back=True):
    bm = bmesh.new()
    t = 0.025
    bar(bm, [(0.19, 0.0), (0.17, 0.16), (0.16, 0.31)], 0.05, -t, t)  # front leg
    bar(bm, [(-0.2, 0.0), (-0.17, 0.16), (-0.16, 0.31)], 0.05, -t, t)  # back leg
    bar(bm, [(0.2, 0.305), (0.05, 0.295), (-0.17, 0.3)], 0.035, -t, t)  # seat bearer, dipping a little
    bar(bm, [(0.165, 0.07), (-0.17, 0.07)], 0.025, -t * 0.8, t * 0.8)  # stretcher between the legs
    for z in (0.19, -0.2):  # feet
        box(bm, -t * 1.3, t * 1.3, 0.0, 0.025, z - 0.045, z + 0.045)
    if back:
        bar(bm, [(-0.16, 0.3), (-0.2, 0.42), (-0.25, 0.58), (-0.29, 0.72), (-0.305, 0.79)], 0.045, -t, t)  # back standard
        bar(bm, [(-0.215, 0.55), (-0.06, 0.565), (0.12, 0.56), (0.2, 0.535)], 0.045, -t * 1.15, t * 1.15)  # armrest
        bar(bm, [(0.16, 0.31), (0.17, 0.42), (0.19, 0.53)], 0.035, -t, t)  # arm post
        disc(bm, (0.205, 0.515), 0.03, -t * 1.15, t * 1.15)  # the scroll at the arm's end
        for z, y in BACK:  # bolts through the back slats
            disc(bm, (z - 0.022, y), 0.009, -0.006, 0.006, 6)
    for z in SEAT_Z:  # bolt heads on the seat slats
        box(bm, -0.009, 0.009, 0.34, 0.346, z - 0.009, z + 0.009)
    ob = obj_from_bm(name, bm)
    decimate(ob, 10 ** 6)

    def shade(c, n, i):
        k = 0.95 + 0.12 * max(0, n.y) - 0.1 * max(0, -n.y) + noise.noise(c * 31) * 0.05
        return (k, k, k)

    paint(ob, shade, corners=True)
    return ob


def slat(bm, z, y, w, h, tilt, x0=-0.5, x1=0.5):
    """One slat: a chamfered section w wide and h thick, centred at (z, y), turned by `tilt` about x."""
    c = 0.008
    sec = [(-w / 2 + c, -h / 2), (w / 2 - c, -h / 2), (w / 2, -h / 2 + c), (w / 2, h / 2 - c), (w / 2 - c, h / 2),
           (-w / 2 + c, h / 2), (-w / 2, h / 2 - c), (-w / 2, -h / 2 + c)]
    ct, st = math.cos(tilt), math.sin(tilt)
    pts = [(z + u * ct - v * st, y + u * st + v * ct) for u, v in sec]
    a = [bm.verts.new((x0, yy, zz)) for zz, yy in pts]
    b = [bm.verts.new((x1, yy, zz)) for zz, yy in pts]
    bm.faces.new(list(reversed(a)))
    bm.faces.new(b)
    for i in range(8):
        j = (i + 1) % 8
        bm.faces.new((a[i], a[j], b[j], b[i]))


def bench_seat(name, back=True):
    bm = bmesh.new()
    for k, z in enumerate(SEAT_Z):
        y = 0.34 - 0.016 - (0.006 if k in (1, 2) else 0) - (0.01 if k == 0 else 0)
        slat(bm, z, y, 0.085, 0.032, 0.0 if k else -0.18)
    if back:
        for z, y in BACK:
            slat(bm, z, y, 0.1, 0.028, math.radians(-73))
    ob = obj_from_bm(name, bm)
    decimate(ob, 10 ** 6)
    tones = {}

    def shade(c, n, i):
        if abs(n.x) > 0.9:  # end grain
            return (0.7, 0.68, 0.66)
        key = round(c.z * 20) + round(c.y * 20) * 100
        tone = tones.setdefault(key, 0.92 + random.random() * 0.14)
        k = tone * (1.0 + 0.08 * max(0, n.y) - 0.12 * max(0, -n.y)) + noise.noise(Vector((c.x * 6, c.y * 40, c.z * 40))) * 0.04
        return (k, k, k)

    paint(ob, shade, corners=True)
    return ob


# ---------------------------------------------------------------- export
def material():
    m = bpy.data.materials.new('planting')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def main():
    nodes = [
        keyaki('trunk_keyaki', 3, 4, 0.03),
        keyaki('trunk_keyaki_b', 8, 5, -0.05),
        sakura('trunk_sakura', 5, 0.14),
        sakura('trunk_sakura_b', 11, -0.1),
        pine('trunk_pine', 7),
        ginkgo('trunk_ginkgo', 2),
        maple('trunk_maple', 4),
        bush('bush_a', 21, 7),
        bush('bush_b', 22, 8),
        bush('bush_c', 23, 6),
        hedge('hedge_a', 31),
        hedge('hedge_b', 32),
        hedge('hedge_c', 33),
        bench_end('bench_end'),
        bench_end('bench_end_low', back=False),
        bench_seat('bench_seat'),
        bench_seat('bench_seat_low', back=False),
    ]
    nodes += LIGHT
    m = material()
    for ob in nodes:
        ob.data.materials.clear()
        ob.data.materials.append(m)
        print(ob.name, len(ob.data.polygons), 'tris')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=False, export_apply=True,
                              export_vertex_color='MATERIAL', export_normals=False, export_texcoords=False,
                              export_materials='EXPORT', export_extras=True, use_selection=False)
    if len(argv) > 1:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(argv[1]))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


main()
