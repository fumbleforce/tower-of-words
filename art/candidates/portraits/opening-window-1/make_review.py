"""Writes reviews/opening-window-1/review.json from prompts.json, the imgqa reports and the notes below.
Usage: python3 make_review.py"""
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
REL = 'art/candidates/portraits/opening-window-1/'
QA_DIRS = ['qa-eric', 'qa-mio', 'qa-eric2', 'qa-mio2', 'qa-eric3']   # later ones win

PICKS = {'eric-window': 'eric-flip-4103', 'mio-window-phone': 'miophone-i2i-4201',
         'mio-window-look': 'look-miophone-i2i-4201-4402-d65'}

NOTE = {
    'eric-ipa-4101': 'Seated, looking off to image right. The "morning sunlight" words drew window-light shapes on the background (they cut away).',
    'eric-ipa-4102': 'Seated, looking off to image right; glasses check fails on the far lens (worst part).',
    'eric-ipa-4103': 'Seated, looking off to image right, waist-up with his hands toward his lap. The best of the new poses; lines a little thinner than the approved ink look.',
    'eric-ipa-4104': 'Hair touches the top edge (headroom 0%).',
    'eric-flip-4101': 'Closest to the approved drawing; eyes turned to image right. Glasses colour number is the noisy silver dE.',
    'eric-flip-4102': 'As 4101, a little more smile.',
    'eric-flip-4103': 'MY PICK for eric-window: closest to the approved Eric, turned to his left (image right), eyes on the view, warm light on his face, glasses pass. Cut-out has the far lens and its frame forced solid (it overhangs the background); imgqa\'s matte "frame 1.00" is its fitted frame line landing outside his real far lens, which is turned more than in the approved portrait.',
    'miophone-ipa-4201': 'Near profile, body turned to image left, phone in both hands. Her own frame is not drawn: thin light-gold frames (glasses fail).',
    'miophone-ipa-4202': 'Near profile, the cleanest of the new poses (no chair). Same wrong gold frames; irises come out amber, darker than her light tan.',
    'miophone-ipa-4203': 'A chair back and a table edge came in at the bottom right.',
    'miophone-ipa-4204': 'Gold frames; phone reads well.',
    'miophone-i2i-4201': 'MY PICK for mio-window-phone (with its shot-3 partner): the approved phone picture repainted at 0.55 with the shot\'s words, then her exact frame, lenses and eyes pasted back. Identity and glasses exact, but it stays close to the static portrait: the body is not angled further left, and the morning light barely shows. Hair highlights on top came out greener than the approved near-black.',
    'miophone-i2i-4202': 'As 4201; three small stray bubbles above her head (they would need painting out).',
    'miophone-i2i-4203': 'As 4201.',
    'miophone-ipa3q-4201': 'Batch 2, one phrase changed ("three-quarter view, body angled slightly to the left") to get away from the profile; the same seeds came back nearly the same, still near profile, still gold frames.',
    'miophone-ipa3q-4202': 'Batch 2, as above.',
    'miophone-ipa3q-4203': 'Batch 2; chair again.',
    'miophone-ipa3q-4204': 'Batch 2; chair and table edge again.',
    'miophone-ipa-4202-glasses': 'ipa-4202 with its own frame recoloured to her taupe grey (CPU, shading kept, 1 px thicker). Colour now matches (dE 2); the edges came out stepped.',
    'miophone-ipa-4202-glasses-blend': 'The recolour, then a light masked img2img over the frame (0.25, eyes left out) so it sits in the line work. Her frame shape in side view, her colour and thickness. The glasses check "fail" here is the front-view frame fitted onto a profile; it can\'t match.',
    'look-miophone-ipa-4202-4401-d65': 'Shot 3 on the side view: eyes only repainted. They turn toward us but stay low; it doesn\'t read as looking at the viewer.',
    'look-miophone-ipa-4202-4402-d65': 'As above, another seed.',
    'look-miophone-ipa-4202-4401-d80': 'Denoise 0.8: the same.',
    'look-miophone-i2i-4201-4401-d65': 'Shot 3 on i2i-4201: eyes raised toward the viewer, half-lidded; a little to image right.',
    'look-miophone-i2i-4201-4402-d65': 'MY PICK for mio-window-look: eyes raised straight at the viewer, half-lidded and flat, head still bowed; everything else is pixel-identical to i2i-4201, frame pasted back.',
    'look-miophone-i2i-4201-4401-d80': 'Denoise 0.8: eyes raised, a touch wider.',
    'look-miophone-ipa-4202-4401-d80-side': 'Side view, one phrase changed ("sideways glance at the viewer" for "eyes raised looking up at the viewer"): the iris moves to the corner of her eye, still reads as looking down.',
    'look-miophone-ipa-4202-4402-d80-side': 'As above, another seed. The best side-view look, but weak.',
}


def qa():
    out = {}
    for d in QA_DIRS:
        p = os.path.join(ROOT, 'art/production/opening-window-1', d, 'imgqa.json')
        if os.path.exists(p):
            for img in json.load(open(p))['images'] if 'images' in json.load(open(p)) else []:
                out[os.path.basename(img['path'])] = img
    return out


