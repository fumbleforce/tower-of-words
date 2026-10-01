"""aoi-edge-2: write reviews/aoi-edge-2/review.json from prompts.json and imgqa.json (every attempt, in the order made).

Run: python3 make_review.py   (from anywhere; writes into the checkout this file is in)"""
import os, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
R = 'art/candidates/portraits/aoi-edge-2/'
ORDER = ['recut', 'inp-d50-s1', 'inp-d65-s1', 'inp-d80-s1', 'dark-d65-s1', 'dark-d80-s1',
         'fill-d50-s1', 'fill-d65-s1', 'fill-d50-s2', 'fill-d65-s2']
WHAT = {
    'recut': 'No model: the cut-out trimmed inward past the cream band (smoothed 2 px) and a 3 px dark outline drawn on the new '
             'edge. Her silhouette gets thinner on her left (image right), and the top of the collar on that side is cut away.',
    'inp': 'RDBT redraws only the band at denoise {d}, on the render\'s own light grey background. The model paints the light '
           'rim back.',
    'dark': 'As the inp attempt at denoise {d}, with one change: she is put on the game\'s dark colour before the redraw. The '
            'light rim still comes back.',
    'fill': 'Before the redraw, the band is filled with the nearest hair pink or jacket teal (the aoi-edge-1 fill, which on '
            'its own looked smeared), then RDBT redraws only the band at denoise {d}, seed {s}. The cream is gone; the dark '
            'outline is kept.',
}


def main():
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    qa = {os.path.basename(i['path']): i for i in json.load(open(os.path.join(HERE, 'imgqa.json')))['images']}
    prompt = log['inp-d50-s1']['prompt']
    neg = log['inp-d50-s1']['negative']
    opts = []
    for n in ORDER:
        e = log[n]
        q = qa[f'aoi-{n}.webp']
        rim = f"Red rim {q['redrim']['value'] * 100:.1f}% ({q['redrim']['status']})"
        if n.startswith('fill') or n == 'recut':
            rim += '; the flagged pixels are her pink hair meeting the outline and the pink cuff stripes, not a red line'
        kind = n.split('-')[0]
        text = WHAT[kind].format(d=e.get('denoise'), s=e.get('seed'))
        settings = '' if kind == 'recut' else f" Seed {e['seed']}, denoise {e['denoise']}, {e['settings']}. Prompt: {prompt} Negative: {neg}"
        opts.append(dict(
            id=n, label=f'aoi-edge-2 {n}', image=R + f'closeup-{n}.webp',
            images=[R + f'aoi-{n}.webp', R + f'ingame-1366x860-{n}.webp', R + f'ingame-390x844-{n}.webp'],
            note=f'{text}{settings} {rim}. Face drift ccip {q["drift"]["ccip"]:.3f} ({q["drift"]["status"]}). Pictures: close-ups at 100% '
                 'beside the original on the dark colour, the game file, the game at 1366x860 and at 390x844.'))
    item = {
        'title': "Aoi's cream edge, second try",
        'date': '2026-10-01',
        'by': 'claude-agent:aoi-edge-2',
        'status': 'open',
        'question': "Which of these, if any, should replace Aoi's portrait in the game?",
        'multi': False,
        'media': [
            dict(image=R + 'sheet.webp', caption='Every attempt in order, at game size on the dark colour; 0 is the portrait in '
                                                  'the game now (the one from before aoi-edge-1, put back after "oh no this '
                                                  'looks very bad, very distorted and ugly").'),
            dict(image=R + 'ingame-1366x860-original.webp', caption='In the game now, 1366x860: the cream band on her left '
                                                                    '(image right).'),
            dict(image=R + 'ingame-390x844-original.webp', caption='In the game now, 390x844.'),
        ],
        'options': opts,
        'links': [{'label': 'Showcase aoi-edge-1 (the smeared fix, taken out)', 'href': 'bible/#showcase/aoi-edge-1'}],
    }
    out = os.path.join(ROOT, 'reviews/aoi-edge-2/review.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(item, open(out, 'w'), indent=1, ensure_ascii=False)
    print(out)


if __name__ == '__main__':
    main()
