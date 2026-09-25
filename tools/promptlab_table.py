"""Summarise prompt-lab verdicts: pass rate and mean scores per batch/variant (the seed is dropped from the name)."""
import json, os, re, sys, collections
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'production', 'promptlab')


def table(prefix=''):
    v = json.load(open(os.path.join(OUT, 'verdicts.json')))
    rows = collections.OrderedDict()
    for f in sorted(v):
        if not f.startswith(prefix):
            continue
        key = re.sub(r'-\d+\.png$', '', f)
        r = rows.setdefault(key, {'n': 0, 'pass': 0, 'look': 0, 'ref': 0, 'match': 0})
        x = v[f]
        r['n'] += 1; r['pass'] += bool(x['pass']); r['look'] += x.get('look', 0); r['ref'] += x.get('ref', 0); r['match'] += x.get('match', 0)
    return rows


if __name__ == '__main__':
    for k, r in table(sys.argv[1] if len(sys.argv) > 1 else '').items():
        n = r['n']
        print(f"{k:60s} {r['pass']}/{n}  look {r['look']/n:.1f}  ref {r['ref']/n:.1f}  match {r['match']/n:.1f}")
