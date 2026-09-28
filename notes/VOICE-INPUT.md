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

On-device recognition runs in the browser through transformers.js (4.3.0, from jsDelivr) in a web worker, so the game and the level meter keep moving while it thinks. The model downloads once from Hugging Face and stays in the browser's cache (Cache Storage, with the WASM runtime cached too), so it works offline on the train after the first time. The mic is opened only on the first press and closed when the prompt closes.

Matching (js/speech-match.js). Whatever the recogniser writes (kanji, kana or romaji) goes to one plain romaji spelling: the day's words written in kanji become kana, katakana become hiragana, fillers (えーと, あの) drop, long vowels and the small tsu collapse, and l is read as r. It's then compared by sound. A wrong consonant costs 1, and a vowel slip or a dropped y, w or h costs a half, so "kait" for kite, "E-rate" for irete and "You Go It" for ugoite pass. A word may sit inside a longer answer, but anything left over costs a little. If the answer is closer to another word Eric knows, it counts as that word (止まって is not まって), and the miss says so.

Second opinion (Whisper only). When the transcript misses, the worker asks Whisper how likely each word Eric can say is for the same audio (forced decoding on the kept encoder output). The target passes if it scores within 1.0 of the free transcript, above -2.0, and 0.8 ahead of every other word (SCORE_RULE, tuned on the bench). This is what caught よろしく when Whisper wrote 喜悔しましょう. Moonshine's scores lean toward long phrases, so it doesn't use this.

The bench plays our own clips into the real browser code (game3d/tools/speech/bench.mjs, headless Chromium, one thread, which is what GitHub Pages allows without cross-origin isolation). There are 10 words, each as the native word clip (word-<id>.mp3) and Eric's learner clip (eric-<id>.mp3), in 5 conditions: clean with mic silence around it, over the train's ambience, through a phone band, slowed to 0.8, and quiet in a room. That's 100 tries. Each try is also checked against the 9 wrong words, plus 5 other speakers' Japanese sentences and 3 rooms with nobody talking, which gives 979 checks that should all fail.

| Model | Download | First load | Time per word (desktop, 1 thread) | Hits | Native | Eric | False accepts |
|---|---|---|---|---|---|---|---|
| Whisper base q8 + second opinion | 77 MB | 4.9 s | 2.7 s, plus 2.3 s only after a miss | **92%** | 50/50 | 42/50 | 6/979 |
| Whisper base q8, transcript only | 77 MB | 4.9 s | 2.7 s | 85% | 49/50 | 36/50 | 6/979 |
| Whisper tiny q8 + second opinion | 41 MB | 3.5 s | 1.3 s (+1.1 s) | 72% | 47/50 | 25/50 | 5/979 |
| Moonshine Tiny JA q8 | 147 MB | 9.7 s | **0.05 s** | 72% | 49/50 | 23/50 | 6/979 |

Per word, Whisper base with the second opinion (native / Eric): matte 5/5 5/5, akete 5/5 2/5, kite 5/5 4/5, ugoite 5/5 4/5, irete 5/5 5/5, dashite 5/5 2/5, tomatte 5/5 5/5, ohayo 5/5 5/5, yoroshiku 5/5 5/5, sumimasen 5/5 5/5. By condition: clean 19/20, train 18/20, phone band 17/20, slow 19/20, quiet room 19/20. Eric's akete comes out かて, which really is closer to 来て, and his dashite comes out as a dash or ダシアイト. All 6 false accepts are Eric's own words heard as a neighbouring word (his akete as kite, tomatte as matte, yoroshiku on the phone band as sumimasen). None of the other speakers' sentences or the empty rooms passed as a word. A silent recording never reaches the model at all (Whisper invents "thanks for watching" from silence).

For reference, Whisper large-v3-turbo on the same clips (CPU, not in the game) heard Eric's clips as マテ, Aketai, KITE, ユーゴイト, イレイティ, Dashite, トマテ, おはようございます, よろしくお願いします and Sumimasen. His TTS reads some words with an English accent, which makes these clips a harsh stand-in for a real learner.

