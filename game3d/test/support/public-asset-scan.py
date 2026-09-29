import builtins
import os
import runpy
import sys

from pathlib import Path

root = str(Path(__file__).resolve().parents[3])
output = sys.argv[1]
sys.path.insert(0, root + '/tools/assets')
sys.argv = ['scan.py', '--no-thumbs']

def guarded(function):
    def call(path, *args, **kwargs):
        if not isinstance(path, int):
            value = os.path.abspath(os.fsdecode(path))
            if '/island/private/' in value or value.endswith('/island/private') or value.endswith('/manifest.user.json'):
                raise RuntimeError('Private path access refused before filesystem access')
        return function(path, *args, **kwargs)
    return call

builtins.open = guarded(builtins.open)
os.stat = guarded(os.stat)
os.listdir = guarded(os.listdir)
os.scandir = guarded(os.scandir)
namespace = runpy.run_path(root + '/tools/assets/scan.py', run_name='codex_asset_probe')
namespace['main'].__globals__['OUT'] = output
namespace['main']()
