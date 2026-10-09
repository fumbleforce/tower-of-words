"""Background music, round 5 (#371): one prompt per use, each with its own small band, through Lyria 3 Pro (paid,
Replicate, about $0.08 a piece, logged in tools/spend.json by tools/rep.mjs).

Jørgen on round 4 (Lyria 3 Pro, one shared orchestral prompt): good quality, but "heavy string instruments makes it
sound like an epic ballad", "too much of a victorian era drama", "too much going on", "you must vary the prompts more ...
These are all too similar". So: relaxed everyday background for a slice-of-life game, sparse, a different
instrumentation per use, no strings-heavy or orchestral writing, nothing epic or dramatic, no build to a climax.

    python3 tools/music_round5.py [use ...] [--takes 2] [--dry-run]

Raw files: ~/ai/music-raw/r5/<use>-<n>.mp3, prompts in prompts.json there. Then
MUSIC_ROUND=5 ~/ai/sd/venv/bin/python tools/music_round4_post.py screens them and cuts the loops.
"""
import argparse, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.expanduser('~/ai/music-raw/r5')
COMMON = ('Relaxed everyday background music for a slice-of-life video game, instrumental only, no vocals. Sparse, '
          'unhurried and easy to listen to for a long time. No strings section, no orchestra, nothing epic or '
          'dramatic, no big build-up or climax. About two and a half minutes with small gentle changes, and no '
          'ending: it keeps the same calm level to the end so it can loop.')
PROMPTS = {
    'title': 'Light solo piano with a soft warm synth pad underneath, a simple quiet melody with space between the notes, '
             'like a calm menu screen. 76 BPM.',
    'day': 'Acoustic guitar finger-picking with light hand percussion (shaker, soft cajón) and a little glockenspiel now '
           'and then, bright and easy, a sunny afternoon outside. 98 BPM.',
    'evening': 'Mellow Japanese city pop instrumental: round electric bass, soft Rhodes keys, clean guitar chords and a '
               'laid-back drum groove, the feeling of streetlights coming on. 92 BPM.',
    'office': 'Lo-fi hip hop beat with a dusty soft drum loop and mellow electric piano chords, a little vinyl warmth, '
              'steady and unobtrusive, good for working. 80 BPM.',
    'shops': 'Small jazz combo: brushed snare, upright bass and a light piano or vibraphone, a friendly easy swing, '
             'like a café on a shopping street. 110 BPM.',
}


def prompt(use):
    return f'{PROMPTS[use]} {COMMON}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('uses', nargs='*')
    ap.add_argument('--takes', type=int, default=2)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    pj = f'{RAW}/prompts.json'
    log = json.load(open(pj)) if os.path.exists(pj) else {}
    for use in a.uses or PROMPTS:
        for n in range(1, a.takes + 1):
            name, seed = f'{use}-{n}', 6710 + 100 * list(PROMPTS).index(use) + n
            out = f'{RAW}/{name}.mp3'
            if os.path.exists(out):
                continue
            inp = {'prompt': prompt(use), 'seed': seed}
            if a.dry_run:
                print(name, json.dumps(inp)[:160])
                continue
            r = subprocess.run(['node', f'{ROOT}/tools/rep.mjs', 'google/lyria-3-pro', out, json.dumps(inp)],
                               capture_output=True, text=True, cwd=ROOT)
            print(name, ('FAILED ' + r.stderr.strip()[-200:]) if r.returncode else r.stdout.strip(), flush=True)
            if not r.returncode:
                log[name] = {'model': 'google/lyria-3-pro', **inp}
                json.dump(log, open(pj, 'w'), indent=1)


if __name__ == '__main__':
    main()
