#!/usr/bin/env python3
"""Estimate Claude usage from local Claude Code session logs.

The weekly limit's percentage isn't visible to the agent, so this calibrates against a reading
Jørgen takes from /usage: tools/usage.json holds {"reset": ISO time the week started,
"reading": {"time": ISO, "percent": N}}. Tokens are summed from every session log
(~/.claude/projects/**/*.jsonl, subagents included) since the week started; the percent per
token is taken from the reading, and the current percent is extrapolated from that.

  python3 tools/usage.py            # tokens since reset, estimated percent
  python3 tools/usage.py --since 2026-09-29T00:00:00+02:00
"""
import glob, json, os, sys
from datetime import datetime, timezone

ROOT = os.path.expanduser('~/.claude/projects')
CFG = os.path.join(os.path.dirname(__file__), 'usage.json')

# Weights so that one number tracks cost-like usage; cache reads are cheap, output is expensive.
W = {'input_tokens': 1.0, 'cache_creation_input_tokens': 1.25, 'cache_read_input_tokens': 0.1, 'output_tokens': 5.0}


def parse(t):
    return datetime.fromisoformat(t.replace('Z', '+00:00'))


def weighted_since(since):
    total, seen = 0.0, set()
    for path in glob.glob(os.path.join(ROOT, '**', '*.jsonl'), recursive=True):
        if os.path.getmtime(path) < since.timestamp():
            continue
        with open(path, errors='ignore') as f:
            for line in f:
                if '"usage"' not in line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                ts = rec.get('timestamp')
                msg = rec.get('message') or {}
                usage = msg.get('usage') if isinstance(msg, dict) else None
                if not ts or not usage or parse(ts) < since:
                    continue
                key = (msg.get('id'), rec.get('requestId'))
                if key in seen:
                    continue
                seen.add(key)
                total += sum(usage.get(k, 0) * w for k, w in W.items())
    return total


def main():
    cfg = json.load(open(CFG)) if os.path.exists(CFG) else {}
    since = None
    if '--since' in sys.argv:
        since = parse(sys.argv[sys.argv.index('--since') + 1])
    elif cfg.get('reset'):
        since = parse(cfg['reset'])
    else:
        sys.exit('Set "reset" in tools/usage.json (when the weekly limit last reset), or pass --since.')
    now_units = weighted_since(since)
    print(f'weighted usage since {since.isoformat()}: {now_units:,.0f}')
    r = cfg.get('reading')
    if r:
        units_at_reading = weighted_since_until(since, parse(r['time']))
        if units_at_reading > 0:
            est = r['percent'] * now_units / units_at_reading
            print(f'calibration: {r["percent"]}% at {r["time"]} ({units_at_reading:,.0f} units)')
            print(f'estimated weekly usage now: {est:.1f}%')


def weighted_since_until(since, until):
    total, seen = 0.0, set()
    for path in glob.glob(os.path.join(ROOT, '**', '*.jsonl'), recursive=True):
        if os.path.getmtime(path) < since.timestamp():
            continue
        with open(path, errors='ignore') as f:
            for line in f:
                if '"usage"' not in line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                ts = rec.get('timestamp')
                msg = rec.get('message') or {}
                usage = msg.get('usage') if isinstance(msg, dict) else None
                if not ts or not usage:
                    continue
                t = parse(ts)
                if t < since or t > until:
                    continue
                key = (msg.get('id'), rec.get('requestId'))
                if key in seen:
                    continue
                seen.add(key)
                total += sum(usage.get(k, 0) * w for k, w in W.items())
    return total


if __name__ == '__main__':
    main()
