# Kisko Bolun UP

A civic accountability tool for Uttar Pradesh. Describe a public issue and its
exact location; the app maps it to the responsible department, shows the
escalation chain (local office → Chief Minister), and drafts a complaint email.

**Live:** https://kisko-bolun-up.netlify.app

## How it works

1. `detectIssue` — keyword-scores the description into an issue type
   (road, streetlight, sanitation, water).
2. `detectJurisdiction` — matches the location to a jurisdiction
   (Lucknow municipal, Lucknow rural, or a statewide fallback).
3. The issue + jurisdiction select an accountability **chain** of officials and
   a confidence score.

The resolution logic lives once in [`assets/resolve-core.js`](assets/resolve-core.js)
(pure functions) and is shared by the browser ([`assets/app.js`](assets/app.js))
and the Netlify function ([`netlify/functions/resolve.js`](netlify/functions/resolve.js)).
The dataset is [`data/accountability.json`](data/accountability.json).

## Develop

```bash
npm run dev        # static server on :8888
npm run netlify:dev # full stack incl. /api/resolve function
```

## Test

```bash
npm test           # node:test suite
npm run coverage   # enforced 97% coverage gate (c8)
npm run build      # validates data/accountability.json
```

## Deploy

Continuous deployment: pushing to `main` triggers a Netlify build automatically.
