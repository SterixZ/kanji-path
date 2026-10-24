"""Create a portable source archive without downloaded upstream snapshots or hosting identity."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parent.parent
output=root/'artifacts'/'exports'/'kanji-path-source.zip'
output.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(output,'w',ZIP_DEFLATED) as z:
 for folder in ['dist','scripts','docs']:
  for p in (root/folder).rglob('*'):
   if p.is_file() and 'openjlpt-source' not in p.parts and p.suffix not in {'.zip','.gz'} and p.name!='kanji-source.json':
    z.write(p,Path('kanji-path')/p.relative_to(root))
 for name in ['README.md','LICENSE','package.json','.gitignore','vercel.json','.vercelignore','AGENTS.md']:
  z.write(root/name,Path('kanji-path')/name)
print(output)
