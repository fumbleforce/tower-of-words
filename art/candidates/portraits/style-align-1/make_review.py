"""Writes reviews/style-align-1/review.json from this round's prompts.json, imgqa reports and the notes below.

Usage: python3 art/candidates/portraits/style-align-1/make_review.py   (after qa_table.py's imgqa folders exist)"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
REL = 'art/candidates/portraits/style-align-1/'
L = json.load(open(os.path.join(HERE, 'prompts.json')))
QA = json.loads(subprocess.run([os.path.expanduser('~/ai/consist/.venv/bin/python'), '-c',
                                'import json,qa_table;print(json.dumps(qa_table.table()))'],
                               cwd=HERE, capture_output=True, text=True, check=True).stdout)
sys.path.insert(0, HERE)
from sheet import ORDER, NAME, step_key, P  # noqa: E402

STEP = {
    'i2i55': 'Step 1 (method test). img2img from the game portrait at denoise 0.55, the portrait\'s own prompt.',
    'i2i70': 'Step 1. Same at denoise 0.70.',
    'stykuro70': 'Step 1. Kuro\'s portrait beside him on one wide canvas, only his half repainted (LLLite inpainting-v2), denoise 0.70.',
    'stymio70': 'Step 1. Same with Mio\'s portrait beside him.',
    'ipakuro70': 'Step 1. img2img 0.70 with the Anima IP-Adapter fed Kuro\'s portrait at 0.4.',
    'n60': 'Step 2. img2img 0.60 with "muscular, muscles, veins, studio ghibli" in the negative.',
    'n60e': 'Step 2. n60 plus ", sharp narrow eyes, pale skin".',
    'n60ek': 'Step 2. n60e with Kuro beside him (as stykuro).',
    'n60l': 'Step 3. n60 plus ", detailed eyes with thick upper lashes".',
    'base': 'Step 4. img2img 0.60 from the game portrait, the portrait\'s own prompt, Jørgen\'s group-1 notes in the negative (blush where the approved portrait has none).',
    'ink': 'Step 4. base plus one style phrase from the anchors: ", high contrast, deep black shadows".',
    'ink75': 'Step 5. ink at denoise 0.75 instead of 0.60.',
    'm35': 'Milder Mio. img2img of her game portrait at denoise 0.35, no new words; her frame and eyes pasted back from the portrait.',
    'm45': 'Milder Mio. Same at denoise 0.45.',
    'm45s': 'Milder Mio. m45 plus ", soft shading".',
}
# what I see on each (checked by eye at full size), by name or by "<who>-<step>" for both seeds
SEEN = {
    'kenji-i2i55': 'Still him; orange skin gone, cooler shading. Arms muscular.',
    'kenji-i2i70': 'Still him, arms more muscular.',
    'kenji-stykuro70-2001': 'Turns into someone else: slimmer, grinning, brown hair.',
    'kenji-stykuro70-2002': 'Round face kept, but a white streak in his hair.',
    'kenji-stymio70-2001': 'Slimmer and athletic, grinning: not him.',
    'kenji-stymio70-2002': 'Round face kept, arms muscular.',
    'kenji-ipakuro70': 'Only Kuro\'s mint background came through, no style.',
    'kenji-n60': 'Round face and build kept, arms still muscular.',
    'kenji-n60e': 'Eyes go blank white and smug: off.',
    'kenji-n60ek': 'Blank or narrow eyes, white hair streak: off.',
    'kenji-n60l': 'Like n60, eyes a little more drawn.',
    'kenji-base': 'Softer arms than n60 (", soft chubby arms"), round face, bedhead, no snack or sticky note.',
    'kenji-ink': 'Like base, a little more contrast in the shirt folds.',
    'kenji-ink75': '2001 keeps him with some arm muscle; 2002 is the roundest and cleanest.',
    'eric-base': 'Ponytail, stubble and silver glasses kept; cleaner line, cooler colour.',
    'eric-ink': 'As base, blazer a little darker.',
    'eric-ink75-2001': 'A grey cast shadow of his head appears on the background (image left).',
    'eric-ink75-2002': 'Face a little longer (drift warn).',
    'mori-base': 'Grey hair, no glasses, wrinkles and age kept, hands in pockets (from the npc-base-1 source), eyes closed in a smile as the source. Skin less brown.',
    'mori-ink': 'As base, suit a little darker.',
    'mori-ink75': 'As ink.',
    'emi-base': 'Reddish auburn hair on both, glasses kept but the frames come out darker and thicker than her clear tortoiseshell ones.',
    'emi-ink': 'As base.',
    'emi-ink75': 'More blush than her portrait on 2001; red-rim numbers are her red hair on the outline, no red light is visible.',
    'mio-m35': 'Almost the same as her portrait: a few fewer hair highlights.',
    'mio-m45': 'A little milder: fewer hair highlights, less busy hoodie folds. The change is small.',
    'mio-m45s': 'Like m45, hoodie shading a little softer.',
    'aoi-base': 'Pink bob and wink kept; the jacket patch changes to letters (IN, M) and her blush is lighter.',
    'aoi-ink': 'As base.',
    'kuroda-base': 'Receding hair and tired face kept; eyes read as blank white on 2001 and 2002 at small size.',
    'kuroda-ink': 'As base; 2001 is the closest to his face.',
    'guard-base': 'Bald, moustache, glasses kept; the chest tag now reads "POLICE" (garbled text), a belt pouch appears.',
    'guard-ink': 'As base.',
}


def seen(n):
    who, step, seed = n.split('-')
    return SEEN.get(n) or SEEN.get(f'{who}-{step}', '')


def note(n):
    m, q = L[n], QA.get(n, {})
    qa = [f"red rim {q['redrim'] * 100:.1f}% ({q['redrim_status']})"]
    if q.get('glasses'):
        qa.append(f"glasses cover {q['glasses_cover']:.2f}, dE {q['glasses_dE']:.0f} ({q['glasses']})")
    qa.append(f"drift ccip {q['ccip']:.3f} ({q['drift_status']})")
    step = n.split('-')[1]
    parts = [STEP[step], seen(n), 'imgqa: ' + ', '.join(qa) + '.',
             f"rdbtAnima, seed {m['seed']}, denoise {m['d']}, Euler A 30 steps CFG 5. Source {m['source']}."]
    if m.get('canvas'):
        parts.append('Canvas: ' + m['canvas'] + '.')
    if m.get('ip_adapter'):
        parts.append('IP-Adapter: ' + m['ip_adapter'] + '.')
    if m.get('glasses'):
        parts.append('Glasses: ' + m['glasses'] + '.')
    parts.append('Prompt: ' + m['prompt'] + ' | Negative: ' + m['negative'])
    return ' '.join(p for p in parts if p)


def main():
    opts, media = [], [{'image': REL + 'lineup.webp', 'caption': (
        'Top: the current game portraits. Bottom: one aligned attempt per person (the one I would start from; your pick can be any '
        'attempt or "keep current"). Mio\'s and Kuro\'s portraits at both ends as the style reference. Every picture framed the same '
        'way: 597x768, face on Kenji\'s face box.\n'
        'What the anchors do is written down in art/PROMPTS.md, "House portrait style: Mio and Kuro". What the round reached: '
        'every aligned portrait shares one line weight, cool pale skin and a cool grey palette, and Kenji loses the orange skin and '
        'the flat saturated fill. None of the methods brought over the anchors\' heavy black ink shapes: putting Mio or Kuro beside '
        'a character (in-context repaint) or feeding them to the IP-Adapter either changed nothing or changed who the person was, '
        'and the "high contrast, deep black shadows" phrase only darkens the clothes a little. So this is closer to one style, '
        'not yet the Mio/Kuro look.\n'
        'Your notes on group-1 applied to every attempt: Kenji\'s arms (muscles in the negative and ", soft chubby arms"), no '
        'blush where the approved portrait has none, Mio\'s eyes pale tan (pasted back from her portrait), Emi "reddish auburn". '
        'Mori, Hamada and the guard start from the empty-handed repaints in npc-base-1 (still open there), because their game '
        'portraits hold a cup, a briefcase and a clipboard; Kenji\'s snack and sticky note were painted out before rendering.\n'
        'Nothing is installed in the game.')}]
    for who in ORDER:
        names = sorted((n for n in L if L[n]['who'] == who), key=step_key)
        media.append({'image': REL + f'attempts-{who}.webp', 'caption': f'{NAME[who]}: the current portrait, then every attempt in the order made.'})
        media.append({'image': REL + f'imgqa-{who}/imgqa-sheet.webp', 'caption': f'imgqa, {NAME[who]}: the game portrait first, then every attempt (red rim, glasses, drift).'})
        opts.append({'id': f'keep-{who}', 'label': f'{NAME[who]} · keep current', 'image': P.replace(ROOT + '/', '') + f'/{who}-neutral.webp',
                     'note': f'Keep the current game portrait of {NAME[who]}.'})
        for n in names:
            opts.append({'id': n, 'label': f'{NAME[who]} · {n}', 'image': REL + n + '.webp', 'note': note(n)})
    review = {
        'title': 'Style alignment round 1: the cast re-drawn toward Mio and Kuro',
        'date': '2026-09-30',
        'by': 'claude-agent:style-align',
        'status': 'open',
        'question': 'For each person, which one do you want, or keep the current portrait?',
        'multi': True,
        'media': media,
        'options': opts,
        'links': [{'label': 'Earlier: group-portrait-1 (your decision that started this)', 'href': 'bible/#review/group-portrait-1'}],
    }
    os.makedirs(os.path.join(ROOT, 'reviews/style-align-1'), exist_ok=True)
    json.dump(review, open(os.path.join(ROOT, 'reviews/style-align-1/review.json'), 'w'), ensure_ascii=False, indent=1)
    print(len(opts), 'options')


if __name__ == '__main__':
    main()
