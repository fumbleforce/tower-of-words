# Day-1 world review

Reviewed 2026-09-29 by Codex subagent `world_review`, against HEAD `f6cc3ae` plus the working tree. This is a source review with existing screenshots, not a fresh playthrough. No game files or assets changed. Handoff goes through the main Codex session to Claude's world owner; the fourth item also needs the camera owner.

The near-square B2 plan already has useful landmarks: the lift and vending corner, desk island, copy room and cooler machine room. Keep that plan. [archived map-design.md](history/offline-archive.md) supplies useful sightline and interaction principles, but its old pixel coordinates and story are superseded by [GUIDE.md](../GUIDE.md). The changes below concern the current day only.

## 1. Clear the machine-room opening when the door opens

**Confirmed in source and existing images.** `game3d/js/scenes/office.js:378` places an opaque panel, 0.8 m wide and 1.22 m high, at `(5.1, 0, 0.1)`, behind the hinged leaf. It is attached to the room root and remains there. `game3d/js/places/office.js:322` opens navigation and rotates the leaf, without removing that panel. Eric can therefore walk through a visibly solid black rectangle.

The final frame of [the door-swing sheet](../game3d/shots/machine-door-2026-09-28/door-swing-desktop.png) shows it clearly. That image predates the reviewed working tree; the panel and hook remain in the current source.

Remove the panel and let the actual room floor and lighting show through the frame. Keep the existing hinge and leaf collider. Check the closed, halfway and open states, then walk Eric through on desktop and phone. Passing means the visible opening agrees with the walkable opening throughout the crossing.

## 2. Show the gate's mistaken count where the story says it is

**Confirmed source mismatch.** `game3d/story/gate.js:176` says the gate's little screen counts Hamada and his briefcase as two people. The reader at `game3d/js/scenes/lobby.js:31` only displays an arrow, circle or cross. The arch at line 56 has light strips and flaps, with no counter display. `game3d/js/places/lobby.js:106` changes the jam lights and flaps only. The gate is centred at `(0, -0.55)`; Hamada reaches the right reader at `(0.93, 0)`.

The jam is the lobby's main playable problem, so its cause should be visible. Add a small entrance-facing display beside the right reader, showing a two-person pictogram or `2` in the jam state and clearing when resolved. Use the existing jam camera at `game3d/story/gate.js:169`; check that Hamada, his case and the display remain legible together at 390 px. Avoid adding another explanatory panel. [Existing jam view](../game3d/qa/round1/fast-1366x860/090-gate__line.jpg) shows the available space, but is an older build.

## 3. Give the copier a readable fault state before the repair

**Confirmed source mismatch; refinement of existing QA request #16, not a separate task claim.** The copier starts in `jam` (`game3d/js/places/office.js:20`), but its button stays green (`game3d/js/scenes/office.js:59`). The updater's “blink while jammed” comment at `game3d/js/places/office.js:282` has no matching blink or fault-state code. Only `run` and `wild` shake the machine; the hook at line 300 generates paper only for those states.

At `(-2.95, 2.84)`, show one sheet caught in the feed and a steady amber fault indicator before Mori demonstrates 動いて. Clear both when it runs, and keep the existing output stack. This gives the repair an observable before/after without another interaction or word lesson. Verify from Eric's scripted worktable spot `(-4.4, 3.9)` and the Mori-focused lesson camera. Coordinate this with the owner already handling [production-requests.md](production-requests.md), QA #16.

## 4. Test a closer desktop view during B2 exploration

**Design proposal, not a reproduced bug.** `game3d/js/places/office.js:241` fits the whole floor on desktop, while phone follows the player. [The office overview](../game3d/shots/round-9/office.png) preserves the plan well, but desks, expressions and small machine changes compete with several inactive rooms.

Keep the wide arrival view for orientation, then trial a modest 1.2× to 1.3× follow view once Mori's greeting ends. Start around the occupied desk island `(-0.8, -3.3)` and ease toward the player as they enter the corridor; retain the current explicit dialogue cameras. Compare it with the current view at 1366 and 2560 px before adopting it. Reject the trial if it loses the next doorway, hides Eric behind a wall, or requires more camera correction to explore. This needs a visual comparison, not a room rebuild.

## Review limits

The inbox was checked through C-0005. Existing Mori arrival spacing, copier doorway choreography, lunch seating, fan and lift work were treated as active or already addressed. Screenshots support spatial observations only; current source supports the state findings. Source fingerprints at review time: scenes/office `302ab82a`, places/office `0ab0bbf3`, scenes/lobby `e342f104`, places/lobby `1d47434a`, story/gate `59ae3790`, story/office `01ccb923` (SHA-256 prefixes).
