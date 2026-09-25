"""Cast decision round 2, second pass (RDBT). Output: art/production/D2/<name>.png, logged in the production manifest.
- Yuzuki: img2img from yuzuki-c-202 at 0.88 with new long hair and a flat chest (outfit, pose and framing stay).
- Kiyoko: s101 face kept by a latent noise mask, new non-black outfits.
- Nanami: fresh concepts (text to image).
- Office: option 2 widened (zoomed out), mid-wall window painted over and a high window drawn in, then img2img.
- New women: extra character options with small or flat chests.
Usage: ~/ai/sd/venv/bin/python tools/decide2b.py [prefix ...]"""
import sys, os, json, shutil
sys.path.insert(0, os.path.dirname(__file__))
from production import run, portrait, N, RDBT, OUT
from decide2 import img2img, kiyoko_mask, KIYOKO_DESC
from office_bg import P as OFFICE_P, N as OFFICE_N
from PIL import Image, ImageDraw, ImageFilter

B = 'D2'
FLAT = 'flat chest, small breasts, slim petite torso'
FLAT_N = N + ', large breasts, huge breasts, medium breasts, cleavage, busty, curvy'

# Yuzuki: keep c-202 (mustard corduroy blazer, white turtleneck, hoops, coffee, mole on chin) and change the hair.
# Emi = auburn bob + glasses; other short/bob women: Saki, Kiyoko, Aoi. So long hair only, colours not used by the cast.
YUZ_BASE = ('Yuzuki, a 31-year-old company PR spokeswoman, athletic lean build, a long neck, a small mole on her chin, no glasses, '
            'a structured mustard-yellow corduroy blazer over a white turtleneck, silver hoop earrings, holding a paper cup of coffee in her right hand, '
            + FLAT + ', ')
YUZUKI = {
    'yuzuki-d': 'very long straight dark chocolate-brown hair with a deep side part, one side tucked behind her ear, hair falling past her shoulders',
    'yuzuki-e': 'long honey-blonde hair gathered in a low loose ponytail draped over her left shoulder, a few loose strands framing her face',
    'yuzuki-f': 'long wavy deep navy-blue hair worn half-up with a small clip, the rest flowing down her back',
    'yuzuki-g': 'long light chestnut-brown hair with loose waves, parted in the middle, falling over both shoulders',
}

# Kiyoko: not black, more interesting than a plain dress.
KIYOKO2 = {
    'kiyoko-plum': 'a deep-plum haori-style long jacket with a subtle woven crane pattern over a dove-grey high-collar blouse, a wide obi-style sash belt, jade drop earrings',
    'kiyoko-ivory': 'an ivory structured tailored suit with sharp shoulders and a vermilion red silk obi-style belt, a vermilion pocket square, pearl earrings',
    'kiyoko-teal': 'a deep peacock-teal silk wrap dress with a high crossed kimono collar and a gold geometric brooch, a slate-grey tailored coat draped over her shoulders',
    'kiyoko-camel': 'a camel-coloured double-breasted coat dress with brass buttons, a patterned indigo-and-rust silk scarf knotted at her throat, gold earrings',
}

# Nanami: earlier takes were the stoic tactical security woman in navy/black. New takes use real Japanese building-security jobs.
NANAMI = {
    'nanami-d': ('Nanami, a 29-year-old officer in the company disaster-prevention centre: short light-brown hair tucked under a plain beige work cap with no badge, '
                 'a (sand-beige khaki work uniform:1.4) with plain unmarked pockets, an orange armband on her left sleeve, a coiled fire-hose key and a torch on her belt, '
                 'holding an emergency drill checklist on a clipboard in her left hand', 'dry, matter-of-fact look, slightly bored'),
    'nanami-e': ('Nanami, a 29-year-old traffic guard at the company construction gate: long dark-brown hair in a low ponytail under a white safety helmet, '
                 'a pale grey-blue guard uniform under a lime reflective safety vest, white gloves, holding a red light baton in her right hand at her side',
                 'cheerful, sunburnt cheeks, squinting a little in the sun'),
    'nanami-f': ('Nanami, a 29-year-old night-shift CCTV operator in the company security room: shaggy shoulder-length dark plum-brown hair, '
                 'a headset around her neck, an oversized light-grey cardigan over a pale blue security polo shirt, a plain unlabelled silver drink can in her left hand',
                 'sleepy half-closed eyes, a faint smile'),
    'nanami-g': ('Nanami, a 29-year-old clerk at the company ID-card and access-control desk: mocha-brown hair in a neat low bun with a pencil through it, '
                 'a Japanese office uniform: a (dusty-pink waistcoat:1.5) and matching dusty-pink skirt over a white blouse with a small ribbon tie, '
                 'holding a blank white plastic card with nothing printed on it up in her right hand',
                 'polite smile with sharp, assessing eyes'),
}

