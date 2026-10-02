# Evening discovery integration contract

Work #87, X-0300. Writing and staging: [final draft](evening-discoveries-draft.md). Implemented in `game3d/story/{forecourt,plaza,dorm_court}.js`; the table records the integrated interface.

| Place | Thing/action | Required place hook and phases | Saved story state |
| --- | --- | --- | --- |
| forecourt | `garden_bench`, Sit on the garden bench; same seat id | `gardenCat` with `state: lap` settles Tama on seated Eric's lap; `bench` hops back. Generic `sit` already handles Eric; ordinary movement stands him up. | `evening_bench_seen`: after the first line and hop back, repeat is a quiet sit with Tama at the other end. |
| forecourt | `fallen_bicycle`, Stand the bicycle up | `bicycle` `lift`, `tip`, `second`. Lift the first, tip its neighbour and turn Eric toward it, later lift the second quietly. The thing's target/approach changes to the fallen second bike once tipped. | `evening_bike_tipped`, then `evening_bikes_upright`. The final action disappears. |
| plaza | `canteen_table`, Sit at the canteen table | `canteenChair` `take` frames worker/stacked chairs and puts Eric's hand on the last chair; `stack` stacks both chairs; `leave` returns worker to closing. Worker rig id `canteen_worker`, supports generic bow. | `evening_canteen_helped`: stacked props persist; action disappears. |
| dorm_court | `bath`, label Bath | No public hook. The pin stays off. | None in the public story. |
| dorm_court | `mailboxes`, Check mailbox 203 | `mailbox203` `open`/`close`: open 203, hold the gloss, take the bakery flyer (the close look stays until a tap), then shut the flap. | `dorm_room_known` gates the first look. `found_bakery_flyer` retires the pin. |

Every action requires `going_home`; flags gate encounters, not the route. No new objective, reward notice or mandatory word lesson. The hall builder should set `dorm_room_known` immediately after its arrival goal gives room 203 (or return its existing equivalent flag).

Place/catalog ids, sensible approach points, objects and worker visibility, audio, animations and restoration belong to Claude's builder. Story steps/flags, spoken lines, sound caption and inspection gloss belong to Codex. Keep normal route goals intact. Scene hooks finish their motion before returning and never time a readable line. Completed physical states need restoration after leaving/re-entering, as well as Continue; snapshots must also recover an open inspection or seated dialogue at a checkpoint. Do not rely on story flags alone for intermediate animation poses.

Canteen worker's Japanese phrase hashes to the same overheard clip as Kuro (`oh-1244oau`); give the worker a distinct explicit voice key `evening-canteen-worker` when that clip is available, rather than silently borrowing Kuro's voice. One new Eric line is `ln-1qad83b`; Eric's apology reuses `eric-sumimasen`. Sound requirements and exact spoken text are in `voice-evening-discoveries.json`.

Integration checks: first visit, repeat, leave/re-enter and Continue; morning objects have no evening action; ordinary movement leaves the garden seat; both phone/desktop frames keep props and actors readable; the public bath pin stays off; the public discoveries may be skipped and the day still ends. Existing full-day fast checks do not exercise optional discoveries, so the builder must capture these specific interactions as well.
