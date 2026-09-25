# Outstanding work (as of 2026-09-25)

Read GUIDE.md first. Pick up from here next session.

## Waiting on Jørgen
- **Cast round 2 (second pass, 2026-09-25):** picks are in GUIDE (cast line). Heads were cut off by the top edge in most approved and picked portraits (a render framing problem, not the page). proto2/cast-fixed shows all 18 before/after with headroom outpainted (tools/reframe.py; the original pixels are kept, only the new border is painted). Waiting on Jørgen to accept them; nothing swapped into the game. The game's existing expression sprites (art/slice/ch) come from the same tight renders and will need the same fix once he accepts the method. New portrait renders now warn when the head touches the edge (tools/framecheck.py).
- **Day-1 build (2026-09-25), for his playtest:** revised design and full script (game/notes/day1-design.md, day1-draft.md; review round by a separate story editor), built in the game. Open questions for him at the end of day1-design.md (staple by hand, the 10/11/20/100 count, the もう？ threshold, the name on the ID card, time to the first spell).
- **Mio's voice:** candidate A (low, slightly husky) chosen; all 35 lines regenerated with it and in the game. Listen on proto2/voice-mio. Lowest line: 「……動かないで。……あと五分。」 (median 191 Hz, a sleepy whisper). 「そ。」 is too short to measure.
- **Video:** decided (2026-09-25): Wan 2.2 14B + lightx2v when we need clips (DaSiWa a tiny bit worse); the 5B is out. Redo the monorail source image (a finite train heading toward the island, with correct camera logic). Puppet sprites for dialogue portraits.
- Music settled (2026-09-25): Lyria for background loops, the softer-mastered YuE2 opening theme for the title. Nothing waiting.

