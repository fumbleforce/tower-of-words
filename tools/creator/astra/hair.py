"""Modelled chunky hair, in original standing-height coordinates (front is -Y).

Each hairstyle has one closed crown and a few broad swept masses. No source
triangles or source textures are reused. All pieces follow the existing Head.
"""
import math

import bmesh
import bpy
from mathutils import Vector

import common as C


PALETTE = {
    'mio': {'base': '#203461', 'shade': '#19274e', 'accent': '#28b7c2'},
    'eric': {'base': '#b49479', 'shade': '#80614d', 'accent': '#bea086'},
}


def _mesh(name, vertices, faces, material, H):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(H * Vector(p)) for p in vertices], [], faces)
    mesh.materials.append(material)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def _cap(name, centre, radii, edge_angles, material, H, segments=24, rings=8):
    """A hollow crown with a closed rim and inward shell; edge angles by azimuth.

    phi=0 faces forward. The high forehead edge leaves the eyes clear, while
    side and back edges extend below the skull's equator to form the bob/nape.
    """
    centre = Vector(centre)
    rx, ry, rz = radii
    vertices, faces = [], []
    for inner in (False, True):
        inset = 0.010 if inner else 0
        vertices.append(tuple(centre + Vector((0, 0, rz - inset))))
        for row in range(1, rings + 1):
            for col in range(segments):
                phi = 2 * math.pi * col / segments
                a = abs((phi + math.pi) % (2 * math.pi) - math.pi)
                for (a0, t0), (a1, t1) in zip(edge_angles, edge_angles[1:]):
                    if a <= a1:
                        t = (a - a0) / (a1 - a0)
                        theta = (t0 + (t1 - t0) * t) * row / rings
                        break
                else:
                    theta = edge_angles[-1][1] * row / rings
                # Below the equator hair hangs as a bob/nape rather than
                # shrinking into the skull like the bottom of an ellipsoid.
                radial = math.sin(theta) if theta <= math.pi / 2 else max(0.82, math.sin(theta))
                vertices.append(tuple(centre + Vector(((rx - inset) * radial * math.sin(phi),
                                                        -(ry - inset) * radial * math.cos(phi),
                                                        (rz - inset) * math.cos(theta)))))
        offset = len(vertices) - (1 + rings * segments)
        for col in range(segments):
            nxt = (col + 1) % segments
            faces.append((offset, offset + 1 + col, offset + 1 + nxt))
        for row in range(rings - 1):
            lo = offset + 1 + row * segments
            hi = lo + segments
            for col in range(segments):
                nxt = (col + 1) % segments
                faces.append((lo + col, hi + col, hi + nxt, lo + nxt))
    layer = 1 + rings * segments
    outer = 1 + (rings - 1) * segments
    inner = outer + layer
    for col in range(segments):
        nxt = (col + 1) % segments
        faces.append((outer + col, outer + nxt, inner + nxt, inner + col))
    return _mesh(name, vertices, faces, material, H)


def _mass(name, stations, material, H, width_axis=(1, 0, 0)):
    """Broad rounded wedge lofted through (position, half width, half depth).

    The section is a rounded octagon with a wide face and shallow bevels.
    Each wedge keeps its width through the root, then tapers to a small tip.
    """
    vertices, faces = [], []
    profile = ((-1, 0), (-0.78, -0.68), (0, -1), (0.78, -0.68),
               (1, 0), (0.78, 0.68), (0, 1), (-0.78, 0.68))
    desired = Vector(width_axis).normalized()
    for i, (position, width, depth) in enumerate(stations):
        centre = Vector(position)
        before = Vector(stations[max(0, i - 1)][0])
        after = Vector(stations[min(len(stations) - 1, i + 1)][0])
        tangent = (after - before).normalized()
        u = desired - tangent * tangent.dot(desired)
        if u.length < 0.01:
            u = Vector((0, 1, 0)) - tangent * tangent.y
        u.normalize()
        v = tangent.cross(u).normalized()
        for x, y in profile:
            vertices.append(tuple(centre + u * width * x + v * depth * y))
    n = len(profile)
    faces.append(tuple(reversed(range(n))))
    for row in range(len(stations) - 1):
        for col in range(n):
            nxt = (col + 1) % n
            faces.append((row * n + col, row * n + nxt, (row + 1) * n + nxt, (row + 1) * n + col))
    faces.append(tuple((len(stations) - 1) * n + col for col in range(n)))
    return _mesh(name, vertices, faces, material, H)


