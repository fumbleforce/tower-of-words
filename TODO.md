# Outstanding work (as of 2026-09-29)

Read GUIDE.md first, then notes/PRODUCTION.md. The game is game3d/ (day 1: train, gate, B2 office). Decisions for Jørgen go to the bible's Review section (reviews/), not chat.

## In progress (agents, 2026-09-29 night)
- Builder (integrator, only one who pushes via game3d/tools/push.sh): next push with the player-paced train opening (story 03a2188, notes/ONBOARDING.md), lunch-bag catch, flush train doors and hinge-edge server door (world 56bd762), shell dialogue/first-screen fixes, new voices.
- Shell: controls-first onboarding (controls, then talking, then goal), whole dialogue area clickable, no hover flicker, "Press Space or click this area to continue", play icon on clickable words, hover/target highlight.
- Feel: facing and twisting, characters overlapping (Eric and Mio heap at arrival), stuck on each other, click targets.
- Bible: review queue (reviews/<id>/review.json, feedback.json, tools/review_server.py, tools/review.py) and live sources (bible/live.js).
- Style: painted-cel round 2 at full resolution; doubled floor tile grids.
- Lift: the lift as a walk-in room, camera on Eric for the ride.
- Art: Kenji round 2 (21, at work in work clothes, hobbies only as small details, varied height/build/face, not generic); Eric's portrait in the original style (open eyes, no red rim); Mio looking at her phone (dialogue portrait).
- Voice input: speak words into the mic instead of typing; a word is typed or said 3 times before it's click-only in the Say menu.
- Creator: experiment splitting Mio and Eric into parts on one skeleton (small scope).

## Waiting on Jørgen (Review section)
- Style study pick (leaning painted cel), Kenji concept round 2, Mori's 3D look (local chibi or his ChatGPT pictures; references in tools/characters/ref/), whether bible/ goes public in git.
- Walkthrough: Mio and Mori written (notes/walkthrough/); the other six wait for his notes.

## Parked ideas
- Procedural content (Jørgen, 2026-09-28: "keep it idea for now"): fixed cast, main arc and location cards stay authored; an LLM director writes daily storylets in the game3d/story format that the engine validates, with per-character memory, generated gossip, notes and emails, pre-rendered picture pools and a room generator for repeated office floors. Run it first as an overnight writers' room with critic filtering and his stars, live later. Blocked until ONE stable, full, fun day exists, so we know which elements to build on. First test when unblocked: a fully generated day 2 using the same places.

## Deferred checks for Jørgen (he can't listen on his current computer, 2026-09-28)
- Eric's voice: decided (eric-2, English, no accent).
- Overheard audio: known words clear, the rest heavily muffled; never checked by ear.
- New sounds from the feel agent (game3d/audio/sfx, audio/amb; picks in tools/feel/picks.json): ambience beds per place, UI and learned-word chimes, the kotodama sound. The lobby bed may have footstep-like noise. Listen when possible.
- Portraits in use provisionally: Mori 713, Kenji 711, Hamada 721, guard = Ishibashi with new expressions (sheets in game3d/assets/portrait-candidates/). Confirm or pick others.

## Deferred: asset storage (Jørgen, 2026-09-28)
- Supabase chosen (paid plan, new project "amakawa", eu-north-1); creation deferred. Then: bucket for source assets, service role key in .env, sync script with checksums in git.
- Until then art/approved/{mio,mc}/meshy/ and art/approved/music/ are git-ignored, local only (back them up).
- Slim the source: one rigged mesh + base colour + animation-only clips per character (drop duplicate meshes and unused normal/roughness/metallic maps); move game3d/shots and portrait-candidates out of git.
- Deploy the game from an orphan gh-pages branch replaced on each push, so builds don't grow history.
- The bible (bible/) has never been committed; decide whether it goes public.

