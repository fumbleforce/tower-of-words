# Working guide: Amakawa

Everything Jørgen has asked for, and how we work. Every agent reads this before starting, and it gets updated whenever new feedback comes in. When this file and older docs disagree, this file wins.

## Current focus (2026-09-25)
- Keep the slice narrow. Chosen slice: Emi, Mio and Rei; monorail, gate, basement office and Sales. Ishibashi is voice and text only at the gate. The canteen (Kaori), rooftop (Goro) and bar (Jun) move to day 2. Make day 1 excellent before building anything wider. No full sprite sets or expression batches for the rest of the cast yet; character decisions aren't fully settled.
- Day-1 flow (2026-09-25): monorail (with phone onboarding) → gate → basement office → copy room → office → Sales → evening → dorm room. Six drawn locations.
- Orientation: new players know nothing about the world. On the monorail the company phone runs its new-hire app: a welcome, the island map, his dorm room, the ID card, and the quick level check. His things were sent ahead; the day ends in his new dorm room, seeing it for the first time (quiet end, save point, possible spot for the free-typing moment). The magic stays secret until the copy room.
- The magic is introduced in the copy room, alone. Only the main character knows about it and he doesn't want anyone to find out, so first use must be secluded. First task from Emi: copies of a proposal for an 11:00 meeting. He goes to the copy room, uses kotodama on the old copier, and comes back far too fast (Emi: 「……もう？」). This is where the magic mechanic gets taught and tuned (the verb form changes the result and the machine takes it literally; one word per step: jam, copy, sort, staple; footsteps in the corridor add risk; the morning coffee-machine 「動いて」 pays off). Sales with Rei is the second, riskier spell (a person, with a witness).
- One free-typing moment with the local AI on day 1 (e.g. Emi asks something open at the end of the day); needs the one-click llama-server start. Phone/train mode (offline, spaced repetition, stats, discreet mode) comes after day 1 is polished.
- Location picks (2026-09-25, proto2/locations1): gate = gate-lobby-2103 (full-height glass security doors); copy room = copyroom-copier-4203. Monorail interior and Sales are being redone.
- Basement office = office-reverse-5202 (proto2/locations2; "really gets the dingy vibe"), minus the window beside the exit door. Dorm: he gets the worst room on the high-rise company island, e.g. 2nd floor facing a concrete wall a couple of metres away: crummy living in the corporate "utopia", no pretty view.
- Redraw the day-1 location backgrounds. The current ones have nonsense in them (a bed with pillows at both ends, and other logic errors). Use RDBT and check every image for physical sense before it ships.
- The bartender's cutout is poor and ugly. Redo cutouts for the slice characters and inspect the edges closely.
- Composition research (pose/layout sketches, regional prompting) can run on the side.

## Who it is for
- Jørgen: early intermediate Japanese (took courses in 2015; hiragana mostly fine, katakana weak, spotty grammar). Goals: follow anime dialogue, and hold conversations in Japan.
- Plays 10–15 minutes at a time. On the train (3 days a week, patchy internet) on the phone, and at home on the desktop.
- Likes strategy games and RPGs (including adult Japanese RPGs and visual novels). Enjoys drama with humour. Dislikes cringe, over-the-top anime reactions.

## The game
- Premise: a British and Nordic cast at a giant Japanese conglomerate that is a city of its own. The player has a secret magic (kotodama); coworkers only see someone amazingly productive. Progression means rising in the company.
- The player moves to the company island to live; the company city has everything (dorms, canteen, shops, bar, university). The day-1 monorail ride is his arrival and move-in, not a commute. After that he lives on the island.
- Story rules. Banned: shinigami, spirits and yokai, mysteries and detective work, ancient history, far-fetched premises (the VR tower and golems were rejected). Everyday life alone is too mundane; contemporary fantasy is the frame.
- Casual Japanese for the first half of the game; polite and keigo layers come later, with rank.
- Romance with several women characters. Rewards for good play can include fan service up to implied nudity (steam, water, hair, angles; nothing explicit), always hidden in discreet mode on the phone and train, and never on public pages. All characters are adults.
- Japanese belongs in most decisions: navigation, time, menus, money, messages, directions. Not only in dialogue.
- A local LLM (Orion 26B-A4B via llama.cpp, port 8190) plays characters in free conversations on desktop.

