"""Publish the same Phygital skill source as readable Markdown and a ZIP."""
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
source = root / 'skills/phygital'
output = root / 'public/skills'
output.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source / 'SKILL.md', output / 'phygital.md')
with zipfile.ZipFile(output / 'phygital.zip', 'w', zipfile.ZIP_DEFLATED) as bundle:
    for path in sorted(source.rglob('*')):
        if path.is_file():
            bundle.write(path, Path('phygital') / path.relative_to(source))
    bundle.write(root / 'LICENSE', 'phygital/LICENSE')
print('Packaged public/skills/phygital.md and phygital.zip')
