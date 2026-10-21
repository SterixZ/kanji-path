"""Bundle the same pinned, CC BY-SA 4.0 OpenJLPT snapshot as vocabulary."""
import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'scripts/openjlpt-source'
OUT = ROOT / 'dist/data'
REVISION = '0d1d3410bec90bd4098a7c72de820543cb4f707c'
BASE = f'https://raw.githubusercontent.com/evanclan/OpenJLPT/{REVISION}/'
COUNTS = {5: 81, 4: 98, 3: 101, 2: 123, 1: 123}


def build(download=False):
    SOURCE.mkdir(exist_ok=True)
    lessons, hashes = [], {}
    for level, count in COUNTS.items():
        path = SOURCE / f'grammar-n{level}.json'
        if download:
            with urllib.request.urlopen(BASE + f'data/json/grammar/n{level}.json', timeout=60) as response:
                path.write_bytes(response.read())
        entries = json.loads(path.read_text(encoding='utf-8'))
        assert len(entries) == count
        hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
        for entry in entries:
            assert entry['level'] == f'N{level}'
            assert all(entry.get(key) for key in ['id', 'pattern', 'meaning', 'formation', 'examples'])
            assert all(example.get('ja') and example.get('en') for example in entry['examples'])
            lessons.append(dict(id=f'g-n{level}-' + entry['id'], kind='grammar',
                                char=entry['pattern'], roman=entry.get('romaji', ''),
                                meanings=[entry['meaning']], jlpt=level,
                                formation=entry['formation'], notes=entry.get('notes', ''),
                                examples=entry['examples'], tags=entry.get('tags', []),
                                on=[], kun=[], source='OpenJLPT', sourceId=entry['id']))
    assert len({entry['id'] for entry in lessons}) == 526
    metadata = dict(source='OpenJLPT', revision=REVISION, license='CC-BY-SA-4.0',
                    sourceUrl=f'https://github.com/evanclan/OpenJLPT/tree/{REVISION}',
                    sourceFiles=hashes, total=len(lessons),
                    levels={f'N{level}': count for level, count in COUNTS.items()},
                    modifications='Adapt field names and namespace IDs by level. Preserve formation rules, notes, tags and original examples. Levels are unofficial estimates.')
    for name, value in [('grammar.json', lessons), ('grammar-meta.json', metadata)]:
        (OUT / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Bundled {len(lessons)} grammar lessons across N5–N1.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true')
    build(parser.parse_args().download)
