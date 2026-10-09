"""Rei voice round 1 (#257): the candidate voices and the sample lines (gen.py renders, pick.py checks and exports,
review.py writes the Review item). Method as Kuro's round (reviews/kuro-voice-2): a Qwen3-TTS VoiceDesign voice made in
Japanese from a short description, all reading the same Japanese reference text, then cloned with Qwen3-TTS Base the
way the game does it (tools/voice/gen_takes.py): Japanese and English both from the full reference."""
import os

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
VR = f'{REPO}/tools/voice-refs'
WORK = os.path.expanduser('~/ai/rei-voice-1')
SEEDS = [int(s) for s in os.environ.get('SEEDS', '404,505,606').split(',')]
BASE = 'A Japanese woman of forty-one, a sales manager. Native Japanese speaker. '
CANDS = [
    {'id': 'a', 'label': 'a. Low, cold and clipped',
     'instruct': BASE + 'Medium-low voice, cool and clipped, crisp consonants, no warmth, speaks quickly and expects '
                        'to be obeyed. Not husky, not breathy.'},
    {'id': 'b', 'label': 'b. Sharp and fast',
     'instruct': BASE + 'Medium pitch, sharp, brisk and impatient, quick tempo, a strict boss scolding her team, '
                        'clear and cutting. Not husky.'},
    {'id': 'c', 'label': 'c. Deep and commanding',
     'instruct': BASE + 'Low, steady, firm voice with heavy authority, a little rough at the edges, unhurried but '
                        'never soft, a woman used to giving orders. Not breathy, not seductive.'},
    {'id': 'd', 'label': 'd. Cool and smooth, dry amusement',
     'instruct': BASE + 'Medium-low, polished and controlled, composed, a faint dry amusement under it, never raises '
                        'her voice because she never needs to. Precise diction. Not husky.'},
    {'id': 'e', 'label': 'e. Clear and strict',
     'instruct': BASE + 'Medium-high, clear, strong projection, like a strict teacher in front of a class, brisk and '
                        'precise, firm endings on every sentence.'},
]
# for comparison, not designed in this round: her borrowed voice today, and the old prototype's Rei
COMPARE = [
    {'id': '0', 'label': '0. Today (borrowed: the shop clerk voice)', 'ref': f'{VR}/staff-design.wav',
     'ref_text': 'いらっしゃいませ。お飲み物はいかがですか。こちらがメニューになります。ご注文が決まりましたら、お呼びください。'},
    {'id': 'p', 'label': 'p. The old prototype\'s Rei', 'ref': f'{VR}/rei-slice12.wav',
     'ref_text': open(f'{VR}/rei-slice12.txt').read().strip()},
]
REF_TEXT = ('営業部のレイです。来週の納品の件、先に確認させてください。数量は前回と同じで、日付は火曜日です。'
            '……それから、あなた。報告書、まだ出てないよね。今日中に出しなさい。')
# the same four lines for every voice, from notes/characters/rei/voice.md (example lines 1, 3, 5 and 7)
LINES = [
    {'id': 'ja1', 'lang': 'Japanese', 'tts': '考えてる暇があったら、電話しなさい。断られたら、そのとき考えればいいの。'},
    {'id': 'ja2', 'lang': 'Japanese', 'tts': 'お客さんに何て言ったの？……もう一度、最初から説明しなさい。'},
    {'id': 'en', 'lang': 'English', 'tts': "I don't understand the joke. Can we go back to the delivery date?"},
    # the quiet one: 大丈夫です said in Japanese and spliced in front of the English, as the game does mixed lines
    {'id': 'q-ja', 'lang': 'Japanese', 'tts': '大丈夫です。'},
    {'id': 'q-en', 'lang': 'English', 'tts': "We're one game from the set, so serve."},
]


def voices():
    """id -> (reference wav, its transcript, label) for every voice in the round."""
    v = {c['id']: (f"{WORK}/{c['id']}/ref.wav", REF_TEXT, c['label']) for c in CANDS}
    v.update({c['id']: (c['ref'], c['ref_text'], c['label']) for c in COMPARE})
    return v
