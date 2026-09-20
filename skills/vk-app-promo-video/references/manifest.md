# Promo manifest

Use a JSON object like this as the compositor input. Paths are resolved relative
to the manifest file, so the package can be moved as one directory.

```json
{
  "title": "Example app promo",
  "language": "ru",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "accent": "#447BBA",
  "background": "#0E1621",
  "scenes": [
    {
      "id": "hook",
      "image": "screenshots/01-value.png",
      "duration": 2.4,
      "caption": "С чего начать\nпрямо сейчас?",
      "motion": "in"
    },
    {
      "id": "setup",
      "image": "screenshots/02-setup.png",
      "duration": 4.2,
      "caption": "Соберите дела\nв ясный план",
      "motion": "out"
    },
    {
      "id": "action",
      "image": "screenshots/03-action.png",
      "duration": 7.0,
      "caption": "Выберите приоритет\nи сделайте первый шаг",
      "motion": "in"
    },
    {
      "id": "cta",
      "image": "screenshots/04-result.png",
      "duration": 3.0,
      "caption": "Откройте приложение в VK",
      "motion": "out"
    }
  ],
  "capture": {
    "source": "http://127.0.0.1:4173/?vk_mock=success",
    "capturedAt": "YYYY-MM-DD",
    "engine": "browser-automation",
    "cssViewport": { "width": 360, "height": 640 },
    "deviceScaleFactor": 3,
    "physicalOutput": { "width": 1080, "height": 1920 },
    "syntheticData": true,
    "realUiReviewed": true,
    "privacyReviewed": true
  }
}
```

## Field rules

- `width`/`height` must be `1080`/`1920` for the social deliverable; the script
  accepts another target only for controlled experiments.
- `duration` is seconds. The total must be 15–30 seconds. Keep the CTA scene at
  least 2 seconds.
- `caption` is UTF-8 text. Use at most two lines and roughly 32 characters per
  line. Put line breaks explicitly; do not rely on automatic wrapping.
- `image` must be relative to the manifest directory and remain inside the
  portable promo package; absolute and package-escaping paths are rejected.
- `motion` is `in`, `out`, or `none`. It only changes the subtle zoom direction,
  not the meaning of the screen.
- `capture.realUiReviewed`, `capture.privacyReviewed`, and
  `capture.syntheticData` must be true before publication.
- An optional top-level `audio` path is not required; pass `--audio` to the
  compositor so the manifest remains portable.

## Storyboard review

Write a separate `storyboard.md` with one row per scene:

| Time | Screen | Visible action | Caption | Claim checked |
|---|---|---|---|---|
| 00:00–00:02 | Hook | value screen | one short line | yes |

Then record:

1. who the video is for;
2. the one promise and the one CTA;
3. synthetic-data and privacy review;
4. any product limitation that should accompany the social post;
5. whether audio is generated, user-supplied, or intentionally absent.

Keep `promo-copy.json` small and paste-ready:

```json
{
  "language": "ru",
  "hook": "С чего начать прямо сейчас?",
  "captions": [
    "С чего начать\nпрямо сейчас?",
    "Соберите дела\nв ясный план",
    "Выберите приоритет\nи сделайте первый шаг",
    "Откройте приложение в VK"
  ],
  "cta": "Откройте приложение в VK",
  "voiceover": null,
  "claimsReviewed": true
}
```

If `voiceover` is present, store the exact approved script there and keep the
audio file next to the MP4. Do not put API keys or private user data in this
file.
