# Outstanding work (as of 2026-09-24 evening)

Read GUIDE.md first. Pick up from here next session.

## Waiting on Jørgen
- **Cast round 2 picks:** proto2/decide2 (partial: Yuzuki, Goro, Jun, Ishibashi and Saki-a are rendered; Saki-b, the Kiyoko outfits, Nanami and the office revision are still to render: rerun tools/decide2.py, which only renders what is missing) (Yuzuki distinct from Emi, Goro in RDBT, new Jun, Ishibashi options, Saki not like Rei, Kiyoko outfits that aren't black, Nanami options, basement office with chairs and ramen cups).
- **Mio's voice:** all 35 lines regenerated from the original clip with only a male-drift guard. Listen on proto2/voice-mio; 「新しいゲーム…」 is borderline (35% under 160 Hz).
- **Video:** Jørgen's verdict: very bad. The train looks like a worm with rippling skin, and the women barely move. Partly the model (Wan 2.2 5B is small), partly the prompts. Options for next time, decide before rendering more:
  1. A bigger local model: Wan 2.2 14B image-to-video, GGUF-quantized, offloading to the 60 GB of RAM (slow but much better), plus anime motion add-ons.
  2. Cloud for a few key cutscenes only: Kling, Seedance or Veo on Replicate, $0.25–1.20 per clip.
  3. For living portraits, skip video: animate the sprites as layered puppets (Live2D-style: blinking, breathing and hair sway in the game engine). Cheap, consistent and loopable; probably the right tool for VN characters.
  4. Better motion prompts: describe the motion explicitly per second, use camera terms, and a motion-strength or frame-count choice.
- **Local music:** YuE2 versus Lyria verdict (proto2/music). The game currently alternates between both.

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
- Workflows are saved in tools/workflows and ~/ai/workflows. Save every new one there.
- Replicate spend is about $14.22 of the $20 cap; images, music and cutouts are now local, and only voices remain on Replicate.