def _bun(name, centre, radii, material, H, mirror):
    """A round, softly squared bun with broad facets and a tucked underside."""
    vertices, faces = [], []
    n, rows = 12, 7
    rx, ry, rz = radii
    for row in range(rows + 1):
        theta = math.pi * (row + 0.15) / (rows + 0.3)
        for col in range(n):
            phi = 2 * math.pi * (col + 0.25) / n
            s = math.sin(theta)
            # Broad pinwheel variation reads as gathered hair without a coil.
            ripple = 1 + 0.035 * math.cos(3 * phi + theta)
            x = rx * s * math.cos(phi) * ripple
            y = ry * s * math.sin(phi) * ripple
            z = rz * math.cos(theta)
            vertices.append((centre[0] + x + mirror * z * 0.12, centre[1] + y, centre[2] + z))
    for row in range(rows):
        for col in range(n):
            nxt = (col + 1) % n
            faces.append((row * n + col, row * n + nxt, (row + 1) * n + nxt, (row + 1) * n + col))
    faces.extend((tuple(reversed(range(n))), tuple(rows * n + col for col in range(n))))
    return _mesh(name, vertices, faces, material, H)


def _side_panel(name, side, material, H):
    """A contiguous cyan patch wrapped over the bob, with a closed thin rim."""
    perimeter = [(0.227, -0.062, 0.778), (0.255, 0.013, 0.782),
                 (0.198, 0.108, 0.773), (0.199, 0.065, 0.648),
                 (0.156, -0.055, 0.551)]
    surface = perimeter + [(0.246, 0.007, 0.699)]
    vertices = [(side * (x - inset), y, z) for inset in (0, 0.006)
                for x, y, z in surface]
    faces = []
    for i in range(5):
        nxt = (i + 1) % 5
        faces.append((i, nxt, 5))
        faces.append((i + 6, 11, nxt + 6))
        faces.append((i, i + 6, nxt + 6, nxt))
    return _mesh(name, vertices, faces, material, H)


def _mio(mats, H):
    out = [_cap('mio-hair-crown', (0, 0.008, 0.748), (0.205, 0.192, 0.19),
                [(0, 1.19), (0.66, 1.4), (1.18, 2.12), (math.pi, 2.55)], mats['base'], H)]
    # The front falls in three large planes, with a slightly off-centre middle.
    out.append(_mass('mio-hair-fringe-centre', [
        ((-0.01, -0.06, 0.91), 0.056, 0.020),
        ((0.005, -0.144, 0.854), 0.073, 0.028),
        ((0.012, -0.184, 0.782), 0.067, 0.024),
        ((0.019, -0.197, 0.716), 0.039, 0.016),
        ((0.026, -0.194, 0.655), 0.003, 0.003),
    ], mats['base'], H))
    for side, label in ((-1, 'right'), (1, 'left')):
        def p(x, y, z):
            return side * x, y, z
        out.append(_mass(f'mio-hair-fringe-{label}', [
            (p(0.068, -0.055, 0.897), 0.059, 0.024),
            (p(0.111, -0.136, 0.82), 0.075, 0.028),
            (p(0.141, -0.171, 0.731), 0.058, 0.025),
            (p(0.17, -0.168, 0.662), 0.030, 0.016),
            (p(0.182, -0.153, 0.61), 0.003, 0.003),
        ], mats['base'], H))
        out.append(_mass(f'mio-hair-bob-{label}', [
            (p(0.175, 0.019, 0.82), 0.051, 0.052),
            (p(0.191, 0.017, 0.738), 0.053, 0.057),
            (p(0.179, 0.011, 0.635), 0.044, 0.046),
            (p(0.151, -0.017, 0.574), 0.004, 0.004),
        ], mats['base'], H, width_axis=(0, 1, 0)))
        out.append(_side_panel(f'mio-hair-teal-{label}', side, mats['accent'], H))
        out.append(_bun(f'mio-hair-bun-{label}', p(0.200, 0.017, 0.893),
                        (0.095, 0.081, 0.076), mats['base'], H, side))
    return out