## Legacy (VN, Godot, low-poly and island-slice era; kept for reference, not current)
### Later (parked by Jørgen, 2026-09-27: "nitpick, a todo for later")
- **Character consistency in the dashboard:** the test is done (legacy/proto2/consistency/, notes/consistent-characters.md). The Anima IP-Adapter wins for portraits and close shots; the Qwen-Image 2.1 fix-up wins for scenes. His notes: at strength 1.0 the IP-Adapter adds odd extra hair on Kuro (kuro-pose-s101), so default to about 0.6; the LLLite head repaint "looks pretty good". Adding both to the dashboard (tools/imagegen/, consist.py) was stopped part-way. The server code is partly wired and the dashboard still runs. Finish it, test on Kuro and Saki, and run Kiyoko and Kaori (age and build) separately. FLUX.2 klein and the SDXL IP-Adapter can be deleted (about 16 GB).

### Waiting on Jørgen
- **MVP (legacy/mvp/, 2026-09-26, late):** new design from the brainstorm, spec in legacy/mvp/DESIGN.md. Builder and writer running; then Japanese check, cold-player test and visual critic before he plays it.
- **New direction (2026-09-26):** the VN is dropped for a top-down RPG where progress is gated by knowledge (notes/directions.md, notes/island-slice-plan.md). The engine is now three.js HD-2D (see the engine switch below); Godot 4.7 was tried first. Desktop first; Android later.
- **For Jørgen when he's back (2026-09-26):**
  - Pixel sprites (legacy/proto2/island-pixel/, and every size attempt in order on legacy/proto2/pixel-compare/): the 48 px cast in the i02-nosleepy-48 recipe is approved as the style; the rest are placeholders.
  - Anime dialogue sprites (legacy/proto2/island-cast/): a pick per expression, whether the bases count as expressions, Rei's suspicious face, the v2m cutout, the shared framing, and the cutout-fix section (Rei's gaps). The karaoke room, the basement illustration and the discreet karaoke photo were re-rendered after drifting into a Western cartoon look (critic review 06); the picks are in the "Style fixes" section. The critic passed the basement illustration and the discreet photo at 8 and Mio's irises at 9; the karaoke background is being switched to the attempt that scored 8. The photo has the hood back, as the script asks (DECISIONS 33).
  - Storyboard (legacy/island/content/storyboard.md): his ten questions got default answers, logged in legacy/island/DECISIONS.md.
  - Audio review (legacy/proto2/island-audio/): placeholder voices, sound effects, and four v2 song takes (okiro2a-a1, 2a-e1, 2b-a1, 2b-e1). Only 2a-e1 has every command audible. The game still uses okiro-a1; if he picks a v2 take, update storyboard K05/K06, words.md and build_song().
  - Reward scenes (island/private/rewards/index.html, local only): 15 slots with private and discreet picks, 203 renders shown in order. Two Kanae scenes have no pick yet (the darkroom drifts to a poster look in every seed; the laundry needs a closer framing). The critic couldn't check them for style: the permission system denied its read of island/private/rewards/ as PII data handling. It needs Jørgen to allow agents to read that folder (results would go only to island/private/rewards/qa-rewards.md), or he judges them on the page himself. Nobody works around the denial. Future-day triggers (onsenCleared and the rest) have no script setting them until those days are written; karaokeMioSang is set by the game.
  - Not answered yet: the $50 Replicate prototype budget (only local placeholders are used meanwhile), permission to commit and push, whether to test MiniMax H3 locally for the anime opening (Q2 fits with offloading; he has 64 GB RAM), and whether to switch the maps to editable Godot scenes so he can arrange rooms himself.
