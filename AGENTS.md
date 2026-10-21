# Kanji Path updates

The user wants app updates published to the existing Vercel deployment.

- For requested app changes, finish implementation, run `npm run deploy` from
  this directory, and verify its success before reporting completion, unless
  the user explicitly requests local-only work or no deployment.
- The canonical public URL is https://kanji-path-study.vercel.app. The user
  requested removal of kanji-path-sterix-z.vercel.app; do not recreate it.
  Vercel may regenerate that alias on production deployment; the deploy command
  removes it afterward and verifies that it no longer responds with the app.
- Keep the existing Vercel project `prj_1VJJLLyFQpMlSLeFQOZOVWn0eZJM` in team
  `team_ogCodyuLKsPpD4Tit3Svn85Y` (`sterix-z`). Do not create another project or
  silently relink the checkout. The deploy command checks these identities.
- Use the Vercel workflow rather than publishing app updates only to the old
  ChatGPT Sites URL. Keep the public Vercel URL stable.
- If authentication, checks, upload, or verification fail, fix the problem or
  report the exact blocker. Never describe a local-only edit as a live update.
- Preserve learner data under localStorage key `kanji-path-v1`. Deployment
  updates must not clear learner profiles or progress.
- Never commit or upload `.env*`, `.vercel/`, authentication tokens, downloaded
  upstream archives, or local participant backups.

Saving a file alone is not an automatic deployment trigger. Publish completed
changes with `npm run deploy`; this project does not use Git-triggered CI.
