#!/usr/bin/env bash
# Test clips for the voice-input bench: every word clip (native word-<id> and Eric's learner eric-<id>) in five
# versions a real microphone might give: clean (with the silence a mic picks up around it), over the train's
# ambience, through a narrow phone band, said slowly, and far from the mic in a room. Plus negatives: Japanese
# sentences from tools/voice-refs and ambience with nobody speaking. Writes game3d/tools/speech/clips/*.wav.
set -euo pipefail
cd "$(dirname "$0")/../../.."
A=game3d/audio; O=game3d/tools/speech/clips; mkdir -p "$O"; rm -f "$O"/*.wav
PAD="adelay=450|450,apad=pad_dur=0.5"
W="matte akete kite ugoite irete dashite tomatte ohayo yoroshiku sumimasen"
ff() { ffmpeg -v error -y "$@"; }
for id in $W; do for who in word eric; do
  src="$A/$who-$id.mp3"; [ -f "$src" ] || continue; b="$who-$id"
  ff -i "$src" -af "$PAD" -ac 1 -ar 16000 "$O/$b.clean.wav"
  ff -i "$src" -i "$A/amb/bed_train.mp3" -filter_complex "[0]$PAD[v];[1]volume=0.55,atrim=0:4[n];[v][n]amix=inputs=2:duration=first:normalize=0" -ac 1 -ar 16000 "$O/$b.train.wav"
  ff -i "$src" -af "$PAD,highpass=f=300,lowpass=f=3400,aresample=8000" -ac 1 -ar 16000 "$O/$b.phone.wav"
  ff -i "$src" -af "atempo=0.8,$PAD" -ac 1 -ar 16000 "$O/$b.slow.wav"
  ff -i "$src" -af "$PAD,volume=-16dB,aecho=0.8:0.7:40|70:0.35|0.2" -ac 1 -ar 16000 "$O/$b.far.wav"
done; done
# negatives: someone else's Japanese (first 2.5 s) and a room with nobody speaking
for r in mio kenji-design kuro-design mori-design emi-slice12; do
  ff -i "tools/voice-refs/$r.wav" -af "atrim=0:2.5" -ac 1 -ar 16000 "$O/neg-$r.clean.wav"; done
for b in train office lobby; do ff -i "$A/amb/bed_$b.mp3" -af "atrim=0:2" -ac 1 -ar 16000 "$O/neg-amb-$b.clean.wav"; done
ls "$O" | wc -l