- **Engine switch (2026-09-26, evening):** after playing both builds, Jørgen chose the three.js HD-2D version (legacy/side/hd2d): "the godot version is atrocious, the 3d one is mindblowing". The Godot project (legacy/island/godot) is frozen as reference; legacy/island/godot/PORTING.md says what to carry over. Its exports are from 21:17; the review-07 fixes and a title screen are only in its source.
- **Difficulty first (playtest 5):** both builds are "way too hard", with Japanese everywhere he's expected to know and clicking every word. The rules are in GUIDE (Difficulty). The HD-2D agent is reworking its room to them. After that, a cold-player test at his level, the critic's score, and then he plays it. No new places until he has.
- **Open for Jørgen:** the character look in 3D. He says the 48 px pixel sprites don't fit the 3D room, and he rules out paper standees and pixel looks. A local image-to-3D test of Mio (legacy/side/hd2d/figures.html, legacy/proto2/figures, models in ~/ai/figures) scored 6: the figures take the room's light and shadow, but faces come out garbled and colours drift, and the toy version reads better at game scale (legacy/island/qa/visual-review-11.md). He stopped that agent around midnight; a painted-figure retry (flat colours, a clean face decal, glasses and headphones as geometry) didn't finish. Other options: paid generators (Tripo, Meshy) on his account, or VRoid Studio models he'd make himself.
- **Running (2026-09-27, night):**
  - HD-2D agent (legacy/side/hd2d): fixing cold-player test 01 (legacy/side/hd2d/qa/cold-player-01.md). The eased room is now too easy because every answer shows in romaji, so the fixes are recall with stepped hints, the command rule on screen, fair "by yourself" counting, visible reactions to failures, and story slips. After that, the critic's re-score and a second cold test.
- **Stopped or paused:** the Godot builder (done, PORTING.md written), the pixel agent (2D maps stopped; plaza, lobby and landing fixed after review 08 but not re-reviewed; 1,042 PixelLab generations left), and anime art (paused; the lift, karaoke corridor and street paintings scored 6, 6 and 8 without the tower, exported with a status saying not to use them). Finished earlier: language core (じゅうぶん in kana fixed), writer, audio, map research, loop research, lyricist, reward agent (evening round).
- **Passed the critic and sent to Jørgen:** bg-karaoke-room, illust-basement-wakes, reward-karaoke-photo-discreet, photo-karaoke-hood and photo-emi-karaoke (all 8), and Mio's four expressions (9), in art/island/export.
- GPU lock at /tmp/claude-1000/gpu.lock.
- **Cast round 2 (second pass, 2026-09-25):** picks are in GUIDE (cast line). Heads were cut off by the top edge in most approved and picked portraits (a render framing problem, not the page). legacy/proto2/cast-fixed shows all 18 before/after with headroom outpainted (tools/reframe.py; the original pixels are kept, only the new border is painted). Waiting on Jørgen to accept them; nothing swapped into the game. The game's existing expression sprites (art/slice/ch) come from the same tight renders and will need the same fix once he accepts the method. New portrait renders now warn when the head touches the edge (tools/framecheck.py).
- **Day-1 build (2026-09-25), for his playtest:** revised design and full script (notes/day1-design.md, day1-draft.md; review round by a separate story editor), built in the game. Open questions for him at the end of day1-design.md (staple by hand, the 10/11/20/100 count, the もう？ threshold, the name on the ID card, time to the first spell).
- **Mio's voice:** candidate A (low, slightly husky) chosen; all 35 lines regenerated with it and in the game. Listen on legacy/proto2/voice-mio. Lowest line: 「……動かないで。……あと五分。」 (median 191 Hz, a sleepy whisper). 「そ。」 is too short to measure.
- **Video:** decided (2026-09-25): Wan 2.2 14B + lightx2v when we need clips (DaSiWa a tiny bit worse); the 5B is out. Redo the monorail source image (a finite train heading toward the island, with correct camera logic). Puppet sprites for dialogue portraits.
- Music settled (2026-09-25): Lyria for background loops, the softer-mastered YuE2 opening theme for the title. Nothing waiting.

