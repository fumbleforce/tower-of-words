# Evening discoveries, final writing and staging

For work #87, C-0192/C-0193. Five optional encounters for the walk home, after the Codex cold read and Claude story-reader (C-0194; notes/evening-discoveries-coldread.md). These are draft staging instructions, not lines to display. Only quoted dialogue, marked captions/inspection text and action labels appear to the player.

All five require `going_home`. They start when the player chooses the object, leave the route home available and end without a new objective. Their outcomes persist for the evening. No new word, purchase, inventory item or reward counter is required. Japanese remains subject to the existing known-word display; the pictures carry the action.

## 1. The garden bench

Forecourt, the small gravel court reached by the stepping stones. Tama has found the bench beside the lit stone lantern. She is curled up at one end; there is visibly room for Eric at the other.

1. The player selects **Sit on the garden bench**. Eric follows the stones and sits. Frame him, the cat and the lantern together, away from the tower.
2. Tama gets up, walks along the bench and settles on his lap. Eric holds his hands clear while she turns around.
3. Eric, softly: "I was only going to sit down for a second."
4. Advance lets Tama hop back onto the bench, then returns control with Eric still seated. Ordinary movement stands him up before walking away. Tama stays asleep at the other end. Further visits allow sitting without replaying the line.

Needs: a garden-bench thing and seat; Tama in this place during the evening; a lap position and the short hop off before standing. The garden and walkable stones already exist. Use the existing generic sit/stand support in narrative/hooks/movement.js; Tama hops off on advance so no new movement interception is needed. No cat teleport visible to the player.

## 2. The fallen bicycle

Forecourt, the existing fallen bicycle in the station bike court. Optional on a small detour before taking the east lane.

1. The player selects **Stand the bicycle up**. Eric bends and lifts it by the handlebar; the front wheel turns freely as he puts its stand down.
2. As he lets go, the bell rings. The bicycle leaning against it slowly tips into the aisle in its place.
3. Eric looks at the second bicycle. Return control. No dialogue. The second bike can be stood up with no further gag.

Needs: a selectable fallen-bike mesh, a second movable bicycle, a short lift/set-down animation, a slow tipping movement and a bicycle-bell sound. Keep both final positions clear of the walk. Both upright/fallen states must survive a return from the plaza. Cut this encounter if the second bicycle cannot be staged clearly at modest cost. Do not replace this with a narrated repair or add a reward notice.

## 3. The canteen terrace

Plaza, the canteen's existing terrace. A canteen worker is stacking the outdoor chairs for closing. One chair remains upright at the table closest to the path. The worker carries another chair toward that table.

1. The player selects **Sit at the canteen table**. Frame Eric and the worker before Eric reaches for the last chair.
2. The worker pauses with the chair in their hands. Eric looks at the upside-down chairs on the other tables, then at the chair he is holding.
3. Eric: "{sumimasen}。" (Use the existing learned-word clip.)
4. Eric turns his chair upside down onto the table instead. The worker sets theirs beside it and gives him a small bow: "お疲れさまです。"
5. Eric gives a small bow back. The worker carries on closing. Return control; that chair stays on the table.

Needs: one unnamed canteen worker, two movable terrace chairs, a shared-table spot and simple carry/set-down poses. No canteen interior. The worker repeats Kuro's leaving-work greeting; no new word lesson. The line may be mostly blurred; the bow and Eric helping are the payoff. Use Eric's existing `{sumimasen}` delivery for step 3. The worker responds to his action, not his English.

## 4. At the bath curtain

Dorm courtyard, the existing sento frontage. The curtain hangs over the lit entrance. A man inside is singing, quietly and quite badly, with the roomy echo of a bath. No intelligible lyrics.

The first singer is audible nearby before selecting the entrance, after the player has enabled audio. Use the monorail door-chime melody, hummed rather than words. The visible entrance remains selectable with audio muted.

1. The player selects **Bath**. Eric stops beside the curtain, facing the doorway. He does not lift it or look inside. The camera stays outside.
2. The first voice stops. A second man finishes the little tune, worse. Eric smiles. One sound caption: "> Someone else finishes the song for him. He's worse."
3. The caption stays until advance, then return control. Afterward, ordinary ambient singing continues; the one-off action is gone, with no repeated caption or punchline.

Needs: a bath-entrance thing and standing spot, Eric's existing smile, and two short wordless vocal sounds from inside. No curtain animation or bath interior. The second sound finishes before the caption appears, so no timed joke or movement runs while the player reads. With audio muted, the caption carries the sound discovery. No singer portrait or new named character.

## 5. Mailbox 203

New dorm hall, at Eric's mailbox. The number 203 and tape reading **エリック** are already there (notes/dorm-floor-plan.md). Use the hall builder's final `mailboxes` thing.

1. The player selects **Check mailbox 203**. Frame the tape with its clear gloss: **エリック · erikku · Eric**. His own name is readable here without a mandatory word lesson. He opens the flap.
2. Inside is one folded bakery flyer, **パン BAKERY**. Hold the open box and its contents in view until the player advances; no spoken line.
3. Close the flap and return control. Later checks show the same flyer without replaying a reveal.

Needs: mailbox 203, its approach spot, opening flap, folded bakery flyer and a close view readable on a phone. Keep the existing tape. The gloss is inspection text, not a goal, inventory item or new word required by the route. No welcome letter or unseen sender to investigate. Only available after the arrival route gives Eric room number 203. Use the existing advance affordance for the inspection; the player must have time to see the flyer.

## Draft checks and integration limits

Read against GUIDE Writing, VOICE.md, the train review feedback and the dialogue, story-sense, humanizer and cliche-transcendence skills. The repeated discovery defaults to avoid were lost property fetches, mysterious notes, broken machines that all need the same word, every stranger giving Eric food, and a closing quip on every object. This draft uses physical help, a familiar animal, sound and his first piece of post. Eric has one new spoken line and reuses his learned apology. Three discoveries have no spoken dialogue.

Root cold read: cut the sixth television encounter and the mailbox closing quip; reused Eric's existing apology. Claude C-0194 accepted the bench and canteen, strengthened the bicycle payoff, removed the bath peeking and made the audio beat accessible, and corrected the mailbox to the built tape. Those changes are folded in above. Took the optional canteen greeting to repeat Kuro's phrase in a different setting. Exactly five remain, subject to the bicycle's explicit cost/readability cut.

Builder handoff: scene/places hooks are not yet available on shared main. Claude owns their build and the hall route. Codex owns final story text/steps. All encounters are optional before the room transition; leave the room's existing window/boxes/bed remarks alone. No Review item or player-facing plot summary. Builder should return concrete things/spots/hooks and their persistence contract before story integration; do not ship missing-hook no-ops.
