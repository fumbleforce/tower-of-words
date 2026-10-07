# Independent canteen proposal for #312

Written before reading the root proposal, 2026-10-07. Source baseline: current main, including lived-in room activities and the continuing calendar. This is a proposed build, not a claim that meals or diner dialogue already work.

## What is built

`game3d/js/scenes/canteen/plan.js` has eight tables, each with six side chairs, and two usable end seats beside the main aisle. The footprint, door, counter, water and tray-return positions already form a coherent canteen. `furniture.js` provides hot wells, a cooker, trays, bowls, cups and a cashier terminal. `room.js` has kitchen hatch, back windows and reversible evening lighting. Preserve the real circulation and useful current objects.

`places/canteen.js` owns four residents: the terrace worker and three stable generic diners at (-9.35,-4.98), (-4.6,-.92), and (8.05,-4.98). Only the worker is registered in `people`/`things`. The diners sit but have no Talk or held-item activities. Worker visibility is currently every period except evening, with no meal service contract. She holds a real cloth and wipes, but the `utensils` action only reaches and waits. Do not describe that as sorting actual objects.

`story/canteen.js` offers directions to water/tray return and a quieter-time closing topic. It cannot sell or serve food; the water dispenser is not usable. Two seat nodes only sit. `ongoing/canteen.js` reuses that source, so this gap persists beyond day five. Existing day-one office lunch and exterior chair-help scenes are separate and must stay intact. `weeklyPlan()` currently schedules named colleagues elsewhere at lunch; do not silently duplicate or relocate them into this room.

## Proposed playable purpose

Make the room a recurring inexpensive sit-down meal stop where eating and other people's ordinary breaks happen together. A player can inspect the actual service food, buy a tray, choose a usable table, eat while speaking to a neighbour, get water, and return the tray. No compulsory language drill, meal buffs, invented ticket, new timbre or main-story obligation.

Keep the existing worker and all three diners. Promote the already-visible diners to stable local speaker IDs using existing approved generic body and voice references, subject to root's casting check. Give every stationary visible diner ordinary Talk. This supplies social density without adding population or borrowing a main character from another scene.

## Exact bounded physical pass

1. Service rail stays at COUNTER (-2.7,-7.05), worker at (1.8,-7.7), customer approach (1.8,-5.85). Split the existing counter into legible tray pickup, two pictured dishes and payment/handoff stations within its current footprint. Fit a modest menu to the actual hood/hatch; show price and recognizable dish silhouettes, not a giant floating translation panel. Add glass/rail supports, bowl stacks, a ladle and actual tray ownership. Do not put a new queue down the central door aisle.
2. Start with two visibly distinct meals: curry rice and a rice/vegetable set. Proposed prices ¥420/¥480, explicitly new design values to confirm and define once in a canonical meal table. Use the existing tray, rice bowl, vegetables and cup kit; add only the curry plate and serving utensil shapes. No generated image assets required.
3. Add a reachable player seat at one existing diner table, with a real nav-free side approach, in addition to the current west/east end chairs. This lets an actual shared meal occur beside a diner rather than talking from the middle of the aisle. Do not simply expose all48 decorative chairs without proving access.
4. Water at (9.5,-5.35) becomes a free cup action: take an actual cup, hold beneath the tap, dispense, sip and put down. A cup is room crockery, not a farmable Bag item.
5. Tray return stays at (-10.4,-1.3). Show the player placing the used tray on an available shelf and separating the utensil. The worker's existing request then describes something the player can actually do. Preserve the exterior chair-help acknowledgement.
6. Dress around these uses: varied occupied place settings, a folded personal lunch cloth, small menu stand, supported bag hook, return-rack wheels and drain mat. Remove the identical static food trays from surfaces owned by animated meals. Keep broad room views coherent and avoid another collection of oversized signs.

## People and conversation shape

Avoid three defaults: grateful tutorial diner, mysterious quest-giver, and food critic who exists to teach vocabulary. Each person has their own break; all can decline prolonged chat without blocking the player.