### Focus: a narrow day-1 slice (Jørgen, 2026-09-25)
- Chosen: Emi, Mio, Rei; monorail, gate, basement office, Sales. Ishibashi voice/text only at the gate; canteen, rooftop and bar move to day 2. Get day 1 to an excellent state before scaling up. Don't build sprite sets for the whole cast yet.
- Redraw the day-1 locations (the current ones have logic errors, e.g. a bed with pillows at both ends). Redo the bartender's cutout (ugly edges).
- Backgrounds in the game (2026-09-25): gate = gate-lobby-2103, copy room = copyroom-copier-4203, office = office-reverse-5202-fix-a, dorm = dorm-worst-c (1920-wide webp, Lanczos from the 1216 px PNGs; an upscaler pass would look sharper). **Placeholders still in use: monorail (monorail.webp, an exterior shot, and GUIDE wants inside = side view) and Sales (sales.webp).** The lift is a floor panel over a CSS steel backdrop, no image.
- Locations (legacy/proto2/locations1): round 3 is waiting on him: the monorail final approach (2 options, straight-on right-hand window, composites: city close with the second guideway alongside, and the platform) and Sales (3 options, island layout from the Blender blockout as line control). No exterior option passed (the model draws 5-8 cars instead of three); try img2img from his bay master with an inpainted-out tail, or accept a longer train. After he picks, convert the chosen images to legacy/game/img/bg (1920-wide webp) and replace the placeholders. Staging notes and prompts: tools/blockout/shots.py and composite.py.
- Day 1 built (2026-09-25): train opening (train-opening-script.md; replaced the new-hire app and level check the same day) → gate (starts from Emi's photo) (Ishibashi as a voice from a speaker) → office → copy room (first kotodama: 出して, 急いで, 並んで; count on the keypad; noise and Mio's footsteps) → office (「……もう？」) → Sales (渡す/見せる with a witness, or wait him out) → afternoon → evening → dorm (chat with Emi by free typing, scripted fallback, Rei's message, save). 5 casts. Test with `node tools/day1_playtest.mjs` (needs `python3 -m http.server 8765` on the repo root); transcripts in notes/transcripts/day1.md (every branch) and day1-played.md (six played routes).
- Day 1 untested or rough: the LLM chat only tested with Orion on the CPU (works, 10 to 20 s a reply) from a localhost page, not from the https GitHub Pages page (Chrome may ask for local-network permission); the amakawa:// one-click link is registered (tools/llm/install-launcher.sh) but not clicked from a real browser. Level-check drift and per-kanji promotion only run over real days. Beginner profile is still heavy (42 lines over budget, notes/pacing-day1-revised.md): needs lighter beginner lines or more English support.
- Day 2 has to be replaced so it doesn't repeat day 1 (notes/day2-replace.md). Until then day 2 opens with the same copier job.
- Next when the GPU frees up: base sprites for Emi, Mio and Rei (approved designs, proper headroom) plus ~5 face-only expressions each, on a review page for Jørgen; then blink/breath/mouth puppets like the Mio demo.
- Composition research on the side.
- Opening: picks recorded on legacy/proto2/opening/shots.html (sky-tall-12, oncoming2-216 with its repeating clouds to fix, mc-window2-266); bay, cabin, other window shots, city view, phone app and title card rejected (see the page). Paused until the Blender blockout + ControlNet recipe passes review. Song edit: legacy/game/audio/music/opening-tv.mp3 (89.6 s).

### Train opening: art shots needed (built 2026-09-25 with placeholders)
The opening in notes/train-opening-script.md is playable with code-drawn placeholders (legacy/game/art.js; each backdrop is tagged "placeholder art"). Nothing here is approved yet; every shot needs candidates on a review page and Jørgen's pick. Staging from the script:
- **carriage (master, seated oblique side view):** company monorail carriage, side-facing bench. Rei seated beside an empty seat, window behind her: sea and sky only, water well below the carriage, no forward track, no island. Morning light from the sea-facing window. Used for most of scenes 1 to 6; Rei's approved sprite (rei-cold) is placed over it for now.
- **seat, standing view (scene 1):** from the player's standing eye level looking down at the seat and Rei's hands: her closed folder on the empty seat with a lidded takeaway coffee on it tipping toward her small open laptop on her lap. Two result inserts: the player's hand steadying the cup while she catches the folder; she catches the cup and closes the laptop with her other hand. No spill.
- **badge insert (scene 3):** the player's new company badge in a clear sleeve, protective film still on, AMAKAWA mark (the same mark as beside the carriage doors), department 企画室７ readable and large. No tiny decorative Japanese.
- **island reveal (scene 4):** exterior; camera outside and behind the train, offset to one side, looking along the direction of travel. The last car (a visible end), the continuous elevated beam and its piers, the island of offices and residential towers ahead with streets and shops between; the company mark on one major building only. Train moving away from the camera toward the island.
- **dorm card and delivery photo (scene 4):** a card with a bed symbol, A · 203 and 寮; on the phone, a photo of taped moving boxes outside door 203, one with an AMAKAWA delivery sticker, one with a hand-drawn mug.
- **Emi's contact photo (scene 5):** small avatar crop of Emi's approved design (the placeholder crops emi-smile).
- **Rei's folder and phone (scene 6):** a short table of figures (not legible); her phone lit with an incoming call from エミ, which she silences.
- **door close-up, arrival (scene 7):** a separate close shot facing the open side doors; the platform on that side, visible only once stopped. Rei standing with folder under her arm and cup in hand; her badge face out: 黒田 レイ / 営業部.
- **Rei's badge insert (scene 7):** 黒田 レイ / 営業部, readable.
- **platform exterior (scene 8):** the protagonist steps out, Rei a pace behind turning toward the main flow and glancing back; beyond the station canopy the lower levels of the company city.
- **Emi's photo of the entrance (scene 8):** uses the approved gate background (gate-lobby-2103, legacy/game/img/bg/gate.webp) as the photo. No new art needed unless Jørgen wants a phone-camera-style shot of it.
- Rei sprites: only rei-cold matches the approved design (steel-grey eyes). rei-smirk and rei-confused have red eyes and a different hairline and are still used by the older Sales scene; they need redoing from the approved base. rei-cold has two small dark specks near her right ear (cutout debris).

### Art (after the cast is settled; decide before producing)
- Final cast in RDBT, one approved base sprite per character, then expressions by face-only inpainting (consistent outfits). Approved so far: main character (IT guy, M-02-it-guy-601), Emi (r3 seed 41), Rei, Mio, Aoi, Kaori (RDBT batch B), Kuro (A-luna-s101), Kiyoko (s101 face, new clothes).
- Swap the new sprites into the game (the game still uses older mixed-model sprites for most characters).
- Main character sprite set, once his design is final (the current tests came out too tan; enforce fair skin).
- Environments batch and story-scene CGs for days 1–5, only after the model and cast are locked.
- Action scenes (shootout, swim, volleyball) need composition control. Set up (2026-09-25): Anima LLLite lineart/depth/pose/inpainting patches and Blender blockouts (GUIDE.md, Art, "Composition control"; tools/blockout). Next: a pose or blockout per action scene; the pose patch is documented as weak, so start with lineart from a blockout.
- Fix Mio's game-night reward image (brand-like logo on the can, "MO" text on the shirt). Fix the faint pale fringe on Yuzuki's hair cutout.

### Game (builder owns legacy/game/)
- Done (playtest round 2): karaoke follow-along, backlog, no blur, reply-box pill, no kana over kana (tested on 310 lines), player lines shown as あなた. Next: Jørgen replays and gives round-3 feedback.
- Days 2-5 still use Emi "smirk" (mapped to teasing by an alias); day 1 uses teasing directly.
- Voices: all 124 day-1 lines voiced (2026-09-25, $0.69; ledger $15.43). A few Emi lines failed the pitch guard four times and kept the best take (tools/voice-flags.txt).
- Phone and train mode: offline play (a service worker), spell practice as spaced repetition, a statistics screen with measurable progress.
- Discreet mode for reward images, on by default on the phone.

### Story (story editor owns scene content)
- Week 2 onward, following the critic's 12-week curriculum (notes/critique.md) and the closure-threat arc. Introduce the new cast (Saki, Kuro, Kiyoko, Nanami) with the cliche-transcendence skill, not stock tropes.
- Read every branch as transcripts after each change.

### Tooling and knowledge
- Repo cleanup (2026-09-28, first part done): proto/, proto2/, mvp/, side/, the old VN game, the quiz PWA and the island slice (except island/private) are in legacy/, game/notes is notes/, approved art is copied to art/approved/<bible id>/, and tools point at the new paths. Still open: copy any voice clips tools need from legacy/proto2/audition to tools/voice-refs/; then (approved 2026-09-25) mirror-backup the repo to ~/repo/japanese-backup.git, scrub old media from history with git filter-repo, force-push main.
- Workflows are saved in tools/workflows and ~/ai/workflows. Save every new one there.
- Replicate spend is about $15.43 of the $20 cap; images, music and cutouts are now local, and only voices remain on Replicate.