## Focus: a narrow day-1 slice (Jørgen, 2026-09-25)
- Chosen: Emi, Mio, Rei; monorail, gate, basement office, Sales. Ishibashi voice/text only at the gate; canteen, rooftop and bar move to day 2. Get day 1 to an excellent state before scaling up. Don't build sprite sets for the whole cast yet.
- Redraw the day-1 locations (the current ones have logic errors, e.g. a bed with pillows at both ends). Redo the bartender's cutout (ugly edges).
- Backgrounds in the game (2026-09-25): gate = gate-lobby-2103, copy room = copyroom-copier-4203, office = office-reverse-5202-fix-a, dorm = dorm-worst-c (1920-wide webp, Lanczos from the 1216 px PNGs; an upscaler pass would look sharper). **Placeholders still in use: monorail (monorail.webp, an exterior shot, and GUIDE wants inside = side view) and Sales (sales.webp).** The lift is a floor panel over a CSS steel backdrop, no image.
- Locations (proto2/locations1): round 3 is waiting on him: the monorail final approach (2 options, straight-on right-hand window, composites: city close with the second guideway alongside, and the platform) and Sales (3 options, island layout from the Blender blockout as line control). No exterior option passed (the model draws 5-8 cars instead of three); try img2img from his bay master with an inpainted-out tail, or accept a longer train. After he picks, convert the chosen images to game/img/bg (1920-wide webp) and replace the placeholders. Staging notes and prompts: tools/blockout/shots.py and composite.py.
- Day 1 built (2026-09-25): train opening (train-opening-script.md; replaced the new-hire app and level check the same day) → gate (starts from Emi's photo) (Ishibashi as a voice from a speaker) → office → copy room (first kotodama: 出して, 急いで, 並んで; count on the keypad; noise and Mio's footsteps) → office (「……もう？」) → Sales (渡す/見せる with a witness, or wait him out) → afternoon → evening → dorm (chat with Emi by free typing, scripted fallback, Rei's message, save). 5 casts. Test with `node tools/day1_playtest.mjs` (needs `python3 -m http.server 8765` on the repo root); transcripts in game/notes/transcripts/day1.md (every branch) and day1-played.md (six played routes).
- Day 1 untested or rough: the LLM chat only tested with Orion on the CPU (works, 10 to 20 s a reply) from a localhost page, not from the https GitHub Pages page (Chrome may ask for local-network permission); the amakawa:// one-click link is registered (tools/llm/install-launcher.sh) but not clicked from a real browser. Level-check drift and per-kanji promotion only run over real days. Beginner profile is still heavy (42 lines over budget, game/notes/pacing-day1-revised.md): needs lighter beginner lines or more English support.
- Day 2 has to be replaced so it doesn't repeat day 1 (game/notes/day2-replace.md). Until then day 2 opens with the same copier job.
- Next when the GPU frees up: base sprites for Emi, Mio and Rei (approved designs, proper headroom) plus ~5 face-only expressions each, on a review page for Jørgen; then blink/breath/mouth puppets like the Mio demo.
- Composition research on the side.
- Opening: picks recorded on proto2/opening/shots.html (sky-tall-12, oncoming2-216 with its repeating clouds to fix, mc-window2-266); bay, cabin, other window shots, city view, phone app and title card rejected (see the page). Paused until the Blender blockout + ControlNet recipe passes review. Song edit: game/audio/music/opening-tv.mp3 (89.6 s).

## Train opening: art shots needed (built 2026-09-25 with placeholders)
The opening in game/notes/train-opening-script.md is playable with code-drawn placeholders (game/art.js; each backdrop is tagged "placeholder art"). Nothing here is approved yet; every shot needs candidates on a review page and Jørgen's pick. Staging from the script:
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
- **Emi's photo of the entrance (scene 8):** uses the approved gate background (gate-lobby-2103, game/img/bg/gate.webp) as the photo. No new art needed unless Jørgen wants a phone-camera-style shot of it.
- Rei sprites: only rei-cold matches the approved design (steel-grey eyes). rei-smirk and rei-confused have red eyes and a different hairline and are still used by the older Sales scene; they need redoing from the approved base. rei-cold has two small dark specks near her right ear (cutout debris).

## Art (after the cast is settled; decide before producing)
- Final cast in RDBT, one approved base sprite per character, then expressions by face-only inpainting (consistent outfits). Approved so far: main character (IT guy, M-02-it-guy-601), Emi (r3 seed 41), Rei, Mio, Aoi, Kaori (RDBT batch B), Kuro (A-luna-s101), Kiyoko (s101 face, new clothes).
- Swap the new sprites into the game (the game still uses older mixed-model sprites for most characters).
- Main character sprite set, once his design is final (the current tests came out too tan; enforce fair skin).
- Environments batch and story-scene CGs for days 1–5, only after the model and cast are locked.
- Action scenes (shootout, swim, volleyball) need composition control. Set up (2026-09-25): Anima LLLite lineart/depth/pose/inpainting patches and Blender blockouts (GUIDE.md, Art, "Composition control"; tools/blockout). Next: a pose or blockout per action scene; the pose patch is documented as weak, so start with lineart from a blockout.
- Fix Mio's game-night reward image (brand-like logo on the can, "MO" text on the shirt). Fix the faint pale fringe on Yuzuki's hair cutout.

## Game (builder owns game/)
- Done (playtest round 2): karaoke follow-along, backlog, no blur, reply-box pill, no kana over kana (tested on 310 lines), player lines shown as あなた. Next: Jørgen replays and gives round-3 feedback.
- Days 2-5 still use Emi "smirk" (mapped to teasing by an alias); day 1 uses teasing directly.
- Voices: all 124 day-1 lines voiced (2026-09-25, $0.69; ledger $15.43). A few Emi lines failed the pitch guard four times and kept the best take (tools/voice-flags.txt).
- Phone and train mode: offline play (a service worker), spell practice as spaced repetition, a statistics screen with measurable progress.
- Discreet mode for reward images, on by default on the phone.

## Story (story editor owns scene content)
- Week 2 onward, following the critic's 12-week curriculum (game/notes/critique.md) and the closure-threat arc. Introduce the new cast (Saki, Kuro, Kiyoko, Nanami) with the cliche-transcendence skill, not stock tropes.
- Read every branch as transcripts after each change.

## Tooling and knowledge
- Repo cleanup, after the running agents finish: move every proto2 page except the active ones (decide2, music, voice-mio, video2, locations1) and the old proto/ to ~/repo/japanese-archive; first copy the approved reference images to art/approved/ and the voice clips from proto2/audition to tools/voice-refs/, and repoint tools. Then (approved 2026-09-25): mirror-backup the repo to ~/repo/japanese-backup.git, scrub old media from history with git filter-repo, force-push main.
- Workflows are saved in tools/workflows and ~/ai/workflows. Save every new one there.
- Replicate spend is about $15.43 of the $20 cap; images, music and cutouts are now local, and only voices remain on Replicate.
