"""Carina voice round 1: the candidate voice designs and the sample lines (gen.py renders, pick.py checks and exports)."""
import os

WORK = os.path.expanduser('~/ai/carina-voice-1')
SEEDS = [404, 505, 606]
NOACC = 'Neutral, standard English with no regional or foreign accent.'
# Spread from low and husky to bright; a and b follow data/mc/carina.json, c and d the confident relaxed direction.
CANDS = [
    {'id': 'a', 'label': 'a. Tired and quiet',
     'instruct': 'A woman in her thirties, quiet and polite, a little tired. Soft medium-low voice, gentle and reserved, '
                 'unhurried, slightly weary at the end of a long day but kind. ' + NOACC},
    {'id': 'b', 'label': 'b. Dry and level',
     'instruct': 'A woman in her thirties with a dry, level, matter-of-fact voice. Medium-low pitch, understated, little '
                 'emotion, even pace, quietly deadpan and polite, a practical tech support engineer. ' + NOACC},
    {'id': 'c', 'label': 'c. Relaxed, slightly husky',
     'instruct': 'A confident, relaxed woman in her late twenties. Low-medium pitch with a slightly husky texture, warm '
                 'and calm, a little amused, unhurried, never shy, not girlish. ' + NOACC},
    {'id': 'd', 'label': 'd. Warm, easy, amused',
     'instruct': 'A relaxed, self-assured woman in her late twenties. Medium pitch, warm and clear, an easy smile in the '
                 'voice, lightly amused, calm and natural pace, not girlish. ' + NOACC},
    {'id': 'e', 'label': 'e. Low, husky, weary',
     'instruct': 'A woman in her thirties with a low, husky, slightly smoky voice. Calm and quiet, tired, slow and '
                 'deliberate, polite, a little dry. ' + NOACC},
    {'id': 'f', 'label': 'f. Bright and clear',
     'instruct': 'A woman around thirty with a bright, clear, crisp voice. Medium-high pitch, polite and friendly, '
                 'quick and articulate, composed. ' + NOACC},
]
REF_TEXT = ("Hi, I'm with IT support, the new contractor. It's my first day, and honestly, I have no idea where the "
            "office is. Is this the right train? Sorry, I'm still half asleep.")
# Eric's real lines (her versions have the same text, keys <key>-carina); ln-1jt4934 is spliced: ここ (Japanese) + English
LINES = [
    {'id': 'en1', 'key': 'ln-nv21v1', 'lang': 'English', 'tts': "Yeah, IT support. I'm the contractor, it's my first day."},
    {'id': 'en2', 'key': 'ln-uf8chl', 'lang': 'English', 'tts': 'Sea on both sides. Nobody said the island was this far out.'},
    {'id': 'mix-en', 'key': 'ln-1jt4934', 'lang': 'English', 'tts': 'Right by the fountain.'},
    {'id': 'mix-ja', 'key': 'ln-1jt4934', 'lang': 'Japanese', 'tts': 'ここ。'},
    {'id': 'word', 'key': 'eric-ohayo', 'lang': 'Japanese', 'tts': 'おはようございます。'},
]
