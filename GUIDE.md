# Working guide: Amakawa

How we work, and the rules Jørgen has set. Every agent reads this first. What the game is lives in docs/game/, and docs/game/README.md maps where every kind of fact lives. On how to work, this file wins over older docs. On what the game is, docs/game/ wins.

## Current focus

- Days 2 and 3 are being rebuilt to the day-1 standard: Japanese learning, a coherent story and fully staged interiors.
- Scope: build small, finished slices and let him judge them before scaling up. No future arcs, extra variants or systems for later. Parked ideas are work issues (Process, Work tracker).
- No seasons, climate or calendar systems, and don't use them to change approved scenes. Kuro keeps swimming.
- Game ideas are things the player sees and does: excitement, spice, fun, replayability. Hidden simulation and more layers of language learning are out. The ideas he liked are issues #468 to #479.
- First passes are checkpoints, and passing checks is not acceptance. Keep improving until the result is detailed and coherent.
- Character arcs are designed in full RPG-walkthrough detail in notes/walkthrough/. They stay ideas until he decides them.
- The production bar and file ownership: notes/PRODUCTION.md.

## Who it's for

- Jørgen is at mid-N5 (hiragana mostly fine, katakana weak, spotty grammar). He wants to follow anime dialogue and hold conversations in Japan. Nothing is hard-coded to his level: the game calibrates at the start and adjusts from play.
- He plays 10 to 15 minutes at a time, on his phone on the train (patchy internet) and on the desktop at home.
- He likes strategy games, RPGs (adult Japanese ones and visual novels too) and drama with humour. He dislikes cringe and over-the-top anime reactions.

## Working with Jørgen

- Reviews go in the bible: anything he picks or judges is a Review item (post-review-item skill, reviews/README.md), and chat gets the id only. Read his answers with tools/review.py. Don't pile up changes faster than he can review them.
- Showcase: finished visible work goes in the bible's Showcase log (showcase/README.md). Review is only for decisions he really has to make.
- Story is ours to write. Codex writes story, dialogue, discoveries, secrets and subplots. A cold read and a Claude story-reader check them, then they ship with no Review item. Reports to him never say what happens.
- Jørgen approves every asset: no image, sprite, background, shot or voice goes into a build until he has picked it on a review page. Agents render candidates, check them, post them and stop.
- Show every attempt: every render of a round goes on the review page in order, rejected ones included, with prompt and settings.
- Decide before producing: settle style, model and cast with small comparison sets before any bulk production. He benchmarks anything new himself.
- Relay feedback as given: pass his words on as the brief and point at what he means. Add no intensifiers and no reading of your own.
- Every message he types is saved word for word in notes/feedback-log/ (README there). Quote it when briefing agents.
- Left and right on a character mean hers. Her left is the image's right, so every brief and prompt says both: "her left (image right)".
- Never open images or pages on his screen (no xdg-open). Give links only, on http://127.0.0.1:8771/.
- Every build announcement names the build id shown in the game's corner (game3d/build.json).
- Report facts, never self-grade. Say what is actually in an image or build, and admit gaps.
- Publishing: no doc, page, prompt or comment says who any character is based on.
- Private content: no agent opens, reads, lists, copies, changes or deletes anything in island/private/user/ or its manifest.user.json, and QA never loads it. Agents write only in island/private/rewards/, in the layout island/PRIVATE.md gives.
- Budget: Replicate money is nearly gone. Log every call in tools/spend.json and state a job's cost before it runs. Don't waste Meshy credits.
- Keep this guide current: a lasting rule from his feedback gets one plain line in the right section, with no date or backstory. Quote him only when his words are the spec.

## Writing

### Plain writing

- All UI text, docs and replies are plain and human. Use the humanizer skill (~/.agents/skills/humanizer). Write full, concise, natural sentences, and don't stack clauses or break them into choppy fragments.
- No semicolons, em dashes, slogans, "not X but Y" or filler taglines.
- Before you send or save prose, read every new paragraph and rewrite anything you wouldn't say to another person. Passing a punctuation check is not enough.
- Name the person and say what they want, say and do. Avoid abstract words like responses, interactions, dynamics and behaviour.
- Don't compress a person into formulas like "An unsolicited visit gets a worse reception". Don't let a visit or request act in the person's place.
- A character bio describes a person, not author instructions ("Let that cause trouble"). Those go in the writing guide.

### Dialogue quality

