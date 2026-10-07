"""Candidate-only local YuE2 singing. One exclusive job per take; never installs game audio."""
import argparse
from contextlib import contextmanager
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
sys.path[:0] = [str(ROOT / 'tools'), str(ROOT / 'tools/island_audio')]
import comfy
from song_gen import workflow, INT8
from song_gen2 import trim, KEEP

LYRICS = '''[verse]
帰りの電車を一本見送って
ホームの端で電話をかけた
話すことなんてないと思ってた

[chorus]
そっちは雨かと聞いただけ
次の電車が来るまで話した
明日も同じ時間にかけようか
'''
TAKES = {
    'a': ('Japanese, warm mature male baritone vocal, restrained adult register, modest Japanese folk pop, clear Japanese diction, acoustic guitar, piano, soft bass and drums, intimate karaoke accompaniment, complete short verse and refrain, 100 bpm', 207101),
    'b': ('Japanese, warm male tenor vocal, unforced adult register, modest Japanese acoustic pop, clear Japanese diction, acoustic guitar, electric piano, soft bass and drums, intimate karaoke accompaniment, complete short verse and refrain, 104 bpm', 207102),
}
OUT = Path.home() / 'ai/island-audio/karaoke-song-1'
KEEP.update({'intro': ('last', 1), 'interlude': ('drop', 0), 'outro': ('first', 1)})

def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def run(graph, record):
    comfy.yield_to_dashboard()
    pid = comfy._post('/prompt', {'prompt': graph})['prompt_id']
    record['prompt_id'] = pid
    start = time.monotonic()
    while time.monotonic() - start < 900:
        hist = json.loads(comfy._get('/history/' + pid))
        if pid in hist:
            row = hist[pid]
            record['seconds'] = round(time.monotonic() - start, 2)
            record['status'] = row.get('status', {})
            if record['status'].get('status_str') == 'error':
                comfy.yield_to_dashboard(record['status'])
                raise RuntimeError(json.dumps(record['status'], ensure_ascii=False)[-1800:])
            return row['outputs']
        time.sleep(2)
    comfy._post('/interrupt', {})
    raise TimeoutError('Owned YuE2 job exceeded 15 minute bound')

@contextmanager
def exclusive(owner):
    with comfy.gpu(owner, 'render'):
        try:
            yield
        finally:
            request = urllib.request.Request(comfy.HOST + '/free', data=json.dumps({'unload_models': True, 'free_memory': True}).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request) as response:
                response.read()


def generate(name, round_name='karaoke-song-1'):
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / name
    dst.mkdir(exist_ok=True)
    tags, seed = TAKES[name]
    request = {'title': '帰りの電話', 'lyrics': LYRICS, 'style': tags, 'seed': seed, 'checkpoint': INT8, 'candidate_only': True, 'speech_clone': False}
    request['sha256'] = hashlib.sha256(json.dumps(request, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    request_path = dst / 'request.json'
    if request_path.exists() and json.loads(request_path.read_text()) != request:
        raise RuntimeError('Take settings changed; preserve old attempt under a new ID')
    save(request_path, request)
    if (dst / 'full.flac').exists():
        print(name, 'already generated', flush=True)
        return
    report = {'take': name}
    owner = ('codex-karaoke-song-' if round_name == 'karaoke-song-1' else 'codex-' + round_name + '-') + name
    try:
        with exclusive(owner):
            graph = workflow(tags, LYRICS, 40, seed, INT8)
            score_graph = {k: graph[k] for k in ['1', '2', 'P']}
            graph_dir = ROOT / 'tools/workflows'
            graph_dir.mkdir(exist_ok=True)
            local_graphs = Path.home() / 'ai/workflows'
            local_graphs.mkdir(exist_ok=True)
            for folder in [graph_dir, local_graphs, dst]:
                save(folder / (round_name + '-' + name + '-score.json'), score_graph)
            score_path = dst / 'score.raw.abc'
            if not score_path.exists():
                report['score'] = {}
                outputs = run(score_graph, report['score'])
                score_path.write_text(next(''.join(v['text']) for v in outputs.values() if 'text' in v))
                save(dst / 'report.json', report)
            abc, seconds, bpm, cuts = trim(score_path.read_text())
            (dst / 'score.rendered.abc').write_text(abc)
            report.update({'score_seconds': seconds, 'bpm': bpm, 'instrumental_trim': cuts})
            print(name, 'score', round(seconds, 1), 'seconds', bpm, 'bpm', flush=True)
            if seconds > 65:
                raise RuntimeError('Score too long for bounded refrain; preserved for review without truncating vocals')
            del graph['2'], graph['P']
            graph['3']['inputs']['abc'] = abc
            graph['3']['inputs']['max_duration'] = seconds + 2
            graph['8']['inputs']['filename_prefix'] = 'island/' + round_name + '-' + name
            for folder in [graph_dir, local_graphs, dst]:
                save(folder / (round_name + '-' + name + '-audio.json'), graph)
            report['audio'] = {}
            outputs = run(graph, report['audio'])
            for node in outputs.values():
                for audio in node.get('audio', []):
                    query = urllib.parse.urlencode({k: audio[k] for k in ['filename', 'subfolder', 'type']})
                    (dst / 'full.flac').write_bytes(comfy._get('/view?' + query))
            if not (dst / 'full.flac').exists():
                raise RuntimeError('No generated audio returned')
            report['audio_sha256'] = hashlib.sha256((dst / 'full.flac').read_bytes()).hexdigest()
    except BaseException as error:
        report['error'] = str(error)
        raise
    finally:
        # Only free models after our own job has completed; the queue handles lock ownership.
        save(dst / 'report.json', report)
    print(name, 'saved', dst, flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('take', choices=TAKES)
    generate(parser.parse_args().take)
