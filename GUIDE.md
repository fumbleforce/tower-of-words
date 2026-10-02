# Working guide: Amakawa

How we work, and the rules Jørgen has set. Every agent reads this before starting. What the game is (setting, cast, places, storylines, words, systems, UI, art and sound) is in docs/game/; read the files for your area and never contradict them. docs/game/README.md maps where every kind of fact lives, game or not: start there when you look something up. When this file and an older doc disagree, this file wins; on what the game is, docs/game/ wins.

Rules that belong to one area live with that area, and this file points to them. Old rules and verdicts that no longer apply (the VN, Godot, the island slice, pixel sprites, low-poly Mio) are in legacy/notes/GUIDE-history.md, word for word. Don't follow them.

## Index

[Who it's for](#who-its-for) · [Working with Jørgen](#working-with-jørgen) · [Writing](#writing) · [Visual design](#visual-design) · [Art](#art) · [Voices and audio](#voices-and-audio) · [Process](#process) · [Engineering](#engineering). Each section opens with a line on what it holds.

## Who it's for

Jørgen's Japanese level (early intermediate, weak katakana), when and where he plays, what games he likes, and that the game adapts to any player's level.

- Jørgen: early intermediate Japanese (courses in 2015; hiragana mostly fine, katakana weak, spotty grammar). Goals: follow anime dialogue and hold conversations in Japan.
- He plays 10 to 15 minutes at a time: on the train on his phone (3 days a week, patchy internet), and at home on the desktop.
- He likes strategy games and RPGs, including adult Japanese RPGs and visual novels, and drama with humour. He dislikes cringe and over-the-top anime reactions.
- Adaptive for any player: other people will start from other levels, so nothing is hard-coded to Jørgen's level (calibrate at the start, then adjust from play).
- Cold-player test at his level (mid-N5, weak katakana) before he plays anything.

## Working with Jørgen

Scope is day 1 only. Anything he picks or judges becomes a Review item; he approves every asset and sees every attempt. Also here: relaying his words as given, left and right on a character, links only (never open things on his screen), publishing and private content, and the Replicate and Meshy budgets.

- Scope (Jørgen, 2026-09-28): "stop going overboard with generating speech and plots 10 steps ahead before we have the intro day nailed." Build only what the intro day plays: one stable, full, fun day before anything else. No future arcs, later-day plots, extra variants or systems for later; procedural content is parked in TODO.md.
- Production pass (Jørgen, 2026-09-28): agents take day 1 to production grade in parallel. Ownership, rules and the quality bar are in notes/PRODUCTION.md; every agent reads it.
- Overnight goal (Jørgen, 2026-09-29): notes/OVERNIGHT.md.
- Character arcs are to be designed in full RPG-walkthrough detail (notes/walkthrough/). They stay ideas until he decides them.
- Reviews go in the bible (Jørgen, 2026-09-28: "your changes happen too quickly, why are you not adding things to the review pages in the bible and allowing me to pick and comment on things there"). Every candidate set or choice becomes a Review item, reviews/<id>/review.json (how to post one: reviews/README.md); his answers land in reviews/<id>/feedback.json (read them with tools/review.py). Chat gets a one-line pointer. Don't pile up changes faster than he can review them.
- Showcase (Jørgen, 2026-09-30): finished visible work goes in the bible's Showcase log (showcase/README.md), where he can flag and comment on it. Review is only for decisions he really has to make.
- Story is ours to write (Jørgen, 2026-09-30: "do surprise me ... you and codex must be able to write whole storylines, secrets, subplots, exploration ideas on your own, i want to play the game too"). Story, dialogue, discoveries, secrets and subplots are written by Codex, checked by a cold read and a Claude story-reader against his recorded taste, then voiced and shipped with no Review item. Reports to him say what kind of content landed and where, never what happens.
- Jørgen approves every asset (2026-09-25): no image, sprite, background, shot or voice goes into a build until he has picked it on a review page. Agents render candidates, check them, post them, and stop.
- Show every attempt (Jørgen, 2026-09-26: "do show me the in progress images you are correcting also as I dont trust your judgement on this"). Every render of a round goes on the review page in order, rejected ones included, with prompt and settings.
- Decide before producing: settle style, model and cast with small comparison sets first. No bulk production until he has approved them. "Keep the GPU busy" means exploration toward a decision.
- Build small slices and let him judge before scaling up. He benchmarks anything new (models, voices, cutouts) himself.
- Style studies (2026-09-28): several attempts for him to judge, sheets at full resolution. Where the current one stands: docs/game/art-and-sound.md.
- Relay feedback as given (Jørgen, 2026-09-28: "STOP overcorrections like this when I give feedback"). Pass his words on as the brief and point at the source he means. Don't add intensifiers or your own reading ("but clearly green").
- Feedback log (2026-09-29): every message he types to Claude Code is saved word for word in notes/feedback-log/ (README there). Quote from it when briefing agents.
- Left and right on a character mean hers (Jørgen, 2026-09-29: "left from HER perspective... none of these fixes it"). Her left is the image's right. Every brief and prompt that names a side says both: "her left (image right)".
- Never open images or pages on his screen (no xdg-open). Give links only, on port 8771 (Engineering, Local review server).
- Every build announcement to Jørgen names the build id shown in the game's corner (game3d/build.json), so he can check he's on it (2026-09-28).
- Report facts, never self-grade ("nailed it"). Say what is actually in an image or build, and admit gaps.
- Publishing (Jørgen, 2026-09-27): the game may be published, so no doc, page, prompt or comment says who any character is based on.
- Private content (2026-09-26): island/PRIVATE.md says what goes where. island/private/user/ and its manifest.user.json are Jørgen's alone: no agent opens, reads, lists, copies, changes or deletes anything there, and QA never loads it. Agents write only in island/private/rewards/.
- Budget: Replicate is capped at $20 total (ledger tools/spend.json). Meshy credits (Jørgen, 2026-09-29, on the Mori 3D round): "he is getting too many points, I was using 1050 points. don't waste too many credits."
- Keep this guide updated whenever Jørgen gives feedback: one line, in the section it belongs to, said once.

## Writing

Plain writing (humanizer), how dialogue must sound (spoken, no AI voice, no exposition panels, no narrating what the player can see), story craft, originality, and the learning rules (short lines, one new thing at a time, no unlearned kanji in UI chrome).

### Plain writing

- All UI text, docs and replies: plain and human. Use the humanizer skill (~/.agents/skills/humanizer). No slogans, no em dashes, no "not X but Y", no filler taglines.

### Dialogue quality

- What works (Jørgen, 2026-09-28, after the rewrite in game3d/story, commits cc0af2c and 06b0ccc): "I love the dialogue now, Mio's lines are good, as is the TTS, really immersive, story makes a lot more sense, and talking to the cat is funny, it doesn't judge." That is the reference: loose, imperfect spoken English for Mio, the voice sheet in game3d/story/VOICE.md, and small funny moments with things in the world.
- No AI voice (Jørgen, 2026-09-28: "The initial dialogue is shit, she talks like you"). Clipped, aphoristic lines (fragments, colon constructions, an X. Y. Z. rhythm) are banned. Writers read and apply the dialogue, story-sense, humanizer and cliche-transcendence skills before writing, and a cold critic flags any line that sounds written rather than spoken.
- NO EXPOSITION IN PANELS (Jørgen, 2026-09-28: "NO EXPOSITION IN JUST PANELS, EXPOSURE THROUGH DIALOGUE"). No title cards, no text-panel setup, no goal cards: who, where, why and what to do come out of what people say. UI text is limited to controls.
- No narration of what the player can see (Jørgen, 2026-09-28: "Stop with the useless exposition when I can SEE this"). Narration only for what can't be seen and matters, in a few words.
- Say what happened when it's easy to miss (Jørgen: "am I catching the train? ... few will even notice the lunch box"). Small key events get a short narration line and a camera frame, and narration names the thing and what is happening to it. Choices always name their object.
- Train discoveries (Jørgen, 2026-09-30): "I dont want more text early on, but sometthing interesting to find."
- Fewest steps (Jørgen, 2026-09-29: "dont overcomplicate scenes like this"). A scene gets the fewest steps that tell the moment, one action per beat, no extra clicks.
- Stage in steps a slow reader can follow (Jørgen, 2026-09-28): set the situation up in a logical order, and frame the person who matters, not just the object.
- Big moments must read on their own (Jørgen, 2026-09-28: "I have no idea what happened... It is extremely poor."). Set up every person and stake before the moment, show the stakes on screen, make the magic visibly and audibly unnatural, and never lean on backstory the player hasn't seen.
- Story and screen must match (Jørgen, 2026-09-28). Every event a line mentions is staged at that moment, and crowds follow the story state (a jammed gate means a queue). If a beat can't be staged, cut it.
- No characters or beats that add nothing (the conductor). Nobody answers a greeting that wasn't addressed to them. A new word is learned by typing its romaji, not by clicking an option.
- Every branch must flow: after each choice the next lines make sense, with the right speaker and voice. Check every path.
- Natural casual Japanese at N5 to N4, in character. Nothing illogical or repeated.

### Story craft

Skills: story-sense, story-analysis, dialogue, scene-sequencing, key-moments, character-arc, novel-revision and story-coach, in ~/.agents/skills.

- Set up before you pay off: nobody refers to anything the player hasn't seen yet.
- Continuity: a scene stays in one place until an explicit transition. Backgrounds, who's present and the time of day match the dialogue.
- Scenes must want something: a goal, an obstacle and a turn. Characters drive scenes; they don't just deliver information.
- Every character has a distinct voice (word choice, sentence length, register); run the dialogue skill's voice checks.
- A story editor reviews the beats, not only the builder.

### Originality

Skill: cliche-transcendence, in ~/.agents/skills.

- Don't repeat ideas or reach for stock "quirky" tropes. Rejected as lame or repeated: the knitting tough guy, the crazy female engineer with a metal arm (done twice). Before proposing a character, list the default clichés for the role and go somewhere else (knowledge, goal, role).
- Draw on real sources: real jobs inside Japanese conglomerates, real office life, observed people, specific cultural detail.
- Characters have their own concerns that collide with the player's story; they don't exist to serve it.

### Learning rules

Game first, learning light (docs/game/setting.md) overrides these where they conflict; docs/game/words.md says what is built.

- Pace (2026-09-25): no screen should take minutes to parse. Keep lines short, and never stack several unknown words, a new grammar point and unknown kanji in one sentence.
- One new thing at a time: one mechanic, one new word, where it's used. No meta "this becomes your task" narration; show it.
- Help only adds detail. It is never needed to follow the story, and there is no clicking for the sake of clicking.
- UI chrome uses no unlearned kanji: digits (8:42) and kana labels until the words are learned.
- Core mechanics must be varied and replayable, not one repeated quiz shape. Test a new mechanic on its own, outside the story, before weaving it into scenes.

## Visual design

No text on timers, the first screen (controls only), a goal line that stays, separate phone and desktop layouts, no brown, gold or serif, the flat-shaded 3D world (never paper or cut-out), and how review pages lay out options.

- No text on timers, ever (Jørgen, 2026-09-28: "stop doing timers like this it is completely inaccessible for anyone"). Hints, notes and goals stay until the player acts and can be re-read. No real-time timers while text is on screen.
- The player always has a reachable next goal, told through people and a goal line that stays (the fast test checks this).
- First screen (Jørgen, 2026-09-28: "too many instructions at once immediately as I begin the game... I thought you QA-ed this"). Order: "start off with JUST controls, NO goals, no other clutter. THEN teach how to talk to people", then the first goal. Never force the player into the story ("don't force the player into the story right away, you are stuck from then on"): they can explore, and they start the story beats.
- Playtest 2026-09-28 (Jørgen and his wife): don't assume VN conventions are known, never ignore input silently (show that the game is waiting, and let clicks hurry scripted moves), scale the UI to the screen, one action menu per target, and an obvious next objective. What was built from this is in docs/game/controls-and-ui.md.
- UI must be recognisable for what it is (a phone looks like a phone), and every interaction is taught the first time it appears.
- Game UI: anime-subtitle presentation plus an in-world company phone. The light review-page style (off-white, teal) is for internal pages only; in the game it "screams e-learning".
- Avoid default AI aesthetics: brown, gold, serif, glows, eyebrow labels. Use the design-taste-frontend and game-ui-design skills.
- Desktop and phone get separate layouts; check both with screenshots. Every part of the interface matches one design language (the "you reply" box failed this twice).
- World style (Jørgen, 2026-09-27): flat-shaded simple 3D (docs/game/art-and-sound.md). Never mention or propose paper, cardboard, cut-out or pop-up styles in any form ("you always do and I hate it").
- New props built with game3d/js/props.js get the world look from game3d/js/look/ (surface patterns, soft baked light, small modelled detail).
- Places must not look empty or like a cheap RPG (Jørgen, 2026-09-26: "avoid the classic low quality RPG traps"). The trap list from the pixel era is in notes/map-design.md.
- Review pages: every option has its unique id as the card heading (e.g. sales-8301) so he can name his pick; large responsive grids (images at least about 480 to 520 px, not 2 per row), a lightbox with arrow keys, and the full prompt under each title.

## Art

Every image prompt starts from a shot-staging note and shows only what is visible; one change per fix; his reference images are never assets; cast palette; no LoRA training; Meshy models; low-poly Mio paused; and, under Rewards, the reward scene rules (spice, quality tags, model, anatomy and limit tests, privacy).

Prompt rules, models, settings, cast prompt lines, reward prompts, composition control, 3D characters and video are in art/PROMPTS.md. Portrait style blocks: art/STYLE.md.

- Every image and video prompt starts with the shot-staging skill (~/.agents/skills/shot-staging/SKILL.md): write the staging note (camera, framing, what is in front of the lens and behind it, motion, eyelines, light), prompt from it, then check the render against it. The note itself stays out of the prompt.
- The main prompt rule (Jørgen, 2026-09-25): it's mostly about what you leave out. Describe only what is visible in the frame. Story context (destination, direction of travel, why he's there) stays out.
- Don't overcorrect (2026-09-25): fix one flaw by changing one thing, with no pile of weights or style words. Check heights and scale, and compare each render with the approved style before showing it.
- Jørgen's own images (art/refs/) are references for quality and prompting only. Never use them as img2img sources or edit them into assets ("minor alterations to my images which I told you not to use"). Make our own master, get it approved, derive from it. Use one of his images as an asset only when he says so.
- Pictures must make physical sense (the train floated on the ocean; the "basement" looked like a sunny home office). Check every image for logic before it ships.
- Expression sets must keep everything except the face identical (outfit colour, details, hair, accessories): repaint only the face of one approved base, never re-roll whole images.
- Cast palette: characters must be distinct in silhouette, hair colour and outfit colour. Not everyone in black, and no two women with similar hair.
- The cast stays (Jørgen, 2026-09-26): keep Mio and the other characters we settled on with the local models, exactly as designed. They're right for dialogue scenes and for shaping the characters, and they're sexy.
- Consistent characters (Jørgen, 2026-09-27): "we don't want to train models". No LoRA training; use local training-free methods (reference adapters, multi-reference editing, img2img or inpainting from the approved portrait).
- 3D characters: the ChatGPT chibi then Meshy workflow is in art/PROMPTS.md ("3D character workflow (Jørgen, 2026-09-28; worked first try for Eric)"). Accessories stay off the model.
- Meshy parts (Jørgen, 2026-09-27, round 14): adapt the models he supplies with the smallest changes that make them fit. Never alter the face, eyes or body he made ("why did you mangle her face… the body was fine, you just need small adaptations"), and no props or overlays on the face unless he asks.
- Shrinking or recolouring a generated mesh (TRELLIS and the like) to simplify it is out: "simplifying an inherently broken model is a stupid way to go about it."
- Low-poly Mio paused (Jørgen, 2026-09-27, after round 14b): "I don't think we will get to the finish line with mio so shut that down for now." No new rounds until he asks.

