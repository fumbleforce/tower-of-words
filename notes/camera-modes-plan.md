# Camera modes: plan (#265)

Jørgen, 2026-10-05: "wish I could have more camera mode, like close third person".

This is the plan step only; nothing in game3d/ changes here. The open choices are in Review item `reviews/camera-plan-1`, with mock views: real screenshots of today's places with the camera moved by hand in a headless capture, not a built feature. What the camera does today is described in docs/game/controls-and-ui.md (Camera); this file only covers what close mode adds and changes.

## What is there now

- One camera per place, `RoomCam` in game3d/js/cam.js: a fixed high three-quarter view (46 to 56 degrees down, a narrow 20 to 24 degree lens, yaw 0, looking north), fitted per place in each place's `fit(aspect)`. Desktop usually sees the whole room; the phone sits closer and follows Eric inside a clamp. It moves on damped springs, leads a little where he walks, leans toward the goal, keeps his whole body in frame (`keepInView`), eases into story shots (`closeOn`/`release`) and pulls back while a prompt waits (`pullBack`).
- Cameras that are not `RoomCam`: the train's own camera (places/train.js: the whole car on desktop, along the car on a phone), the turning outdoor camera (places/turning-cam.js: the east lane and east coast change yaw and pitch with where he is), the club interiors (places/room-view.js), the lift ride's fixed shot of the car (places/lift.js, 50 degrees in both places), the walk-in and walk-out framing of trips (places/edge-walk.js), and the title camera (ui/title-camera.js).
- Story shots: 103 `{ do: 'cam' }` steps across the story files (gate, office, plaza, dorms and the rest) call `closeOn` on a person or spot, then `back`. Kotodama and gestures call it too.
- The places are built for the high camera. Rooms have no ceiling, and the walls between the camera and the room are cut low (the dorm flat's at 0.45, its front wall 0.3; the office floor's front walls likewise). Buildings that would hide Eric fade their upper mass (scenes/occluders.js), using a test of where he stands (`footprint`) or of the shadow a 46-degree north-facing camera casts behind a box (`screenShadow`).
- Movement: WASD is relative to the camera's forward at the moment the keys go down and keeps that frame while held (movement/walker.js), so a camera that turns doesn't bend the walk. A click or tap walks there; holding the left button or a finger on the floor steers (movement/steer.js). The mouse wheel up opens the backlog.
- Pins (engine.js `markers.update`) are projected from the camera each frame. A pin off screen is hidden, except the goal's, which has the edge arrow. Pins have no wall test; the high view never needs one.
- Post (post.js): a tilt-shift blur toward the top and bottom of the frame on medium and high, tuned for looking down.
- Phone budget (notes/PERF.md): 30 fps, under 200 draw calls and 300k triangles a frame.
- cam.js is 391 lines against the 400-line ceiling for runtime modules (ARCHITECTURE.md), so close mode goes in a module of its own.

## Close third person

A second camera mode next to today's. Today's view (call it Overview) stays the default everywhere, for every new player.

### The shot

- Behind Eric and above him: the pivot at his shoulders (0.85 of his height), the camera 2.8 units back along his facing and 2.1 above his feet, aimed at a point 1.2 ahead of him at chest height, which makes it about 15 degrees down. Eric is about 1.4 units tall in the office and the flat (1.2 on the train), so that is two body lengths back and a little over his head. He stands in the lower middle of the frame, and what he walks toward fills the rest. This is decision 1's default; the review shows it next to a closer shoulder shot (2.3 back, 1.45 up, 7 degrees). A further, higher option (3.6 back, 2.8 up) is in the review too, but its mock was not captured: the browser slots were busy.
- Lens: 50 degrees vertical on a wide screen. On a phone held upright the frame is narrow, so 50 would see only 24 degrees across; the phone gets 65 (36 across). The mocks show that on the phone he still fills a lot of the frame and the top third is mostly empty above the room's walls, so the phone may want the further shot even if the desktop keeps the default.
- Yaw follows his heading on a slow spring (about 0.6 s), so short turns and the walk round a desk don't swing the view. Standing still, it holds. A look input (below) moves the yaw and pitch away from behind him; after he has walked for 2 s with no look input it eases back behind him.
- Pitch: 5 to 40 degrees down, 15 by default, changed by the look input.
- Same springs as today (cam.js `damp`); the Reduce motion setting slows the follow and turns off the auto-recentre.

### Camera collision

- The camera stays on the room's side of every wall: a short sweep from his shoulders to where the camera wants to be, against the place's walls and tall fixtures only (walls, partitions, pillars, shelves, the lift core). People, desks, chairs and small props never push the camera; it passes over or through them, and anything within 0.4 of the lens fades out with the same dithered fade as the occluders.
- Pulling in is immediate (no spring), so a wall never shows from the inside; letting out again eases over 0.4 s. Closest allowed is 0.6 from the pivot; nearer than that the camera rises over his head instead.
- Each place hands close mode a list of camera blockers, merged meshes it already has (`place.camBlockers`), built the way occluders are handed in. Three rays a frame against a few dozen boxes: well under 0.1 ms.
- The mock views use one ray against the whole scene, which is enough to show where the camera would sit. They also leave out the cone, the pin rules and the post changes below, so they show the problems those fix.

