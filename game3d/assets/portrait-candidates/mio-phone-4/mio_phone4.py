"""Mio phone portrait, round 4: round 3's transplanted frame with the top bar of the left lens whole again.

Jørgen on mio-phone-3: "Every single picture has transparent frame on the top of the left glass."
Cause: composite.py kept "hair" pixels in front of the pasted frame, taken as every dark pixel of the original pick in a
band over the left lens top. There those were her fringe's lower outline and her lash line, which run along the top bar,
so the bar was cut and the face showed through. Fixed in ../mio-phone-3/composite.py (hair_mask): only tall dark runs of the
picture the frame goes onto, where her long lock crosses the right lens, stay in front.
This script runs round 3's jobs (../mio-phone-3/mio_phone3.py) with output here and in art/production/mio-phone-4:
  repaste:<name>   the frame again on round 3's saved bare face (no GPU)
  blendk:<d>:<seed>:<src>   the light masked img2img over the glasses band, her eyes and the frame's core kept (GPU);
                   at 0.2 with the core in the mask it drew fringe shadow streaks across the thin top bar again
  cut <name> ...   BiRefNet-HR matting + tools/matte_refine.py, as in round 3
Usage: ~/ai/consist/.venv/bin/python mio_phone4.py <job> ..."""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(HERE, '..', 'mio-phone-3'))
import mio_phone3 as m3  # noqa: E402

R3 = m3.RAW
m3.RAW = os.path.join(REPO, 'art/production/mio-phone-4')
m3.HERE = HERE
m3.OWNER = 'mio-phone-4'
m3.LOG = os.path.join(HERE, 'log.json')

if __name__ == '__main__':
    os.makedirs(m3.RAW, exist_ok=True)
    if sys.argv[1] == 'cut':
        m3.cut(sys.argv[2:])
        sys.exit()
    for j in sys.argv[1:]:
        k, *a = j.split(':')
        if k == 'repaste':
            m3.job_repaste(a[0], bare_dir=R3)
        elif k == 'blendk':
            m3.job_blend(float(a[0]), int(a[1]), a[2], keep_eyes=True, keep_frame=True)
        print('ok', j, flush=True)