Phone. Chrome's CPU throttling doesn't reach web workers (the 4x-throttled run took the same time as the normal one), so the phone numbers are an estimate. A mid-range Android phone is about 3 to 4 times slower per thread than this desktop (Ryzen 9 9950X3D), so Whisper base would take about 7 to 10 s a word, tiny about 4 to 5 s, and Moonshine about 0.2 s. So the game picks per device (`pickModel()` in speech.js): Whisper base on a computer and Moonshine on a phone, with `settings.voiceModel` to override. Two things would change this. Cross-origin isolation (a small service worker, requested from the builder as optional) lets the WASM runtime use several threads, which is 2 to 4 times faster. WebGPU would make Whisper base fast on the desktop and on newer Android phones. I couldn't measure WebGPU: headless Chromium's Vulkan device here runs out of memory on the first run, even with the GPU free. It needs a check in a real browser window.

Web Speech API (Settings > Voice input > Browser). It's opt-in and small, with live partial results, and matched the same way. Chrome sends the audio to Google's servers and needs a connection, so it won't work on the train, and the setting says so. It can't be tested headlessly, and I couldn't measure it here.

Licences: transformers.js and Whisper are Apache-2.0 and MIT. Moonshine's Japanese model is under the Moonshine AI Community License (free below a revenue threshold). Check it before selling anything.

## 3. Build

Files (voice-input agent):

- game3d/js/speech-match.js: the forgiving matcher (kana, kanji and romaji all go to one spelling; edit costs by sound).
- game3d/js/speech-worker.js: the recogniser off the main thread (Whisper or Moonshine through transformers.js).
- game3d/js/speech.js: modes, the microphone, the browser recogniser, and the mic row (`mountVoice`).
- game3d/js/mastery.js: the practice counts (`needsPractice`, `notePractice`, `pipsHTML`), kept in the story flags so saves carry them.
- transformers.js 4.3.0 (Apache-2.0) loads from cdn.jsdelivr.net at first use (pinned version). It was vendored at first, but GitHub's push protection read the minified bundle as an API key, so it's no longer in git.
- game3d/tools/speech/: clips.sh (test clips), bench.html and bench.mjs (the bench), queue.sh (the runs behind the numbers), states.html and states.mjs (the UI state sheet).

The wiring into ui.js, menu.js, settings.js and main.js is requested in notes/production-requests.md.

## 4. UI states

Sheet: game3d/shots/voice/states-sheet.png (desktop 1366x860 on top, phone 390x844 below), from `node game3d/tools/speech/states.mjs`. The single shots are in game3d/shots/voice/<state>-<desktop|phone>.png. States:

- idle: "or [mic] Hold V or the mic and say it" under the typing box (phone: "Hold the mic and say it").
- asking: the first press says where the audio goes before the browser's permission prompt.
- loading: a progress bar for the one-time download, and typing still works.
- listening: the mic fills teal, a ring swells with loudness, and a nine-bar meter moves with the voice. A long press stops on release. A quick tap listens until 0.9 s of quiet after speech (or 6 s).
- thinking: three dots.
- hit: the romaji letters all light up, then "待って Got it." and the prompt closes as if typed.
- miss: "Didn't catch that (heard かて). Try again, or type it." From the second miss there's also a "Hear it" button that plays the word slowly. Other variants: "That sounded like 止まって." and "Didn't hear anything. Hold V or the mic while you talk."
- blocked: the mic is denied, and the line explains how to allow it and to type meanwhile.
- The Say menu and the Words panel show three dots per word, filling as it's typed or said, then "by heart".

The mic row takes its styles from the game's tokens (teal for on, coral for trouble, no glow). It is published for Jørgen as review item `voice-input-ui`.

## Wiring (requested)

notes/production-requests.md, 2026-09-29, voice-input:

- shell: settings.js keys (`voiceInput`, `voiceKey`, `voiceModel`, `masteryUses`); a Settings row "Voice input" (Off / On this device / Browser, with a plain note on where the audio goes and the download) and "Before a word is one click" (1 / 3 / 5); ui.js typePrompt mounts the mic row, counts every success and can be cancelled; the Say menu and Words panel show the dots.
- builder: main.js say() opens the type-or-say prompt for a word that still needs practice, and backing out does nothing. Optional: cross-origin isolation for faster voice.