# New women. Real jobs and real Japanese fashion as the starting point.
NEW = {
    'new-tsubasa': ('(a woman:1.5), Tsubasa, a 27-year-old long-distance runner on the company ekiden team who also works in General Affairs: '
                    '(feminine face:1.3), long eyelashes, light makeup, small stud earrings, short light-brown hair tied back in a tiny stubby ponytail with two hairpins, '
                    'lightly tanned skin, a lean wiry runner build, a (plain royal-blue:1.4) track jacket with no text with white stripes on the sleeves half unzipped over a plain white T-shirt, '
                    'a black sports watch on her left wrist, holding a stopwatch in her right hand', 'calm, calculating look, reading the stopwatch'),
    'new-fumiko': ('Fumiko, a 34-year-old full-time officer of the company labour union: fluffy permed shoulder-length milk-tea beige hair, '
                   'no glasses, mori-girl layered style: an oatmeal linen smock dress under a long rust-orange knitted cardigan, a wooden bead necklace, '
                   'holding a thick ring binder against her hip with her left hand', 'mild, patient smile, eyes that are keeping count'),
    'new-chihiro': ('Chihiro, a 26-year-old accounts-payable clerk who checks every expense receipt: black hair with lavender inner-colour dye '
                    'showing underneath, tied in two low buns, a lavender cardigan over a white blouse, a lavender enamel pin, '
                    'a clear tote bag covered in plain lavender badges held by the strap in her left hand, a red pen in her right hand',
                    'bright, cheerful and ruthless smile'),
    'new-kanae': ('Kanae, a 30-year-old photographer for the company newsletter: bleached yellow-blonde wolf-cut hair, a small silver nose stud, '
                  'streetwear: an oversized plain safety-orange work jacket with no patches over a grey hoodie, a long black pleated skirt and chunky sneakers, '
                  'a film camera on a strap held up in both hands', 'bossy, squinting at the viewer as if framing a shot'),
    'new-sumi': ('Sumi, a 24-year-old in-house calligrapher in General Affairs who brush-writes certificates, condolence envelopes and event banners: '
                 'dark-brown hair in two short low pigtails with straight-cut bangs, retro style: a tomato-red knitted vest over a cream shirt '
                 'with the sleeves rolled up, high-waisted wide brown-grey trousers, black ink smudges on her fingers, '
                 'holding a large calligraphy brush in her right hand, her left hand on her hip', 'impatient, focused frown'),
}


def yuzuki_mask():
    # White = repaint (head, hair and shoulders so long hair can fall over them), black = keep (blazer, hands, cup).
    p = os.path.join(OUT, B, 'yuzuki-mask.png')
    m = Image.new('L', (896, 1152), 0)
    d = ImageDraw.Draw(m)
    d.rectangle((0, 0, 896, 770), fill=255)
    m.filter(ImageFilter.GaussianBlur(24)).convert('RGB').save(p)
    return p


def office_source():
    """Widen option 2 (zoom out with a mirrored border), paint over the mid-wall window, and draw a high narrow window near the ceiling."""
    p = os.path.join(OUT, B, 'office-src.png')
    src = Image.open(os.path.join(OUT, 'O', 'office-basement-502.png')).convert('RGB')
    W, H = src.size
    # Cover the window at the back (approx 0.445..0.575 x, 0.35..0.56 y) with a patch of back wall from beside it.
    x0, y0, x1, y1 = int(W * .44), int(H * .35), int(W * .58), int(H * .565)
    patch = src.crop((x0 - (x1 - x0) - 10, y0, x0 - 10, y1)).transpose(Image.FLIP_LEFT_RIGHT)
    src.paste(patch, (x0, y0))
    d = ImageDraw.Draw(src)
    # High frosted window on the back wall, just under the ceiling line, with a frame and two mullions.
    wx0, wy0, wx1, wy1 = int(W * .43), int(H * .305), int(W * .59), int(H * .355)
    d.rectangle((wx0 - 7, wy0 - 7, wx1 + 7, wy1 + 7), fill=(40, 50, 48))
    d.rectangle((wx0, wy0, wx1, wy1), fill=(158, 176, 172))
    for f in (1 / 3, 2 / 3):
        x = int(wx0 + (wx1 - wx0) * f)
        d.rectangle((x - 3, wy0, x + 3, wy1), fill=(40, 50, 48))
    # Zoom out: shrink to 80% inside a mirrored copy of itself, so the room gets more floor and wall. The border is repainted later.
    s = 0.8
    small = src.resize((int(W * s), int(H * s)), Image.LANCZOS)
    big = Image.new('RGB', (small.width * 3, small.height * 3))
    for i in range(3):
        for j in range(3):
            t = small
            if i != 1: t = t.transpose(Image.FLIP_LEFT_RIGHT)
            if j != 1: t = t.transpose(Image.FLIP_TOP_BOTTOM)
            big.paste(t, (i * small.width, j * small.height))
    ox, oy = (W - small.width) // 2, H - small.height - int(H * .05)
    canvas = big.crop((small.width - ox, small.height - oy, small.width - ox + W, small.height - oy + H))
    m = Image.new('L', (W, H), 255)
    ImageDraw.Draw(m).rectangle((ox + 30, oy + 30, ox + small.width - 30, oy + small.height - 30), fill=0)
    m.filter(ImageFilter.GaussianBlur(20)).convert('RGB').save(p.replace('src', 'mask'))
    canvas.save(p)
    return p


