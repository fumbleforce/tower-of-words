# Asset storage: keeping heavy files out of git

Jørgen, in review bible-in-git (2026-09-29): "propose ideas on how to store and sync the assets outside the repo so we dont bloat it with GBs of heavy files."

Nothing has been changed yet: no gitignore edits, no history rewrite, no accounts. The pick is in the review item asset-storage.

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

## 2. How the setup changes the choice

- One person, one Linux desktop with the GPU. There is no second machine to sync to, so what we need is mostly (a) a small git repo, (b) not losing files, and (c) knowing which version of an asset a commit used.
- Agents write assets all day. Whatever we pick has to work without anyone remembering a manual step, and it has to stop agents from committing binaries by accident.
- The phone plays the GitHub Pages build and needs only the 24 MB of runtime files.
- The bible, the asset library and the review pages run locally on 127.0.0.1:8771 and read files by their repo paths. If heavy files stay at the same paths on disk, none of those pages need changes.
- The reward pictures must never be public. The repo is public, so private files can't go in git in any form. That includes git LFS, and it includes their file names in a manifest.

## 3. The options

All four keep the files where they are on disk, at the same paths, and stop git from tracking them. They differ in where the second copy lives and how versions are kept.

### A. Supabase Storage with a manifest in git (the plan from 2026-09-28)

- How it works: a bucket in a new project "amakawa" (eu-north-1). Files are stored under their SHA-256 (`blobs/ab/abcdef….webp`), so a changed file never overwrites the old one. A manifest in git (`assets.lock.json`: path, sha256, size) says which version belongs to which path. `tools/assets/sync.mjs push` uploads anything new and updates the manifest, and `pull` downloads whatever is missing locally. Supabase exposes an S3 API, so the script can use the S3 protocol and later move to another provider by changing a config.
- Cost: storage is free within the plan's 100 GB (shared with the org's other projects), so $0 at 10 GB and at 50 GB. The org already has two active projects (reserview, myntbase), and the $10 compute credit covers only one, so a third project adds about $10 a month. Putting the bucket in an existing project would avoid that, but it mixes keys with an unrelated app.
- Agents: they write files as today. The commit step runs `sync push` and commits the manifest. A pre-commit hook refuses binaries outside the game's runtime folders, so an agent that stages a picture by mistake gets an error at commit time.
- Game and bible: unchanged. The game keeps its 24 MB of runtime files in git (or deploy-pages.sh adds them to the gh-pages build). The bible reads from disk, and a fresh clone runs `sync pull` once.
- Private files: a second, private bucket. Files are encrypted on the desktop before upload (rclone crypt), and the private manifest lives in island/private/, which is already ignored. Supabase never sees the pictures in the clear, and the public repo never sees their names.
- History and versions: every version stays in the bucket until a manual `gc`. Git history of the manifest shows what changed when. Supabase itself has no versioning, which is why the paths are content hashes.
- Keys: use Supabase's S3 access keys, which only reach Storage, not the service role key, which can also read and write the database.
- Setup: about half a day. That covers the project, two buckets, keys in .env, the sync script with its manifest, the pre-commit hook, and a first upload of about 8 GB.

### B. Git LFS on GitHub

- How it works: `git lfs track "*.png"` and so on. Git keeps small pointer files, and GitHub keeps the content.
- Cost: 10 GiB storage and 10 GiB download a month are free. Past that GitHub bills per GiB (about $0.07 a GiB a month for storage and about $0.09 a GiB downloaded; check the pricing calculator). About $0 at 10 GB, and about $3 a month at 50 GB plus downloads. One fresh clone of 50 GB costs about $4 in bandwidth.
- Agents: the least new tooling. `git add` and `git commit` work as now once the patterns are set.
- Game and bible: the bible works from disk. Pages built from a branch serves the pointer files, not the images, so anything the game loads has to stay out of LFS, or Pages has to move to a GitHub Actions build.
- Private files: not possible. LFS files in a public repo are public.
- History and versions: every version of every file is kept and billed forever. You can't delete an LFS object from GitHub without deleting the whole repo. Screenshots committed through LFS would still cost storage every month.
- Setup: an hour for new files. Moving the existing 983 MB into LFS means rewriting all history (`git lfs migrate`), with the risks in section 4.

### C. Cloudflare R2 or Backblaze B2 with rclone

