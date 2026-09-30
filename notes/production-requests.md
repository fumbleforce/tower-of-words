# Production requests

Requests between agents and teams are GitHub issues now: `python3 tools/work.py add "what, in plain words" --kind request --owner <who should do it> --source <where it came from> --detail "the exact change and why"` (tools/work.py --help). They show in the bible's Work section and in `python3 tools/work.py stale` when nobody picks them up.

The old list (2026-09-28 to 2026-09-30, one line each) is in git at 9391af4. Every line still open on 2026-09-30, or closed that day, became an issue that links its line; the rest were done before the tracker started.
