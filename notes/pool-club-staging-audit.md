# Pool and club staging audit — 2026-10-06

Scope: public runtime and approved public asset catalogue, issue #296, following [the pool feedback](feedback-game/2026-10-06_214535/text.md) and [evening lighting feedback](feedback-game/2026-10-06_214744/text.md). Current pool geometry and behaviour belong in [places.md](../docs/game/places.md#pool-deck-pool).

| Club | Existing physical setting | Remaining requirement |
|---|---|---|
| Swimming | Outdoor pool; this change adds the pavilion's locker/shower route and floodlights. | Approved swimwear variants for Kuro, Emi and Eric/Carina; current meshes have baked everyday clothing. Winter gym changing rooms remain closed shells. |
| Tennis | Real courts, equipment and staged play. | Sports outfits and a usable changing route are still absent. |
| Art | Built dorm common-room interior. | Everyday clothes fit this activity; no pool-style changing prerequisite. |
| Karaoke | Built reception and booth interiors. | Everyday clothes fit this activity; no pool-style changing prerequisite. |

The public character loader currently selects approved fixed-outfit Meshy models and their movement clips. The public catalogue has no approved swimming variants. Outfit work needs variants derived from each approved base, preserving face, proportions and rig compatibility; the place should select them only after the visible locker transition and restore everyday clothing on exit/Continue. Appropriate pool staff/member clothing also needs selection. Do not substitute a tint or hide the mismatch under the water. This audit does not mark that dependency complete.
