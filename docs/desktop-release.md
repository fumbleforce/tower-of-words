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

What it does, in order: the release file list (`tools/release/files.mjs`, which calls the full flavor `adult`), copied with links dereferenced into `dist/desktop/<flavor>/stage/` at the URL paths; a check that no staged module imports a file the release left out; the flavor step (`tools/release/flavor.mjs`) and, for vanilla, the word scan (`tools/release/scan.mjs`); `content.pak` sealed under a fresh random key made for this build (or `DESKTOP_PAK_KEY`); the app folder, whose main process is bundled and minified with the key in two XOR shares; electron-builder with the fuses set; and for vanilla the word scan again over every shipped file name and everything we wrote. The pack and its key ship together and are never reused, so there is nothing to back up. The content never leaves this machine: nothing here runs in CI.

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

## Windows signing

Researched 2026-10-10 for issue #434. Since June 2023 the key of an OV or EV certificate must sit on a hardware token or a cloud HSM, so a plain .pfx file is not an option. Since 2024 EV no longer skips SmartScreen: every certificate type, and Microsoft's own service, builds reputation over time, so new releases can still warn at first ([Microsoft: code signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)). Signing a release needs only the file's hash to reach the signing service, never the file itself (true of jsign's cloud modes; not checked for each provider below).

| Option | Per year | Who it validates | Issuance | Signing from Linux |
| --- | --- | --- | --- | --- |
| [Azure Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) (was Trusted Signing) | About 9.99 USD a month, about 120 USD (Microsoft's comparison page; the pricing page shows no figures, so confirm in the Azure calculator). Includes 5,000 signatures a month, no per-signature fee below that. | Organisations in Norway, the EU, the UK and others. Individuals only in the USA and Canada, so Jørgen would need a registered business, for example a Norwegian sole proprietorship (not verified that it is accepted). Needs business records, a website and a monitored email on its domain, plus an ID check of the person. | 1 to 20 business days | [jsign](https://electronjs.org/docs/latest/tutorial/code-signing) with `--storetype TRUSTEDSIGNING` and an Azure access token, called from an electron-builder custom `sign` hook. |
| [Certum](https://shop.certum.eu/code-signing.html) standard, cloud (SimplySign) | From 209 EUR (term not shown on the page). Certificates now last at most 459 days. | Natural persons are covered by Certum's [document list](https://support.certum.eu/en/code-signing-required-documents/): online ID check, notary, or ID photos, plus a utility bill. | Not stated by Certum | No official Linux route. Community tools expose the cloud session as PKCS#11 for osslsigncode ([certum-container](https://github.com/hpvb/certum-container), [ssign](https://github.com/Le-Syl21/ssign)); jsign has a reported failure with ssign. Fragile. |
| Certum open source, [card kit](https://shop.certum.eu/open-source-code-signing.html) | From 69 EUR with a card and reader | Natural person, needs a public open source project. | Not stated | Physical card in a reader. Does not fit: the game is not open source. |
| [SSL.com](https://www.ssl.com/guide/esigner-pricing-for-code-signing/) IV, eSigner cloud | Signing plan 180 USD a year for 240 signatures, 1 USD for each extra. The certificate itself costs extra; one page lists 249 USD, term unclear. | Individual validation, no business documents ([SSL.com](https://www.ssl.com/certificates/code-signing/)); exact ID list not checked. | Not stated | eSigner cloud HSM with jsign or SSL.com's CodeSignTool; the SSL.com [jsign guide](https://ssl.com/how-to/microsoft-authenticode-code-signing-in-linux-with-jsign/) covers only PKCS#11 and files, so the eSigner storetype is not verified. |
| OV from Sectigo or a reseller | 150 to 300 USD ([Microsoft](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)) | Usually an organisation; some resellers sell individual validation (not checked). | Several business days | Usually a shipped USB token: osslsigncode or jsign over PKCS#11, with the token plugged into the build machine. |
| EV (Certum cloud 379 EUR from, SSL.com, others) | 379 EUR and up | Organisation, or SSL.com's sole proprietor EV | Longer than OV | Same tools as above. Gives no SmartScreen advantage over OV now, so it is not worth the extra cost. |

The free [SignPath Foundation](https://signpath.io) program is for open source projects only and does not apply.

Recommendation: Azure Artifact Signing, through a Norwegian sole proprietorship if Microsoft accepts one. It is the cheapest, it is Microsoft's own recommended route, and jsign signs from Linux with a short-lived token, so no hardware sits in the loop. If the validation is refused, SSL.com's individual validation with eSigner is the fallback that needs no company.

Wiring it in: `desktop/build.mjs` would set `win.signtoolOptions.sign` to a small script that runs jsign on each file, using the [electron-builder guide for Unix](https://www.electron.build/docs/tutorials/code-signing-windows-apps-on-unix). Not done yet; it waits for a certificate.

## Hardening: what it stops and what it doesn't

Fuses: RunAsNode, NODE_OPTIONS and the Node inspect switches off; embedded asar integrity and only-load-from-asar on; cookie encryption on. Plus contextIsolation, sandbox, no node integration, no DevTools, a strict CSP (inline scripts by nonce only; `unsafe-eval` stays because the story engine compiles its conditions with `new Function`). `node desktop/test/hardening.mjs <app>` checks that ELECTRON_RUN_AS_NODE, NODE_OPTIONS, `--inspect` and `--remote-debugging-port` all fail on a release build.

This stops someone who unzips the installer, browses the app folder or the asar, runs an asset ripper, or starts the app with the usual Electron and Node debugging tricks: the content is one file of authenticated random bytes, and the main process holding the key can't be opened up from outside.

It doesn't stop a determined person. The key is inside the app (as two shares in a minified bundle), so anyone who extracts the asar and reads the code can rebuild it. Asar integrity is enforced on Windows and macOS only, so on Linux a patched asar still runs. Anything shown on screen or played can be captured, and a debugger attached to the binary sees everything. It raises the effort from double-click to reverse-engineering, like most games' asset archives (desktop/pak/FORMAT.md says the same of the pack).

## Checking a build

All runs use their own Xvfb display and a throwaway userData; nothing opens on a real screen.

- `node --test desktop/test/*.test.mjs`: the handler without Electron.
- `node desktop/test/app-run.mjs play --exe <dev build> --cdp --gl gpu`: plays the dev build with real clicks and keys to the first goal, checks the film seeks, and records the clicks to `clicks.json`.
- `APP_GATE=1 node desktop/test/app-run.mjs replay --exe <release AppImage> --gl gpu --out <dir>`: the release, played blind with those clicks, a screenshot per step to look at. Also `first` (what a launch shows), `leave` (Esc on the start page quits), and for dev builds `plugins`, `settings`, `timing`, and `save1` then `continue1` with the same `--keep-config` (slot 1 saved, the window closed at once, Continue loads it from `saves/slot-01.json`).
- `node desktop/test/timing-web.mjs`: the dev server's numbers for comparison.

Measured 2026-10-10, GPU (RTX 3080) under Xvfb: launch to title 3.9 to 6.4 s in the app (Electron's own start included) against 1.6 to 2.4 s for the dev server in an already open headless Chromium; the handler serves the 1000 startup files in 0.6 s, and the app draws 46 fps under Xvfb against 62 headless. New game's Start to a player who can walk: 50 to 75 ms. The gap needs measuring on a real display before reading much into it.
