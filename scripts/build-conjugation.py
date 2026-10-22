"""Bundle supported JMdict conjugation classes from the pinned OpenJLPT files.

Run build-vocab.py --download first if the ignored source snapshot is absent.
The class mapping is a CC BY-SA 4.0 derivative of OpenJLPT / JMdict.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'scripts/openjlpt-source'
OUT = ROOT / 'dist/data'
REVISION = '0d1d3410bec90bd4098a7c72de820543cb4f707c'
SUPPORTED = {'v1', 'v1-s', 'v5u', 'v5k', 'v5g', 'v5s', 'v5t', 'v5n', 'v5b', 'v5m', 'v5r',
             'v5k-s', 'v5r-i', 'v5u-s', 'vs-i', 'vk', 'adj-i', 'adj-ix', 'adj-na'}
EXPECTED = {'v1': 'る', 'v1-s': 'る', 'v5u': 'う', 'v5k': 'く', 'v5g': 'ぐ', 'v5s': 'す',
            'v5t': 'つ', 'v5n': 'ぬ', 'v5b': 'ぶ', 'v5m': 'む', 'v5r': 'る', 'v5k-s': 'く',
            'v5r-i': 'る', 'v5u-s': 'う', 'vs-i': 'する', 'vk': 'くる', 'adj-i': 'い', 'adj-ix': 'いい'}

assert (SOURCE / 'revision.txt').read_text(encoding='utf-8-sig').strip() == REVISION
vocab = json.loads((OUT / 'vocab.json').read_text(encoding='utf-8'))
by_source = {word.get('sourceId'): word for word in vocab}
classes, hashes = {}, {}
for n in [5, 4, 3, 2, 1]:
    path = SOURCE / f'n{n}.json'
    hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    for entry in json.loads(path.read_text(encoding='utf-8')):
        tags = set(entry.get('pos', [])) & SUPPORTED
        # Ambiguous classes and unsupported irregular verbs are not guessed.
        if len(tags) != 1 or entry['id'] not in by_source:
            continue
        tag = tags.pop()
        word = by_source[entry['id']]
        if tag in EXPECTED and not word['reading'].endswith(EXPECTED[tag]):
            continue
        classes[word['id']] = tag

result = dict(classes=classes, source='OpenJLPT / JMdict', revision=REVISION,
              license='CC-BY-SA-4.0', sourceFiles=hashes,
              modifications='Retain unambiguous supported verb and adjective classes, mapped to existing Kanji Path vocabulary IDs. Exclude unsupported and ambiguous classes; no ending-based class guesses.',
              total=len(classes))
(OUT / 'conjugation.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Bundled conjugation classes for {len(classes)} words.')