def _eric(mats, H):
    out = [_cap('eric-hair-crown', (0, 0.001, 0.748), (0.183, 0.186, 0.199),
                [(0, 1.31), (0.70, 1.45), (1.30, 1.88), (math.pi, 2.38)], mats['base'], H)]
    # Three broad fringe shapes; their roots merge into the crown.
    fringes = [
        ('right', [((-0.078, -0.065, 0.901), 0.052, 0.033),
                   ((-0.099, -0.135, 0.852), 0.065, 0.043),
                   ((-0.111, -0.177, 0.794), 0.045, 0.032),
                   ((-0.128, -0.174, 0.708), 0.003, 0.003)]),
        ('centre', [((0.002, -0.052, 0.927), 0.044, 0.032),
                    ((-0.017, -0.126, 0.887), 0.059, 0.043),
                    ((-0.042, -0.181, 0.823), 0.045, 0.033),
                    ((-0.054, -0.184, 0.746), 0.002, 0.003)]),
        ('left', [((0.075, -0.038, 0.924), 0.054, 0.030),
                  ((0.089, -0.119, 0.875), 0.075, 0.046),
                  ((0.101, -0.17, 0.812), 0.064, 0.035),
                  ((0.068, -0.188, 0.722), 0.003, 0.003)]),
    ]
    for label, stations in fringes:
        out.append(_mass('eric-hair-fringe-' + label, stations, mats['base'], H))
    for side, label in ((-1, 'right'), (1, 'left')):
        out.append(_mass(f'eric-hair-crown-tip-{label}', [
            ((side * 0.083, 0.018, 0.911), 0.059, 0.035),
            ((side * 0.136, 0.022, 0.914), 0.070, 0.035),
            ((side * 0.189, 0.027, 0.887), 0.044, 0.024),
            ((side * 0.235, 0.036, 0.875), 0.003, 0.003),
        ], mats['base'], H, width_axis=(0, 1, 0)))
        out.append(_mass(f'eric-hair-side-{label}', [
            ((side * 0.108, 0.012, 0.902), 0.055, 0.040),
            ((side * 0.165, -0.01, 0.849), 0.078, 0.043),
            ((side * 0.19, -0.018, 0.796), 0.065, 0.034),
            ((side * 0.208, -0.026, 0.744), 0.003, 0.004),
        ], mats['base'], H, width_axis=(0, 1, 0)))
        out.append(_mass(f'eric-hair-back-{label}', [
            ((side * 0.075, 0.105, 0.884), 0.065, 0.036),
            ((side * 0.111, 0.163, 0.831), 0.073, 0.038),
            ((side * 0.121, 0.179, 0.767), 0.056, 0.029),
            ((side * 0.145, 0.179, 0.706), 0.003, 0.003),
        ], mats['base'], H))
    # One swept crown crest preserves his tousled silhouette with a broad root.
    out.append(_mass('eric-hair-crest', [
        ((-0.034, 0.012, 0.901), 0.055, 0.044),
        ((-0.022, 0.012, 0.945), 0.049, 0.034),
        ((0.019, 0.018, 0.967), 0.029, 0.021),
        ((0.063, 0.033, 0.984), 0.002, 0.003),
    ], mats['accent'], H))
    return out


def build(body, arm, original, H):
    """Create separate hair objects and attach them rigidly to the original rig."""
    mats = {key: C.flat_material(f'{body}-hair-{key}', C.hex_rgba(colour))
            for key, colour in PALETTE[body].items()}
    out = _mio(mats, H) if body == 'mio' else _eric(mats, H)
    for obj in out:
        group = obj.vertex_groups.new(name=C.rig_names(body)['Head'])
        group.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
        obj.parent = arm
        obj.matrix_parent_inverse = arm.matrix_world.inverted()
        modifier = obj.modifiers.new('rig', 'ARMATURE')
        modifier.object = arm
    return out
