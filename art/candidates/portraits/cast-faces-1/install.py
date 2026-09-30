"""cast-faces-1: put the picked bases and faces in the game and in art/approved/, and print each neutral's face box.

Game files: game3d/assets/portraits/<game id>-<face>.webp (webp quality 90, RGBA, the framed canvas). Approved copies:
art/approved/<bible id>/<game id>-<base pick>-<face>.webp. The worktree links these paths to the main checkout's
files, so each link is removed before the new file is written.

Run: ~/ai/rmbg/rembg/bin/python install.py [--dry-run]"""
import os, sys, json, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = '/home/jorgen/repo/japanese/art/production/PC/cast-faces-1'
# who in this round -> (game id, bible id, base pick, {face: attempt})
PICKS = {
    'eric': ('eric', 'mc', 'eric-ink-2001', {'neutral': 'neutral', 'surprised': 'eric-surprised-d70-3', 'tired': 'eric-tired-d65-2'}),
    'kenji': ('kenji', 'kenji', 'kenji-ink-2001', {'neutral': 'neutral', 'grin': 'kenji-grin-nb-d80-1', 'sheepish': 'kenji-sheepish-nb-d80-3'}),
    'emi': ('emi', 'emi', 'emi-base-2001', {'neutral': 'neutral'}),
    'aoi': ('aoi', 'aoi', 'aoi-base-2001', {'neutral': 'neutral'}),
    'guard': ('guard', 'ishibashi', 'guard-ink-2001', {'neutral': 'neutral', 'stern': 'guard-stern-d70-1', 'amused': 'guard-amused-d70-1'}),
    'mori': ('mori', 'mori', 'mori-new-713', {'neutral': 'neutral', 'smile': 'mori-smile-d70-3', 'flustered': 'mori-flustered-d70-3'}),
    'hamada': ('kuroda', 'hamada', 'hamada-new-743', {'neutral': 'neutral', 'sleepy': 'hamada-sleepy-d70-2', 'panicked': 'hamada-panicked-d70-2'}),
}


def write(img, path):
    if os.path.islink(path):
        os.unlink(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=90, method=6)


def main(dry):
    neutrals = {}
    for who, (gid, bid, base, faces) in PICKS.items():
        for face, att in faces.items():
            img = Image.open(os.path.join(RAW, f'{who}-{att}-framed.png')).convert('RGBA')
            g = os.path.join(WT, f'game3d/assets/portraits/{gid}-{face}.webp')
            a = os.path.join(WT, f'art/approved/{bid}/{gid}-{base}-{face}.webp')
            print(f'{who}-{att} -> {os.path.relpath(g, WT)}, {os.path.relpath(a, WT)}')
            if not dry:
                write(img, g)
                write(img, a)
            if face == 'neutral':
                neutrals[gid] = g
    r = subprocess.run([os.path.expanduser('~/ai/consist/.venv/bin/python'), '/home/jorgen/repo/japanese/tools/imagegen/faces.py', *neutrals.values()],
                       capture_output=True, text=True, check=True)
    boxes = json.loads(r.stdout.strip().splitlines()[-1])
    for gid, p in neutrals.items():
        b = max(boxes[p], key=lambda b: (b[2] - b[0]) * (b[3] - b[1])) if boxes[p] else None
        print('FACE', gid, Image.open(p).size, b)


if __name__ == '__main__':
    main('--dry-run' in sys.argv)
