#!/bin/sh
# Subset Zen Kaku Gothic New (OFL) to the characters the game uses. Rerun after the story files change.
set -e
cd "$(dirname "$0")/.."
mkdir -p fonts
python3 - <<'EOF' > /tmp/g3chars.txt
import glob, string
chars = set(string.printable) | set('ōāūēīÖÆØÅæøå’‘“”…·→←▲▼♥')
for f in glob.glob('js/**/*.js', recursive=True) + glob.glob('story/**/*.js', recursive=True) + ['index.html']:
    chars |= set(open(f, encoding='utf8').read())
print(''.join(sorted(c for c in chars if c.isprintable())))
EOF
SUB=$HOME/ai/opening/venv/bin/pyftsubset
$SUB "$HOME/repo/anime/assets/fonts/ZenKakuGothicNew-Medium.ttf" --text-file=/tmp/g3chars.txt --flavor=woff2 --output-file=fonts/zkg-medium.woff2 --layout-features='*'
$SUB "$HOME/repo/anime/assets/fonts/ZenKakuGothicNew-Bold.ttf" --text-file=/tmp/g3chars.txt --flavor=woff2 --output-file=fonts/zkg-bold.woff2 --layout-features='*'
ls -la fonts