WF_DIRS = [os.path.join(os.path.dirname(__file__), 'workflows'), os.path.expanduser('~/ai/workflows')]


def save_workflows():
    for d in WF_DIRS[1:]:
        for f in ('anima-img2img.json', 'anima-img2img-masked.json'):
            s = os.path.join(WF_DIRS[0], f)
            if os.path.exists(s):
                shutil.copy(s, os.path.join(d, f))


if __name__ == '__main__':
    only = sys.argv[1:]
    want = lambda n: not only or any(n.startswith(o) for o in only)
    yuz = os.path.join(OUT, B, 'yuzuki-c-202.png')
    for name, hair in YUZUKI.items():
        if want(name):
            neg = FLAT_N + ', short hair, bob cut, pixie cut, glasses, steam, blush, two cups, silver hair, grey hair, red hair, orange hair, auburn hair'
            if name != 'yuzuki-f':
                neg += ', blue hair, streaked hair, multicolored hair'
            for s in (201, 202):
                # Whole image at 0.88: long hair can grow while the outfit, pose, cup and framing stay.
                img2img(B, f'{name}-{s}', yuz, portrait('1girl', YUZ_BASE + hair, 'dry, weary half-smile'), neg, s, 0.88)
    kiyo = os.path.join(OUT, 'A', 'kiyoko-s101.png')
    for name, outfit in KIYOKO2.items():
        if want(name):
            mask = kiyoko_mask()
            for s in ((201,) if name == 'kiyoko-camel' else (201, 202)):  # camel 202 and 203 had seam artefacts at the neck
                img2img(B, f'{name}-{s}', kiyo, portrait('1girl', f'{KIYOKO_DESC} {outfit}', 'calculating half-lidded eyes and a faint smile'),
                        N + ', black dress, black clothes, black outfit, fur stole, fur', s, 0.9, mask)
    for name, (desc, expr) in NANAMI.items():
        if want(name):
            neg = ', lanyard, id badge, name card' if name == 'nanami-g' else ''
            for s in {'nanami-g': (203, 204), 'nanami-f': (201, 203)}.get(name, (201, 202)):
                run(B, f'{name}-{s}', portrait('1girl', desc, expr), N + neg + ', navy uniform, black uniform, tactical vest, logo, letters, name tag, label, badge, speech bubble, thought bubble, green uniform, teal', 896, 1152, s, RDBT)
    for name, (desc, expr) in NEW.items():
        if want(name):
            # Tsubasa and Kanae 201/202 came out looking male and with lettering; Sumi 202 had writing on a sheet.
            seeds = {'new-tsubasa': (207, 208), 'new-kanae': (211, 212), 'new-sumi': (201, 207)}.get(name, (201, 202))
            # The model writes character names onto clothes, so the name is left out of the prompt.
            desc = desc.replace(name.split('-')[1].capitalize() + ', ', '')
            for s in seeds:
                run(B, f'{name}-{s}', portrait('1girl', desc + ('' if name == 'new-kanae' else ', ' + FLAT), expr), FLAT_N + ', 1boy, male, man, androgynous, bishounen, logo, letters, writing on paper, paper, sash, text on clothes, name tag, teal', 896, 1152, s, RDBT)
    if want('office2'):
        src = office_source()
        # Pass 1: repaint the mirrored border only (outpaint), then pass 2 repaints the whole room lightly for coherence.
        wide = os.path.join(OUT, B, 'office-wide.png')
        if not os.path.exists(wide):
            img2img(B, 'office-wide', src, OFFICE_P + ', a wide view of the room', OFFICE_N, 220, 0.92, src.replace('src', 'mask'))
        src = wide
        extra = (', a wider room with open floor space in the middle, several office chairs at the desks and one spare chair, '
                 'empty instant-ramen cups with chopsticks left on the desks, the only window is a small narrow frosted window high up right under the ceiling')
        for s, dn in ((221, .55), (224, .5), (226, .52)):
            img2img(B, f'office2-{s}', src, OFFICE_P + extra, OFFICE_N + ', window in the middle of the wall, door', s, dn)
    save_workflows()
