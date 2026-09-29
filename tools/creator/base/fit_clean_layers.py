#!/usr/bin/env python3
"""Candidate garment/hair fitting; preserves original triangles and UV layout.

OPENBLAS_NUM_THREADS=1 flat-venv/bin/python fit_clean_layers.py clean-eric-v11 fit2
The body remains intact. Garments retain their source skin weights. Corrections
use a smooth barycentric solve, with an orientation guard and final dense audit.
An exported candidate may be not-ready; sampled rest clearance is not a proof
of animated clearance.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'art/parts/base'


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def surface(mesh, points):
    """Closest point plus winding-number inside test, without optional rtree."""
    closest, distances, faces, inside = [], [], [], []
    for start in range(0, len(points), 64):
        p = points[start:start + 64]
        c, d, f = trimesh.proximity.closest_point_naive(mesh, p)
        v = mesh.triangles[None, :, :, :] - p[:, None, None, :]
        a, b, z = v[:, :, 0], v[:, :, 1], v[:, :, 2]
        la, lb, lz = (np.linalg.norm(x, axis=-1) for x in (a, b, z))
        numerator = np.einsum('bfi,bfi->bf', a, np.cross(b, z))
        denominator = la * lb * lz + np.einsum('bfi,bfi->bf', a, b) * lz
        denominator += np.einsum('bfi,bfi->bf', b, z) * la + np.einsum('bfi,bfi->bf', z, a) * lb
        winding = np.abs((2 * np.arctan2(numerator, denominator)).sum(axis=1))
        closest.append(c); distances.append(d); faces.append(f); inside.append(winding > 2 * np.pi)
    return tuple(np.concatenate(x) for x in (closest, distances, faces, inside))


def samples_grid(divisions):
    return np.array([[a / divisions, b / divisions, 1 - (a + b) / divisions]
                     for a in range(divisions + 1) for b in range(divisions + 1 - a)])


def face_vectors(points, faces):
    tri = points[faces]
    return np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])


def clearance(mesh, points, faces, gap, divisions=8):
    grid = samples_grid(divisions)
    samples = np.einsum('kj,fjc->fkc', grid, points[faces]).reshape(-1, 3)
    _, distance, _, inside = surface(mesh, samples)
    penetrating = inside & (distance > 1e-5)
    return {'samples': len(samples), 'insideSamples': int(penetrating.sum()),
            'insideFaces': int(np.any(penetrating.reshape(-1, len(grid)), axis=1).sum()),
            'maxPenetration': float(distance[penetrating].max(initial=0)),
            'gapFailures': int((inside | (distance < gap - 1e-5)).sum()),
            'minimumSignedClearance': float(np.where(inside, -distance, distance).min())}


def smooth_fit(mesh, original, faces, gap):
    """Solve sample contacts together, preserving local shape and orientation."""
    original_normals = face_vectors(original, faces)
    grid = samples_grid(4)
    points = original.copy()
    edges = np.unique(np.sort(np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]), axis=1), axis=0)
    laplacian = np.zeros((len(edges), len(points)))
    laplacian[np.arange(len(edges)), edges[:, 0]] = 1
    laplacian[np.arange(len(edges)), edges[:, 1]] = -1
    regularizer = .08 ** 2 * np.eye(len(points)) + .7 ** 2 * (laplacian.T @ laplacian)
    blocked = 0
    for iteration in range(12):
        samples = np.einsum('kj,fjc->fkc', grid, points[faces]).reshape(-1, 3)
        close, distance, near, inside = surface(mesh, samples)
        bad = inside | (distance < gap - 1e-5)
        if not bad.any():
            break
        selected = np.flatnonzero(bad)
        triangle_ids, bary_ids = selected // len(grid), selected % len(grid)
        vertices = faces[triangle_ids]
        constraints = np.zeros((len(selected), len(points)))
        np.add.at(constraints, (np.repeat(np.arange(len(selected)), 3), vertices.ravel()), grid[bary_ids].ravel())
        target = close[bad] + mesh.face_normals[near[bad]] * (gap * 1.2) - samples[bad]
        step = np.linalg.solve(constraints.T @ constraints + regularizer, constraints.T @ target)
        lengths = np.linalg.norm(step, axis=1)
        step *= np.minimum(1, .025 / np.maximum(lengths, 1e-12))[:, None]
        # Local backtracking freezes only vertices whose proposed movement folds
        # a face, allowing unrelated cloth regions to continue fitting.
        for retry in range(14):
            trial = points + step
            normal = face_vectors(trial, faces)
            dot = np.einsum('ij,ij->i', normal, original_normals)
            safe = dot > .05 * np.einsum('ij,ij->i', original_normals, original_normals)
            if safe.all():
                break
            step[np.unique(faces[~safe])] *= .25
        if not safe.all():
            blocked += int((~safe).sum())
            break
        points = trial
        if np.linalg.norm(step, axis=1).max(initial=0) < 1e-6:
            break
    return points, {'iterations': iteration + 1, 'orientationBlockedFaces': blocked}


def fit(base_id, tag):
    out = BASE / f'{base_id}-{tag}-layers.json'
    if out.exists():
        raise FileExistsError(f'Preserve prior attempts: {out} already exists')
    base_path = BASE / f'{base_id}.json'
    body = read(base_path)
    src_path = BASE / f'src-{body["source"]}.json'
    src, lib = read(src_path), read(ROOT / 'art/parts/library.json')
    skin = np.asarray(body['pos']).reshape(-1, 3)
    mesh = trimesh.Trimesh(vertices=skin, faces=np.arange(len(skin)).reshape(-1, 3), process=False)
    source_pos = np.asarray(src['pos']).reshape(-1, 3)
    layers = {}
    selected = {p['slot']: p['tris'] for p in lib['parts'] if p['source'] == body['source'] and p['slot'] in ('hair', 'top', 'bottom', 'shoes')}
    if body.get('stubble'):
        stub = set(body['stubble'])
        selected['hair'] = [t for t in selected['hair'] if t not in stub]
        selected['stubble'] = sorted(stub)
    for slot, tris in selected.items():
        indices = (np.asarray(tris)[:, None] * 3 + np.arange(3)).reshape(-1)
        original = source_pos[indices]
        unique, inverse = np.unique(original.round(7), axis=0, return_inverse=True)
        faces = inverse.reshape(-1, 3)
        gap = 0.006 if slot in ('top', 'bottom') else 0.003
        before = clearance(mesh, unique, faces, gap)
        points, progress = smooth_fit(mesh, unique, faces, gap)
        points = points.round(7)
        final = clearance(mesh, points, faces, gap)
        # Retain each original corner's weights, including source UV/seam splits.
        # Spatially nearest skin can belong to a different arm, leg or the head.
        si = np.asarray(src['si']).reshape(-1, 4)[indices].copy()
        sw = np.asarray(src['sw']).reshape(-1, 4)[indices].copy()
        if slot in ('hair', 'stubble'):
            si[:] = 0; sw[:] = 0
            si[:, 0] = src['bones'].index('Head'); sw[:, 0] = 1
        pos = points[inverse]
        delta = np.linalg.norm(pos - original, axis=1)
        if not np.isfinite(pos).all() or not np.isfinite(sw).all():
            raise ValueError(f'{slot}: nonfinite output')
        normals = np.cross(pos.reshape(-1, 3, 3)[:, 1] - pos.reshape(-1, 3, 3)[:, 0], pos.reshape(-1, 3, 3)[:, 2] - pos.reshape(-1, 3, 3)[:, 0])
        lengths = np.linalg.norm(normals, axis=1)
        if np.any(lengths < 1e-10):
            raise ValueError(f'{slot}: degenerate fitted face')
        normals /= lengths[:, None]
        old_normals = face_vectors(unique, faces)
        reversed_faces = int((np.einsum('ij,ij->i', normals, old_normals) <= 0).sum())
        ready = final['gapFailures'] == 0 and reversed_faces == 0
        layers[slot] = {'tris': tris, 'pos': pos.round(7).ravel().tolist(),
                        'normal': np.repeat(normals, 3, axis=0).round(7).ravel().tolist(),
                        'si': si.ravel().tolist(), 'sw': sw.ravel().tolist(),
                        'stats': {'vertices': len(unique), 'triangles': len(tris), 'maxMove': float(delta.max()),
                                  'meanMove': float(delta.mean()), 'gap': gap, **progress,
                                  'before': before, 'final': final, 'reversedFaces': reversed_faces,
                                  'status': 'rest-clearance-passed' if ready else 'not-ready',
                                  'weights': 'rigid Head' if slot in ('hair', 'stubble') else 'unchanged source'}}
        print(slot, layers[slot]['stats'], flush=True)
    out.write_text(json.dumps({'base': base_id, 'source': body['source'], 'baseSha256': sha(base_path),
                               'sourceSha256': sha(src_path), 'builderSha256': sha(Path(__file__)),
                               'status': 'not-ready' if any(d['stats']['status'] == 'not-ready' for d in layers.values()) else 'rest-clearance-passed',
                               'limitations': 'Sampled bind-pose clearance only; animation and layer-layer contact require separate validation.',
                               'layers': layers}, separators=(',', ':')) + '\n')
    print(out)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: fit_clean_layers.py <base-id> <fit-tag>')
    fit(*sys.argv[1:])