## Learning rules
- Word display: above your level = kana only; learning = kanji with a reading above; known = kanji alone. Readings go romaji, then kana, then none. Never show a reading above text that is already kana.
- UI chrome must not use unlearned kanji. Use digits (8:42) and kana labels until the words are learned.
- Listen first: sound and text belong together (karaoke-style follow-along), not a separate listen step and read step. No blur effects.
- Comprehension checks must use a different mode from the input (heard Japanese → answer in English or by acting). Never let the player match kanji shapes.
- A word counts as known only after unaided success on separate days. English is hidden by default; revealing it counts as a lookup.
- Every word, including words inside options, can be tapped for its meaning without triggering the option.
- Selecting an option reads it aloud (player voice, at a lower volume). Replays play slightly slower.
- Scroll up or PageUp goes back through the dialogue (VN backlog).
- Pace (2026-09-25): no screen should take minutes to parse. Keep lines short, and never stack several unknown words, a new grammar point and unknown kanji in one sentence. The learning must not slow play to a crawl.
- Three separate progression tracks: vocabulary, grammar and letters (kana and individual kanji). Track each per player. Kanji the player can't read yet are shown as kana automatically, so a known word can still appear in kana while its kanji is unknown.
- Adaptive for any player: assume other people will play this starting from different levels (a placement check or fast calibration at the start, then adjust from play). Nothing should be hard-coded to Jørgen's level.
- Core mechanics must be varied and replayable, not one repeated quiz shape.
- Don't overwhelm early: introduce one mechanic at a time. No meta "this becomes your task" narration; show, don't announce.

## Dialogue quality
- Every branch must flow: after each choice, the next lines must make sense, with the right speaker and the right voice. Check every path.
- Natural casual Japanese at N5–N4, in character. Nothing illogical or repeated.

