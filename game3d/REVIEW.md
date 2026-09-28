# game3d: review log

Each round, a fresh critic agent sees only the reference image(s) and the screenshots, and scores the place 0 to 10 (pass mark 8, scale from notes/VISUAL_QA.md). A separate cold-player agent plays the whole day in a headless browser.

References: train `ref/1-train-arrival.png`, gate `ref/2-security-gate-muted.png` (the palette for all three places), office `ref/3-office.png` for the look only (the floor plan follows the B2 plan on Jørgen's instruction).

## Visual critics

| Round | Train | Gate | Office | Shots |
|---|---|---|---|---|
| 1 | 5 | 5 | 4 | shots/round-1 |
| 2 | 6 | 6 | 6 | shots/round-2 |
| 3 | 6 | 7 | 6 | shots/round-3 |
| 4 | 7 | 7 | 6 | shots/round-4 |
| 5 | 7 | 7 | 6 | shots/round-5 |

None has reached the pass mark of 8 yet.

### Round 1 (2026-09-28)

- Train 5: camera too top-down for the critic (kept: Jørgen asked for "a little more top down" in side/train), warm tan platform, saturated tactile strips, markers covering faces, a black silhouette by the door.
- Gate 5: camera too high and far, flat even light, streaks on one side only, tiny wall lamps with no pools, glass barrier invisible, flat orange windows, big guard cap.
- Office 4: flat bright light, beige floor and pale walls, no light pools or gloss, empty copy room, kitchenette and corridor, cloth-covered monitors reading as pillows, rack backs as black boxes.

Fixed after round 1: muted slate walls with skirting, cooler floors with gloss, warm lamp pools (point lights at every wall lamp and office fixture), gradient windows, visible tinted glass, lower cameras (50 to 51 degrees), people and Eric with smaller heads (2.8 to 3 heads), markers above heads and shown only near the player, cool grey platform and ochre tactile strips, draped monitor covers, racks facing the camera, more dressing in the corridor and bottom rooms, commuters and background people in the lobby, visible ceiling fixtures removed (Jørgen), the office period set to morning on arrival.

### Round 2
- Train 6: dead band of near platform, near-bench passengers read as heads, black silhouette by the right door, artifacts at the near wall (door leaves poking through the cut wall).
- Gate 6: camera too steep, phone bottom 30% empty, helmet-like heads, palette too saturated navy, no contact shadows.
- Office 6: dark navy walls, beige floor, phone band, sparse bottom row, woman with buns (Mio, Meshy) reads as a lump.
Fixed: slate walls, cooler floors, desaturated benches, lower camera and phone lead, contact shadows, hidden door leaves, more props, rougher character material.

### Round 3
- Train 6, gate 7 (strongest), office 6. Clone-like commuters, bollards that look like people, the island and bottom rooms thin.
Fixed: varied commuters, low square bollards, bigger cat, a meeting table, tighter office camera, a fill light by the far door.

### Round 4
- Train 7, gate 7, office 6. Chairs floating off desks, a stray paper stack, lifts proud of the wall, the coffee machine cropped.
Fixed: chairs snug, lift surrounds, coffee machine moved in. Jørgen: "the train has no door", so the platform-side doors got full-height leaves, frames, lamps (amber shut, green open), a yellow edge and threshold, and a dark gap when open.

### Round 5
- Train 7: the dark standing passenger by the far door, navy bags on the near bench, empty platform bands.
- Gate 7: a commuter half hidden behind the front glass, the cat reads as a smear, phone framing.
- Office 6: bottom rooms and corridor still thin, no floor light pools, Mio's buns read as a boulder from above (her model is not changed on purpose), floor slightly mauve.
Fixed after round 5: office floor cooler, filing row on the office's left wall, corridor bench, chatting pair moved off the plant, phone gate camera leads further toward the gate, clearer door panels.

Not changed on purpose: the train's passengers and car (from side/train, recoloured only), Mio's shape (Meshy, colour only), the steep train camera (Jørgen's request).

## Production pass, world (from 2026-09-28)

Fresh critic per place each round, shown only the references and the round's sheets (desktop 1366x860 and phone 390x844 side by side, rendered at the high tier with js/post.js). Pass mark 8.

| Round | Train and platform | Lobby | Office | Lift | Sheets |
|---|---|---|---|---|---|
| P1 | 6 | 6.5 | 6 | (in the office critique: "reads well") | shots/round-6 |

### P1
- Done: js/post.js (grade per place, AO, bloom, tilt-shift, vignette; tiers low, medium, high), js/places/life.js (floor light pools, dust in light, kettle steam, screens that flicker and scroll, clock hands on the game clock), office dressing (carpet under the island, printer, lift car behind the doors, corridor mats, recycling row, AED, fountain, copy-room reams, shredder, trolley, kitchen rug and stools, toilet dryers), platform boarding marks, timetable, vending pair, bins, English sub-lines on the untaught signs, Eric's name card. NPC walks go over the walk grid (js/places/route.js); lobby commuters enter only through the open doorway.
- Office 6: bottom rooms blown out by the pools, toilets half empty, lower third of the office bare, machine room flat black, corridor's right half thin, grounding weak.
- Lobby 6.5: the barrier glass doesn't read, the entrance glass reads as white slabs, the left lift's open leaves slide over the poster, sun shafts have no visible source, a grey box by the counter, phone framing cuts the guard.
- Train 6: nothing under the car at sea (beam, pylons), sea noise flat and saturated, platforms still thin, doors don't read as open, platform edges unfinished.

## Markers (after Jørgen: "small, awkwardly placed, not well designed")

Fresh critic, before → after: readability 3 → 7, placement 4 → 6, design and fit 4 → 7, phone 3 → 3 (a tag-width bug, fixed afterwards with the rest of its notes). Crops: shots/round-5/markers-before-after-desktop.png and -phone.png.

## Cold player (one fresh agent, mid-N5 profile, desktop twice and phone to B2)

Fun 6/10, clarity 4/10, want to keep playing 6/10. Liked: the writing, the train, the gate routes, the B2 cast. The amount of Japanese felt right; the commands felt useful, the phrases a bit like passwords.
Bugs found and fixed: the title named the wrong character; a tap that revealed reply chips also picked one; Say targeted the nearest object over the person; overheard lines read like a broken font (now softer and more blurred); the phone goal pill overlapped the clock; a crash on arriving at B2 (moriBlob); the ending not responding while Eric was seated.
Open, story side: Mio should walk out onto the platform where the text says she hops out; her label varies between files.
