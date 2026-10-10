# Local tool pages

Jørgen, 2026-10-10: "then I want a better navigation between the tools, you have only done things halfway, we still have inconsistent nav, we have like 3 or 4 different "viewers" for private encounters and scenes/assets, we must unify to the latest versions, remove the old cruft, and have a unified nav". Then: "I dont want the "hub" area, if we have a unified nav, we should be starting with the bible, and have the various tools as nav items, including the game". And: "the /private route would open the private version of the hole nav, it would get the additional tools and capabilities, like an extention of the original. be DRY, don't remake it, make sure every tool and item has one place they are defined".

One page per job. Every kept page carries the same top bar, [tools/nav/nav.js](../../tools/nav/nav.js): one script tag per page, the same order everywhere, the current page marked. `ITEMS` in nav.js is the only place a public tool is defined. http://127.0.0.1:8771/ opens the bible. The bar shows only on 127.0.0.1, never on the public site and not in automated browser runs (a test that wants it sets `window.AMAKAWA_NAV = true` first).

A new tool page gets one line, `<script src="<repo root>/tools/nav/nav.js"></script>` right after `<body>`, and one entry in `ITEMS`. If the page has sticky or full-height parts, offset them with `var(--anav-h, 0px)`. `node tools/check/nav-registry.mjs` (in `npm run check`) fails when an entry is defined twice, a tool page does not load the bar, or another file lists the tools again.

## Private mode

http://127.0.0.1:8771/private turns private mode on for this browser and opens the bible; http://127.0.0.1:8771/public turns it off (a cookie, so the image gen port sees it too; tools/review_server.py). It is the same site, not a copy. In private mode the server hands out the one private registry file (git-ignored, under island/private/; island/PRIVATE.md says where) as `/api/nav-private.js`. It only adds: bar entries after the public ones, and capabilities for the shared tools, which a tool reads with `await AmakawaNav.ready` and `AmakawaNav.capability('<tool id>')`. Outside private mode, or on a computer without the private files, that script is empty and nothing private shows. The public code never names private content.

What each shared tool adds in private mode:

| Tool | Adds |
|---|---|
| Bible | The reward picks per character and the private Review items (capability `bible`) |
| Scene editor | The private scenes. Outside private mode the server gives it public scenes only |
| Image gen | The private renders (reward and portrait rounds under island/private/, anything rated sensitive or nsfw, reward prompts): history, thumbnails and files are hidden outside private mode |

## Kept, in the bar's order

All on http://127.0.0.1:8771 unless noted.

| Bar entry | URL | What it does |
|---|---|---|
| Bible | `/bible/` (and `/`) | The world bible: cast, places, story, rules |
| Review | `/bible/#review` | Choices waiting for Jørgen's pick, with Send |
| Showcase | `/bible/#showcase` | Finished work to look at and comment on |
| Scene editor | `/tools/subplots/web/` | Edit scenes: lines, order, pictures, conditions, revisions, preview |
| Image gen | http://127.0.0.1:8772/ | Compose and render pictures; History holds every render (start with `tools/imagegen/run.sh`) |
| Assets | `/tools/assets/` | Every model, portrait, sound and prop with status and use |
| Characters | `/game3d/viewer.html` | The cast in 3D as the game builds them |
| Notes | `/hub/notes.html` | GUIDE, notes, design docs, story, read in the browser |
| Game | `/game3d/` | The game, in its own tab. `?scene=<id>` starts it one step from a private scene |
| Private scenes | private mode | Every private scene: visuals ready or pending, play it in the game, edit it in the scene editor, drafts, library, scene docs |
| Rewards | private mode | Every saved private picture by collection and round |
| Portraits | private mode | Game portraits and the private outfit sets |

## Replaced or removed (2026-10-10)

| Old page | Now |
|---|---|
| The hub at `/` (cards linking each tool) | Retired: `/` redirects to the bible, the tools are in the bar |
| The private copy of the bible | The bible in private mode; its old address goes to `/private` |
| Private "Play and tools" hub | Retired; its address goes to `/private`. Its other links (scene docs, encounter pictures, the library, the forum material, playing as Carina) are at the top of Private scenes |
| Private scene viewer list | Folded into Private scenes (it had the soft or hard mark, the scene note and the worktree game link). The old address redirects there, and the game's "back to the list" goes there |
| Private rewards browser at its own address | The same browser as Rewards; the old address redirects |
| The private pages' own menu bar | The shared bar; its file is now the private registry |
| "← Hub" links in the bible, assets and notes pages | The bar |
| tools/characters/view.html, cat.html, chibis.html; game3d/tools/eric-test.html, mio-test.html | Removed: early test and capture pages nothing linked to. The Characters viewer and game3d/tools/cat-sheet.html cover them |

The retired private pages are kept in the private backups (island/PRIVATE.md).

## Not tools (no bar, kept as records)

Pages that belong to one art or review round and that Review items link to: tools/style-concepts/*-viewer.html, tools/characters/parts/viewer.html, tools/creator/ (the chibi creator, dropped 2026-10-04; its dress page is still published as /creator/), art/concept/, game3d/design/mock-*.html, game3d/showcase.html, game3d/minigames/*.html, game3d/tools/*-sheet.html, game3d/tools/speech/, game3d/vrm-test.html, tools/assets/render.html (thumbnail renderer) and each round's own index.html under reviews/ and the private rounds.
