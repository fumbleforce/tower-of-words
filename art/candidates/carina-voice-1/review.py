"""Carina voice round 1, step 3: write reviews/carina-voice-1/review.json from cands.py and results.json.
Run from the repo root: python3 art/candidates/carina-voice-1/review.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cands import CANDS

r = json.load(open(f'{HERE}/results.json'))
D = 'art/candidates/carina-voice-1'
FIT = {'a': 'Matches carina.json ("tired woman in her thirties, quiet and polite").',
       'b': 'Close to carina.json, drier: the IT support side of her.',
       'c': 'The confident, relaxed direction (late twenties, slightly husky, calm, a little amused).',
       'd': 'The confident, relaxed direction, brighter and warmer.',
       'e': "The lowest: carina.json's tired and quiet, taken down into a husky register.",
       'f': 'The brightest, for range.'}
media = [{'audio': f'{D}/eric-ref.mp3', 'caption':
          'How to read this: six designed voices, a to f; e is the lowest and f the brightest. Each card plays her '
          'saying "Yeah, IT support. I\'m the contractor, it\'s my first day." Above the cards, for each voice: the reference '
          'it was designed with, another of Eric\'s day-1 lines as hers, "ここ. Right by the fountain." (his day-2 line, with ここ '
          'said in Japanese and spliced in, as the game does) and the word clip おはようございます. All are at -20 LUFS. '
          'How they were made: each is a Qwen3-TTS VoiceDesign voice made from a short description and reading the same English '
          'reference text, then cloned with Qwen3-TTS Base, with her Japanese made from the timbre only. Eric\'s voice, eric-2, '
          'was made the same way, so hers would work in the game the way his does. This first clip is Eric\'s reference, for comparison.'}]
for lid, cap in (('en1', '"Yeah, IT support..."'), ('en2', '"Sea on both sides..."'), ('mix', '"ここ. Right by the fountain."'),
                 ('word', 'おはようございます')):
    media.append({'audio': f'{D}/eric-{lid}.mp3', 'caption': f'Eric (eric-2, in the game now): {cap}'})
opts = []
for c in CANDS:
    i, v = c['id'], r['cands'][c['id']]
    for lid, cap in (('ref', 'reference voice'), ('en2', '"Sea on both sides. Nobody said the island was this far out."'),
                     ('mix', '"ここ. Right by the fountain."'), ('word', 'おはようございます')):
        media.append({'audio': f'{D}/{i}-{lid}.mp3', 'caption': f"{c['label']}: {cap}"})
    p = v['pick']
    low = (" It's low enough that her lines would need the pitch check for drift (under 190 Hz, the same check Mio has)."
           if v['ref_f0'] < 190 else '')
    opts.append({'id': i, 'label': c['label'], 'audio': f'{D}/{i}-en1.mp3',
                 'note': f"{FIT[i]} Reference pitch about {round(v['ref_f0'])} Hz.{low} Design prompt: \"{c['instruct']}\" "
                         f"Takes: seeds 404, 505 and 606 for each line, picked with Whisper (the text it heard, P(ja) over 0.9 for "
                         f"Japanese, then the pitch closest to the reference): en1 {p['en1']}, en2 {p['en2']}, ここ {p['mix-ja']} "
                         f"with English {p['mix-en']}, word {p['word']}."})
rev = {'title': "Carina's voice", 'date': '2026-10-06', 'by': 'voice agent', 'status': 'open', 'multi': False,
       'question': 'Which of these is Carina?', 'media': media, 'options': opts}
os.makedirs('reviews/carina-voice-1', exist_ok=True)
json.dump(rev, open('reviews/carina-voice-1/review.json', 'w'), indent=1, ensure_ascii=False)
print('wrote reviews/carina-voice-1/review.json')
