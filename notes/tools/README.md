# Local tool pages

Jørgen, 2026-10-10: "then I want a better navigation between the tools, you have only done things halfway, we still have inconsistent nav, we have like 3 or 4 different "viewers" for private encounters and scenes/assets, we must unify to the latest versions, remove the old cruft, and have a unified nav". Then: "I dont want the "hub" area, if we have a unified nav, we should be starting with the bible, and have the various tools as nav items, including the game".

One page per job. Every kept page carries the same top bar, [tools/nav/nav.js](../../tools/nav/nav.js): one script tag per page, the same order everywhere, the current page marked. The private entries come from the private menu file through `GET /api/nav-private.js` (tools/review_server.py) and show only on a computer that has the private files. The bar shows only on 127.0.0.1, never on the public site and not in automated browser runs (a test that wants it sets `window.AMAKAWA_NAV = true` first). http://127.0.0.1:8771/ opens the bible.

A new tool page gets one line, `<script src="<repo root>/tools/nav/nav.js"></script>` right after `<body>`, and one entry in `ITEMS` in nav.js. If the page has sticky or full-height parts, offset them with `var(--anav-h, 0px)`.

## Kept, in the bar's order

All on http://127.0.0.1:8771 unless noted.

| Bar entry | URL | What it does |
|---|---|---|
| Bible | `/bible/` (and `/`) | The world bible: cast, places, story, rules |
| Review | `/bible/#review` | Choices waiting for Jørgen's pick, with Send |
| Showcase | `/bible/#showcase` | Finished work to look at and comment on |
| Scene editor | `/tools/subplots/web/` | Edit every scene, public and private: lines, order, pictures, conditions, revisions, preview |
| Image gen | http://127.0.0.1:8772/ | Compose and render pictures; History holds every render (start with `tools/imagegen/run.sh`) |
| Assets | `/tools/assets/` | Every model, portrait, sound and prop with status and use |
| Characters | `/game3d/viewer.html` | The cast in 3D as the game builds them |
| Notes | `/hub/notes.html` | GUIDE, notes, design docs, story, read in the browser |
| Game | `/game3d/` | The game, in its own tab. `?scene=<id>` starts it one step from a private scene |
| Private bible | private | The bible with the private picks and private Review items |
| Private scenes | private | Every private scene: visuals ready or pending, play it in the game (`?scene=`), open it in the scene editor, drafts, library |
| Rewards | private | Every saved private picture by collection and round |
| Portraits | private | Game portraits and the private outfit sets |

## Replaced or removed (2026-10-10)

| Old page | Now |
|---|---|
| Private scene viewer list | Folded into Private scenes (it had the soft or hard mark, the scene note and the worktree game link). The old address redirects there, and the game's "back to the list" goes there. The old page is in the private backups |
| Private rewards browser at its own address | The same browser as Rewards; the old address redirects |
| The hub at `/` (cards linking each tool) | Retired: `/` redirects to the bible, the tools are in the bar |
| Private "Play and tools" hub | Retired: the tools are in the bar; its other links (scene docs, encounter pictures, the library, the forum material, playing as Carina) moved to the top of Private scenes. The old address redirects to the bible |
| The private pages' own menu bar | Replaced by the shared bar |
| "← Hub" links in the bible, assets and notes pages | The bar |
| tools/characters/view.html, cat.html, chibis.html; game3d/tools/eric-test.html, mio-test.html | Removed: early test and capture pages nothing linked to. The Characters viewer and game3d/tools/cat-sheet.html cover them |

## Not tools (no bar, kept as records)

Pages that belong to one art or review round and that Review items link to: tools/style-concepts/*-viewer.html, tools/characters/parts/viewer.html, tools/creator/ (the chibi creator, dropped 2026-10-04; its dress page is still published as /creator/), art/concept/, game3d/design/mock-*.html, game3d/showcase.html, game3d/minigames/*.html, game3d/tools/*-sheet.html, game3d/tools/speech/, game3d/vrm-test.html, tools/assets/render.html (thumbnail renderer) and each round's own index.html under reviews/ and the private rounds.