### Rewards

- Reward scenes (Jørgen, 2026-09-26): make them whenever the GPU is idle, with "real creativity", and with direct spice ("I am all for direct spice on all levels"): revealing outfits, bath and onsen scenes, suggestive poses and angles, compromising situations that come out of play (a command taken literally that traps, soaks or overheats someone).
- More spice, wider choice (Jørgen, 2026-09-27: "these are within bounds, so you should focus on doing more like that"). Many varied pictures in the round-2 onsen style, and leave the style alone. Ordinary scenes can be sexy too (cleavage, curvy poses, tight or skimpy clothes). Also fine: nudity hidden by angle, hair, steam or limbs; colleagues kissing, women with each other included (don't assume anyone's orientation); love affairs in interesting places.
- Every Anima-family prompt starts with the quality tags, then the rating, then the content; a content example from him never removes them (the 2026-09-27 flat-rewards lesson, art/PROMPTS.md "Reward quality").
- Model (2026-09-27, after round 27): RDBT only for reward scenes. No Nova versions and no style variants of one concept; spend renders on new, varied concepts.
- Perspective is not an anatomy fault (Jørgen, 2026-09-27: "it is the camera perspective, it's not off"). Low and overhead angles, foreshortening, hips above the head and upside-down top views are valid. Reject for anatomy only for real errors: extra or missing limbs, fused fingers, a joint bending the wrong way. Critics get the same rule.
- Limit test (Jørgen, 2026-09-27: "nipple detection is oversensitive"). Reject for the limits only when a nipple, an areola or genitals are clearly drawn and visible. Highlights, water rings, shading, folds and show-through that only hints at shape don't count, and "could be read as" is no reason. Points showing through a braless T-shirt are fine and wanted (Jørgen, 2026-10-02: "still suitable for everyone so dont erase all indocations of a woman being a woman"), so never negative-prompt them away. Critics get the same test.
- Rewards and privacy (Jørgen, 2026-09-26): sexy pictures, progression, relationships and the job are all rewards. Everything spicy stays private (island/private/rewards/) until he picks, never on a public page or in the public repo; discreet mode is on by default on the phone.

