"""Stable Audio 3 Medium takes (local ComfyUI, same sampler as tools/island_audio/sfx_sa3.py: 8 steps, lcm/simple, cfg 1)
for game3d's ambience beds and world one-shots. Raw FLAC + JSON sidecar in ~/ai/feel-audio/raw/<name>-<seed>.flac.
Needs ComfyUI running and the GPU lock (GUIDE, Process). Every take is kept; tools/feel/build_audio.py picks and levels.
Usage: ~/ai/sd/venv/bin/python tools/feel/sa3_gen.py [name ...]"""
import sys, os, time, json, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import comfy

RAW = os.path.expanduser('~/ai/feel-audio/raw')
LOCK = '/tmp/claude-1000/gpu.lock/owner'
ME = 'feel-agent'
TAKES = 4

# name: (prompt, seconds). Prompts describe only what is heard. No footsteps anywhere (Jørgen).
SPEC = {
    # beds (looped in the game, layered under the music)
    'bed_train': ('Inside a modern monorail carriage running smoothly: a steady low rumble, a soft electric motor whine, gentle air rushing past the windows. Constant, no voices, no music.', 30),
    'bed_station': ('An open-air elevated train platform on a quiet morning: light wind, distant city traffic hum, faint birds. Calm and constant, no music.', 30),
    'bed_lobby': ('A large office building lobby with a high ceiling and stone floor: a soft murmur of many people talking quietly, reverberant, a low air conditioning hum. No music.', 30),
    'bed_office': ('A quiet open-plan office: a steady air conditioning hum, computer fans, a faint murmur of distant conversation. No music.', 30),
    'bed_lift': ('Inside a moving elevator: a low steady motor hum and a soft whoosh of air, a faint rattle. No music.', 12),
    # outdoor creatures and the harbour (#177)
    'crow_caw': ('A single crow cawing outdoors, two or three harsh caws with a short pause, close, clean, no other sounds, no music.', 4),
    'gull_call': ('A single seagull calling outdoors, a long drawn-out mewing cry then a shorter squeal, clean, no other sounds, no music.', 4),
    'bed_harbour': ('Calm water lapping gently against a stone harbour wall and moored boats, soft slow waves, a faint creak of ropes, steady and constant, no birds, no voices, no music.', 30),
    # one-shots scattered over the beds
    'printer': ('A laser printer in an office printing three pages: a motor whirs up, paper feeds through the rollers, pages drop into the tray, the motor winds down.', 8),
    'phone_far': ('A desk telephone ringing twice far away across a large quiet office, muffled and distant.', 6),
    'typing': ('Someone typing on a computer keyboard for a few seconds in a quiet office, soft keys, medium distance.', 6),
    'train_doors': ('Train doors sliding open with a short pneumatic hiss and a smooth rolling slide, then a soft thud.', 3),
    'glass_doors': ('Automatic glass sliding doors at a building entrance opening: a soft motor hum and a smooth slide.', 3),
    'lift_doors': ('Elevator doors sliding open with a soft mechanical rumble and a light thud, indoors.', 3),
    'brake': ('An electric train slowing to a stop: the motor whine winds down in pitch and a soft brake hiss at the end.', 6),
    'flap_open': ('Glass security turnstile flaps swinging open with a soft pneumatic whoosh and a click.', 2),
    'copier_run': ('An office photocopier making copies: rhythmic paper feeding, rollers turning, steady and regular.', 6),
    'kettle_pour': ('Hot water poured from an electric thermos pot into a ceramic mug, a gentle stream, close.', 4),
    'crowd': ('A small crowd of office workers walking past in a lobby, rustling coats and bags, a few quiet voices, reverberant.', 4),
    'vending': ('A can dropping inside a vending machine with a hollow clunk and a short rattle.', 2),
}


def sa3(prompt, seconds, seed):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'stable_audio_3_medium.safetensors'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 't5gemma_b_b_ul2.safetensors', 'type': 'stable_audio'}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '4': {'class_type': 'EmptyLatentAudio', 'inputs': {'seconds': float(seconds), 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
                                                   'seed': seed, 'steps': 8, 'cfg': 1.0, 'sampler_name': 'lcm', 'scheduler': 'simple', 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['5', 0], 'vae': ['1', 2]}},
        '7': {'class_type': 'SaveAudio', 'inputs': {'audio': ['6', 0], 'filename_prefix': 'feel/sa3'}},
    }


def mine():
    try: return ME in open(LOCK).read()
    except OSError: return False


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    only = sys.argv[1:]
    t0 = time.time()
    for name, (prompt, secs) in SPEC.items():
        if only and name not in only: continue
        for k in range(TAKES):
            seed = 5100 + 131 * k
            base = f'{RAW}/{name}-{seed}'
            if os.path.exists(base + '.flac'): continue
            if not mine(): print('lost the GPU lock, stopping', flush=True); sys.exit(1)
            pid = comfy._post('/prompt', {'prompt': sa3(prompt, secs, seed)})['prompt_id']
            while True:
                hist = json.loads(comfy._get(f'/history/{pid}'))
                if pid in hist: break
                time.sleep(1.5)
            info = {'name': name, 'prompt': prompt, 'seconds': secs, 'seed': seed, 'model': 'stable_audio_3_medium + t5gemma_b_b_ul2', 'sampler': 'lcm / simple, 8 steps, cfg 1'}
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error': info['error'] = json.dumps(st.get('messages', []))[-600:]; print('FAIL', name, info['error'][:300], flush=True)
            for node in hist[pid]['outputs'].values():
                for a in node.get('audio', []):
                    q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a['subfolder'], 'type': a['type']})
                    open(base + '.flac', 'wb').write(comfy._get('/view?' + q))
            info['after_s'] = round(time.time() - t0)
            json.dump(info, open(base + '.json', 'w'), indent=1)
            print('ok', name, seed, info['after_s'], flush=True)
    print('done', flush=True)
