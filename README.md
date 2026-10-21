# Kanji Path

## Grammar, typed tests, and mistake notebook

- Grammar lessons cover estimated N5–N1: 81 / 98 / 101 / 123 / 123 points
  (526 total), with meanings, formation rules, notes, Japanese examples, available
  furigana, translations, and device speech. Open a lesson from **Grammar lessons**
  or the learning path. **Mark studied & add to reviews** enables its test questions
  and schedules a flashcard; recall practice uses the existing review scheduler.
- **Test yourself → Answer format → Type answers** supports vocabulary kana
  readings or English meanings, kanji meanings, kana romaji, and sentence gaps.
  It accepts bundled alternate readings, hiragana/katakana variants, and normalized
  English capitalization, whitespace, trailing punctuation and infinitive “to”.
  This is deterministic grading, not AI translation; unlisted synonyms may be
  rejected. Grammar tests remain multiple choice and are excluded from typed tests.
- **Mistake notebook** persists incorrect test answers, “not sure”, and practice
  ratings of Again. Correct answers or successful practice ratings clear an item;
  learners can also remove an entry manually. The practice button opens a test
  restricted to unresolved mistakes, with the usual material and level filters.
- Mistakes and grammar progress stay separate per learner and are included in
  version-1 backups under the existing `kanji-path-v1` storage key. Older backups
  recover unresolved practice mistakes from retained history. Earlier test scores
  contain no answer details, so their missed questions cannot be reconstructed.
- Grammar is bundled from the same pinned OpenJLPT revision as vocabulary under
  CC BY-SA 4.0. Source hashes and transformations are in
  `dist/data/grammar-meta.json`; the full upstream notice and licence remain bundled.
  Refresh with `python -X utf8 scripts/build-grammar.py --download`, or omit
  `--download` to rebuild from the ignored local snapshot. The new content and
  modules are precached for offline use (service worker cache `kanji-path-v6`).

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

## Deploy to Vercel

The included `vercel.json` serves `dist/` as a static website with no install
or build step. `.vercelignore` excludes downloaded upstream archives, local
scripts, Git metadata, and the separate Sites hosting configuration.

Use the official Vercel CLI, sign in with your own account, explicitly link
the intended Vercel project and team, and verify that link with
`vercel project inspect --non-interactive` before deploying with
`vercel deploy --prod`. Project linking is local to this directory and is
excluded from Git. No environment variables or server credentials are needed
by the study app itself.

### Publish future updates

After editing this app, run this command from the project directory:

```sh
npm run deploy
```

It runs the tests and JavaScript checks, verifies the existing Vercel account
and project link, publishes production, and compares all live application files
with the local update. Success is reported only after the public site serves
the expected files. It always updates https://kanji-path-study.vercel.app.
It also removes the retired kanji-path-sterix-z.vercel.app alias if Vercel
automatically recreates it during a production deployment.
The command uses the pinned official Vercel CLI; sign in with `vercel login`
if the account session expires. A missing or changed project link stops the
command rather than creating another deployment project.

Codex project instructions make this publication step part of future requested
app changes. Merely saving local files does not trigger a deployment; for edits
you make yourself, run the command above. No file watcher, Git integration,
or background automation is configured.

Learners receive new files when they reopen or reload the online app; the
service worker uses network-first fetching and keeps cached files available
offline. Updates at the same URL preserve profiles and study progress.

Progress is separate for each website address. Export a backup from the old
site and import it into the Vercel site if you want to move existing progress.

## Included

- 2,136 Jōyō kanji with meanings, readings, grade, stroke count, and estimated JLPT.
- Learning path kanji collections by estimated JLPT: N5 79, N4 166, N3 367,
  N2 367, N1 985. The remaining 172 ungraded kanji stay available by school grade
  and in the full library. Each level supports guided lessons, writing, flashcards,
  listening and browsing with the matching library filter.
