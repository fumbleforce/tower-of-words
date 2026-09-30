"""Who speaks with which voice in the island slice, and how each take is made. Shared by the TTS runners, the checker and the export.
Every voice is local and cloned from a reference clip (GUIDE, Voices and audio). Placeholder until Jørgen approves."""
import os, re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = os.path.expanduser('~/ai/island-audio')
RAW = f'{W}/voice/raw'
LINES = f'{W}/voice/lines.json'
VR = f'{REPO}/tools/voice-refs'

# speaker -> (reference wav, transcript of the reference for Qwen3-TTS, where the reference comes from)
REFS = {
    'emi': (f'{VR}/emi-slice12.wav', open(f'{VR}/emi-slice12.txt').read().strip() if os.path.exists(f'{VR}/emi-slice12.txt') else '',
            'old game lines, MiniMax Japanese_CalmLady (tools/island_audio/refs.py)'),
    'rei': (f'{VR}/rei-slice12.wav', open(f'{VR}/rei-slice12.txt').read().strip() if os.path.exists(f'{VR}/rei-slice12.txt') else '',
            'old game lines, MiniMax Japanese_ColdQueen (tools/island_audio/refs.py)'),
    'player': (f'{VR}/player-slice12.wav', open(f'{VR}/player-slice12.txt').read().strip() if os.path.exists(f'{VR}/player-slice12.txt') else '',
               'old game player lines, Qwen3-TTS design clone (tools/island_audio/refs.py)'),
    'mio': (f'{VR}/mio-a.wav', 'ミオ。……べつに、ゲームしてるだけ。話しかけてもいいけど、つまんないよ。あ、そのお菓子、ちょっとちょうだい。',
            'voice A, chosen 2026-09-25 (legacy/proto2/voice-mio)'),
    'ishibashi': (f'{VR}/ishibashi-ref12.wav', '止まって。IDカード、見せて。…はい、次の人。ここは毎朝、何百人も通るんだ。顔はだいたい覚えてる。知らない顔は、止める。それが俺の仕事だ。',
                  'Ishibashi reference from the old game'),
    'lift': (f'{VR}/lift-announcer.wav', 'まもなく、天川シティ中央駅です。お出口は右側です。',
             'the monorail announcer (MiniMax Japanese_KindLady), reused as the building\'s recorded voice'),
}

# Voices with no earlier clip: designed from a caption with Irodori v4.1 (no reference), then cloned for every line.
DESIGN = {
    'salaryman': ('四十代の男性会社員。少し疲れた、落ち着いた低めの声で、丁寧に話している。',
                  'おはようございます。今日は朝から会議が三つもあって、正直、ちょっと疲れています。でも、まあ、がんばります。'),
    'staff': ('二十歳くらいの女性の店員。明るく、はきはきとした、丁寧な接客の声。',
              'いらっしゃいませ。お飲み物はいかがですか。こちらがメニューになります。ご注文が決まりましたら、お呼びください。'),
    'sales': ('二十代後半の男性。飲み会で盛り上がっていて、明るく大きな声で話している。',
              'おーい、こっちこっち！まだ始まったばかりだよ！ほら、もう一杯いこう！部長も来るって！'),
    'vending': ('自動販売機の録音音声。明るく元気な若い女性の声で、ゆっくり、はっきりと話す。',
                'いらっしゃいませ。お好きな商品をお選びください。ありがとうございました。またのご利用をお待ちしております。'),
}
DESIGN_DIR = f'{W}/refs/design'
for v in DESIGN:
    REFS[v] = (f'{VR}/{v}-design.wav', DESIGN[v][1], f'designed with Irodori v4.1 from the caption 「{DESIGN[v][0]}」')

FEMALE = {'emi', 'rei', 'mio', 'staff', 'vending', 'lift'}
MALE = {'ishibashi', 'player', 'salaryman', 'sales'}

# Loudness targets (integrated LUFS, per character). The player is quieter (GUIDE), recorded building voices a little under the cast.
LUFS = {'player': -23.0, 'lift': -20.0, 'vending': -20.0}
LUFS_DEFAULT = -18.0

# Takes: name -> (engine, seed, which text). "kana" uses the reading column instead of the kanji line.
TAKES = {
    'iro-s1': ('irodori', 101, 'jp'),
    'iro-s2': ('irodori', 202, 'jp'),
    'iro-kana': ('irodori', 303, 'reading'),
    'qwen-s1': ('qwen', 404, 'jp'),
    # retries, only for lines where no take passed the checks (retry.py)
    'iro-kata': ('irodori', 505, 'katakana'),
    'qwen-kana': ('qwen', 606, 'reading'),
    'iro-s3': ('irodori', 707, 'jp'),
    'iro-s4': ('irodori', 808, 'jp'),
    'iro-s5': ('irodori', 909, 'reading'),
    'iro-s6': ('irodori', 1010, 'katakana'),
    # fixed length, for short lines where Irodori's length predictor runs long and fills the time with extra sounds
    'iro-len09': ('irodori', 1111, 'jp'),
    'iro-len11': ('irodori', 1212, 'jp'),
}
FIXED_SECONDS = {'iro-len09': 0.9, 'iro-len11': 1.1}
RETRY = ('iro-kata', 'qwen-kana')


def katakana(s):
    return ''.join(chr(ord(c) + 0x60) if '\u3041' <= c <= '\u3096' else c for c in s)


def tts_text(s):
    s = s.replace('〜', 'ー').replace('　', ' ')
    s = s.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
    return s.strip()


def take_text(line, which):
    if line.get('tts'):  # a wordless line voiced as a sound (「……？」 as 「……ん？」)
        return tts_text(katakana(line['tts']) if which == 'katakana' else line['tts'])
    if which == 'katakana':
        return tts_text(katakana(line['reading']))
    return tts_text(line['reading'] if which == 'reading' else line['jp'])


def take_needed(line, take):
    eng, seed, which = TAKES[take]
    if which == 'reading' and (line.get('tts') or tts_text(line['reading']) == tts_text(line['jp'])):
        return False
    return True


def safe(s):
    return re.sub(r'[^A-Za-z0-9._-]', '_', s)
