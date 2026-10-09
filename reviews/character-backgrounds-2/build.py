"""Build the current reader. The round-two reader is an archived snapshot."""
from pathlib import Path
import subprocess
import sys
subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / "character-backgrounds-3" / "build.py"), *sys.argv[1:]], check=True)
