"""The one place that says where tool state lives: ~/.cache/amakawa/<name>/, never inside .git.

    python3 tools/lib/cachedir.py pages-cache

prints the folder (creating it). Python tools import cache_dir(name) from this file. Where this rule
comes from and what the commit gate refuses is in ARCHITECTURE.md (Tool state).
"""
import os
import sys

ROOT_NAME = 'amakawa'


def cache_dir(name):
    """The folder for one kind of tool state, created on first use. The name is a plain folder name."""
    if not name or name in ('.', '..') or name.startswith('.') or os.sep in name or '/' in name:
        raise ValueError(f'cache folder name must be one plain name: {name!r}')
    path = os.path.join(os.path.expanduser('~'), '.cache', ROOT_NAME, name)
    os.makedirs(path, exist_ok=True)
    return path


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('usage: python3 tools/lib/cachedir.py <name>')
    print(cache_dir(sys.argv[1]))
