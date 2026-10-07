# Continue restores the saved objective

Continuing a later-day save while browser onboarding storage is fresh could hide the saved objective. The title initially constructs the introductory train, which holds the goal. Continue restores the save and sets its goal while that hold is still active; the next update removes the hold, but previously never released the pending text.

The correction detects the held-to-unheld transition and calls the existing `ui.releaseGoal()` once. The introductory train still holds its goal until the normal onboarding transition. The behavior is documented in [controls and UI](../docs/game/controls-and-ui.md).

The [Showcase](../showcase/continue-goal-20261007/entry.json) preserves all three native diagnostic attempts. The first baseline encountered an unsafe checker predicate during reload and is explicitly failed. The corrected predicate then reproduced the actual bug: desktop saved goal text survived, but remained hidden with no page errors. That baseline intentionally stopped on the failing assertion, before phone. After the runtime correction, actual title Start, quick save and title Continue passed at 1366×860 and 390×844. Both retain the fresh-train hold and restore identical saved text visibly with an empty held buffer. The checker installs public route interception before navigation.

The independent source and image review found no blocking issue and accepted the bounded objective-visibility result at 8/10. Screens were captured during the UI fade and do not approve the entire opening layout. The review also checked the baseline failure and both passing viewports. All CPU gates passed, including 647 unit tests. Both full day-one routes then passed in 72 seconds, with no test overrides; their terminal screenshots were inspected. Original captures, reports and full-route evidence remain in `game3d/shots/continue-goal/` in the main checkout.

Source: `game3d/js/onboard.js`; repeatable native scenario: `game3d/tools/continue-goal-check.mjs`. Work item: #329. Research story and voice approval remain separate.