- 46 basic hiragana and 46 basic katakana, with stroke paths for all 2,228 characters.
- 7,811 graded vocabulary entries: N5 674, N4 630, N3 1,659, N2 1,778, N1 3,070.
- All 127 original beginner cards and 10 topics preserved, including 13 extra words/readings
  outside the graded lists: 7,824 vocabulary cards total.
- N5–N1 collections for guided lessons, flashcards and listening; library level filters
  and search by Japanese, readings, romaji, alternate forms and English meanings.
- 40 original beginner sentences with cloze questions.
- Guided kanji/kana lessons: explore, listen, write with direction arrows, then recall.
- Vocabulary lessons: word, meaning, listening and recall, without handwriting.
- Clickable words in the kanji explorer open vocabulary details and sentence usage.
- 13,730 sentence examples across 7,254 words, with English translations, available
  furigana and source links; also accessible inside guided lessons and revealed flashcards.
  Words without a bundled example show an explicit empty state.
- Separate handwriting, flashcard, listening, and sentence practice sessions.
- Adaptive local SM-2-style review scheduling, tracked separately for each skill.
- Test yourself tab: quizzes from previously answered material, with category/JLPT
  filters, scores, answer review and retrying missed questions. Includes kanji meanings,
  vocabulary meanings/readings, kana sounds and sentence gaps.
- Up to 30 recent test scores per learner, included in backups. Practice review
  schedules are independent of test scores. Browsing alone does not mark an item studied.
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
2. First fetch the pinned vocabulary snapshot with `python scripts/build-vocab.py --download`
   (see below). Run `python scripts/build-data.py`. Official XML supplies the current school
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

### Vocabulary snapshot

Run `python scripts/build-vocab.py --download` to fetch and build the pinned OpenJLPT
revision recorded in the script. Subsequent `python scripts/build-vocab.py` runs
rebuild from the ignored `scripts/openjlpt-source/` snapshot. To update upstream,
review and change the pinned revision, download again, check the licence/notices
and data changes, update count assertions, bump the offline cache version and deploy.

`scripts/vocab-core.json` retains the original 127 CC0 cards. Exact word/reading
matches (treating hiragana/katakana readings equivalently) retain their original
IDs, topics and glosses. New cards use the frozen OpenJLPT source ID with a prefix.
Other original cards remain available in the beginner collection. Homographs with
different readings stay separate. Level sets are independent, not cumulative;
levels are unofficial study estimates, not an official exam syllabus.

The app bundles vocabulary fields and Tatoeba usage examples with sentence IDs and
available furigana from the same pinned OpenJLPT snapshot. Original CC0 beginner
sentences supplement missing examples where spelling and reading match. Grammar
is not included. Sentence source links credit Tatoeba contributors (CC BY 2.0 FR);
the derivative vocabulary dataset remains CC BY-SA 4.0.

Vocabulary never enters handwriting practice, even for a one-character word.
Historical vocabulary writing cards remain in backups and progress, but leave the
daily review queue. Kanji and kana retain writing, including visible direction
arrows that follow the actual stroke path during animation.
`dist/data/vocab-meta.json` records the pinned revision, upstream versions, source
hashes, counts and modifications. Raw snapshots are excluded from Git, deployments
and the portable source ZIP. The adapted JSON, licence and attribution notices
are available offline and through the app’s Sources screen.

## Licensing

Application: MIT (LICENSE). Kanji meanings/readings: copyright Jim Breen and
EDRDG, CC BY-SA 4.0, via David Luz Gouveia's MIT JSON conversion. Stroke data:
copyright Ulrich Apel and contributors, KanjiVG CC BY-SA 3.0. Basic kana tables,
original vocabulary entries and practice sentences: CC0. Expanded vocabulary:
OpenJLPT contributors, Jonathan Waller’s lists and JMdict (EDRDG), CC BY-SA 4.0;
the combined adapted vocabulary dataset remains CC BY-SA 4.0. See dist/credits.html
and Settings → Sources for full attribution and source/download links.