- The reference: Mio's loose, imperfect spoken English (game3d/story/VOICE.md) and small funny moments with things in the world.
- No AI voice. Clipped, aphoristic lines (fragments, colon constructions, an X. Y. Z. rhythm) are banned. Writers apply the dialogue, story-sense, humanizer and cliche-transcendence skills, and a cold critic flags any line that sounds written rather than spoken.
- No exposition in panels: no title cards or goal cards. Who, where, why and what to do come out of what people say. UI text is limited to controls.
- No narration of what the player can see. Narration only for what can't be seen and matters, in a few words.
- Say what happened when it's easy to miss: a small key event gets a short narration line and a camera frame that names the thing and what is happening to it. Choices always name their object.
- Fewest steps: one action per beat and no extra clicks, with lines still crafted and specific. Early on, give the player things to find, not more text.
- Stage in an order a slow reader can follow, and frame the person who matters.
- Big moments read on their own: set up every person and stake first, show the stakes on screen, make magic visibly and audibly unnatural, and never lean on backstory the player hasn't seen.
- Story and screen match: every event a line mentions is staged at that moment, and crowds follow the story state. If a beat can't be staged, cut it.
- No characters or beats that add nothing. Nobody answers a greeting that wasn't addressed to them.
- Every branch flows: after each choice the next lines make sense, with the right speaker and voice. Check every path.
- Japanese is natural and casual, N5 to N4, in character. Japanese speakers speak Japanese on screen in every conversation Eric is part of (game3d/story/FORMAT.md, Subtitled Japanese).
- A repair job never just happens to Eric: he knows about it before he arrives, or someone asks him out loud. Main tickets teach useful language or move the plot, with an interesting action and payoff.
- Cast members also offer everyday conversation: personal topics, known words in replies and new vocabulary, with natural limits when they are busy.

### Story craft

Discoveries and private scenes use the rpg-scenes skill. The novel skills in ~/.agents/skills are for a conversation or chapter that is actually broken.

- Set up before you pay off. A scene stays in one place until an explicit transition, and backgrounds, who's present and the time of day match the dialogue.
- Scenes want something: a goal, an obstacle and a turn. Characters drive scenes.
- Every character has a distinct voice (word choice, sentence length, register).
- Depth comes from work history, ordinary life and past relationships, discovered gradually in play. Proposed history stays separate from canon.
- Character briefs fit about one page: concrete background, appearance, home, interests and ambitions. Give the cast distinct desires, weaknesses and reactions to the player, and don't make everyone agreeable or give everyone mundane goals. Keep other characters' bios out of a subject's own. Dragon Age: Origins and Mass Effect are the references. Method: [notes/character-creation-guide.md](notes/character-creation-guide.md).
- A story editor reviews the beats, not only the builder.
- Originality (cliche-transcendence skill): no stock quirky tropes. List the default clichés for a role and go somewhere else, drawing on real Japanese office life. Characters have their own concerns.

### Learning rules

Game first, learning light (docs/game/setting.md) wins where these conflict. docs/game/words.md says what is built.

- No screen should take minutes to parse. Keep lines short, and never stack unknown words, a new grammar point and unknown kanji in one sentence.
- One new thing at a time, shown in use, without meta narration. A new word is learned by typing its romaji, not by clicking an option.
- Help only adds detail and is never needed to follow the story.
- UI chrome uses no unlearned kanji: digits and kana until the words are learned.
- Core mechanics are varied and replayable. Test a new mechanic on its own before weaving it into scenes.
- Keep enough learning to support play without crowding out dialogue. A new command needs a concrete later action, and a conversational word needs later dialogue uses. Prefer reuse and optional practice over more compulsory prompts. Plan: [docs/game/language-progression.md](docs/game/language-progression.md).
- Knowledge progression is a persistent puzzle: collected words reveal meaning in older dialogue and open new leads. Earlier conversations and unlocked topics persist across days, places and saves.

## Visual design

