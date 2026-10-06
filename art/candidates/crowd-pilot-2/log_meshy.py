"""Copy this round's Meshy credits (reviews/crowd-pilot-2/credits.json) into the main checkout's live ledger,
tools/spend.json, as credit entries (est $0, since Meshy is paid in credits): one line per task, skipped if its task id
is already there.
  python3 art/candidates/crowd-pilot-2/log_meshy.py
"""
import datetime, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
LEDGER = '/home/jorgen/repo/japanese/tools/spend.json'
credits = json.load(open(f'{ROOT}/reviews/crowd-pilot-2/credits.json'))
d = json.load(open(LEDGER))
seen = {c.get('task') for c in d['calls']}
now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
n = 0
for e in credits:
    if e['task'] in seen:
        continue
    d['calls'].append({'t': now, 'model': 'meshy', 'est': 0, 'credits': e['credits'], 'task': e['task'],
                       'out': f"art/parts/crowd-pilot-2/meshy/{e['part']}", 'prompt': f"crowd-pilot-2 {e['part']}"})
    n += 1
json.dump(d, open(LEDGER, 'w'), indent=1)
print(n, 'entries,', sum(e['credits'] for e in credits), 'credits this round')
