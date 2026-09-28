"""Write build.json: a build id (UTC time + short commit) and the list of modules the page version-maps.
Run before every commit: python3 game3d/tools/stamp.py"""
import json, os, subprocess, datetime, glob
root = os.path.join(os.path.dirname(__file__), '..')
try: commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=root).stdout.strip()
except Exception: commit = ''
bid = datetime.datetime.now(datetime.timezone.utc).strftime('%m%d-%H%M') + ('-' + commit if commit else '')
files = sorted(os.path.relpath(p, root).replace(os.sep, '/') for p in glob.glob(os.path.join(root, 'js', '**', '*.js'), recursive=True) + glob.glob(os.path.join(root, 'story', '**', '*.js'), recursive=True))
json.dump({'id': bid, 'files': files}, open(os.path.join(root, 'build.json'), 'w'), indent=0)
print(bid, len(files), 'modules')
