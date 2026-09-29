"""Write build.json: a build id (UTC time + short commit) and the list of modules the page version-maps.
build.json is generated and git-ignored. Whatever serves or loads the game stamps it first (./start, the review
server, the browser tools, deploy-pages.sh, push.sh), so there is nothing to run before a commit.
  python3 game3d/tools/stamp.py              always write a fresh id
  python3 game3d/tools/stamp.py --if-stale   only when build.json is missing, names another commit or lists other modules"""
import json, os, subprocess, datetime, glob, sys
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
out = os.path.join(root, 'build.json')
try: commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=root).stdout.strip()
except Exception: commit = ''
files = sorted(os.path.relpath(p, root).replace(os.sep, '/') for p in glob.glob(os.path.join(root, 'js', '**', '*.js'), recursive=True) + glob.glob(os.path.join(root, 'story', '**', '*.js'), recursive=True))
if '--if-stale' in sys.argv[1:]:
    try:
        old = json.load(open(out))
        if old.get('files') == files and (not commit or str(old.get('id', '')).endswith('-' + commit)):
            print(old['id'], len(files), 'modules (current)'); sys.exit(0)
    except (OSError, ValueError): pass
bid = datetime.datetime.now(datetime.timezone.utc).strftime('%m%d-%H%M') + ('-' + commit if commit else '')
tmp = f'{out}.{os.getpid()}.tmp'
with open(tmp, 'w') as f: json.dump({'id': bid, 'files': files}, f, indent=0)
os.replace(tmp, out)
print(bid, len(files), 'modules')
