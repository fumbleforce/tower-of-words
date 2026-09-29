# Feedback log

Jørgen's messages to Claude Code, word for word, one file per day (`YYYY-MM-DD.md`), each with its time and session id. Quote from here instead of retelling his feedback.

A UserPromptSubmit hook writes it (`.claude/hooks/feedback_log.py`, set up in `.claude/settings.json`). The hook skips prompts that are only a slash command and never changes or blocks a prompt. A second hook (`.claude/hooks/review_new.py`) adds "New Review answers: <ids>" to the session's context when `tools/review.py list` shows NEW feedback, once per answer per session.

Feedback he sends from the game's feedback window (F8, docs/game/controls-and-ui.md) is logged here too, as an entry headed "in the game" that names its folder in notes/feedback-game/ (text.md, context.json, and shot.png, which is git-ignored). tools/review_server.py writes both. A third hook (`.claude/hooks/game_feedback_new.py`) puts each new one, with its text, into the next prompt's context, once.

The files are tracked but not committed after every message. Commit them with other work.

To turn the hooks off: remove their entries from `.claude/settings.json`, or put `"disableAllHooks": true` in `.claude/settings.local.json` (that turns off every hook), or use `/hooks` in Claude Code.
