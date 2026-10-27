"""Create a distributable extension ZIP without backend or secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
output = root / "dist/word-explainer-extension.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for path in sorted((root / "extension").rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(root / "extension"))
print(output)
