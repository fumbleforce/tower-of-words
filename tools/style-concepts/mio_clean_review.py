"""Post the bounded Meshy cleanup comparison and retain local evidence hashes. No API calls."""
import hashlib
import json
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parents[2]
MAIN = Path(subprocess.check_output(
    ['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip()).parent
BASE = Path('art/parts/style-concepts/claude-miogen3d/clean')
REVIEW = REPO / 'reviews/char-mio-clean-1'
REVIEW.mkdir(parents=True, exist_ok=True)
feedback = json.loads((MAIN / 'reviews/char-mio-gen3d-1/feedback.json').read_text())
notes = {
    '01-material': 'Diagnostic: unlit material only. Geometry and embedded atlas are unchanged. Removes added lighting shadows; baked colour mottling and the eye ridge remain.',
    '02-eyes': 'Rejected: full eye-depth correction collapses 8 triangles and reverses 455 geometric normals. Unlit material, unchanged atlas. Kept to show the failed attempt.',
    '03-clean': 'Rejected: 60% eye correction creates 10 local triangle crossings and reverses 17 geometric normals. Adds the viewer-only fine texture filter. Kept to show the failed attempt.',
    '04-border': 'Rejected: border pinning and a short taper create at least 67 local crossings and reverse 43 geometric normals. Same texture filter. Kept to show the failed repair.',
    '05-safe': 'Partial cleanup: unlit material and a viewer-only, edge-aware fine texture filter. The eye band retreats by up to 6.67 mm at 20% strength. The raised eye ridge remains visible, especially from the side; hair and back texture seams remain. Independent local audit: 0 new crossings across 80,586 pairs, 0 new degenerate triangles and 0 reversed geometric normals. Face width/height, UVs, indices, embedded atlas and all vertices outside the eye patch are unchanged. Original normals are retained, so this candidate is for unlit viewing. The atlas itself has not been repainted; the filter is not portable in the GLB alone. Dense mesh, no rig; not installed in the game.'
}
options = []
for attempt, note in notes.items():
    shots = [str(BASE / attempt / 'renders' / name) for name in
             ['body-0.png', 'body-40.png', 'body-90.png', 'body-180.png',
              'face-0.png', 'face-40.png', 'face-90.png']]
    # Earlier diagnostic captures remain visible after the matched final captures.
    shots += [str(p.relative_to(MAIN)) for p in sorted(
        (MAIN / 'game3d/shots/codex-meshy-clean').glob(attempt + '-face-*.png'))]
    if attempt == '05-safe':
        shots += [str(BASE / attempt / 'renders' / n) for n in ['phone-clean.png', 'phone-original.png']]
    options.append({'id': attempt, 'label': attempt, 'image': shots[0], 'images': shots[1:],
                    'note': note + ' Settings: no generation prompt or paid job; fixed grey studio, matched camera, original on the left and attempt on the right. Front, 40°, side, back, then face close-ups. Full method and byte hashes are in the receipts.'})
record = {
    'title': 'Mio: Meshy texture and eye-edge cleanup', 'date': '2026-10-01', 'by': 'Codex',
    'status': 'open', 'issue': 171, 'multi': True,
    'question': 'Does 05-safe improve the texture and eyes enough to keep working from it?',
    'media': [{'image': str(BASE / '05-safe/renders/face-40.png'),
               'caption': 'Original left, 05-safe right. Fine mottling is softened; the raised eye ridge and some texture seams remain. Your brief: ' + feedback['options']['meshy-single']['comment'] + ' Overall: ' + feedback['comment']},
              {'image': str(BASE / 'source-texture.jpg'),
               'caption': 'Original embedded atlas, extracted without editing. Its broad facet colour blocks remain in every attempt. Unlit shading removes extra shadows; the viewer filter softens fine noise only.'}],
    'options': options,
    'links': [{'label': 'Rotate original and cleanup together', 'href': 'tools/style-concepts/mio_clean_viewer.html?c=05-safe'},
              {'label': 'Methods, hashes and audit limits', 'href': 'reviews/char-mio-clean-1/evidence.json'},
              {'label': 'Independent local geometry audit', 'href': str(BASE / 'evidence/codex-mio-clean05-review.txt')}]
}
for option in options:
    for path in [option['image'], *option['images']]:
        if not (MAIN / path).is_file():
            raise FileNotFoundError(path)
for item in record['media']:
    if not (MAIN / item['image']).is_file():
        raise FileNotFoundError(item['image'])
(REVIEW / 'review.json').write_text(json.dumps(record, indent=2, ensure_ascii=False) + '\n')
files = []
for path in sorted((MAIN / BASE).rglob('*')):
    if path.is_file():
        files.append({'path': str(path.relative_to(MAIN)), 'bytes': path.stat().st_size,
                      'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
evidence = {
    'source': 'art/parts/style-concepts/claude-miogen3d/raw/meshy-single/norm.glb',
    'source_sha256': hashlib.sha256((MAIN / 'art/parts/style-concepts/claude-miogen3d/raw/meshy-single/norm.glb').read_bytes()).hexdigest(),
    'diagnosis': 'Dirt combines baked texture mottling with added material lighting. No normal/AO map is present. Raised eye/lash edges are geometry, not a painted shadow.',
    'new_paid_jobs': 0, 'atlas_repainted': False, 'texture_filter': 'Viewer-only bilateral 5x5 sampling, 1.5 texel spacing. Coarse colour boundaries retained; no exported texture edit.',
    'candidate': '05-safe', 'eye_strength': 0.2, 'max_retreat_m': 0.0066722147014271335,
    'remaining': ['Raised eye ridge remains', 'Hair/back texture seams remain', 'No rig or game integration', 'Dense 1,280,368-triangle source topology unchanged', 'Original stored normals retained for unlit viewing'],
    'independent_geometry_audit': {'pairs': 80586, 'local_triangles': 42720, 'source_crossings': 0,
                                 'candidate_crossings': 0, 'new_degenerate': 0, 'normal_reversal': 0,
                                 'scope': 'Same swept-AABB local pairs for source and candidate; includes shared-corner folds; excludes shared-edge and coplanar contacts. Local regression check, not a global self-intersection or watertightness proof.'},
    'viewer_regression': json.loads((MAIN / BASE / 'evidence/viewer-repro.json').read_text()),
    'geometry_audit': json.loads((MAIN / BASE / 'geometry-audit.json').read_text()),
    'receipts': {attempt: json.loads((MAIN / BASE / attempt / 'receipt.json').read_text()) for attempt in notes},
    'files': files
}
(REVIEW / 'evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
print(f'{REVIEW}: {sum(1 + len(o["images"]) for o in options)} comparison captures; all paths exist')
