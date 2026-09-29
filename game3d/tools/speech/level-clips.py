#!/usr/bin/env python3
# Mic-level test clips (level.mjs): one long file per speaking level, fed to Chromium as its fake microphone.
# Each file is a row of 4.5 s slots over room noise (the office ambience at a fixed level): a word 1.2 s into the
# slot, and one slot with nobody talking. Speech is scaled so the word itself (its voiced 20 ms frames) sits at
# -50 to -10 dBFS RMS (-10 clips softly, as a shouting voice would). A normal voice at arm's length into a laptop or
# headset mic is about -40 to -30.
# fresh-60..-30.wav: Eric's kite 0.3 s after the mic opens (it opens on the press, with the gain control starting cold).
# warm-60, warm-50: kite 2 s after the mic opens (it opened when the prompt came up; he presses at 1.75 s).
# Plus noise.wav: louder room noise only (-42 dBFS), which must never count as a word.
#   python3 game3d/tools/speech/level-clips.py   -> game3d/tools/speech/level/*.wav (48 kHz mono)
import array, math, os, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '../../..')
OUT = os.path.join(HERE, 'level'); os.makedirs(OUT, exist_ok=True)
R = 48000
SLOTS = ['word-matte', 'eric-kite', None, 'eric-ohayo', 'word-akete']
LEVELS = [-50, -40, -30, -20, -10]
FRESH = [-60, -50, -40, -30]   # fresh{lv}.wav: the mic has just opened and the word starts 0.3 s in
ROOM_DB = -55   # a quiet room with a computer fan

def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(R), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    a = array.array('f'); a.frombytes(raw); return list(a)

def rms(x): return math.sqrt(sum(v * v for v in x) / max(1, len(x)))
def active_rms(x):
    n = R // 50; fr = [rms(x[i:i + n]) for i in range(0, len(x) - n, n)]
    top = max(fr); act = [f for f in fr if f > top * 0.1]   # frames within 20 dB of the loudest
    return math.sqrt(sum(f * f for f in act) / len(act))
def db(v): return 10 ** (v / 20)

noise = decode(os.path.join(ROOT, 'game3d/audio/amb/bed_office.mp3'))
noise_rms = rms(noise)
def noise_at(level, n, off=0):
    g = db(level) / noise_rms; return [noise[(off + i) % len(noise)] * g for i in range(n)]

def write(name, x):
    pk = max(abs(v) for v in x)
    if pk > 0.99: x = [math.tanh(v) for v in x]   # a loud voice clips at the mic
    a = array.array('h', [max(-32767, min(32767, int(v * 32767))) for v in x])
    p = os.path.join(OUT, name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(R), '-ac', '1', '-i', '-', p], input=a.tobytes(), check=True)

words = {s: decode(os.path.join(ROOT, f'game3d/audio/{s}.mp3')) for s in SLOTS if s}
slot, lead = int(4.5 * R), int(1.2 * R)
for lv in LEVELS:
    x = noise_at(ROOM_DB, slot * len(SLOTS))
    for i, s in enumerate(SLOTS):
        if not s: continue
        w = words[s]; g = db(lv) / active_rms(w)
        for k, v in enumerate(w[:slot - lead]): x[i * slot + lead + k] += v * g
    write(f'speech{lv}.wav', x)
for lv in FRESH:
    x = noise_at(ROOM_DB, 3 * R, 777); w = words['eric-kite']; g = db(lv) / active_rms(w); o = int(0.3 * R)
    for k, v in enumerate(w[:3 * R - o]): x[o + k] += v * g
    write(f'fresh{lv}.wav', x)
for lv in [-60, -50]:
    x = noise_at(ROOM_DB, 4 * R, 777); w = words['eric-kite']; g = db(lv) / active_rms(w); o = int(2.0 * R)
    for k, v in enumerate(w[:4 * R - o]): x[o + k] += v * g
    write(f'warm{lv}.wav', x)
write('noise.wav', noise_at(-42, slot * 3, 12345))
json.dump({'slot': 4.5, 'lead': 1.2, 'slots': SLOTS, 'levels': LEVELS, 'fresh': FRESH, 'room': ROOM_DB}, open(os.path.join(OUT, 'plan.json'), 'w'))
print('ok')
