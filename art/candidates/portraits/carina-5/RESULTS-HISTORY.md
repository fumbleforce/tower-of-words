# Carina 5 result records

`results.local-before-cleanup.json` preserves the exact local edits found on 2026-10-13. It names earlier render sources, omits twelve final-image fields and has different notes for entries 5 and 11.

`results.json` retains the previously committed render sources because `sheet.py` reads these names from `rooted/`. The local record names twelve files that are absent there. Both records are retained without treating the cleanup as a new art selection.

`sheet.py` writes final-image fields after making the sheet. This cleanup did not rerun it.
