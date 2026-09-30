#!/bin/sh
# Run one of these Blender scripts headless: sh tools/creator/blender/bl.sh <script.py> [args...]
# Prints only the script's own lines (those starting with an upper-case tag) and errors.
here=$(dirname "$0")
script=$1; shift
BLENDER=${BLENDER:-$HOME/.local/bin/blender}
"$BLENDER" -b --factory-startup -P "$here/$script" -- "$@" 2>&1 | grep -E "^[A-Z]{3,}[ :]|Error|Traceback|^  File|line [0-9]+" | grep -v "^Blender quit"
exit 0
