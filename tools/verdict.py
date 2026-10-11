"""Put your verdict on one of your renders in Jørgen's image gen dashboard (History viewer, its reject-reason field).

Every render tools/comfy.py run() saves is logged there as an agent render, and every dashboard job (a compose.mjs
recipe too) as a dashboard render. Name a render by its image path, its #n or its job id. Every attempt you reject gets
a one-line reason here (art/PROMPTS.md, Verdicts):

    python3 tools/verdict.py <image> --reject "hair came out teal, not dark green"
    python3 tools/verdict.py '#1971' --reject "belted blazer" --fault outfit      (a dashboard render, by number or job id)
    python3 tools/verdict.py <image> --keep "closest to the portrait; picked"      (clears a reject; the reason becomes the note)

or from Python: verdict.verdict(image_path, reject=True, reason='...'). Exit code 1 when the picture isn't logged.
The record is the dashboard render with that #n or job id; else the newest agent render with this image's repo path (a
worktree path counts as the repo's), preferring the one with this exact file; else a dashboard render whose job id or
file name is in the image's file name (compose.mjs --wait saves <recipe>-<job id>-s<seed>.png). It writes through the dashboard's store.py, under the same lock as the dashboard."""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy  # noqa: E402  (finds tools/imagegen, which isn't in git: the main checkout's copy)


def _imagegen():
    d = comfy._imagegen_tools_dir()
    if d is None:
        raise RuntimeError('tools/imagegen (the image gen dashboard) is not on this machine')
    if d not in sys.path:
        sys.path.append(d)
    from imagegen import agentlog, store
    return agentlog, store


def find_record(ref, rows, sha=None):
    """The log row `ref` names, or None. ref is '#n' or a bare number, a render/job id, or an image path."""
    live = [r for r in rows if not r.get('deleted')]
    ref = str(ref)
    if ref.lstrip('#').isdigit():
        return next((r for r in live if r.get('n') == int(ref.lstrip('#'))), None)
    by_id = [r for r in live if r.get('id') == ref]
    if by_id:
        return by_id[-1]
    agentlog, _ = _imagegen()
    out_path = agentlog.rel_path(ref)
    hits = [r for r in live if r.get('source') == 'agent' and r.get('out_path') == out_path]
    if hits:
        hits.sort(key=lambda r: (r.get('sha') == sha, r.get('at') or ''))
        return hits[-1]
    base = os.path.basename(ref)
    named = [r for r in live if r.get('source') != 'agent' and r.get('id')
             and (r['id'] in base or (r.get('file') and os.path.basename(r['file']) == base))]
    named.sort(key=lambda r: -len(r['id']))
    return named[0] if named else None


def verdict(image_path, reject, reason, faults=()):
    """reject=True sets the reject flag and the reason; reject=False clears it and keeps the reason as the note.
    image_path may also be '#n' or a job id. Returns the record id, or None when the picture isn't logged."""
    agentlog, store = _imagegen()
    sha = agentlog.file_sha(image_path) if os.path.isfile(image_path) else None
    reason = ' '.join((reason or '').split())
    with store._log_locked():
        row = find_record(image_path, store.log_read(), sha)
        if row is None:
            return None
        rid = row['id']
        fields = dict(reject=True, reject_reason=reason, star=False, fav=False) if reject else dict(reject=False, reject_reason='', note=reason)
        fields['faults'] = sorted(set(faults)) if reject else []
        fields['rated_at'] = store.now()
        store.log_set(rid, fields)
    return rid


FAULTS = ('hair-colour', 'eye-colour', 'identity', 'expression', 'lips', 'body', 'extra-limb', 'hands', 'outfit',
          'background', 'framing', 'text', 'seam', 'flat-style', 'staging', 'other')


def tally(round_dir):
    """Fault counts for one round, by pass (the r<N>- file prefix). A fault that shows up in two or more passes is
    flagged: rerolling hasn't fixed it, so the method has to change (Jørgen 2026-10-10: \"keep track of the specific
    type of failure it is getting so that it can take more concrete action and dont let the same error pile up\")."""
    import re
    from collections import defaultdict
    agentlog, store = _imagegen()
    base = agentlog.rel_path(round_dir).rstrip('/') + '/'
    # dashboard jobs name their recipe (compose.recipe = the recipe file's name); the pass is the number at its end
    rdir = os.path.join(round_dir, 'recipes')
    recipes = {os.path.splitext(f)[0] for f in os.listdir(rdir) if f.endswith('.json')} if os.path.isdir(rdir) else set()
    by = defaultdict(lambda: defaultdict(int))
    for r in store.log_read():
        if r.get('deleted'):
            continue
        if r.get('source') == 'agent':
            name = r.get('out_path') or ''
            if not name.startswith(base):
                continue
            m = re.match(r'r(\d+)', os.path.basename(name))
        else:
            name = ((r.get('compose') or {}).get('recipe')) or ''
            if name not in recipes:
                continue
            m = re.search(r'(\d+)$', name)
        for f in (r.get('faults') or []):
            by[f][int(m.group(1)) if m else 0] += 1
    repeated = []
    for f, passes in sorted(by.items(), key=lambda kv: -sum(kv[1].values())):
        flag = len(passes) >= 2
        repeated += [f] if flag else []
        print(f"{f:12} {sum(passes.values()):3}  passes {', '.join(str(p) for p in sorted(passes))}{'   REPEATED: change the method' if flag else ''}")
    return repeated


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--tally':
        sys.exit(2 if tally(sys.argv[2]) else 0)
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('image')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--reject', metavar='REASON', help='one line: what is wrong with it')
    g.add_argument('--keep', metavar='REASON', help='one line: why it stays')
    ap.add_argument('--fault', action='append', default=[], choices=FAULTS,
                    help='the type of failure (repeatable); --tally <round dir> counts them per pass')
    a = ap.parse_args()
    reject = a.reject is not None
    reason = a.reject if reject else a.keep
    if reject and not reason.strip():
        sys.exit('a rejected render needs its one-line reason')
    if reject and not a.fault:
        sys.exit('a rejected render needs at least one --fault type, so repeats can be counted')
    rid = verdict(a.image, reject, reason, a.fault)
    if rid is None:
        sys.exit(f'{a.image}: not in the dashboard log (name a comfy.py render by its path, a dashboard render by #n or job id)')
    print(f"{rid}: {'rejected' if reject else 'kept'}: {' '.join(reason.split())}")
