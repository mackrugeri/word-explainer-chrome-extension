"""Run from any directory: python3 scripts/check.py."""
import ast
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
for path in (ROOT / "backend").rglob("*.py"):
    ast.parse(path.read_text(), filename=str(path))
manifest = json.loads((ROOT / "extension/manifest.json").read_text())
files = [manifest["background"]["service_worker"], manifest["action"]["default_popup"], manifest["options_page"]]
for script in manifest["content_scripts"]:
    files.extend(script["js"])
for name in files:
    assert (ROOT / "extension" / name).is_file(), name
subprocess.run([sys.executable, "-B", "-m", "unittest", "discover", "-s", "tests", "-v"], cwd=ROOT / "backend", check=True)
if shutil.which("node"):
    for path in (ROOT / "extension").glob("*.js"):
        subprocess.run(["node", "--check", str(path)], check=True)
else:
    print("SKIP: JavaScript syntax checks require Node.js.")
print("Python tests and extension manifest checks passed.")
