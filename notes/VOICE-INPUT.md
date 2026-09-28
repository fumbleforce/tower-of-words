# Voice input

Jørgen (2026-09-28): "it should be possible to speak into the microphone and voice the various words rather than type them. Goes for when you use them too. Up until you have written/said it a few times, you still have to type it / say it in the game, so it is not just clicking it."

Two parts:

- Speech as a second way in. At the typing prompt, and when a word still needs practice in the Say menu, Eric can hold V (or the mic button on the phone) and say the word instead of typing the romaji.
- Practice before clicking. Each word has to be typed or said successfully 3 times (a setting) before the Say menu lets him just pick it. Until then, picking it opens the small type-or-say prompt. The Words panel shows the count per word, it's saved with the game, and nothing ever blocks the story: the romaji and the English are always on screen, help comes after a few tries, and the prompt can be backed out of.

## 1. Study: how others do it

| Game or app | What it does with the voice | What we take |
|---|---|---|
| Hey You, Pikachu! (N64, 1998) | A small fixed vocabulary per scene through the Voice Recognition Unit. When it doesn't understand, Pikachu tilts his head and shows a "?" and the game carries on. | A miss is a small reaction, never a fail state. The game only listens for the few words that make sense right now. |
| Seaman (Dreamcast, 1999) | You hold a button on the mic to talk; Seaman comments on what he heard. Misheard input turns into his sarcasm. | Push to talk makes it obvious when the game is listening. Showing what was heard makes a miss understandable. |
| Lifeline (PS2, 2003) | Every action is a spoken command to Rio. Reviews hated the misrecognitions because there was no other way to act. | Voice is always optional. Typing stays right there, and the player can switch at any moment. |
| There Came an Echo (2015) | Push to talk, mic calibration, and custom command words. Players with any accent fought the recogniser (TechRaptor: it wants "exact pronunciation with exact tempo"). | Tolerance for accents is the whole game. Let the player hear the target, and judge the sound, not the spelling. |
| In Sound Mind (2021) | I couldn't find a microphone mechanic in it (its voice is the recorded tapes and phone calls). Games that do use the mic this way, such as Phasmophobia, listen for a few trigger words and let everything else pass without comment. | Listen only for the words that count, and ignore the rest quietly. |
| Duolingo speaking exercises | A mic button, a live waveform while you talk, and a lenient pass. After a couple of misses it lets you continue anyway, and "Can't speak now" turns speaking off for a while. | A level meter while listening. A way to skip voice without losing anything. Leniency over strictness. |
| Busuu speaking exercises | Recordings go to other learners for feedback rather than being auto-graded. | The goal is saying it out loud, not a pronunciation score. We don't grade accents. |
| Chants of Sennaar (2023) | A word becomes yours through use: you guess meanings in the journal and the game confirms them after enough correct uses in context. | Mastery comes from using the word where it does something, and the confirmation is visible (our progress dots, then "by heart"). |

What that adds up to:

1. Forgiving. Match on the sound: long vowels, the small tsu, devoiced u (dashte), e for i and the English habit of saying "kite" like the kite you fly all pass. Only the few words Eric can say are candidates.
2. Feedback while speaking: the mic button fills, a level meter moves with the voice, and the ring swells with loudness, so it's clear the game hears him.
3. On a miss: say what was heard ("Didn't catch that (heard かて). Try again, or type it."), name the word it sounded like if it was another one he knows, and after two misses offer "Hear it", which plays the word slowly. No counters, no timers, no penalty. The typing box stays open the whole time.
4. Privacy: the mic is asked for only on the first press, with one line saying where the audio goes. On this device, it stays on the device. The browser option says plainly that Chrome sends the audio to Google. The mic is closed whenever the prompt closes.

## 2. Tech (local first)

Choice: Whisper base (multilingual), run in the browser by transformers.js in a web worker, with the model downloaded once from Hugging Face and kept in the browser's cache. The Web Speech API is the opt-in fallback for devices that can't run the model.

Numbers and the hit rates are in section 4 (filled from game3d/tools/speech/results/).

## 3. Build

Files (voice-input agent):

- game3d/js/speech-match.js: the forgiving matcher (kana, kanji and romaji all go to one spelling; edit costs by sound).
- game3d/js/speech-worker.js: the recogniser off the main thread (Whisper or Moonshine through transformers.js).
- game3d/js/speech.js: modes, the microphone, the browser recogniser, and the mic row (`mountVoice`).
- game3d/js/mastery.js: the practice counts (`needsPractice`, `notePractice`, `pipsHTML`), kept in the story flags so saves carry them.
- game3d/vendor/transformers/transformers.min.js: transformers.js 4.3.0 (Apache-2.0), the self-contained browser build.
- game3d/tools/speech/: clips.sh (test clips), bench.html and bench.mjs (the bench), queue.sh (the runs behind the numbers), states.html and states.mjs (the UI state sheet).

The wiring into ui.js, menu.js, settings.js and main.js is requested in notes/production-requests.md.

## Where I am (paused 2026-09-29, overnight agent cap)

Done: the study (section 1), the matcher, the worker (Whisper and Moonshine, plus forced-decoding scores), speech.js with the mic row in all states, mastery.js, the bench and clip set, the state-sheet page, and the shell and builder requests in notes/production-requests.md (not yet sent to them).

First numbers (whisper, WASM, one thread, while three benches shared the CPU, so the times are high), 100 positive tries (10 words, native and Eric's clips, 5 mic conditions each) and about 980 wrong-word checks:

- whisper-base q8 (77 MB): 85% hits with the sound-weighted matcher (native 49/50, Eric 36/50), 6 false accepts. About 2.8 s per word.
- whisper-tiny q8 (41 MB): 70% hits (native 49/50, Eric 21/50), 5 false accepts. About 1.4 s per word.
- Eric's misses on base are mostly よろしく heard as kanji nonsense (喜悔しましょう) and akete heard as かて.

Next, in this order: run `game3d/tools/speech/queue.sh` (one browser at a time, takes /tmp/claude-1000/browser.lock), then `SCORE=1 node game3d/tools/speech/bench.mjs base wasm 1 base-score` to tune SCORE_RULE in js/speech-match.js; get Moonshine working (its run is untested); fill section 2 with clean load and recognition times for desktop, the 4x-slowed phone profile and WebGPU; run `node game3d/tools/speech/states.mjs` for the UI sheet (game3d/shots/voice/states-sheet.png) and look at every state; then message the main agent.
