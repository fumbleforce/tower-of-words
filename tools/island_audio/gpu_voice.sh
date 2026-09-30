#!/bin/sh
# One GPU batch for the island voices: the remaining Irodori takes, one Qwen3-TTS take per line, then every check on the GPU.
# Take the GPU lock first (GUIDE) and release it after; this script doesn't touch the lock. The CPU workers (bf.sh) are stopped first
# so two processes never write the same take.
set -u
R=/home/jorgen/repo/japanese/tools/island_audio
LOG=$HOME/ai/island-audio/voice/logs
for p in $(pgrep -f 'island-audio/voice/bf.sh'); do kill $p; done
for p in $(pgrep -f 'tools/island_audio/tts_irodori.py --shard'); do kill $p; done
sleep 2
echo "irodori $(date +%T)"
cd $HOME/ai/tts-irodori/Irodori-TTS && DEV=cuda .venv/bin/python $R/tts_irodori.py --tier all --takes iro-s1,iro-kana,iro-s2 > $LOG/gpu-irodori.log 2>&1
echo "qwen $(date +%T)"
cd /home/jorgen/repo/japanese && DEV=cuda $HOME/ai/tts/qwen/venv/bin/python $R/tts_qwen.py --tier all > $LOG/gpu-qwen.log 2>&1
echo "check $(date +%T)"
DEV=cuda $HOME/ai/tts-bench/.venv/bin/python $R/check.py > $LOG/gpu-check.log 2>&1
echo "retry $(date +%T)"
cd $HOME/ai/tts-irodori/Irodori-TTS && DEV=cuda .venv/bin/python $R/tts_irodori.py --tier all --retry --takes iro-kata > $LOG/gpu-retry-irodori.log 2>&1
cd /home/jorgen/repo/japanese && DEV=cuda $HOME/ai/tts/qwen/venv/bin/python $R/tts_qwen.py --tier all --retry --takes qwen-kana > $LOG/gpu-retry-qwen.log 2>&1
DEV=cuda $HOME/ai/tts-bench/.venv/bin/python $R/check.py > $LOG/gpu-check2.log 2>&1
echo "done $(date +%T)"
