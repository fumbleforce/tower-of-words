"""Rei voice round 1, step 3: write reviews/rei-voice-1/review.json from cands.py and results.json.
Run from the repo root: python3 art/candidates/rei-voice-1/review.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cands import CANDS, COMPARE, LINES, REF_TEXT

r = json.load(open(f'{HERE}/results.json'))['voices']
D = 'art/candidates/rei-voice-1'
T = {l['id']: l['tts'] for l in LINES}
CAP = {'ref': 'the reference it was made from',
       'ja2': f"「{T['ja2']}」 (scolding a junior who quoted the wrong date)",
       'en': f"\"{T['en']}\" (dry, to an overseas customer)",
       'quiet': f"「{T['q-ja']}」 \"{T['q-en']}\" (quiet, hiding a sore ankle)"}
media = [{'audio': f'{D}/a-ref.mp3', 'caption':
          'Who Rei is: 41, she runs a team in Sales and ranks above Eric without being his boss. Brusque and abrasive, she '
          'scolds her team in plain 〜しなさい, never admits a weakness, and speaks practical English she learned on overseas '
          'customers. Where she speaks: the sports ground on day 3 (her serves), the tennis club and the broken score display '
          'on day 4, the evening walk on the east coast, overheard Japanese in the shopping street, and her reaction when Eric '
          'talks down to her. Most of what she says to Eric is English; Japanese is overheard or to her own people. '
          'Today she borrows the shop clerk voice (option 0), which is young and bright. '
          'What you pick: her voice. Each card plays her saying '
          f"「{T['ja1']}」 (a junior hesitating before a call). Above the cards, for each voice: the reference, a second "
          'scolding, a dry English line and a quiet line, all at -20 LUFS. '
          'After you pick: the reference goes into tools/voice-refs/ and all her lines in the game are re-voiced with it. '
          'Nothing in the game changes before that. '
          'How they were made: a to e are Qwen3-TTS VoiceDesign voices from a short description, all reading the same '
          f'Japanese text (「{REF_TEXT}」), then cloned with Qwen3-TTS Base, the same way the game voices every line '
          '(Kuro\'s voice was made this way). 0 and p are for comparison: 0 is her voice today, p is the old prototype\'s '
          'Rei (MiniMax Japanese_ColdQueen). Every take passed the game\'s reading check unless its note says otherwise. '
          'This first clip is a\'s reference.'}]
for c in CANDS + COMPARE:
    for lid in ('ref', 'ja2', 'en', 'quiet'):
        if c['id'] == 'a' and lid == 'ref':
            continue
        media.append({'audio': f"{D}/{c['id']}-{lid}.mp3", 'caption': f"{c['label']}: {CAP[lid]}"})
NOTE = {'0': 'Her borrowed voice today (the shop clerk, made for a twenty-year-old), for comparison.',
        'p': 'The Rei voice from the old prototype (a MiniMax preset, "ColdQueen"), cloned the same way, for comparison.'}
opts = []
for c in CANDS + COMPARE:
    i, v = c['id'], r[c['id']]
    p = v['pick']
    how = (f"Design prompt: \"{c['instruct']}\" " if 'instruct' in c else NOTE[i] + ' ')
    fails = (f" No take passed the check for: {', '.join(v['failed'])} (the best one is shown)." if v['failed'] else
             ' Every line passed the reading check.')
    low = ' Under 185 Hz, so her lines would need the pitch guard loosened.' if (v['ref_f0'] or 999) < 185 else ''
    opts.append({'id': i, 'label': c['label'], 'audio': f'{D}/{i}-ja1.mp3',
                 'note': f"{how}Reference pitch about {round(v['ref_f0'] or 0)} Hz.{low}{fails} Takes: seeds 404, 505 and 606 per "
                         f"line, picked by the check, then closeness to the reference (for the quiet line, the calmest take): ja1 {p['ja1']}, ja2 {p['ja2']}, "
                         f"English {p['en']}, 大丈夫です {p['q-ja']} with English {p['q-en']}."})
rev = {'title': "Rei's voice", 'date': '2026-10-09', 'by': 'voice agent', 'status': 'open', 'multi': False,
       'question': 'Which of these is Rei?', 'media': media, 'options': opts}
os.makedirs('reviews/rei-voice-1', exist_ok=True)
json.dump(rev, open('reviews/rei-voice-1/review.json', 'w'), indent=1, ensure_ascii=False)
print('wrote reviews/rei-voice-1/review.json')
