# Asset storage: keeping heavy files out of git

Jørgen, in review bible-in-git (2026-09-29): "propose ideas on how to store and sync the assets outside the repo so we dont bloat it with GBs of heavy files."

Decided in review asset-storage (Jørgen, 2026-09-29): "let us actually go with Cloudflare for storage, and only move in used assets to cloudflare, and keep local machine as a location for WIP, rejected etc. we should try keeping the repo as lean as we possibly can, moving all resources into gitignored areas and uploading what a different machine would need."

Where this stands:

- Stage 1 is done: the layout (section 4), the sync tool (section 5), the pre-commit hook (section 6), the setup steps (section 7) and the stage 2 plan (section 8).
- Stage 2 is done on local main (2026-09-29), except the Pages switch: moves M1 to M4, the first push (1,631 used files, 1,613 blobs, 155 MB in R2), and every binary untracked. HEAD's tree went from 983 MB in 7,235 files to 19 MB in 1,046; `.git` stays at 1.1 GB (history not rewritten). The commit hook is tools/check/hooks (tools/check/locked-assets.mjs copies the locked files into the check snapshot and runs `sync.py check --offline`). A fresh clone passed `sync.py pull`, `sync.py check`, `npm run check`, both fast runs and the bible check.
- Left: `sh game3d/tools/deploy-pages.sh --push`, then Jørgen switches Pages to gh-pages (step 5), before main is pushed. Until then GitHub Pages serves main, which after the push has no images.
- Another machine: clone, `npm ci`, put the four R2 lines in .env (section 7), then `python3 tools/assets/sync.py pull`. Reviews decided only on this machine can make approved candidates look unused there; committing reviews/ (section 10) fixes that.

## 1. What we have now (measured 2026-09-29)

### Git history

- `.git` is 1.0 GB on disk (853 MB in packs, 140 MB loose). GitHub reports the repo at 810 MB. There are 339 commits, all since 2026-09-24, and 30 of them are not pushed yet.
- History holds 1,046 MB of file data. 983 MB of that is images, audio, video and models. Code, text and JSON come to 5.6 MB.
- By type: PNG 605 MB (1,131 files), WebP 175 MB (2,515), MP3 90 MB (2,149), MP4 61 MB (25), JPG 29 MB, GLB 13 MB, .blend 7.5 MB.
- By folder:

| Folder | In history |
|---|---|
| art/company (old model comparison pages) | 275 MB |
| game3d/shots (QA screenshots) | 213 MB |
| legacy/proto2 | 158 MB |
| game3d/assets | 125 MB, of which portrait-candidates 92 MB and eric-meshy 21 MB |
| art/parts | 52 MB |
| legacy/game | 24 MB |
| art/opening | 22 MB |

- Biggest single files: a 13.4 MB opening pilot MP4, contact sheets of 4 to 7.6 MB each (portraits-v2-sheet, kenji-concept3-sheet, eric-anime3-sheet), and Eric's Meshy GLBs at about 4.2 MB each. The six Eric animation files each carry their own copy of the mesh.

### Growth

New file data added per day with commits:

| Day | New data |
|---|---|
| 09-24 | 417 MB |
| 09-25 | 183 MB |
| 09-28 | 232 MB |
| 09-29 (so far) | 265 MB |

Today's commits added 279 screenshot files under game3d/shots, 134 MB in total, which is half of the day. The biggest commits today were the creator base bodies (52 MB), the office fan (31 MB), the lift doors (26 MB) and the interaction marks (24 MB), and most of each was screenshots. The single biggest commit ever is 9ef6153 on 09-28 at 237 MB.

At this rate the repo grows by about 1.5 GB a week, and GitHub's soft limit for a repo is about 5 GB. Pages also stops publishing a site over 1 GB, and Pages currently serves the whole main branch.

### Working tree

