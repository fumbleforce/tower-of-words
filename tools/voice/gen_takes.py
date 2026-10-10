"""Clone takes with Qwen3-TTS 1.7B Base, batched per speaker and language: <work>/raw/<key>/<tag><seed>.wav + .json.
Japanese is always read in Japanese, Eric's too; an English line with Japanese in it gets one take per part
(<work>/raw/<key>~<n>/, cfg.units()), which export.py joins (splice.py).
Usage: gen_takes.py <seeds, comma separated> [keys, comma separated] [--lang Auto] [--alt] [--xvec]
  no keys: every manifest line with no exported clip for its current text (cfg.missing())
  --alt: read the text in alt_text.json instead (take tag 'a'); --lang: force the TTS language (tag 'u');
  --xvec: clone the timbre only, not the reference's way of speaking (tag 'x', also Eric's Japanese); TAG=x sets the tag
Takes already on disk from the same reference are skipped. Checks the GPU lock (cfg.LOCK, owner cfg.ME) before every batch and stops if it is gone,
or with exit 75 when Jørgen's image gen dashboard asks for the GPU (cfg.must_yield); a rerun picks up from the takes on disk.
Run with the Qwen venv: ~/ai/tts/qwen/venv/bin/python (run.sh does)."""
import gc, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfg import RAW, ALT, XVEC_JA, QWEN, load, units, missing, speakers, lock_ok, must_yield, give_turn, spoken, setup
seeds = [int(x) for x in sys.argv[1].split(',')]
arg = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else ''
keys = set(arg.split(',')) if arg else set(missing())
use_alt = '--alt' in sys.argv
lang_over = sys.argv[sys.argv.index('--lang') + 1] if '--lang' in sys.argv else None
use_xvec = '--xvec' in sys.argv
TAG = os.environ.get('TAG', 'a' if use_alt else ('u' if lang_over else None))


def xvec(sp, lang):
    """Clone the timbre only (the speaker embedding), not the reference's way of speaking: with --xvec, and always for
    Japanese from a clone whose reference speaks English (cfg.XVEC_JA: Eric), which otherwise reads it with an English
    accent ("tomato" for 止まって)."""
    return use_xvec or (lang == 'Japanese' and sp in XVEC_JA)


def tag(sp, lang):
    return TAG or ('x' if xvec(sp, lang) else 's')


def have(stem, label):
    """A take on disk made from this speaker's current reference (a changed reference in cfg.py remakes the takes)."""
    return os.path.exists(f'{stem}.wav') and load(f'{stem}.json', {}).get('reference', label) == label


alt = load(ALT, {})
SP = speakers()
BS = int(os.environ.get('BS', 4))
todo = {}
for e in units(keys):
    if use_alt and (e['key'] not in alt or e.get('part')):
        continue
    lang = lang_over or ('English' if e['lang'] == 'en' else 'Japanese')
    todo.setdefault((e['speaker'], lang), []).append(e)
print('lines', sum(len(v) for v in todo.values()), flush=True)
if not todo:
    sys.exit()
problems = setup({e.get('line', e['key']) for es in todo.values() for e in es})
if problems:
    sys.exit('voice setup:\n  ' + '\n  '.join(problems))

import torch, soundfile as sf  # noqa: E402
from qwen_tts import Qwen3TTSModel  # noqa: E402
_model = []


def model():
    """The TTS model, loaded on first use and again after a turn given to a browser test (drop())."""
    if not _model:
        _model.append(Qwen3TTSModel.from_pretrained(QWEN, device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa'))
    return _model[0]


def drop():
    _model.clear()
    gc.collect()
    torch.cuda.empty_cache()


for (sp, lang), es in todo.items():
    ref, ref_text, label = SP[sp]
    for seed in seeds:
        tk = f'{tag(sp, lang)}{seed}'
        need = [e for e in es if not have(f'{RAW}/{e["key"]}/{tk}', label)]
        for i in range(0, len(need), BS):
            b = need[i:i + BS]
            if must_yield():
                print("stopping for Jørgen's image gen dashboard (gpu.priority); takes so far are on disk", flush=True)
                sys.exit(75)
            give_turn(drop)  # a waiting day test gets a turn between batches
            if not lock_ok():
                sys.exit('lock lost, stopping')
            texts = [spoken(alt[e['key']]) if use_alt else e['tts'] for e in b]
            torch.manual_seed(seed)
            t = time.time()
            wavs, sr = model().generate_voice_clone(text=texts, language=[lang] * len(b), ref_audio=[ref] * len(b), ref_text=[ref_text] * len(b),
                                              x_vector_only_mode=xvec(sp, lang), max_new_tokens=int(12 * (4 + max(len(x) for x in texts) * (0.25 if lang == 'Japanese' else 0.1))))
            for e, w, text in zip(b, wavs, texts):
                d = f'{RAW}/{e["key"]}'
                os.makedirs(d, exist_ok=True)
                sf.write(f'{d}/{tk}.wav', w, sr)
                json.dump({'take': tk, 'engine': 'Qwen3-TTS 1.7B Base (local)', 'seed': seed, 'text': text, 'language': lang, 'reference': label},
                          open(f'{d}/{tk}.json', 'w'), ensure_ascii=False)
            print('ok', sp, lang, tk, len(b), round(time.time() - t, 1), flush=True)
print('done', flush=True)
