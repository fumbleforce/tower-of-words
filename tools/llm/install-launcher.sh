#!/usr/bin/env bash
# Register the amakawa:// link so the game's "Start it on this PC" button runs amakawa-llm.sh (Linux, per user).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$APPS"
cat > "$APPS/amakawa-llm.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=Amakawa local AI
Exec=$DIR/amakawa-llm.sh %u
NoDisplay=true
Terminal=false
MimeType=x-scheme-handler/amakawa;
DESK
xdg-mime default amakawa-llm.desktop x-scheme-handler/amakawa
update-desktop-database "$APPS" 2>/dev/null || true
echo "registered amakawa:// → $DIR/amakawa-llm.sh"