## Story craft (story-writing skills: story-sense, story-analysis, dialogue, scene-sequencing, key-moments, character-arc, novel-revision, story-coach, in ~/.agents/skills)
- Set up before you pay off: no character may refer to anything the player hasn't seen yet (a line about the player's "magic" before any magic was shown broke this).
- Continuity: a scene stays in one location until an explicit transition (the player was teleported from Rei's office to the basement between two sentences). Backgrounds, who's present, and the time of day must match the dialogue.
- Scenes must want something: each has a goal, an obstacle and a turn. Characters drive scenes; they don't just deliver information.
- Every character has a distinct voice (word choice, sentence length, register); run the dialogue skill's voice checks.
- Story beats are reviewed by a story editor, not only by the builder.

## Originality (cliche-transcendence skill in ~/.agents/skills)
- Don't repeat ideas or reach for stock "quirky" tropes. Rejected as lame or repeated: the knitting tough guy, the crazy female engineer with a metal arm (done twice). Before proposing a character, list the default clichés for that role and deliberately go orthogonal (knowledge, goal, role).
- Draw inspiration from real sources: real jobs inside Japanese conglomerates, real office life, observed people, and specific cultural detail rather than anime archetypes.
- Characters have their own concerns that collide with the player's story; they don't exist to serve it.
- Approved designs (2026-09-24, from the chooser; RDBT is the house model): main character = option 02, the tired Scandinavian IT guy (gallery M-02-it-guy-601); Rei, Mio, Aoi and Kaori = the RDBT versions (gallery B-*); receptionist = Kuro (玖路), design A-luna-s101; Kiyoko = A-kiyoko-s101 face, but new clothes; Emi = round 3 RDBT seed 41; basement office = option 2 (O-office-basement-502) but needs a bit more space, chairs and empty ramen cups. Round 2 (2026-09-25): Goro = goro-a-202, Jun = jun-a-202, Ishibashi = ishibashi-b-201, Saki = saki-a-201 (proto2/decide2). Yuzuki = yuzuki-c-202 base, but change her hair and give her a smaller chest (more unique, distinct from Emi). Picks (2026-09-25, proto2/decide2): Yuzuki = yuzuki-e-201 (honey-blonde low ponytail); Kiyoko = kiyoko-camel-201 (camel coat dress; head is cut off at the top of the frame in the s101-based renders, so reframe/outpaint with headroom); Nanami = nanami-g-204 (ID-card desk clerk) and he also likes nanami-f-201 (night CCTV operator): both kept for now; new women kept: Tsubasa (new-tsubasa-208, ekiden runner), Kanae (new-kanae-212, newsletter photographer), Sumi (new-sumi-201, calligrapher); Fumiko and Chihiro rejected. Basement office: redo completely from scratch, not iterating on option 2 (still not enough space).
- Headroom-fixed cast (proto2/cast-fixed, 2026-09-25): all approved. Tsubasa's face is off-style (the face shape juts out with heavy contouring, unlike the standard face framing of the rest of the cast); redo her face in the house style, keeping her hair and outfit.
- Cast palette: characters must be visually distinct in silhouette, hair colour and outfit colour. Not everyone in black, and no two women with similar hair.
- Cast verdicts: Kiyoko s101 approved (the only design with real age lines; outfit a bit plain, so make it more interesting). The receptionist is named Kuro (玖路; reads like 黒, black); her s102 look (white vampire) is rejected; her suit colour and blazer details drift between expressions. Oguri and Dr. Ren are removed.

## Writing (all UI text, docs and replies)
- Plain, human writing: use the humanizer skill (~/.agents/skills/humanizer). No slogans, no em dashes, no "not X but Y", no filler taglines.

## Visual design
- Game UI: anime-subtitle presentation plus an in-world company phone. The light "review page" style (off-white, teal) is for internal review pages only; it "screams e-learning" in the game.
- Avoid default AI aesthetics: brown, gold, serif, glows, eyebrow labels. Use the design-taste-frontend and game-ui-design skills.
- Desktop and phone get separate layouts. Check both with screenshots. Every part of the interface must match the same design language (the "you reply" box has failed this twice).
- Review pages: large responsive grids (images at least about 480–520 px, not 2 per row), a lightbox with arrow keys, and the full prompt visible under each scene title.

## Art
- Every image and video prompt starts with the shot-staging skill (~/.agents/skills/shot-staging/SKILL.md): write the staging note (camera, framing, what is in front of the lens, what is behind it, motion, eyelines, light), prompt from it, then check the render against it.
- Model: Anima-family checkpoints in local ComfyUI. RDBT Anima is the main model (best for simple and medium scenes, most attractive). One Obsession: logic in hard scenes. JANIMA: style and groups. Prompt guide: art/PROMPTS.md.
- Always include the anime style anchors ("anime screenshot, anime coloring, 2d, cel shading") and a "3d, realistic, photorealistic, chubby" negative.
- Prompt structure: one block per character; state where the camera is and which way everyone faces; give a hand to every held object; keep emotions inside each character's block (they leak); use weights of 1.3–2.0 for things Anima tends to drop; don't name landmarks.
- Main character: a Nordic man, fair pale skin, light blond eyebrows, slim average build, no blush. Rei: silver ponytail, steel-grey eyes. Emi: the approved round-3 RDBT seed 41 design (auburn bob, clear tortoiseshell glasses, curvy, blazer and pencil skirt), inspired by Jørgen's wife but designed only from written traits and never from photos, and not in her real clothes.
- Opening test verdict (2026-09-25): picks sky-tall-12 (tall image, check it in motion), oncoming2-216 (but the clouds repeat in a straight line), mc-window2-266 (the only correct side view). Rejected: bay (train just passes the island instead of going to it; tilted clouds), cabin (still a hover-train above the ocean), the other window shots (a side window can't see the track), pano (the rail line ends in the ocean; the train looks bolted onto the rails), the phone (odd circle in the middle of the screen), the title card (real openings don't caption "opening theme"; show the logo and staff-style credits, not labels). My own pre-checks passed the wrong shots, so Jørgen's review is the gate.
- The main prompt rule (Jørgen, 2026-09-25): it's mostly about what you leave out. Describe only what is visible in the frame. Story context (destination, direction of travel, going to the city, why he's there) is irrelevant to the picture and stays out of the prompt.
- Prompt style (2026-09-25, Jørgen's reference in art/PROMPTS.md and art/approved/monorail-bay-ref.webp): the style line, then a few plain sentences describing what is in the picture, one idea each, plus a plain line for what must not appear. The staging note is for thinking and checking; it does not go into the prompt. Long prompts full of staging detail confuse the model.
- Consistent shot sets: once a master image is approved, derive other angles from it by img2img with a short prompt about the new framing only (art/PROMPTS.md "Derived shots"; art/approved/monorail-side-ref.webp).
- Don't overcorrect (2026-09-25): fix one flaw by changing one thing; no pile of weights or style words. Sales went garish from stacked cel-shading anchors; the monorail interiors fixed direction but put the carriage at sea level under its own beam. Check heights and scale, and compare each render with the approved style before showing it.
- Backgrounds must make physical sense (the train floated on the ocean; the "basement" looked like a sunny home office). Check every image for logic before it ships.
- Expression sets must keep everything except the face identical (outfit colour, blazer details, hair, accessories). Generate expressions by repainting only the face region of one approved base sprite (inpainting), not by re-rolling whole images.
- Complex action (the shootout, swimming, the volleyball spike) fails with plain prompting even after fixes. It needs composition control (a pose or layout sketch as an input, or regional prompting) before more attempts; don't burn time re-rolling.
- Round 6 retries verdict: copy room only copyroom-rdbt-12 works; shootout nonsense everywhere; swim only One Obsession makes sense; volleyball One Obsession s11 most believable; romance all fine, RDBT slightly best.
- Save every ComfyUI workflow we use as a loadable file in tools/workflows/ and ~/ai/workflows/ (API JSON), so Jørgen can open it. Generated PNGs embed their workflow; keep the originals.
- Portrait framing (2026-09-25): the head, hair and raised hands must sit inside the frame with some room above. Most approved portraits had hair touching or cut by the top edge because "waist-up portrait" on 896×1152 makes the model fill the canvas, and img2img repaints (Kiyoko's outfits) keep the source crop. The portrait prompt now asks for space above the head, and tools/framecheck.py (rembg figure mask) warns after every portrait render in production.py and decide2.py. To fix an existing image, tools/reframe.py outpaints headroom with RDBT and pastes the original back, so face and outfit stay pixel-identical.
- Cutouts: local rembg ISNet anime. Check for see-through holes in hair and glasses.
- Never open images or pages on Jørgen's screen (no xdg-open). Give links only.

## Video
- First local test (Wan 2.2 5B, Causal Forcing) was rejected as very bad: body-horror textures on the train, and almost no character motion.
- Round 2 (proto2/video2, 2026-09-25): same three sources (Rei, Mio, monorail) through five setups. By frame checks, Wan 2.2 I2V 14B fp8 with the lightx2v 4-step LoRA is best overall (4 steps, CFG 1, shift 5, euler/simple, high-noise expert for steps 0-2 then low-noise, 81 frames at 16 fps, about 624×800 or 960×528). About 3.5 min per 5 s clip on the 3080; the 14 GB experts stream from RAM (ComfyUI has no GGUF loader installed, so fp8 instead of GGUF). DaSiWa Lightspeed v11 (Civitai, speed-up baked in) is equally good and did the only real camera pan. The Civitai anime-style and "live 2d wallpaper" LoRAs added nothing visible.
- Round 2 verdict (Jørgen, 2026-09-25): Wan 2.2 14B (lightx2v) is pretty good and the video model of choice; DaSiWa is a tiny bit worse; the 5B is completely unusable, even with timed prompts. The monorail source image must be redone: the train looks infinite and travels away from the island.
- Prompt only what the camera sees (images and video). Before writing a prompt, stage the shot: where the camera is, which way it faces, what is in front of the lens, and what is behind it. Leave out everything behind the camera; naming it pulls it into the frame. Every moving thing travels in the direction its own scene needs. Example: the day-1 monorail carries the player to the island he is moving to, so a shot of it coming toward the camera looks back along the route and the island must not appear; to show the island, the camera faces forward along the route. Trains and other long objects need a visible end (a nose and a last car).
- Prompts matter as much as the model: shot and camera first, then "Second 0 to 1: ... Second 1 to 2: ...", then what must stay fixed ("rigid body, cars do not bend"). Make the motion match the picture (round 1 sent the train toward the city while it faced the viewer). The 5B model with a timed prompt moves a lot but takes 6 to 11 min.
- Anime opening (proto2/opening, 2026-09-25): self-animated in a small WebGL player, no video model. Every frame is a function of the song time (the Remotion idea without React), so the page, the review scrubber and the Playwright video export show the same picture. What worked: cuts snapped to beats and vocal lines found with librosa, a Demucs vocal stem and Whisper word timings; depth parallax on still plates from Depth Anything V2; pose reveals of the approved sprites (cut out with BiRefNet) over flat colour; blink frames by eye-only inpainting; drawn inserts in code (phone app, ID card, title) so no generated text is needed. What failed: exterior train shots with plain prompts (the rear runs off the frame or the nose points away from the island) and front-car interiors (rails, open platforms); those need the Blender blockout route. Installed: RealESRGAN x4 anime (ComfyUI upscale_models), Depth Anything V2 Large and Whisper large-v3-turbo (Hugging Face cache), Playwright and fonttools in ~/ai/opening, Zen Kaku Gothic New and Barlow Condensed fonts (OFL, subset per page). TV edit of the song: game/audio/music/opening-tv.mp3 (89.6 s, tools/opening/tv_edit.py, cut and splice only). Tools and notes: tools/opening/, game/notes/opening-research.md.
- Living portraits: the puppet demo on proto2/video2 (WebGL warp of the approved sprite, inpainted blink frames, drawn mouth frames synced to the voice line's loudness) is consistent and phone-light. Inpainted mouths came out as big glossy lips that clash with the tiny line mouths of RDBT sprites, so draw mouth frames instead. Tools: tools/puppet_frames.py, proto2/video2/puppet.js.

## Voices and audio
- Replicate voices are best (MiniMax Speech 2.6 HD plus Qwen3-TTS clones). Local Qwen3-TTS is a fallback. IndexTTS is unusable.
- Mio: voice A from proto2/voice-mio (low, slightly husky, about 228 Hz; chosen 2026-09-25). Every line is a Qwen3-TTS clone of that clip (tools/voice-refs/mio-a.wav). The original casting clip (mio-3) is retired: its lines sometimes drifted male. Don't over-tune with style instructions; only guard against male drift (redo lines with a median under 190 Hz or more than 10% under 160 Hz).
- Per-character loudness is normalised; the player voice is quieter.
- Music: the game uses Lyria only, one loop per mood crossfading into itself.
- Music verdict (2026-09-25): YuE2 round-1 loops had great fidelity but came out with vocals and sounded like theme songs; Lyria loops are bland but work as background. The YuE2 opening theme is great but a little too sharp.
- Music round 2 verdict (2026-09-25): Lyria wins background music by far. YuE2 loops, even vocal-free, are simple and repeat within the track and lose variety; the best YuE2 was round 1 with the voice removed by Demucs, still not as good. Stable Audio 3 is terrible. Opening theme = "Mastered: softer" (game/audio/music/opening.mp3). Don't process vocals further: heavier EQ made them crackly and low quality. The softer-tags regeneration was not interesting.
- Instrumental YuE2 (what works): tags and lyrics alone don't stop the singing ([Instrumental] sections still got vocals, about -8 dB vocal energy). The fix is the instrumental AR add-on Mothersuperior/YuE2-instrumental-cot-full-loras (ar_lora_inst_v3abc_comfyui.safetensors) on the CLIP output of LoraLoader, strength 1, with the bf16 checkpoint, mode full, and lyrics set to only `[instrumental]` or bare section tags one per line (`[intro]` `[verse]` ... `[outro]`). Vocal energy dropped to -65 to -77 dB (Lyria: about -32). Optional NAR add-on nar_lora_joint_v9_comfyui on MODEL. For calmer BGM: tags "background music, low energy, sparse, minimal", and optionally mute the Ins melody in the ABC score so only chords remain (tools/music_inst.py mute_melody). About 60–90 s per 90 s take. Stable Audio 3 Medium (native in ComfyUI, 8 steps, ~40 s) is the other local instrumental option. Check vocals with tools/vocal_check.py (Demucs) and cut loops with tools/make_loop.py; the build is tools/music_round2.py.

## Process
- The main thread coordinates and never blocks on waiting; long work goes to background subagents with clear file ownership: the builder owns game/; the art agents own art/ and add images to game/img; the content writer owns content/.
- One GPU job at a time. Check nvidia-smi before GPU work; free ComfyUI's VRAM before running LLM or TTS jobs.
- Jørgen approves every asset (2026-09-25): no image, sprite, background or shot is used in the game, the opening or any build until he has picked it on a review page. Agents render candidates, check them, put them on a page, and stop. Only approved assets move on.
- Decide before producing: settle the style, model and cast with small comparison sets first. No bulk production (expression sets, environments, scene batches) until he has approved the model, style and character designs. "Keep the GPU busy" means useful exploration toward a decision, not mass production.
- Build small slices and let Jørgen judge before scaling up. He benchmarks anything new (models, voices, cutouts) himself before it's adopted.
- QA means reading as a player, not only automated runs: dump every branch as a transcript and read it; look at every screenshot.
- Report facts, never self-grade ("nailed it"). Describe what's actually in an image or build, and admit gaps.
- Budget: Replicate cap $20 total (ledger in tools/spend.json). Prefer local models.
- Repo hygiene (2026-09-25): the repo holds only the game and the review pages currently being shown to Jørgen. Once a round is decided, move its page and media out of the repo to ~/repo/japanese-archive (not deleted). Approved reference images live in art/approved/, voice clone clips in tools/voice-refs/, never inside a review page folder.
- Keep this guide updated whenever Jørgen gives feedback.

## Live links
- Game: https://fumbleforce.github.io/tower-of-words/game/
- Review pages: https://fumbleforce.github.io/tower-of-words/proto2/ (gallery, local6, emi2, voice-mio, tts, music, rmbg, llm, video2, locations1, locations2, cast-fixed)