- Tracked files: 873 MB in 6,527 files (game3d/shots 206 MB, legacy/proto2 179 MB, art/company 152 MB, game3d/assets 143 MB, art/parts 54 MB).
- Untracked, not ignored: 827 MB in 9,715 files (legacy/side 252 MB, legacy/island 203 MB, legacy/proto2 169 MB, game3d/shots 84 MB more, legacy/mvp 30 MB, art/figures 20 MB, art/puppet 20 MB, art/pixel 16 MB, bible 9.9 MB).
- Git-ignored, local only: 6.7 GB. The biggest are art/production 2.4 GB, island/private 1.1 GB (the reward pictures are 1.0 GB of that), art/island/work 750 MB, art/opening about 600 MB, game3d/qa 415 MB (screenshots), tools/lang/raw 265 MB, node_modules 137 MB and art/company/local 129 MB. None of this has a backup today.

### What the game itself needs

The phone build loads about 24 MB: the four asset folders the code reads (characters, eric, mio, portraits, 6 MB together), game3d/audio (14 MB), vendor (2.5 MB) and the code. Everything else is source material, candidates, screenshots and old work.

### The bible and reviews

- bible/ is 9.9 MB. bible/shots is 9.5 MB of that, and the code and data are about 0.4 MB. Only the story map files (3) are tracked.
- reviews/ is 376 KB of JSON. 21 files are already tracked; newer items like bible-in-git are not.
- The review items point to 268 images and audio files (113 MB). 266 of them are already in git, mostly under game3d/assets/portrait-candidates.

So committing the bible and reviews as text adds under 1 MB. The heavy part is the media they point to, and that is the same question as everything else below.


## 2. What the choice had to handle

- One person and one Linux desktop with the GPU, but another machine (a laptop, a cloud agent) should be able to clone the repo and get what it needs.
- Agents write assets all day. The setup has to work without anyone remembering a manual step, and it has to stop agents from committing binaries by accident.
- The phone plays the GitHub Pages build and needs only the 24 MB of runtime files.
- The bible, the asset library and the review pages run locally on 127.0.0.1:8771 and read files by their repo paths. Files that stay at the same paths on disk need no page changes.
- The reward pictures must never be public. The repo is public, so private files can't go in git in any form, and their names can't go in a manifest either.

## 3. The options that were compared

Four options went to the review: A, Supabase Storage with a manifest in git; B, Git LFS; C, Cloudflare R2 or Backblaze B2 with a manifest; D, the local disk with an encrypted nightly backup. All four kept files at their paths on disk and stopped git from tracking them.

Summary as it went to the review:

| | A. Supabase | B. Git LFS | C. R2 / B2 | D. Local + backup |
|---|---|---|---|---|
| Monthly cost, 10 GB | ~$10 (new project) | ~$0 | $0 / $0.06 | < $0.10 |
| Monthly cost, 50 GB | ~$10 | ~$3 + downloads | $0.60 / $0.30 | < $1 |
| Private rewards | yes (encrypted bucket) | no | yes (encrypted bucket) | yes (encrypted backup) |
| Asset version per commit | yes | yes | yes | only with the optional manifest |
| Works from a fresh clone | `sync pull` | yes | `sync pull` | restore a snapshot |
| New accounts | none (org exists) | none | Cloudflare or Backblaze | Backblaze or Cloudflare |
| Setup | half a day | an hour, plus a history rewrite for old files | half a day | an hour |

B was ruled out because LFS files in a public repo are public and can never be deleted. Jørgen picked C, on R2, with one change to the proposal: only used assets go up. WIP, candidates and rejected files stay on this machine. R2 costs $0.015 a GB a month after the first 10 GB, with no download fees, so the used set (148 MB today) is free.

## 4. Layout: used and local

Git keeps code, text and one lock file, `tools/assets/assets.lock.json`, which lists every used asset's path, size, sha256 and content type. After stage 2 no binary file is tracked anywhere: .gitignore ignores the binary extensions across the whole repo, so every folder counts as a git-ignored area for images, audio, video and models. Files stay at their paths on disk. Whether a file is used depends on where it is, and on the asset library.

Used (synced to R2; another machine gets these with `pull`). These are the roots in `tools/assets/sync.json`:

