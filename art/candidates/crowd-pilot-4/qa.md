# Crowd round 4 validation

Four close eye-shape variants were rendered with local RDBT Anima on 2026-10-06. No game crowd model is installed by this review.

Independent reviewer `/root/model_review` inspected the actual textured models from front and both 0.6-radian turns beside Kenji, Kuro, Aoi and Emi. Verdict: 8/10 for candidate presentation; no source or visual blocker. The shapes read deliberately anime, without the previous glass-like iris rings. The reviewer independently compared every GLB/idle file against round 3 and every texture pixel outside the saved UV support mask. Both preservation checks passed for all four candidates.

Root separately inspected front and left-angle comparisons and accepted candidate presentation. Limitations remain explicit: the calm/open distinction is modest, especially on the male face, and his decorative outer lash wings may not be the preferred treatment. These scores are internal presentation checks, not user approval of the assets.

`capture.mjs`: PASS, 24 actual-model captures (four candidate variants plus four approved cast models, each front/left/right). No browser page errors.

`check-motion.mjs`: PASS on hardware WebGL, desktop 1366×860 and phone 390×844. All four candidates were checked through 24 ten-second state runs across treadmill/loop movement and idle/walk/run/idle/sit/walk transitions. Leg-bone poses continued changing in each sampled interval. Each viewport additionally walked for eight seconds of real wall-clock time without stopping. Motion results and original frames are retained under `art/parts/crowd-pilot-4/motion/`. This verifies sustained motion, not a performance benchmark.

The eye texture projection preserved 3,970,225 non-eye texels for each male variant and 3,907,944 for each female variant (outside-mask maximum channel delta 0). Each variant's source/clip hashes are recorded in its `settings.json`.
