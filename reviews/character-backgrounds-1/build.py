"""Round 1 is frozen after feedback. Rebuild the current round 2 reader instead.

This compatibility entry point preserves the old command without overwriting the
historical reader or either round's Review metadata.
"""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).resolve().parents[1] / "character-backgrounds-2" / "build.py"), run_name="__main__")
