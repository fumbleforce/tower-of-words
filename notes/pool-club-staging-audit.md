# Pool and club staging audit — 2026-10-06

Scope: public runtime and approved public asset catalogue, issue #296, following [the pool feedback](feedback-game/2026-10-06_214535/text.md) and [evening lighting feedback](feedback-game/2026-10-06_214744/text.md). Current pool geometry and behaviour belong in [places.md](../docs/game/places.md#pool-deck-pool).

| Club | Existing physical setting | Remaining requirement |
|---|---|---|
| Swimming | Outdoor pool; this change adds the pavilion's locker/shower route and floodlights. | Approved swimwear variants for Kuro, Emi and Eric/Carina; current meshes have baked everyday clothing. Winter gym changing rooms remain closed shells. |
| Tennis | Real courts, equipment and staged play. | Sports outfits and a usable changing route are still absent. |
| Art | Built dorm common-room interior. | Everyday clothes fit this activity; no pool-style changing prerequisite. |
| Karaoke | Built reception and booth interiors. | Everyday clothes fit this activity; no pool-style changing prerequisite. |

The public character loader currently selects approved fixed-outfit Meshy models and their movement clips. The public catalogue has no approved swimming variants. Outfit work needs variants derived from each approved base, preserving face, proportions and rig compatibility; the place should select them only after the visible locker transition and restore everyday clothing on exit/Continue. Appropriate pool staff/member clothing also needs selection. Do not substitute a tint or hide the mismatch under the water. This audit does not mark that dependency complete.

## Selected swimwear follow-up — 2026-10-07

Jørgen selected Kuro B, Emi, Eric and Carina from pool-swimwear-1. The bounded public pool integration now uses those appearances at the existing locker/session transitions, with saved outfit state, corrected seated poses and motion-only ankle/grounding repairs. This supersedes the missing-selected-cast-outfits entry above; it does not change the attendant/member casting or winter changing-room scope. Runtime and visual acceptance evidence is recorded separately with the integration's retained attempts.
