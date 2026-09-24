"""Local LLM comparison for Amakawa NPC conversation (Emi) + a daily-request generator.
Starts llama-server per model, runs a scripted conversation, records speed, JSON validity and transcripts.
Usage: ~/ai/sd/venv/bin/python tools/llm_test.py [model_key ...]
Output: proto2/llm/data/<model_key>.json"""
import json, os, re, subprocess, sys, time, urllib.request

HOME = os.path.expanduser('~')
M = f'{HOME}/ai/llm-models'
OUT = os.path.join(os.path.dirname(__file__), '..', 'proto2', 'llm', 'data')
PORT = 8190

MAIN = f'{HOME}/ai/llama/bin'
PRISM = f'{HOME}/ai/llama-prism/llama-prism-b10735-842b188'
# key: (label, bin dir, gguf, extra args)
MODELS = {
    'gemma4-12b': ('Gemma 4 12B (QAT q4_0)', MAIN, 'gemma-4-12b-it-qat-q4_0.gguf', ['--fit', 'on']),
    'gemma4-26b': ('Gemma 4 26B-A4B (QAT q4_0)', MAIN, 'gemma-4-26B_q4_0-it.gguf', ['--fit', 'on']),
    'orion': ('Orion 26B-A4B v1.1 (TheDrummer, Q4_K_M)', MAIN, 'TheDrummer_Orion-26B-A4B-v1.1-Q4_K_M.gguf', ['--fit', 'on']),
    'swallow': ('Qwen3-Swallow 30B-A3B RL v0.2 (Q4_K_M)', MAIN, 'Qwen3-Swallow-30B-A3B-RL-v0.2-Q4_K_M.gguf', ['--fit', 'on', '--reasoning-format', 'deepseek']),
    'bonsai': ('Ternary Bonsai 2 27B (PQ2_0)', PRISM, 'Ternary-Bonsai-2-27B-PQ2_0.gguf', ['--fit', 'on']),
}

SYSTEM = """You are Emi (真壁エミ), 32, the laid-back but sharp team leader of Planning Office 7, a small misfit team in the basement of the Amakawa conglomerate. You are talking with the new foreign hire on his first morning. You are relaxed, amused, a little teasing, warm underneath, and you speak casual Japanese (タメ口), never keigo.

The player is learning Japanese at roughly JLPT N5 to N4 level. Rules:
- Reply in natural, casual spoken Japanese a Japanese woman in her thirties would really use at work with a junior she likes.
- Keep every reply to 1 or 2 short sentences, using mostly N5 to N4 vocabulary and grammar.
- Stay in character. Never mention being an AI or a language lesson.
- If the player's Japanese has a mistake (wrong particle, wrong form, stiff register, English mixed in), react naturally in character, and put a short, kind English note about the mistake in "correction". Otherwise "correction" is null.
- If the player is overly polite, tease him a little about it.

Answer with ONLY a JSON object, no other text:
{"ja": "your line in Japanese (kanji allowed)", "kana": "the same line fully in hiragana/katakana", "en": "natural English translation", "mood": "one word, e.g. amused, teasing, surprised, warm, annoyed", "correction": null}"""

OPENING = '（新人が企画室7に入ってくる。）'
TURNS = [
    ('natural casual', 'おはよう！今日は何をする？'),
    ('overly polite', '本日はどのような業務をさせていただければよろしいでしょうか。'),
    ('grammar mistake (を for に)', 'じゃあ、今から会議室を行きます。'),
    ('mixed English', 'えっと、the printer がbrokenだよ。'),
    ('flirty', 'エミさん、今日のメガネ、すごく似合ってるね。'),
    ('off-topic', 'ねえ、好きなアニメは何？'),
]

QUEST_SYSTEM = """You write small daily requests for a Japanese-learning visual novel set in the Amakawa conglomerate. The player is at JLPT N5 to N4 level. Requests come from coworkers, are grounded in office life, and should be doable in one short scene."""
QUEST_USER = """Write one request from Goro (61, gentle retired engineer who keeps the rooftop garden) for the player. It must naturally use these target words: 書類, 三階, 届ける, 午後. Casual Japanese, at the player's level.
Answer with ONLY a JSON object:
{"giver": "...", "title_en": "...", "request_ja": "what Goro says (1-3 sentences)", "request_kana": "the same in kana", "request_en": "English", "target_words_used": ["..."], "steps": ["short English step", "..."], "reward": "short English"}"""


def post(path, data, timeout=300):
    req = urllib.request.Request(f'http://127.0.0.1:{PORT}{path}', data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())


def healthy():
    try:
        return json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/health', timeout=2).read()).get('status') == 'ok'
    except Exception:
        return False