### Indoor rooms (B2, the lobby, room 203) and the train

What the mocks show indoors:

- B2 reads well from behind him: the desks, Mori at his screen, the corridor with its doors and the copy room ahead. The flat reads well too: window, desk, wardrobe and air conditioner.
- Rooms have no ceiling, so above the walls there is dark empty space, and the pins of things in the next rooms float in it. On the phone that is the top third of the frame.
- The near walls are cut low for the overview. Facing them (he turns round toward the corridor in B2, or toward the door in the flat), a low camera looks over knee-high walls into the dark outside.
- The train car has a roof at about his height plus a bit; the camera hits it and pulls in until it sits right over his head (the last train mock), so the car needs a lower boom or its roof faded in close mode.

What close mode does about it:

- Default: the camera's yaw stays within 70 degrees either side of the place's own view direction (north for most rooms), so close mode looks at the full-height back and side walls. When he walks toward the cut side, the camera swings round to his side and looks across him rather than turning to face the cut walls. The B2 corridor, the lobby desk and the flat's window and desk all face the open side already.
- Each room states its cone (`closeCone: { yaw, spread }` in its place file), so a room with walls all round can drop the limit later.
- Pins behind a wall are hidden (Pins, below), which clears the floating pins.
- The empty space over the walls gets the room's own dark wall colour as background in close mode, so it reads as shadow, not a hole. A real ceiling is a per-room art job, not in the first pass.
- The train: the boom is capped under the roof (1.5 up instead of 2.1) and the roof over the car fades in close mode the way the occluders do. Whether the train gets close mode at all on day 1 is part of decision 5.
- Outdoors (the plaza, the forecourt, the station side) there is no cone: buildings are whole and the fades work from any side. The plaza mock is the best of the set.

### Occluders and wall fades from a low angle

- `footprint` tests (Eric inside a building, riding the lift) work unchanged.
- `screenShadow` tests assume the 46-degree north-facing camera. In close mode an occluder fades when the line from the camera to his head crosses its box instead (one ray against each occluder's box, a handful a frame). Both tests stay; the mode picks which runs.
- The dorm front wall and the lobby's door wall, already faded out once he is inside, stay faded in close mode.
- Ceiling lamps stay hidden (Jørgen's rule), so close mode never looks up into a lit void: the 40-degree pitch limit keeps the ceiling line out of frame in the cone.

### Pins, outline and post

- A pin behind a wall: hidden unless it is the target in reach or the goal (the overview never needed this; at eye level, pins through walls read as clutter).
- A pin behind the camera: `markers.update` projects a point behind the camera to a mirrored spot on screen. The goal's pin is kept on screen today even off screen, so close mode must treat a point behind the camera as off screen and leave it to the goal arrow, which then sits on the bottom edge ("behind you").
- Pins further than 10 from Eric are hidden in close mode; the high view never sees that far, the low one sees across the whole plaza.
- The outline already tests against the depth buffer (perf/outline.js), so it works from any angle.
- Tilt-shift off in close mode: at eye level it blurs the near floor and the far end of the room and makes the scene look like a model. Bloom, AO and the grade stay.

### Performance

The mock runs counted draw calls a frame (all passes, averaged over 10 frames, quality medium) in both modes:

| Place and size | Today | Close |
|---|---|---|
| B2, desks, phone 390x844 | 187 | 118 |
| B2, corridor, phone | 183 | 109 |
| Plaza, looking at the fountain, phone | 105 | 109 |
| Plaza, looking east across it, phone | 78 | 132 |
| Room 203, phone | 105 | 96 |
| Train, phone | 156 | 147 |
| B2, desks, desktop 1366x860 | 679 | 358 |
| Plaza, looking east, desktop | 204 | 296 |

Indoors close mode is cheaper (less of the floor is in view). Outdoors, looking along the long side of a place, it costs up to 70 % more, because the low view sees far across it. Triangles follow the same pattern. Steps that keep the phone under 200:

- Far plane 40 outdoors in close mode (today 200), with the place's distance haze fading the far edge so the cut is not seen; indoors the room's walls end the view anyway.
- The batch pass (perf/batch.js) already cuts big places into chunks, so frustum culling drops what is behind him.
- Shadows: the sun's shadow camera is fixed per place (the plaza's covers 42 by 42) and does not need to change.
- The fast test's perf baseline gets a close-mode column (below), and close mode ships only when its numbers sit inside the PERF.md budget.

## Controls in close mode

### Desktop

- WASD and the arrows walk relative to the camera, as today. While the mouse turns the view, the held keys' frame follows the view (the walker's `keyFrame` refreshes on a look input); a camera that swings back behind him on its own does not bend the walk, as today.
- Look: hold the right mouse button (or the middle one) and move the mouse. The left button keeps click to walk, click to use and hold to steer, unchanged. No pointer lock by default; it would hide the cursor that clicks people and pins.
- The mouse wheel keeps the backlog; it does not zoom.
- No new keys besides the toggle.

