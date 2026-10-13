"""Exercise stop only against fake servers in isolated temporary checkouts."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class StopTest(unittest.TestCase):
    def test_checkout_port_and_script_are_exact(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            processes = []
            try:
                for name in ("one", "two"):
                    checkout = root / name
                    (checkout / "tools").mkdir(parents=True)
                    (checkout / "other").mkdir()
                    shutil.copyfile(Path(__file__).resolve().parents[1] / "stop", checkout / "stop")
                    for folder in ("tools", "other"):
                        (checkout / folder / "review_server.py").write_text(
                            "import time\nprint('ready', flush=True)\ntime.sleep(60)\n")
                for checkout, script, port in (
                    ("one", "tools/review_server.py", "9011"),
                    ("one", "tools/review_server.py", "9012"),
                    ("two", "tools/review_server.py", "9011"),
                    ("one", "other/review_server.py", "9011"),
                ):
                    process = subprocess.Popen([sys.executable, script, port],
                        cwd=root / checkout, stdout=subprocess.PIPE, text=True)
                    processes.append(process)
                    self.assertEqual(process.stdout.readline(), "ready\n")
                result = subprocess.run([sys.executable, str(root / "one/stop")],
                    env={**os.environ, "PORT": "9011"}, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("Sent SIGTERM", result.stdout)
                self.assertEqual(processes[0].wait(timeout=5), -15)
                for process in processes[1:]:
                    self.assertIsNone(process.poll())
                again = subprocess.run([sys.executable, str(root / "one/stop")],
                    env={**os.environ, "PORT": "9011"}, capture_output=True, text=True)
                self.assertEqual(again.returncode, 0, again.stderr)
                self.assertIn("No review server", again.stdout)
                for port in ("bad", "0", "65536"):
                    invalid = subprocess.run([sys.executable, str(root / "one/stop")],
                        env={**os.environ, "PORT": port}, capture_output=True, text=True)
                    self.assertEqual(invalid.returncode, 2)
            finally:
                for process in processes:
                    if process.poll() is None:
                        process.terminate()
                    process.wait(timeout=5)
                    process.stdout.close()


if __name__ == "__main__":
    unittest.main()
