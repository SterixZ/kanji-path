# Kanji Path

A free Japanese study app with an original interface inspired by familiar
kanji-study workflows. No paid API, account, backend database, npm install,
or manual card entry is required.

## Run it

Install Node.js 22 or later, open a terminal in this directory, then run:

```sh
npm start
```

Open http://127.0.0.1:4173. To use on a phone, host the contents of `dist/`
on an HTTPS static host. The included manifest and service worker enable
offline browser use after a complete first visit. Use browser installation
or Add to Home Screen where supported. Opening index.html directly from the
filesystem will not load data because browsers restrict file fetches.

## Included

- 2,136 Jōyō kanji with meanings, readings, grade, stroke count, and estimated JLPT.
- 46 basic hiragana and 46 basic katakana, with stroke paths for all 2,228 characters.
- 127 beginner words in 10 topics, and 40 original sentences with cloze questions.
- Guided lessons: explore, listen, write, then recall.
- Separate handwriting, flashcard, listening, and sentence practice sessions.
- Adaptive local SM-2-style review scheduling, tracked separately for each skill.
- Activity history, daily goal, streak and collection progress.
- Up to 50 local participant profiles; JSON backup export and validated restore.
- Japanese browser text-to-speech, adjustable voice and speed.

Japanese voice availability and offline speech depend on the device. If none
is available, install a Japanese text-to-speech voice using the device's
language settings. No placeholder audio or external TTS endpoint is used.
The geometric stroke checker is a teaching aid, not general handwriting OCR
or authoritative calligraphy assessment. JLPT levels are unofficial estimates.
The app is a usable starter learning tool, not a full Kanji Study feature clone
or a complete beginner-to-fluent language curriculum.

## Data and privacy

Profiles, preferences, cards and review history are stored under
`kanji-path-v1` in localStorage, independently for each browser origin.
The service worker caches application files and built-in content. Browser
storage may be cleared or evicted; export backups in Settings regularly.
No participant names or answers are sent to a server. Browser/device speech
voices marked online may use the platform's speech service.

Hosted Sites begin private to the owner. To let participants open the hosted
site, explicitly configure its sharing audience, or self-host dist/ on your
chosen static host. The source itself can be used independently of Sites.
There is no cross-device automatic sync, classroom administrator dashboard,
recorded native-speaker audio, or external authentication in this version.

## Verification

```sh
npm test
node --check dist/app.js
node --check dist/sw.js
```

Tests exercise scheduling intervals and failures, stroke direction and shape,
backup validation and upstream data completeness. Browser QA covers desktop
and phone layouts, library filtering, lesson flow, writing, profiles and backup.

## Refresh bundled data

1. Download the current official dictionary from
   https://www.edrdg.org/kanjidic/kanjidic2.xml.gz into scripts/kanjidic2.xml.gz.
   Download `kanji.json` from https://github.com/davidluzgouveia/kanji-data into
   scripts/kanji-source.json, and download
   https://codeload.github.com/KanjiVG/kanjivg/zip/refs/heads/master into
   scripts/kanjivg.zip. Keep corresponding licence notices.
2. Run `python scripts/build-data.py`. Official XML supplies the current school
   grades, meanings and readings. The JSON conversion supplies only estimated
   JLPT groupings. All WaniKani fields are excluded. The script selects school
   grades 1–6 and 8 and retains ordered SVG stroke paths. Diagram stroke counts
   follow the selected KanjiVG shape; differing dictionary counts are retained
   in the optional dictionaryStrokes field.
3. Refresh against current KANJIDIC upstream releases regularly for ongoing
   dictionary distribution; see
   https://www.edrdg.org/edrdg/licence.html for the upstream update conditions.
4. Update the displayed data snapshot date, increment the service-worker cache
   version in dist/sw.js and dist/app.js, rerun tests, and republish dist/.

## Licensing

Application: MIT (LICENSE). Kanji meanings/readings: copyright Jim Breen and
EDRDG, CC BY-SA 4.0, via David Luz Gouveia's MIT JSON conversion. Stroke data:
copyright Ulrich Apel and contributors, KanjiVG CC BY-SA 3.0. Basic kana tables,
original vocabulary entries and practice sentences: CC0. See dist/credits.html
and Settings → Sources for full attribution and source/download links.
