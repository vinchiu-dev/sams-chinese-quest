# Sam's Chinese Quest — how updates work

This repo hosts a kids' Mandarin review app (GitHub Pages) for a child learning
pinyin + English only (no written characters shown).

## Files
- `index.html` — the app. Rarely changes. Loads `vocab.json` fresh on every open.
- `vocab.json` — all lessons + sentences. **This is what gets updated per lesson.**
- `progress.json` — written by the app itself (stars/mastered sync). Never edit by hand.

## Per-lesson update workflow (owner uploads a lesson video to Claude)
1. Extract vocabulary from the video (caption cards; OCR the pinyin, reconstruct
   hanzi, verify tones against a dictionary).
2. Append a new lesson object to the END of `lessons` in `vocab.json`
   (the app displays newest-first automatically):
   { "id": "kebab-case-id", "title": "...", "subtitle": "story name — theme",
     "words": [ { "hanzi": "...", "pinyin": "with tone marks", "en": "...", "emoji": "..." } ] }
   - `hanzi` is used ONLY to drive text-to-speech (best pronunciation); never shown.
3. Add 3–5 sentences from the video's caption patterns to `sentences`:
   { "en": "...", "pinyin": "...", "hanzi": "...", "tag": "newtag" }
   and register the tag in `tagMap`: "newtag": ["kebab-case-id"].
4. Push the updated vocab.json via GitHub API:
   PUT /repos/{owner}/{repo}/contents/vocab.json
   (base64 content; include current file `sha`; token supplied by owner in chat)
5. That's it — the live app picks it up on next load. Never touch progress.json.

## Conventions
- Only pinyin/English on-screen; hanzi exists solely for audio.
- Verify tone marks; when unsure, check a dictionary rather than guessing.
- Duplicate stories across videos: merge extra words into existing lessons
  instead of creating duplicates.
