"""idle-driver: a skeleton video for a subtle idle loop of a still portrait (breathing, a slight head tilt, one blink),
the driver for pose-driven Wan 2.2 Fun VACE (tools/characters/steps/vace_loop.py; the animate-still skill).

Built on the picture's own DWPose keypoints, so frame 0 is exactly its pose. Every channel is periodic over the clip and
zero at frame 0, so the last frame equals the first and the clip loops. The head turns about the neck, the shoulders and
everything above them rise with the breath, the hips and the cut at the bottom stay put. The blink closes the upper lid
points of the 68-point face onto the lower lid for a few frames.

  ~/ai/dwpose-venv/bin/python tools/characters/steps/idle_driver.py pose <picture.png> <kp.json>
      DWPose wholebody (rtmlib, CPU) of the picture
  ~/ai/dwpose-venv/bin/python tools/characters/steps/idle_driver.py drive <kp.json> <out dir> [--frames 81] [--breath 4]
          [--tilt 0.8] [--lag 0.6] [--blink 34] [--blink-frames 4]
      out dir/pose/%05d.png (OpenPose colours, body and face, at the picture's size), out dir/kp.json, out dir/driver.mp4
      breath: px the shoulders rise at the top of the breath (one breath per clip); tilt: degrees the head tilts, lagging
      the breath by `lag` rad; blink: the frame the lids are fully closed (0 = no blink)."""
import json, math, os, subprocess, sys
import numpy as np

NOSE, LEYE, REYE, LEAR, REAR, LSH, RSH, LEL, REL, LWR, RWR, LHIP, RHIP = range(13)
FACE0 = 23                               # wholebody: the 68 face points start here
FACE = list(range(23, 91))
# 68-point face: upper lid points and the lower lid points they close onto
LIDS = [(37, 41), (38, 40), (43, 47), (44, 46)]
LIMBS = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14],
         [2, 1], [1, 15], [15, 17], [1, 16], [16, 18], [3, 17], [6, 18]]
COLORS = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85],
          [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255],
          [255, 0, 170], [255, 0, 85]]


def pose(picture, out):
    import cv2
    from rtmlib import Wholebody
    img = cv2.imread(picture)
    wb = Wholebody(mode='performance', backend='onnxruntime', device='cpu', to_openpose=False)
    kp, sc = wb(img)
    k = int(np.argmax(sc[:, :17].mean(1)))
    json.dump({'kp': kp[k].tolist(), 'score': sc[k].tolist(), 'size': [img.shape[1], img.shape[0]], 'picture': picture},
              open(out, 'w'))
    print(out, 'face score', round(float(sc[k, 23:91].mean()), 2))


def rot(p, c, deg):
    a = math.radians(deg)
    d = p - c
    return c + np.stack([d[..., 0] * math.cos(a) - d[..., 1] * math.sin(a), d[..., 0] * math.sin(a) + d[..., 1] * math.cos(a)], -1)


def frames(kp, n, breath, tilt, lag, blink, blink_frames):
    p0 = np.array(kp, float)
    neck = (p0[LSH] + p0[RSH]) / 2
    head = [NOSE, LEYE, REYE, LEAR, REAR] + FACE
    out = []
    for t in range(n):
        u = 2 * math.pi * t / (n - 1)
        b = 0.5 - 0.5 * math.cos(u)                                   # 0 at both ends, 1 mid-clip
        th = tilt * (math.sin(u - lag) + math.sin(lag))               # 0 at both ends
        p = p0.copy()
        up = np.array([0.0, -breath * b])
        for i in (LSH, RSH):
            p[i] = p0[i] + up
        for i in (LEL, REL):
            p[i] = p0[i] + up * 0.5
        p[head] = rot(p0[head], neck, th) + up * 1.1
        if blink:
            c = max(0.0, 1 - abs(t - blink) / (blink_frames / 2))     # 1 at the blink frame, a few frames either side
            c = min(1.0, c * 1.6)
            for a, z in LIDS:
                p[FACE0 + a] = p[FACE0 + a] * (1 - c) + p[FACE0 + z] * c
        out.append(p)
    return out


def to18(kp):
    neck = (kp[LSH] + kp[RSH]) / 2
    order = [NOSE, None, RSH, REL, RWR, LSH, LEL, LWR, RHIP, None, None, LHIP, None, None, REYE, LEYE, REAR, LEAR]
    return [neck if i is None and j == 1 else (None if i is None else kp[i]) for j, i in enumerate(order)]


def draw(kp, W, H):
    import cv2
    img = np.zeros((H, W, 3), np.uint8)
    b = to18(kp)
    for i in range(17):
        a, c = b[LIMBS[i][0] - 1], b[LIMBS[i][1] - 1]
        if a is None or c is None:
            continue
        m = (a + c) / 2
        L = float(np.linalg.norm(a - c))
        ang = math.degrees(math.atan2(a[1] - c[1], a[0] - c[0]))
        poly = cv2.ellipse2Poly((int(m[0]), int(m[1])), (int(L / 2), 4), int(ang), 0, 360, 1)
        cv2.fillConvexPoly(img, poly, [int(x * 0.6) for x in COLORS[i]])
    for i, q in enumerate(b):
        if q is not None:
            cv2.circle(img, (int(round(q[0])), int(round(q[1]))), 4, COLORS[i], -1)
    for q in kp[FACE]:
        cv2.circle(img, (int(round(q[0])), int(round(q[1]))), 2, (255, 255, 255), -1)
    return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)


def drive(kpfile, out, n=81, breath=4.0, tilt=0.8, lag=0.6, blink=34, blink_frames=4):
    import cv2
    src = json.load(open(kpfile))
    W, H = src['size']
    fr = frames(src['kp'], n, breath, tilt, lag, blink, blink_frames)
    os.makedirs(os.path.join(out, 'pose'), exist_ok=True)
    for t, kp in enumerate(fr):
        cv2.imwrite(os.path.join(out, 'pose', f'{t:05d}.png'), draw(kp, W, H))
    json.dump({'frames': [k.tolist() for k in fr], 'settings': dict(n=n, breath=breath, tilt=tilt, lag=lag, blink=blink,
                                                                     blink_frames=blink_frames)},
              open(os.path.join(out, 'kp.json'), 'w'))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '16', '-i', os.path.join(out, 'pose', '%05d.png'),
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '8', os.path.join(out, 'driver.mp4')], check=True)
    print(out, n, 'frames', f'{W}x{H}')


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    if a[0] == 'pose':
        pose(a[1], a[2])
    elif a[0] == 'drive':
        opts = {}
        rest = a[3:]
        for i in range(0, len(rest), 2):
            k = rest[i].lstrip('-').replace('-', '_')
            opts[k] = int(rest[i + 1]) if k in ('frames', 'blink', 'blink_frames') else float(rest[i + 1])
        if 'frames' in opts:
            opts['n'] = opts.pop('frames')
        drive(a[1], a[2], **opts)
    else:
        raise SystemExit(__doc__)
