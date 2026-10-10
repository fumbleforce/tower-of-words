# Scene editor: design and stages

Jørgen asked for this on 2026-10-10. The editor should let an author make whole scenes, or edit ours, the way a professional content tool does. It has to be easy to use and hide how the scenes are stored. Images are edited in place, with history and regeneration, and names, places and looks come from the bible. Every save keeps a revision. His words are in notes/feedback-log/. This page holds the design and the stage plan. How to run the editor and how its adapters work is in [tools/subplots/README.md](../../tools/subplots/README.md).

The URL is http://127.0.0.1:8771/tools/subplots/web/ (start the server with `./start`). It works only on this computer.

## Codex's version (judged 2026-10-10)

The backend is sound and stays. That covers the revision store, the conflict checks, the local adapter with its backups, rebuild and checks, the image service proxy and the bible catalog (`authoring.mjs`). The page itself did not work as an editor:

- It listed 1,090 code nodes ("D2 Limits", "Arrive") in one flat list. It had no labels for public and private content and no idea of where a scene sits in the story.
- Every beat was a large form card with two dropdowns and two text boxes. A 37-beat scene ran to about 30 screens, so nobody could read it as a scene.
- Beats could only be moved with ↑ ↓ buttons, one place at a time.
- Undo threw away every change since the scene was opened. There was no redo.
- Each line had a "spoken language" dropdown, and the other language was kept in hidden editor metadata. The author could not tell what the game would actually show.
- The preview was a plain text dialog, not the game's dialogue style.
- Saving a public scene rewrote the whole node with quoted keys (`{"say": "mio", ...}`), so a one-word fix showed up as a diff on every line.
- The front end was written as dense one-line code that is hard to maintain.

## Layout

Desktop is three columns plus a top bar. Phone is out of scope for an authoring tool, but the page still works at 1366 px.

```
┌ Scene editor · Office › Lunch with Mio   [PUBLIC GAME · game3d/story/office.js]   ↶ ↷  Preview  Play in game  Save ┐
├──────────────┬──────────────────────────────────────────────────┬──────────────────────────────┤
│ Scenes       │ Timeline                                         │ Inspector                    │
│ [search]     │ ⠿ 01 Narration  She shuts the door…              │  Beat · Picture · Placement  │
│ All Pub Priv │ ⠿ 02 Mio   Page thirty already…                  │  · Revisions                 │
│ ─ Office ─   │            もう三十枚目。…                        │                              │
│  Lunch  PUB  │ ⠿ 03 [ picture, 16:9, Replace · History ]        │  (the selected beat's         │
│ ─ Day 1 ─    │ ⠿ 04 Eric  おねがい、しました                      │   details, or the picture's   │
│  Copier PRIV │ ⠿ 05 Choice  ▸ Sit down  ▸ Leave                  │   history, or where the       │
│              │    + add beat                                    │   scene plays)                │
└──────────────┴──────────────────────────────────────────────────┴──────────────────────────────┘
```

