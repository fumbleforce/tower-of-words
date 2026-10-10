# Train discoveries review

This page uses the [day-1 passage viewer](../day1-frames/README.md) and its stylesheet. The HTML sets `data-review-id="train-discoveries-1"` for its feedback endpoint and browser draft key, and `data-show-ids="true"` to show each proposal’s ID. Existing day-1 pages keep their defaults.

`frames.json` supplies complete original and proposed passages, with optional `titles: ["Original", "Proposed"]` per change. Its paths and `feedback.json` resolve beside this page, even though the viewer module is shared. Source excerpts and proposals belong in the data, not in the UI module.

The shared viewer saves to `/api/review/train-discoveries-1`. Picked IDs apply the proposed version; `options[id].reject` keeps the original. Smoke checks intercept the POST and never write real feedback.
