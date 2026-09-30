# Train encounters: draft notes

C-0130, corrected by C-0133: the people are reachable, but their replies are dull. The final author decision is in [review.json](review.json), made under C-0193 after the saved player feedback and Claude cold read. Five revised encounters proceed; Aoi keeps the original. Story and staging are integrated in work #6; voice delivery and release are tracked there. The shared seat hint already names the lunchbox.

Story-sense diagnosis: the carriage has people but too little life outside the main conversation. Dialogue diagnosis: the optional lines mostly do one job, acknowledge the click. Give the person a concern already under way, then let Eric briefly enter it.

Defaults avoided: every passenger teaching vocabulary, a mysterious stranger, a corporate history speech, universal sarcasm, a future quest hidden in every prop, and everyone knowing Eric's job before he speaks. The guitarist is occupied with her own practice; the player can see the footballer's pride without being invited to a new minigame. Short speech and gestures carry the encounters.

The first four current cards include both existing paths: a shared seat-goal flag makes only the first passenger give the seat hint; the others already use their ordinary lines. Each proposed encounter works on that first click and retains the seat hint when needed. No extra “talk again” step. Generic greetings, Mio and Tama remain unchanged.

The proposed Japanese passenger lines have English subtitles, including unfamiliar Japanese, following setting.md. This is part of the proposed encounter, not an unresolved question: these lines must not use the current overheard blur/muffled-audio presentation. Eric still has limited Japanese and follows gestures or familiar words. The review adds romaji as a reading aid. No forced word lesson is proposed.

## Staging for implementation

### train-aoi

Rejected on 2026-09-30; keep the original. The proposal below is retained for reference.

Aoi looks at Eric’s existing staff card and reads its B2 assignment; Eric has no fluent answer to her Japanese. Keep her seated phone call. Combine her bow and conditional seat hint. The basement discomfort sets up Mio’s later reaction; do not change or repeat Mio’s explanation here.

### train-bun

One click, one short bag-closing motion and one thank-you. She points; Eric presses the bulging top while she closes the zip. Show the help through movement, with no narration, extra dialogue, drag puzzle, menu or inventory. Keep the usual seat hint when needed. She is returning from mainland shopping; no food gift competes with Mio’s pickle.

### train-youth

One turn and phone presentation. Frame the photo and number-only score so both read on a phone. No named department, match date or invitation; no new football activity. Japanese subtitles supply the first-goal detail, while the grin and losing score make his pride visible to Eric.

### train-music

Use the Girl with headphones from cast.md. Show a simple identifiable video of her playing, and use a short guitar practice phrase. No rewind or new music activity. Eric infers her question from the headphone lift and audible sound. New visual/audio assets follow only after the passage pick.

### train-reader

Show the existing book beside one printout in one held pose. Use a large old grey interface and readable “Windows 95”, not a tiny taskbar or extra company-name tap. His immediate problem is the mismatch; Mio’s later line still explains why the whole company keeps its old systems. No new ticket.

### train-hamada

Keep Hamada asleep for the later rescue; greeting/asleep still returns the zzz. His mumble apologises to the reminder as he dismisses it. The phone repeats the appointment, not the current time. One buzz/tap motion; no new wake-up choice or Eric closing line.


## Scenery audit

The existing six scenery nodes are disabled through marker filtering. This is separate from the passenger-content complaint and is not part of this proposed implementation. The stander was deliberately removed, so his unused nodes stay unused. No scenery replacement or marker work is proposed here.

## Cold-read changes

C-0136: English subtitles are now an explicit part of the proposal. Fixed the headphone wearer's gender; removed the invented second IT team and later-match hint; replaced the duplicate food offer with help closing a shopping bag; cut Eric's closing quips; simplified the phone/printout gestures; gave Hamada a sleepy apology. Aoi reads Eric's card rather than answering fluent English. Her discomfort and the reader's printout are small optional setups for Mio's fuller explanation, whose script is unchanged. No repeated “yesterday” detail.

## Decision and implementation, 2026-09-30

The [saved feedback](feedback.json) remains Jørgen's exact answer. The later author decision is recorded separately in [review.json](review.json); do not imply he personally picked the four previously unanswered cards. C-0193 removed the need for another player review. The shortened bun encounter and four remaining revised proposals proceed after a fresh Codex cold read of the latest complete frames and Claude's earlier findings. Aoi stays original.

Implementation: C-0206 supplies the train place hooks for phone, headphones, printout and shopBag, plus the `en` field for English subtitles with clear Japanese voice. `game3d/story/train.js` now uses the selected passages and the translations in frames.json. The hooks present the props directly; no explanatory narration replaces their staging.

Story integration replaces `bun`, `youth`, `music`, `reader` and `hamada`, with a seen flag per encounter and a quiet repeat response. `first_bun`, `first_youth` and `first_music` call their encounter, then retain the directed point to `seat_far_r` and `nod_seat`; they retain no extra old seat-direction line. Preserve `first_aoi`, `phone_girl`, `nod_seat`, Mio, Tama, all greeting responses, the later Hamada rescue and disabled scenery. In youth's moment, Eric points to the displayed photograph while asking his question so the response follows an understandable gesture.

Work #6 tracks the build. Claude owns engine/staging/audio and Codex owns final text/steps. Evening discoveries #87 are shipped. Check each optional encounter in isolation on phone and desktop, including first-passenger path, repeat, muted audio and Continue, then verify the day still reaches its existing ending.

C-0209 final integration cold read: youth repeats with a nod; reader confirms with a nod instead of a repeated sentence; Hamada’s phone replaces the sticky-note narration and stays visible through his sleepy line until advance. Music retains its two-word English reply because the available Eric nod clip holds the scene for about 13 seconds. These small edits keep the selected encounters and remove two text boxes.
