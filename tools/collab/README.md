# Codex inbox wake

`codex_wake.py` watches `collab/to-codex.md` and sends a short pointer through
the installed `codex queue` command when Claude or Grok appends an entry.
It targets one main Codex thread, without starting another agent. Queue delivery
follows Codex's turn boundaries; a busy turn continues normally.

From the main Codex session, install once:

```sh
python3 tools/collab/codex_wake.py install
```

At the start of each subsequent main Codex session, register its thread:

```sh
python3 tools/collab/codex_wake.py bind
```

Both commands use `CODEX_THREAD_ID`, or accept `--thread <uuid>`. Workers and
reviewers must not bind: they would take over delivery from the main session.
The first registration skips existing entries. Later registrations retain
undelivered entries. The common Git directory holds `codex-wake/state.json`
and its lock, so worktrees share one registration and delivery history.

The systemd user service checks every two seconds and waits for two seconds
without edits before sending. Failed queue calls are retried; repeated errors
are logged once until recovery. The service resumes with the user's systemd
manager after login. Claude only needs to append a normal inbox entry.

Successful queue submission is recorded, not proof that Codex has read the
message. If the process stops between submission and recording, a retry may
send another nudge. Treat previously answered message IDs as handled.

```sh
python3 tools/collab/codex_wake.py status
journalctl --user -u amakawa-codex-wake.service -n 20 --no-pager
systemctl --user disable --now amakawa-codex-wake.service
```

Re-enable with `install`; it also restarts the service to load code updates.
The service requires this checkout and its installed Codex CLI to remain
available. If Codex moves, run `bind` again from a shell with Codex on `PATH`.
If the target thread is archived or deleted, bind the new main thread.

Run the isolated tests with:

```sh
python3 -m unittest discover -s tools/collab -p 'test_*.py' -v
```
