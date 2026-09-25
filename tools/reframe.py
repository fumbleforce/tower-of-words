"""Reframe approved and picked character portraits whose head, hair or arms touch the frame edge.
Outpaints new headroom and side room with the same model (RDBT Anima, masked img2img), then pastes the original pixels
back over everything except a thin seam band, so the face, outfit and pose stay pixel-identical.

Canvas: 896x1152 -> 1008x1296 (144 px added on top, 56 px on each side; same 7:9 shape). The bottom edge is kept:
these are waist-up sprites and the body is meant to leave the frame there.

Usage: ~/ai/sd/venv/bin/python tools/reframe.py [key ...]   (no args = all)
Output: art/production/RF/<key>.png (full res PNG, gitignored), art/production/RF/<key>-raw.png (before the paste-back)
and art/production/RF/fixed/<key>.webp after --pick (shown on proto2/cast-fixed for review; not approved until Jørgen picks it).
Workflow: tools/workflows/anima-outpaint.json (also copied to ~/ai/workflows)."""
import sys, os, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy
from production import RDBT, N, OUT, load_manifest
from framecheck import check, figure_mask
from locations1 import wait_turn
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FIXED = os.path.join(ROOT, 'art', 'production', 'RF', 'fixed')  # review candidates; nothing is approved until Jørgen picks it
RAW = os.path.join(OUT, 'RF')
TOP, SIDE = 144, 56
SEAM = 40  # px of the original, next to each padded edge, that the model may repaint (so hair continues naturally)
HEADROOM = ', the top of the head inside the frame with empty plain background above it, elbows inside the frame'
WF_DIRS = [os.path.join(ROOT, 'tools', 'workflows'), os.path.expanduser('~/ai/workflows')]

EMI = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe, '
       'anime screenshot, anime coloring, 2d, cel shading, clean lineart, 1girl, solo, Emi, 32, an anime woman from Britain, fair skin, auburn hair, '
       'shoulder-length bob, side-swept bangs parted on the left, warm brown eyes, brown tortoiseshell glasses with clear lenses, '
       'fitted charcoal blazer over a cream silk blouse, charcoal pencil skirt, company lanyard, big open warm smile, '
       'waist-up portrait facing the viewer at a slight angle, plain light grey background, soft even studio light')

# key -> (source png relative to the repo, manifest (batch, name) for the prompt, or a prompt string)
CAST = {
    'emi': ('art/slice/emi2/r3/rdbt/work-41.png', EMI),
    'mc-it-guy': ('art/production/M/02-it-guy-601.png', ('M', '02-it-guy-601')),
    'rei': ('art/production/B/rei-smirk.png', ('B', 'rei-smirk')),
    'mio': ('art/production/B/mio-bored.png', ('B', 'mio-bored')),
    'aoi': ('art/production/B/aoi-grin.png', ('B', 'aoi-grin')),
    'kaori': ('art/production/B/kaori-smile.png', ('B', 'kaori-smile')),
    'kuro': ('art/production/A/luna-s101.png', ('A', 'luna-s101')),
    'kiyoko-camel': ('art/production/D2/kiyoko-camel-201.png', ('D2', 'kiyoko-camel-201')),
    'yuzuki-e': ('art/production/D2/yuzuki-e-201.png', ('D2', 'yuzuki-e-201')),
    'nanami-g': ('art/production/D2/nanami-g-204.png', ('D2', 'nanami-g-204')),
    'nanami-f': ('art/production/D2/nanami-f-201.png', ('D2', 'nanami-f-201')),
    'tsubasa': ('art/production/D2/new-tsubasa-208.png', ('D2', 'new-tsubasa-208')),
    'kanae': ('art/production/D2/new-kanae-212.png', ('D2', 'new-kanae-212')),
    'sumi': ('art/production/D2/new-sumi-201.png', ('D2', 'new-sumi-201')),
    'goro': ('art/production/D2/goro-a-202.png', ('D2', 'goro-a-202')),
    'jun': ('art/production/D2/jun-a-202.png', ('D2', 'jun-a-202')),
    'ishibashi': ('art/production/D2/ishibashi-b-201.png', ('D2', 'ishibashi-b-201')),
    'saki': ('art/production/D2/saki-a-201.png', ('D2', 'saki-a-201')),
}


