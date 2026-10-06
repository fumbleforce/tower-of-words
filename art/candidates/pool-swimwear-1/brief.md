# Pool swimwear candidates

Candidate work only; current game outfits remain installed. Addresses #296 / #294 and the reported office clothing in the pool.

## Scope and sources

Approved source edits: Kuro `art/parts/kuro-meshy-orig-3/pics/e5.png`; Emi `art/parts/emi-meshy-1/pics/c3.png`. Preserve face, hair, head/body proportions and palette. Replace office outfit and shoes with ordinary opaque sport swimwear and bare feet. No body reshaping or accessory additions.

## Shot staging

Each isolated full-body character retains the source camera, three-quarter orientation, neutral separated arms, face direction, white background, soft studio light and matte faceted style. Nothing stands behind the camera or in front of the body. No text, props or scenery. Kuro retains black bun; Emi retains auburn bob. Sports garments: Kuro navy one-piece with broad straps; Emi muted teal one-piece with broad straps.

## Production gates and budget

Inspect reference edit before Meshy. Smart Topology meshy-t2,1050 polygons,A pose,untextured; inspect shape, unwrap face as one island at high texel density, then actual Meshy texture preserving UV, then native rig. Evaluate front/side proportion and face continuity, positive knee flexion, idle/walk/run/sit and actual pool motion. No candidate is approved merely because a task succeeds.

Current balance85 credits. Current official API pricing: T2 shape5, texture10, rig5 (20 per character), optional extra animation3. First Kuro/Emi pair40; retain45 for both protagonists or required repairs. No automatic retries or purchases.

Sources checked 2026-10-06: https://docs.meshy.ai/en/api/pricing and https://docs.meshy.ai/en/api/image-to-3d. Shape texture and rig steps remain separate so rejected shapes do not spend downstream credits.

## First reference edits

Built-in image_gen, 2026-10-06. Saved unmodified outputs: `pics/kuro-a.png` and `pics/emi-a.png`. Visual inspection: source face/hair/expression, isolated full-body orientation and matte faceting retained; office clothes and shoes replaced as intended. These are references for candidate generation, not user-approved models.

Exact edit prompt (Kuro; Emi replaces the listed differing phrases):

> Edit the attached approved stylized adult office-worker character reference for an ordinary swimming-club game outfit. Change only clothing and shoes: replace the black business suit with a plain opaque navy athletic one-piece swimsuit with broad shoulder straps and conventional sport leg openings, and remove shoes so her simple low-poly feet are bare. Preserve her exact face, eyes, expression, black hair and bun, head size, body proportions, posture, orientation, camera framing, white background, soft lighting and flat matte low-poly material. Do not redesign or exaggerate her body. Full body remains visible with the same separated arms. No cap, goggles, jewelry, props, text, labels or additional subjects. This is an outfit-only edit of this same character for a sports model reference.

Emi differences: “black business suit and cream shirt”; “muted teal” instead of navy; “brown eyes, friendly expression, auburn bob hairstyle” instead of eyes/expression/black hair and bun.

## Completed round, 2026-10-07

The round used exactly 85 Meshy credits: five shapes (25), four textures (40), four rigs (20). Balance is zero. The first Kuro shape grew a long ponytail and was rejected before further spending. The deliberate second shape keeps the bun. No automatic retry, purchase or downstream request was made on the rejected shape. Exact safe request records and source hashes are in `reviews/pool-swimwear-1/credits.json`; signed response URLs stay local.

Eric's outfit reference was edited from the actual approved `art/approved/mc/meshy/preview.png`, replacing the office outfit with opaque navy mid-thigh swim shorts and bare feet while preserving face, blue eyes, hair, stubble and proportions. Carina's edit used current corrected model renders `art/parts/carina-meshy-1/r2/close/after-grey/body/y45.png` and `y0.png`: a burgundy broad-strap sports one-piece, bare feet, same corrected head size, two-tone hair and teal eyes. These are descriptive prompt records; the exact two built-in edit prompts were not retained in this folder. Their untouched reference images and hashes remain available. Neither reference is a user-approved new outfit.

Each untextured shape used the established face-island UV unwrap at higher face density. Meshy's retexture supplied the actual untouched colour pixels; no eye painting, projection or colour repair followed. Native walking/running GLBs are byte-for-byte copies of Meshy's outputs. Carina's equal-height front/side comparison was checked against the currently installed corrected model before texturing.

## Animation attempts and limits

The initial generic idle/sit retargets were rejected after actual native viewer stills: backward lean and unsuitable chair poses. The approved relaxed-idle exporter now supports explicit candidate IDs and a separate output directory without changing its production defaults. Eric additionally needed the explicit candidate-only arm rest correction: preserving the old body's arm tracks raised his hands into his head. His failed clip remains available in the viewer history.

Selecting the old chair loop's most upright frame still left unsuitable body/leg poses. A second attempt to aim joints from the exported idle also failed because its baked bone frame positions are not an anatomical bind pose. The current review seat is instead a static pose on the native bind rig, with thighs forward, shins down and forearms forward. It does not modify mesh vertices, weights, joint lengths or the original native animations. This static review pose is not a shipped seated animation or proof of pool interaction contact.

All saved failed clips and views remain linked in the review history. Earlier stills overwritten during iteration were recreated from their exact retained clips and are labelled accordingly. The review allows clothing/identity to be judged separately from these animation changes. No model, outfit resolver, changing-room behavior or swimming clip has been installed. Actual pool replacement/contact and full event QA remain follow-up work after the user chooses candidates.

## Bounded review and checks

Independent clothing review found all four recognisable and the garments coherent. Specific differences: Kuro's more pointed central fringe; Eric's rounder eyes and broader jaw/stubble; Carina's straighter front hair edge and broad feet. Emi was the closest facial match. These are visible candidate caveats, not concealed fixes.

The actual native viewer was checked at 1366×860 and 390×844. Final motion check: 24 ten-second state sequences across treadmill/loop modes, all four rigs, plus eight seconds of real-time walking at each size. Walk and run remain active after repeated idle/sit transitions; this functional test does not establish aesthetic quality. All QA used fresh storage, private mode off, and a public-only request guard.

Final independent seated review: all four trunks/heads are now upright, with Emi the cleanest. Eric still shows a triangular calf/ankle skin flap and flattened far foot. Carina has a smaller similar calf flap and broad feet. These remain visible rig defects; neither seated rig is production-ready. The static pose improves presentation but is not grounds to approve the underlying deformation. Clothing/identity selection may proceed separately.
