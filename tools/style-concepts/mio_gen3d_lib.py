# char-mio-gen3d: Blender helpers for the clean rebuild (mio_gen3d_build.py). The generated model is only a hidden
# guide: rays find its surface so the hand-placed vertices of the new mesh sit on its volume; none of its vertices,
# faces or colours are ever copied (GUIDE: model in Blender, never patch a scan).
# Axes: she faces -Y, her left is +X (image right in the front view), Z up, soles at 0, top of head 1.262 m.
import math

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lin(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def srgb(c):
    return tuple(12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055 for x in c)


def hdir(a):
    """Horizontal unit vector at angle a degrees: 0 = her front (-Y), +90 = her left (+X)."""
    r = math.radians(a)
    return Vector((math.sin(r), -math.cos(r), 0.0))


class Guide:
    """The generated model, loaded hidden, as a BVH for ray queries."""

    def __init__(self, path):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        new = [o for o in bpy.data.objects if o not in before]
        bm = bmesh.new()
        dg = bpy.context.evaluated_depsgraph_get()
        for o in new:
            if o.type == 'MESH':
                ev = o.evaluated_get(dg)
                me = bpy.data.meshes.new_from_object(ev)
                me.transform(o.matrix_world)
                bm.from_mesh(me)
                bpy.data.meshes.remove(me)
        self.bvh = BVHTree.FromBMesh(bm)
        bm.free()
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)

    def inward(self, c, d, start):
        """First guide surface met coming in from c + d*start toward c (the outermost surface on that line)."""
        d = Vector(d).normalized()
        h = self.bvh.ray_cast(Vector(c) + d * start, -d, start)
        return h[0]

    def snap(self, c, d, r, start=None, tol=0.45):
        """The point at distance r from c along d, moved onto the guide's outer surface if that is within tol*r."""
        d = Vector(d).normalized()
        p = self.inward(c, d, start or r * 1.8)
        if p is None:
            return Vector(c) + d * r
        rr = (p - Vector(c)).length
        if abs(rr - r) > tol * r:
            return Vector(c) + d * r
        return p


class Part:
    """Hand-built mesh piece: vertices and triangles, each triangle tagged with a role (its colour group)."""

    def __init__(self, name):
        self.name = name
        self.v = []
        self.f = []
        self.role = []

    def add(self, co):
        self.v.append(Vector(co))
        return len(self.v) - 1

    def ring(self, pts):
        return [self.add(p) for p in pts]

    def tri(self, a, b, c, role):
        self.f.append((a, b, c))
        self.role.append(role)

    def quad(self, a, b, c, d, role, flip=False):
        """a b c d counter-clockwise seen from outside; flip picks the other diagonal."""
        if flip:
            self.tri(a, b, d, role)
            self.tri(b, c, d, role)
        else:
            self.tri(a, b, c, role)
            self.tri(a, c, d, role)

    def loft(self, rings, role, closed=True, flip=None):
        """Strips between consecutive rings (lower first). Ring vertices run counter-clockwise seen from above.
        role: str or fn(i, j). flip: fn(i, j) -> bool choosing each quad's diagonal (default alternating)."""
        for i in range(len(rings) - 1):
            a_, b_ = rings[i], rings[i + 1]
            n = len(a_)
            for j in range(n if closed else n - 1):
                j2 = (j + 1) % n
                r = role(i, j) if callable(role) else role
                fl = flip(i, j) if flip else (i + j) % 2 == 1
                self.quad(a_[j], a_[j2], b_[j2], b_[j], r, fl)

    def cap(self, ring, role, top=True, centre=None):
        """Close a ring with a fan (from a new centre vertex if given, else from its first vertex)."""
        n = len(ring)
        if centre is not None:
            c = self.add(centre)
            for j in range(n):
                a, b = ring[j], ring[(j + 1) % n]
                self.tri(a, b, c, role) if top else self.tri(b, a, c, role)
        else:
            for j in range(1, n - 1):
                a, b = ring[j], ring[j + 1]
                self.tri(ring[0], a, b, role) if top else self.tri(ring[0], b, a, role)


def to_object(part, coll):
    """Part -> flat-shaded mesh object. Face order is the part's, so part.role[i] belongs to polygon i."""
    me = bpy.data.meshes.new(part.name)
    me.from_pydata([tuple(v) for v in part.v], [], part.f)
    me.update()
    o = bpy.data.objects.new(part.name, me)
    coll.objects.link(o)
    for p in me.polygons:
        p.use_smooth = False
    return o


def project(scene, cam, co, res=1024):
    """World point -> (u, v) pixel in a res x res render from cam, and depth."""
    p = world_to_camera_view(scene, cam, Vector(co))
    return p.x * res, (1 - p.y) * res, p.z
