# Character creator (feasibility experiment)

Status (paused 2026-09-29, 6-agent cap): code written, not yet validated.

- Parts library: art/parts/ (copies of the game's Mio and Eric models and textures in src/, Eric's idle and walk clips in anim/, library.json). library.json has no parts yet: the cut hasn't been run.
- tools/creator/recipe.js: loads the sources, puts both on the shared skeleton (Meshy API bone names and axes, each body's own joints, bone axes turned to match each body's rest pose), carries a part from one body to another bone by bone, per-part tint, and builds a character from a recipe. Eric's clips drive every body.
- tools/creator/cut.js + cut.html: cuts each source into hair, head, top, bottom, shoes, hands by strongest bone, height and texture colour. Rules per source go in library.json ("cut": skin, hair, bottom colours, collar, hem). Next step: run `node tools/creator/run.mjs "tools/creator/cut.html?save=1" cut.png`, read the colour stats it prints, set the rules, rerun until the flat-coloured views look right.
- tools/creator/sheet.html: the check sheet (originals vs rebuilds, six mixes, seam close-ups). tools/creator/index.html: the creator page. Neither has been run yet.
- tools/creator/run.mjs: headless runner; takes the browser lock.
- The probe (probe.html) ran: both skeletons load and map (Eric 24 bones; Mio's Mixamo rig maps onto them). Normalised to height 1, their joints are close (hips 0.31 vs 0.34, head 0.53 vs 0.54).

Meshy credits used so far: 0.
