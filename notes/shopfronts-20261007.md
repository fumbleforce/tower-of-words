# Arcade frontages, 7 October 2026

Work: #303, parent environment pass #298, claim X-0680.

The normal phone arcade view remains a corridor of repeated opaque panes. The desktop follow view exposes their lack of depth. Earlier upper-floor, drainage and crane-cabinet detail did not address these ground-floor fronts.

## Staging

Three existing north-row shops: bicycles, konbini, bakery. Keep the existing central doors, approach points and preparation/closed cards. Cut actual shallow bays beside them; fit goods to shelves and cases. Goods face the arcade, with low displays visible from above. The rear walls and upper storeys stay opaque. Each display has a support, a back and a fitted frame; nothing floats behind a painted pane.

Desktop: player stands on the real arcade walk facing each frontage, using the production follow camera. Door, both side displays and player scale must read together. Phone: use the unchanged production overview while approaching each doorway, then the central arcade walking view. Do not substitute a beauty camera. The roof remains governed by the existing cutaway.

Daylight and evening use the existing place lighting. No baked signs pretending to be interiors, no new shop activity or opening hours. The central pedestrian band and routes to all existing doors stay clear. New protruding cases get matching navigation blockers.

## Verification

Four geometry tests check actual recess ray hits, fitted goods, exact cart/blocker bounds, door/pole clearance and the existing queue. Native desktop Eric follow and phone Carina overview checks walk to and click all three doors, read the actual closed card and dismiss it. The store queue occupies the exact door spot on unchanged main as well as this branch; its native interaction passes from the reachable position, about 0.60 m short of that occupied point.

Round 1 exposed the missing phone visibility. Round 2 added low wheeled cases, but the drink case intersected the existing queue. Round 3 moved/narrowed it to the far side of the bins; the geometry test caught a remaining bottle-grid width error. Round 4 contains the corrected cases and complete native interaction checks. Earlier captures and failures remain in game3d/shots/codex-shop-fronts.

Independent model_review source and six-view critique: no blocking finding. Desktop shows the tall recesses; phone shows the low bread/drink cases and bicycle rack, with most tall display detail still behind the roof. This is a bounded frontage improvement, not completed shop interiors or island-wide environment acceptance.

Full CPU passed. Day-two Eric desktop and Carina phone routes both passed in 62 s, with zero overlaps or spins and no check overrides. Native phone frontage sampling remained at a 16.7 ms median; draw calls increased from 75 to about 80–82 in those views. These shared-load captures are not an isolated timing benchmark. No new generated images, models, voices, story flags or opening schedules.
