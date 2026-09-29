# OpenViking trial (2026-09-29)

Jørgen asked to try [OpenViking](https://github.com/volcengine/OpenViking) (ByteDance's context database for agents: a `viking://` file tree with L0 abstract / L1 overview / L2 detail layers) for knowledge retrieval here. This note covers the setup, the measurements and a recommendation. The decision is in the Review queue: `reviews/openviking-trial`.

Short version: it runs fully local and it works, but on these 15 questions it answered fewer of them than a first-try ripgrep (10 vs 12), at about the same total token cost. The generated L0/L1 summaries describe files ("This document serves as...") and almost never hold the fact you asked for. It's stopped now. Everything is still on disk and starts again in 5 seconds.

## What was built

All of it lives outside the repo, in `~/ai/openviking/`. Nothing in the repo changed except this note and the review item.

| Part | What | Where |
|---|---|---|
| OpenViking | `openviking==0.4.22` (pinned), uv venv, Python 3.12, dev mode on 127.0.0.1:1933 (local only, no key) | `.venv/`, config `ov.conf`, data `data/` (26 MB) |
| Embeddings | bge-m3 Q8_0 GGUF (multilingual, 1024-dim) served by the existing llama.cpp build as an OpenAI-style endpoint on :8191, CPU only | `models/bge-m3-Q8_0.gguf` |
| L0/L1 summaries | gemma-4-12b (already in `~/ai/llm-models`) through llama.cpp on :8192. It runs only during an index build, under the GPU lock (owner `openviking-index`) | started and stopped by `ovctl index` |
| Index script | Copies the allowed repo files into `stage/`, renders each review's review.json + feedback.json as one Markdown file, and imports the tree to `viking://resources/amakawa` | `index.py` |
| Control script | start, stop, status, index | `ovctl` |
| Read-only MCP server | stdio proxy with only `find`, `read`, `overview`, `abstract`, `list`, `grep`, scoped to the index | `mcp_readonly.py` |
| Eval | the 15 questions below, OpenViking against ripgrep | `eval.py`, results in `eval-results.json` |

No paid API was used. OpenViking needs an embedding model and, for L0/L1, an LLM. Both run locally through OpenAI-compatible endpoints.

### What is indexed

GUIDE.md, TODO.md, docs/game/** , game3d/story/*.md, collab/*.md, notes/*.md (top level only, not legacy), art/PROMPTS.md, and reviews/*/review.json + feedback.json. That's 118 files. The script skips anything under island/private/ or legacy/, and anything `git check-ignore` reports. Each staged file starts with `Source: <repo path>`, so every hit can be traced back to the repo.

Tree: `guide/` (GUIDE, TODO), `facts/` (docs/game/*.md), `stories/` (docs/game/stories/*.md, plus `stories/engine-notes/` for game3d/story/*.md), `reviews/` (one file per review id), `collab/`, `notes/`, `art/` (PROMPTS). OpenViking splits every Markdown file into a directory of sections, which gives 588 nodes that each get a summary.

### Read-only

The repo stays the only source of truth, and nothing writes facts into the index:

- OpenViking's own `/mcp` endpoint also exposes `write`, `edit`, `forget`, `remember` and `add_resource`, so agents don't get it. They get `mcp_readonly.py`, which has read tools only and refuses URIs outside `viking://resources/amakawa`.
- OpenViking's Claude Code "memory plugin" isn't used. It captures conversation turns into OpenViking and injects recalled memories into every prompt, which is the opposite of a read-only index.
- `ovctl index --full` deletes the tree and rebuilds it from the repo files, so the index can always be thrown away.

## Commands

```
~/ai/openviking/ovctl start                 # embedder (CPU) + OpenViking; 5 s
~/ai/openviking/ovctl stop
~/ai/openviking/ovctl status
~/ai/openviking/ovctl index                 # refresh after commits: re-imports, changed files reprocessed; takes the GPU lock for summaries
~/ai/openviking/ovctl index --vectors-only  # refresh without the GPU: 37 s; summaries of changed parts go stale
~/ai/openviking/ovctl index --full          # rebuild from scratch (about 1 hour of GPU lock, see Cost)
```

Freshness: the index is a snapshot. It goes stale on every commit until you run `ovctl index`. If it's adopted, a post-commit hook could run the refresh (not installed; code freeze):

```sh
# .git/hooks/post-commit
~/ai/openviking/ovctl status | grep -q "server *up" && ~/ai/openviking/ovctl index --vectors-only >/dev/null 2>&1 &
```

### Connecting agents (not done)

Neither is configured, because the trial doesn't make the case for it. An `.mcp.json` pointing at a stopped server would give every session a failed MCP server. If it's adopted, these are the exact lines. There is no `.mcp.json` in the repo and no `[mcp_servers]` in `~/.codex/config.toml`, so both would be clean additions.

Claude Code, project scope (writes `.mcp.json`):

```
claude mcp add --scope project amakawa-index -- /home/jorgen/ai/openviking/.venv/bin/python /home/jorgen/ai/openviking/mcp_readonly.py
```

Codex, `~/.codex/config.toml`:

```toml
[mcp_servers.amakawa-index]
command = "/home/jorgen/ai/openviking/.venv/bin/python"
args = ["/home/jorgen/ai/openviking/mcp_readonly.py"]
```

The proxy was tested over stdio: it lists the six tools, `find` and `abstract` return results, and a URI outside the index is refused.

## Evaluation

Fifteen questions agents here need answered, each with the correct answer from the repo. For each one:

- **OpenViking**: `find` (limit 5) over the index. Tokens are counted on what the MCP proxy returns (URI, level, score, abstract cut to 400 characters). Then two follow-ups an agent would make: read the top file hit, or read each of the top 3 hits (the L2 section, or the L1 overview for a directory hit).
- **ripgrep**: the first pattern an agent would type, `rg -n -i`, over the same repo files. Tokens are the full output.
- **Answer in output**: a regex for the answer must match the text the agent actually got back. I checked the two borderline passes by hand and tightened them: open reviews and the Replicate cap. Both were matches on unrelated text.
- Tokens are counted with tiktoken cl100k (close to, but not exactly, Claude's count). Latency is wall time on this machine, with the index warm.

### Totals

| Method | Answer in output | Right source in top 3 | Tokens, median | Tokens, all 15 | Latency, median |
|---|---|---|---|---|---|
| OpenViking `find` only (L0/L2 abstracts) | 4/15 | 10/15 | 535 | 8,072 | 16 ms |
| `find` + read top hit | 8/15 | | 1,539 | 23,064 | 18 ms |
| `find` + read top 3 hits | 10/15 | | 3,570 | 54,419 | 21 ms |
| ripgrep, first pattern | 12/15 | right file among matches 14/15 | 1,662 | 54,389 | 4 ms |

### Per question

| # | Question | Correct answer (source) | OV right source in top 3 | OV answer: find / +top 1 / +top 3 | OV tokens: find / +1 / +3 | rg pattern | rg answer | rg tokens | rg files |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Is there a commute in the setting? | No; everyone lives on the island, no day starts with a commute (docs/game/setting.md) | yes | no / no / yes | 591 / 972 / 4390 | `commute` | yes | 2288 | 16 |
| 2 | What colour is Mio's hair? | Dark green bordering on black, lighter green underneath (docs/game/cast.md) | no | no / no / no | 517 / 1263 / 3180 | `Mio.*hair\|hair.*Mio` | yes | 3297 | 21 |
| 3 | Where does Eric eat lunch with Mio? | On the floor of the machine room (docs/game/stories/lunch.md) | yes | yes / yes / yes | 535 / 1547 / 4366 | `lunch` | yes | 11257 | 38 |
| 4 | What did Jørgen decide about the character creator bodies? | Round 1 rejected ("emaciated wrinkly corpses", let Codex make smooth simple models); round 2 (open): less mangled but should be angular low poly (reviews/creator-base-1, creator-base-2 feedback.json) | yes | no / no / yes | 411 / 1014 / 3273 | `creator.*bod\|base bod` | yes | 1662 | 9 |
| 5 | Which review items are open? | creator-base-2, creator-idle-neutral (reviews/*/review.json) | no | no / no / no | 534 / 1745 / 5447 | `"status": "open"` | yes | 38 | 2 |
| 6 | What Japanese words does day 1 teach? | gaijin, ohayo, yoroshiku, sumimasen, matte, akete, ugoite, tomatte or irete (the stories' Words taught tables) | no | no / no / no | 396 / 3173 / 3595 | `taught` | no | 8014 | 37 |
| 7 | Who leads story and dialogue writing? | Codex; Claude reviews as a cold reader (collab/PROTOCOL.md) | no | no / no / no | 510 / 935 / 2220 | `leads` | no | 1028 | 8 |
| 8 | How old is Mio? | 25 (docs/game/cast.md) | yes | no / yes / yes | 591 / 1539 / 4358 | `Mio.*\bage\b\|\bage\b.*Mio` | no | 41 | 1 |
| 9 | How do I take the GPU lock? | mkdir /tmp/claude-1000/gpu.lock, name in owner, rm -r only if yours (GUIDE.md) | yes | no / yes / yes | 549 / 1641 / 3314 | `gpu.lock\|GPU lock` | yes | 1344 | 9 |
| 10 | What must a commit message end with? | `Facts: docs/game/<file>` or `Facts: none` (GUIDE.md) | yes | no / yes / yes | 513 / 2065 / 4700 | `commit message` | yes | 243 | 4 |
| 11 | Why doesn't Eric's card work at the gate? | New card; registration starts at nine (docs/game/stories/gate-morning.md) | yes | no / yes / yes | 599 / 1145 / 3130 | `card` | yes | 12024 | 46 |
| 12 | What is the Replicate budget? | $20 total (GUIDE.md) | no | no / no / no | 643 / 1573 / 3570 | `Replicate` | yes | 649 | 5 |
| 13 | Who opened the B2 copier repair request, and when? | Mr. Mori, 1 April 1996 (docs/game/cast.md) | yes | yes / yes / yes | 611 / 1179 / 2714 | `copier` | yes | 10135 | 35 |
| 14 | What is Eric's job? | IT support engineer from Norway on a support contract (docs/game/setting.md) | yes | yes / yes / yes | 517 / 2185 / 4107 | `Eric.*job\|job.*Eric` | yes | 493 | 4 |
| 15 | Who is Tama? | A calico cat who rides the monorail (docs/game/cast.md) | yes | yes / yes / yes | 555 / 1088 / 2055 | `Tama` | yes | 1876 | 15 |

### What the numbers say

- The L0/L1 layers are the selling point, and they carried almost nothing. Gemma 12B wrote summaries like "This directory serves as a comprehensive character and identity reference guide for a game project, likely a visual novel". They name the topic but not the facts, so `find` alone answered 4 of 15. The root and `facts/` overviews are the same kind of text. docs/game/README.md's table already does this job better, by hand.
- Semantic search found the right file for plain-language questions whose words don't appear in the answer (lunch, gate card, copier). There ripgrep's first pattern pulled in 10 to 12k tokens across 35 to 46 files, and OpenViking found it in 1 to 1.5k. This is the one real win.
- It missed things a keyword finds at once: Mio's hair (art prompts about her glasses ranked higher than cast.md), the Replicate cap, and anything that's a filter or a list, like open reviews (`"status": "open"` is 38 tokens with rg) or the words taught across all storylines.
- Both failed on day 1's words and on the story lead. The first needs several files combined. For the second, the table row doesn't contain "leads", and search ranked the writing-contest review above PROTOCOL.md.
- Latency doesn't matter either way: 16 to 25 ms against 4 ms.
- Stale answers are a real risk. The index is a copy, and docs/game changes several times a day. A stale hit looks just as confident as a fresh one.

### Cost

- Full build: 63 minutes of GPU lock for 118 files (588 summary nodes). llama.cpp's `--fit` put part of Gemma in system RAM because the 3080 was shared (7 GB on the GPU, 12 cores busy), so it ran at 14 to 17 tokens/s per slot. With the whole model on the GPU it would be faster, but it's still a long hold on a shared card.
- Refresh without summaries: 37 s on CPU.
- Running permanently (for queries): the bge-m3 embedder, CPU only, about 5.8 GB RAM as configured (most of it buffers for the 32k context; a smaller context uses less, but then long chunks fail as described below). It uses little CPU when idle. Plus the OpenViking server at about 0.5 GB RAM. No GPU.
- Disk: 26 MB index, 606 MB model, 851 MB venv.

## Problems hit (fixed)

- The embedder first ran with 8k context over 4 slots (2k tokens each). One CODEX-WORK chunk (2,306 tokens) failed, so the context is now 32k. A `--vectors-only` refresh filled the gap.
- `ovctl` saved the pid of a subshell instead of llama-server. The first build's cleanup released the GPU lock while Gemma still held 7 GB of VRAM. I killed it by hand about a minute later. The script now `exec`s each server, so the pid is right, and it waits for the summarizer to exit before it releases the lock.

## Recommendation

Don't adopt it as the agents' main lookup. With a local 12B summarizer, the L0/L1 layers don't beat docs/game/README.md plus ripgrep, and the index adds a copy that goes stale. If the one win (plain-language questions that fan out under grep) is worth it, the cheaper option is adopt with changes: vectors only (no GPU, no summaries), the read-only proxy as an optional tool next to ripgrep, and a refresh after each commit.