def parse_json(text):
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.S).strip()
    text = re.sub(r'^```(?:json)?|```$', '', text.strip(), flags=re.M).strip()
    try:
        return json.loads(text), True
    except Exception:
        m = re.search(r'\{.*\}', text, re.S)
        if m:
            try:
                return json.loads(m.group(0)), False  # recoverable, but not clean
            except Exception:
                pass
    return None, False


MAX_TOKENS = 400


def chat(messages, max_tokens=None):
    max_tokens = max_tokens or MAX_TOKENS
    t = time.time()
    r = post('/v1/chat/completions', {'messages': messages, 'temperature': 0.8, 'top_p': 0.95, 'max_tokens': max_tokens,
                                      'chat_template_kwargs': {'enable_thinking': False}})
    msg = r['choices'][0]['message']
    text = msg.get('content') or ''
    tm = r.get('timings', {})
    return text, {'gen_tps': round(tm.get('predicted_per_second', 0), 1), 'prompt_tps': round(tm.get('prompt_per_second', 0), 1),
                  'tokens': tm.get('predicted_n'), 'seconds': round(time.time() - t, 1),
                  'reasoning_chars': len(msg.get('reasoning_content') or '')}


THINKERS = {'swallow'}  # reasoning models that ignore enable_thinking=false: give them room and measure it


def run_model(key):
    global MAX_TOKENS
    MAX_TOKENS = 3000 if key in THINKERS else 400
    label, bindir, gguf, extra = MODELS[key]
    path = os.path.join(M, gguf)
    env = dict(os.environ, LD_LIBRARY_PATH=bindir)
    if os.environ.get('LLM_CPU'):  # smoke test without touching the GPU
        extra = ['-ngl', '0']
    cmd = [f'{bindir}/llama-server', '-m', path, '--port', str(PORT), '-c', '8192', '-fa', 'on', '--jinja', '-t', '16'] + extra
    log = open(os.path.join(OUT, f'{key}.server.log'), 'w')
    t0 = time.time()
    proc = subprocess.Popen(cmd, env=env, stdout=log, stderr=subprocess.STDOUT)
    try:
        while not healthy():
            if proc.poll() is not None:
                raise RuntimeError(f'server exited {proc.returncode}; see {key}.server.log')
            if time.time() - t0 > 600:
                raise RuntimeError('load timeout')
            time.sleep(1)
        load_s = round(time.time() - t0, 1)
        msgs = [{'role': 'system', 'content': SYSTEM}]
        convo, stats, clean, ok = [], [], 0, 0
        turns = TURNS[:1] if os.environ.get('LLM_SMOKE') else TURNS
        for kind, player in [('opening', OPENING)] + turns:
            msgs.append({'role': 'user', 'content': player})
            text, st = chat(msgs)
            data, is_clean = parse_json(text)
            clean += is_clean
            ok += data is not None
            stats.append(st)
            convo.append({'kind': kind, 'player': player, 'raw': text, 'reply': data, 'clean_json': is_clean, 'stats': st})
            msgs.append({'role': 'assistant', 'content': json.dumps(data, ensure_ascii=False) if data else text})
        qtext, qst = chat([{'role': 'system', 'content': QUEST_SYSTEM}, {'role': 'user', 'content': QUEST_USER}], max_tokens=MAX_TOKENS + 300)
        qdata, qclean = parse_json(qtext)
        n = len(convo) + 1
        res = {'avg_seconds_per_reply': round(sum(s['seconds'] for s in stats) / len(stats), 1), 'thinks': key in THINKERS,
               'key': key, 'label': label, 'gguf': gguf, 'size_gb': round(os.path.getsize(path) / 1e9, 2), 'load_s': load_s,
               'gen_tps': round(sum(s['gen_tps'] for s in stats) / len(stats), 1),
               'clean_json_rate': round((clean + qclean) / n, 2), 'parsable_json_rate': round((ok + (qdata is not None)) / n, 2),
               'conversation': convo, 'quest': {'raw': qtext, 'data': qdata, 'clean_json': qclean, 'stats': qst}, 'cmd': ' '.join(cmd)}
        with open(os.path.join(OUT, f'{key}.json'), 'w') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        print('ok', key, 'load', load_s, 's, gen', res['gen_tps'], 'tok/s, clean json', res['clean_json_rate'], flush=True)
    finally:
        proc.terminate()
        try:
            proc.wait(20)
        except Exception:
            proc.kill()
        log.close()


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for key in (sys.argv[1:] or list(MODELS)):
        try:
            run_model(key)
        except Exception as e:
            print('FAIL', key, str(e)[:300], flush=True)
