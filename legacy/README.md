# 塔 Tower of Words

A small, offline-first Japanese RPG built for commute-sized sessions.

- **Quest** (~12 min, train days): reviews, then new skills, then a field battle.
- **Patrol** (~5 min, home days): due reviews plus a few new items.
- **Floor boss**: a dialogue scene with comprehension and sentence-building questions. Beating it unlocks the next floor.
- Twelve floors, from a katakana repair floor up to the finale: SAO episode 1 with Japanese subtitles.

It uses spaced repetition (Leitner-style stages, see `INTERVALS` in `app.js`); an item counts as "known" at stage 3. Progress is stored in `localStorage` and can be backed up from Settings. Audio uses the device's Japanese text-to-speech voice.

## Running
It's plain static files, with no build step. Serve the folder (`python3 -m http.server`) or use GitHub Pages. Add it to your phone's home screen to install it as an app.

## Content
Each floor is `data/floorNN.js`; the format is in `CONTENT_SPEC.md`. After changing content or code, bump `VERSION` in `sw.js` so phones pick up the update.
