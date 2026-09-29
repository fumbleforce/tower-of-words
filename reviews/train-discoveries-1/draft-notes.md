# Train encounters: draft notes

C-0130, corrected by C-0133: the people are reachable, but their replies are dull. Six complete optional encounters are proposed. Nothing is implemented or voiced. Claude cold-read comes before the review opens.

Story-sense diagnosis: the carriage has people but too little life outside the main conversation. Dialogue diagnosis: the optional lines mostly do one job, acknowledge the click. Give the person a concern already under way, then let Eric briefly enter it.

Defaults avoided: every passenger teaching vocabulary, a mysterious stranger, a corporate history speech, universal sarcasm, a future quest hidden in every prop, and everyone knowing Eric's job before he speaks. The guitarist is occupied with his own practice; the player can see the footballer's pride without being invited to a new minigame. Short speech and gestures carry the encounters.

The first four current cards include both existing paths: a shared seat-goal flag makes only the first passenger give the seat hint; the others already use their ordinary lines. Each proposed encounter works on that first click and retains the seat hint when needed. No extra “talk again” step. Generic greetings, Mio and Tama remain unchanged.

Japanese readings and English meanings are shown in the review. setting.md says English is always available, overriding older learning restrictions. The current game's overheard text can still hide these meanings; the implementation needs to resolve that presentation before these encounters can count as discoverable content. Eric's replies must follow recognisable words or gestures, rather than assume fluent comprehension. No forced word lesson is proposed.

## Staging after a pick

### train-aoi

Keep the phone call and seated position. Add the hand-over-phone gesture and small bow. Aoi recognises “IT” and “B2”; Eric responds to her apology and face, not to Japanese he has not learned. The viewer supplies Japanese readings and English meanings; implementation must preserve the setting.md requirement that English is available.

### train-bun

Show two small wrapped cakes and stage the offer/acceptance. This is a tiny shared snack, not an inventory reward or food system. The station means the mainland station she has just come from. Do not attach an extra choice or fetch task.

### train-youth

The phone image must actually show him, the pitch and the readable score. Proposes an informal company football match yesterday, not a new event to attend or a sports minigame. His department is IT outside the already-established B2 team; do not add him to that team. Eric sees the English team label and the score.

### train-music

Stage the headphone lift and a short recognisable guitar practice loop; the phone shows an audio recording, not a streaming service. No new music lesson, band storyline or invitation. Audio is a candidate after the passage is picked, not generated in this review.

### train-reader

Keep the existing book title, supply a readable close view of the two different interfaces and Amakawa printout. This is an IT support concern in the existing old-systems setting; no new support ticket. Eric can read the product and company names without understanding the full Japanese sentence.

### train-hamada

Keep Hamada asleep for the existing arrival/rescue beat. Stage the phone buzz, hand movement and half-awake nod; do not display an invented current time or advance the clock. No extra wake-up branch.

## Scenery audit

The existing six scenery nodes are disabled through marker filtering. This is separate from the passenger-content complaint and is not part of this proposed implementation. The stander was deliberately removed, so his unused nodes stay unused. No scenery replacement or marker work is proposed here.