def prompt_for(spec):
    if isinstance(spec, str):
        return spec, N
    e = next(e for e in load_manifest() if (e['batch'], e['name']) == spec)
    return e['prompt'], e['negative']


def runs(flags, pad=70):
    """Index ranges where flags is True, widened by pad."""
    out, i, n = [], 0, len(flags)
    while i < n:
        if flags[i]:
            j = i
            while j < n and flags[j]:
                j += 1
            out.append((max(0, i - pad), min(n, j + pad)))
            i = j
        else:
            i += 1
    return out


def prepare(src, key, reach=90, dome=70):
    """Pad the source onto the bigger canvas. The new border is filled by stretching the source's own edge pixels
    (so the soft background gradient carries on), and the model only paints where the figure touches an edge:
    above hair that is cut by the top, and beside arms or hair cut by a side. Returns (canvas, mask, original, touched)."""
    im = Image.open(src).convert('RGB')
    w, h = im.size
    a = np.asarray(im).astype(int)
    k = w // 30
    bg = np.median(np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3)]), 0)
    fg = figure_mask(src)
    W, H = w + 2 * SIDE, h + TOP
    # Border fill: each padded side continues the original's background along that edge. The edge profile is taken
    # from background pixels only (figure dilated out, gaps interpolated), smoothed along the edge, then carried
    # outward and faded toward the profile's mean. No streaks from hair, no extrapolation drift.
    fgd = np.asarray(Image.fromarray((fg * 255).astype('uint8')).filter(ImageFilter.MaxFilter(21))) > 0
    def profile(strip, fmask):
        """strip: (n, depth, 3) pixels along an edge; returns (n, 3) smoothed background colour."""
        n = strip.shape[0]
        ok = ~fmask.any(1)
        vals = strip.mean(1)
        if ok.sum() < 2:
            return np.repeat(bg[None], n, 0)
        idx = np.arange(n)
        prof = np.stack([np.interp(idx, idx[ok], vals[ok, ch]) for ch in range(3)], -1)
        k = 9  # light smoothing only: the figure is masked out by rembg, so no hair streaks to hide
        pad = np.pad(prof, ((k // 2, k // 2), (0, 0)), mode='edge')
        return np.stack([np.convolve(pad[:, ch], np.ones(k) / k, mode='valid') for ch in range(3)], -1)
    depth = 12
    ptop = profile(a[:depth].transpose(1, 0, 2), fgd[:depth].T)
    pleft = profile(a[:, :depth], fgd[:, :depth])
    pright = profile(a[:, -depth:], fgd[:, -depth:])
    c = np.zeros((H, W, 3))
    ft = np.linspace(0, 1, TOP)[:, None, None]            # 0 at the new top edge, 1 at the old one
    c[:TOP, SIDE:SIDE + w] = ptop[None] * (0.4 + 0.6 * ft) + ptop.mean(0) * (0.6 - 0.6 * ft)
    fs = np.linspace(0, 1, SIDE)[None, :, None]
    c[TOP:, :SIDE] = pleft[:, None] * (0.4 + 0.6 * fs) + pleft.mean(0) * (0.6 - 0.6 * fs)
    c[TOP:, SIDE + w:] = pright[:, None] * (0.4 + 0.6 * fs[:, ::-1]) + pright.mean(0) * (0.6 - 0.6 * fs[:, ::-1])
    c[:TOP, :SIDE] = c[:TOP, SIDE:SIDE + 1]
    c[:TOP, SIDE + w:] = c[:TOP, SIDE + w - 1:SIDE + w]
    c[TOP:, SIDE:SIDE + w] = a
    canvas = Image.fromarray(c.clip(0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(6))
    canvas.paste(im, (SIDE, TOP))
    # Hair cut by the top edge: pre-draw a rounded crown (a half-ellipse in the hair's own colour with a dark outline)
    # over each cut run, so the model refines a sensible shape at partial denoise instead of inventing one.
    bgc = canvas.copy()
    bgc.paste(im, (SIDE, TOP))
    bgc.save(os.path.join(RAW, f'{key}-bg.png'))
    cd = ImageDraw.Draw(canvas)
    for x0, x1 in runs(fg[:3].any(0), 0):
        if x1 - x0 < 12:
            continue
        cols = a[:6, x0:x1][fg[:6, x0:x1]]
        col = tuple(int(v) for v in np.median(cols, 0)) if len(cols) else (80, 60, 50)
        hd = int(min(dome, 0.22 * (x1 - x0)))
        cd.ellipse((SIDE + x0, TOP - hd, SIDE + x1, TOP + hd), fill=(20, 18, 22))
        cd.ellipse((SIDE + x0 + 4, TOP - hd + 4, SIDE + x1 - 4, TOP + hd), fill=col)
    canvas.paste(im, (SIDE, TOP))
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    touched = []
    # Cut at the top: the model paints the whole top border (one coherent background) and a seam band over the cut hair.
    # Cut at the top: the model paints only a band of `reach` px above the cut hair (plus a seam band over it), so it
    # closes the crown instead of inventing hats, buns or topknots in a big empty space. The rest is fitted background.
    for x0, x1 in runs(fg[:3].any(0), 160):
        d.rectangle((SIDE + x0, TOP - reach, SIDE + x1, TOP + SEAM), fill=255); touched.append('top')
    for y0, y1 in runs(fg[:, :3].any(1), 120):
        d.rectangle((0, TOP + y0, SIDE + SEAM, TOP + y1), fill=255); touched.append('left')
    for y0, y1 in runs(fg[:, -3:].any(1), 120):
        d.rectangle((SIDE + w - SEAM, TOP + y0, W, TOP + y1), fill=255); touched.append('right')
    m = m.filter(ImageFilter.GaussianBlur(20))
    os.makedirs(RAW, exist_ok=True)
    cp, mp = os.path.join(RAW, f'{key}-pad.png'), os.path.join(RAW, f'{key}-mask.png')
    canvas.save(cp)
    m.convert('RGB').save(mp)
    return cp, mp, im, sorted(set(touched))


def workflow(img, mask, prompt, neg, seed, denoise=0.7):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': RDBT, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': img}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': mask, 'channel': 'red'}},
        '14': {'class_type': 'DifferentialDiffusion', 'inputs': {'model': ['1', 0]}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['14', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'reframe'}},
    }


def composite(raw_path, pad_path, mask_path, orig, out_path):
    """Keep the fitted background in the new border and take from the model only what it drew there (hair, sleeves):
    pixels inside the painted zone that differ clearly from the fitted background, with a 2 px soft edge. That keeps
    hair edges crisp and avoids a visible patch where the model's background shade differs. Then the original pixels
    go back on top; only a SEAM band along the padded edges blends into the new paint."""
    base = Image.open(pad_path.replace('-pad.png', '-bg.png')).convert('RGB')
    if raw_path:
        R = np.asarray(Image.open(raw_path).convert('RGB')).astype(float)
        F = np.asarray(base).astype(float)
        zone = np.asarray(Image.open(mask_path).convert('L')) > 8
        drawn = (np.abs(R - F).sum(2) > 48) & zone
        a = Image.fromarray((drawn * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
        a = np.asarray(a).astype(float)[..., None] / 255
        base = Image.fromarray((F * (1 - a) + R * a).clip(0, 255).astype('uint8'))
    w, h = orig.size
    alpha = Image.new('L', (w, h), 0)
    ImageDraw.Draw(alpha).rectangle((SEAM // 2, SEAM // 2, w - SEAM // 2, h + 50), fill=255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(SEAM // 5))
    base.paste(orig, (SIDE, TOP), alpha)
    base.save(out_path)
    # Identity check: everything more than SEAM px inside the old frame must be unchanged.
    a = np.asarray(base.crop((SIDE + SEAM, TOP + SEAM, SIDE + w - SEAM, TOP + h))).astype(int)
    b = np.asarray(orig.crop((SEAM, SEAM, w - SEAM, h))).astype(int)
    return int(np.abs(a - b).max())


# Per-character options: reach = how far above the old top edge the model may paint (tall hairstyles need more);
# neg = extra negatives. Default negatives stop the model adding headwear or buns that aren't part of the design.
# top/side: a bigger canvas for tall hairstyles (same 7:9 shape).
OPTS = {'rei': dict(top=256, side=100, reach=256, neg=', hat, headwear, hair bun, second ponytail, ponytail out of frame, pole, stick',
                    pos=', a high ponytail tied at the crown with a plain dark hair tie, its long tail falling down behind her right shoulder'),
        'kuro': dict(top=256, side=100, reach=256, neg=', hat, headwear, extra hair ornaments')}
DEFAULT_NEG = ', hat, headwear, cap, hair bun, topknot, updo, hair ornament, ahoge'


def reframe(key, seed=301):
    """One attempt with one seed. Returns the output path."""
    src_rel, spec = CAST[key]
    opt = OPTS.get(key, {})
    global TOP, SIDE
    TOP, SIDE = opt.get('top', 144), opt.get('side', 56)
    src = os.path.join(ROOT, src_rel)
    out = os.path.join(RAW, f'{key}-s{seed}.png')
    if os.path.exists(out):
        return out
    os.makedirs(FIXED, exist_ok=True)
    prompt, neg = prompt_for(spec)
    prompt += opt.get('pos', '') + HEADROOM
    neg += ', cropped head, head out of frame, cut off, frame, border, picture frame, second person, ahoge, antenna hair, hair sticking up'
    neg += opt.get('neg', DEFAULT_NEG)
    cp, mp, orig, touched = prepare(src, key, min(opt.get('reach', TOP), TOP), opt.get('dome', 70))
    raw = None
    if touched:  # only call the model when something is cut by an edge
        wf = workflow(comfy.upload(cp), comfy.upload(mp), prompt, neg, seed, opt.get('denoise', 0.7))
        raw = os.path.join(RAW, f'{key}-s{seed}-raw.png')
        wait_turn()
        comfy.run(wf, raw)
        for d in WF_DIRS:
            os.makedirs(d, exist_ok=True)
            json.dump(wf, open(os.path.join(d, 'anima-outpaint.json'), 'w'), indent=1)
    diff = composite(raw, cp, mp, orig, out)
    probs = check(out)
    print('ok', key, 'painted:', ','.join(touched) or 'nothing (background only)', '| max pixel change inside the old frame:', diff,
          '| frame:', '; '.join(probs) or 'clear', flush=True)
    return out


def recomposite(key, seed):
    """Rebuild the border fill and composite for an existing candidate from its saved raw render (no GPU)."""
    global TOP, SIDE
    opt = OPTS.get(key, {})
    TOP, SIDE = opt.get('top', 144), opt.get('side', 56)
    src = os.path.join(ROOT, CAST[key][0])
    cp, mp, orig, touched = prepare(src, key, min(opt.get('reach', TOP), TOP), opt.get('dome', 70))
    raw = os.path.join(RAW, f'{key}-s{seed}-raw.png')
    out = os.path.join(RAW, f'{key}-s{seed}.png')
    diff = composite(raw if touched and os.path.exists(raw) else None, cp, mp, orig, out)
    print('recomposited', key, seed, 'max change inside old frame:', diff, '| frame:', '; '.join(check(out)) or 'clear', flush=True)


def pick(key, seed):
    """Make one candidate the reviewed version: art/production/RF/<key>.png and art/production/RF/fixed/<key>.webp."""
    src = os.path.join(RAW, f'{key}-s{seed}.png')
    shutil.copy(src, os.path.join(RAW, f'{key}.png'))
    os.makedirs(FIXED, exist_ok=True)
    Image.open(src).save(os.path.join(FIXED, f'{key}.webp'), quality=95)
    print('picked', key, seed)


if __name__ == '__main__':
    # reframe.py [key[:seed,seed...] ...]    render candidates (default seed 301)
    # reframe.py --pick key:seed ...         make a candidate the fixed version
    args = sys.argv[1:]
    if args[:1] == ['--recomposite']:
        for a in args[1:]:
            k, ss = a.split(':')
            for x in ss.split(','):
                recomposite(k, int(x))
        sys.exit()
    if args[:1] == ['--pick']:
        for a in args[1:]:
            k, s = a.split(':'); pick(k, int(s))
        sys.exit()
    for k in args or list(CAST):
        seeds = [301]
        if ':' in k:
            k, s = k.split(':'); seeds = [int(x) for x in s.split(',')]
        for s in seeds:
            reframe(k, s)
