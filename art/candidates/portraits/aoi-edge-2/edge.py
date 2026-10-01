"""aoi-edge-2: take the cream rim off Aoi's left side (image right) cleanly, every attempt kept for Review aoi-edge-2.

Brief (#133, Jørgen on Showcase aoi-edge-1: "oh no this looks very bad, very distorted and ugly"). aoi-edge-1 repainted the
band pixel by pixel from neighbouring colours (art/candidates/portraits/aoi-edge-1/fix.py), which smeared it. The game
has the portrait from before that again (commit 9ee41134). The cream band itself is painted into the render (a rim light,
cast-faces-1 base-aoi.png), so it is either redrawn by the model or cut away. One change per attempt:

  recut      no model: the matte is cut inward past the band (smoothed), and a dark outline is drawn on the new edge.
  inp-dNN    RDBT masked img2img of the whole 960x1216 source canvas, only inside the band (band.py, grown 3 px, the dark
             outer outline left out), at denoise 0.NN, Aoi's own prompt from style-align-1 (aoi-base-2001). The
             source's light grey background stays.
  dark-dNN   as inp-dNN, with one change: the figure is put on the game's dark colour first, so the model sees a dark
             background around her.
  fill-dNN   as inp-dNN, with one change: in the init the band is first filled with the nearest hair or jacket colour
             (the aoi-edge-1 idea, which alone left a smeared edge), so the model redraws pink and teal, not cream.

Every result keeps the cut-out's alpha (recut excepted) and is framed for the game exactly like cast-faces-1 (post.place).
Staging note (checking only): the base's shot is fixed; waist-up, three-quarter turn, plain background, soft even light
from the front, no light from behind. Only the band area changes.

Run: ~/ai/consist/.venv/bin/python edge.py recut | inp:<denoise>:<seed> | dark:<denoise>:<seed> | fill:<denoise>:<seed> ...
Raw PNGs: art/production/PC/aoi-edge-2/ (git-ignored); webp copies and prompts.json here."""
import os, sys, json, importlib.util
import numpy as np, cv2
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(ROOT, 'tools'))
sys.path.insert(0, HERE)
import band as B

OWNER = 'claude-agent:aoi-edge-2'
RAW = B.OUT
LOG = os.path.join(HERE, 'prompts.json')
DARK = (18, 20, 28)
OUTLINE = (10, 8, 10)
PROMPT = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
          'anime screenshot, anime coloring, 2d, cel shading, clean lineart, safe, 1girl, solo, Aoi, a 22-year-old woman, '
          'slim with small breasts, shoulder-length pink-dyed hair with dark roots, oversized varsity jacket over a white top, '
          'company lanyard, playful grin, winking, waist-up portrait facing the viewer at a slight angle, plain light grey '
          'background, soft even studio light')
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, '
       'bad hands, missing fingers, extra fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, '
       'signature, 3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli, fat, obese, '
       '(rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, '
       'cup, phone, papers, book, briefcase, bag, clipboard')