- **Scene list.** It is grouped by area (place, day or private source), searchable, and filtered by All, Public game or Private. Each row carries a tag, PUBLIC or PRIVATE · ADULT, and the beat count. Stage 3 replaces the flat groups with a story map.
- **Timeline.** One compact row per beat: a drag handle, the beat number, a coloured type marker, the speaker's portrait and name, and the text edited in place. Japanese and English sit together on one line, in the order the game shows them. Pictures appear in the timeline whole, at the column's width and their full height. The timeline reads as one path through the scene (Jørgen, 2026-10-10: "I'm not able to easily follow when there is branching, like look vs leave. possible to select in the editor, and it "continues" below?"). A choice shows its options as a switch. The picked option's beats follow below it: an option that goes on to another part of the scene brings that part's beats in under an "After “Look”" band, and switching the pick swaps them. An "if" shows only the side the path takes. When a pick above decides it, the beat says which pick ("Because you picked …"). When nothing does, a Yes/No switch picks the side, and a switch for who plays sits in the path bar at the top, next to the picks so far. A line marks where the two sides of an "if" meet again. Beats in a part a choice leads to are edited, dragged and added like any other, and Save writes each changed part on its own. Preview plays the same path. Play in game passes who plays and the switched flags to a private scene's viewer; the choices stay the player's to make. A "+" between rows adds narration, a line, a choice or a picture there. Rows drag to a new position, and Alt+↑ or Alt+↓ moves the selected row.
- **Pictures of a scene.** "This scene" in the Picture tab and the composer's library lists the pictures the scene already has and their alternates, worked out from what exists, with no records changed. That covers pictures made for it in the composer, pictures picked for it, the round folder each live picture was copied from (found by an identical file under rewards/), and rounds named after the scene or its pictures (copier-2 for d1-copier). Jørgen saw "No pictures generated for this scene yet" on a Mio scene, because only composer pictures counted. The rules are in `scene_runs` (tools/subplots/api.py).
- **Composer.** Compose a new picture fills the screen in three columns: who is in it and how the shot is directed on the left, the picture with Generate and every generation setting (model, count, seed, steps, prompt strength, size, negatives, the prompt) in the middle, and the picture library on the right. At 1366 × 768 the left and middle columns fit without scrolling (Jørgen, 2026-10-10: "make it full screen, compose it so that we get full capabilities, right now there is too much scrolling"). Only the library scrolls. A shot's own picture opens with what made it (Jørgen, 2026-10-11: "when opening to re-gen a picture for a scene, we need the fields filled out, and if the "format" is not fully compatible, we need at least the prompt to be filled"): its blocks, or Fill from prompt, plus the original prompt and settings, and "Small changes to this picture" (img2img from it, same seed). Inpaint comes in stage 2.
- **Comments.** Each beat has a Comment button (Jørgen, 2026-10-10: "I also want a comment button on the individual beats on the scenes, so I can ask you to edit them"). A request is saved with the scene, the beat (a key from its content, so it stays with the beat when it moves, plus its place and words then), the words of the request and the time. A beat with an open comment shows a peach marker; the thread shows replies and Done. Public scenes' comments sit with the editor's drafts; private scenes' in island/private/rewards/docs/scene-comments.json. Claude works them with `node tools/subplots/comments.mjs open`, `reply <id> "<text>"` and `done <id> ["<text>"]`; replies show in the editor within half a minute.
- **Status.** Every scene in the list, and the open scene's header, shows where it stands (Jørgen, 2026-10-10: "I also want the status indicator on every scene in the scene editor"), worked out from real data: for a private scene, pictures missing (live.json and the files on disk), waiting for a gate the game doesn't build yet or no way in (the normal-entry check), lines not voiced (the voice manifests and the clips), or live in game. A public scene is part of the game; whether its lines are voiced isn't shown, because the editor can't yet tell which clip a line uses. Both kinds also show an unsaved draft and the number of open comments.
- **Inspector.** Beat: speaker, delivery, face, branch conditions, shot framing. Picture: the current image, Replace from the image gen history (filtered to the scene's cast), and Compose new, which is the existing composer. Stage 2 adds edit and inpaint. Placement: where and when the scene plays, as condition pickers, and the notes. Revisions: every save with its time, Restore and Compare.
- **Preview.** Plays the scene in a box styled like the game's dialogue: the picture full-bleed, the speaker's name in their colour, the subtitle line in the game font, Japanese in peach, and choices as buttons. **Play in game** opens `?scene=<id>` for a private scene, or the place for a public one, in a new tab.
- **Labels.** Jørgen, 2026-10-10: "this is private mode eligible so no restrictions, just labelling on what goes where". Public and private scenes sit side by side. Every scene, picture and source path is labelled with its audience (public game, or private and adult) and the file it lives in.

## Hiding the source behind forms

The author never sees code. A beat is one of narration, line, choice, picture, branch, jump, word or direction. Each one is a form built from the step objects in game3d/story/FORMAT.md. A step the editor cannot express is still shown, in plain words ("Camera moves in on Mio"), and it can be moved and deleted. It keeps its exact source text, so nothing is lost on save. The private recipe helpers (`duo`, `cw`, `pic`, `gap` and the rest) are decoded the same way by the recipe adapter.

## One adapter, revisions and undo

- Every read and write goes through `/api/subplots/*` (tools/subplots/api.py). Public story modules are read by `source.mjs`, which parses them without running them. The private recipe sources are read through the provider command that `island/private/rewards/tools/subplot-editor.json` configures. The public repo holds only the generic adapters.
- A save checks the source's revision hash, so an outside change gives a conflict and never an overwrite. The previous scene goes into Revisions first. A private save also backs up the generated files and rebuilds them. If the rebuild or a check fails, everything is restored.
- Public saves are minimal edits. A beat that did not change keeps its exact source text, moved beats keep theirs, and only new or edited beats are written, in the house style (`'mio: text'`, unquoted keys, single quotes).
- Undo and redo work in the browser over every edit since opening, with Ctrl+Z and Ctrl+Shift+Z. A save can be taken back by restoring the revision before it and saving again. That is one click in Revisions.

## Pickers from the bible

Speakers come from docs/game/cast.md, with portraits from game3d/js/ui/portrait-data.js and colours from narrative/speakers.js. Places come from places/definitions.js and docs/game/places.md. Times of day come from sim.js. Flags and their values are collected from every story condition. Words come from lang.js. Deliveries are the voice direction tags. All of them come from `/api/subplots/authoring`, which caches until a source changes. Free text is only for the words people say, narration, and choice labels. A value that is not in the bible yet (a new flag) can be typed in and gets a "new" marker.

## Checks on save

| Check | Public | Private |
|---|---|---|
| Parse and syntax of the written file | yes | yes |
| Generator rebuild (`*.src.mjs` writes sequences, plugins, line lists) | none | yes, restored on failure |
| `story-check.mjs` (unknown ids, missing nodes, bad conditions) | stage 2 | none |
| Reachability (`normal-entry-check`, then `normal-reach-browser` on request) | none | entry check now, browser on request |
| Blur check | none | yes |
| Voice manifest (changed lines go back to "needs voice", stale clips retired) | stage 2 | yes |

A failed check shows in plain words next to the beat it concerns.

## Stages

Each stage ships on its own.

1. **Core editing loop (now).** Open any scene, public or private, labelled. Edit narration and lines inline, add beats, change the speaker from a picker, and drag beats into a new order. See each picture in place and replace it from the image gen history. Undo and redo. Save with a revision. Preview in the game's dialogue style, or Play in game in one click. Minimal public saves.
2. **Pictures.** Regenerate a picture from its own settings, edit and inpaint (mask a region and repaint it through the dashboard's repaint path), compare versions side by side, and add a picture beat with a new composition. GPU work goes only through the image gen queue, with ComfyUI's VRAM capped so the browser keeps headroom. story-check and the voice manifest run on public saves.
3. **Story map and placement.** A map of scenes per area and day with the routes between them (talk, event, choice and jump). Drag a scene's entry onto a place and time. Restrictions (day, period, flags, once only) become one sentence that reads like English. New scenes are made from a template.
4. **Video.** Turn a picture into a short loop (image to video) on the local queue, preview it in place, and promote it through `tools/assets/live.mjs`.
5. **Polish.** Compare any two revisions side by side, comments for Jørgen on beats, and a whole-scene reading mode for writers.