| Root | What | Needed by |
|---|---|---|
| game3d/assets/ | models, textures, portraits the game loads | the game, the Pages build |
| game3d/audio/ | voice lines, music, ambience, sfx | the game |
| game3d/fonts/ | the two woff2 fonts | the game |
| art/approved/ | approved masters per bible id, the Meshy originals and the approved music | the bible, the asset library, future edits |
| art/refs/ | Jørgen's reference images | image tools |
| bible/shots/ | pictures the bible shows | the bible |
| tools/voice-refs/ | voice clone clips | TTS tools |
| tools/assets/thumbs/ | the asset library's thumbnails (the 3D ones need a browser run to remake) | the asset library page |

On top of the roots, any file that the asset library (`tools/assets/scan.py`) marks approved or provisional is used, wherever it is. Today that covers 26 files outside the roots: 9 in portrait-candidates, the 5 round-9 world-look shots in game3d/shots/round-9, game3d/design/style/rough/style-0.jpg, legacy/proto2/gallery/M-02-it-guy-601.webp, 4 chibi refs in tools/characters/ref, and 6 Mio Meshy files in legacy/side/flat/meshy2 that are copies of art/approved/mio/meshy. So a picked file is backed up even if nobody moves it.

Excluded from the roots: game3d/assets/portrait-candidates/, game3d/assets/portraits-v2/ and portraits-v2-sheet.png (all move out in stage 2), and *.blend1.

Measured today, 1,358 files and 214 MB are used. R2 stores each file once by content, and copies such as eric-meshy share a blob, so that comes to 1,326 blobs and 148 MB.

Local only (git-ignored, never uploaded) is every other binary: game3d/shots and game3d/qa (screenshots), portrait and other candidates, art/parts, art/company, art/production, art/opening, art/figures, art/puppet, art/pixel, art/island, game3d/design, tools/lang/raw, and all of legacy/. They stay where they are, so the local pages that point at them keep working. Moving them into one new "work" folder would break those pages and links, so they don't move; the .gitignore rule already makes their folders git-ignored for binaries.

Private is never uploaded, whatever the config says: any path with a `private/` folder in it (island/private/, the rewards, the private bible), plus the `never` patterns in sync.json. `sync.py` refuses these paths in code, the hook refuses to commit them, and `check` fails if one ever shows up in the lock file. They have no off-machine copy. If that matters later, an encrypted restic backup of island/private (option D) is an hour's work.

## 5. The sync tool: tools/assets/sync.py

This is one Python file that uses only the standard library, plus PyYAML for the asset library scan. It talks to R2 over its S3 API and signs requests with SigV4 itself, so a fresh machine doesn't need boto3, the AWS SDK or rclone. It gets the used set by walking the roots and importing scan.py's entries. It doesn't copy scan.py's logic, and it doesn't write assets.json. R2 stores each file under `blobs/<first 2 of sha256>/<sha256>`, so a changed file becomes a new blob and old versions stay until someone deletes them. Hashes are cached in `.git/assets-sync-cache.json` by size and mtime.

| Command | What it does |
|---|---|
| `python3 tools/assets/sync.py status [--remote] [--all]` | Drift: used files not in the lock file, files changed since it, lock entries missing here, entries no longer used, used files outside the roots. With `--remote` it also lists lock entries whose blob isn't in R2. |
| `python3 tools/assets/sync.py push [--dry-run] [--prune]` | Uploads every used file whose blob isn't in R2 (8 at a time, with the sha256 as the payload hash so R2 checks it), then rewrites the lock file. It drops entries for files that are no longer used. Entries for files missing on this disk are kept unless you pass `--prune`, so a half-pulled machine can't wipe the lock. It refuses to run if the asset library scan fails. |
| `python3 tools/assets/sync.py pull [PATH ...] [--force] [--dry-run]` | Fetches lock entries that are missing here or differ, checks each sha256 and writes atomically. Pass PATHs to fetch only those, e.g. `pull game3d` for just the game. It doesn't overwrite a file changed here unless you pass `--force`. |
| `python3 tools/assets/sync.py check [--offline]` | Exits 1 if a used file isn't in the lock file, a used file changed without a push, a private path is in the lock file, the library scan failed, or (unless `--offline`) a lock entry's blob is missing from R2. Files missing here are only noted. |