### Phone

Default: tap to walk and hold to steer stay exactly as taught on the train, and the camera swings behind him as he walks, so most of the time no look input is needed. Looking around is a two-finger drag anywhere on the view (turn and tilt). A one-finger drag stays steering.

The other two options are in the review: a thumb stick bottom left with a one-finger drag on the rest of the screen to look (the usual phone 3D layout, but it takes over the steering drag and needs teaching), or tap and hold as today with a look strip along the bottom edge.

### Taps on things

Tapping a person, a thing or a pin uses it, as today, in every mode. A tap on the floor far away at a low angle hits the floor at a grazing angle, so close mode ignores floor taps more than 12 away (the walk would go somewhere unexpected) and walks to the nearest point at 12 instead.

## The toggle

- Key: C on desktop (free today; it would show in the Settings key list and could be rebound like Say).
- Phone: a camera button in the HUD's top right row, before the menu button, shown from the moment Eric walks on the train.
- Settings, Controls: "Camera: Overview / Close", segmented buttons like the other choices.
- Remembered per device with the other settings (settings.js, localStorage), not in the save.
- Switching eases between the two shots over about 0.6 s, the same spring as a story shot, never a cut.
- Taught once: the first time he walks for 20 s on the train, the controls line says "C: closer camera" (phone: the button's first appearance pulses once). It never comes back.

## Scenes that keep their authored camera

Whatever the mode, these use their own camera, and close mode takes back over when they end:

- The title and its flight into the car.
- Every story step that moves the camera (`{ do: 'cam' }`, kotodama, gestures), and any scene while the game is busy (`game.busy`): conversations, word prompts and their pull-back, the photo and paper close looks, the ticket app at a computer. A conversation is staged for the authored shot (who is in frame, the portraits, the prompt view), so close mode hands over at its start.
- The lift ride, from the doors opening to him stepping out.
- Trips between places: the walk out and the walk in (edge-walk.js), and the loading crossfade.
- The train's departure and arrival sequences.
- The day-end photos of each place (taken from the overview framing, so they match whatever mode he played in).

Free walking everywhere else, including the train car between beats, uses the chosen mode.

## Fast-test mode

- `?cam=close` starts in close mode (the same as picking it in Settings), and works with `?test=fast`.
- `CAM=close node game3d/tools/fast.mjs 390 844` and `... 1366 860` play day 1 with close mode on. The test fails when, during free walking:
  - the camera is inside a wall or a camera blocker (a ray from his head to the lens hits one),
  - his body leaves the frame or fills more than 60 % of it,
  - the camera looks over a cut-down wall in a room (the view's yaw leaves the room's cone),
  - a pin is drawn for something behind the camera,
  - the camera has not handed over to the authored shot when a scene starts, or not taken back over within a second after it ends.
- Its perf numbers go in their own baseline (`phone-close`), checked against the PERF.md budget like the others.
- A capture tool, `game3d/tools/cam-close-shots.mjs`, takes the same stills as the review (B2, the plaza, room 203, the station hall, today's view beside close mode at 1366x860 and 390x844) for the critic.
- game3d/tools/cam-coverage.mjs gets a close-mode pass: Eric at every walkable spot facing four ways, the camera not inside a blocker.

## Optional extra: a free orbit camera

Not in the default scope. A third mode where the look input orbits freely round him at any distance (the wheel or a pinch zooms) without following his heading. It would reuse close mode's collision and cone, so it is cheap once close mode exists, and is mostly useful for looking at places. It is a decision in the review; the default is to leave it out.

## Where the code goes

- game3d/js/camera/close-cam.js (new): the close shot, the look input, collision and the cone. Same interface as `RoomCam` (`update`, `snap`, `closeOn`, `release`, `pull`, `camera`), so story hooks don't change.
- game3d/js/camera/mode.js (new): which mode is on, the toggle, the hand-over to the authored camera when `game.busy` or a trip starts.
- game3d/js/cam.js: unchanged except a hook to let the mode take the frame.
- Places: `camBlockers` and `closeCone` per place, starting with the day-1 places (train, station hall, forecourt and head office lobby, plaza, office B2, dorm court, dorm flat).
- scenes/occluders.js: the camera-ray test beside `screenShadow`.
- engine.js markers: behind-camera and through-wall checks, distance cut in close mode.
- post.js: tilt-shift off in close mode.
- settings.js and ui/settings-view.js: the setting; the HUD button in the shell's HUD.
- docs/game/controls-and-ui.md: the Camera section and the controls table, in the same commit.

## Build order (after the review)

1. Close camera in the plaza only, desktop, behind a URL flag: shot, follow, look with the mouse, collision. Screenshots and a short clip for Jørgen.
2. The toggle, the setting and the hand-over to authored shots.
3. Rooms: the cone, blockers and occluder test for B2, the lobby and room 203.
4. Phone controls (the picked option) and the HUD button.
5. Pins, post and the far plane; the perf pass.
6. The fast-test mode and the coverage pass; then the critic and a cold player in close mode.
