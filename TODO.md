# Outstanding work (as of 2026-09-24 evening)

Read GUIDE.md first. Pick up from here next session.

## Waiting on Jørgen
- **Cast round 2 (second pass, 2026-09-25):** picks are in GUIDE (cast line). Heads were cut off by the top edge in most approved and picked portraits (a render framing problem, not the page). proto2/cast-fixed shows all 18 before/after with headroom outpainted (tools/reframe.py; the original pixels are kept, only the new border is painted). Waiting on Jørgen to accept them; nothing swapped into the game. The game's existing expression sprites (art/slice/ch) come from the same tight renders and will need the same fix once he accepts the method. New portrait renders now warn when the head touches the edge (tools/framecheck.py).
- **Locations round 2 (proto2/locations2):** Jørgen picked office-reverse-5202; three versions with the window beside the door removed (fix a/b/c) are on the page. Dorm: three options with the window now facing a concrete wall 2 m away (dorm-worst-a/b/c, interiors of window-6201/6202 kept). Waiting on his pick; then convert to game/img/bg.
- **Mio's voice:** candidate A (low, slightly husky) chosen; all 35 lines regenerated with it and in the game. Listen on proto2/voice-mio. Lowest line: 「……動かないで。……あと五分。」 (median 191 Hz, a sleepy whisper). 「そ。」 is too short to measure.
- **Video:** decided (2026-09-25): Wan 2.2 14B + lightx2v when we need clips (DaSiWa a tiny bit worse); the 5B is out. Redo the monorail source image (a finite train heading toward the island, with correct camera logic). Puppet sprites for dialogue portraits.
- Music settled (2026-09-25): Lyria for background loops, the softer-mastered YuE2 opening theme for the title. Nothing waiting.

## Focus: a narrow day-1 slice (Jørgen, 2026-09-25)
- Chosen: Emi, Mio, Rei; monorail, gate, basement office, Sales. Ishibashi voice/text only at the gate; canteen, rooftop and bar move to day 2. Get day 1 to an excellent state before scaling up. Don't build sprite sets for the whole cast yet.
- Redraw the day-1 locations (the current ones have logic errors, e.g. a bed with pillows at both ends). Redo the bartender's cutout (ugly edges).
- Locations (proto2/locations1): Jørgen picked gate-lobby-2103 and copyroom-copier-4203. Round 2 redo is waiting on him: monorail interior (3: the carriage is on the beam about 15 m up, low horizon, no track outside) and Sales (3: the plain house prompt, muted to match the copy room). After he picks, convert the chosen images to game/img/bg (1920-wide webp). Prompts and staging notes are in tools/locations1.py. The day-1 script still says "squeeze across the crowded carriage", but the carriage is empty.
- Day-1 flow: monorail → gate → office → copy room (first secret magic, the first task: copies for Emi) → office → Sales (Rei, second spell). Design and build the copy-room magic mechanic. See GUIDE "Current focus".
- One free-typing local-AI moment on day 1, with a one-click start of llama-server. Phone/train mode after day 1.
- Decided: phone onboarding on the monorail (welcome, map, dorm room, ID card, level check); things sent ahead; day 1 ends in his dorm room. Dorm-room background options are on proto2/locations2; still needs script changes to day1-draft.md (also fix the "crowded carriage" line: the arrival train is empty).
- Composition research on the side.
- Opening: picks recorded on proto2/opening/shots.html (sky-tall-12, oncoming2-216 with its repeating clouds to fix, mc-window2-266); bay, cabin, other window shots, city view, phone app and title card rejected (see the page). Paused until the Blender blockout + ControlNet recipe passes review. Song edit: game/audio/music/opening-tv.mp3 (89.6 s).

## Art (after the cast is settled; decide before producing)
- Final cast in RDBT, one approved base sprite per character, then expressions by face-only inpainting (consistent outfits). Approved so far: main character (IT guy, M-02-it-guy-601), Emi (r3 seed 41), Rei, Mio, Aoi, Kaori (RDBT batch B), Kuro (A-luna-s101), Kiyoko (s101 face, new clothes).
- Swap the new sprites into the game (the game still uses older mixed-model sprites for most characters).
- Main character sprite set, once his design is final (the current tests came out too tan; enforce fair skin).
- Environments batch and story-scene CGs for days 1–5, only after the model and cast are locked.
- Action scenes (shootout, swim, volleyball) need composition control (a pose or layout sketch as input, or regional prompting). Research and set up before retrying.
- Fix Mio's game-night reward image (brand-like logo on the can, "MO" text on the shirt). Fix the faint pale fringe on Yuzuki's hair cutout.

## Game (builder owns game/)
- Player voice lines for the two new coffee-machine choices (たたく, 「動いて」); commit the builder's two uncommitted voice files.
- Done (playtest round 2): karaoke follow-along, backlog, no blur, reply-box pill, no kana over kana (tested on 310 lines), player lines shown as あなた. Next: Jørgen replays and gives round-3 feedback.
- Map Emi's new expression keys (the old "smirk" became "teasing").
- Local LLM: a one-click or automatic start of Orion (llama-server on port 8190) for the bar conversation; free ComfyUI's VRAM first.
- Phone and train mode: offline play (a service worker), spell practice as spaced repetition, a statistics screen with measurable progress.
- Discreet mode for reward images, on by default on the phone.

## Story (story editor owns scene content)
- Week 2 onward, following the critic's 12-week curriculum (game/notes/critique.md) and the closure-threat arc. Introduce the new cast (Saki, Kuro, Kiyoko, Nanami) with the cliche-transcendence skill, not stock tropes.
- Read every branch as transcripts after each change.

## Tooling and knowledge
- Repo cleanup, after the running agents finish: move every proto2 page except the active ones (decide2, music, voice-mio, video2, locations1) and the old proto/ to ~/repo/japanese-archive; first copy the approved reference images to art/approved/ and the voice clips from proto2/audition to tools/voice-refs/, and repoint tools. Then (approved 2026-09-25): mirror-backup the repo to ~/repo/japanese-backup.git, scrub old media from history with git filter-repo, force-push main.
- Workflows are saved in tools/workflows and ~/ai/workflows. Save every new one there.
- Replicate spend is about $14.22 of the $20 cap; images, music and cutouts are now local, and only voices remain on Replicate.
