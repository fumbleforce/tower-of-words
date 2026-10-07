"""Bounded follow-up to the selected A singing direction; never installs audio.

Uses the first round's exact lyrics and synthesis settings. Two new score seeds
retain the selected style; a4 requests a syllabic melody at the original seed.
A note-count screen rejected those three scores before audio synthesis. A5 changes the final held note into four notes; A6 also subdivides earlier
held notes. A7 repeats the A6 score with a new synthesis seed. The screen is a heuristic,
not a requirement that every mora have its own note. ASR and listening must still
check every line; score counts alone cannot establish complete singing.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import urllib.parse

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location(
    'karaoke_round_one', ROOT / 'art/candidates/karaoke-song-1/generate.py')
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
sys.path.insert(0, str(ROOT / 'tools/island_audio'))
from song_gen3 import sung_notes

STYLE = previous.TAKES['a'][0]
TAKES = {
    'a2': (STYLE, 208101),
    'a3': (STYLE, 209101),
    'a4': (STYLE + ', syllabic melody, short vocal notes, sing every Japanese syllable including the complete final question', 207101),
}
OUT = Path.home() / 'ai/island-audio/karaoke-song-2'
READINGS = [
    'かえりのでんしゃをいっぽんみおくって', 'ほーむのはしででんわをかけた',
    'はなすことなんてないとおもってた', 'そっちはあめかときいただけ',
    'つぎのでんしゃがくるまではなした', 'あしたもおなじじかんにかけようか',
]
MORAE = sum(c not in 'ゃゅょぁぃぅぇぉゎ' for line in READINGS for c in line)


def generate(take):
    previous.OUT = OUT
    previous.TAKES = {take: TAKES[take]}
    original_trim = previous.trim

    def checked_score(abc):
        rendered, seconds, bpm, cuts = original_trim(abc)
        notes = sung_notes(rendered)
        folder = OUT / take
        (folder / 'score.screened.abc').write_text(rendered)
        previous.save(folder / 'score-screen.json', {
            'vocal_note_onsets': notes, 'lyric_morae': MORAE,
            'minimum_onsets': MORAE - 3,
            'limitation': 'Morae can share notes; this does not prove complete singing.',
        })
        if notes < MORAE - 3:
            raise RuntimeError(f'Sparse score: {notes} note onsets for {MORAE} morae; retained without audio')
        return rendered, seconds, bpm, cuts

    previous.trim = checked_score
    previous.generate(take, round_name=OUT.name)


def repaired_ending(take):
    """Preserve bar durations while testing added lyric articulation points."""
    folder = OUT / take
    folder.mkdir(parents=True, exist_ok=True)
    if (folder / 'full.flac').exists():
        print(take, 'already generated', flush=True)
        return
    graph = json.loads((ROOT / 'tools/workflows/karaoke-song-1-a-audio.json').read_text())
    original = graph['3']['inputs']['abc']
    before, after = '"D"D16|', '"D"D4E4F4D4|'
    assert original.count(before) == 1, 'Expected exactly one final held tonic in selected A'
    corrected = original.replace(before, after)
    changes = [{'before': before, 'after': after}]
    if take in ['a6', 'a7']:
        # The full A5 and isolated ending transcriptions complete ようか but lose
        # words earlier. Split held notes in those phrase bars without adding time.
        for before, after in [
            ('"F#m7"E2DE3DE3F4z2|', '"F#m7"E2DE3DE3F2F2z2|'),
            ('"D"F2EF3G2F2ED3D2|', '"D"F2EF3G2F2EDD2D2|'),
            ('"D/F#"A4F2E2D4z2A,2|', '"D/F#"A2A2F2E2D4z2A,2|'),
            ('"A7sus4"F6GFE4z4|', '"A7sus4"F3F3GFE4z4|'),
            ('"D"f6f2e2d2c2d2|', '"D"f2f2f2f2e2d2c2d2|'),
            ('"F#m7"c6A2A4z2A2|', '"F#m7"c3c3A2A4z2A2|'),
            ('"G"d4z2d2d4e2e2|', '"G"d2d2z2d2d2d2e2e2|'),
        ]:
            assert corrected.count(before) == 1, f'Unexpected source bar: {before}'
            corrected = corrected.replace(before, after)
            changes.append({'before': before, 'after': after})
    (folder / 'score.raw.abc').write_text(original)
    (folder / 'score.rendered.abc').write_text(corrected)
    graph['3']['inputs']['abc'] = corrected
    if take == 'a7':
        graph['3']['inputs']['seed'] = graph['6']['inputs']['seed'] = 207111
    graph['8']['inputs']['filename_prefix'] = 'island/karaoke-song-2-' + take
    request = {
        'lyrics': previous.LYRICS, 'style': STYLE, 'seed': graph['3']['inputs']['seed'],
        'source': 'karaoke-song-1-a-audio.json', 'candidate_only': True,
        'changes': changes,
        'reason': 'Test added articulation for incomplete lyrics; bar durations unchanged.',
        'vocal_note_onsets': sung_notes(corrected),
        'limitation': 'Score-to-lyric mapping is inferred, not verified singing.',
    }
    previous.save(folder / 'request.json', request)
    for dest in [ROOT / 'tools/workflows', Path.home() / 'ai/workflows', folder]:
        previous.save(dest / ('karaoke-song-2-' + take + '-audio.json'), graph)
    report = {'take': take, 'audio': {}}
    try:
        with previous.exclusive('codex-karaoke-song-2-' + take):
            outputs = previous.run(graph, report['audio'])
            for node in outputs.values():
                for item in node.get('audio', []):
                    query = urllib.parse.urlencode({key: item[key] for key in ['filename', 'subfolder', 'type']})
                    (folder / 'full.flac').write_bytes(previous.comfy._get('/view?' + query))
            if not (folder / 'full.flac').exists():
                raise RuntimeError('No generated audio returned')
            report['audio_sha256'] = hashlib.sha256((folder / 'full.flac').read_bytes()).hexdigest()
    except BaseException as error:
        report['error'] = str(error)
        raise
    finally:
        previous.save(folder / 'report.json', report)
    print(take, 'saved', folder, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('take', choices=[*TAKES, 'a5', 'a6', 'a7'])
    take = parser.parse_args().take
    repaired_ending(take) if take in ['a5', 'a6', 'a7'] else generate(take)