def post_mod():
    """cast-faces-1/post.py, for place() (the game framing) without copying it."""
    d = os.path.join(HERE, '../cast-faces-1')
    sys.path.insert(0, d)
    spec = importlib.util.spec_from_file_location('cf1_post', os.path.join(d, 'post.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    sys.path.remove(d)
    return m


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def log(name, entry):
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = entry
    json.dump(L, open(LOG, 'w'), indent=1, ensure_ascii=False)


def repaint_mask(rgb, a):
    """The band grown 3 px, the dark outer outline left out; 0..255."""
    m = cv2.dilate(B.band(rgb, a).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    m &= ~B.outline(rgb, a) & (a > 0)
    return (m * 255).astype(np.uint8)


def save(name, rgba, entry):
    full = os.path.join(RAW, f'{name}-canvas.png')
    rgba.save(full)
    framed = post_mod().place('aoi', rgba)
    framed.save(os.path.join(RAW, f'{name}-framed.png'))
    framed.save(os.path.join(HERE, f'aoi-{name}.webp'), 'WEBP', quality=90, method=6)
    log(name, entry)
    print('saved', name)


def recut():
    rgb, a = B.load()
    band = B.band(rgb, a)
    keep = (a >= 128) & ~cv2.dilate(band.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    # everything outside the band's inner edge goes too (the outline beyond it), only where the band is
    zone = cv2.dilate(band.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
    d_out = cv2.distanceTransform((a >= 128).astype(np.uint8), cv2.DIST_L2, 5)
    d_band = cv2.distanceTransform((~band).astype(np.uint8), cv2.DIST_L2, 5)
    beyond = zone & (d_out < d_band + 1) & ~band   # pixels nearer the outside than the band's inner side
    keep &= ~(beyond & zone & (d_out <= 10))
    # smooth the new edge inside the zone so it follows the hair and cloth shapes, not the pixel run
    k = (keep * 255).astype(np.uint8)
    sm = cv2.GaussianBlur(k, (0, 0), 2.0)
    new_a = np.where(zone, sm, a.astype(np.float32))
    new_a = np.where(zone, np.clip((new_a - 64) * 2, 0, 255), new_a).astype(np.uint8)
    new_a = np.minimum(new_a, a)
    # the dark outline: 3 px inside the new edge, in the zone
    solid = new_a >= 128
    d_in = cv2.distanceTransform(solid.astype(np.uint8), cv2.DIST_L2, 5)
    line = zone & solid & (d_in <= 3.0)
    out = np.array(Image.open(B.CUT).convert('RGB'))   # the cut-out's own colours
    w = np.clip(3.5 - d_in, 0, 1)[..., None] * (zone & solid)[..., None]
    out = (out * (1 - w) + np.array(OUTLINE) * w).astype(np.uint8)
    edge_soft = zone & ~solid & (new_a > 0)
    out[edge_soft] = OUTLINE
    rgba = Image.fromarray(np.dstack([out, new_a]))
    save('recut', rgba, dict(kind='recut', note='matte cut inward past the band, 2 px smoothing, 3 px dark outline drawn on the new edge; no model'))


def prefill(rgb, a):
    """The band (grown 2 px) filled from the nearest opaque pixel that is neither band nor dark outline, blurred inside."""
    from scipy import ndimage
    band = cv2.dilate(B.band(rgb, a).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    band &= ~B.outline(rgb, a)
    lum = (rgb[..., 0] * 299 + rgb[..., 1] * 587 + rgb[..., 2] * 114) // 1000
    known = (a == 255) & ~band & (lum >= 30)
    _, (iy, ix) = ndimage.distance_transform_edt(~known, return_indices=True)
    fill = rgb[iy, ix].astype(np.float32)
    w = band.astype(np.float32)
    fill = cv2.GaussianBlur(fill * w[..., None], (0, 0), 3) / np.maximum(cv2.GaussianBlur(w, (0, 0), 3), 1e-6)[..., None]
    out = rgb.astype(np.float32).copy()
    out[band] = fill[band]
    return np.clip(out, 0, 255).astype(np.uint8)


def init_image(kind, rgb, a):
    if kind == 'dark':
        cut = Image.fromarray(np.dstack([rgb.astype(np.uint8), a]))
        bg = Image.new('RGB', cut.size, DARK)
        bg.paste(cut, (0, 0), cut)
        return bg
    if kind == 'fill':
        return Image.fromarray(prefill(rgb, a))
    return Image.fromarray(rgb.astype(np.uint8))


def compose(raw_png, m):
    """The model's pixels inside the repaint mask (1.5 px feather) over the cut-out's own colours; the cut-out's alpha."""
    cut = np.array(Image.open(B.CUT).convert('RGBA'))
    new = np.array(Image.open(raw_png).convert('RGB').resize((cut.shape[1], cut.shape[0]), Image.LANCZOS)).astype(np.float32)
    w = np.asarray(Image.fromarray(m).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)[..., None] / 255
    out = (new * w + cut[..., :3].astype(np.float32) * (1 - w)).astype(np.uint8)
    return Image.fromarray(np.dstack([out, cut[..., 3]]))


def inpaint(kind, denoise, seed):
    import comfy
    from portrait_candidates import inpaint_wf
    rgb, a = B.load()
    name = f'{kind}-d{int(round(denoise * 100))}-s{seed}'
    if os.path.exists(os.path.join(RAW, f'{name}-raw.png')):   # rendered before: only compose again
        m = repaint_mask(rgb, a)
        rgba = compose(os.path.join(RAW, f'{name}-raw.png'), m)
        save(name, rgba, json.load(open(LOG))[name])
        return
    check_lock()
    init = init_image(kind, rgb, a)
    m = repaint_mask(rgb, a)
    ip, mp = os.path.join(RAW, f'init-{kind}.png'), os.path.join(RAW, 'mask.png')
    init.save(ip)
    Image.fromarray(m).filter(ImageFilter.GaussianBlur(2)).convert('RGB').save(mp)
    wf = inpaint_wf(ip, mp, PROMPT, seed, denoise, NEG)
    tmp = os.path.join(RAW, f'{name}-raw.png')
    comfy.run(wf, tmp)
    json.dump(wf, open(os.path.join(RAW, 'workflow-aoi-edge-2.json'), 'w'), indent=1)
    rgba = compose(tmp, m)
    save(name, rgba, dict(kind=kind, denoise=denoise, seed=seed, model='rdbtAnima', prompt=PROMPT, negative=NEG,
                          settings='euler_ancestral normal, 30 steps, CFG 5, DifferentialDiffusion, full 960x1216 canvas, '
                                   'mask = band grown 3 px minus the outer outline, 2 px blur; pasted back through it'))


if __name__ == '__main__':
    for arg in sys.argv[1:]:
        if arg == 'recut':
            recut()
        else:
            k, d, s = arg.split(':')
            inpaint(k, float(d), int(s))