## Voices and audio

Local models first, game voices are local Qwen3-TTS clones, Mio's voice source and the pitch guard against male drift, and loudness per character.

Methods, tests and music findings are in art/SOUND.md; which voices and tracks are approved is in docs/game/art-and-sound.md.

- Local first (Jørgen, 2026-09-28): use local models whenever one does the job (voices, images, LLM). Game voices are local Qwen3-TTS clones (~/ai/tts/qwen, pipeline tools/voice/ (sh tools/voice/run.sh), refs tools/voice-refs/); edge-tts and paid APIs only as a fallback.
- Mio: voice A from legacy/proto2/voice-mio, cloned from tools/voice-refs/mio-a.wav. Don't over-tune with style instructions; only guard against male drift: redo lines with a median under 190 Hz or more than 10% under 160 Hz. The original casting clip (mio-3) is retired: its lines sometimes drifted male.
- Per-character loudness is normalised; the player voice is quieter.

## Process

One home per fact, one task per agent, the main thread never waits, validate fixes in isolation, storyboard the opening, the cold-player and visual QA gates, facts in the same commit (the `Facts:` line), and the definition of done.

- Say each fact once (Jørgen, 2026-09-29: "stop putting info multiple places, even in the same document, it creates drift"). One home per fact; elsewhere link to it or say nothing. Don't copy GUIDE rules into other docs.
- One focused task per agent (Jørgen, 2026-09-28): different kinds of work go to separate, fresh agents.
- Work tracker (Jørgen, 2026-09-30: "that stuff just gets stuck half done and it doesnt surface"). Every task, request, decision follow-up and parked item is a GitHub issue (https://github.com/fumbleforce/tower-of-words/issues?q=label%3Awork), kept with `python3 tools/work.py` (its `--help` has the rules). Update the issue when you start, park or finish something; a commit that finishes one says "Fixes #N"; run `python3 tools/work.py stale` before reporting. Review items hold his question and answer, issues hold the work; they link, never copy. The repo is public: nothing private in an issue.
- The main thread coordinates and never blocks on waiting; long work goes to background subagents with clear file ownership (notes/PRODUCTION.md).
- Validate each fix in isolation before calling it done (Jørgen, 2026-09-28: "you did not validate the fix properly in isolation"). Render a close-up of the exact thing he flagged, in every state it can be in, look at it, and show him that close-up.
- Design the first minutes as a screen-by-screen storyboard (what's on screen, what the player reads, does and understands) and get it approved before building. No new features until the opening passes.
- Before any build reaches him, the main agent looks at every screen, and at the first 60 seconds (screenshots at 2560x1440 and phone), itself and a fresh cold-player agent reviews them. The cold player knows nothing about the repo, plays on a phone viewport and writes, per screen, what it thinks is happening; any confusion is a bug.
- Visual QA gate (Jørgen, 2026-09-26: "how does that map pass any qa at all… 0/10"). A separate visual critic scores every screen against notes/VISUAL_QA.md (pass mark 8/10); nothing below it reaches him. Never present a greybox or placeholder screen as progress.
- QA means reading as a player: dump every branch as a transcript and read it, and look at every screenshot.
- Never commit binaries (Jørgen, 2026-09-29, review asset-storage: "we should try keeping the repo as lean as we possibly can"). A used asset goes under a root in tools/assets/sync.json (or gets approved in the asset library), then `python3 tools/assets/sync.py push`, and tools/assets/assets.lock.json is committed with the change; the commit hook refuses a used asset that isn't pushed. Everything else binary stays on this machine. Another machine runs `python3 tools/assets/sync.py pull`.
- Facts in the same commit (Jørgen, 2026-09-29): a commit that changes what the game is (a person, place, object, word, beat, choice, control or UI piece) updates its docs/game/ file in the same commit, and its message ends with `Facts: docs/game/<file>` or `Facts: none`. `node tools/facts/check.mjs` checks the docs against the game.
- Definition of done, for every agent (2026-09-29, review productivity-review; the agent definitions in .claude/agents/ link here):
  1. Only your own hunks are committed: stage them with `git add -p` or `git add <your new files>`, read `git diff --cached` first, never `git add -A` or `git add .`, never another agent's hunks. No push unless Jørgen asked.
  2. The commit message has one trailer line `Facts: docs/game/<file>` or `Facts: none` (anywhere among the trailers; attribution lines may follow it).
  3. `npm run check` passes. If game3d/ changed, the fast test passes too.
  4. The exact thing is checked in isolation.
  5. Anything Jørgen has to pick or judge is a Review item (reviews/README.md); chat gets the id only.
  6. Before finishing, stop your own wait loops, background shells, headless browsers and model servers, and release every lock you took (the 2026-09-29 overnight run left 47 shells and 41 polling loops running).
  7. The final report is at most ten plain lines: what changed, commit ids, file paths, what is left. Facts only.

## Engineering

Where code goes and what the checks enforce: [ARCHITECTURE.md](ARCHITECTURE.md).

The review server port, the GPU lock, headless browser runs, the image gen dashboard, ComfyUI workflows, the fast test, where screenshots go, the world bible, the asset library, and where things live in the repo.

- Local review server (2026-09-27): port 8000 here is another project's Docker container. The repo is served at http://127.0.0.1:8771/ (`python3 -m http.server 8771 --bind 127.0.0.1` from the repo root, or ./start).
- GPU lock: image and model jobs (ComfyUI, TTS, LLM, Blender) hold the GPU alone. Acquire with `mkdir /tmp/claude-1000/gpu.lock` (fails if held), write your name to /tmp/claude-1000/gpu.lock/owner, and release with `rm -r /tmp/claude-1000/gpu.lock` after stopping ComfyUI or your model server. Check nvidia-smi first, and free ComfyUI's VRAM before LLM or TTS jobs. If it's held, wait and retry every few minutes. A batch runner checks the owner file before every job and stops if its name is gone. Remove the lock only when the owner file has your name (`grep -q <your name> owner && rm -r ...`), never "to clean up" a lock that looks stale (twice on 2026-09-26 an agent removed another agent's lock).
- Commit gate (Jørgen picked "commit-gate", 2026-09-29; hooks from `sh tools/check/install-hooks.sh`): pre-commit checks what is staged (ARCHITECTURE.md). After each commit that touches game3d/, post-commit checks in the background that the commit boots to the title screen (tools/check/head-boot.mjs; result in .git/head-boot/latest.txt), and tools/land.sh runs the same check on what it lands and exits 1 loudly if it fails. pre-push and game3d/tools/deploy-pages.sh run a gitleaks secret scan (tools/check/secrets.sh, rules in .gitleaks.toml, plus every key in the local .env) and refuse to push on a finding.
- Headless browser runs (Jørgen, 2026-09-29): run in parallel through tools/lib/browser-job.mjs, each with its own /tmp/claude-1000/browser.lock.<pid>. Up to three share the GPU in slots and wait while all slots are busy or an image/model job holds the GPU; software rendering only with an explicit GL=soft. Hold off while the machine is busy (load average above 24 on its 32 cores).
- Image gen dashboard (2026-09-27, Jørgen asked for "a simplified, project specific comfy ui"): `tools/imagegen/run.sh`, then http://127.0.0.1:8772/. Code in tools/imagegen/; presets, the render log (island/private/imagegen/log.jsonl, with his stars, rejects and notes), outputs and each preset's "note to Claude" in island/private/imagegen/. To help him tune, read the log and notes and save changes as new preset versions through the dashboard (POST /api/preset/<type>/<id>), never by rewriting old versions. Its GPU session holds the lock as `imagegen-dashboard` and ends after 20 idle minutes; when that is the owner, he is using the GPU, so wait. Load new code with `tools/imagegen/run.sh --restart` (it waits for the queue and keeps his session). Never stop the server with SIGTERM or Ctrl+C while he is using it.
- Save every ComfyUI workflow we use as a loadable API JSON in tools/workflows/ and ~/ai/workflows/, so he can open it. Keep original PNGs; they embed their workflow.
- Agents share the scratchpad, so use unique file names.
- Fast tests (Jørgen, 2026-09-28: "it should be speedrunning, modifying run speed and such, we can't spend HOURS on tests"). Play-through QA runs in fast test mode, so a full day takes about a minute. Real-time runs only for a final human-speed check, and only if asked. Tests run in the background, capped at 5 minutes, and never hold up pushing a build ("just push already").
- game3d QA is programmatic (Jørgen, 2026-09-28: "max 5 min test, this should be programmatic"). The fast test: `node game3d/tools/fast.mjs 390 844` and `... 1366 860` play the whole day in test mode (?test=fast) and print PASS or FAIL with any page errors. Run them after every change; `node game3d/tools/story-check.mjs` checks the story files against the engine.
- Screenshots: game captures go in game3d/shots/<job>/, one folder per run where the tool makes one (game3d/shots/fast/<time>-<pid>/). They stay on this machine (no binary is committed). Scratch images go in your scratchpad.
- World bible (2026-09-27): the approved cast, places, story, rules, reviews and open questions at http://127.0.0.1:8771/bible/. It reads most facts live from their sources (bible/live.js); bible/facts.yaml keeps history, rejections and questions, each with status and source. After a decision changes, update facts.yaml if needed, rerun `python3 tools/bible/build.py`, then `node tools/bible/check.mjs`. The private bible (island/private/bible/, git-ignored) is never linked from the public one.
- Asset library (2026-09-29): tools/assets/ lists every asset with status, source and use (http://127.0.0.1:8771/tools/assets/, rebuilt by ./start). Run tools/assets/render3d.mjs after model or place changes.
- Repo hygiene (2026-09-28): active work lives in game3d/, bible/, art/, tools/, docs/ and notes/. legacy/ is reference only; nothing in it is active or approved. Approved art is in art/approved/<bible id>/ (listed in art/approved/README.md); anything not in the bible is not approved. His reference images are in art/refs/ and voice clone clips in tools/voice-refs/, never inside a review folder.
