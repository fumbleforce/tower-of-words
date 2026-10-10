"""Copied from legacy/proto2/consistency/faces.py. Anime face boxes for a list of images (runs in ~/ai/consist/.venv). Prints JSON {path: [[x0, y0, x1, y1], ...]} sorted left to right."""
import sys, json
from imgutils.detect import detect_faces

out = {}
for p in sys.argv[1:]:
    boxes = [b for b, _, score in detect_faces(p) if score > 0.3]
    out[p] = sorted([list(map(int, b)) for b in boxes], key=lambda b: b[0])
print(json.dumps(out))
