# Feedback log

Jørgen's messages to Claude Code, word for word, one file per day (`YYYY-MM-DD.md`), each with its time and session id. Quote from here instead of retelling his feedback.

A UserPromptSubmit hook writes it (`.claude/hooks/feedback_log.py`, set up in `.claude/settings.json`). The hook skips prompts that are only a slash command and never changes or blocks a prompt. A second hook (`.claude/hooks/review_new.py`) adds "New Review answers: <ids>" to the session's context when `tools/review.py list` shows NEW feedback, once per answer per session.

The files are tracked but not committed after every message. Commit them with other work.

To turn the hooks off: remove their entries from `.claude/settings.json`, or put `"disableAllHooks": true` in `.claude/settings.local.json` (that turns off every hook), or use `/hooks` in Claude Code.