- Existing shirt diner: halfway through a meal, wants the table's condiment rather than a conversation. Opening physically makes room for the player's tray; first topic is whether the player chose the curry. A later work topic concerns eating before a noisy afternoon shift, not an invented assignment for the player. A brief mouth-full/busy response returns to eating. Show spoon and bowl movement; no invisible meal or mime with empty hands.
- Existing cardigan diner: has brought a small folded cloth and a personal container, but buys a side dish here. First topic arises when she moves the cloth clear of the shared place setting. Her preference is practical: the canteen saves her cooking another dish after work. Do not make her a motherly guide or assume her family. Repeat acknowledges only a real prior conversation. Container opening/closing and a glance at the player's tray supply comprehension.
- Existing polo diner: finished eating, lingering over water. He prefers this corner because the terrace gets windy. He can point through a real front/window view or toward the actual terrace exit; do not claim an unseen harbour or mountain. A return topic responds to whether the player has helped outside only if that flag is real. He is willing to talk but does not provide an all-island exposition menu.

These are scene functions, not approved dialogue. Draft each first exchange, one second topic and a short neutral repeat/busy response for cold read before voices. Keep topics distinct rather than filling a quota of identical menus. A full meal need not play every conversation; order/eat alone is valid. No automatic new bond levels for generic residents.

## Language and persistence

Reuse already-known `sumimasen` to call the worker and `tabetai` when ordering; unknown branches point at visible food and use short English from the protagonist. Reuse `oishii` as an optional genuine reaction after a completed bite. A diner may say the existing phrase in Japanese before it is known; normal heard-text/archive rules apply, and no click silently teaches it. Do not teach new dish words solely to justify the menu. Japanese staff/diners stay Japanese; meaning comes from food, gestures and consequences, with no convenient translation subtitles.

Use neutral same-visit repeats. Store actual topic/meal history, not a generic 'welcome back today' line that can fire on the second click. The room and dining seats stay open in the evening, consistent with the existing terrace closure. Propose staffed hot-meal service during lunch only for the first bounded slice; morning/afternoon retain present worker and existing water/closing conversations. One canonical hours function drives menu availability, visible covered food and map/place descriptions. Root should confirm this service policy before it becomes a fact.

## Existing systems to reuse, with boundaries

- `bakery/trade.js` demonstrates atomic debit + acquired-item receipt. Reuse its transaction pattern, not its bread checkout dialogue or exact prepared/eat API without audit.
- Ferry terminal's separately prepared Runner node is the relevant replay pattern: a consumed checkpoint must not mint another selection/receipt. Apply the same actual Runner save-boundary test with enough money for two meals.
- Prefer one outstanding dine-in meal receipt with explicit selected/paid/carried/on-table/eaten/returned phases. Selection occurs outside the replayed action node. A completed pay boundary preserves the meal entitlement; cancellation never silently charges again or destroys a paid meal. Re-entry/Continue reconstructs the real tray at its saved place or offers its existing uncollected order. No new receipt from automatic replay.
- Use existing `poolHandling`/actionShot/action cancellation helpers for worker and player contact. Carrying a tray requires both actual hand grips and collision-safe walking. Use the existing izakaya utensil/cup shapes and physical eating approach, not an unconnected floating tray tween.
- Extend `canteenSave` to include local tray/meal/action ownership in addition to seated player and camera. On every exit/cancel/private-unrelated-setting change, restore owned pose/camera and leave other public interactions untouched. Ordinary Bag Read remains the shared handler; no duplicate Bag listener.

## Review and proof before calling this finished

Source checks: payment with insufficient funds; cancel before payment; paid interrupted handoff; consumed-node Continue with two affordable orders; one deliberate subsequent order; correct return of one tray; no private sources; day1 and ongoing loaders; daylight/closure boundaries; resident identities and ordinary Talk all present without duplicate named cast.

Native both protagonists/screens: ordinary door entry, buy and handoff, actual two-hand tray walk to the neighbour seat, grounded sitting with tray on table, utensil/cup-to-mouth contact, full topic and Leave paths, real Quick-save Continue at payment/carry/seated/eat checkpoints, exit/re-entry during an action, return tray and water. Sustained movement must preserve current overlap/gait thresholds. Capture actual whole-room and seated two-person dialogue frames, not only isolated closeups. Keep earlier stills and get independent source, dialogue and visual review.

Suggested ownership: existing canteen scene/plan/furniture and place/state; new local meal/resident action helpers; source canteen story and its inherited loader contracts; canonical meal/hours data; narrow inventory/voice/speaker/marker registrations if needed; focused tests/QA/facts/Showcase. Avoid weeklyPlan edits in this slice. No implementation has started.