- No text on timers, ever, and no real-time timers while text is on screen. Hints, notes and goals stay until the player acts and can be re-read.
- The player always has a reachable next goal, told through people and a goal line that stays.
- First screen: just the controls, then how to talk to people, then the first goal. Never force the player into the story. They can explore, and they start the story beats.
- Don't assume visual-novel conventions are known. Never ignore input silently. Scale the UI to the screen, with one action menu per target.
- UI is recognisable for what it is (a phone looks like a phone), and every interaction is taught the first time it appears.
- Only things with a consequence are interactive: moving the story or a goal, using a word in a way that matters, unlocking something, or an interesting reaction. Everything else is scenery.
- Game UI is anime subtitles plus an in-world company phone. The review-page style is for internal pages only.
- No default AI aesthetics: brown, gold, serif, glows, eyebrow labels. Use the design-taste-frontend and game-ui-design skills.
- Desktop and phone get separate layouts, checked with screenshots, in one design language. The third-person camera with GTA-style controls is desktop only. Phones keep the overview.
- Scenes stage their characters and actions visibly. No audio-only scenes.
- World style: simple 3D with anime toon lighting (docs/game/art-and-sound.md). New props get their look from game3d/js/look/. Never mention or propose paper, cardboard, cut-out or pop-up styles.
- Places must not look empty or like a cheap RPG (traps: notes/map-design.md). Buildings need usable entrances and interiors, and outdoor surfaces need material detail.
- Street style is the only outdoor look: fuller trees, bushes and ground detail from his garden reference, broad facade panels on suitable offices, and careful windows. Plan: notes/outdoor-plan.md.
- Outdoor ground has one definition of walkability and visible borders. Curbs, path edges and level changes agree with where the player can walk.
- No planting in isolated blob-shaped beds set into lawn. Plants follow the place's structure: path edges, building fronts, walls, planters in line with the paving, or loose in the lawn.
- Movement follows visible solid geometry, with no invisible walls. Birds and water effects don't block, and touching an edge always leaves a way to move or jump away.
- Chairs and benches can be sat on, and roofed interiors leave room for the perspective camera.
- Every area has nooks for secrets, encounters and collectibles, listed with stable ids in docs/game/places.md.
- The island is well populated: ambient crowds that follow the time of day, birds and small animals. Crowd members react to jumping and being blocked, and each offers a short everyday conversation in Japanese.

## Art

Prompts, models, settings, cast lines, rewards, 3D characters and video: [art/PROMPTS.md](art/PROMPTS.md). Portrait style: art/STYLE.md. Private scene pictures go to the private-scene-art agent, and each main character's lines to their voice agent (.claude/agents/).

