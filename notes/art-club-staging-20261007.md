# Art table physical staging — work in progress

X-0679, #300. Isolated physical implementation based on b8187146; intended for the continuing-week integration, not separate shipping.

The commons uses its two existing north table chairs. Both approach points connect to the real door on the actual nav grid. Mori sits at (-0.4,-3.25), the protagonist at (0.5,-3.25), facing the table. The camera looks north across the south table edge; paper, photograph and teapot are in front of the seated actors. The view widens with phone aspect so both faces and hands fit. Kitchen and drying rack are background; the door is behind the camera. Existing room lighting supplies the shot.

`P.artClub.ready()` is false without an explicitly approved, loaded photograph. `setPhotograph(texture,{approved:true})` is the integration API; no production call or photo selection is installed here. `begin` also rejects an unavailable photograph. Root owns story entry availability and calendar placement. The browser harness injects candidate photo A as a conspicuously labelled **unapproved test fixture**, and does not change asset registries.

Physical states follow the current root `story/ongoing/art.js` contract: begin, photo, tracePhoto, firstPage, offerPage, prepareTea, takeTea, pour, pencilBeside, drawSlope, practice, showProgress, drawTogether, free. Before the completed tea turn, practice leaves Mori supplying materials; player drawing does not silently advance his milestone. The root story owns all flags, bonds and visit dates.

The photo is gripped at an edge and the teapot at its handle. Held props remain on the rig's actual wrist through dialogue pauses and serialized scene state. The scoped arm overlay is removed on release/cancel/leave, and pending actions cannot reapply it. The original actor transforms and camera return on release. Papers preserve their current drawing within the cached place/save; the completed drawing state is reconstructed on return through the authored `showProgress` hook.

Validation: all 392 CPU tests and the full CPU gate pass, including six focused readiness/nav/save/cancellation/drawing tests. Actual desktop Eric and phone Carina hook sequences pass, including held-prop place snapshot/restore and leave during drawing. Final real dialogue-area frames are `game3d/shots/art-club-stage/1791328123604-1366/` and `1791328110653-390/` (`photo-dialogue.png`, `firstPage-dialogue.png`). Root independently accepted source and both relevant-object close-ups. All 168 evidence files, including early framing/grip failures, are preserved in main. These standalone tests do not claim integrated recurring-story, milestone, title Continue or calendar acceptance; that remains part of the shared feature integration.

The `group` state restores the two-person shot after photo/page inspection; the root narrative includes it before the choices and before the paper-offer reply. No voice lines or assets are changed by this transfer.
