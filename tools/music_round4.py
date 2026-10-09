"""Background music, round 4 (#371): one 2.5 to 3 minute instrumental piece per take from Lyria 3 Pro (Google, paid,
through Replicate; tools/rep.mjs logs every call in tools/spend.json, about $0.08 a piece). The prompt writes one
theme per use as timed sections (statement, variation, interlude, counter-melody, return), so the piece varies
but stays one piece, and asks for an ending that flows back into the opening so it can loop.

Round 3 (local ACE-Step) was rejected: "kindergarden level quality compared to the original full bodied melodic intro
melody". The bar is the current Lyria loops and the YuE2 opening theme. A first try at building pieces from Lyria 2
sections was dropped after 17 clips: Lyria 2 ignores the key and tempo in the prompt, so its 30 s sections came out
in eight different keys for one theme.

    python3 tools/music_round4.py [use ...] [--takes 4] [--first 1] [--dry-run]

Raw files: ~/ai/music-raw/r4/<use>-<n>.<ext>; prompts and seeds in prompts.json there.
Then tools/music_round4_post.py screens, cuts the loops and writes the Review files.
"""
import argparse, concurrent.futures, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.expanduser('~/ai/music-raw/r4')
HOUSE = ('Instrumental background music for a cozy Japanese slice-of-life anime game. Warm, melodic, full-bodied '
         'anime soundtrack with a memorable lead melody and rich chords, polished studio recording. No vocals, no '
         'singing, no choir, no humming.')
# use: (what it is, ensemble, mood, key, bpm, lead, second voice, counter-melody voice)
THEMES = {
    'title': ('the title menu theme', 'piano, string section, soft synth pad, light harp', 'hopeful, gentle, sweeping, a new start on an island at sunrise', 'D major', 84, 'piano', 'violins', 'cello'),
    'morning': ('morning and work-day music outdoors', 'piano, acoustic guitar, light strings, glockenspiel, soft drums, bass', 'bright, fresh, cheerful but calm, a sunny morning walk to work', 'G major', 100, 'piano', 'flute', 'acoustic guitar'),
    'evening': ('evening music after work', 'Rhodes electric piano, acoustic guitar, warm strings, soft brushed drums, bass', 'nostalgic, warm, wistful, a sunset after work', 'F major', 88, 'Rhodes electric piano', 'clean electric guitar', 'strings'),
    'night': ('late-evening music at the dorms', 'piano, upright bass, brushed drums, soft strings, vibraphone', 'quiet, intimate, peaceful, a relaxed jazz ballad', 'E-flat major', 72, 'piano', 'vibraphone', 'soft strings'),
    'office': ('music inside the office', 'electric piano, marimba, soft drums, bass, light strings', 'focused, light, steady, a busy but friendly office', 'C major', 96, 'electric piano', 'marimba', 'strings'),
    'shops': ('music for a covered shopping street', 'acoustic guitar, marimba, piano, bass, light drums, hand claps', 'cheerful, bustling, friendly', 'A major', 108, 'marimba', 'acoustic guitar', 'piano'),
    'harbour': ('music for a small seaside harbour', 'acoustic guitar, piano, string section, soft drums, bass', 'airy, breezy, open, boats and gulls', 'B-flat major', 90, 'acoustic guitar', 'flute', 'strings'),
}


def prompt(use):
    what, ens, mood, key, bpm, lead, second, counter = THEMES[use]
    return (f'{HOUSE} This is {what}: {mood}. Instruments: {ens}. {key}, {bpm} BPM, 4/4, one steady tempo and key '
            f'throughout. Structure: [0:00 - 0:30] the main melody, played simply on the {lead}, the ensemble soft '
            f'underneath. [0:30 - 1:00] the {second} take the same melody, fuller accompaniment. [1:00 - 1:30] a calmer '
            f'interlude: sparse {lead}, the melody in fragments over new chords. [1:30 - 2:00] a counter-melody on the '
            f'{counter} over the main chords. [2:00 - 2:30] the main melody returns with the whole ensemble. '
            f'[2:30 - 2:50] exactly the same as 0:00 - 0:20 again, the opening repeated note for note, with no '
            f'fade-out and no ending, so the piece loops back to its start.')


def seed(use, n):
    return 5710 + 100 * list(THEMES).index(use) + n


def job(use, n, dry):
    base = f'{RAW}/{use}-{n}'
    have = [f for f in os.listdir(RAW) if f.startswith(f'{use}-{n}.')]
    if have:
        return use, n, 'cached ' + have[0]
    inp = {'prompt': prompt(use), 'seed': seed(use, n)}
    if dry:
        return use, n, json.dumps(inp)[:200]
    r = subprocess.run(['node', f'{ROOT}/tools/rep.mjs', 'google/lyria-3-pro', base + '.mp3', json.dumps(inp)],
                       capture_output=True, text=True, cwd=ROOT)
    return use, n, ('FAILED ' + r.stderr.strip()[-300:]) if r.returncode else r.stdout.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('uses', nargs='*')
    ap.add_argument('--takes', type=int, default=4)
    ap.add_argument('--first', type=int, default=1, help='number of the first take (to add takes later)')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    jobs = [(u, n) for u in (a.uses or THEMES) for n in range(a.first, a.first + a.takes)]
    pj = f'{RAW}/prompts.json'
    log = json.load(open(pj)) if os.path.exists(pj) else {}
    if not a.dry_run:
        log.update({f'{u}-{n}': {'model': 'google/lyria-3-pro', 'prompt': prompt(u), 'seed': seed(u, n)} for u, n in jobs})
        json.dump(log, open(pj, 'w'), indent=1)
    print(len(jobs), 'pieces, about $%.2f if none are cached' % (0.08 * len(jobs)), flush=True)
    with concurrent.futures.ThreadPoolExecutor(2) as ex:
        for u, n, msg in ex.map(lambda j: job(*j, a.dry_run), jobs):
            print(f'{u}-{n}', msg, flush=True)


if __name__ == '__main__':
    main()
