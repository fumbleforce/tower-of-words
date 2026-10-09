"""Background music, round 6 (#371): new YuE2 instrumentals in the opening theme's style (Jørgen's pick in Review
music-direction-1). Not variations of the opening's melody: each piece gets its own band and mood, all built on the
opening's tags (anime J-pop, melodic bass, sparkling synths, catchy melody). YuE2 bf16 with the instrumental AR add-on
(art/SOUND.md: tags alone don't stop the singing), score first, then audio; workflow builder in tools/music_inst.py.

Takes the GPU through the queue (rank render), starts ComfyUI if it isn't up, frees its VRAM after and stops it again
if it started it. Raw takes: ~/ai/music-raw/r6/<use>-<n>.flac (+ .abc.txt score) and an MP3 copy for the post step;
settings in prompts.json there. Then:
    MUSIC_ROUND=6 ~/ai/sd/venv/bin/python tools/music_round4_post.py

    ~/ai/sd/venv/bin/python tools/music_round6.py [use ...] [--takes 2] [--seconds 150] [--dry-run]
"""
import argparse, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy, music_inst, music_round3

RAW = os.path.expanduser('~/ai/music-raw/r6')
# the opening theme's tags (tools/yue2_music.py TRACKS['opening']) minus the vocal ones
CORE = 'instrumental, anime soundtrack, J-pop, melodic bass, sparkling synths, catchy melody, clean mix'
TAGS = {
    'title': 'anime opening theme, J-pop rock, 140 BPM, driving electric guitars, punchy drums, bright piano, hopeful, energetic',
    'day': 'cheerful, 124 BPM, bright acoustic guitar strumming, piano, crisp pop drums, glockenspiel, sunny, light',
    'evening': 'Japanese city pop, 104 BPM, clean electric guitar, Rhodes electric piano, slap bass, tight drums, warm, nostalgic, sunset',
    'office': 'J-fusion, 116 BPM, funky clean electric guitar, synth bass, tight drums, electric piano, focused, steady groove',
    'shops': 'upbeat, 132 BPM, brass section, bouncy bass, handclaps, piano, punchy drums, playful, lively, busy street',
}
STRUCTURE = '[intro]\n[verse]\n[chorus]\n[verse]\n[chorus]\n[bridge]\n[chorus]\n[outro]'


def tags(use):
    return f'{TAGS[use]}, {CORE}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('uses', nargs='*')
    ap.add_argument('--takes', type=int, default=2)
    ap.add_argument('--seconds', type=float, default=150)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    pj = f'{RAW}/prompts.json'
    log = json.load(open(pj)) if os.path.exists(pj) else {}
    todo = [(u, n) for u in (a.uses or TAGS) for n in range(1, a.takes + 1) if not os.path.exists(f'{RAW}/{u}-{n}.mp3')]
    if a.dry_run:
        for u, n in todo:
            print(f'{u}-{n}', tags(u))
        return
    if not todo:
        return
    with comfy.gpu('claude-agent:music', 'render'):
        started = music_round3.comfy_up()
        try:
            for use, n in todo:
                name, seed = f'{use}-{n}', 9710 + 100 * list(TAGS).index(use) + n
                nar = music_inst.NAR_V9 if n % 2 == 0 else None  # even takes add the optional NAR add-on (SOUND.md)
                wf = music_inst.yue2(tags(use), STRUCTURE, a.seconds, seed, nar_lora=nar)
                wf['8']['inputs']['filename_prefix'] = 'music6/amakawa'
                music_inst.RAW = RAW
                t0 = time.time()
                music_inst.run(wf, name)
                subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'{RAW}/{name}.flac', '-c:a', 'libmp3lame', '-q:a', '0',
                                f'{RAW}/{name}.mp3'], check=True)
                log[name] = {'model': 'YuE2 3B bf16 + instrumental AR LoRA (v3abc)' + (' + NAR joint v9' if nar else '') + ', mode full',
                             'tags': tags(use), 'structure': STRUCTURE, 'seed': seed, 'max_s': a.seconds,
                             'render_s': round(time.time() - t0)}
                json.dump(log, open(pj, 'w'), indent=1)
                print(name, log[name]['render_s'], 's', flush=True)
                comfy.yield_to_dashboard()
        finally:
            try:
                comfy._post('/free', {'unload_models': True, 'free_memory': True})
            except Exception:
                pass
            if started:
                music_round3.stop_comfy()


if __name__ == '__main__':
    main()
