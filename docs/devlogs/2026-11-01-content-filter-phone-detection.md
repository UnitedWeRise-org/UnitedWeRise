# Content Filter Phone False Positives
**Date:** 2026-11-01

## User Intent
Post creation was blocked with “Content contains potentially sensitive
information” while writing normal civic posts. Removing “2028” still failed,
showing the phone-number filter was over-matching.

## Root Cause
`contentFilter` used:

```js
/\b(?:phone|call|text)\s*(?:me|us)?\s*(?:at|on)?\s*[0-9\-\(\)\+\s]+/gi
```

The final `[0-9...]+` accepted a single digit, so `call 2028` and `text 3`
were treated as phone-number sharing.

## What Changed
- Added `backend/src/utils/sensitiveContent.ts` with normalized detection:
  - extract number-like candidates (`+?digits` with spaces/`().-`)
  - strip non-digits; require 10–15 digits
  - accept when a phone keyword is nearby, the number starts with `+`/`00`/`01`,
    or it uses phone-like separators
  - ignore IPv4 addresses and dates/short numbers
- Email detection excludes `@user@instance.social` handles.
- `contentFilter` now returns `code: SENSITIVE_CONTENT` and
  `reason: phone|email|credentials`; logs only the reason (never content).

## Verification
- Helper tests pass for:
  `+01.555.555.1234`, `01.555.555.1234`, `1.555.555.1234`,
  `+1.555.555.1234`, `+1(555)555-1234`, `(555) 123-4567`
- False positives cleared:
  `Call 2028 for change`, `Text 3 posts about the debate`, `call 10.31.2026`,
  `192.168.100.100`, `@user@mastodon.social`.
- Existing checks still catch real emails and `login: ...`.

## Files
- `backend/src/utils/sensitiveContent.ts`
- `backend/src/middleware/moderation.ts`

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*
