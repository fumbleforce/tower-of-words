# Desktop release

How to build the desktop app (Electron) for Linux, Windows and macOS, what each platform still needs, and what the hardening does and doesn't stop. Jørgen, 2026-10-10: "we build for electron and distribute on all platforms. We disable dev features. [...] We encrypt the assets so they cant easily just be opened up, being mindful of runtime performance." Issue #420; the pack is #421 (desktop/pak/FORMAT.md), the file list #419, the vanilla flavor #423, save files #422.

## Build

One-time setup: `npm ci --prefix desktop`. This machine's npm has `ignore-scripts=true`, so fetch Electron's binary once with `node desktop/node_modules/electron/install.js`.

```
node desktop/build.mjs [--flavor vanilla|full] [--platform linux|win|mac] [--dev] [--dir]
```

- `--flavor vanilla` (the default, so a slip never ships the optional content) or `full`. Each has its own app id, name, executable and userData folder, so both install side by side: vanilla is `Amakawa` (`amakawa`), full is `Amakawa Complete` (`amakawa-complete`).
- `--dev` puts the content in as a plain folder and allows DevTools and the debugging port, for checking a build. `--dir` stops at the unpacked app.
- Output: `dist/desktop/<flavor>/out/` (git-ignored): Linux AppImage and deb, Windows NSIS installer and portable exe, Mac zip per architecture (a dmg only when built on a Mac).

