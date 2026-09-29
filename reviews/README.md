# Review queue

Anything Jørgen needs to pick or judge goes here, not into a chat message. Each item is one folder, `reviews/<id>/`, and shows up in the bible under Review (http://127.0.0.1:8771/bible/#review), with the open count in the nav. He picks options, stars or rejects them, comments on each and on the whole, and presses Send. The page saves his answer to `reviews/<id>/feedback.json`.

To post a review item, write `reviews/<id>/review.json` as in Adding an item below (or use the post-review-item skill). To see which review items are open and what he answered, run `python3 tools/review.py list` (Reading his answers).

## Adding an item

1. Pick an id: lower case, digits and hyphens, unique (`kenji-concept`, `style-rough-2`). A new round is a new id, not an edit of the old one; mark the old one `superseded`.
2. Put the candidates anywhere in the repo (usually next to the work, e.g. `art/candidates/portraits/`). Paths in review.json are relative to the repo root. Show every attempt, including the ones you'd reject (GUIDE, Show every attempt). Animations and 3D models go up as a live viewer he can play and rotate, linked under `links`, not as stills or frame sheets (Jørgen, 2026-09-29: "i need to be able to see the live animation, not pictures of animation").
3. Write `reviews/<id>/review.json`:

```json
{
 "title": "Kenji concept round",
 "date": "2026-09-28",
 "by": "characters agent",
 "status": "open",
 "question": "Which direction is Kenji? One plain question, the way you'd ask it out loud.",
 "multi": true,
 "media": [
  {"image": "art/candidates/portraits/kenji-concept-sheet.png", "caption": "The whole round"},
  {"audio": "tools/voice-refs/eric-voice.wav", "caption": "Optional"}
 ],
 "options": [
  {"id": "a", "label": "a. Trains", "image": "path/to/a.webp", "images": ["path/to/a-2.webp"], "note": "One line, optional"},
  {"id": "b", "label": "b. Voice two", "audio": "path/to/b.wav"}
 ],
 "links": [{"label": "Try it in the game", "href": "game3d/?style=3"}]
}
```

| Field | Needed | Meaning |
|---|---|---|
| `title` | yes | Short name of the round. |
| `date` | yes | YYYY-MM-DD. The queue sorts newest first. |
| `by` | yes | Which agent made it. |
| `status` | yes | `open` (waiting for him), `decided`, or `superseded` (replaced by a newer item). |
| `question` | yes | One plain question. No exposition. |
| `options` | yes | What he can pick. `id` is what feedback refers to; `label` is shown on the card (use the pick id he'd name, e.g. `kenji-a-751`). Each has an `image`, extra `images`, or an `audio`, and an optional `note`. |
| `multi` | no | `true` (default) lets him pick several; `false` means one. |
| `media` | no | Context shown above the options (sheets, references, before/after). Each is `{image}` or `{audio}` with a `caption`. |
| `links` | no | Pages to open (a game URL with flags, a review page). |
| `decided` | when decided | The option ids that won. |
| `decision` | when decided | One line: what was decided, in his words where possible. |

4. Check it shows: open http://127.0.0.1:8771/bible/#review/<id>. Every image and audio path must resolve (`node tools/bible/check.mjs` checks them).
5. Tell the main agent the id. Don't paste the candidates into chat.

## Reading his answers

```
python3 tools/review.py list              # every item; NEW marks feedback nobody has read
python3 tools/review.py show <id>         # the question, options and his feedback (with earlier sends)
python3 tools/review.py mark-read <id>    # after acting on it; the page stops showing "new"
python3 tools/review.py set-status <id> decided --decision "b, with the city-pop jacket"
```

`feedback.json` is written only by the page through `tools/review_server.py` (POST /api/review/<id>, local only). Don't edit it by hand except through `review.py`. Its shape:

```json
{"sent": "2026-09-28T23:59:00+0200", "picked": ["b"], "options": {"b": {"star": true, "reject": false, "comment": "..."}},
 "comment": "overall comment", "read": false, "history": [ earlier sends ]}
```

When he has decided, set the item's `status` to `decided` with `decided` and `decision`, move the approved files where they belong (art/approved/, the game), and update GUIDE.md and bible/facts.yaml as usual.