Tested against a local S3 server (SeaweedFS with signature checking on). A wrong secret was refused. The full push (1,326 blobs, 148 MB) finished in about a second, and `check` came back OK. A pull into an empty folder fetched all 1,358 files and every one matched its sha256. Pulling only game3d/audio worked, a local change was kept until `--force`, and `check` caught a blob deleted from the bucket, which `push` then re-uploaded. The test lock file was removed afterwards. The first real push is part of stage 2.

## 6. The pre-commit hook

`tools/assets/hooks/pre-commit`, installed with `sh tools/assets/install-hook.sh`, which sets `core.hooksPath`, so it covers every worktree. It refuses a commit that adds or changes:

- a binary file, by extension (sync.json's `binary_ext`) or by git's own binary detection, unless the file matches `commit_allow` in sync.json. The allow-list is empty: the only small binaries in code folders were the two fonts, and they're synced like everything else;
- a path with a `private/` folder in it;
- a text file over 2 MB (`max_text_kb`; the biggest tracked text file today is three.core.js at 1.4 MB).

Once the lock file exists, the hook also runs `sync.py check --offline --staged` (under a second) and refuses the commit while an asset it uses isn't pushed, so nobody has to remember to push. "Uses" means the file's name appears in a file the commit adds or changes, or the file sits in a folder the commit touches (a Showcase entry.json next to its images). Other unpushed files in the checkout, such as another task's Showcase round in progress, are only noted (issue #72).

It isn't installed yet. Right now agents still commit screenshots and candidates, and the hook would block them during the freeze. It gets installed in stage 2, step 7.

## 7. Setup (Jørgen)

1. In the Cloudflare dashboard, open R2 Object Storage (it asks for a payment method once, even on the free tier). Create a bucket named `amakawa-assets`, with location Automatic and public access off.
2. Go to R2 > Manage API tokens > Create API token. Set the permission to Object Read & Write, choose "Apply to specific buckets only", pick `amakawa-assets`, and set no expiry. Copy the Access Key ID and the Secret Access Key, because the secret is shown only once. The Account ID is on the R2 overview page.
3. Add four lines to `.env` in the repo (it's git-ignored):

   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=amakawa-assets
   ```

4. Check it with `python3 tools/assets/sync.py status --remote`. It should end with `R2: 0 blobs`.

## 8. Stage 2 plan

It starts when the main agent says the freeze is over and step 4 of the setup works. Moves go from → to:

| # | From | To | Files | Paths to update |
|---|---|---|---|---|
| M1 | game3d/assets/portrait-candidates/ | art/candidates/portraits/ (local) | 562 (547 tracked), 109 MB | reviews/*/review.json (9 items) and reviews/README.md, bible/facts.yaml (22 mentions), art/PROMPTS.md, TODO.md, tools/portrait_candidates.py, tools/eric_anime2.py, tools/eric_anime3.py, tools/eric_anime4.py, the gen scripts and logs inside the folder. Drop the special case in game3d/tools/deploy-pages.sh and the exclude in sync.json. Its 9 approved or provisional files stay synced at the new path through the library. |
| M2 | game3d/assets/portraits-v2/ and portraits-v2-sheet.png | art/candidates/portraits-v2/ (local) | 20, 9 MB | none live (only old logs in tools/characters/out/mori, left as history); drop the two excludes in sync.json |
| M3 | game3d/assets/eric-meshy/ | 14 files are byte-identical to art/approved/mc/meshy/ and get deleted; check-anim.png, check-side.png and check.html move to art/approved/mc/meshy/ | 17, 37 MB | tools/assets/scan.py, bible/facts.yaml, art/approved/README.md, docs/game/art-and-sound.md |
| M4 | legacy/side/flat/meshy2/Meshy_AI_Neon_Bun_Guardian_biped/ (6 GLBs, not tracked) | nothing moves on disk; references point at the identical art/approved/mio/meshy/ copies | 0 | tools/assets/scan.py, bible/facts.yaml, art/approved/README.md, game3d/tools/slim_glb.py, GUIDE.md (one mention) |

That's four moves covering 599 files. After them, only the library picks listed in section 4 sit outside a root, and they can stay where they are.

The order:

1. Preconditions: the freeze is over, no agent is running, pending work is committed (about 45 modified files today), and `status --remote` answers.
2. scan.py keeps git-ignored paths and drops only private ones. Today it drops ignored files "since the page must work from a clone", and once every binary is ignored that would empty the library. Update the matching line in tools/assets/README.md. This has to happen before step 6.
3. Moves M1 to M4 with their path changes. Then run `python3 tools/assets/scan.py --check`, `python3 tools/bible/build.py && node tools/bible/check.mjs`, and both fast runs (`node game3d/tools/fast.mjs 390 844` and `... 1366 860`).
4. First upload: `sync.py push`, then `sync.py check`. Commit the lock file.
5. Pages: change game3d/tools/deploy-pages.sh to take the runtime binaries from disk (the lock file's game3d/ entries, sha-checked) instead of `git archive`, and run it with `--push`. Jørgen switches Pages to the gh-pages branch (Settings > Pages > Source: Deploy from a branch, gh-pages, root). Check the phone build. This has to come before step 6, because Pages serves main today and main is about to lose its images.
6. Untrack: add the binary block to .gitignore (sync.json's `binary_ext` in lower and upper case, plus `__pycache__/`), remove the old "Large approved binaries live outside git" block, then run `git rm -r --cached` on every tracked binary. That's 5,792 files and 857 MB today, and they stay on disk. Commit it as one commit.
7. `sh tools/assets/install-hook.sh`, and add the GUIDE Process rule: never commit binaries; a used asset goes under a root in tools/assets/sync.json (or gets approved in the library), then `sync.py push`, and the lock file is committed with the change; everything else stays local.
8. Fresh-clone test: clone into a temp folder, run `sync.py pull` and `sync.py check`, then a fast run and the bible check from there.

## 9. The history we already have

Decided: left as it is (option 1 below). Stage 2 stops new binaries and rewrites nothing.

Stopping new binaries freezes `.git` at about 1 GB. There are three ways to handle what's already there:

1. Leave it (recommended for now). Nothing breaks. Clones stay slow (1 GB), but there's only one working copy. We can revisit this if the size gets in the way.
2. Rewrite it with git filter-repo to drop every binary outside the runtime folders. `.git` would shrink to roughly 30 to 60 MB. The risks:
   - Every commit hash changes. build.json ids end in a commit hash, and notes, reviews and HANDOFF cite hashes like 477b5f5, so all of those point at commits that no longer exist.
   - It needs a force-push to a public repo. The old commits stay on GitHub's servers for a while and in any clone or fork, so anything already pushed stays public.
   - Every clone and agent worktree has to be re-cloned. Work that isn't committed (about 45 modified files right now) has to be committed or saved first.
   - Every dropped file has to be uploaded and checked against the manifest first. If we skip that and something goes wrong, the file is gone.
   - GitHub's reported size doesn't shrink right away. It needs their garbage collection, or a support request.
3. Start a fresh repo from the current tree without the heavy files, and keep the old one read-only as an archive. It's cleaner than a rewrite and nothing is lost, but blame and log start over on day one.

If we rewrite, do it once, in a quiet moment, after the bucket is verified, and keep a `git clone --mirror` of the old repo on disk.

## 10. The bible and reviews in git

Once heavy files go through the sync, yes: commit bible/ (without bible/shots, which goes through the sync) and reviews/ to this repo. Together that's under 1 MB of text, and 21 review files are tracked already. It does make his review comments (feedback.json) and the bible's story and cast notes public, as the game source already is. The private bible stays in island/private/bible/, which is ignored. This replaces the question in bible-in-git.