def qa_line(r):
    if not r:
        return ''
    g = r.get('glasses', {})
    s = f"imgqa {r['status']}: red rim {r['redrim']['value']:.1%}"
    if g:
        s += f", glasses {g['status']} (cover {g['cover']:.2f}, worst {g['worst']:.2f}, dE {g['dE']:.0f})"
    if 'matte' in r:
        s += f", matte {r['matte']['status']} (frame {r['matte'].get('frame', 0):.2f}, holes {r['matte'].get('holes', 0)})"
    s += f", headroom {r['framing']['headroom']:.0%}, drift ccip {r['drift']['ccip']:.3f}"
    return s


def main():
    L = json.load(open(os.path.join(HERE, 'prompts.json')))
    Q = qa()
    seen_prompt = {}
    options = []
    for n, e in L.items():
        f = e['file']
        imgs = [REL + x for x in (n + '-cut.webp',) if os.path.exists(os.path.join(HERE, x))]
        if n == 'miophone-ipa-4202-glasses-blend' and os.path.exists(os.path.join(HERE, 'miophone-ipa-4202-cut.webp')):
            imgs = [REL + 'miophone-ipa-4202-cut.webp']
        if n == 'miophone-ipa-4202':
            imgs = []
        bits = [NOTE.get(n, '')]
        settings = f"{e.get('method')}, seed {e['seed']}, RDBT Anima, euler_ancestral normal, 30 steps, CFG 5"
        for k in ('size', 'ip_adapter', 'source', 'denoise', 'lllite', 'mask', 'glasses'):
            if e.get(k) not in (None, ''):
                settings += f"; {k}: {e[k]}"
        bits.append(settings + '.')
        key = (e['prompt'], e['negative'])
        if key in seen_prompt:
            bits.append(f'Prompt and negative as {seen_prompt[key]}.')
        else:
            seen_prompt[key] = n
            bits.append(f"Prompt: {e['prompt']}  Negative: {e['negative']}")
        ql = qa_line(Q.get(os.path.basename(f)))
        if ql:
            bits.append(ql + '.')
        cq = qa_line(Q.get(n + '-cut.webp'))
        if cq:
            bits.append('Cut-out ' + cq + '.')
        label = f"{e['shot']}: {n}" + ('  (my pick)' if PICKS.get(e['shot']) == n else '')
        o = {'id': n, 'label': label, 'image': f, 'note': ' '.join(b for b in bits if b)}
        if imgs:
            o['images'] = imgs
        options.append(o)
    options.append({'id': 'redo', 'label': 'Redo it (say what to change)'})
    review = {
        'title': 'Opening window shots, round 1: Eric and Mio seated in the monorail',
        'date': '2026-10-09',
        'updated': '2026-10-09T18:30:00+0200',
        'by': 'art-round agent (opening-window-1)',
        'status': 'open',
        'multi': True,
        'question': 'Which picture should go behind the train window for each of the three shots (Eric looking out, Mio on her phone, Mio looking up at us)?',
        'media': [
            {'image': REL + 'sheet-eric-window.webp', 'caption': 'These are candidate pictures for the opening\'s window shots, to be composited behind the train glass (cut out, on a card behind the side window; the 3D car gives the seat, glass and frame). Your words on the first preview: "the static character portraits dont fit well visually just pasted inside the window, they need dedicated generations". Shot 1, eric-window: the approved portrait first, then every attempt in order. ipa = new render with the Anima IP-Adapter on his approved picture; flip = his approved picture mirrored so he turns to his left (image right), repainted at 0.65.'},
            {'image': REL + 'sheet-mio-window-phone.webp', 'caption': 'Shot 2, mio-window-phone: approved phone picture first, then every attempt in order. ipa = new render (near profile, body to image left) with the IP-Adapter on her approved portrait; i2i = her approved phone picture repainted at 0.55 with her exact frame, lenses and eyes pasted back; ipa3q = one phrase changed to get a three-quarter view (it didn\'t); ipa-4202-glasses = her frame colour fixed on the best side view. My first i2i paste (frame line and eyes only) left the render\'s own silver frame showing as a ghost line, so all three i2i pictures were re-pasted with the whole lens area; the three first shot-3 tries on the ghosted version were redone.'},
            {'image': REL + 'sheet-mio-window-look.webp', 'caption': 'Shot 3, mio-window-look: only her eyes repainted, everything else identical to its shot-2 source (frame pasted back).'},
            {'image': REL + 'sheet-mio-window-look-faces.webp', 'caption': 'Shot 3 close-ups, each beside its source. On the frontal i2i picture the raised eyes read as looking at us; on the side view they don\'t.'},
        ],
        'options': options,
    }
    os.makedirs(os.path.join(ROOT, 'reviews/opening-window-1'), exist_ok=True)
    json.dump(review, open(os.path.join(ROOT, 'reviews/opening-window-1/review.json'), 'w'), ensure_ascii=False, indent=1)
    print('review written', len(options))


if __name__ == '__main__':
    main()
