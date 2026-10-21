"""Bundle a pinned OpenJLPT snapshot while preserving all original card IDs.

Run with --download once to fetch the pinned source, then without it to rebuild.
The derivative vocabulary dataset is CC BY-SA 4.0; application code is MIT.
"""
import argparse
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'scripts/openjlpt-source'
OUT = ROOT / 'dist/data'
REVISION = '0d1d3410bec90bd4098a7c72de820543cb4f707c'
BASE = f'https://raw.githubusercontent.com/evanclan/OpenJLPT/{REVISION}/'


def kana(text):
    return ''.join(chr(ord(c) - 96) if '\u30a1' <= c <= '\u30f6' else c for c in text)


def build(download=False):
    if download:
        SOURCE.mkdir(exist_ok=True)
        for name, path in [(f'n{n}.json', f'data/json/vocab/n{n}.json') for n in [5, 4, 3, 2, 1]] + [
            ('LICENSE', 'LICENSE'), ('NOTICE.md', 'NOTICE.md'), ('meta.json', 'data/json/meta.json')
        ]:
            with urllib.request.urlopen(BASE + path, timeout=60) as response:
                (SOURCE / name).write_bytes(response.read())
        (SOURCE / 'revision.txt').write_text(REVISION, encoding='utf-8')
    if (SOURCE / 'revision.txt').read_text(encoding='utf-8-sig').strip() != REVISION:
        raise ValueError('Unexpected source revision; use --download to fetch the pinned snapshot.')
    read = lambda path: json.loads(path.read_text(encoding='utf-8'))
    core = read(ROOT / 'scripts/vocab-core.json')
    original = {(v['char'], kana(v['reading'])): v for v in core}
    words, used, hashes = [], set(), {}
    for level in [5, 4, 3, 2, 1]:
        file = SOURCE / f'n{level}.json'
        hashes[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
        for entry in read(file):
            assert entry['level'] == f'N{level}' and entry['word'] and entry['reading'] and entry['meanings']
            legacy = original.get((entry['word'], kana(entry['reading'])))
            word = dict(id='v-openjlpt-' + entry['id'], char=entry['word'], reading=entry['reading'],
                        meanings=entry['meanings'], kind='vocab', on=[], kun=[])
            if legacy:
                word.update(legacy)
                word['core'] = True
                used.add(legacy['id'])
            word.update(jlpt=level, roman=entry['romaji'], source='OpenJLPT', sourceId=entry['id'])
            for source_key, key in [('other_forms', 'otherForms'), ('other_readings', 'otherReadings')]:
                if entry.get(source_key):
                    word[key] = entry[source_key]
            words.append(word)
    # Keep unlisted beginner words and alternate readings as their original cards.
    words.extend(dict(v, core=True) for v in core if v['id'] not in used)
    assert len({v['id'] for v in words}) == len(words)
    assert len({(v['char'], kana(v['reading'])) for v in words}) == len(words)
    metadata = dict(source='OpenJLPT', revision=REVISION, license='CC-BY-SA-4.0',
                    sourceUrl=f'https://github.com/evanclan/OpenJLPT/tree/{REVISION}',
                    snapshot='2026-10-21', sourceFiles=hashes, upstream=read(SOURCE / 'meta.json'),
                    levels={f'N{n}': sum(v.get('jlpt') == n for v in words) for n in [5, 4, 3, 2, 1]},
                    total=len(words), originalCore=len(core),
                    ungraded=sum(not v.get('jlpt') for v in words),
                    modifications='Vocabulary only; omit examples and POS; adapt field names; merge exact word/readings with original cards, preserving their IDs and English glosses. Katakana and hiragana readings are equivalent for merging. Retain other spellings/readings for search. Levels are unofficial estimates.')
    for name, value in [('vocab.json', words), ('vocab-meta.json', metadata)]:
        (OUT / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    shutil.copyfile(SOURCE / 'LICENSE', OUT / 'OPENJLPT-LICENSE.txt')
    shutil.copyfile(SOURCE / 'NOTICE.md', OUT / 'OPENJLPT-NOTICE.md')
    print(json.dumps({k: metadata[k] for k in ['total', 'levels', 'originalCore', 'ungraded']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true')
    build(parser.parse_args().download)
