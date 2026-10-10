# Content pack format

The desktop release keeps the game's files in one encrypted file, `content.pak`, so they can't be opened by unzipping the app or browsing its folder (Jørgen, 2026-10-10: "We encrypt the assets so they cant easily just be opened up, being mindful of runtime performance."). Issue #421.

- `source.mjs`: `openDir(root)` serves a plain folder (development); `openPak(file, key)` serves a pack (release). Both give `has`, `list`, `stat`, `read` and `stream(path, {start, end})`, where `end` is inclusive like an HTTP Range. The shell (#420) codes against this object only. `openPak` is synchronous and also has `close()`.
- `pack.mjs`: `node desktop/pak/pack.mjs --list files.json --out content.pak [--zstd]`, where files.json is `[{src, dest}]` (#419 writes the list). Same inputs and key give the same bytes.
- `key.mjs`: the build key is `DESKTOP_PAK_KEY` (64 hex characters) or `desktop/.key`, created with a random key on first use. `desktop/.key` is git-ignored. Back it up: a pack is unreadable without its key.
- `bench.mjs`: the benchmark below. Tests: `game3d/test/unit/desktop-pak.test.mjs` (part of `npm test`).

## Layout

```
header   32 bytes   "AMKWPAK1" | version u32 = 1 | chunk size u32 = 65536 | key check (16)
blobs               one per distinct file content, back to back
index               AES-256-GCM sealed JSON
trailer  48 bytes   index offset u64 | index length u32 | index nonce (12) | index tag (16) | "AMKWEND1"
```

All integers are big-endian. The open order is: header magic and version, key check, trailer magic, then the index offset must equal file size minus index and trailer, then the index must authenticate, then every entry must lie inside the blob area. Each failure has its own error code (`PakError.code`): `PAK_NOT_A_PACK`, `PAK_VERSION`, `PAK_WRONG_KEY`, `PAK_TRUNCATED`, `PAK_CORRUPT`. A chunk that fails authentication while being read throws (or errors the stream with) `PAK_CORRUPT`; no unauthenticated byte is ever returned. A missing path is `PAK_NOT_FOUND`, a bad key string `PAK_BAD_KEY`.

**Keys.** HKDF-SHA256 turns the 32-byte master key into four subkeys (info `amakawa-pak v1 content|index|nonce|check`). The key check in the header is the first 16 bytes of HMAC(check key, "key check"); it only exists to tell "wrong key" apart from "corrupt index".

**Blobs.** A file's stored bytes are cut into 64 KB chunks (the last one shorter). Chunk *i* is sealed with AES-256-GCM under the content key and the nonce `prefix (8 bytes) | i (u32)`, and written as ciphertext followed by its 16-byte tag. The prefix is the first 8 bytes of HMAC-SHA256(nonce key, stored bytes). Chunk *i* of a blob is at `offset + i × (65536 + 16)`, so a range read goes straight to the chunks it needs. An empty file has no chunks.

**Nonces.** Deriving the prefix from the content makes packing deterministic without ever reusing a nonce on different data: two different contents get different prefixes (64-bit, collision chance negligible for any number of files we'll ever ship), and the chunk number separates chunks within one blob. Equal contents get the same prefix and the same ciphertext, so the packer stores them once and points both paths at one blob. Moving a chunk to another position or another file breaks its tag, because the index (authenticated) says which prefix and position each blob has.

**Index.** JSON `{v, chunk, files: {path: [offset, size, storedSize, prefixHex, mimeType, zstd]}}`, sealed with the index key. Its nonce is the first 12 bytes of HMAC(index key, the JSON), so it too is deterministic and different whenever the index differs. Without the key the pack shows only its total size and the index length; no path, size, type or count.

**Compression.** Off by default. With `--zstd`, text files (JS, JSON, CSS, HTML, SVG and the like) are stored zstd-compressed (level 19) when that saves at least an eighth; a compressed file is decompressed whole on read, and ranges are cut from that. Images, audio, video and fonts are never compressed again. The benchmark shows zstd making startup slower (26.5 ms against 13.3 ms warm), so it is only worth it to shrink the installer: an encrypted pack doesn't compress, and zstd took the game3d/ pack from 211 MB to 194 MB.

## Why GCM over 64 KB chunks

The brief allowed AES-CTR with per-file nonces or GCM over fixed chunks. CTR can't tell a wrong key or a flipped bit from real data, so a corrupt pack would hand the game garbage; GCM per chunk refuses it. On this machine (Ryzen 9 9950X3D, Node 24.21, AES-NI) both modes decrypt at about the same speed once chunks reach 64 KB: GCM 3.8 GB/s, CTR 2.6 GB/s in one run (they trade places run to run). At 16 KB, GCM drops to 1.3 GB/s from per-call overhead, so 64 KB is the smallest chunk without that cost. It costs 16 bytes of tag per 64 KB (0.02 %) and means a 1 MB range decrypts at most 17 chunks. Only Node's built-in crypto is used.

## Benchmark

`node desktop/pak/bench.mjs --rounds 9`, 2026-10-10, on game3d/ without shots/ (4548 files, 211 MB), load average around 8. "Cold" drops the page cache of the files involved (posix_fadvise) before each run; directory metadata stays cached, which flatters the plain folder.

| | plain files | pak (default) | pak with --zstd |
| --- | --- | --- | --- |
| Pack all 211 MB | | 0.58 s | 3.8 s |
| Open (header, trailer, index) | | 3.0 ms | 6.8 ms |
| Startup set via read(), warm | 17.9 ms | 13.3 ms | 26.5 ms |
| Startup set via read(), cold | 42.8 ms | 14.0 ms | 24.6 ms |
| Startup set via stream(), warm | 25.4 ms | 18.2 ms | 28.7 ms |
| Startup set via stream(), cold | 44.9 ms | 18.6 ms | 27.0 ms |
| Random 1 MB range, warm, mean / p95 | 0.51 / 1.52 ms | 0.64 / 1.60 ms | 0.64 / 1.66 ms |
| Random 1 MB range, cold start, mean / p95 | 0.84 / 2.32 ms | 0.74 / 1.80 ms | 0.70 / 1.71 ms |
| Stream the 27.7 MB opening film, warm | 1330-3270 MB/s | 1810-2070 MB/s | 1520-2030 MB/s |
| Stream the 27.7 MB opening film, cold | 760-850 MB/s | 790-920 MB/s | 680-880 MB/s |

The startup set is the 991 modules game3d/build.json lists (5.0 MB), all requested at once. The pack is faster than plain files there, warm and cold, because one open file and one positioned read per module beat 991 opens; the 10 % budget holds with room to spare. A 1 MB range costs about 0.1 ms more decrypting when warm, and less than plain files when cold. Streaming stays far above anything the film needs (it plays at under 1 MB/s). Throughput ranges are across three runs; warm streaming varies a lot run to run on both sides.

Memory: a stream holds at most one batch of 16 chunks (1 MB plus tags) at a time and reads the next batch only when the consumer pulls, so serving a range or the whole film never loads the file. The unit test checks that the largest disk read for a long range is one batch. `read()` returns a whole file by definition; the shell should use `stream()` for media.

## What this protects against, and what it doesn't

It stops someone who unzips the installer, opens the app folder or the asar, or runs an asset ripper over it: they find one file of random bytes with no names, types or sizes. They can't edit or swap content either, because every chunk and the index are authenticated.

It does not stop a determined person. The key has to be in the app for the app to read the pack, so anyone who reverse-engineers the main process, attaches a debugger, dumps memory, or hooks the app:// protocol handler gets every file. Textures, meshes and audio can also be captured from the running game with GPU or audio capture tools no matter how they were stored. This is the same level of protection as most commercial games' asset archives: it raises the effort from "double-click" to "reverse-engineer the program".

## Keeping the key out of easy reach (for #420)

These cost nothing at runtime, or a few microseconds once at startup:

1. Don't ship the key as one hex string. At build time, split it into two or three random XOR shares and put them in different main-process modules; join them once just before `openPak`. A `strings` search for 64 hex characters then finds nothing.
2. Bundle and minify the main process so the shares and the call site have no telling names, and never pass the key to the preload or renderer; they only see bytes through app://.
3. Lean on #420's Electron hardening, which is what makes the key hard to reach: fuses `RunAsNode`, `EnableNodeOptionsEnvironmentVariable` and `EnableNodeCliInspectArguments` off, `EnableEmbeddedAsarIntegrityValidation` and `OnlyLoadAppFromAsar` on, and no DevTools in release builds. Without those, someone can start the app with `--inspect` or patch main.js to dump the files, and no key hiding helps.
4. Use a new key per release (set `DESKTOP_PAK_KEY` from the release job, or delete `desktop/.key`). A key pulled from one version then doesn't open the next.
5. Optionally, compile the main-process bundle to V8 bytecode (for example with bytenode), which hides the share-joining code from a casual read. It doesn't slow startup, but it ties the build to the exact Electron version.
