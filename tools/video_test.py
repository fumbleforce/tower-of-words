"""Small local image-to-video test: 3 clips on Wan 2.2 TI2V 5B + 1 Causal Forcing comparison. Output art/video/*.mp4, stats in art/video/stats.json."""
import sys, os, json, time, subprocess, threading
sys.path.insert(0, os.path.dirname(__file__))
import comfy

OUT = 'art/video'
STYLE = 'anime style, 2d cel-shaded animation, clean lineart, consistent character, '
CLIPS = [
    ('emi-wan', 'wan', 'emi.png', 704, 896, 57,
     STYLE + 'a woman with an auburn bob and glasses smiles warmly at the camera, she blinks slowly, breathes gently, her shoulders rise and fall slightly, a few strands of hair sway softly, subtle idle animation, static camera, plain grey background'),
    ('monorail-wan', 'wan', 'monorail.png', 1280, 704, 81,
     STYLE + 'a white monorail train glides smoothly along the elevated viaduct across the bay toward the island city, gentle ripples and sparkling reflections on the water, clouds drift slowly, calm morning, the camera slowly follows the train'),
    ('rei-wan', 'wan', 'rei.png', 704, 896, 57,
     STYLE + 'a woman with a sleek silver ponytail in a white suit slowly turns her head toward the camera and gives a small confident smile, her ponytail swings slightly, static camera, plain grey background'),
    ('emi-causal', 'causal', 'emi.png', 480, 608, 49,
     STYLE + 'a woman with an auburn bob and glasses smiles warmly at the camera, she blinks slowly, breathes gently, a few strands of hair sway softly, static camera, plain grey background'),
]


def vram_watch(stop, peak):
    while not stop.is_set():
        try:
            out = subprocess.run(['nvidia-smi', '--query-gpu=memory.used', '--format=csv,noheader,nounits'], capture_output=True, text=True).stdout
            peak[0] = max(peak[0], int(out.split()[0]))
        except Exception:
            pass
        time.sleep(1)


stats = json.load(open(f'{OUT}/stats.json')) if os.path.exists(f'{OUT}/stats.json') else {}
only = sys.argv[1:]
for name, kind, img, w, h, frames, prompt in CLIPS:
    if only and name not in only:
        continue
    out = f'{OUT}/{name}.mp4'
    if os.path.exists(out):
        continue
    up = comfy.upload(f'{OUT}/in/{img}')
    if kind == 'wan':
        wf, fps = comfy.wan22_i2v(up, prompt, w=w, h=h, length=frames, seed=7, prefix=name), 24
    else:
        wf, fps = comfy.causal_forcing_i2v(up, prompt, w=w, h=h, length=frames, seed=7, prefix=name), 16
    json.dump(wf, open(f'{OUT}/{name}.workflow.json', 'w'), indent=1, ensure_ascii=False)
    stop, peak = threading.Event(), [0]
    th = threading.Thread(target=vram_watch, args=(stop, peak)); th.start()
    try:
        secs = comfy.run_video(wf, out, fps)
        stats[name] = {'model': kind, 'size': f'{w}x{h}', 'frames': frames, 'fps': fps, 'seconds_of_video': round(frames / fps, 1),
                       'generation_s': secs, 'peak_vram_mb_total_gpu': peak[0], 'prompt': prompt}
        print('ok', name, secs, 's, peak', peak[0], 'MB', flush=True)
    except Exception as e:
        print('FAIL', name, str(e)[:800], flush=True)
    finally:
        stop.set(); th.join()
    json.dump(stats, open(f'{OUT}/stats.json', 'w'), indent=1, ensure_ascii=False)
