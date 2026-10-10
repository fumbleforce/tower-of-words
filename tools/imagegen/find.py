"""Look up a dashboard picture by its number (#n): python3 tools/imagegen/find.py 1235 [1236 ...]
Prints where the file is, who made it, its verdict and its prompt, so a picture Jørgen names in chat can be found."""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import store  # noqa: E402

rows = {r.get('n'): r for r in store.log_read()}
for a in sys.argv[1:]:
    r = rows.get(int(a.lstrip('#')))
    if not r:
        print(f'#{a}: not found')
        continue
    path = r.get('out_path') or os.path.join(store.OUTPUTS, r.get('file') or '')
    verdict = 'rejected: ' + (r.get('reject_reason') or '') if r.get('reject') else ('starred' if r.get('star') else 'no verdict')
    print(f"#{r['n']}  {path}\n  by {r.get('owner') or 'dashboard'}, {r.get('at', '')}, seed {r.get('seed')}, {verdict}\n  {(r.get('positive') or '')[:400]}")
