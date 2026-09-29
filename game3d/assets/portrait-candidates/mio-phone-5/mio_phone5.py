"""Mio phone portrait, round 5: the top bar of HER left lens (the lens on the image's right) made whole.

Jørgen on mio-phone-4: "left from HER perspective, the right glass from our perspective of the image, none of these fixes it".
Cause: in the approved portrait her fringe hangs in front of the top bar of that lens between x 464 and 518, so the
portrait simply has no bar there; the frame cut out of it by colour had a gap, and on ipa7a-1001 (fringe ends higher)
the gap showed her face through the frame. Fixed in ../mio-phone-3/composite.py (fill_hidden_bar): the bar's own
cross-section is continued across the hidden stretch before the frame is warped.
Same jobs as round 4 (../mio-phone-4/mio_phone4.py), output here and in art/production/mio-phone-5.
Usage: ~/ai/consist/.venv/bin/python mio_phone5.py repaste:<name> | blendk:<d>:<seed>:<src> | cut <name> ..."""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(HERE, '..', 'mio-phone-3'))
import mio_phone3 as m3  # noqa: E402

R3 = m3.RAW
m3.RAW = os.path.join(REPO, 'art/production/mio-phone-5')
m3.HERE = HERE
m3.OWNER = 'mio-phone-5'
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
