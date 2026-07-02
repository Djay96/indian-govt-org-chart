# Indian Government Org Chart

[![Netlify Status](https://api.netlify.com/api/v1/badges/b1f0c3e4-757b-4bbf-bf8d-55e05343a793/deploy-status)](https://app.netlify.com/projects/kisko-bolun-up/deploys)

Open-source dashboards, search, geography views, data-quality metrics, wiki docs, and an AI agent — built on the **Accountable India** dataset of every government office in India.

**Live:** https://kisko-bolun-up.netlify.app  
**Repo:** https://github.com/Djay96/indian-govt-org-chart

---

## Features

| Section | Description |
|---------|-------------|
| **Dashboard** | Coverage metrics, charts, quick navigation |
| **Explore** | Full-text search across 6,600+ records |
| **Geography** | State/district breakdowns, DM coverage |
| **Data Quality** | Verification status, confidence scores, audit trail |
| **AI Agent** | Natural-language Q&A (DeepSeek via Netlify function) |
| **Wiki** | In-app documentation for the data model |

## Dataset (Accountable India)

A connected org chart of government offices at Union, State/UT, District, and Local levels — 10 linked CSV tables with PostgreSQL schema.

| Level | Coverage (July 2026) |
|-------|----------------------|
| Union Council of Ministers | 73 ministers + President/VP |
| Union bureaucracy (Secretaries) | 35/36 ministries |
| State Governors + Chief Ministers | All 31 states/UTs |
| Chief Secretaries | All 36 states/UTs |
| District Collectors/DMs | **782/785 (99.6%)** |
| Superintendents of Police | **764/786 (97.2%)** |
| Municipal Corporations | 238 with Mayor + Commissioner |

See [`Accountable India/`](Accountable%20India/) for CSVs, schema, ER diagram, and collection runbooks.

## Quick start

```bash
git clone https://github.com/Djay96/indian-govt-org-chart.git
cd indian-govt-org-chart
npm install
cp .env.example .env        # add DEEPSEEK_API_KEY for the AI agent
npm run netlify:dev         # Vite dev server + Netlify functions
```

Build for production (compiles CSVs → JSON, then Vite):

```bash
npm run build
npm run preview             # preview static build locally
npm run deploy              # build + deploy to Netlify prod
```

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DEEPSEEK_API_KEY` | For AI Agent | DeepSeek API key — set in [Netlify env vars](https://app.netlify.com/projects/kisko-bolun-up/configuration/env) and local `.env` |

**Never commit `.env` or API keys to git.**

## Project structure

```
├── Accountable India/       # Source CSV dataset + schema + jobs
├── scripts/build-data.mjs   # CSV → public/data/*.json at build time
├── src/                     # React app (Vite + TypeScript + Tailwind)
├── netlify/functions/       # Serverless: /api/chat (DeepSeek)
├── public/                  # Static assets + generated data (build output)
└── netlify.toml             # Netlify build & redirect config
```

## Related project

**[Kisko Bolun UP](https://kisko-bolun-up.netlify.app)** — a separate civic tool for Uttar Pradesh that maps citizen complaints to responsible officers. Same maintainer, different scope.

## License

Data: [Open Data Commons Attribution License (ODC-By)](https://opendatacommons.org/licenses/by/)  
Code: MIT

All contacts are **official/public channels only** — no personal mobile numbers or private emails.

## Contributing

Verified corrections with source citations are welcome. See the in-app Wiki (`/docs`) or `Accountable India/jobs/` for collection runbooks.