What it does, in order: the release file list (`tools/release/files.mjs`; until #419 lands, `desktop/lib/files-stub.mjs`), copied with links dereferenced into `dist/desktop/<flavor>/stage/` at the URL paths; a check that no staged module imports a file the release left out; the flavor step (`tools/release/flavor.mjs`) and, for vanilla, the word scan (`tools/release/scan.mjs`); `content.pak` sealed under a fresh random key made for this build (or `DESKTOP_PAK_KEY`); the app folder, whose main process is bundled and minified with the key in two XOR shares; electron-builder with the fuses set; and for vanilla the word scan again over every shipped file name and everything we wrote. The pack and its key ship together and are never reused, so there is nothing to back up. The content never leaves this machine: nothing here runs in CI.

## The app

- `desktop/app/main.mjs`: one window on `app://game/game3d/index.html`. The `app://` scheme is standard, secure, fetch, stream and CORS enabled, so every origin-relative path in the game works unchanged.
- `desktop/app/serve.mjs`: the scheme's handler over the content source: MIME types, 206 range answers (the opening film seeks through the pack), a per-response nonce and CSP on every page, quiet 404 for `/api/*` and anything missing.
- `desktop/app/preload.cjs`: `window.desktop = { release, storage }`. `release` is true in every non-dev build; `storage` is the save-file API (#422).
- `desktop/app/full/` (full flavor only; the vanilla build leaves the folder out): the age check before anything of the game loads, asked once per computer (the answer is `first-run.json` in userData; deleting it asks again), and `/api/plugins`, the list of optional plugins in the pack.
- Saves: userData, or with a file named `portable` next to the AppImage, the .exe or the .app, a folder `<name> data` beside it (the age answer goes there too).

## Dev features in a release

`window.desktop.release` turns them off in three places, and the release file list leaves the dev files out as well:

- `game3d/index.html`: every query parameter except `?mc` is dropped before any module reads one, which covers test mode, captures, place and day jumps, the shell QA screens, the map's dev view, the chibi, cast and look switches; and the feedback window (F8) is never loaded.
- `game3d/js/dev.js`: `DEV` is false (the title's Days, `?debug=1`).
- The `app://game` host is never a local host, so the scene viewer, diag reports and the plugin cache reloads (`game3d/js/plugins.js`) stay off by their own checks.
- Left out of the file list: test mode, shell QA, the feedback window, the map dev view, the showcase, scene viewer and VRM test pages and their modules, tools, tests, QA and shots folders, and the scene viewer's own plugin.
- In the shell: DevTools off, the remote debugging, inspect and js-flags switches make the app exit, no menu (so no reload or DevTools accelerators), navigation and new windows locked to `app://game`, no network at all, permissions limited to fullscreen, pointer lock and the microphone for the speaking practice.

## Platforms

| | Status | What it needs |
| --- | --- | --- |
| Linux | AppImage and deb built and played here: start page, opening (with range seeking), title, new game, the first goal. | The deb step's bundled fpm needs `libcrypt.so.1`: `sudo pacman -S libxcrypt-compat` on Arch/Manjaro. |
| Windows | NSIS installer and portable exe built here (electron-builder needs no wine for these). Under wine the app starts, shows the start page and plays the opening. | A code-signing certificate, or SmartScreen warns on every download. Not yet played on real Windows. |
| macOS | arm64 and x64 zips built here; with rcodesign (`RCODESIGN=<path>`) the fuses are flipped and the .app signed ad-hoc in the same step. Never opened on a Mac. | macOS blocks an ad-hoc signed download until the player allows it in System Settings, Privacy & Security. For a normal double-click: an Apple Developer account (99 USD a year), a Developer ID certificate and notarization (rcodesign can do both from Linux). A dmg needs a Mac. |

Another route for the Mac, if this one fails on a real Mac: build the shell alone on a GitHub Actions macOS runner (public code only, no content and no key), then add `content.pak` and the generated main bundle here and re-sign ad-hoc with rcodesign.

## Hardening: what it stops and what it doesn't

Fuses: RunAsNode, NODE_OPTIONS and the Node inspect switches off; embedded asar integrity and only-load-from-asar on; cookie encryption on. Plus contextIsolation, sandbox, no node integration, no DevTools, a strict CSP (inline scripts by nonce only; `unsafe-eval` stays because the story engine compiles its conditions with `new Function`). `node desktop/test/hardening.mjs <app>` checks that ELECTRON_RUN_AS_NODE, NODE_OPTIONS, `--inspect` and `--remote-debugging-port` all fail on a release build.

This stops someone who unzips the installer, browses the app folder or the asar, runs an asset ripper, or starts the app with the usual Electron and Node debugging tricks: the content is one file of authenticated random bytes, and the main process holding the key can't be opened up from outside.

It doesn't stop a determined person. The key is inside the app (as two shares in a minified bundle), so anyone who extracts the asar and reads the code can rebuild it. Asar integrity is enforced on Windows and macOS only, so on Linux a patched asar still runs. Anything shown on screen or played can be captured, and a debugger attached to the binary sees everything. It raises the effort from double-click to reverse-engineering, like most games' asset archives (desktop/pak/FORMAT.md says the same of the pack).

## Checking a build

All runs use their own Xvfb display and a throwaway userData; nothing opens on a real screen.

- `node --test desktop/test/*.test.mjs`: the handler without Electron.
- `node desktop/test/app-run.mjs play --exe <dev build> --cdp --gl gpu`: plays the dev build with real clicks and keys to the first goal, checks the film seeks, and records the clicks to `clicks.json`.
- `APP_GATE=1 node desktop/test/app-run.mjs replay --exe <release AppImage> --gl gpu --out <dir>`: the release, played blind with those clicks, a screenshot per step to look at. Also `leave` (Esc on the start page quits), `plugins`, `settings` and `timing` (dev builds).
- `node desktop/test/timing-web.mjs`: the dev server's numbers for comparison.

Measured 2026-10-10, GPU (RTX 3080) under Xvfb: launch to title 3.9 to 6.4 s in the app (Electron's own start included) against 1.6 to 2.4 s for the dev server in an already open headless Chromium; the handler serves the 1000 startup files in 0.6 s, and the app draws 46 fps under Xvfb against 62 headless. New game's Start to a player who can walk: 50 to 75 ms. The gap needs measuring on a real display before reading much into it.
