# Showcase

The Showcase log in the world bible (http://127.0.0.1:8771/bible/#showcase) is where finished work Jørgen can see goes: a place built, a scene staged, a screen redone. He can flag anything and comment on an entry or on a single picture, but there is nothing to pick. Anything he has to decide goes to Review instead (reviews/README.md).

## Adding an entry

1. Make a folder `showcase/<id>/`. The id is lower case letters, digits and hyphens, for example `town-places-1`.
2. Put images anywhere in the repo that the server can reach and that stays on this machine (game3d/shots/<job>/ for game captures), or under bible/shots/showcase/<id>/ to have them backed up by `python3 tools/assets/sync.py push` (commit tools/assets/assets.lock.json with the entry). Don't commit binaries.
3. Write `showcase/<id>/entry.json`:

```json
{
  "title": "Town places, first pass",
  "date": "2026-09-30",
  "by": "claude-agent:town-places",
  "caption": "One plain line: what is new and where to see it.",
  "commit": "abc1234",
  "sections": [
    {"title": "Station forecourt", "caption": "One plain line.",
     "images": [{"id": "forecourt-arrive-desk", "image": "game3d/shots/town/forecourt-desk.webp", "caption": "Arriving, desktop"}]}
  ],
  "links": [{"label": "Play it", "href": "game3d/"}]
}
```

- `commit` is optional and may be a list of commits. `links` is optional; a relative `href` is from the repo root.
- An entry without sections can use a top-level `images` list of the same image objects instead (or as well; those show first).
- Image `id`s must be unique within the entry: his feedback is keyed by them.
- Paths are relative to the repo root.

4. Check it: `node tools/bible/check.mjs` renders every entry and fails on an image path that doesn't resolve or a repeated image id.

Entries start collapsed with the title, caption and one preview; Show details opens the section list, links and feedback; each section expands to its full image set. A direct entry link opens its details. Set optional `preview` to an image id to choose the summary picture; otherwise it uses the first image. All images remain in their original order inside the entry.

Entries are listed newest first by their latest content timestamp, with id as a stable tie-breaker. `date` remains the authored date label. An optional ISO 8601 `updated` timestamp (including time zone) records a new round. `tools/bible/showcase_dates.py` derives historical times from the latest Git commit touching each public `entry.json`; feedback never bumps an entry. The local review server also uses the actual modification time for uncommitted entry changes. `./start` refreshes the static fallback, and public-site staging rebuilds it from committed HEAD. For a plain static server after editing entries, run `python3 tools/bible/showcase_dates.py --local`.

## Reading his feedback

He presses Send on an entry and the page saves `showcase/<id>/feedback.json` through tools/review_server.py (POST /api/showcase/<id>, local only); from the public site it goes through a GitHub issue (reviews/README.md, "Answering from the public site"). Earlier sends are kept in its `history`. Its shape:

```json
{"sent": "2026-09-30T12:00:00+0200", "flag": false, "comment": "about the whole entry",
 "items": {"forecourt-arrive-desk": {"flag": true, "comment": "..."}}, "read": false, "history": [earlier sends]}
```

```
python3 tools/review.py list                      # showcase rows too; NEW means nobody has read it
python3 tools/review.py show <id>                 # the entry and his flags and comments (or showcase/<id>)
python3 tools/review.py mark-read <id>            # after acting on it
```

The "New Review/Showcase answers" line at the start of a Claude turn (.claude/hooks/review_new.py) announces new feedback here too.
