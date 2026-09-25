# Outstanding work (as of 2026-09-24 evening)

Read GUIDE.md first. Pick up from here next session.

## Waiting on Jørgen
- **Cast round 2:** approved Goro a-202, Jun a-202, Ishibashi b-201, Saki a-201. To do: Yuzuki c-202 with different hair and a smaller chest; Kiyoko outfits (not black) on her s101 face; Nanami options; the basement office from option 2 (more space, chairs, ramen cups). The rest renders with tools/decide2.py.
- **Mio's voice:** candidate A (low, slightly husky) chosen; all 35 lines regenerated with it and in the game. Listen on proto2/voice-mio. Lowest line: 「……動かないで。……あと五分。」 (median 191 Hz, a sleepy whisper). 「そ。」 is too short to measure.
- **Video:** Jørgen's verdict: very bad. The train looks like a worm with rippling skin, and the women barely move. Partly the model (Wan 2.2 5B is small), partly the prompts. Options for next time, decide before rendering more:
  1. A bigger local model: Wan 2.2 14B image-to-video, GGUF-quantized, offloading to the 60 GB of RAM (slow but much better), plus anime motion add-ons.
  2. Cloud for a few key cutscenes only: Kling, Seedance or Veo on Replicate, $0.25–1.20 per clip.
  3. For living portraits, skip video: animate the sprites as layered puppets (Live2D-style: blinking, breathing and hair sway in the game engine). Cheap, consistent and loopable; probably the right tool for VN characters.
  4. Better motion prompts: describe the motion explicitly per second, use camera terms, and a motion-strength or frame-count choice.
- Music settled (2026-09-25): Lyria for background loops, the softer-mastered YuE2 opening theme for the title. Nothing waiting.

## Focus: a narrow day-1 slice (Jørgen, 2026-09-25)
- Chosen: Emi, Mio, Rei; monorail, gate, basement office, Sales. Ishibashi voice/text only at the gate; canteen, rooftop and bar move to day 2. Get day 1 to an excellent state before scaling up. Don't build sprite sets for the whole cast yet.
- Redraw the day-1 locations (the current ones have logic errors, e.g. a bed with pillows at both ends). Redo the bartender's cutout (ugly edges).
- Day-1 flow: monorail → gate → office → copy room (first secret magic, the first task: copies for Emi) → office → Sales (Rei, second spell). Design and build the copy-room magic mechanic. See GUIDE "Current focus".
- One free-typing local-AI moment on day 1, with a one-click start of llama-server. Phone/train mode after day 1.
- Composition research on the side.

## Art (after the cast is settled; decide before producing)
- Final cast in RDBT, one approved base sprite per character, then expressions by face-only inpainting (consistent outfits). Approved so far: main character (IT guy, M-02-it-guy-601), Emi (r3 seed 41), Rei, Mio, Aoi, Kaori (RDBT batch B), Kuro (A-luna-s101), Kiyoko (s101 face, new clothes).
- Swap the new sprites into the game (the game still uses older mixed-model sprites for most characters).
- Main character sprite set, once his design is final (the current tests came out too tan; enforce fair skin).
- Environments batch and story-scene CGs for days 1–5, only after the model and cast are locked.
- Action scenes (shootout, swim, volleyball) need composition control (a pose or layout sketch as input, or regional prompting). Research and set up before retrying.
- Fix Mio's game-night reward image (brand-like logo on the can, "MO" text on the shirt). Fix the faint pale fringe on Yuzuki's hair cutout.
- The basement office window sits mid-wall (should be high); superseded by the decide2 office round.

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
