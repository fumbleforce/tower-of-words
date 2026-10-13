#!/usr/bin/env python3
"""Validate exported creator bases without Blender or a browser.

Usage: python3 tools/creator/validate_base.py art/parts/base/eric-base.json
Welds identical exported positions, including duplicated UV/face corners.
This checks topology and skinning data, not appearance or self-intersections.
Use --source src-eric.json for an additional coarse rest-pose anatomy check.
"""
import argparse
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path


def components(nodes, neighbors):
    remaining = set(nodes)
    count = 0
    while remaining:
        count += 1
        stack = [remaining.pop()]
        while stack:
            for other in neighbors[stack.pop()]:
                if other in remaining:
                    remaining.remove(other)
                    stack.append(other)
    return count


def source_envelope(data, source, bone_count, margin):
    """Conservative bounds in shared bind space; not a clothing-fit test.

    Pad both source bounds and each bone's supported surface bounds by a fraction
    of source position height. A candidate vertex must fit one of its substantial
    influences, not every influence: joints and rebuilt skulls need room to blend.
    The source 'height' field is the pre-normalization GLB height, so do not use it.
    """
    if not math.isfinite(margin) or margin < 0:
        raise ValueError('Source margin must be a finite non-negative height fraction')
    if not isinstance(source, dict):
        raise ValueError('Source must be a JSON object')
    bones = source.get('bones')
    if (not isinstance(bones, list) or len(bones) != bone_count
            or any(not isinstance(b, str) for b in bones) or len(set(bones)) != bone_count):
        raise ValueError('Source must have unique bone names matching the bone count')
    if data.get('source') is not None and data['source'] != source.get('id'):
        raise ValueError('Base source id does not match the envelope source id')
    positions = source.get('pos')
    if not isinstance(positions, list) or not positions or len(positions) % 3:
        raise ValueError('Source pos must contain non-empty XYZ triples')
    for key, length in [('pos', len(positions)), ('si', len(positions) // 3 * 4),
                        ('sw', len(positions) // 3 * 4)]:
        values = source.get(key)
        if (not isinstance(values, list) or len(values) != length
                or any(type(v) not in (int, float) or not math.isfinite(v) for v in values)):
            raise ValueError(f'Invalid source {key} array')
    if any(type(b) is not int or not 0 <= b < bone_count for b in source['si']):
        raise ValueError('Invalid source bone indices')
    if (any(not 0 <= w <= 1 for w in source['sw'])
            or any(abs(sum(source['sw'][i:i + 4]) - 1) > 0.001
                   for i in range(0, len(source['sw']), 4))):
        raise ValueError('Invalid source skin weights')
    points = [tuple(positions[i:i + 3]) for i in range(0, len(positions), 3)]
    height = max(p[1] for p in points) - min(p[1] for p in points)
    if height <= 0:
        raise ValueError('Source positions must have positive Y height')
    supported = []
    for bone in bones:
        p = source.get('P', {}).get(bone)
        if (not isinstance(p, list) or len(p) != 3
                or any(type(v) not in (int, float) or not math.isfinite(v) for v in p)):
            raise ValueError(f'Invalid source joint position: {bone}')
        supported.append([p])
    for i, p in enumerate(points):
        totals = defaultdict(float)
        for bone, weight in zip(source['si'][i * 4:i * 4 + 4], source['sw'][i * 4:i * 4 + 4]):
            totals[bone] += weight
        for bone, weight in totals.items():
            if weight >= 0.05:
                supported[bone].append(p)
    # Some valid rig joints have no source surface weights (Mio's Spine, for
    # example). New bodies may use them. A joint's neighboring joint positions
    # provide a coarse anatomical segment instead of treating it as a point.
    fallback_bones = []
    parents = source.get('parent', {})
    if not isinstance(parents, dict):
        raise ValueError('Source parent must be a bone-name mapping when provided')
    for i, bone in enumerate(bones):
        if len(supported[i]) != 1:
            continue
        fallback_bones.append(bone)
        relatives = [other for other in bones
                     if parents.get(bone) == other or parents.get(other) == bone]
        supported[i].extend(source['P'][other] for other in relatives)
    padding = height * margin
    def bounds(ps):
        return ([min(p[a] for p in ps) - padding for a in range(3)],
                [max(p[a] for p in ps) + padding for a in range(3)])
    def contains(box, p):
        return all(box[0][a] <= p[a] <= box[1][a] for a in range(3))
    whole, per_bone = bounds(points), [bounds(ps) for ps in supported]
    outside, misplaced = set(), set()
    for i in range(len(data['pos']) // 3):
        p = tuple(data['pos'][i * 3:i * 3 + 3])
        if not contains(whole, p):
            outside.add(p)
        totals = defaultdict(float)
        for bone, weight in zip(data['si'][i * 4:i * 4 + 4], data['sw'][i * 4:i * 4 + 4]):
            totals[bone] += weight
        if not any(weight >= 0.2 and contains(per_bone[bone], p) for bone, weight in totals.items()):
            misplaced.add(p)
    errors = []
    if outside:
        errors.append(f'{len(outside)} welded vertices outside the padded source bounds')
    if misplaced:
        errors.append(f'{len(misplaced)} welded vertices outside their weighted-bone source envelopes')
    return errors, {'source_position_height': height, 'source_envelope_padding': padding,
                    'source_bounds_outliers': len(outside), 'bone_envelope_outliers': len(misplaced),
                    'bone_envelope_joint_fallback_bones': fallback_bones}


def validate(data, bone_count, source=None, source_margin=0.08):
    errors, metrics = [], {}
    t = data.get('T')
    if type(t) is not int or t <= 0:
        return {'ok': False, 'errors': ['T must be a positive integer'], 'metrics': {}}
    n = t * 3
    attributes = [('pos', n * 3), ('uv', n * 2), ('si', n * 4), ('sw', n * 4)]
    if 'normal' in data:
        attributes.append(('normal', n * 3))
    for key, length in attributes:
        values = data.get(key)
        if not isinstance(values, list) or len(values) != length:
            errors.append(f'{key} must contain {length} values')
        elif any(type(v) not in (int, float) or not math.isfinite(v) for v in values):
            errors.append(f'{key} contains non-finite or non-numeric values')
    if errors:
        return {'ok': False, 'errors': errors, 'metrics': metrics}
    if 'normal' in data:
        # Exporters round components. A 0.001 length tolerance allows that while
        # catching zero vectors and visibly mis-scaled normal attributes.
        deviations = [abs(math.hypot(*data['normal'][i:i + 3]) - 1)
                      for i in range(0, n * 3, 3)]
        nonunit = sum(deviation > 0.001 for deviation in deviations)
        metrics.update(nonunit_normal_vertices=nonunit, normal_max_unit_error=max(deviations))
        if nonunit:
            errors.append(f'{nonunit} normal vectors are not unit length within 0.001')
    indices, weights = data['si'], data['sw']
    invalid_indices = sum(type(v) is not int or not 0 <= v < bone_count for v in indices)
    invalid_weights = sum(not 0 <= v <= 1 for v in weights)
    bad_sums = sum(abs(sum(weights[i:i + 4]) - 1) > 0.001 for i in range(0, len(weights), 4))
    if invalid_indices:
        errors.append(f'{invalid_indices} invalid bone indices (bone count {bone_count})')
    if invalid_weights or bad_sums:
        errors.append(f'{invalid_weights} out-of-range skin weights; {bad_sums} vertices have weights not summing to 1')

    points, ids, corners = [], {}, []
    for i in range(0, len(data['pos']), 3):
        p = tuple(data['pos'][i:i + 3])
        if p not in ids:
            ids[p] = len(points)
            points.append(p)
        corners.append(ids[p])
    # Face/UV corners may duplicate one body vertex. They must follow the same
    # bones, otherwise a mesh that is closed at rest can split during animation.
    # Compare influence totals, not slot order; exporters can reorder top-four ties.
    inconsistent_skin = set()
    if not invalid_indices and not invalid_weights and not bad_sums:
        influences = {}
        for corner, vertex in enumerate(corners):
            totals = defaultdict(float)
            start = corner * 4
            for bone, weight in zip(indices[start:start + 4], weights[start:start + 4]):
                totals[bone] += weight
            if vertex in influences:
                previous = influences[vertex]
                if any(abs(previous.get(bone, 0) - totals.get(bone, 0)) > 0.001
                       for bone in previous.keys() | totals.keys()):
                    inconsistent_skin.add(vertex)
            else:
                influences[vertex] = totals
    metrics['inconsistent_skin_vertices'] = len(inconsistent_skin)
    if inconsistent_skin:
        errors.append(f'{len(inconsistent_skin)} welded vertices have different bone weights across face corners')
    edges, faces = defaultdict(list), Counter()
    neighbors = defaultdict(set)
    links = defaultdict(lambda: defaultdict(set))
    degenerate = 0
    for i in range(0, n, 3):
        a, b, c = corners[i:i + 3]
        faces[tuple(sorted((a, b, c)))] += 1
        p, q, r = points[a], points[b], points[c]
        u = [q[k] - p[k] for k in range(3)]
        v = [r[k] - p[k] for k in range(3)]
        cross = [u[1]*v[2] - u[2]*v[1], u[2]*v[0] - u[0]*v[2], u[0]*v[1] - u[1]*v[0]]
        if len({a, b, c}) < 3 or sum(x*x for x in cross) <= 1e-20:
            degenerate += 1
        for x, y, z in [(a, b, c), (b, c, a), (c, a, b)]:
            edges[tuple(sorted((x, y)))].append((x, y))
            neighbors[x].add(y)
            neighbors[y].add(x)
            links[x][y].add(z)
            links[x][z].add(y)
    boundary = sum(len(e) == 1 for e in edges.values())
    nonmanifold = sum(len(e) != 2 for e in edges.values())
    winding = sum(len(e) == 2 and e[0] == e[1] for e in edges.values())
    duplicates = sum(count - 1 for count in faces.values())
    pieces = components(range(len(points)), neighbors)
    bad_links = sum(any(len(adj) != 2 for adj in link.values()) or components(link, link) != 1
                    for link in links.values())
    metrics.update(triangles=t, welded_vertices=len(points), boundary_edges=boundary,
                   nonmanifold_edges=nonmanifold, inconsistent_edges=winding,
                   degenerate_triangles=degenerate, duplicate_triangles=duplicates,
                   components=pieces, nonmanifold_vertices=bad_links)
    for label, count in [('boundary edges', boundary), ('non-manifold edges', nonmanifold),
                         ('inconsistently wound edges', winding), ('degenerate triangles', degenerate),
                         ('duplicate triangles', duplicates), ('non-manifold vertices', bad_links)]:
        if count:
            errors.append(f'{count} {label}')
    if pieces != 1:
        errors.append(f'{pieces} disconnected components; expected one body')
    if source is not None:
        if invalid_indices or invalid_weights or bad_sums:
            errors.append('Source envelope check skipped because base skin data is invalid')
        else:
            try:
                envelope_errors, envelope_metrics = source_envelope(data, source, bone_count, source_margin)
                errors.extend(envelope_errors)
                metrics.update(envelope_metrics)
            except (ValueError, TypeError, AttributeError) as error:
                errors.append(str(error))
    return {'ok': not errors, 'errors': errors, 'metrics': metrics}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='+', type=Path)
    parser.add_argument('--bones', type=int, help='Override bone count; default reads sibling src-<source>.json')
    parser.add_argument('--source', type=Path, help='Optional source dump for coarse rest-pose bounds and bone-envelope checks; must match every input')
    parser.add_argument('--source-margin', type=float, default=0.08,
                        help='Envelope padding as a fraction of source position height (default: 0.08)')
    args = parser.parse_args()
    failed = False
    for path in args.files:
        snapshot = {}
        try:
            raw = path.read_bytes()
            # Base variants can be regenerated under the same filename. Tie each
            # review result to the exact bytes checked, not the path alone.
            snapshot = {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise ValueError('Base must be a JSON object')
            count = args.bones
            envelope_source = None
            if args.source is not None:
                source_raw = args.source.read_bytes()
                envelope_source = json.loads(source_raw)
                snapshot['envelope_source'] = {'file': str(args.source), 'sha256': hashlib.sha256(source_raw).hexdigest()}
                if count is None:
                    count = len(envelope_source['bones'])
            if count is None:
                source = data.get('source')
                if not isinstance(source, str) or not source.isidentifier():
                    raise ValueError('Invalid or missing source id')
                source_data = json.loads(path.with_name(f'src-{source}.json').read_text())
                count = len(source_data['bones'])
            if count <= 0:
                raise ValueError('Bone count must be positive')
            report = validate(data, count, envelope_source, args.source_margin)
        except (OSError, ValueError, KeyError, TypeError) as error:
            report = {'ok': False, 'errors': [str(error)], 'metrics': {}}
        print(json.dumps({'file': str(path), **snapshot, **report}, indent=2))
        failed |= not report['ok']
    return int(failed)


if __name__ == '__main__':
    raise SystemExit(main())