- How it works: the same manifest and sync script as A, pointed at R2 or B2 instead of Supabase. rclone does the transfers.
- Cost: R2 is $0.015 a GB a month with the first 10 GB free and no download fees, so $0 at 10 GB and $0.60 a month at 50 GB. B2 is $6 a TB a month with free download up to three times what you store, so $0.06 at 10 GB and $0.30 at 50 GB.
- Agents, game, bible, private files: as in A. rclone crypt for the private bucket.
- History and versions: as in A (content-hash paths). B2 can also keep old versions of overwritten files by itself.
- Setup: as in A, plus a new account and a card with Cloudflare or Backblaze.

### D. Heavy files stay on the local disk, with an encrypted backup

- How it works: heavy folders are git-ignored and stay where they are. restic takes an encrypted snapshot of the whole repo folder (including ignored files and island/private) every night to B2 or R2, and keeps daily and weekly versions. Optionally the same manifest of paths and checksums in git, so a commit still records which asset versions it used.
- Cost: $0 for the disk. The backup is under $1 a month at 50 GB on B2 or R2.
- Agents: nothing to run. The pre-commit hook still refuses binaries.
- Game and bible: unchanged, because everything is on this disk.
- Private files: in the encrypted backup with everything else. The provider only sees encrypted chunks.
- History and versions: restic snapshots, which you restore by date, not by commit. A clone on any other machine (a laptop, a cloud agent) has no assets until you restore a snapshot.
- Setup: about an hour. The second 1.9 TB NVMe (nvme1n1, not mounted now) could hold a local copy as well, if it's free to use.

### Summary

| | A. Supabase | B. Git LFS | C. R2 / B2 | D. Local + backup |
|---|---|---|---|---|
| Monthly cost, 10 GB | ~$10 (new project) | ~$0 | $0 / $0.06 | < $0.10 |
| Monthly cost, 50 GB | ~$10 | ~$3 + downloads | $0.60 / $0.30 | < $1 |
| Private rewards | yes (encrypted bucket) | no | yes (encrypted bucket) | yes (encrypted backup) |
| Asset version per commit | yes | yes | yes | only with the optional manifest |
| Works from a fresh clone | `sync pull` | yes | `sync pull` | restore a snapshot |
| New accounts | none (org exists) | none | Cloudflare or Backblaze | Backblaze or Cloudflare |
| Setup | half a day | an hour, plus a history rewrite for old files | half a day | an hour |

## 4. Recommendation

A, Supabase, as planned. It was already chosen and paid for, the org needs no new account, the 100 GB included covers well over a year at the measured rate, and the S3 API means we can move to R2 later by changing one config if the $10 a month for a third project isn't worth it. The content-hash layout gives us versions without relying on the provider, and the private bucket is encrypted before upload.

If $10 a month for this is not worth it, C on R2 is the same design for under $1 a month.

B is ruled out by the reward pictures and by never being able to delete anything. D is the simplest and cheapest, but it leaves assets tied to this one machine.

## 5. What stops being committed

When the chosen option is in place:

- game3d/shots/: screenshots are output, not source. They get ignored and stay local, and a cleanup deletes ones older than 14 days. A screenshot that a review, doc or bible page links to goes through the sync like any other asset. game3d/qa/ is already ignored.
- game3d/assets/portrait-candidates/ and every other candidate folder (art/parts/candidates, the contact sheets): these go through the sync, and git keeps the manifest entry.
- art/company, legacy/proto2 and the other legacy media: through the sync, since they're reference only.
- Meshy originals, .blend files, music masters, art/production: through the sync (they are ignored today and have no backup).
- Stays in git: code, story, docs, JSON, the bible and reviews text, and the approved files the game loads at runtime (about 24 MB now). A pre-commit hook checks this list, so a new runtime folder has to be added on purpose.

The Pages switch to the gh-pages branch (game3d/tools/deploy-pages.sh, already written and waiting on a GitHub setting) should go with this. Right now Pages publishes the whole main branch, which is near Pages' 1 GB limit.

## 6. The history we already have

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

## 7. The bible and reviews in git

Once heavy files go through the sync, yes: commit bible/ (without bible/shots, which goes through the sync) and reviews/ to this repo. Together that's under 1 MB of text, and 21 review files are tracked already. It does make his review comments (feedback.json) and the bible's story and cast notes public, as the game source already is. The private bible stays in island/private/bible/, which is ignored. This replaces the question in bible-in-git.
