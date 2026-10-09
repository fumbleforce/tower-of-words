"""Put your verdict on one of your renders in Jørgen's image gen dashboard (History viewer, its reject-reason field).

Every render tools/comfy.py run() saves is logged there as an agent render. Every attempt you reject gets a one-line
reason here (art/PROMPTS.md, Verdicts):

    python3 tools/verdict.py <image> --reject "hair came out teal, not dark green"
    python3 tools/verdict.py <image> --keep "closest to the portrait; picked"      (clears a reject; the reason becomes the note)

or from Python: verdict.verdict(image_path, reject=True, reason='...'). Exit code 1 when the picture isn't logged.
The record is the newest agent render with this image's repo path (a worktree path counts as the repo's), preferring
the one with this exact file. It writes through the dashboard's store.py, under the same lock as the dashboard."""
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


def verdict(image_path, reject, reason):
    """reject=True sets the reject flag and the reason; reject=False clears it and keeps the reason as the note.
    Returns the record id, or None when the picture isn't logged."""
    agentlog, store = _imagegen()
    out_path = agentlog.rel_path(image_path)
    sha = agentlog.file_sha(image_path) if os.path.isfile(image_path) else None
    reason = ' '.join((reason or '').split())
    with store._log_locked():
        rows = [r for r in store.log_read()
                if r.get('source') == 'agent' and r.get('out_path') == out_path and not r.get('deleted')]
        if not rows:
            return None
        rows.sort(key=lambda r: (r.get('sha') == sha, r.get('at') or ''))
        rid = rows[-1]['id']
        fields = dict(reject=True, reject_reason=reason, star=False, fav=False) if reject else dict(reject=False, reject_reason='', note=reason)
        fields['rated_at'] = store.now()
        store.log_set(rid, fields)
    return rid


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('image')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--reject', metavar='REASON', help='one line: what is wrong with it')
    g.add_argument('--keep', metavar='REASON', help='one line: why it stays')
    a = ap.parse_args()
    reject = a.reject is not None
    reason = a.reject if reject else a.keep
    if reject and not reason.strip():
        sys.exit('a rejected render needs its one-line reason')
    rid = verdict(a.image, reject, reason)
    if rid is None:
        sys.exit(f'{a.image}: not in the dashboard log (only renders saved by tools/comfy.py run() are)')
    print(f"{rid}: {'rejected' if reject else 'kept'}: {' '.join(reason.split())}")
