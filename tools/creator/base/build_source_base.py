#!/usr/bin/env python3
"""Build diagnostic bases while preserving original exposed geometry.

Requires numpy; --original-clothes also uses trimesh. Example:
  python build_source_base.py mio source7 --original-clothes \
    --body-base art/parts/base/clean-mio-v16.json

--body-base extracts the source's actual head core and original skin pieces,
then attaches a clean interior body. --original-clothes fits that body inward
and retains source garment geometry. Without --body-base, the earlier whole
source-shell inset experiment is available for reproducing the first attempt.

Every version writes new files and refuses to overwrite an existing base.
These exports remain diagnostics: closed overlapping pieces are not one closed
manifold, and a vertex offset does not prove surface or animation clearance.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'art/parts/base'


def normals(vertices, faces):
    area = np.cross(vertices[faces[:, 1]] - vertices[faces[:, 0]],
                    vertices[faces[:, 2]] - vertices[faces[:, 0]])
    result = np.zeros_like(vertices)
    for corner in range(3):
        np.add.at(result, faces[:, corner], area)
    return result / np.maximum(np.linalg.norm(result, axis=1, keepdims=True), 1e-12)


def topology(faces):
    edges = Counter(tuple(sorted((int(a), int(b))))
                    for face in faces for a, b in zip(face, np.roll(face, -1)))
    adjacent = defaultdict(set)
    for a, b in edges:
        adjacent[a].add(b)
        adjacent[b].add(a)
    remaining = set(adjacent)
    pieces = 0
    while remaining:
        todo = [remaining.pop()]
        pieces += 1
        while todo:
            for other in adjacent[todo.pop()] & remaining:
                remaining.remove(other)
                todo.append(other)
    return {'boundary': sum(n == 1 for n in edges.values()),
            'nonmanifold': sum(n > 2 for n in edges.values()), 'pieces': pieces}


def build(sid, version):
    source_path = OUT / f'src-{sid}.json'
    source = json.loads(source_path.read_text())
    corners = np.array(source['pos']).reshape(-1, 3)
    vertices, inverse = np.unique(corners, axis=0, return_inverse=True)
    faces = inverse.reshape(-1, 3)
    slot = np.array(source['slot'])
    triangle_normals = np.cross(corners.reshape(-1, 3, 3)[:, 1] - corners.reshape(-1, 3, 3)[:, 0],
                                corners.reshape(-1, 3, 3)[:, 2] - corners.reshape(-1, 3, 3)[:, 0])
    triangle_normals /= np.maximum(np.linalg.norm(triangle_normals, axis=1, keepdims=True), 1e-12)
    centers = corners.reshape(-1, 3, 3).mean(axis=1)
    stubble = []
    if sid == 'eric':
        head_y = source['P']['Head'][1]
        stubble = np.flatnonzero((slot == 'hair') & (centers[:, 1] > head_y - .04)
                                 & (centers[:, 1] < head_y + .18) & (triangle_normals[:, 2] > -.2)
                                 & (np.abs(centers[:, 0]) < .2)).tolist()
    exposed = np.isin(slot, ['head', 'hands'])
    exposed[stubble] = True
    fixed = np.zeros(len(vertices), dtype=bool)
    fixed[faces[exposed].ravel()] = True
    hair = np.zeros(len(vertices), dtype=bool)
    hair[faces[slot == 'hair'].ravel()] = True
    hair &= ~fixed
    adjacent = [set() for _ in vertices]
    for face in faces:
        for a, b in zip(face, np.roll(face, -1)):
            adjacent[a].add(int(b))
            adjacent[b].add(int(a))
    surface_normals = normals(vertices, faces)
    fitted = vertices.copy()
    # A source surface offset provides the initial clearance. Exposed triangles
    # and every vertex they share with a covered triangle stay exactly fixed.
    fitted[~fixed] -= surface_normals[~fixed] * .008
    # Smooth the source's hair surface inward, retaining its attachment boundary.
    # This is deliberately still diagnostic: ponytails and loose source pieces
    # may fold as they contract; topology and crossing checks report that.
    for _ in range(40):
        previous = fitted.copy()
        for index in np.flatnonzero(hair):
            fitted[index] = previous[index] * .65 + previous[list(adjacent[index])].mean(axis=0) * .35
        distance = np.einsum('ij,ij->i', fitted - vertices, surface_normals)
        correction = np.maximum(distance + .004, 0)
        fitted[hair] -= surface_normals[hair] * correction[hair, None]
    fitted[fixed] = vertices[fixed]
    skin8 = np.array([250, 217, 200] if sid == 'eric' else [247, 227, 216]) / 255
    skin = np.where(skin8 <= .04045, skin8 / 12.92, ((skin8 + .055) / 1.055) ** 2.4)
    col = np.tile(skin, (len(corners), 1))
    use_tex = np.zeros(len(corners))
    preserve = np.repeat(exposed, 3)
    col[preserve] = np.array(source['col']).reshape(-1, 3)[preserve]
    use_tex[preserve] = np.array(source['useTex'])[preserve]
    # Stubble geometry is immutable but its color is supplied by the removable
    # original stubble layer. A bare base has skin in those triangles.
    for triangle in stubble:
        col[triangle * 3:triangle * 3 + 3] = skin
        use_tex[triangle * 3:triangle * 3 + 3] = 0
    positions = fitted[inverse]
    check = topology(faces)
    source_check = topology(faces)
    check.update(exposedTriangles=int(exposed.sum()),
                 exposedPositionMaxDelta=float(np.max(np.abs(positions[preserve] - corners[preserve]))),
                 sourceTopology=source_check,
                 closed=check['boundary'] == 0 and check['nonmanifold'] == 0,
                 clearanceScope='Covered vertices offset inward in bind space; this is not a garment collision certificate.')
    name = f'clean-{sid}-{version}'
    out = {'id': name, 'source': sid, 'T': source['T'], 'pos': positions.ravel().tolist(),
           'normal': normals(fitted, faces)[inverse].ravel().tolist(), 'uv': source['uv'],
           'si': source['si'], 'sw': source['sw'], 'col': col.ravel().tolist(),
           'useTex': use_tex.tolist(), 'tex': source['tex'], 'skin': skin.tolist(),
           'stubble': stubble, 'shading': 'flat', 'check': check,
           'construction': {'status': 'diagnostic, incomplete', 'method': 'immutable exposed source triangles; covered source surface offset and smoothing',
                            'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
                            'generator': 'tools/creator/base/build_source_base.py',
                            'immutableSourceTriangles': np.flatnonzero(exposed).tolist(),
                            'limitations': ['Original source boundary holes remain open.',
                                            'Hidden hair surfaces retain source topology and may fold inward.',
                                            'Garments and animation clearance are not yet validated.']}}
    path = OUT / f'{name}.json'
    if path.exists():
        raise FileExistsError(f'{path} already exists; use a new version for another attempt')
    path.write_text(json.dumps(out, separators=(',', ':')) + '\n')
    print(json.dumps({'file': str(path), **check}, indent=2))


def components(faces):
    adjacent = defaultdict(set)
    for face in faces:
        for a, b in zip(face, np.roll(face, -1)):
            adjacent[int(a)].add(int(b))
            adjacent[int(b)].add(int(a))
    remaining = set(adjacent)
    result = []
    while remaining:
        todo = [remaining.pop()]
        vertices = []
        while todo:
            current = todo.pop()
            vertices.append(current)
            for other in adjacent[current] & remaining:
                remaining.remove(other)
                todo.append(other)
        result.append(np.flatnonzero(np.isin(faces[:, 0], vertices)))
    return result


def append_triangle(out, positions, weights, skin, uv=None, colors=None, use=None):
    positions = np.asarray(positions)
    normal = np.cross(positions[1] - positions[0], positions[2] - positions[0])
    normal /= max(np.linalg.norm(normal), 1e-12)
    out['pos'].extend(positions.ravel().tolist())
    out['normal'].extend(np.tile(normal, 3).tolist())
    out['uv'].extend(np.asarray(uv if uv is not None else np.zeros((3, 2))).ravel().tolist())
    out['col'].extend(np.asarray(colors if colors is not None else np.tile(skin, (3, 1))).ravel().tolist())
    out['useTex'].extend(use if use is not None else [0, 0, 0])
    out['si'].extend(np.asarray(weights[0]).ravel().tolist())
    out['sw'].extend(np.asarray(weights[1]).ravel().tolist())


def cap_boundaries(out, skin, head_index, lift=0, skip_wrists=False):
    """Close simple boundary cycles without moving any existing corner."""
    pos = np.array(out['pos']).reshape(-1, 3)
    vertices, first, inverse = np.unique(pos, axis=0, return_index=True, return_inverse=True)
    indices = np.asarray(out['si']).reshape(-1, 4)[first]
    weights = np.asarray(out['sw']).reshape(-1, 4)[first]
    faces = inverse.reshape(-1, 3)
    edges = defaultdict(list)
    for face in faces:
        for a, b in zip(face, np.roll(face, -1)):
            edges[tuple(sorted((a, b)))].append((int(a), int(b)))
    unused = {items[0] for items in edges.values() if len(items) == 1}
    count = 0
    while unused:
        a, b = unused.pop()
        loop = [a, b]
        while loop[-1] != loop[0]:
            options = [edge for edge in unused if edge[0] == loop[-1]]
            if len(options) != 1:
                raise ValueError('Boundary is not a simple directed cycle')
            edge = options[0]
            unused.remove(edge)
            loop.append(edge[1])
        center = vertices[loop[:-1]].mean(axis=0)
        if skip_wrists and abs(center[0]) > .1 and center[1] < .45:
            continue
        center[1] += lift
        accumulated = defaultdict(float)
        for vertex in loop[:-1]:
            for bone, weight in zip(indices[vertex], weights[vertex]):
                accumulated[int(bone)] += float(weight)
        dominant = sorted(accumulated.items(), key=lambda item: -item[1])[:4]
        total = sum(weight for _, weight in dominant)
        center_indices = [bone for bone, _ in dominant] + [head_index] * (4 - len(dominant))
        center_weights = [weight / total for _, weight in dominant] + [0] * (4 - len(dominant))
        for a, b in zip(loop[:-1], loop[1:]):
            si = np.array([indices[b], indices[a], center_indices])
            sw = np.array([weights[b], weights[a], center_weights])
            append_triangle(out, [vertices[b], vertices[a], center], (si, sw), skin)
            count += 1
    return count


def boundary_loops(data):
    points = np.asarray(data['pos']).reshape(-1, 3)
    vertices, first, inverse = np.unique(points, axis=0, return_index=True, return_inverse=True)
    edges = defaultdict(list)
    for face in inverse.reshape(-1, 3):
        for a, b in zip(face, np.roll(face, -1)):
            edges[tuple(sorted((a, b)))].append((int(a), int(b)))
    unused = {items[0] for items in edges.values() if len(items) == 1}
    loops = []
    while unused:
        a, b = unused.pop()
        loop = [a, b]
        while loop[-1] != loop[0]:
            options = [edge for edge in unused if edge[0] == loop[-1]]
            if len(options) != 1:
                raise ValueError('Wrist boundary must be a simple cycle')
            edge = options[0]
            unused.remove(edge)
            loop.append(edge[1])
        loops.append(loop[:-1])
    return vertices, first, inverse, loops


def weight_mix(indices, weights, amounts):
    accumulated = defaultdict(float)
    for inds, values, amount in zip(indices, weights, amounts):
        for bone, value in zip(inds, values):
            accumulated[int(bone)] += float(value) * float(amount)
    selected = sorted(accumulated.items(), key=lambda pair: -pair[1])[:4]
    total = sum(value for _, value in selected)
    return ([bone for bone, _ in selected] + [0] * (4 - len(selected)),
            [value / total for _, value in selected] + [0] * (4 - len(selected)))


def join_wrists(clean, hand_data, source, skin, original_positions, original_weights):
    """Join the actual source wrist contour to the hidden forearm surface."""
    hv, hf, _, hand_loops = boundary_loops(hand_data)
    bv, bf, inverse, body_loops = boundary_loops(clean)
    hi = np.asarray(hand_data['si']).reshape(-1, 4)[hf]
    hw = np.asarray(hand_data['sw']).reshape(-1, 4)[hf]
    bi = np.asarray(clean['si']).reshape(-1, 4)[bf].copy()
    bw = np.asarray(clean['sw']).reshape(-1, 4)[bf].copy()
    original_points = np.asarray(original_positions).reshape(-1, 3)[bf]
    original_indices = np.asarray(original_weights[0]).reshape(-1, 4)[bf]
    original_values = np.asarray(original_weights[1]).reshape(-1, 4)[bf]
    generated = {key: [] for key in clean}
    joined = []
    for hand_loop in hand_loops:
        center = hv[hand_loop].mean(axis=0)
        if abs(center[0]) < .1:
            raise ValueError('Unexpected non-wrist opening in hand data')
        side = 'Left' if center[0] > 0 else 'Right'
        candidates = [loop for loop in body_loops if bv[loop].mean(axis=0)[0] * center[0] > 0]
        body_loop = min(candidates, key=lambda loop: np.linalg.norm(bv[loop].mean(axis=0) - center))
        axis = np.asarray(source['P'][side + 'ForeArm']) - np.asarray(source['P'][side + 'Hand'])
        axis /= np.linalg.norm(axis)
        tangent = np.cross(axis, [0, 0, 1])
        tangent /= np.linalg.norm(tangent)
        other = np.cross(axis, tangent)
        def angles(points):
            relative = points - center
            return np.arctan2(relative @ other, relative @ tangent)
        hand_order = sorted(hand_loop, key=lambda index: angles(hv[[index]])[0])
        hand_angles = angles(hv[hand_order])
        old_center = original_points[body_loop].mean(axis=0)
        body_angles = angles(original_points[body_loop] - old_center + center)
        # The clean forearm takes the real wrist contour; no hand vertex moves.
        for vertex, angle in zip(body_loop, body_angles):
            extended_angles = np.r_[hand_angles, hand_angles[0] + 2 * np.pi]
            angle = (angle - hand_angles[0]) % (2 * np.pi) + hand_angles[0]
            previous = int(np.searchsorted(extended_angles, angle, side='right') - 1)
            next_index = (previous + 1) % len(hand_order)
            fraction = (angle - extended_angles[previous]) / max(extended_angles[previous + 1] - extended_angles[previous], 1e-10)
            a, b = hand_order[previous], hand_order[next_index]
            contour = hv[a] * (1 - fraction) + hv[b] * fraction
            bv[vertex] = contour + axis * .018
            hand_indices, hand_weights = weight_mix([hi[a], hi[b]], [hw[a], hw[b]], [1 - fraction, fraction])
            forearm = source['bones'].index(side + 'ForeArm')
            bi[vertex], bw[vertex] = weight_mix([hand_indices, [forearm, 0, 0, 0]],
                                               [hand_weights, [1, 0, 0, 0]], [.65, .35])
        # Rebuild hidden arm rings along the actual source arm joints. A
        # closest-surface projection can hit an internal sleeve cap and collapse
        # a ring; a wrist-derived profile gives the bare forearm a gradual taper.
        arm = source['bones'].index(side + 'Arm')
        forearm = source['bones'].index(side + 'ForeArm')
        original_arm = np.sum(np.where(original_indices == arm, original_values, 0), axis=1)
        original_forearm = np.sum(np.where(original_indices == forearm, original_values, 0), axis=1)
        shoulder = np.asarray(source['P'][side + 'Arm'])
        elbow = np.asarray(source['P'][side + 'ForeArm'])
        stages = [((original_arm > .85), (shoulder + elbow) * .5, 1.15),
                  ((original_arm > .75) & (original_arm < .85) & (original_forearm > .15), shoulder * .25 + elbow * .75, 1.10),
                  ((original_forearm > .45) & (original_forearm < .6), elbow, 1.05)]
        for selected, ring_center, width in stages:
            ring_vertices = np.flatnonzero(selected)
            if not len(ring_vertices):
                continue
            old_center = original_points[ring_vertices].mean(axis=0)
            for vertex, angle in zip(ring_vertices, angles(original_points[ring_vertices] - old_center + center)):
                angle = (angle - hand_angles[0]) % (2 * np.pi) + hand_angles[0]
                extended = np.r_[hand_angles, hand_angles[0] + 2 * np.pi]
                previous = int(np.searchsorted(extended, angle, side='right') - 1)
                fraction = (angle - extended[previous]) / max(extended[previous + 1] - extended[previous], 1e-10)
                a, b = hand_order[previous], hand_order[(previous + 1) % len(hand_order)]
                radial = hv[a] * (1 - fraction) + hv[b] * fraction - center
                radial -= axis * (radial @ axis)
                bv[vertex] = ring_center + radial * width
                bi[vertex], bw[vertex] = original_indices[vertex], original_values[vertex]
        # Stitch the existing edge cycles in their actual order. A source
        # cuff can be slightly concave; sorting its vertices by angle would
        # replace some boundary edges and leave holes.
        def positive_order(loop, points):
            xy = np.column_stack(((points[loop] - center) @ tangent, (points[loop] - center) @ other))
            area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(xy, np.roll(xy, -1, axis=0)))
            return list(loop) if area > 0 else list(reversed(loop))
        body_order = positive_order(body_loop, bv)
        hand_order = positive_order(hand_loop, hv)
        nearest_start = int(np.argmin(np.linalg.norm(hv[hand_order] - bv[body_order[0]], axis=1)))
        hand_order = hand_order[nearest_start:] + hand_order[:nearest_start]
        a = b = 0
        while a < len(body_order) or b < len(hand_order):
            advance_body = b == len(hand_order) or (a < len(body_order) and (a + 1) / len(body_order) <= (b + 1) / len(hand_order))
            body_vertex = body_order[a % len(body_order)]
            hand_vertex = hand_order[b % len(hand_order)]
            if advance_body:
                next_vertex = body_order[(a + 1) % len(body_order)]
                positions = np.array([bv[body_vertex], bv[next_vertex], hv[hand_vertex]])
                indices = np.array([bi[body_vertex], bi[next_vertex], hi[hand_vertex]])
                weights = np.array([bw[body_vertex], bw[next_vertex], hw[hand_vertex]])
                a += 1
            else:
                next_vertex = hand_order[(b + 1) % len(hand_order)]
                positions = np.array([bv[body_vertex], hv[next_vertex], hv[hand_vertex]])
                indices = np.array([bi[body_vertex], hi[next_vertex], hi[hand_vertex]])
                weights = np.array([bw[body_vertex], hw[next_vertex], hw[hand_vertex]])
                b += 1
            radial = positions.mean(axis=0) - center
            radial -= axis * (radial @ axis)
            if np.cross(positions[1] - positions[0], positions[2] - positions[0]) @ radial < 0:
                positions = positions[[0, 2, 1]]
                indices = indices[[0, 2, 1]]
                weights = weights[[0, 2, 1]]
            append_triangle(generated, positions, (indices, weights), skin)
        joined.append({'side': side, 'handBoundaryVertices': len(hand_order), 'forearmBoundaryVertices': len(body_order)})
    clean['pos'] = bv[inverse].ravel().tolist()
    clean['normal'] = normals(bv, inverse.reshape(-1, 3))[inverse].ravel().tolist()
    clean['si'] = bi[inverse].ravel().tolist()
    clean['sw'] = bw[inverse].ravel().tolist()
    for field in clean:
        clean[field].extend(generated[field])
    return joined


def source_core(sid, version, body_path, original_clothes=False, source_data=None, bridge_gaps=False, source_weights=False, lining=False, join_hands=False):
    source_path = Path(source_data) if source_data else OUT / f'src-{sid}.json'
    source = json.loads(source_path.read_text())
    body = json.loads(Path(body_path).read_text())
    if body['source'] != sid:
        raise ValueError('Body source differs')
    source_pos = np.asarray(source['pos']).reshape(-1, 3)
    vertices, inverse = np.unique(source_pos, axis=0, return_inverse=True)
    faces = inverse.reshape(-1, 3)
    groups = components(faces)
    core = max(groups, key=lambda group: sum(source['slot'][t] == 'head' for t in group))
    # Mio's ears and neck are separate closed source components. Clothing
    # components that contain a few skin triangles do not belong to the base.
    extra = [group for group in groups if len(group) <= 28
             and sum(source['slot'][t] == 'head' for t in group) >= 14
             and all(source['slot'][t] in ('head', 'hair') for t in group)]
    removed_hand_caps = []
    if original_clothes:
        hands = [group for group in groups if sum(source['slot'][t] == 'hands' for t in group) >= 30]
        for group in hands:
            if join_hands:
                points = source_pos.reshape(-1, 3, 3)[group]
                side = 'Left' if points.mean(axis=(0, 1))[0] > 0 else 'Right'
                wrist = np.asarray(source['P'][side + 'Hand'])
                axis = np.asarray(source['P'][side + 'ForeArm']) - wrist
                axis /= np.linalg.norm(axis)
                projected = (points - wrist) @ axis
                normal = np.cross(points[:, 1] - points[:, 0], points[:, 2] - points[:, 0])
                normal /= np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), 1e-12)
                cap = (projected.min(axis=1) > .005) & (normal @ axis > .6)
                removed_hand_caps.extend(group[cap].tolist())
                group = group[~cap]
            extra.append(group)
    keep = np.concatenate([core, *extra])
    cap_vertices = set(faces[removed_hand_caps].ravel()) if removed_hand_caps else set()
    wrist_paint_faces = {int(t) for group in extra for t in group if source['slot'][t] == 'hands' and cap_vertices.intersection(faces[t])}
    skin = body['skin']
    fields = ['pos', 'normal', 'uv', 'si', 'sw', 'col', 'useTex']
    out = {key: [] for key in fields}
    immutable = []
    stubble = body.get('stubble', [])
    for triangle in keep:
        index = int(triangle)
        use = source['useTex'][index * 3:index * 3 + 3]
        colors = np.asarray(source['col'][index * 9:index * 9 + 9]).reshape(3, 3)
        positions = source_pos[index * 3:index * 3 + 3]
        # Scalp artwork belongs to hair. Face texture and geometry below the
        # hidden forehead boundary retain their original UVs and colors.
        hidden_scalp = positions[:, 1].min() > source['P']['Head'][1] + (.15 if sid == 'mio' else .20)
        if source['slot'][index] not in ('head', 'hands') or index in stubble or hidden_scalp or index in wrist_paint_faces:
            colors = np.tile(skin, (3, 1))
            use = [0, 0, 0]
        append_triangle(out, positions,
                        (np.asarray(source['si'][index * 12:index * 12 + 12]).reshape(3, 4),
                         np.asarray(source['sw'][index * 12:index * 12 + 12]).reshape(3, 4)), skin,
                        np.asarray(source['uv'][index * 6:index * 6 + 6]).reshape(3, 2), colors, use)
        immutable.append(index)
    source_triangles = len(keep)
    head_caps = cap_boundaries(out, skin, source['bones'].index('Head'), skip_wrists=join_hands)
    clean = {key: [] for key in fields}
    body_pos = np.asarray(body['pos']).reshape(-1, 3, 3)
    neck_y = source['P']['Head'][1] + (-.015 if sid == 'mio' else .010)
    body_triangles = np.flatnonzero(body_pos.max(axis=1)[:, 1] <= neck_y + 1e-6)
    for triangle in body_triangles:
        index = int(triangle)
        if original_clothes:
            corner_si = np.asarray(body['si'][index * 12:index * 12 + 12]).reshape(3, 4)
            corner_sw = np.asarray(body['sw'][index * 12:index * 12 + 12]).reshape(3, 4)
            hand_weight = sum(float(weight) for inds, weights in zip(corner_si, corner_sw)
                              for bone, weight in zip(inds, weights) if 'Hand' in source['bones'][int(bone)])
            corner_hand_weights = [sum(float(weight) for bone, weight in zip(inds, weights) if 'Hand' in source['bones'][int(bone)]) for inds, weights in zip(corner_si, corner_sw)]
            if (max(corner_hand_weights) > .5 if join_hands else hand_weight > 1.0):
                continue
        append_triangle(clean, body_pos[index],
                        (np.asarray(body['si'][index * 12:index * 12 + 12]).reshape(3, 4),
                         np.asarray(body['sw'][index * 12:index * 12 + 12]).reshape(3, 4)), skin)
    body_count = len(clean['pos']) // 9
    neck_caps = cap_boundaries(clean, skin, source['bones'].index('neck'), lift=.02 if not original_clothes else 0, skip_wrists=join_hands)
    original_clean_positions = list(clean['pos'])
    original_clean_weights = (list(clean['si']), list(clean['sw']))
    if original_clothes:
        import trimesh
        from fit_clean_layers import surface
        source_mesh = trimesh.Trimesh(vertices=source_pos, faces=np.arange(len(source_pos)).reshape(-1, 3), process=False)
        positions = np.asarray(clean['pos']).reshape(-1, 3)
        unique, inverse = np.unique(positions, axis=0, return_inverse=True)
        closest, distances, near, inside = surface(source_mesh, unique)
        move = ~inside | (distances < .008)
        unique[move] = closest[move] - source_mesh.face_normals[near[move]] * .008
        clean['pos'] = unique[inverse].ravel().tolist()
        clean['normal'] = normals(unique, inverse.reshape(-1, 3))[inverse].ravel().tolist()
        if source_weights:
            barycentric = trimesh.triangles.points_to_barycentric(source_mesh.triangles[near], closest)
            source_indices = np.asarray(source['si']).reshape(-1, 3, 4)
            source_weights_array = np.asarray(source['sw']).reshape(-1, 3, 4)
            fitted_indices, fitted_weights = [], []
            for triangle, bary in zip(near, barycentric):
                accumulated = defaultdict(float)
                for inds, weights, amount in zip(source_indices[triangle], source_weights_array[triangle], bary):
                    for bone, weight in zip(inds, weights):
                        accumulated[int(bone)] += max(0, float(amount)) * float(weight)
                strongest = sorted(accumulated.items(), key=lambda item: -item[1])[:4]
                total = sum(weight for _, weight in strongest)
                fitted_indices.append([bone for bone, _ in strongest] + [0] * (4 - len(strongest)))
                fitted_weights.append([weight / total for _, weight in strongest] + [0] * (4 - len(strongest)))
            clean['si'] = np.asarray(fitted_indices)[inverse].ravel().tolist()
            clean['sw'] = np.asarray(fitted_weights)[inverse].ravel().tolist()
    wrist_joins = join_wrists(clean, out, source, skin, original_clean_positions, original_clean_weights) if join_hands else []
    for key in fields:
        out[key].extend(clean[key])
    pp = np.asarray(out['pos']).reshape(-1, 3)
    vv, ii = np.unique(pp, axis=0, return_inverse=True)
    check = topology(ii.reshape(-1, 3))
    # Equality is checked before serialization; source corners are copied without rounding.
    check['sourcePositionMaxDelta'] = float(np.max(np.abs(pp[:source_triangles * 3] - source_pos[(keep[:, None] * 3 + np.arange(3)).ravel()])))
    name = f'clean-{sid}-{version}'
    out.update(id=name, source=sid, tex=source['tex'], skin=skin,
               T=len(out['pos']) // 9, stubble=stubble, shading='flat', check=check,
               construction={'status': 'diagnostic, incomplete',
                             'method': 'original head core; clean body with old head removed; source holes capped without moving original corners',
                             'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
                             'bodySha256': hashlib.sha256(Path(body_path).read_bytes()).hexdigest(),
                             'sourceTriangles': immutable, 'sourceTriangleCount': source_triangles, 'removedHiddenHandCaps': removed_hand_caps, 'wristJoins': wrist_joins,
                             'headCaps': head_caps, 'neckCaps': neck_caps, 'bodyWeights': 'source triangle barycentrics' if source_weights else 'v16 authored',
                             'limitations': ['Head, neck, ears and body remain separate overlapping closed pieces.',
                                             'Source wrist boundaries joined to forearm; exposed hand vertices retained.' if join_hands else 'Hands are source pieces; body wrist attachment is capped separately.' if original_clothes else 'Hands remain from v16 and do not match original exposed fingers.',
                                             'Painted sideburns remain on some source face triangles.',
                                             'Original clothes require dense and animated clearance validation.' if original_clothes else 'Rebuilt clothes require animated clearance validation.']})
    path = OUT / f'{name}.json'
    if path.exists():
        raise FileExistsError(f'{path} already exists; preserve the attempt')
    path.write_text(json.dumps(out, separators=(',', ':')) + '\n')
    library = json.loads((ROOT / 'art/parts/library.json').read_text())
    parts = {part['slot']: part for part in library['parts'] if part['source'] == sid}
    layers = {}
    for slot in ['hair', 'stubble']:
        tris = [t for t in parts['hair']['tris'] if t not in stubble] if slot == 'hair' else stubble
        if tris:
            layers[slot] = {'source': True, 'tris': tris, 'lift': .0007 if slot == 'hair' else .0025}
    if original_clothes:
        for slot in ['top', 'bottom', 'shoes']:
            layers[slot] = {'source': True, 'tris': parts[slot]['tris']}
        if bridge_gaps:
            from fit_clean_layers import samples_grid
            body_faces = np.asarray(clean['pos']).reshape(-1, 3, 3)
            grid = samples_grid(4)
            samples = np.einsum('kj,fjc->fkc', grid, body_faces).reshape(-1, 3)
            _, distances, nearest, inside = surface(source_mesh, samples)
            outside = ~inside & (distances > .0001)
            bridges = defaultdict(list)
            if lining:
                _, _, center_nearest, _ = surface(source_mesh, body_faces.mean(axis=1))
            for t in range(len(body_faces)):
                bad = outside[t * len(grid):(t + 1) * len(grid)]
                labels = [source['slot'][i] for i in nearest[t * len(grid):(t + 1) * len(grid)][bad]
                          if source['slot'][i] in ('top', 'bottom', 'shoes')]
                if lining and source['slot'][center_nearest[t]] in ('top', 'bottom', 'shoes'):
                    labels.append(source['slot'][center_nearest[t]])
                if labels:
                    bridges[Counter(labels).most_common(1)[0][0]].append(t)
            source_vertices, source_inverse = np.unique(source_pos, axis=0, return_inverse=True)
            source_normals = normals(source_vertices, source_inverse.reshape(-1, 3))[source_inverse]
            for slot, patches in bridges.items():
                geometry = {key: [] for key in fields}
                for t in parts[slot]['tris']:
                    for key, width in [('pos', 3), ('uv', 2), ('si', 4), ('sw', 4), ('col', 3), ('useTex', 1)]:
                        values = source[key][t * 3 * width:(t + 1) * 3 * width]
                        if key == 'pos' and lining:
                            values = (source_pos[t * 3:t * 3 + 3] + source_normals[t * 3:t * 3 + 3] * .0015).ravel().tolist()
                        geometry[key].extend(values)
                    tri = source_pos[t * 3:t * 3 + 3]
                    normal = np.cross(tri[1] - tri[0], tri[2] - tri[0])
                    normal /= max(np.linalg.norm(normal), 1e-12)
                    geometry['normal'].extend(np.tile(normal, 3).tolist())
                rgb = np.asarray(parts[slot]['key']) / 255
                color = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
                normal = np.asarray(clean['normal']).reshape(-1, 3, 3)
                for t in patches:
                    positions = body_faces[t] + normal[t] * .003
                    append_triangle(geometry, positions,
                                    (np.asarray(clean['si'][t * 12:(t + 1) * 12]).reshape(3, 4),
                                     np.asarray(clean['sw'][t * 12:(t + 1) * 12]).reshape(3, 4)), color)
                layers[slot] = {'geometry': geometry, 'originalSourceTriangles': parts[slot]['tris'],
                                'bodyBridgeTriangles': patches, 'bridgeOffset': .003, 'originalGarmentLift': .0015 if lining else 0, 'lining': lining}
                print(sid, slot, len(patches), 'garment bridge triangles', flush=True)
        fitted = {'base': name, 'source': sid, 'layers': layers, 'status': 'diagnostic, incomplete',
                  'limitations': ['Hidden body fitted inside source surface at vertices only; dense and animated clearance not certified.']}
        (OUT / f'{name}-fit3-layers.json').write_text(json.dumps(fitted, separators=(',', ':')) + '\n')
        print(json.dumps({'file': str(path), **check, 'headCaps': head_caps, 'neckCaps': neck_caps}, indent=2))
        return
    body_vertices = np.asarray(clean['pos']).reshape(-1, 3)
    vv, ii = np.unique(body_vertices, axis=0, return_inverse=True)
    smooth = normals(vv, ii.reshape(-1, 3))[ii]
    si = np.asarray(clean['si']).reshape(-1, 3, 4)
    sw = np.asarray(clean['sw']).reshape(-1, 3, 4)
    for slot in ['top', 'bottom', 'shoes']:
        geometry = {key: [] for key in fields}
        rgb = np.asarray(parts[slot]['key']) / 255
        color = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
        selected = []
        for t in range(body_count):
            bone_weights = defaultdict(float)
            for inds, weights in zip(si[t], sw[t]):
                for bone, weight in zip(inds, weights):
                    bone_weights[source['bones'][int(bone)]] += weight
            dominant = max(bone_weights, key=bone_weights.get)
            is_hand = 'Hand' in dominant
            is_leg = 'Leg' in dominant or 'Foot' in dominant or 'Toe' in dominant
            is_foot = 'Foot' in dominant or 'Toe' in dominant
            chosen = ((slot == 'top' and not is_hand and not is_leg)
                      or (slot == 'bottom' and is_leg and not is_foot)
                      or (slot == 'shoes' and is_foot))
            if not chosen:
                continue
            selected.append(t)
            positions = body_vertices[t * 3:t * 3 + 3] + smooth[t * 3:t * 3 + 3] * .008
            append_triangle(geometry, positions, (si[t], sw[t]), color)
        # The first normal offset can cut across a concave armpit. Fit the
        # new shell's actual triangles against the complete closed pieces.
        import trimesh
        from fit_clean_layers import smooth_fit, clearance
        skin_positions = np.asarray(out['pos']).reshape(-1, 3)
        skin_mesh = trimesh.Trimesh(vertices=skin_positions, faces=np.arange(len(skin_positions)).reshape(-1, 3), process=False)
        garment_positions = np.asarray(geometry['pos']).reshape(-1, 3)
        unique, inverse = np.unique(garment_positions, axis=0, return_inverse=True)
        garment_faces = inverse.reshape(-1, 3)
        before = clearance(skin_mesh, unique, garment_faces, .002, divisions=4)
        progress = {'iterations': 0}
        if before['gapFailures']:
            unique, progress = smooth_fit(skin_mesh, unique, garment_faces, .004)
            garment_positions = unique[inverse]
            geometry['pos'] = garment_positions.ravel().tolist()
            geometry['normal'] = normals(unique, garment_faces)[inverse].ravel().tolist()
        audit = clearance(skin_mesh, unique, garment_faces, .002, divisions=8)
        print(sid, slot, audit, flush=True)
        layers[slot] = {'geometry': geometry, 'sourceBodyTriangles': selected, 'audit': audit, 'fit': progress,
                        'clearance': .008, 'weights': 'identical to underlying body corners'}
    fitted = {'base': name, 'source': sid, 'layers': layers,
              'status': 'diagnostic, incomplete',
              'limitations': ['Simple fitted coat/pants/shoes; source trim, pockets and hood not rebuilt.',
                              'Offset is measured at corners in bind pose; animation and surface collision checks remain.']}
    (OUT / f'{name}-fit3-layers.json').write_text(json.dumps(fitted, separators=(',', ':')) + '\n')
    print(json.dumps({'file': str(path), **check, 'headCaps': head_caps, 'neckCaps': neck_caps}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', choices=['mio', 'eric'])
    parser.add_argument('version', nargs='?', default='source1')
    parser.add_argument('--body-base', help='Clean body JSON for the source-core reconstruction')
    parser.add_argument('--join-hands', action='store_true', help='Join forearms to the original hand wrist boundaries')
    parser.add_argument('--lining', action='store_true', help='Extend garment bridge coverage beneath moving clothes')
    parser.add_argument('--source-weights', action='store_true', help='Transfer source garment weights to fitted hidden body')
    parser.add_argument('--bridge-gaps', action='store_true', help='Retain original clothes and add body-weighted patches over garment joins')
    parser.add_argument('--source-data', help='Full-precision source JSON; old src files are rounded')
    parser.add_argument('--original-clothes', action='store_true', help='Fit hidden body inward and retain original clothing geometry')
    args = parser.parse_args()
    if not args.version.replace('-', '').isalnum():
        parser.error('version must contain only letters, digits and hyphens')
    if args.body_base:
        source_core(args.source, args.version, args.body_base, args.original_clothes, args.source_data, args.bridge_gaps, args.source_weights, args.lining, args.join_hands)
    else:
        build(args.source, args.version)
