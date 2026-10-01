"""Finish a head study from Claude's saved front-hand facet map; no texture material.

The front facet vertices keep their image positions. Back depth comes from the
existing side profile; its topology follows the front and its colours are inferred
hair colours. Boundary quads join both shells. Facial marks are colour-quantized
contours from the saved mf-05 decal, intersected with the actual front triangles.
They become coloured triangles 0.25 mm above that surface, with no image/UV data.
mf-07 replaces those contours with explicit polygons in mio-facets-face.json.
Run with ~/ai/cv-venv/bin/python tools/style-concepts/mio_facets_head.py mf-07.
"""
import json
import sys
from collections import Counter
from pathlib import Path

import cv2
import numpy as np
import shapely
from shapely.geometry import Polygon

from mio_facets_lift import Section, cam, lift, raster, side_profile, is_skin
from mio_facets_wire import OUT


def build():
    attempt = sys.argv[1] if len(sys.argv) > 1 else "mf-06"
    configs = json.loads((Path(__file__).parent/'mio-facets.json').read_text())
    if attempt not in ('mf-06', 'mf-07') or configs.get(attempt, {}).get('slice') != 'head':
        raise SystemExit('Expected configured head study mf-06 or mf-07; existing body attempts are read-only')
    out = Path(OUT)
    source = json.loads((out / 'wire/front-hand.json').read_text())
    polys = [p for p in source['polys'] if p['part'] == 'head' or p['name'] in ('h23', 'h33')]
    points = np.asarray(source['verts'])
    section = Section(raster(polys, points), side_profile())
    ids = sorted({v for p in polys for tri in p['tris'] for v in tri})
    index = {old: new for new, old in enumerate(ids)}
    verts = [lift(cam(0), *points[i], section, -1) for i in ids]
    n = len(verts)
    for i, xyz in zip(ids, list(verts)):
        cy = section.at(points[i][1])[2]
        back = xyz.copy()
        back[1] = max(2 * cy - xyz[1], xyz[1] + 0.02)
        verts.append(back)
    faces = []
    edges = {}
    skin_triangles = []
    hair = [p['rgb'] for p in polys if not is_skin(p['rgb']) and max(p['rgb']) < 130]
    hair_colour = np.median(hair, axis=0)
    for p in polys:
        for tri in p['tris']:
            tri = [index[i] for i in tri]
            a, b, c = (verts[i] for i in tri)
            if np.dot(np.cross(b-a, c-a), cam(0)[0]-a) < 0:
                tri.reverse()
            faces.append(dict(v=tri, rgb=p['rgb'], part='head', side='front', facet=p['id']))
            # The unseen rear is explicitly an inferred dark-hair surface.
            colour = p['rgb'] if p['rgb'] in hair else [int(v) for v in hair_colour]
            faces.append(dict(v=[i+n for i in reversed(tri)], rgb=colour, part='head', side='back', facet=p['id']))
            for a, b in zip(tri, tri[1:]+tri[:1]):
                edges.setdefault(tuple(sorted((a,b))), []).append((a,b,p['rgb']))
            if is_skin(p['rgb']):
                skin_triangles.append((points[[ids[i] for i in tri]], np.asarray([verts[i] for i in tri])))
    for edge, adjacent in edges.items():
        if len(adjacent) != 1:
            continue
        a,b,col = adjacent[0]
        col = [int(v) for v in hair_colour]
        for tri in ([b,a,a+n], [b,a+n,b+n]):
            faces.append(dict(v=tri, rgb=col, part='head', side='seam', facet=len(faces)))
    shell_count = len(faces)
    feature_count = 0
    if attempt == 'mf-07':
        marks = json.loads((Path(__file__).parent/'mio-facets-face.json').read_text())
        for mark in marks:
            polygon = Polygon(mark['points'])
            for pixels, xyz in skin_triangles:
                clipped = polygon.intersection(Polygon(pixels))
                if clipped.is_empty or clipped.area < .01:
                    continue
                matrix = np.vstack((pixels.T, np.ones(3)))
                normal = np.cross(xyz[1]-xyz[0], xyz[2]-xyz[0])
                normal /= np.linalg.norm(normal)
                for t in shapely.constrained_delaunay_triangles(clipped).geoms:
                    coords = np.asarray(t.exterior.coords)[:3]
                    weights = np.linalg.solve(matrix, np.vstack((coords.T,np.ones(3)))).T
                    world = weights @ xyz + normal * (.00025 + marks.index(mark)*.00002)
                    tri = list(range(len(verts),len(verts)+3))
                    if np.dot(np.cross(world[1]-world[0],world[2]-world[0]),normal) < 0:
                        tri.reverse()
                    verts.extend(world)
                    faces.append(dict(v=tri, rgb=mark['rgb'], part='features', side='front', facet=1000+feature_count))
                    feature_count += 1
    else:
        # Texture is used only as an offline tracing input, never exported or sampled
        # by the model. Every resulting feature polygon has a single constant colour.
        decal = cv2.imread(str(out/'mf-05/decal.png'), cv2.IMREAD_UNCHANGED)
        rgb = decal[:,:,:3][:,:,::-1]
        alpha = decal[:,:,3] > 180
        pixels = np.float32(rgb[alpha])
        cv2.setRNGSeed(6)
        _, labels, palette = cv2.kmeans(pixels, 10, None, (cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER, 50, .3), 1, cv2.KMEANS_PP_CENTERS)
        regions = np.full(alpha.shape, -1, np.int16)
        regions[alpha] = labels[:,0]
        feature_count = 0
        for k, col in enumerate(palette):
            mask = np.uint8(regions == k)*255
            contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
            for contour_id, contour in enumerate(contours):
                if hierarchy[0][contour_id][3] >= 0:
                    continue
                if cv2.contourArea(contour) < 4:
                    continue
                ring = cv2.approxPolyDP(contour, .9, True).reshape(-1,2)/2
                if len(ring) < 3:
                    continue
                holes = []
                child = hierarchy[0][contour_id][2]
                while child >= 0:
                    hole = cv2.approxPolyDP(contours[child], .9, True).reshape(-1, 2)/2
                    if len(hole) >= 3:
                        holes.append(hole)
                    child = hierarchy[0][child][0]
                polygon = shapely.make_valid(Polygon(ring, holes))
                for pixels, xyz in skin_triangles:
                    clipped = polygon.intersection(Polygon(pixels))
                    if clipped.is_empty or clipped.area < .15:
                        continue
                    matrix = np.vstack((pixels.T, np.ones(3)))
                    normal = np.cross(xyz[1]-xyz[0], xyz[2]-xyz[0])
                    normal /= np.linalg.norm(normal)
                    for t in shapely.constrained_delaunay_triangles(clipped).geoms:
                        coords = np.asarray(t.exterior.coords)[:3]
                        weights = np.linalg.solve(matrix, np.vstack((coords.T,np.ones(3)))).T
                        world = weights @ xyz + normal*.00025
                        tri = list(range(len(verts),len(verts)+3))
                        if np.dot(np.cross(world[1]-world[0],world[2]-world[0]),normal) < 0:
                            tri.reverse()
                        verts.extend(world)
                        faces.append(dict(v=tri, rgb=[int(v) for v in col], part='features', side='front', facet=1000+feature_count))
                        feature_count += 1
    edge_counts = Counter(tuple(sorted((a,b))) for f in faces[:shell_count] for a,b in zip(f['v'],f['v'][1:]+f['v'][:1]))
    report = dict(shell_faces=shell_count, feature_faces=feature_count,
                  boundary_edges=sum(v==1 for v in edge_counts.values()),
                  nonmanifold_edges=sum(v>2 for v in edge_counts.values()),
                  texture_images=0, rigged=False)
    target = out/attempt
    target.mkdir(exist_ok=True)
    data = dict(verts=[list(map(float,v)) for v in verts], faces=faces, decal=[], slice='head', audit=report)
    (target/'mesh.json').write_text(json.dumps(data))
    (target/'audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))
    if report['boundary_edges'] or report['nonmanifold_edges']:
        raise SystemExit('Head shell is not manifold')


if __name__ == '__main__':
    build()