- World pieces: before building a bench, lamp, tree, kerb, window or roof, look in the bible's Asset library (http://127.0.0.1:8771/bible/#assets). Use the piece there or add a variant to it. Don't copy it into a scene.
- Every image and video prompt starts with a staging note from the shot-staging skill. Prompt from it and check the render against it. The note stays out of the prompt.
- Every still picture goes through the image service: Jørgen uses Image Gen or the Scene Editor, agents a recipe through compose.mjs ([art/PROMPTS.md](art/PROMPTS.md), How a picture is made). Keep the configured presets. Rating exclusions are fixed; content exclusions are manual, per composer section. Don't patch pictures together; fix the setup and regenerate.
- Marketing artwork: prefer Codex's built-in image generator, with the approved cast and branding, quiet backgrounds and no unexplained vocabulary labels.
- Prompt style: describe only what is visible in the frame. Story context (destination, why he's there) stays out.
- Don't overcorrect: fix one flaw by changing one thing. Check heights and scale, and compare each render with the approved style before showing it.
- His images in art/refs/ are references only, never img2img sources or assets unless he says so.
- Pictures make physical sense. Check every image for logic before it ships.
- Expression sets repaint only the face of one approved base, and everything else stays identical.
- Cast palette: characters differ in silhouette, hair colour and outfit colour. Not everyone in black, and no two women with similar hair.
- The cast stays as designed. No LoRA training. Use training-free methods from the approved portrait.
- Reward scenes: CLAUDE.md and [art/PROMPTS.md](art/PROMPTS.md#reward-scenes).
- 3D characters: art/PROMPTS.md. Accessories stay off the model. Adapt models he supplies with the smallest changes that fit, and never alter the face, eyes or body he made or put props or overlays on the face. Don't shrink or recolour a broken generated mesh to simplify it. Low-poly Mio is paused until he asks.

## Voices and audio

Methods, tests and music: art/SOUND.md. Approved voices and tracks: docs/game/art-and-sound.md.

- Local first: use local models whenever one does the job. Game voices are local Qwen3-TTS clones (tools/voice/run.sh, refs in tools/voice-refs/), with edge-tts and paid APIs only as a fallback.
- Mio is voice A, cloned from tools/voice-refs/mio-a.wav. Don't over-tune with style instructions. Redo any line with a median under 190 Hz or more than 10% under 160 Hz.
- Loudness is normalised per character, and the player voice is quieter.

## Process

- Say each fact once. Give each fact one home and link to it from elsewhere.
- One focused task per agent: different kinds of work go to separate, fresh agents. The main thread coordinates and never waits. Implementation runs in background subagents with clear file ownership.
- Work tracker: every task, request, decision follow-up and parked item is a GitHub issue labelled work, kept with `python3 tools/work.py` (`--help` has the rules). Update it when you start, park or finish. A commit that finishes one says "Fixes #N". Run `work.py stale` before reporting. Issues are public: nothing private in them.
- Sharing work with Codex and Grok, lanes, and committing as you go: [collab/PROTOCOL.md](collab/PROTOCOL.md).
- Validate each fix in isolation: render a close-up of the exact thing he flagged, in every state it can be in, look at it, and show him.
- Storyboard a new opening screen by screen and get it approved before building.
- Before a build reaches him, the main agent looks at every screen at desktop and phone size, and a fresh cold-player agent plays it on a phone and writes what it thinks is happening. Any confusion is a bug.
- Visual QA gate: a separate critic scores every screen against notes/VISUAL_QA.md (pass mark 8/10). Nothing below it reaches him, and no greybox is shown as progress.
- QA reads as a player: dump every branch as a transcript and read it, and look at every screenshot.
- Fast tests: play-through QA runs in fast test mode, so a whole day takes about a minute (fast-qa skill). Tests are capped at 5 minutes and never hold up a build. Real-time runs only when asked.
- Never commit binaries: a used asset goes through `python3 tools/assets/sync.py push` ([asset library](tools/assets/README.md)). Size limits and tool state: [ARCHITECTURE.md](ARCHITECTURE.md#tool-state-and-outputs).
- Live assets: new renders go into the generated area, reach the game only through `node tools/assets/live.mjs promote`, and leave through `retire` (notes/asset-lifecycle.md).
- Facts in the same commit: a commit that changes what the game is updates its docs/game/ file, and its message has `Facts: docs/game/<file>` or `Facts: none`.
- Definition of done, for every agent:
  1. Commit only your own hunks (`git add -p` or named new files, then read `git diff --cached`). Never `git add -A` or `git add .`. Don't push unless Jørgen asked.
  2. `npm run check` passes, and the fast test too if game3d/ changed.
  3. The exact thing is checked in isolation.
  4. Anything Jørgen has to pick or judge is a Review item.
  5. Stop your own wait loops, background shells, headless browsers and model servers, and release every lock you took.
  6. The final report is at most ten plain lines: what changed, commit ids, file paths, what is left.

## Engineering

Where code goes, the checks and the commit gate: [ARCHITECTURE.md](ARCHITECTURE.md).

- Local review server: http://127.0.0.1:8771/ (`./start`). Port 8000 belongs to another project. Tool pages: [notes/tools/README.md](notes/tools/README.md).
- GPU lock and Headless browser runs: [notes/tools/gpu.md](notes/tools/gpu.md). Jørgen's image gen dashboard has priority over every agent job.
- Image gen dashboard: [tools/imagegen/README.md](tools/imagegen/README.md). Scene editor: [notes/tools/scene-editor.md](notes/tools/scene-editor.md).
- Full and vanilla builds: public game code gates optional local content on `__FULL__` ([notes/vanilla-flavor.md](notes/vanilla-flavor.md)).
- Desktop release: [docs/desktop-release.md](docs/desktop-release.md). A separate Windows edition holds only day 1, with its output and saves kept apart from the full edition.
- Save every ComfyUI workflow we use as loadable API JSON in tools/workflows/ and ~/ai/workflows/. Keep original PNGs, which embed their workflow.
- Captures go in game3d/shots/<job>/, scratch in the shared scratchpad; both are swept after 14 days ([ARCHITECTURE.md](ARCHITECTURE.md#tool-state-and-outputs)).
- World bible: http://127.0.0.1:8771/bible/. bible/facts.yaml keeps history, rejections and questions. After a decision changes, update it, run `python3 tools/bible/build.py`, then `node tools/bible/check.mjs`. Never link the private bible from the public one.
- Repo layout: active work is in game3d/, bible/, art/, tools/, docs/ and notes/. Retired material goes to `../bk-jap` (notes/history/offline-archive.md). Approved art is in art/approved/<bible id>/, his references in art/refs/.
