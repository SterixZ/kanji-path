"""Create a portable source archive without downloaded upstream snapshots or hosting identity."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parent.parent
output=root.parent/'kanji-path-source.zip'
with ZipFile(output,'w',ZIP_DEFLATED) as z:
 for folder in ['dist','scripts']:
  for p in (root/folder).rglob('*'):
   if p.is_file() and p.suffix not in {'.zip','.gz'} and p.name!='kanji-source.json':
    z.write(p,Path('kanji-path')/p.relative_to(root))
 for name in ['README.md','LICENSE','package.json','.gitignore']:
  z.write(root/name,Path('kanji-path')/name)
print(output)
