# Working guide: Amakawa

Everything Jørgen has asked for, and how we work. Every agent reads this before starting, and it gets updated whenever new feedback comes in. When this file and older docs disagree, this file wins.

## Who it is for
- Jørgen: early intermediate Japanese (took courses in 2015; hiragana mostly fine, katakana weak, spotty grammar). Goals: follow anime dialogue, and hold conversations in Japan.
- Plays 10–15 minutes at a time. On the train (3 days a week, patchy internet) on the phone, and at home on the desktop.
- Likes strategy games and RPGs (including adult Japanese RPGs and visual novels). Enjoys drama with humour. Dislikes cringe, over-the-top anime reactions.

## The game
- Premise: a British and Nordic cast at a giant Japanese conglomerate that is a city of its own. The player has a secret magic (kotodama); coworkers only see someone amazingly productive. Progression means rising in the company.
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
- Approved designs (2026-09-24, from the chooser; RDBT is the house model): main character = option 02, the tired Scandinavian IT guy (gallery M-02-it-guy-601); Rei, Mio, Aoi and Kaori = the RDBT versions (gallery B-*); receptionist = Kuro (玖路), design A-luna-s101; Kiyoko = A-kiyoko-s101 face, but new clothes; Emi = round 3 RDBT seed 41; basement office = option 2 (O-office-basement-502) but needs a bit more space, chairs and empty ramen cups. Open: Yuzuki (looks too much like Emi), Goro (needs an RDBT version), Jun (rejected), Ishibashi (more options), Saki (s102 too much like Rei), Nanami (other options).
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
- Model: Anima-family checkpoints in local ComfyUI. RDBT Anima is the main model (best for simple and medium scenes, most attractive). One Obsession: logic in hard scenes. JANIMA: style and groups. Prompt guide: art/PROMPTS.md.
- Always include the anime style anchors ("anime screenshot, anime coloring, 2d, cel shading") and a "3d, realistic, photorealistic, chubby" negative.
- Prompt structure: one block per character; state where the camera is and which way everyone faces; give a hand to every held object; keep emotions inside each character's block (they leak); use weights of 1.3–2.0 for things Anima tends to drop; don't name landmarks.
- Main character: a Nordic man, fair pale skin, light blond eyebrows, slim average build, no blush. Rei: silver ponytail, steel-grey eyes. Emi: the approved round-3 RDBT seed 41 design (auburn bob, clear tortoiseshell glasses, curvy, blazer and pencil skirt), inspired by Jørgen's wife but designed only from written traits and never from photos, and not in her real clothes.
- Backgrounds must make physical sense (the train floated on the ocean; the "basement" looked like a sunny home office). Check every image for logic before it ships.
- Expression sets must keep everything except the face identical (outfit colour, blazer details, hair, accessories). Generate expressions by repainting only the face region of one approved base sprite (inpainting), not by re-rolling whole images.
- Complex action (the shootout, swimming, the volleyball spike) fails with plain prompting even after fixes. It needs composition control (a pose or layout sketch as an input, or regional prompting) before more attempts; don't burn time re-rolling.
- Round 6 retries verdict: copy room only copyroom-rdbt-12 works; shootout nonsense everywhere; swim only One Obsession makes sense; volleyball One Obsession s11 most believable; romance all fine, RDBT slightly best.
- Save every ComfyUI workflow we use as a loadable file in tools/workflows/ and ~/ai/workflows/ (API JSON), so Jørgen can open it. Generated PNGs embed their workflow; keep the originals.
- Cutouts: local rembg ISNet anime. Check for see-through holes in hair and glasses.
- Never open images or pages on Jørgen's screen (no xdg-open). Give links only.

## Voices and audio
- Replicate voices are best (MiniMax Speech 2.6 HD plus Qwen3-TTS clones). Local Qwen3-TTS is a fallback. IndexTTS is unusable.
- Mio: the original casting clip (proto2/audition/r2/mio-3.mp3), a relaxed late-20s NEET. Don't over-tune (style instructions made her younger and wobblier). Only guard against male drift.
- Per-character loudness is normalised; the player voice is quieter.
- Music: Lyria and YuE2 loops alternate with crossfades so the loop isn't noticeable.

## Process
- The main thread coordinates and never blocks on waiting; long work goes to background subagents with clear file ownership: the builder owns game/; the art agents own art/ and add images to game/img; the content writer owns content/.
- One GPU job at a time. Check nvidia-smi before GPU work; free ComfyUI's VRAM before running LLM or TTS jobs.
- Decide before producing: settle the style, model and cast with small comparison sets first. No bulk production (expression sets, environments, scene batches) until he has approved the model, style and character designs. "Keep the GPU busy" means useful exploration toward a decision, not mass production.
- Build small slices and let Jørgen judge before scaling up. He benchmarks anything new (models, voices, cutouts) himself before it's adopted.
- QA means reading as a player, not only automated runs: dump every branch as a transcript and read it; look at every screenshot.
- Report facts, never self-grade ("nailed it"). Describe what's actually in an image or build, and admit gaps.
- Budget: Replicate cap $20 total (ledger in tools/spend.json). Prefer local models.
- Keep this guide updated whenever Jørgen gives feedback.

## Live links
- Game: https://fumbleforce.github.io/tower-of-words/game/
- Review pages: https://fumbleforce.github.io/tower-of-words/proto2/ (gallery, local6, emi2, voice-mio, tts, music, rmbg, llm)
