"""The ComfyUI graphs the audio generators submit (Stable Audio 3 Medium, YuE2), and the runner: start ComfyUI if it
isn't up, submit one graph, wait, save the audio (and YuE2's score text), stop it again if we started it. The GPU lock
is taken by the caller (tools/audio/generators.py, through comfy.gpu). Same settings as the rounds they replace:
tools/feel/sa3_gen.py (SA3), tools/music_inst.py (YuE2 instrumental) and tools/island_audio/song_gen.py (YuE2 songs)."""
import json, os, re, subprocess, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import comfy

YUE_BF16 = 'yue2_3b_bf16.safetensors'
YUE_INT8 = 'yue2_3b_int8_convrot.safetensors'
AR_INST = 'yue2_inst_ar_v3abc_comfyui.safetensors'   # Mothersuperior/YuE2-instrumental-cot-full-loras (CLIP slot)
NAR_V9 = 'yue2_nar_joint_v9_comfyui.safetensors'     # Mothersuperior/yue2-mothersuperior-realaudio-tokenizer-v4 (MODEL slot)
CKPT = {'bf16': YUE_BF16, 'int8': YUE_INT8}


def sa3(prompt, seconds, seed, prefix='audio/sa3'):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'stable_audio_3_medium.safetensors'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 't5gemma_b_b_ul2.safetensors', 'type': 'stable_audio'}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '4': {'class_type': 'EmptyLatentAudio', 'inputs': {'seconds': float(seconds), 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
                                                   'seed': seed, 'steps': 8, 'cfg': 1.0, 'sampler_name': 'lcm', 'scheduler': 'simple', 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['5', 0], 'vae': ['1', 2]}},
        '7': {'class_type': 'SaveAudio', 'inputs': {'audio': ['6', 0], 'filename_prefix': prefix}},
    }


def yue2(tags, lyrics, seconds, seed, ckpt=YUE_BF16, ar_lora=None, nar_lora=None, prefix='audio/yue2'):
    """Score (YuE2GenerateABC, shown by node P) then audio. ar_lora on CLIP keeps it instrumental (art/SOUND.md)."""
    wf = {'1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}}}
    model, clip = ['1', 0], ['1', 1]
    if ar_lora:
        wf['L1'] = {'class_type': 'LoraLoader', 'inputs': {'model': model, 'clip': clip, 'lora_name': ar_lora, 'strength_model': 0.0, 'strength_clip': 1.0}}
        clip = ['L1', 1]
    if nar_lora:
        wf['L2'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': model, 'lora_name': nar_lora, 'strength_model': 1.0}}
        model = ['L2', 0]
    wf.update({
        '2': {'class_type': 'YuE2GenerateABC', 'inputs': {'clip': clip, 'style': tags, 'lyrics': lyrics, 'seed': seed, 'mode': 'full',
                                                          'max_abc_tokens': 8192, 'temperature': 0.7, 'top_p': 0.9, 'top_k': 30,
                                                          'repetition_penalty': 1.005, 'penalty_window': 100}},
        'P': {'class_type': 'PreviewAny', 'inputs': {'source': ['2', 0]}},
        '3': {'class_type': 'YuE2GenerateMusic', 'inputs': {'clip': clip, 'style': tags, 'lyrics': lyrics, 'abc': ['2', 0], 'seed': seed,
                                                            'mode': 'full', 'max_duration': float(seconds), 'temperature': 1.0, 'top_p': 0.95,
                                                            'top_k': 100, 'repetition_penalty': 1.2}},
        '4': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['3', 0]}},
        '5': {'class_type': 'EmptyYuE2LatentAudio', 'inputs': {'seconds': ['3', 1], 'batch_size': 1}},
        '6': {'class_type': 'KSampler', 'inputs': {'model': model, 'positive': ['3', 0], 'negative': ['4', 0], 'latent_image': ['5', 0],
                                                   'seed': seed, 'steps': 32, 'cfg': 1.0, 'sampler_name': 'dpm_2', 'scheduler': 'sgm_uniform', 'denoise': 1.0}},
        '7': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['6', 0], 'vae': ['1', 2]}},
        '8': {'class_type': 'SaveAudio', 'inputs': {'audio': ['7', 0], 'filename_prefix': prefix}},
    })
    return wf


def score_only(wf):
    """The score half of a YuE2 graph: write the score, no audio."""
    return {k: wf[k] for k in wf if k in ('1', 'L1', 'L2', '2', 'P')}


def from_score(wf, abc, seconds):
    """The audio half of a YuE2 graph, for a given (trimmed) score."""
    wf = {k: v for k, v in wf.items() if k not in ('2', 'P')}
    wf['3'] = json.loads(json.dumps(wf['3']))
    wf['3']['inputs']['abc'] = abc
    wf['3']['inputs']['max_duration'] = float(seconds)
    return wf


def up():
    """Start ComfyUI if it isn't running. Returns True when this call started it."""
    try:
        comfy._get('/system_stats')
        return False
    except Exception:
        pass
    subprocess.run(['sh', os.path.expanduser('~/ai/start-comfy.sh')], check=True)
    for _ in range(120):
        time.sleep(2)
        try:
            comfy._get('/system_stats')
            return True
        except Exception:
            pass
    raise RuntimeError('ComfyUI did not start')


def down(started):
    try:
        comfy._post('/free', {'unload_models': True, 'free_memory': True})
    except Exception:
        pass
    if started:
        # by the pid listening on the port: a pkill -f pattern also matches any shell whose command line names it
        out = subprocess.run(['ss', '-ltnpH', 'sport = :8188'], capture_output=True, text=True).stdout
        for pid in {int(x) for x in re.findall(r'pid=(\d+)', out)}:
            os.kill(pid, 15)


def run(wf, audio_out=None, timeout=3600):
    """Submit wf and wait. Saves the first audio output to audio_out. Returns (seconds, text outputs joined)."""
    comfy.yield_to_dashboard()
    pid = comfy._post('/prompt', {'prompt': wf})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(comfy._get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                comfy.yield_to_dashboard(st)
                raise RuntimeError(json.dumps(st.get('messages', []))[-1500:])
            text, saved = '', False
            for node in hist[pid]['outputs'].values():
                for a in node.get('audio', []):
                    if audio_out and not saved:
                        q = urllib.parse.urlencode({k: a[k] for k in ('filename', 'subfolder', 'type')})
                        open(audio_out, 'wb').write(comfy._get('/view?' + q))
                        saved = True
                if 'text' in node:
                    text += ''.join(node['text'])
            if audio_out and not saved:
                raise RuntimeError('no audio returned')
            return round(time.time() - t0), text
        time.sleep(2)
    comfy._post('/interrupt', {})
    raise TimeoutError(pid)
