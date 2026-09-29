# dorm-b: every Claude attempt

These planning scenes use the game’s own 3D modules. The route is about 56 game units (85 m), roughly 37 seconds of walking. Eric’s room faces block B’s concrete wall, 2 m away. The route is not integrated into the game.

[Back to the review](../../bible/#review/dorm-route-1) · [Full brief](../../art/candidates/dorm-route-claude/brief.md) · [Original attempt manifest](../../art/candidates/dorm-route-claude/attempts.json)

## Method and settings

three.js diorama built from game3d's own modules (props.js, look/ surface patterns and soft bake, post.js grade, RoomCam, Eric's Meshy model). Not an image model. scene/diorama.js, shots via shoot.mjs.

No image-generation model or prompt was used. The scene source contains the geometry, lights, camera framing, deterministic prop seeds and colour grade. The capture script uses Playwright, with device scale factor 2 by default; final renders are 2x according to the attempt manifest. The exterior camera uses elevation 56° and field of view 24°; the dorm view turns 0.45 radians west. The room camera uses a 58° field of view at height 1.55 units. The layout camera is orthographic with north up. Exterior time is about 18:10; the layout uses daylight for legibility. Rendering uses quality tier 2, procedural surfaces and soft baked lighting.

[Scene source and full render settings](../../art/candidates/dorm-route-claude/scene/diorama.js) · [Scene viewer](../../art/candidates/dorm-route-claude/scene/index.html?shot=route) · [Capture script](../../art/candidates/dorm-route-claude/shoot.mjs) · [Layout label script](../../art/candidates/dorm-route-claude/label.py)

The manifest records the changes between attempts. Earlier source snapshots and per-attempt command lines were not supplied, so the current source does not reproduce every rejected render exactly. All 25 saved renders follow in their original order.

## Shot staging

### route/walk

Beat: Eric walks home after work, day 1, about 18:10, blue hour. Camera: the game's play camera, elevation 56 degrees, facing north, fov 24; route frames the whole walk, walk is the game's zoom on the promenade. In front: shop fronts facing south, the promenade, the rail and sea at the bottom. Behind the camera: open sea. Light: cool sky light, the last warm light low from the west, shop and lamp light. Checks: fronts face the camera, no cars, every lamp on the ground, Eric on the path.

### dorm

Same camera swung 0.45 rad west so the entrance on block A's west face shows. In front: courtyard, dorm door, coin laundry and sento on the promenade, izakaya and bike shelter.

### room

Camera inside the room at the door corner, 1.55 units up, 58 degree lens, looking at the window. No cutaway: the walls behind the camera are simply out of view. Eric stands by the bed facing the window (his back to us). Through the window: block B's concrete wall, 1.3 units (2 m) away, with form tie holes. Light: the ceiling lamp, evening.

### layout

Orthographic, straight down, north up, daylight for legibility; labels and the route drawn by label.py from the plan's own coordinates.

## 01: attempts/01-route.png

![attempts/01-route.png](../../art/candidates/dorm-route-claude/attempts/01-route.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/01-route.png)

First build, walk through the covered lane. Rejected: the south row hides the lane, izakaya shows its back, too dark and purple, bottom third empty.

## 02: attempts/02-route.png

![attempts/02-route.png](../../art/candidates/dorm-route-claude/attempts/02-route.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/02-route.png)

South row one storey, izakaya turned to face south, brighter sky light, game elevation 56. Lane still mostly hidden; sea covered by the ground slab.

## 03: attempts/03-route.png

![attempts/03-route.png](../../art/candidates/dorm-route-claude/attempts/03-route.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/03-route.png)

Lane widened to 4.2 units, ground slab stops at the seawall, roof clutter added.

## 04: attempts/04-walk.png

![attempts/04-walk.png](../../art/candidates/dorm-route-claude/attempts/04-walk.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/04-walk.png)

Game zoom on the lane: nearly all roofs. This is why the walk moved to the promenade.

## 05: attempts/04-dorm.png

![attempts/04-dorm.png](../../art/candidates/dorm-route-claude/attempts/04-dorm.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/04-dorm.png)

First dorm view (old layout, fronts facing west).

## 06: attempts/04-court.png

![attempts/04-court.png](../../art/candidates/dorm-route-claude/attempts/04-court.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/04-court.png)

Looking down into the 2 m court. Rejected: reads as roofs, dropped.

## 07: attempts/04-room.png

![attempts/04-room.png](../../art/candidates/dorm-route-claude/attempts/04-room.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/04-room.png)

First room view (old lamp and box positions).

## 08: attempts/04-layout.png

![attempts/04-layout.png](../../art/candidates/dorm-route-claude/attempts/04-layout.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/04-layout.png)

First top-down.

## 09: attempts/05-route.png

![attempts/05-route.png](../../art/candidates/dorm-route-claude/attempts/05-route.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/05-route.png)

Walk moved to the promenade; south row has seaward fronts; laundry and sento face the promenade; beach and park strip added.

## 10: attempts/05-walk.png

![attempts/05-walk.png](../../art/candidates/dorm-route-claude/attempts/05-walk.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/05-walk.png)

Game zoom on the promenade. Konbini front blown out; paving read as marble.

## 11: attempts/06-walk.png

![attempts/06-walk.png](../../art/candidates/dorm-route-claude/attempts/06-walk.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/06-walk.png)

Konbini glow lowered, promenade tiles, parked bikes, stand sign, awning.

## 12: attempts/06-route.png

![attempts/06-route.png](../../art/candidates/dorm-route-claude/attempts/06-route.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/06-route.png)

Same changes, wide.

## 13: attempts/06-dorm.png

![attempts/06-dorm.png](../../art/candidates/dorm-route-claude/attempts/06-dorm.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/06-dorm.png)

Camera swung west to show the dorm door.

## 14: attempts/06-room.png

![attempts/06-room.png](../../art/candidates/dorm-route-claude/attempts/06-room.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/06-room.png)

Eric too close to the camera; boxes out of frame; lamp blown out.

## 15: attempts/06-court.png

![attempts/06-court.png](../../art/candidates/dorm-route-claude/attempts/06-court.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/06-court.png)

Court view again. Rejected, dropped.

## 16: attempts/06-layout.png

![attempts/06-layout.png](../../art/candidates/dorm-route-claude/attempts/06-layout.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/06-layout.png)

Roof units scattered off the roofs (negative seed bug).

## 17: attempts/07-room.png

![attempts/07-room.png](../../art/candidates/dorm-route-claude/attempts/07-room.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/07-room.png)

Eric moved to the window, boxes at the bed's foot, lamp dimmer.

## 18: attempts/07-layout.png

![attempts/07-layout.png](../../art/candidates/dorm-route-claude/attempts/07-layout.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/07-layout.png)

Seed fixed, tighter framing.

## 19: attempts/07-layout-labelled.png

![attempts/07-layout-labelled.png](../../art/candidates/dorm-route-claude/attempts/07-layout-labelled.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/07-layout-labelled.png)

First labels; some overlapped or were cut off.

## 20: attempts/08-layout-raw.png

![attempts/08-layout-raw.png](../../art/candidates/dorm-route-claude/attempts/08-layout-raw.png)

[Open full-size image](../../art/candidates/dorm-route-claude/attempts/08-layout-raw.png)

Final layout render before labels (2x).

## 21: 01-layout.png

![01-layout.png](../../art/candidates/dorm-route-claude/01-layout.png)

[Open full-size image](../../art/candidates/dorm-route-claude/01-layout.png)

Final, labelled.

## 22: 02-route.png

![02-route.png](../../art/candidates/dorm-route-claude/02-route.png)

[Open full-size image](../../art/candidates/dorm-route-claude/02-route.png)

Final, 2x.

## 23: 03-walk.png

![03-walk.png](../../art/candidates/dorm-route-claude/03-walk.png)

[Open full-size image](../../art/candidates/dorm-route-claude/03-walk.png)

Final, 2x.

## 24: 04-dorm.png

![04-dorm.png](../../art/candidates/dorm-route-claude/04-dorm.png)

[Open full-size image](../../art/candidates/dorm-route-claude/04-dorm.png)

Final, 2x.

## 25: 05-room.png

![05-room.png](../../art/candidates/dorm-route-claude/05-room.png)

[Open full-size image](../../art/candidates/dorm-route-claude/05-room.png)

Final, 2x.
